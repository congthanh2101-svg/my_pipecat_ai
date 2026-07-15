"""
FreeSWITCH Voice Agent — Pipecat AI Bot
========================================
Rewrite based on pipecat-examples/websocket pattern:
- SileroVADAnalyzer (instead of custom RMS VAD)
- WorkerRunner lifecycle (instead of manual TaskManager)
- worker.rtvi.event_handler("on_client_ready") for RTVI greeting

STT: Whisper (medium, auto-language) | LLM: Ollama (llama3.2) | TTS: Piper (vi_VN)

Endpoints:
  /audio-stream   → L16 PCM (FreeSWITCH mod_audio_stream / browser)
  /rtvi-ws        → RTVI/Protobuf (Pipecat Client SDK)
  /connect        → REST for RTVI client
  /chat           → POST text chat
  /pipecat-client → RTVI client UI
  /pipecat-client2 → L16 client UI
  /               → index.html
  /health         → health check
"""

import asyncio
import os
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    InputAudioRawFrame,
    LLMRunFrame,
    OutputAudioRawFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frameworks.rtvi import RTVIObserverParams
from pipecat.serializers.protobuf import MessageFrame, ProtobufFrameSerializer
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.services.whisper.stt import WhisperSTTService, Model

from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.utils.asyncio.task_manager import TaskManager
from pipecat.workers.runner import WorkerRunner

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIENT_HTML = Path(__file__).parent / "client"
REACT_C1_DIR = Path("/opt/my_pipecat_ai/react-c1")
_active_connections: set[str] = set()
_chat_queue: dict[str, asyncio.Queue] = {}
_connection_counter = 0


# ---------------------------------------------------------------------------
# RTVI Serializer — protobuf with Float32→Int16 conversion
# ---------------------------------------------------------------------------
class RTVICompatibleSerializer(ProtobufFrameSerializer):
    """Protobuf serializer for Pipecat Client SDK (v1.4.x).

    Converts Float32 audio from RTVI protocol to Int16 for processing.
    No callback — audio flows through the normal pipeline.
    """

    SERIALIZABLE_TYPES = {
        OutputAudioRawFrame: "audio",
        MessageFrame: "message",
    }
    SERIALIZABLE_FIELDS = {
        "audio": OutputAudioRawFrame,
        "message": MessageFrame,
    }

    async def deserialize(self, data: str | bytes) -> "Frame | None":
        try:
            return await self._deserialize(data)
        except Exception:
            logger.exception("RTVI deserialize error")
            return None

    async def _deserialize(self, data: str | bytes) -> "Frame | None":
        # Try parent deserialize first
        try:
            frame = await super().deserialize(data)
        except Exception:
            frame = None

        # Fallback manual protobuf parse
        if frame is None and isinstance(data, bytes):
            try:
                from pipecat.serializers import frame_protos

                proto = frame_protos.Frame.FromString(data)
                which = proto.WhichOneof("frame")
                if which == "audio":
                    af = proto.audio
                    if af.audio:
                        frame = InputAudioRawFrame(
                            audio=af.audio,
                            sample_rate=af.sample_rate,
                            num_channels=af.num_channels,
                        )
            except Exception:
                pass

        # Convert Float32 (RTVI format) to Int16
        if isinstance(frame, InputAudioRawFrame) and frame.audio:
            float32 = np.frombuffer(frame.audio, dtype=np.float32).copy()
            # Clean NaN/Inf
            if not np.all(np.isfinite(float32)):
                float32 = np.nan_to_num(float32, nan=0.0, posinf=0.0, neginf=0.0)
            float32 = np.clip(float32, -1.0, 1.0)
            frame.audio = (float32 * 32767).astype(np.int16).tobytes()

        return frame


# ---------------------------------------------------------------------------
# Services factory
# ---------------------------------------------------------------------------
def create_services():
    """Create STT, LLM, and TTS services with shared config."""
    voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
    if not voice_path.exists():
        logger.error(f"Piper voice not found: {voice_path}")
        return None, None, None

    stt = WhisperSTTService(
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        settings=WhisperSTTService.Settings(
            model=Model.MEDIUM,
            language=None,  # auto-detect
            no_speech_prob=0.3,
        ),
    )

    llm = OLLamaLLMService(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        settings=OLLamaLLMService.Settings(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=128,
        ),
    )

    tts = PiperTTSService(
        download_dir=VOICES_DIR,
        sample_rate=22050,  # Khớp native rate của Piper, tránh SoX resampling mất âm cuối
        settings=PiperTTSService.Settings(voice="vi_VN-vais1000-medium"),
    )

    return stt, llm, tts


