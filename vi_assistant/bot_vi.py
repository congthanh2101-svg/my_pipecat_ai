#
# Copyright (c) 2024-2026
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Trợ lý giọng nói tiếng Việt - Pipecat AI Bot.

Ứng dụng voice AI agent real-time với các thành phần chạy local:

- **STT**: Whisper (medium) - nhận dạng giọng nói tiếng Việt
- **LLM**: Ollama (llama3.2:latest) - sinh câu trả lời
- **TTS**: Piper (vi_VN-vais1000-medium) - tổng hợp giọng nói tiếng Việt
- **Transport**: WebRTC (Daily) - truyền tải âm thanh real-time

Chạy bot::

    python bot_vi.py -t daily

Sau đó mở http://localhost:7860 trong trình duyệt.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import (
    DailyRunnerArguments,
    RunnerArguments,
    SmallWebRTCRunnerArguments,
    WebSocketRunnerArguments,
)
import json

from pipecat.frames.frames import Frame, InputTransportMessageFrame, InterruptionFrame
from pipecat.serializers.protobuf import ProtobufFrameSerializer
import pipecat.processors.frameworks.rtvi.models as RTVI
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.transcriptions.language import Language
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams, DailyTransport
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.workers.runner import WorkerRunner

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Cấu hình
# ---------------------------------------------------------------------------

# Thư mục chứa Piper voice model (tiếng Việt)
VOICES_DIR = Path("/opt/ollama-playground/local-voice-agent/voices")

# System prompt cho trợ lý tiếng Việt
SYSTEM_PROMPT = (
    "Bạn là trợ lý giọng nói tiếng Việt thân thiện, hữu ích.\n\n"
    "Quy tắc:\n"
    "- Trả lời ngắn gọn, tự nhiên như đang nói chuyện\n"
    "- Không sử dụng ký tự đặc biệt, markdown, hoặc emoji\n"
    "- Giữ câu trả lời dưới 3-4 câu nếu có thể\n"
    "- Trả lời bằng tiếng Việt\n"
    "- Nếu không biết câu trả lời, hãy nói thẳng là bạn không biết"
)


# ---------------------------------------------------------------------------
# Serializer: RTVI over WebSocket (JSON text + Protobuf binary)
# ---------------------------------------------------------------------------


class RTVIWebSocketSerializer(ProtobufFrameSerializer):
    """Serializer cho WebSocket transport.

    Client SDK (@pipecat-ai/client WebSocketTransport) gửi/nhận MỌI thứ dưới
    dạng **binary Protobuf** (kể cả RTVI JSON được bọc trong
    ``MessageFrame``).  ``ProtobufFrameSerializer`` đã xử lý đúng format này.

    Lớp này kế thừa ``ProtobufFrameSerializer`` và chỉ thêm khả năng nhận
    text frames (RTVI JSON thuần) cho các client không dùng Protobuf.
    """

    def __init__(self):
        super().__init__()
        # ProtobufFrameSerializer.__init__() đã set ignore_rtvi_messages = False

    async def serialize(self, frame: Frame) -> str | bytes | None:
        # Chỉ serialize các frame mà client có thể hiểu được.
        # Client (iK.deserialize) chỉ support "audio" và "message".
        # Mọi thứ khác (interruption, text, transcription) sẽ gây lỗi
        # "Unknown frame kind" trên client.
        if isinstance(frame, InterruptionFrame):
            return None
        return await super().serialize(frame)

    async def deserialize(self, data: str | bytes) -> Frame | None:
        # Text → RTVI JSON (fallback cho client text-based)
        if isinstance(data, str):
            try:
                msg = json.loads(data)
                if isinstance(msg, dict) and msg.get("label") == RTVI.MESSAGE_LABEL:
                    return InputTransportMessageFrame(message=msg)
            except json.JSONDecodeError:
                pass
            return None
        # Binary → Protobuf (mọi thứ: audio, RTVI message frames, …)
        return await super().deserialize(data)


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments) -> None:
    """Xây dựng pipeline và chạy bot.

    Args:
        transport: Transport layer (Daily WebRTC).
        runner_args: Tham số từ development runner.
    """
    logger.info("🚀 Khởi động trợ lý giọng nói tiếng Việt")

    # ------------------------------------------------------------------
    # 1. Speech-to-Text: Whisper medium (nhận dạng tiếng Việt)
    # ------------------------------------------------------------------
    logger.info("Đang tải Whisper STT model (medium)...")

    stt = WhisperSTTService(
        model=Model.MEDIUM,
        language=Language.VI,
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        # RTX 50-series (Blackwell, sm_120) hiện có bug đã biết trong ctranslate2:
        # compute_type="int8" gây lỗi CUBLAS_STATUS_NOT_SUPPORTED. Dùng "float16"
        # làm mặc định an toàn cho mọi GPU NVIDIA hiện đại.
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
    )

    logger.info("✅ Whisper STT sẵn sàng")

    # ------------------------------------------------------------------
    # 2. LLM: Ollama (llama3.2:latest)
    # ------------------------------------------------------------------
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    logger.info(f"Kết nối Ollama LLM tại {ollama_base_url}...")

    llm = OLLamaLLMService(
        model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
        base_url=ollama_base_url,
        settings=OLLamaLLMService.Settings(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=256,
        ),
    )

    logger.info("✅ Ollama LLM sẵn sàng")

    # ------------------------------------------------------------------
    # 3. Text-to-Speech: Piper (tiếng Việt)
    # ------------------------------------------------------------------
    voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
    if not voice_path.exists():
        logger.error(f"❌ Không tìm thấy Piper voice file: {voice_path}")
        logger.error(
            "Tải voice model từ https://huggingface.co/rhasspy/piper-voices "
            "và đặt vào thư mục voices/"
        )
        sys.exit(1)

    logger.info("Đang tải Piper TTS model (tiếng Việt)...")

    tts = PiperTTSService(
        voice_id="vi_VN-vais1000-medium",
        download_dir=VOICES_DIR,
    )

    logger.info("✅ Piper TTS sẵn sàng")

    # ------------------------------------------------------------------
    # 4. Context management (lịch sử hội thoại)
    # ------------------------------------------------------------------
    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    # ------------------------------------------------------------------
    # 5. Pipeline
    # ------------------------------------------------------------------
    #
    # Luồng xử lý:
    #
    #   Micro → DailyInput → WhisperSTT → UserAggregator → OllamaLLM
    #                                                             ↓
    #   Loa   ← DailyOutput ← PiperTTS   ←←←←←←←←←←←←←←←←←←←←
    #                                                             ↓
    #                                                    AssistantAggregator
    #
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        idle_timeout_secs=runner_args.pipeline_idle_timeout_secs,
    )

    # ------------------------------------------------------------------
    # 6. Event handlers
    # ------------------------------------------------------------------

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        """Gửi lời chào khi client kết nối thành công."""
        logger.info("📞 Client đã sẵn sàng, bắt đầu hội thoại")
        context.add_message(
            {"role": "user", "content": "Xin chào! Hãy giới thiệu về bạn."}
        )
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        """Xử lý khi có client kết nối."""
        logger.info("👤 Client đã kết nối")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        """Dừng bot khi client ngắt kết nối."""
        logger.info("👋 Client đã ngắt kết nối")
        await worker.cancel()

    # ------------------------------------------------------------------
    # 7. Chạy bot
    # ------------------------------------------------------------------
    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)
    await runner.run()


