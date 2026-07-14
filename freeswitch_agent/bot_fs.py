"""
FreeSWITCH Voice Agent — Pipecat AI Bot với WebSocket transport
================================================================
STT: Whisper (medium, vi) | LLM: Ollama (llama3.2) | TTS: Piper (vi_VN)

Endpoints:
  /audio-stream  → L16 PCM (FreeSWITCH mod_audio_stream)
  /rtvi-ws       → RTVI/Protobuf (Pipecat Client SDK)
  /connect       → REST cho RTVI client
  /              → Web UI test (L16)
  /health        → Health check
"""

import asyncio, os
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import numpy as np

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    OutputAudioRawFrame,
    LLMRunFrame,
    TextFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
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
from pipecat.processors.frame_processor import FrameProcessor
from pipecat.processors.frameworks.rtvi import RTVIObserverParams
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

from l16_serializer import L16FrameSerializer

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

app = FastAPI(title="FreeSWITCH Voice Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

CLIENT_HTML = Path(__file__).parent / "client"
_active_connections: set[str] = set()

# ---------------------------------------------------------------------------
# Serializer: RTVI → Float32→Int16 + NaN cleanup
# ---------------------------------------------------------------------------
class RTVICompatibleSerializer(ProtobufFrameSerializer):
    """Protobuf serializer cho Pipecat Client SDK (v1.4.x).

    - SERIALIZE: chỉ gửi OutputAudioRawFrame + MessageFrame
    - DESERIALIZE: Float32→Int16 + NaN cleanup
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
        if isinstance(frame, InputAudioRawFrame) and frame.audio:
            float32 = np.frombuffer(frame.audio, dtype=np.float32).copy()
            # Clean NaN/INF → 0 (client SDK gửi Float32 lỗi)
            float32 = np.nan_to_num(float32, nan=0.0, posinf=0.0, neginf=0.0)
            float32 = np.clip(float32, -1.0, 1.0)
            frame.audio = (float32 * 32767).astype(np.int16).tobytes()
        return frame

# ---------------------------------------------------------------------------
# Pipeline factory — RTVI
# ---------------------------------------------------------------------------
async def create_rtvi_pipeline(
    transport: FastAPIWebsocketTransport,
) -> tuple[PipelineWorker, LLMContext] | tuple[None, None]:
    """Tạo pipeline RTVI (Pipecat Client SDK)."""
    # STT (GPU nếu có)
    stt = WhisperSTTService(
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        settings=WhisperSTTService.Settings(
            model=Model.BASE,
            language=Language.VI,
            no_speech_prob=0.6,
        ),
    )

    # LLM
    llm = OLLamaLLMService(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        settings=OLLamaLLMService.Settings(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=64,
        ),
    )

    # TTS
    voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
    if not voice_path.exists():
        logger.error(f"Piper voice not found: {voice_path}")
        return None, None
    tts = PiperTTSService(
        download_dir=VOICES_DIR,
        sample_rate=24000,
        settings=PiperTTSService.Settings(voice="vi_VN-vais1000-medium"),
    )

    # Context
    context = LLMContext()
    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=15.0,
            user_turn_strategies=UserTurnStrategies(
                stop=[SpeechTimeoutUserTurnStopStrategy(
                    user_speech_timeout=0.6,
                    wait_for_transcript=False,
                )],
            ),
        ),
    )

    # VAD
    vad = VADProcessor(
        vad_analyzer=SileroVADAnalyzer(
            params=VADParams(confidence=0.5, min_volume=0.01),
        )
    )

    # Pipeline
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
        params=PipelineParams(enable_metrics=False, enable_usage_metrics=False),
        idle_timeout_secs=int(os.getenv("IDLE_TIMEOUT_SECS", "300")),
        rtvi_observer_params=RTVIObserverParams(
            bot_output_enabled=False,
            bot_tts_enabled=True,
            bot_speaking_enabled=False,  # Tắt bot-interrupted (v1 client không hiểu)
            user_llm_enabled=False,
            metrics_enabled=False,
        ),
    )

    # Greeting
    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        context.add_message(
            {"role": "user", "content": "Chào bạn, hãy nói ngắn gọn tên bạn là gì?"}
        )
        await worker.queue_frames([LLMRunFrame()])

    return worker, context

# ---------------------------------------------------------------------------
# WebSocket: /rtvi-ws (RTVI/Protobuf)
# ---------------------------------------------------------------------------
_rtvi_conn_counter = 0

@app.websocket("/rtvi-ws")
async def rtvi_websocket(ws: WebSocket):
    global _rtvi_conn_counter
    _rtvi_conn_counter += 1
    conn_id = _rtvi_conn_counter
    await ws.accept()
    _active_connections.add(f"rtvi-{conn_id}")
    logger.info(f"RTVI #{conn_id} connected (active: {len(_active_connections)})")

    params = FastAPIWebsocketParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        serializer=RTVICompatibleSerializer(),
        audio_in_sample_rate=8000,
        audio_out_sample_rate=24000,
        allowed_origins=[],
    )
    transport = FastAPIWebsocketTransport(websocket=ws, params=params)

    worker, context = await create_rtvi_pipeline(transport)
    if worker is None:
        _active_connections.discard(f"rtvi-{conn_id}")
        await ws.close(code=1011)
        return

    @transport.event_handler("on_client_disconnected")
    async def on_disconnect(t, client):
        logger.info(f"RTVI #{conn_id} disconnected")
        await worker.cancel()

    try:
        task_manager = TaskManager()
        await worker.run(WorkerParams(task_manager=task_manager))
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"RTVI #{conn_id} error: {e}")
    finally:
        _active_connections.discard(f"rtvi-{conn_id}")

# ---------------------------------------------------------------------------
# REST: /connect (RTVI)
# ---------------------------------------------------------------------------
@app.post("/connect")
async def rtvi_connect():
    return {"wsUrl": f"ws://localhost:{os.getenv('PORT', '8086')}/rtvi-ws"}

# ---------------------------------------------------------------------------
# WebSocket: /audio-stream (FreeSWITCH L16)
# ---------------------------------------------------------------------------
@app.websocket("/audio-stream")
async def audio_stream(ws: WebSocket):
    await ws.accept()
    cid = f"{ws.client.host if ws.client else '?'}:{id(ws)}"
    _active_connections.add(cid)
    logger.info(f"L16 connected from {cid} (active: {len(_active_connections)})")

    params = FastAPIWebsocketParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        serializer=L16FrameSerializer(sample_rate=8000),
        audio_in_sample_rate=8000,
        audio_out_sample_rate=8000,
        allowed_origins=[],
    )
    transport = FastAPIWebsocketTransport(websocket=ws, params=params)

    stt = WhisperSTTService(
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        settings=WhisperSTTService.Settings(
            model=Model.BASE,
            language=Language.VI,
            no_speech_prob=0.6,
        ),
    )
    llm = OLLamaLLMService(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        settings=OLLamaLLMService.Settings(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=64,
        ),
    )
    voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
    if not voice_path.exists():
        _active_connections.discard(cid)
        await ws.close(code=1011)
        return
    tts = PiperTTSService(
        download_dir=VOICES_DIR,
        sample_rate=8000,
        settings=PiperTTSService.Settings(voice="vi_VN-vais1000-medium"),
    )
    context = LLMContext()
    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=15.0,
            user_turn_strategies=UserTurnStrategies(
                stop=[SpeechTimeoutUserTurnStopStrategy(
                    user_speech_timeout=0.6,
                    wait_for_transcript=False,
                )],
            ),
        ),
    )
    vad = VADProcessor(
        vad_analyzer=SileroVADAnalyzer(
            params=VADParams(confidence=0.5, min_volume=0.01),
        )
    )
    pipeline = Pipeline([
        transport.input(), vad, stt, user_agg, llm, tts,
        transport.output(), assistant_agg,
    ])
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(enable_metrics=False, enable_usage_metrics=False),
        idle_timeout_secs=int(os.getenv("IDLE_TIMEOUT_SECS", "300")),
    )

    async def send_greeting():
        await asyncio.sleep(0.3)
        context.add_message(
            {"role": "user", "content": "Chào bạn, hãy nói ngắn gọn tên bạn là gì?"}
        )
        await worker.queue_frames([LLMRunFrame()])
    greet_task = asyncio.create_task(send_greeting())

    @transport.event_handler("on_client_disconnected")
    async def on_disconnect(t, client):
        await worker.cancel()

    try:
        task_manager = TaskManager()
        await worker.run(WorkerParams(task_manager=task_manager))
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"L16 error: {e}")
    finally:
        greet_task.cancel()
        _active_connections.discard(cid)

# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def web_ui():
    html = CLIENT_HTML / "index.html"
    return HTMLResponse(html.read_text(encoding="utf-8")) if html.exists() else HTMLResponse("Not found", 404)

@app.get("/pipecat-client")
async def pipecat_client_ui():
    html = CLIENT_HTML / "pipecat-client.html"
    return HTMLResponse(html.read_text(encoding="utf-8")) if html.exists() else HTMLResponse("Not found", 404)

@app.get("/assets/{filename}")
async def serve_assets(filename: str):
    from fastapi.responses import FileResponse
    asset = CLIENT_HTML / "assets" / filename
    return FileResponse(str(asset)) if asset.exists() else HTMLResponse("Not found", 404)

@app.get("/health")
async def health():
    return {"status": "ok", "active_connections": len(_active_connections)}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8086"))
    logger.info(f"FreeSWITCH Voice Agent @ {host}:{port}")
    uvicorn.run("bot_fs:app", host=host, port=port,
                log_level=os.getenv("LOG_LEVEL", "info").lower(),
                reload=os.getenv("UVICORN_RELOAD", "").lower() == "true")