# ---------------------------------------------------------------------------
# Pipeline factory — shared by RTVI and L16 paths
# ---------------------------------------------------------------------------
async def create_pipeline(
    transport: FastAPIWebsocketTransport,
    stt: WhisperSTTService,
    llm: OLLamaLLMService,
    tts: PiperTTSService,
    *,
    max_tokens: int = 128,
) -> tuple[PipelineWorker, LLMContext]:
    """Create a Pipecat pipeline using SileroVADAnalyzer (standard pattern).

    Based on pipecat-examples/websocket/bot.py but with Whisper/Ollama/Piper
    instead of Gemini. Uses WorkerRunner for lifecycle management instead of
    direct PipelineWorker.run().

    Returns:
        Tuple of (PipelineWorker, LLMContext). Each WebSocket path adds its
        own greeting handler before passing to WorkerRunner.
    """
    context = LLMContext()

    # Update LLM max_tokens
    llm._settings.max_tokens = max_tokens

    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(sample_rate=8000),
            user_turn_stop_timeout=120.0,
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_agg,
            llm,
            tts,
            transport.output(),
            assistant_agg,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=False,
            enable_usage_metrics=False,
        ),
        idle_timeout_secs=int(os.getenv("IDLE_TIMEOUT_SECS", "300")),
        rtvi_observer_params=RTVIObserverParams(
            bot_output_enabled=False,
            bot_tts_enabled=True,
            bot_speaking_enabled=False,
            user_llm_enabled=False,
            metrics_enabled=False,
        ),
    )

    # Shared disconnect handler — cancels worker, which ends WorkerRunner
    @transport.event_handler("on_client_disconnected")
    async def _on_disconnect(t, client):
        await worker.cancel()

    return worker, context


# ---------------------------------------------------------------------------
# Helper: chat poller
# ---------------------------------------------------------------------------
def start_chat_poller(
    chat_q: asyncio.Queue,
    context: LLMContext,
    worker: PipelineWorker,
    label: str = "",
) -> asyncio.Task:
    """Start a background task that polls the chat queue and injects frames."""

    async def _poller():
        try:
            while True:
                try:
                    text = await asyncio.wait_for(chat_q.get(), timeout=0.2)
                    logger.info(f"📝 {label}Chat: {text}")
                    context.add_message({"role": "user", "content": text})
                    await worker.queue_frames([LLMRunFrame()])
                except asyncio.TimeoutError:
                    continue
        except Exception:
            pass

    return asyncio.create_task(_poller())


# ---------------------------------------------------------------------------
# Helper: run worker via WorkerRunner
# ---------------------------------------------------------------------------
async def run_worker_with_runner(worker: PipelineWorker) -> None:
    """Run a worker using WorkerRunner (standard Pipecat lifecycle pattern)."""
    runner = WorkerRunner(
        task_manager=TaskManager(),
        handle_sigint=False,  # uvicorn handles SIGINT
        handle_sigterm=False,
    )
    await runner.add_workers(worker)
    await runner.run()


# ---------------------------------------------------------------------------
# WebSocket: /rtvi-ws (RTVI/Protobuf for Pipecat Client SDK)
# ---------------------------------------------------------------------------
@app.websocket("/rtvi-ws")
async def rtvi_websocket(ws: WebSocket):
    global _connection_counter
    _connection_counter += 1
    conn_id = _connection_counter
    await ws.accept()
    _active_connections.add(f"rtvi-{conn_id}")
    logger.info(f"🔵 RTVI #{conn_id} connected ({len(_active_connections)} active)")

    chat_task: asyncio.Task | None = None
    worker: PipelineWorker | None = None

    try:
        serializer = RTVICompatibleSerializer()
        params = FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_in_passthrough=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=serializer,
            audio_in_sample_rate=8000,
            audio_out_sample_rate=22050,  # Khớp với Piper native rate
            allowed_origins=[],
        )
        transport = FastAPIWebsocketTransport(websocket=ws, params=params)

        stt, llm, tts = create_services()
        if stt is None:
            _active_connections.discard(f"rtvi-{conn_id}")
            await ws.close(code=1011)
            return

        worker, context = await create_pipeline(transport, stt, llm, tts, max_tokens=64)

        # RTVI greeting (fires after RTVI handshake completes)
        @worker.rtvi.event_handler("on_client_ready")
        async def _on_client_ready(rtvi):
            async def _delayed_greet():
                await asyncio.sleep(0.5)
                context.add_message(
                    {"role": "user", "content": "Chào bạn, hãy nói ngắn gọn tên bạn là gì?"}
                )
                await worker.queue_frames([LLMRunFrame()])
                logger.info("📞 RTVI greeting sent")
            asyncio.create_task(_delayed_greet())

        # Chat queue
        rtvi_cid = f"rtvi-{conn_id}"
        chat_q: asyncio.Queue = asyncio.Queue()
        _chat_queue[rtvi_cid] = chat_q
        chat_task = start_chat_poller(chat_q, context, worker, label=f"RTVI #{conn_id} ")

        await run_worker_with_runner(worker)

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"RTVI #{conn_id} setup failed: {e}")
        logger.exception(e)
    finally:
        try:
            if chat_task:
                chat_task.cancel()
        except Exception:
            pass
        _chat_queue.pop(f"rtvi-{conn_id}", None)
        _active_connections.discard(f"rtvi-{conn_id}")
        logger.info(f"RTVI #{conn_id} cleaned up")