async def bot(runner_args: RunnerArguments) -> None:
    """Entry point của bot.

    Được gọi bởi Pipecat development runner. Nhận tham số transport
    từ runner_args và khởi tạo pipeline tương ứng.

    Args:
        runner_args: Tham số từ runner, chứa thông tin transport.
    """
    match runner_args:
        case DailyRunnerArguments():
            logger.info(f"📡 Kết nối Daily room: {runner_args.room_url}")
            transport = DailyTransport(
                runner_args.room_url,
                runner_args.token,
                "Trợ lý Việt",
                params=DailyParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    video_out_enabled=False,
                    camera_out_enabled=False,
                ),
            )
        case SmallWebRTCRunnerArguments():
            logger.info("📡 Kết nối WebRTC (local)")
            webrtc_connection: SmallWebRTCConnection = runner_args.webrtc_connection
            transport = SmallWebRTCTransport(
                webrtc_connection=webrtc_connection,
                params=TransportParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    video_out_enabled=False,
                ),
            )
        case WebSocketRunnerArguments():
            # Kết nối WebSocket "thuần" (client dùng @pipecat-ai/websocket-transport,
            # kết nối tới endpoint ws://<host>:7860/ws-client do runner tự tạo).
            logger.info("📡 Kết nối WebSocket (ws-client)")
            transport = FastAPIWebsocketTransport(
                websocket=runner_args.websocket,
                params=FastAPIWebsocketParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    add_wav_header=False,
                    vad_analyzer=SileroVADAnalyzer(),
                    serializer=RTVIWebSocketSerializer(),
                ),
            )
        case _:
            logger.error(
                f"❌ Loại transport không được hỗ trợ: {type(runner_args).__name__}. "
                "Chạy với -t daily hoặc -t webrtc"
            )
            return

    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pathlib import Path

    from fastapi.responses import HTMLResponse
    from fastapi.staticfiles import StaticFiles
    from pipecat.runner.run import app, main

    CLIENT_HTML = Path(__file__).parent / "client" / "index.html"
    CLIENT_PRE = Path(__file__).parent / "client-pre"

    @app.get("/", include_in_schema=False)
    async def custom_client():
        """Serve custom HTML client."""
        if CLIENT_HTML.exists():
            return HTMLResponse(CLIENT_HTML.read_text(encoding="utf-8"))
        return HTMLResponse("<h1>Chưa tìm thấy client/index.html</h1>", status_code=404)

    if CLIENT_PRE.is_dir():
        app.mount("/client-pre", StaticFiles(directory=str(CLIENT_PRE), html=True))

    main()
