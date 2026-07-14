"""
Pipecat SDK-compatible Voice Agent
====================================
Server RTVI protocol cho Pipecat Client SDK (WebSocketTransport).
- REST /connect → {wsUrl}
- WebSocket /rtvi-ws ↔ protobuf (audio Float32↔Int16, message)
- Pipeline: Whisper STT → Ollama LLM → Piper TTS
"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    LLMRunFrame,
    OutputAudioRawFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker, WorkerParams
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
    UserTurnStrategies,
)
from pipecat.processors.audio.vad_processor import VADProcessor
from pipecat.serializers.protobuf import MessageFrame, ProtobufFrameSerializer
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.transcriptions.language import Language
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.turns.user_stop.speech_timeout_user_turn_stop_strategy import (
    SpeechTimeoutUserTurnStopStrategy,
)
from pipecat.utils.asyncio.task_manager import TaskManager

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
VOICES_DIR = Path(os.getenv("PIPER_VOICES_DIR", "/opt/ollama-playground/local-voice-agent/voices"))

SYSTEM_PROMPT = (
    "Bạn là trợ lý giọng nói tiếng Việt thân thiện, hữu ích.\n\n"
    "Quy tắc:\n"
    "- Trả lời NGẮN GỌN, tối đa 1-2 câu\n"
    "- Không sử dụng ký tự đặc biệt, markdown, hoặc emoji\n"
    "- Trả lời bằng tiếng Việt\n"
    "- Nếu không biết câu trả lời, hãy nói thẳng là bạn không biết"
)

# FastAPI app
app = FastAPI(title="Pipecat SDK Voice Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Web UI path
CLIENT_HTML = Path(__file__).parent / "client"

_active_connections: set[str] = set()
_conn_counter: int = 0


# ---------------------------------------------------------------------------
# Custom Serializer: chỉ gửi audio + message (JS SDK không hiểu frame khác)
# ---------------------------------------------------------------------------
class SDKSerializer(ProtobufFrameSerializer):
    """Serializer tương thích Pipecat Client SDK.

    - SERIALIZE: chỉ gửi OutputAudioRawFrame (audio) + MessageFrame (message)
    - DESERIALIZE: pass-through (client gửi Int16 PCM, pipeline cũng xài Int16)
    """

    SERIALIZABLE_TYPES = {
        OutputAudioRawFrame: "audio",
        MessageFrame: "message",
    }
    SERIALIZABLE_FIELDS = {
        "audio": OutputAudioRawFrame,
        "message": MessageFrame,
    }

    async def deserialize(self, data: str | bytes) -> Frame | None:
        frame = await super().deserialize(data)
        if isinstance(frame, InputAudioRawFrame):
            audio = frame.audio
            if len(audio) > 0:
                import numpy as np
                n = len(audio)
                # Detect format: Float32 (4 bytes/sample) hay Int16 (2 bytes/sample)
                is_float32 = False
                if n % 4 == 0:
                    f32 = np.frombuffer(audio, dtype=np.float32)
                    # Float32 audio thường có values trong [-1, 1]
                    f32_abs = np.abs(f32)
                    if np.max(f32_abs) <= 1.0 and np.mean(f32_abs) > 1e-6:
                        is_float32 = True

                if is_float32:
                    # Float32 → Int16
                    rms = float(np.sqrt(np.mean(f32**2)))
                    logger.debug(f"   Float32 n={n//4} rms={rms:.4f}")
                    i16 = np.clip(f32 * 32767, -32768, 32767).astype(np.int16)
                    frame.audio = i16.tobytes()
                else:
                    i16_arr = np.frombuffer(audio, dtype=np.int16).astype(np.float32)
                    imin = float(np.min(i16_arr))
                    imax = float(np.max(i16_arr))
                    logger.debug(f"   Int16 n={len(i16_arr)} min={imin:.0f} max={imax:.0f}")
                    if imin >= 0 and imax <= 255:
                        # Uint8 data (SDK new Uint8Array truncation)
                        center = 128.0
                        i16_arr = (i16_arr - center) * 256.0
                        logger.debug(f"   → Uint8→Int16 scaled")
                    elif imax < 2000:
                        # Low amplitude Int16 → boost
                        i16_arr = i16_arr - np.mean(i16_arr)
                        peak = float(np.max(np.abs(i16_arr)))
                        if peak > 0:
                            gain = min(500, 16000.0 / peak)
                            i16_arr = i16_arr * gain
                            logger.debug(f"   → gain boost {gain:.1f}x")
                    frame.audio = np.clip(i16_arr, -32767, 32767).astype(np.int16).tobytes()
        return frame


# ---------------------------------------------------------------------------
# Pipeline factory
# ---------------------------------------------------------------------------
async def create_pipeline(
    transport: FastAPIWebsocketTransport,
) -> tuple[PipelineWorker, LLMContext] | tuple[None, None]:
    """Tạo pipeline Whisper → Ollama → Piper với RTVI-compatible transport."""

    # --- STT (dùng model BASE - nhanh hơn medium trên CPU) ---
    logger.info("Loading Whisper STT model (base)...")
    stt = WhisperSTTService(
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        settings=WhisperSTTService.Settings(
            model=Model.MEDIUM,
            language=Language.VI,
            no_speech_prob=0.9,  # Cao hơn = chấp nhận nhiều segment hơn (audio có nhiễu)
        ),
    )

    # --- LLM ---
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    llm = OLLamaLLMService(
        base_url=ollama_base_url,
        settings=OLLamaLLMService.Settings(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=64,
        ),
    )

    # --- TTS (output 24kHz cho client) ---
    voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
    if not voice_path.exists():
        logger.error(f"Piper voice file not found: {voice_path}")
        return None, None
    tts = PiperTTSService(
        download_dir=VOICES_DIR,
        sample_rate=24000,
        settings=PiperTTSService.Settings(voice="vi_VN-vais1000-medium"),
    )

    # --- Context & Aggregators ---
    context = LLMContext()
    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=15.0,  # Cho Whisper base thời gian transcribe
            user_turn_strategies=UserTurnStrategies(
                stop=[SpeechTimeoutUserTurnStopStrategy(user_speech_timeout=0.6)],
            ),
        ),
    )

    # --- VAD ---
    vad = VADProcessor(
        vad_analyzer=SileroVADAnalyzer(
            params=VADParams(confidence=0.5, min_volume=0.1),
        ),
    )


    # --- Pipeline ---
    pipeline = Pipeline([
        transport.input(),
        vad,
        stt,
        user_agg,
        llm,
        tts,
        transport.output(),
        assistant_agg,
    ])

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        idle_timeout_secs=int(os.getenv("IDLE_TIMEOUT_SECS", "300")),
    )

    # --- Event: client ready → greeting ---
    @worker.rtvi.event_handler("on_client_ready")
    async def on_ready(rtvi):
        logger.info("RTVI client ready → sending greeting")
        context.add_message(
            {"role": "user", "content": "Chào bạn, hãy nói ngắn gọn tên bạn là gì?"}
        )
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnect(transport, client):
        logger.info("Client disconnected")
        await worker.cancel()

    return worker, context


# ===========================================================================
# REST endpoints
# ===========================================================================

@app.post("/connect")
async def connect_endpoint():
    """Pipecat Client SDK gọi POST /connect → nhận wsUrl.
    Client có CONNECT_URL cứng = http://localhost:8086/connect nên dùng ws://
    """
    ws_url = "ws://localhost:8086/rtvi-ws"
    logger.info(f"POST /connect → {ws_url}")
    return {"wsUrl": ws_url}


# ===========================================================================
# WebSocket endpoint (RTVI / protobuf)
# ===========================================================================

@app.websocket("/rtvi-ws")
async def rtvi_ws(ws: WebSocket):
    global _conn_counter
    _conn_counter += 1
    cid = _conn_counter

    await ws.accept()
    host = ws.client.host if ws.client else "?"
    _active_connections.add(f"rtvi-{cid}")
    logger.info(f"RTVI #{cid} from {host} (total: {len(_active_connections)})")

    # Transport config
    params = FastAPIWebsocketParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        serializer=SDKSerializer(),
        audio_in_sample_rate=8000,
        audio_out_sample_rate=24000,
        allowed_origins=[],
    )
    transport = FastAPIWebsocketTransport(websocket=ws, params=params)

    # Pipeline
    worker, context = await create_pipeline(transport)
    if worker is None:
        _active_connections.discard(f"rtvi-{cid}")
        await ws.close(code=1011)
        return

    # Run
    task_manager = TaskManager()
    try:
        await worker.run(WorkerParams(task_manager=task_manager))
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"RTVI #{cid} pipeline error: {e}")
    finally:
        _active_connections.discard(f"rtvi-{cid}")
        logger.info(f"RTVI #{cid} done (active: {len(_active_connections)})")


# ===========================================================================
# Web UI (optional)
# ===========================================================================

@app.get("/")
async def web_ui():
    html = CLIENT_HTML / "index.html"
    if html.exists():
        return HTMLResponse(html.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>index.html not found</h1>", status_code=404)

@app.get("/pipecat-client")
async def pipecat_client_ui():
    html = CLIENT_HTML / "pipecat-client.html"
    if html.exists():
        return HTMLResponse(html.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>pipecat-client.html not found</h1>", status_code=404)

@app.get("/assets/{filename}")
async def serve_assets(filename: str):
    from fastapi.responses import FileResponse
    asset = CLIENT_HTML / "assets" / filename
    if asset.exists():
        return FileResponse(str(asset))
    return HTMLResponse("Not found", status_code=404)

@app.get("/health")
async def health():
    return {"status": "ok", "active_connections": len(_active_connections)}


# ===========================================================================
# Main
# ===========================================================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8086"))

    logger.info(f"Pipecat SDK Agent starting on {host}:{port}")
    logger.info(f"  POST /connect → ws://localhost:{port}/rtvi-ws")
    logger.info(f"  Web UI: http://localhost:{port}/pipecat-client")

    uvicorn.run(
        "bot_sdk:app",
        host=host,
        port=port,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        reload=os.getenv("UVICORN_RELOAD", "").lower() == "true",
    )