# ---------------------------------------------------------------------------
# REST: /connect (RTVI)
# ---------------------------------------------------------------------------
@app.post("/connect")
async def rtvi_connect():
    port = os.getenv("PORT", "8086")
    return {"wsUrl": f"ws://localhost:{port}/rtvi-ws"}


# ---------------------------------------------------------------------------
# WebSocket: /audio-stream (L16 PCM + chat)
# ---------------------------------------------------------------------------
@app.websocket("/audio-stream")
async def audio_stream(ws: WebSocket):
    await ws.accept()
    cid = f"{ws.client.host if ws.client else '?'}:{id(ws)}"
    _active_connections.add(cid)
    logger.info(f"🟢 L16 connected from {cid} ({len(_active_connections)} active)")

    chat_task: asyncio.Task | None = None
    worker: PipelineWorker | None = None

    try:
        l16_ser = L16FrameSerializer(sample_rate=8000)
        params = FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_in_passthrough=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=l16_ser,
            audio_in_sample_rate=8000,
            audio_out_sample_rate=22050,  # TTS output rate, L16 serializer sẽ resample xuống 8000
            allowed_origins=[],
        )
        transport = FastAPIWebsocketTransport(websocket=ws, params=params)

        stt, llm, tts = create_services()
        if stt is None:
            _active_connections.discard(cid)
            await ws.close(code=1011)
            return

        worker, context = await create_pipeline(transport, stt, llm, tts, max_tokens=128)

        # L16 greeting (fires on transport connect)
        @transport.event_handler("on_client_connected")
        async def _on_client_connected(t, client):
            async def _delayed_greet():
                await asyncio.sleep(0.5)
                context.add_message(
                    {"role": "user", "content": "Chào bạn, hãy nói ngắn gọn tên bạn là gì?"}
                )
                await worker.queue_frames([LLMRunFrame()])
                logger.info("📞 L16 greeting sent")
            asyncio.create_task(_delayed_greet())

        # Chat queue
        chat_q: asyncio.Queue = asyncio.Queue()
        _chat_queue[cid] = chat_q
        chat_task = start_chat_poller(chat_q, context, worker, label="L16 ")

        await run_worker_with_runner(worker)

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"L16 error: {e}")
    finally:
        try:
            if chat_task:
                chat_task.cancel()
        except Exception:
            pass
        _chat_queue.pop(cid, None)
        _active_connections.discard(cid)


# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def web_ui():
    path = CLIENT_HTML / "index.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/pipecat-client")
async def pipecat_client_ui():
    path = CLIENT_HTML / "pipecat-client.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/pipecat-client2")
async def pipecat_client2_ui():
    path = CLIENT_HTML / "pipecat-client2.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/assets/{filename}")
async def serve_assets(filename: str):
    from fastapi.responses import FileResponse

    path = CLIENT_HTML / "assets" / filename
    return FileResponse(str(path)) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/react-c1")
async def react_c1_ui():
    path = REACT_C1_DIR / "index.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/react-c1/assets/{filename}")
async def react_c1_assets(filename: str):
    from fastapi.responses import FileResponse

    path = REACT_C1_DIR / "assets" / filename
    return FileResponse(str(path)) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/react-c1/{filename}")
async def react_c1_files(filename: str):
    from fastapi.responses import FileResponse

    path = REACT_C1_DIR / filename
    return FileResponse(str(path)) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/audio-processor.js")
async def audio_processor():
    from fastapi.responses import FileResponse

    path = REACT_C1_DIR / "audio-processor.js"
    return FileResponse(str(path)) if path.exists() else HTMLResponse("Not found", 404)


@app.websocket("/ws-test")
async def ws_test(ws: WebSocket):
    """WebSocket echo test."""
    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            await ws.send_text(f"Echo: {data}")
    except Exception:
        pass


class ChatMessage(BaseModel):
    text: str
    connection_id: str = ""


@app.post("/chat")
async def chat_endpoint(data: ChatMessage):
    """POST /chat — send text to the bot."""
    text = data.text.strip()
    if not text:
        return {"status": "error", "message": "text is required"}
    q = _chat_queue.get(data.connection_id)
    if q is None and _chat_queue:
        q = list(_chat_queue.values())[-1]
    if q:
        await q.put(text)
        return {"status": "ok"}
    return {"status": "error", "message": "no active connection"}


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
    uvicorn.run(
        "bot_fs:app",
        host=host,
        port=port,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        reload=os.getenv("UVICORN_RELOAD", "").lower() == "true",
    )
