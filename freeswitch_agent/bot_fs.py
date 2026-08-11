"""
FreeSWITCH Voice Agent — Pipecat AI Bot
========================================
Rewrite based on pipecat-examples/websocket pattern:
- SileroVADAnalyzer (instead of custom RMS VAD)
- WorkerRunner lifecycle (instead of manual TaskManager)
- worker.rtvi.event_handler("on_client_ready") for RTVI greetingPiperVoice

STT: Whisper (large-v3) / VietASR (Zipformer) / Gipformer (Zipformer) | LLM: Ollama/Deepseek | TTS: Piper/OmniVoice/VieNeu

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
import io
import json
import os
import re
import time
import uuid
import wave
from pathlib import Path
from typing import Any

import base64
import httpx
import numpy as np
import soxr          # ← THÊM DÒNG NÀY
from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from openai import OpenAI
from pydantic import BaseModel, Field

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    InputAudioRawFrame,
    InterruptionFrame,
    LLMRunFrame,
    OutputAudioRawFrame,
    OutputTransportMessageFrame,
    TTSAudioRawFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.audio.vad_processor import VADProcessor
from pipecat.frames.frames import LLMFullResponseEndFrame, LLMFullResponseStartFrame, LLMTextFrame, TextFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frameworks.rtvi import RTVIObserverParams
from pipecat.serializers.protobuf import MessageFrame, ProtobufFrameSerializer
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.transcriptions.language import Language

from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.utils.asyncio.task_manager import TaskManager
from pipecat.workers.runner import WorkerRunner

from l16_serializer import FSJsonFrameSerializer, FSProtobufFrameSerializer
from hallucination_filter import HallucinationFilter

from pronunciation_normalizer import PronunciationNormalizer
from omnivoice_tts import OmniVoiceTTSService
from vieneu_tts import VieNeuTTSService
from vietasr_stt import VietASRSTTService
from gipformer_stt import GipformerSTTService
from call_logger import CallLogger, extract_conversation
from knowledge_base import KnowledgeBase, get_knowledge_base
from rag_processor import RAGProcessor
from fs_tools import create_transfer_tool, create_transfer_extension_tool, cleanup_http_client
from dtmf_detector import DTMFDetectorProcessor, DTMFPollProcessor
from dtmf_handler import DTMFActionHandler
from pipecat.processors.aggregators.dtmf_aggregator import DTMFAggregator
from crm_db import get_crm_db
from crm_tools import create_crm_tools

import logging

# Tắt log chi tiết từng frame WebSocket (rất nhiều, không cần thiết khi vận hành)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("websockets.client").setLevel(logging.WARNING)
logging.getLogger("websockets.server").setLevel(logging.WARNING)


HALLUCINATION_CONFIG_PATH = str(Path(__file__).parent / "hallucination_phrases.json")
PRONUNCIATION_CONFIG_PATH = str(Path(__file__).parent / "pronunciation_dict.json")

"""
DEBUG: log full text giữa LLM và TTS
=====================================
Mục đích: xác nhận xem văn bản LLM trả về có bị CẮT CỤT (do chạm max_tokens)
hay không, trước khi đổ lỗi cho audio pipeline.
 
Cách dùng:
1. Import class này vào bot_fs.py
2. Chèn vào pipeline TRƯỚC tts, ví dụ:
 
    pipeline = Pipeline([
        transport.input(),
        vad,
        stt,
        user_agg,
        llm,
        TextDebugLogger("llm-to-tts"),   # <-- thêm dòng này
        tts,
        TTSAudioProcessor(),
        transport.output(),
        assistant_agg,
    ])
 
3. Gọi thử vài câu qua SIP, xem log server. Nếu thấy dòng cuối cùng của mỗi
   turn KHÔNG kết thúc bằng dấu câu (. ? ! …) hoặc dừng giữa từ → chắc chắn
   là bị cắt do max_tokens, không phải do audio.
4. Xoá processor này sau khi debug xong (hoặc để lại, log rất nhẹ).
"""
class TextDebugLogger(FrameProcessor):
    def __init__(self, tag: str = "text-debug"):
        super().__init__()
        self._tag = tag
        self._buf = ""
 
    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
 
        # LLMTextFrame: từng mảnh text streaming từ LLM
        if isinstance(frame, (LLMTextFrame, TextFrame)):
            self._buf += frame.text
        elif isinstance(frame, LLMFullResponseEndFrame):
            ends_clean = self._buf.rstrip().endswith((".", "?", "!", "…", ":"))
            marker = "✅ OK" if ends_clean else "⚠️ CÓ THỂ BỊ CẮT (không kết thúc bằng dấu câu)"
            logger.info(f"📝[{self._tag}] Full text ({len(self._buf)} chars) {marker}: {self._buf!r}")
            self._buf = ""
 
        await self.push_frame(frame, direction)

# ---------------------------------------------------------------------------
# DEBUG: WhisperSTTService có log chi tiết từng bước — dùng để chẩn đoán vì
# sao không có TranscriptionFrame nào được tạo ra dù VAD hoạt động đúng.
# Xoá lớp này (và dùng lại WhisperSTTService gốc) sau khi debug xong.
# ---------------------------------------------------------------------------
class DebugWhisperSTTService(WhisperSTTService):
    async def run_stt(self, audio: bytes):
        import numpy as np
        from pipecat.frames.frames import ErrorFrame, TranscriptionFrame
        from pipecat.services.settings import assert_given
        from pipecat.utils.time import time_now_iso8601

        samples_dbg = np.frombuffer(audio, dtype=np.int16)
        rms_dbg = (
            float(np.sqrt(np.mean(samples_dbg.astype(np.float64) ** 2)))
            if len(samples_dbg) else 0.0
        )
        logger.info(
            f"🎤 run_stt() được gọi: {len(audio)} bytes, "
            f"{len(samples_dbg) / 8000:.2f}s, rms={rms_dbg:.0f}"
        )

        if not self._model:
            logger.error("🎤 run_stt: self._model là None!")
            yield ErrorFrame("Whisper model not available")
            return

        await self.start_processing_metrics()
        audio_float = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
        language = assert_given(self._settings.language)

        try:
            segments, info = await asyncio.to_thread(
                self._model.transcribe, audio_float, language=language
            )
            seg_list = list(segments)
        except Exception as e:
            logger.exception(f"🎤 run_stt: model.transcribe() raise exception: {e}")
            await self.stop_processing_metrics()
            yield ErrorFrame(f"Whisper transcribe error: {e}")
            return

        no_speech_prob_threshold = assert_given(self._settings.no_speech_prob)
        logger.info(
            f"🎤 run_stt: {len(seg_list)} segment(s) trả về, "
            f"threshold={no_speech_prob_threshold}, language={language}"
        )

        text = ""
        for i, segment in enumerate(seg_list):
            logger.info(
                f"🎤   segment[{i}]: text={segment.text!r} "
                f"no_speech_prob={segment.no_speech_prob:.3f}"
            )
            if (
                no_speech_prob_threshold is not None
                and segment.no_speech_prob < no_speech_prob_threshold
            ):
                text += f"{segment.text} "

        await self.stop_processing_metrics()

        if text:
            # Kiểm tra hallucination TRƯỚC khi yield — nếu là ảo giác,
            # không yield TranscriptionFrame → RTVIObserver không gửi đến client
            if not hasattr(self, "_hallucination_filter"):
                from hallucination_filter import HallucinationFilter
                self._hallucination_filter = HallucinationFilter(HALLUCINATION_CONFIG_PATH)
            if self._hallucination_filter.is_hallucination(text):
                logger.warning(f"🚫 DebugWhisperSTTService chặn hallucination: {text!r}")
                return  # Không yield frame nào — cả audio lẫn text đều không có

            logger.info(f"🎤 run_stt: text cuối cùng = [{text}]")
            yield TranscriptionFrame(text, self._user_id, time_now_iso8601(), language)
        else:
            logger.warning(
                "🎤 run_stt: text RỖNG sau khi lọc — mọi segment đều bị no_speech_prob "
                "loại bỏ (hoặc Whisper không nhận diện được segment nào)."
            )

# override=False (mặc định): env đã set sẵn (command line / systemd) thắng .env.
# .env chỉ cung cấp default — nếu không, .env sẽ ghi đè mọi biến command-line
# (vd: TTS_ENGINE=vieneu trên lệnh bị .env TTS_ENGINE=omnivoice nuốt mất).
load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
VOICES_DIR = Path(os.getenv("PIPER_VOICES_DIR", "/opt/ollama-playground/local-voice-agent/voices"))

# STT Provider: "whisper" (mặc định), "vietasr", hoặc "gipformer"
STT_PROVIDER = os.getenv("STT_PROVIDER", "whisper").lower()
VIETASR_MODEL_DIR = os.getenv("VIETASR_MODEL_DIR", str(Path(__file__).parent / "models" / "vietasr"))
VIETASR_PROVIDER = os.getenv("VIETASR_PROVIDER", "cuda")
GIPFORMER_MODEL_DIR = os.getenv("GIPFORMER_MODEL_DIR", str(Path(__file__).parent / "models" / "gipformer"))
GIPFORMER_USE_INT8 = os.getenv("GIPFORMER_USE_INT8", "false").lower() == "true"
GIPFORMER_PROVIDER = os.getenv("GIPFORMER_PROVIDER", "cuda")

# LLM Provider: "ollama" (local) hoặc "deepseek" (API cloud)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
OLLAMA_EXTRA = os.getenv("OLLAMA_EXTRA", '{"extra_body": {"options": {"think": false}}}')
# LLM postprocess cho trang /stt-test: thêm dấu câu, viết hoa, giữ nguyên nội dung
STT_LLM_MODEL = os.getenv("STT_LLM_MODEL", "qwen3:4b-instruct")
# Download YouTube cho trang /stt-test (POST /stt/url)
YTDLP_MAX_FILESIZE = int(os.getenv("YTDLP_MAX_FILESIZE", str(50 * 1024 * 1024)))  # 50MB
YTDLP_MAX_DURATION = int(os.getenv("YTDLP_MAX_DURATION", "600"))  # 10 phút (audio/STT)
# Trang /yt-download — tải video YouTube (cho phép video dài hơn)
YTDLP_VIDEO_MAX_DURATION = int(os.getenv("YTDLP_VIDEO_MAX_DURATION", "1800"))  # 30 phút
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
DEEPSEEK_TEMPERATURE = float(os.getenv("DEEPSEEK_TEMPERATURE", "0.3"))
DEEPSEEK_MAX_TOKENS = int(os.getenv("DEEPSEEK_MAX_TOKENS", "1024"))
# Bật/tắt PronunciationNormalizer. Tắt (=false) nếu bot bị ngưng giữa câu.
PRONUNCIATION_NORMALIZER_ENABLED = os.getenv("PRONUNCIATION_NORMALIZER_ENABLED", "true").lower() == "true"

# TTS Engine: "piper" (mặc định, CPU/GPU) hoặc "omnivoice" (GPU, chất lượng cao)
TTS_ENGINE = os.getenv("TTS_ENGINE", "piper").lower()
OMNIVOICE_VOICE_PROFILE = os.getenv("OMNIVOICE_VOICE_PROFILE", str(Path(__file__).parent / "voice_profile_nu_mien_bac_1.pt"))
OMNIVOICE_MODEL = os.getenv("OMNIVOICE_MODEL", "k2-fsa/OmniVoice")
OMNIVOICE_NUM_STEP = int(os.getenv("OMNIVOICE_NUM_STEP", "32"))
# OmniVoice API server (standalone) — dùng cho trang /tts-test
OMNIVOICE_API_URL = os.getenv("OMNIVOICE_API_URL", "http://localhost:8001").rstrip("/")

# VieNeu-TTS (v3 Turbo, ONNX CPU): 14 giọng có sẵn + 3 style
VIENEU_VOICE = os.getenv("VIENEU_VOICE", "Trúc Ly")  # xem danh sách: vieneu.list_preset_voices()
VIENEU_STYLE = os.getenv("VIENEU_STYLE", "tu_nhien")  # tu_nhien | tin_tuc | doc_truyen
VIENEU_BACKEND = os.getenv("VIENEU_BACKEND", "onnx")  # onnx (CPU) | v3turbo (GPU torch)
VIENEU_PRECISION = os.getenv("VIENEU_PRECISION", "int8")  # int8 (mặc định) | fp32
VIENEU_CHUNK_DURATION_S = float(os.getenv("VIENEU_CHUNK_DURATION_S", "0.25"))

# FreeSWITCH Rest API — dùng cho tool calling (chuyển cuộc gọi đến queue tổng đài)
FS_API_BASE_URL = os.getenv("FS_API_BASE_URL", "http://192.168.1.153:8443/api/v1")
FS_API_USERNAME = os.getenv("FS_API_USERNAME", "admin")
FS_API_PASSWORD = os.getenv("FS_API_PASSWORD", "Winter2024$")
FS_API_QUEUE = os.getenv("FS_API_QUEUE", "support@default")

# DTMF detection: bật/tắt phát hiện phím bấm từ điện thoại
DTMF_ENABLED = os.getenv("DTMF_ENABLED", "true").lower() == "true"

SYSTEM_PROMPT = (
    "Bạn là trợ lý giọng nói tiếng Việt thân thiện, hữu ích.\n\n"
    "Quy tắc:\n"
    "- Bạn tên là Xon Len hay còn gọi là Xen Long, trợ lý giọng nói thân thiện.\n"
    "- Trả lời NGẮN GỌN, tối đa 20-50 câu.\n"
    "- LUÔN LUÔN có khoảng trắng giữa các từ và cuối câu phải có dấu chấm, dấu hỏi, dấu phẩy hoặc dấu chấm than.\n"
    "- Ví dụ viết ĐÚNG: 'Tôi là Xon Len' — KHÔNG viết 'TôilàXonLen'.\n"
    "- TUYỆT ĐỐI KHÔNG được dùng markdown, ký tự đặc biệt, dấu sao ** **, dấu gạch * *, dấu `, dấu #, emoji, hay bất kỳ định dạng nào. \n"
    "- Chỉ trả lời bằng chữ thuần tuý, không có ký hiệu định dạng.\n"
    "- Trả lời bằng tiếng Việt.\n"
    "- Khi khách hàng yêu cầu gặp nhân viên hỗ trợ / tổng đài viên / tư vấn viên / "
    "gặp người thật / chuyển máy cho điện thoại viên, "
    "hãy gọi hàm transfer_to_agent để chuyển cuộc gọi đến nhân viên tổng đài.\n"
    "- Sau khi gọi transfer_to_agent, hãy nói với khách hàng rằng "
    "cuộc gọi đang được chuyển và cảm ơn họ đã sử dụng dịch vụ.\n"
    "- Khi khách hàng hỏi về thông tin cá nhân / tài khoản / đơn hàng, "
    "hãy gọi lookup_customer và check_orders để tra cứu.\n"
    "- Khi khách hàng hỏi về sản phẩm / giá / tình trạng hàng, "
    "hãy gọi search_product.\n"
    "- Khi khách hàng hỏi câu hỏi mà bạn không chắc chắn, "
    "hãy gọi search_faq. Nếu vẫn không có, nói 'chưa có thông tin' "
    "và gọi save_faq để lưu lại cho lần sau.\n"
)

# RAG (Retrieval-Augmented Generation) — kiến thức nội bộ
RAG_ENABLED = os.getenv("RAG_ENABLED", "true").lower() == "true"
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "3"))
_knowledge_base: KnowledgeBase | None = None


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
_dtmf_queues: dict[str, asyncio.Queue] = {}
_connection_counter = 0


# ---------------------------------------------------------------------------
# TTSAudioProcessor — accumulate, resample as batch, pad to chunk boundary
# ---------------------------------------------------------------------------
class TTSAudioProcessor_v13(FrameProcessor):
    """Accumulates TTS audio, batch-resamples 22050→8000 with soxr oneshot,
    sends as single JSON via OutputTransportMessageFrame (bypasses transport buffer).
    """

    def __init__(self):
        super().__init__()
        self._buffer = bytearray()
        self._in_rate = 0

    async def process_frame(self, frame, direction):
        try:
            await super().process_frame(frame, direction)

            if isinstance(frame, TTSAudioRawFrame):
                if not self._in_rate:
                    self._in_rate = frame.sample_rate
                self._buffer.extend(frame.audio)
            elif isinstance(frame, TTSStartedFrame):
                self._buffer.clear()
                self._in_rate = 0
            elif isinstance(frame, TTSStoppedFrame):
                if self._buffer and self._in_rate and self._in_rate != 8000:
                    import numpy as np, soxr
                    audio_np = np.frombuffer(bytes(self._buffer), dtype=np.int16)
                    resampled = soxr.resample(audio_np, self._in_rate, 8000, 'VHQ')
                    pcm = resampled.astype(np.int16).tobytes()
                    logger.info(f"TTSAudio: {len(self._buffer)}B@{self._in_rate}Hz → {len(pcm)}B@8000Hz")
                    # Chunk 250ms (4000 bytes) để tránh message size limit của FS
                    chunk_size = 4000
                    remainder = len(pcm) % chunk_size
                    if remainder:
                        pcm += b'\x00' * (chunk_size - remainder)
                    offset = 0
                    while offset < len(pcm):
                        await self.push_frame(TTSAudioRawFrame(
                            audio=pcm[offset:offset + chunk_size],
                            sample_rate=8000, num_channels=1,
                        ))
                        offset += chunk_size
                    logger.info(f"TTSAudio: {len(pcm)//chunk_size} chunks ({len(pcm)}b)")
                    # Báo hiệu "hết câu" để mod_audio_stream phát nốt phần dư
                    # còn kẹt trong m_frameBuffer (< 5 gói) — tránh bug dính đuôi
                    # câu này vào đầu câu tiếp theo. Cần patch C++ tương ứng.
                    await self.push_frame(OutputTransportMessageFrame(
                        message=json.dumps({"type": "flushAudio"})
                    ))
                self._buffer.clear()
                self._in_rate = 0
                await self.push_frame(frame)
            elif isinstance(frame, InterruptionFrame):
                self._buffer.clear()
                self._in_rate = 0
                await self.push_frame(frame, direction)
            else:
                await self.push_frame(frame, direction)
        except Exception as e:
            logger.error(f"TTSAudioProcessor error: {e}")
            logger.exception(e)
            await self.push_frame(frame, direction)

# V14 Tts audio processor patch
"""
PATCH: TTSAudioProcessor — streaming resample thay vì batch-at-end
====================================================================
Vấn đề gốc: bản cũ gom TOÀN BỘ audio của 1 câu (giữa TTSStartedFrame và
TTSStoppedFrame) rồi mới resample 22050→8000 một lần (soxr oneshot) và
CHỈ SAU ĐÓ mới bắt đầu push frame ra transport. Kết quả: không có byte
audio nào rời khỏi bot cho tới khi Piper tổng hợp xong CẢ CÂU.
 
Với SIP/mod_audio_stream (RTP thời gian thực, không có jitter buffer
phía client như trình duyệt), độ trễ này lộ ra thành khoảng nghẽn/giật
ngay tại ranh giới mỗi câu — càng nhiều câu ngắn (do SYSTEM_PROMPT ép
"1-2 câu") thì càng nghẽn nhiều lần trong 1 lượt trả lời.
 
Fix: dùng soxr.ResampleStream để resample TỪNG CHUNK ngay khi Piper
nhả ra (streaming), gửi đi ngay lập tức thay vì đợi TTSStoppedFrame.
Chỉ giữ lại phần dư (< 1 chunk boundary) để ghép với chunk tiếp theo,
và flush phần cuối cùng khi TTSStoppedFrame tới.
 
Cách áp dụng: thay thế class TTSAudioProcessor trong bot_fs.py bằng
class dưới đây (giữ nguyên tên và cách sử dụng trong pipeline).
"""
class TTSAudioProcessor_V14(FrameProcessor):
    """Streaming-resample TTS audio 22050→8000 (thay vì batch oneshot).
 
    - Resample từng chunk ngay khi Piper nhả ra → giảm độ trễ đầu câu
      xuống gần 0 (chỉ còn latency của chunk hiện tại, không phải cả câu).
    - Vẫn giữ logic pad/align 4000-byte (250ms) để tương thích với
      giới hạn message size của FreeSWITCH và cadence audio_out_10ms_chunks.
    - Vẫn gửi "flushAudio" khi kết thúc câu.
    """
 
    CHUNK_SIZE = 4000  # 250ms @ 8kHz mono 16-bit
 
    def __init__(self):
        super().__init__()
        self._resampler: soxr.ResampleStream | None = None
        self._in_rate = 0
        self._out_buf = bytearray()  # phần dư chưa đủ CHUNK_SIZE
 
    def _ensure_resampler(self, in_rate: int):
        if self._resampler is None or self._in_rate != in_rate:
            self._resampler = soxr.ResampleStream(
                in_rate, 8000, 1, dtype="int16", quality="VHQ"
            )
            self._in_rate = in_rate
 
    async def _emit_ready_chunks(self, final: bool = False):
        """Gửi ra các chunk 4000-byte đã sẵn sàng trong _out_buf."""
        while len(self._out_buf) >= self.CHUNK_SIZE:
            chunk = bytes(self._out_buf[: self.CHUNK_SIZE])
            del self._out_buf[: self.CHUNK_SIZE]
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
        if final and self._out_buf:
            # Pad phần dư cuối cùng cho đủ 1 chunk boundary
            remainder = len(self._out_buf)
            pad = self.CHUNK_SIZE - remainder
            chunk = bytes(self._out_buf) + b"\x00" * pad
            self._out_buf.clear()
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
 
    async def process_frame(self, frame, direction):
        try:
            await super().process_frame(frame, direction)
 
            if isinstance(frame, TTSAudioRawFrame):
                if frame.sample_rate == 8000:
                    # Không cần resample — đẩy thẳng qua buffer align
                    self._out_buf.extend(frame.audio)
                    await self._emit_ready_chunks()
                else:
                    self._ensure_resampler(frame.sample_rate)
                    audio_np = np.frombuffer(frame.audio, dtype=np.int16)
                    out = self._resampler.resample_chunk(audio_np)
                    if len(out):
                        self._out_buf.extend(out.astype(np.int16).tobytes())
                        await self._emit_ready_chunks()
 
            elif isinstance(frame, TTSStartedFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
 
            elif isinstance(frame, TTSStoppedFrame):
                # Flush phần audio còn lại trong resampler (nếu có)
                if self._resampler is not None:
                    tail = self._resampler.resample_chunk(
                        np.array([], dtype=np.int16), last=True
                    )
                    if len(tail):
                        self._out_buf.extend(tail.astype(np.int16).tobytes())
                await self._emit_ready_chunks(final=True)
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
                # Vẫn giữ workaround flushAudio cho bug buffer phía C++
                # (m_frameBuffer) — xem TODO patch C++ ở ghi chú gốc.
                await self.push_frame(
                    OutputTransportMessageFrame(message=json.dumps({"type": "flushAudio"}))
                )
 
            elif isinstance(frame, InterruptionFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame, direction)
 
            else:
                await self.push_frame(frame, direction)
 
        except Exception as e:
            logger.error(f"TTSAudioProcessor error: {e}")
            logger.exception(e)
            await self.push_frame(frame, direction)

# V15 Tts audio processor patch
"""
PATCH: TTSAudioProcessor — streaming resample thay vì batch-at-end
====================================================================
Vấn đề gốc: bản cũ gom TOÀN BỘ audio của 1 câu (giữa TTSStartedFrame và
TTSStoppedFrame) rồi mới resample 22050→8000 một lần (soxr oneshot) và
CHỈ SAU ĐÓ mới bắt đầu push frame ra transport. Kết quả: không có byte
audio nào rời khỏi bot cho tới khi Piper tổng hợp xong CẢ CÂU.
 
Với SIP/mod_audio_stream (RTP thời gian thực, không có jitter buffer
phía client như trình duyệt), độ trễ này lộ ra thành khoảng nghẽn/giật
ngay tại ranh giới mỗi câu — càng nhiều câu ngắn (do SYSTEM_PROMPT ép
"1-2 câu") thì càng nghẽn nhiều lần trong 1 lượt trả lời.
 
Fix: dùng soxr.ResampleStream để resample TỪNG CHUNK ngay khi Piper
nhả ra (streaming), gửi đi ngay lập tức thay vì đợi TTSStoppedFrame.
Chỉ giữ lại phần dư (< 1 chunk boundary) để ghép với chunk tiếp theo,
và flush phần cuối cùng khi TTSStoppedFrame tới.
 
Cách áp dụng: thay thế class TTSAudioProcessor trong bot_fs.py bằng
class dưới đây (giữ nguyên tên và cách sử dụng trong pipeline).
"""
class TTSAudioProcessor_V15(FrameProcessor):
    """Streaming-resample TTS audio 22050→8000 (thay vì batch oneshot).
 
    - Resample từng chunk ngay khi Piper nhả ra → giảm độ trễ đầu câu
      xuống gần 0 (chỉ còn latency của chunk hiện tại, không phải cả câu).
    - Vẫn giữ logic pad/align 4000-byte (250ms) để tương thích với
      giới hạn message size của FreeSWITCH và cadence audio_out_10ms_chunks.
    - Vẫn gửi "flushAudio" khi kết thúc câu.
    """
 
    CHUNK_SIZE = 4000  # 250ms @ 8kHz mono 16-bit
    TRAILING_SILENCE_MS = 300  # khoảng lặng thêm cuối mỗi câu — chỉnh 200-500ms tuỳ cảm giác
 
    def __init__(self):
        super().__init__()
        self._resampler: soxr.ResampleStream | None = None
        self._in_rate = 0
        self._out_buf = bytearray()  # phần dư chưa đủ CHUNK_SIZE
 
    def _ensure_resampler(self, in_rate: int):
        if self._resampler is None or self._in_rate != in_rate:
            self._resampler = soxr.ResampleStream(
                in_rate, 8000, 1, dtype="int16", quality="VHQ"
            )
            self._in_rate = in_rate
 
    async def _emit_ready_chunks(self, final: bool = False):
        """Gửi ra các chunk 4000-byte đã sẵn sàng trong _out_buf."""
        while len(self._out_buf) >= self.CHUNK_SIZE:
            chunk = bytes(self._out_buf[: self.CHUNK_SIZE])
            del self._out_buf[: self.CHUNK_SIZE]
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
        if final and self._out_buf:
            # Pad phần dư cuối cùng cho đủ 1 chunk boundary
            remainder = len(self._out_buf)
            pad = self.CHUNK_SIZE - remainder
            chunk = bytes(self._out_buf) + b"\x00" * pad
            self._out_buf.clear()
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
 
    async def process_frame(self, frame, direction):
        try:
            await super().process_frame(frame, direction)
 
            if isinstance(frame, TTSAudioRawFrame):
                if frame.sample_rate == 8000:
                    # Không cần resample — đẩy thẳng qua buffer align
                    self._out_buf.extend(frame.audio)
                    await self._emit_ready_chunks()
                else:
                    self._ensure_resampler(frame.sample_rate)
                    audio_np = np.frombuffer(frame.audio, dtype=np.int16)
                    out = self._resampler.resample_chunk(audio_np)
                    if len(out):
                        self._out_buf.extend(out.astype(np.int16).tobytes())
                        await self._emit_ready_chunks()
 
            elif isinstance(frame, TTSStartedFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
 
            elif isinstance(frame, TTSStoppedFrame):
                # Flush phần audio còn lại trong resampler (nếu có)
                if self._resampler is not None:
                    tail = self._resampler.resample_chunk(
                        np.array([], dtype=np.int16), last=True
                    )
                    if len(tail):
                        self._out_buf.extend(tail.astype(np.int16).tobytes())
 
                # Thêm khoảng lặng cố định cuối câu — tránh cảm giác bị cắt
                # đột ngột khi phát qua RTP (không có "room tone"/hơi thở cuối câu
                # như audio thu thật, và phần pad-to-boundary trước đây không
                # đảm bảo đủ độ dài lặng cố định).
                silence_samples = int(8000 * self.TRAILING_SILENCE_MS / 1000)
                self._out_buf.extend(b"\x00\x00" * silence_samples)  # 16-bit mono = 2 bytes/sample
 
                await self._emit_ready_chunks(final=True)
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
                # Vẫn giữ workaround flushAudio cho bug buffer phía C++
                # (m_frameBuffer) — xem TODO patch C++ ở ghi chú gốc.
                await self.push_frame(
                    OutputTransportMessageFrame(message=json.dumps({"type": "flushAudio"}))
                )
 
            elif isinstance(frame, InterruptionFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame, direction)
 
            else:
                await self.push_frame(frame, direction)
 
        except Exception as e:
            logger.error(f"TTSAudioProcessor error: {e}")
            logger.exception(e)
            await self.push_frame(frame, direction)


"""
V16 PATCH: TTSAudioProcessor — streaming resample thay vì batch-at-end
====================================================================
Vấn đề gốc: bản cũ gom TOÀN BỘ audio của 1 câu (giữa TTSStartedFrame và
TTSStoppedFrame) rồi mới resample 22050→8000 một lần (soxr oneshot) và
CHỈ SAU ĐÓ mới bắt đầu push frame ra transport. Kết quả: không có byte
audio nào rời khỏi bot cho tới khi Piper tổng hợp xong CẢ CÂU.
 
Với SIP/mod_audio_stream (RTP thời gian thực, không có jitter buffer
phía client như trình duyệt), độ trễ này lộ ra thành khoảng nghẽn/giật
ngay tại ranh giới mỗi câu — càng nhiều câu ngắn (do SYSTEM_PROMPT ép
"1-2 câu") thì càng nghẽn nhiều lần trong 1 lượt trả lời.
 
Fix: dùng soxr.ResampleStream để resample TỪNG CHUNK ngay khi Piper
nhả ra (streaming), gửi đi ngay lập tức thay vì đợi TTSStoppedFrame.
Chỉ giữ lại phần dư (< 1 chunk boundary) để ghép với chunk tiếp theo,
và flush phần cuối cùng khi TTSStoppedFrame tới.
 
Cách áp dụng: thay thế class TTSAudioProcessor trong bot_fs.py bằng
class dưới đây (giữ nguyên tên và cách sử dụng trong pipeline).
"""
class TTSAudioProcessor(FrameProcessor):
    """Streaming-resample TTS audio 22050→8000 (thay vì batch oneshot).
 
    - Resample từng chunk ngay khi Piper nhả ra → giảm độ trễ đầu câu
      xuống gần 0 (chỉ còn latency của chunk hiện tại, không phải cả câu).
    - Vẫn giữ logic pad/align 4000-byte (250ms) để tương thích với
      giới hạn message size của FreeSWITCH và cadence audio_out_10ms_chunks.
    - Vẫn gửi "flushAudio" khi kết thúc câu.
    """
 
    CHUNK_SIZE = 4000  # 250ms @ 8kHz mono 16-bit
    TRAILING_SILENCE_MS = 300  # khoảng lặng thêm cuối mỗi câu — chỉnh 200-500ms tuỳ cảm giác
 
    # NGHI VẤN: "flushAudio" có thể đang khiến mod_audio_stream XOÁ audio
    # thật đang chờ phát (thay vì "phát nốt phần dư" như comment gốc kỳ vọng).
    # Mặc định TẮT để test — nếu vấn đề "nghẽn giữa câu" (đã fix trước đó bằng
    # streaming resample) không quay lại khi tắt, thì để tắt luôn.
    # Bật lại bằng: FS_SEND_FLUSH_AUDIO=true
    # Nếu bật lại và vẫn bị cắt đầu audio thật, tăng FS_FLUSH_AUDIO_DELAY_MS
    # để chờ FS phát xong audio đã gửi trước khi báo flush.
    SEND_FLUSH_AUDIO = os.getenv("FS_SEND_FLUSH_AUDIO", "false").lower() == "true"
    FLUSH_AUDIO_DELAY_MS = int(os.getenv("FS_FLUSH_AUDIO_DELAY_MS", "400"))
 
    def __init__(self):
        super().__init__()
        self._resampler: soxr.ResampleStream | None = None
        self._in_rate = 0
        self._out_buf = bytearray()  # phần dư chưa đủ CHUNK_SIZE
 
    def _ensure_resampler(self, in_rate: int):
        if self._resampler is None or self._in_rate != in_rate:
            self._resampler = soxr.ResampleStream(
                in_rate, 8000, 1, dtype="int16", quality="VHQ"
            )
            self._in_rate = in_rate
 
    async def _emit_ready_chunks(self, final: bool = False):
        """Gửi ra các chunk 4000-byte đã sẵn sàng trong _out_buf."""
        while len(self._out_buf) >= self.CHUNK_SIZE:
            chunk = bytes(self._out_buf[: self.CHUNK_SIZE])
            del self._out_buf[: self.CHUNK_SIZE]
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
        if final and self._out_buf:
            # Pad phần dư cuối cùng cho đủ 1 chunk boundary
            remainder = len(self._out_buf)
            pad = self.CHUNK_SIZE - remainder
            chunk = bytes(self._out_buf) + b"\x00" * pad
            self._out_buf.clear()
            await self.push_frame(
                TTSAudioRawFrame(audio=chunk, sample_rate=8000, num_channels=1)
            )
 
    async def process_frame(self, frame, direction):
        try:
            await super().process_frame(frame, direction)
 
            if isinstance(frame, TTSAudioRawFrame):
                if frame.sample_rate == 8000:
                    # Không cần resample — đẩy thẳng qua buffer align
                    self._out_buf.extend(frame.audio)
                    await self._emit_ready_chunks()
                else:
                    self._ensure_resampler(frame.sample_rate)
                    audio_np = np.frombuffer(frame.audio, dtype=np.int16)
                    out = self._resampler.resample_chunk(audio_np)
                    if len(out):
                        self._out_buf.extend(out.astype(np.int16).tobytes())
                        await self._emit_ready_chunks()
 
            elif isinstance(frame, TTSStartedFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
 
            elif isinstance(frame, TTSStoppedFrame):
                # Flush phần audio còn lại trong resampler (nếu có)
                if self._resampler is not None:
                    tail = self._resampler.resample_chunk(
                        np.array([], dtype=np.int16), last=True
                    )
                    if len(tail):
                        self._out_buf.extend(tail.astype(np.int16).tobytes())
 
                # Thêm khoảng lặng cố định cuối câu — tránh cảm giác bị cắt
                # đột ngột khi phát qua RTP (không có "room tone"/hơi thở cuối câu
                # như audio thu thật, và phần pad-to-boundary trước đây không
                # đảm bảo đủ độ dài lặng cố định).
                silence_samples = int(8000 * self.TRAILING_SILENCE_MS / 1000)
                self._out_buf.extend(b"\x00\x00" * silence_samples)  # 16-bit mono = 2 bytes/sample
 
                await self._emit_ready_chunks(final=True)
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame)
 
                # Chỉ gửi flushAudio nếu được bật tường minh — mặc định tắt
                # vì nghi ngờ đây là nguyên nhân cắt audio thật ở cuối câu.
                if self.SEND_FLUSH_AUDIO:
                    if self.FLUSH_AUDIO_DELAY_MS:
                        import asyncio
                        await asyncio.sleep(self.FLUSH_AUDIO_DELAY_MS / 1000)
                    await self.push_frame(
                        OutputTransportMessageFrame(message=json.dumps({"type": "flushAudio"}))
                    )
 
            elif isinstance(frame, InterruptionFrame):
                self._out_buf.clear()
                self._resampler = None
                self._in_rate = 0
                await self.push_frame(frame, direction)
 
            else:
                await self.push_frame(frame, direction)
 
        except Exception as e:
            logger.error(f"TTSAudioProcessor error: {e}")
            logger.exception(e)
            await self.push_frame(frame, direction)


# ---------------------------------------------------------------------------
# 5. Pre-filter — Chặn audio quá ngắn
# Một trong những nguyên nhân chính: VAD trigger dù chỉ 200ms nhiễu → Whisper forced transcribe → ra text rác.
# Có thể thêm một FrameProcessor đơn giản giữa VAD và STT, chỉ cho pass nếu audio tích lũy ≥ ~0.5-1.0 giây:
# Đây là low-code solution: không cần thay đổi pipeline nhiều, chặn ngay frame ảo giác từ gốc.
# ---------------------------------------------------------------------------
class MinSpeechDurationFilter(FrameProcessor):
    """Chỉ cho STT xử lý khi audio tích lũy ≥ min_duration_s.

    Đặt giữa VAD và STT. Accumulate InputAudioRawFrame, chỉ forward
    khi VADUserStoppedSpeakingFrame báo hiệu kết thúc một turn nói
    và tổng audio >= min_samples. Nếu ngắn hơn → drop (coi là nhiễu).
    """

    def __init__(self, min_duration_s=0.8):
        super().__init__()
        self._min_samples = int(8000 * min_duration_s)
        self._buf = bytearray()
        self._sample_rate = 8000
        self._num_channels = 1

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        if isinstance(frame, InputAudioRawFrame):
            # Accumulate audio
            self._sample_rate = frame.sample_rate
            self._num_channels = frame.num_channels
            self._buf.extend(frame.audio)
            # Always forward — STT cần audio liên tục để transcribe.
            # Filter logic nằm ở VADUserStoppedSpeakingFrame bên dưới.
            await self.push_frame(frame, direction)

        elif isinstance(frame, VADUserStoppedSpeakingFrame):
            # Kiểm tra: nếu audio quá ngắn, drop toàn bộ (chặn ảo giác)
            audio_duration_s = len(self._buf) / 2 / self._sample_rate
            if audio_duration_s < self._min_samples / 8000:
                logger.warning(
                    f"🗑️ MinSpeechDurationFilter DROP: {audio_duration_s:.2f}s "
                    f"< {self._min_samples/8000:.1f}s (noise hallucination guard)"
                )
                # stt_audio_in = None
                # # Tìm thằng STT downstream — gọi reset để xoá accumulated audio của nó
                # for child in self._children:
                #    if "stt" in type(child).__name__.lower():
                #        stt_audio_in = child
                #        break
                # if stt_audio_in and hasattr(stt_audio_in, "_audio_in"):
                #     stt_audio_in._audio_in = bytearray()
                #     stt_audio_in._audio_in_size = 0
                # self._buf.clear()
                # # Không forward VADUserStoppedSpeakingFrame → STT không transcribe
                # Không forward VADUserStoppedSpeakingFrame → STT không transcribe,
                # audio tích luỹ trong STT sẽ bị ghi đè bởi turn nói thật tiếp theo
                return

            logger.info(
                f"🗣️ MinSpeechDurationFilter PASS: {audio_duration_s:.2f}s "
                f"(threshold {self._min_samples/8000:.1f}s)"
            )
            self._buf.clear()
            await self.push_frame(frame, direction)

        elif isinstance(frame, VADUserStartedSpeakingFrame):
            self._buf.clear()
            await self.push_frame(frame, direction)

        elif isinstance(frame, InterruptionFrame):
            self._buf.clear()
            await self.push_frame(frame, direction)

        else:
            await self.push_frame(frame, direction)


# ---------------------------------------------------------------------------
# MarkdownStripper — loại bỏ ký tự markdown khỏi text LLM trả về
# (**, *, `, #, [], (), >, _) để TTS không đọc ký hiệu.
# ---------------------------------------------------------------------------
class MarkdownStripper(FrameProcessor):
    """Loại bỏ ký tự markdown (** * ` # [] > _ ~ |) và emoji khỏi LLM text frames.
    Forward từng frame riêng lẻ, KHÔNG buffer/ghép space/sửa space."""

    # Regex loại bỏ emoji (Unicode blocks phổ biến)
    _EMOJI_RE = re.compile(
        "[\U0001F300-\U0001F9FF"     # Miscellaneous Symbols, Emoticons, etc.
        "\U0001FA00-\U0001FA6F"     # Chess Symbols
        "\U0001FA70-\U0001FAFF"     # Symbols Extended-A
        "\U00002702-\U000027B0"     # Dingbats
        "\U000024C2-\U0001F251"     # Enclosed + Misc
        "☀-⛿"             # Misc symbols
        "✀-➿"             # Dingbats
        "]+",
        flags=re.UNICODE,
    )

    def __init__(self):
        super().__init__()

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        if isinstance(frame, (LLMTextFrame, TextFrame)):
            original = frame.text
            cleaned = self._clean(original)
            if cleaned != original:
                logger.debug(f"🧹 MarkdownStripper: {original!r} → {cleaned!r}")
            frame.text = cleaned

        await self.push_frame(frame, direction)

    def _clean(self, text: str) -> str:
        """Strip markdown + emoji. KHÔNG strip space."""
        text = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)  # [text](url) → text
        text = re.sub(r"[\*\#\~\`\_\>\|\[\]]", "", text)     # markdown special chars
        text = self._EMOJI_RE.sub("", text)                  # emoji
        return text


# ---------------------------------------------------------------------------
# DEBUG: log frame types passing a given point in the pipeline.
# Tạm thời để chẩn đoán vì sao bot không nghe được — xoá sau khi fix xong.
# ---------------------------------------------------------------------------
class DebugFrameLogger(FrameProcessor):
    def __init__(self, tag: str, capture_on_speech: bool = False, max_captures: int = 3):
        super().__init__()
        self._tag = tag
        self._capture_on_speech = capture_on_speech
        self._max_captures = max_captures
        self._capture_count = 0
        self._recording = False
        self._capture_buf = bytearray()
        self._capture_sample_rate = 8000
        self._capture_channels = 1

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)

        # Capture đúng đoạn audio VAD coi là "user đang nói" (khớp với đoạn STT dùng)
        if self._capture_on_speech and direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, VADUserStartedSpeakingFrame) and self._capture_count < self._max_captures:
                self._recording = True
                self._capture_buf = bytearray()
            elif isinstance(frame, VADUserStoppedSpeakingFrame) and self._recording:
                self._recording = False
                self._capture_count += 1
                if self._capture_buf:
                    import wave, time as _time
                    path = f"/tmp/debug_vadseg_{self._tag}_{self._capture_count}_{int(_time.time())}.wav"
                    with wave.open(path, "wb") as wf:
                        wf.setnchannels(self._capture_channels)
                        wf.setsampwidth(2)
                        wf.setframerate(self._capture_sample_rate)
                        wf.writeframes(bytes(self._capture_buf))
                    logger.info(
                        f"🎙️[{self._tag}] Đã ghi đoạn nói #{self._capture_count} "
                        f"({len(self._capture_buf)} bytes, {len(self._capture_buf)/2/self._capture_sample_rate:.2f}s) vào {path}"
                    )

        # Bỏ qua audio raw frame (quá nhiều), chỉ log các frame "sự kiện"
        if not isinstance(frame, (InputAudioRawFrame, OutputAudioRawFrame, TTSAudioRawFrame)):
            logger.info(f"🔎[{self._tag}] {type(frame).__name__}")
        elif isinstance(frame, InputAudioRawFrame):
            # Log 1 lần mỗi ~50 frame để không spam log, kèm RMS để biết có audio thật không
            import numpy as np
            samples = np.frombuffer(frame.audio, dtype=np.int16)
            rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2))) if len(samples) else 0.0
            if not hasattr(self, "_n"):
                self._n = 0
            self._n += 1
            if self._n % 50 == 0:
                logger.info(f"🔎[{self._tag}] InputAudioRawFrame #{self._n} bytes={len(frame.audio)} rms={rms:.0f}")

            if self._capture_on_speech and self._recording:
                self._capture_sample_rate = frame.sample_rate
                self._capture_channels = frame.num_channels
                self._capture_buf.extend(frame.audio)

        await self.push_frame(frame, direction)


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
        try:
            frame = await super().deserialize(data)
        except Exception:
            frame = None

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

        if isinstance(frame, InputAudioRawFrame) and frame.audio:
            audio = frame.audio
            n = len(audio)

            # --- AUTO-DETECT định dạng, KHÔNG ép cứng Float32 ---
            is_float32 = False
            if n % 4 == 0:
                f32_try = np.frombuffer(audio, dtype=np.float32)
                f32_abs = np.abs(f32_try)
                # Float32 audio hợp lệ: biên độ trong [-1, 1] và không toàn 0
                if np.max(f32_abs) <= 1.0 and np.mean(f32_abs) > 1e-6:
                    is_float32 = True

            if is_float32:
                float32 = f32_try.copy()
                if not np.all(np.isfinite(float32)):
                    float32 = np.nan_to_num(float32, nan=0.0, posinf=0.0, neginf=0.0)
                float32 = np.clip(float32, -1.0, 1.0)
                frame.audio = (float32 * 32767).astype(np.int16).tobytes()
            elif n % 2 == 0:
                # Coi như Int16 PCM sẵn có — không cần convert, chỉ log để kiểm tra
                i16 = np.frombuffer(audio, dtype=np.int16)
                # logger.debug(f"RTVI audio detected as Int16 (n={len(i16)})")
                frame.audio = i16.tobytes()
            else:
                logger.warning(f"RTVI audio: định dạng không rõ ({n} bytes), bỏ qua frame")
                return None

        return frame


# ---------------------------------------------------------------------------
# Shared GPU model weights (not processors) — singleton to avoid GPU OOM
# ---------------------------------------------------------------------------
# ThinkingDelayProcessor — thêm khoảng dừng tự nhiên trước khi bot trả lời
# ---------------------------------------------------------------------------
class ThinkingDelayProcessor(FrameProcessor):
    """Chèn delay sau TTS: delay TTSStartedFrame đầu tiên mỗi lượt bot nói.

    Đặt GIỮA TTS và TTSAudioProcessor trong pipeline.
    Khi TTSStartedFrame chảy qua, processor ngủ `delay_ms` rồi mới forward
    xuống TTSAudioProcessor → audio output.
    TTSStoppedFrame reset cờ để lượt nói sau cũng được delay.

    Lưu ý (Pipecat 1.5.0):
      - Phải đặt SAU TTS để nhận được cả TTSStartedFrame và TTSStoppedFrame
        mà TTS push ra.
      - Phải gọi cả super().process_frame() (xử lý state) và
        push_frame() (forward frame), nếu thiếu push_frame thì CancelFrame
        bị nuốt -> pipeline timeout.
    """

    def __init__(self, delay_ms: float = 800):
        super().__init__()
        self._delay_s = delay_ms / 1000.0
        self._pending = True  # delay lần TTSStarted đầu tiên sau mỗi TTSStopped

    async def process_frame(self, frame, direction):
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, TTSStartedFrame) and self._pending:
                logger.info(f"⏳ Thinking delay {self._delay_s*1000:.0f}ms...")
                await asyncio.sleep(self._delay_s)
                self._pending = False
            elif isinstance(frame, TTSStoppedFrame):
                self._pending = True  # reset cho lượt nói tiếp theo
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


# ---------------------------------------------------------------------------
_shared_whisper_model: "WhisperModel | None" = None
_shared_piper_voice: "PiperVoice | None" = None


def load_whisper_model() -> "WhisperModel":
    """Get cached WhisperModel — loaded once on GPU, shared across pipelines."""
    global _shared_whisper_model
    if _shared_whisper_model is None:
        from faster_whisper import WhisperModel
        device = os.getenv("WHISPER_DEVICE", "cuda")
        compute = os.getenv("WHISPER_COMPUTE_TYPE", "float16")
        logger.info(f"Loading WhisperModel (device={device}, compute={compute})...")
        _shared_whisper_model = WhisperModel("large", device=device, compute_type=compute)
        logger.info("WhisperModel loaded")
    return _shared_whisper_model


def load_piper_voice() -> "PiperVoice":
    """Get cached PiperVoice — loaded once, shared across pipelines."""
    global _shared_piper_voice
    if _shared_piper_voice is None:
        from piper import PiperVoice
        voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
        #logger.info(f"Loading PiperVoice from {voice_path}...")
        #_shared_piper_voice = PiperVoice.load(voice_path, use_cuda=False)
        #logger.info("PiperVoice loaded")
        piper_use_cuda = os.getenv("PIPER_USE_CUDA", "true").lower() == "true"
        logger.info(f"Loading PiperVoice from {voice_path} (use_cuda={piper_use_cuda})...")
        _shared_piper_voice = PiperVoice.load(voice_path, use_cuda=piper_use_cuda)
        try:
            providers = _shared_piper_voice.session.get_providers()
            logger.info(f"PiperVoice ONNX providers thực tế đang dùng: {providers}")
        except Exception:
            pass
        logger.info("PiperVoice loaded")        
    return _shared_piper_voice


def create_services() -> tuple:
    """Create per-pipeline service instances sharing GPU model weights."""

    # Chỉ load Whisper nếu dùng Whisper STT — tránh tốn VRAM khi dùng
    # VietASR hoặc Gipformer (vốn chỉ cần onnx runtime nhẹ hơn nhiều)
    if STT_PROVIDER == "whisper":
        load_whisper_model()

    if TTS_ENGINE == "omnivoice":
        # Không cần load Piper voice — OmniVoice load model riêng
        logger.info(f"🔊 TTS: OmniVoice ({OMNIVOICE_MODEL})")
        logger.info(f"🔊 Voice profile: {OMNIVOICE_VOICE_PROFILE}")
        if not Path(OMNIVOICE_VOICE_PROFILE).exists():
            logger.error(f"❌ OmniVoice profile not found: {OMNIVOICE_VOICE_PROFILE}")
            return None, None, None
    elif TTS_ENGINE == "vieneu":
        # VieNeu-TTS tự load model riêng (lazy khi pipeline chạy) — không cần Piper
        logger.info(f"🔊 TTS: VieNeu-TTS v3 Turbo (voice={VIENEU_VOICE}, style={VIENEU_STYLE})")
    else:
        voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
        if not voice_path.exists():
            logger.error(f"Piper voice not found: {voice_path}")
            return None, None, None
        load_piper_voice()

    # STT: lua chon provider (whisper mac dinh, vietasr/gipformer cho tieng Viet)
    if STT_PROVIDER == "vietasr":
        stt = VietASRSTTService(
            model_dir=VIETASR_MODEL_DIR,
            provider=VIETASR_PROVIDER,
            decoding_method="greedy_search",
        )
        logger.info(f"VN STT: VietASR (model_dir={VIETASR_MODEL_DIR}, provider={VIETASR_PROVIDER})")
    elif STT_PROVIDER == "gipformer":
        stt = GipformerSTTService(
            model_dir=GIPFORMER_MODEL_DIR,
            provider=GIPFORMER_PROVIDER,
            use_int8=GIPFORMER_USE_INT8,
            decoding_method="greedy_search",
            ttfs_p99_latency=2.0,
        )
        logger.info(f"VN STT: Gipformer (model_dir={GIPFORMER_MODEL_DIR}, "
                    f"provider={GIPFORMER_PROVIDER}, int8={GIPFORMER_USE_INT8})")
    else:
        stt = DebugWhisperSTTService(
            device=os.getenv("WHISPER_DEVICE", "cuda"),
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
            settings=WhisperSTTService.Settings(
                model=Model.LARGE,
                language=Language.VI,  # cố định tiếng Việt - audio giờ đã rõ hơn nhờ AGC,
                # auto-detect (None) de doan nham sang tieng Anh tren audio nhieu -> hallucination
                no_speech_prob=0.9,  # 0.6 qua thap - segment giong noi THAT do duoc no_speech_prob~0.82
            ),
        )
        stt._model = _shared_whisper_model

    # LLM: tuỳ chọn provider (ollama local hoặc deepseek API)
    if LLM_PROVIDER == "deepseek":
        if not DEEPSEEK_API_KEY:
            logger.error("❌ LLM_PROVIDER=deepseek nhưng DEEPSEEK_API_KEY chưa được set")
            return None, None, None
        llm = OpenAILLMService(
            base_url=DEEPSEEK_BASE_URL,
            api_key=DEEPSEEK_API_KEY,
            model=DEEPSEEK_MODEL,
            settings=OpenAILLMService.Settings(
                temperature=DEEPSEEK_TEMPERATURE,
                max_tokens=DEEPSEEK_MAX_TOKENS,
                # System prompt được truyền tự động bởi BaseOpenAILLMService
            ),
            retry_timeout_secs=30.0,   # Deepseek có thể chậm 10-15s lần đầu
            retry_on_timeout=True,      # Tự động retry 1 lần nếu timeout
        )
        logger.info(f"🤖 LLM: Deepseek ({DEEPSEEK_MODEL}) @ {DEEPSEEK_BASE_URL}")
    else:
        # Ollama local (mặc định)
        try:
            _ollama_extra = json.loads(OLLAMA_EXTRA) if OLLAMA_EXTRA else {}
        except (json.JSONDecodeError, TypeError):
            _ollama_extra = {}
            logger.warning(f"⚠️ OLLAMA_EXTRA parse error, using empty: {OLLAMA_EXTRA}")
        llm = OLLamaLLMService(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            settings=OLLamaLLMService.Settings(
                model=OLLAMA_MODEL,
                system_instruction=SYSTEM_PROMPT,
                temperature=1.0,
                max_tokens=10024,
                top_p=0.95,
                top_k=64,
                extra=_ollama_extra,
            ),
            retry_timeout_secs=30.0,     # ⬅️ thêm: chờ tối đa 60s cho LLM generate
            retry_on_timeout=True,       # ⬅️ thêm: retry nếu timeout
        )

    # TTS: tuỳ chọn engine (piper mặc định, omnivoice/vieneu chất lượng cao)
    if TTS_ENGINE == "omnivoice":
        tts = OmniVoiceTTSService(
            voice_prompt_path=OMNIVOICE_VOICE_PROFILE,
            model_name=OMNIVOICE_MODEL,
            language="vi",
            device_map="cuda:0",
            dtype="float16",
            num_step=OMNIVOICE_NUM_STEP,
        )
    elif TTS_ENGINE == "vieneu":
        # VieNeu-TTS v3 Turbo (14 giọng có sẵn, 3 style) — ONNX CPU mặc định
        tts = VieNeuTTSService(
            voice=VIENEU_VOICE,
            style=VIENEU_STYLE,
            backend=VIENEU_BACKEND,
            precision=VIENEU_PRECISION,
        )
        logger.info(f"🔊 TTS: VieNeu-TTS (voice={VIENEU_VOICE}, style={VIENEU_STYLE}, backend={VIENEU_BACKEND})")
    else:
        # Piper TTS (mặc định)
        tts = PiperTTSService(
            download_dir=VOICES_DIR,
            sample_rate=22050,
            settings=PiperTTSService.Settings(voice="vi_VN-vais1000-medium"),
        )
        tts._voice = _shared_piper_voice  # Use shared voice → no re-load
        logger.info(f"🔊 TTS: Piper (vi_VN-vais1000-medium)")

    return stt, llm, tts


# ---------------------------------------------------------------------------
# Pipeline factory — shared by RTVI and L16 paths
# ---------------------------------------------------------------------------
async def create_pipeline(
    transport: FastAPIWebsocketTransport,
    stt: WhisperSTTService,
    llm: OLLamaLLMService,
    tts: PiperTTSService,
    knowledge_base: KnowledgeBase | None = None,
    call_uuid: str = "",
    fs_api_config: dict | None = None,
) -> tuple[PipelineWorker, LLMContext]:
    """Create a Pipecat pipeline using SileroVADAnalyzer (standard pattern).

    Based on pipecat-examples/websocket/bot.py but with Whisper/Ollama/Piper
    instead of Gemini. Uses WorkerRunner for lifecycle management instead of
    direct PipelineWorker.run().

    Args:
        call_uuid: UUID của cuộc gọi (từ query params) — dùng cho tool calling.
        fs_api_config: Config cho FS REST API (base_url, username, password, queue).

    Returns:
        Tuple of (PipelineWorker, LLMContext). Each WebSocket path adds its
        own greeting handler before passing to WorkerRunner.
    """
    # Register tools if call_uuid is available
    if call_uuid and fs_api_config:
        logger.info(f"Registering tools (queue={fs_api_config.get('queue')})")
        tools = [
            create_transfer_tool(
                call_uuid=call_uuid,
                api_base_url=fs_api_config["base_url"],
                api_username=fs_api_config["username"],
                api_password=fs_api_config["password"],
                queue_name=fs_api_config.get("queue", "support@default"),
            ),
            create_transfer_extension_tool(
                call_uuid=call_uuid,
                api_base_url=fs_api_config["base_url"],
                api_username=fs_api_config["username"],
                api_password=fs_api_config["password"],
            ),
        ]
        crm_db = get_crm_db()
        tools.extend(create_crm_tools(crm_db))
        context = LLMContext(tools=tools)
    else:
        context = LLMContext()

    # VAD phải chạy TRƯỚC stt để sinh UserStartedSpeakingFrame /
    # UserStoppedSpeakingFrame — WhisperSTTService (batch, non-streaming)
    # cần các frame này để biết lúc nào gom đủ audio và chạy transcribe.
    # confidence=0.5 và min_volume=0.1 khá thấp — tăng lên để VAD khó bị kích hoạt bởi tiếng động nhỏ:
    vad = VADProcessor(
        vad_analyzer=SileroVADAnalyzer(
            sample_rate=8000,
            params=VADParams(confidence=0.85, min_volume=0.5, stop_secs=2),
        ),
    )

    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=120.0,
        ),
    )

    # DTMF action callbacks (gắn với handler, dùng API config)
    async def _dtmf_transfer():
        """Callback khi DTMF=0: transfer call."""
        tools = context.tools
        if tools and call_uuid and fs_api_config:
            # Gọi transfer logic trực tiếp (không qua LLM)
            from fs_tools import _get_http_client, _ensure_token, _call_transfer_api, _delayed_stop_audio
            client = _get_http_client()
            base_url = fs_api_config["base_url"].rstrip("/")
            q = fs_api_config.get("queue", "support@default")
            try:
                token = await _ensure_token(client, base_url, fs_api_config["username"], fs_api_config["password"])
                result = await _call_transfer_api(client, base_url, call_uuid, q, token)
                if result.get("data", {}).get("success"):
                    logger.info("DTMF: transfer succeeded")
                    asyncio.create_task(_delayed_stop_audio(
                        client, base_url, call_uuid, token, 4
                    ))
            except Exception as e:
                logger.error(f"DTMF transfer error: {e}")

    async def _dtmf_end_call():
        """Callback khi DTMF=#: end call."""
        from fs_tools import _get_http_client, _ensure_token
        client = _get_http_client()
        base_url = fs_api_config["base_url"].rstrip("/")
        try:
            token = await _ensure_token(client, base_url, fs_api_config["username"], fs_api_config["password"])
            resp = await client.post(
                f"{base_url}/commands",
                json={"command": "uuid_audio_stream", "args": f"{call_uuid} stop"},
                headers={"Authorization": f"Bearer {token}"},
            )
            logger.info(f"DTMF: stream stopped for end call: {resp.json()}")
        except Exception as e:
            logger.error(f"DTMF end call error: {e}")

    pipeline_steps = [
        transport.input(),
        # DebugFrameLogger("1-after-input", capture_on_speech=True, max_captures=3),
    ]
    if DTMF_ENABLED:
        pipeline_steps.append(DTMFDetectorProcessor())          # FFT in-band
        if call_uuid:                                            # Poll notify queue
            dtmf_q = asyncio.Queue()
            _dtmf_queues[call_uuid] = dtmf_q
            pipeline_steps.append(DTMFPollProcessor(
                dtmf_queue=dtmf_q, poll_interval=0.3,
            ))
    pipeline_steps.append(vad)
    pipeline_steps.extend([
        # DebugFrameLogger("2-after-vad", capture_on_speech=True, max_captures=3),
        # MinSpeechDurationFilter(),
        stt,
        HallucinationFilter(HALLUCINATION_CONFIG_PATH),
    ])
    if DTMF_ENABLED and call_uuid:
        pipeline_steps.append(DTMFAggregator())
        pipeline_steps.append(DTMFActionHandler(
            call_uuid=call_uuid,
            fs_api_config=fs_api_config,
            do_transfer_cb=_dtmf_transfer if call_uuid else None,
            do_end_call_cb=_dtmf_end_call if call_uuid else None,
        ))
    pipeline_steps.append(user_agg)

    # RAGProcessor: chèn kiến thức nội bộ trước mỗi lượt LLM generation
    if knowledge_base is not None and knowledge_base.count() > 0:
        rag = RAGProcessor(context, knowledge_base, top_k=RAG_TOP_K)
        pipeline_steps.append(rag)
        logger.info(f"📚 RAGProcessor enabled ({knowledge_base.count()} chunks, top_k={RAG_TOP_K})")
    else:
        logger.info("📚 RAGProcessor disabled (no knowledge base)")

    pipeline_steps.extend([
        llm,
        # TextDebugLogger("llm-to-tts"),
        MarkdownStripper(),   # Strip markdown/emoji TRƯỚC, để PronNorm xử lý text sạch
    ])

    if PRONUNCIATION_NORMALIZER_ENABLED:
        logger.info("🔤 PronunciationNormalizer: ENABLED (strip markdown → normalize → TTS)")
        pipeline_steps.append(PronunciationNormalizer(PRONUNCIATION_CONFIG_PATH))
    else:
        logger.info("🔤 PronunciationNormalizer: DISABLED (MarkdownStripper → TTS)")

    pipeline_steps.extend([
        tts,
        ThinkingDelayProcessor(800),  # ⏳ khoảng dừng tự nhiên SAU TTS, trước audio out
        TTSAudioProcessor(),
        transport.output(),
        assistant_agg,
    ])

    pipeline = Pipeline(pipeline_steps)

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

    # ── Parse query params ─────────────────────────────────────────
    query_params = dict(ws.query_params)
    conversation_id = query_params.get("conversation_id", f"rtvi-{conn_id}-{int(time.time())}")
    phone = query_params.get("phone", "rtvi-client")
    logger.info(f"📞 RTVI call from phone={phone} | conversation_id={conversation_id}")

    call_logger = CallLogger()
    call_logger.log_start(conversation_id, phone)
    # ──────────────────────────────────────────────────────────────

    await ws.accept()
    _active_connections.add(f"rtvi-{conn_id}")
    logger.info(f"🔵 RTVI #{conn_id} connected ({len(_active_connections)} active)")

    chat_task: asyncio.Task | None = None
    worker: PipelineWorker | None = None
    context = None  # will be set by create_pipeline, needed in finally

    try:
        serializer = RTVICompatibleSerializer()
        params = FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_in_passthrough=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=serializer,
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,
            allowed_origins=[],
        )
        transport = FastAPIWebsocketTransport(websocket=ws, params=params)

        stt, llm, tts = create_services()
        if stt is None:
            _active_connections.discard(f"rtvi-{conn_id}")
            await ws.close(code=1011)
            return

        fs_api_config = {
            "base_url": FS_API_BASE_URL,
            "username": FS_API_USERNAME,
            "password": FS_API_PASSWORD,
            "queue": FS_API_QUEUE,
        }
        worker, context = await create_pipeline(
            transport, stt, llm, tts,
            knowledge_base=_knowledge_base,
            call_uuid=conversation_id,
            fs_api_config=fs_api_config,
        )

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
        # ── Log call end với transcript từ context ──────────────────
        try:
            transcript = ""
            if context and hasattr(context, "messages") and context.messages:
                transcript = extract_conversation(context.messages)
            call_logger.log_end(conversation_id, transcript=transcript)
        except Exception as e:
            logger.error(f"Call log error: {e}")
        # ────────────────────────────────────────────────────────────

        try:
            if chat_task:
                chat_task.cancel()
        except Exception:
            pass
        _chat_queue.pop(f"rtvi-{conn_id}", None)
        _active_connections.discard(f"rtvi-{conn_id}")
        _dtmf_queues.pop(conversation_id, None)
        logger.info(f"RTVI #{conn_id} cleaned up")


# ---------------------------------------------------------------------------
# REST: /connect (RTVI)
# ---------------------------------------------------------------------------
class ConnectRequest(BaseModel):
    phone: str = ""
    conversation_id: str = ""


@app.post("/connect")
async def rtvi_connect(data: ConnectRequest | None = None):
    port = os.getenv("PORT", "8086")
    ws_url = f"wss://web.securityzone.vn:{port}/rtvi-ws"
    if data:
        params = {}
        if data.conversation_id:
            params["conversation_id"] = data.conversation_id
        if data.phone:
            params["phone"] = data.phone
        if params:
            ws_url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"wsUrl": ws_url}


# ---------------------------------------------------------------------------
# WebSocket: /audio-stream (L16 PCM + chat)
# ---------------------------------------------------------------------------
@app.websocket("/audio-stream")
async def audio_stream(ws: WebSocket):
    # ── Parse query params từ FreeSWITCH (conversation_id, phone) ──────
    query_params = dict(ws.query_params)
    conversation_id = query_params.get("conversation_id", f"auto-{int(time.time())}")
    phone = query_params.get("phone", "unknown")
    logger.info(f"📞 Call from phone={phone} | conversation_id={conversation_id}")

    call_logger = CallLogger()
    call_logger.log_start(conversation_id, phone)
    # ──────────────────────────────────────────────────────────────────

    await ws.accept()
    cid = f"{ws.client.host if ws.client else '?'}:{id(ws)}"
    _active_connections.add(cid)
    logger.info(f"🟢 L16 connected from {cid} ({len(_active_connections)} active)")

    chat_task: asyncio.Task | None = None
    worker: PipelineWorker | None = None
    context = None  # will be set by create_pipeline, needed in finally

    try:
        # FS_OUTPUT_FORMAT=protobuf để thử serializer protobuf nhị phân (nhẹ hơn,
        # không tốn CPU parse JSON/base64) — mặc định vẫn dùng json như trước.
        if os.getenv("FS_OUTPUT_FORMAT", "json").lower() == "protobuf":
            fs_ser = FSProtobufFrameSerializer(sample_rate=8000)
            logger.info("🔧 Dùng FSProtobufFrameSerializer cho output (protobuf nhị phân)")
        else:
            fs_ser = FSJsonFrameSerializer(sample_rate=8000)
        params = FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_in_passthrough=True,
            audio_out_enabled=True,
            audio_out_10ms_chunks=25,  # 250ms/chunk → mỗi chunk 5.5KB, FS không giới hạn
            add_wav_header=False,
            serializer=fs_ser,
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,  # TTSAudioProcessor batch-resample 22050→8000
            allowed_origins=[],
        )
        transport = FastAPIWebsocketTransport(websocket=ws, params=params)

        stt, llm, tts = create_services()
        if stt is None:
            _active_connections.discard(cid)
            await ws.close(code=1011)
            return

        fs_api_config = {
            "base_url": FS_API_BASE_URL,
            "username": FS_API_USERNAME,
            "password": FS_API_PASSWORD,
            "queue": FS_API_QUEUE,
        }
        worker, context = await create_pipeline(
            transport, stt, llm, tts,
            knowledge_base=_knowledge_base,
            call_uuid=conversation_id,
            fs_api_config=fs_api_config,
        )

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
        # ── Log call end với transcript từ context ──────────────────
        try:
            transcript = ""
            if context and hasattr(context, "messages") and context.messages:
                transcript = extract_conversation(context.messages)
            call_logger.log_end(conversation_id, transcript=transcript)
        except Exception as e:
            logger.error(f"Call log error: {e}")
        # ────────────────────────────────────────────────────────────

        try:
            if chat_task:
                chat_task.cancel()
        except Exception:
            pass
        _chat_queue.pop(cid, None)
        _active_connections.discard(cid)
        # Cleanup DTMF queue
        _dtmf_queues.pop(conversation_id, None)


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


@app.get("/upload-test")
async def upload_test_ui():
    path = CLIENT_HTML / "upload-test.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


# ---------------------------------------------------------------------------
# TTS test page — Text → Voice (proxy qua OmniVoice API server)
# ---------------------------------------------------------------------------
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Nội dung cần đọc")
    voice_name: str = Field(..., description="Tên giọng đọc (xem /tts/voices)")
    language: str | None = Field(None, description="Ngôn ngữ: 'vi', 'en', ...")
    instruct: str | None = Field(None, description="Hướng dẫn giọng đọc (vd: 'female, gentle tone')")
    num_step: int | None = Field(None, description="Số bước diffusion (mặc định 32)")


def _wav_duration(wav_bytes: bytes) -> float:
    """Tính thời lượng WAV bằng cách parse các chunks RIFF."""
    try:
        import struct
        if wav_bytes[:4] != b"RIFF" or wav_bytes[8:12] != b"WAVE":
            return 0.0
        offset = 12
        fmt_byte_rate = None
        data_size = 0
        while offset + 8 <= len(wav_bytes):
            chunk_id = wav_bytes[offset:offset + 4]
            chunk_size = struct.unpack_from("<I", wav_bytes, offset + 4)[0]
            if chunk_id == b"fmt ":
                # byte_rate nằm ở payload offset 8: offset + 8 (header) + 8 = offset + 16
                fmt_byte_rate = struct.unpack_from("<I", wav_bytes, offset + 16)[0]
            elif chunk_id == b"data":
                data_size = chunk_size
                break
            offset += 8 + chunk_size + (chunk_size % 2)  # pad byte
        if fmt_byte_rate and data_size:
            return round(data_size / fmt_byte_rate, 2)
    except Exception:
        pass
    return 0.0


@app.get("/tts-test")
async def tts_test_ui():
    path = CLIENT_HTML / "tts-test.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/tts/voices")
async def tts_voices():
    """Danh sách giọng đọc OmniVoice (proxy từ API server :8001)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{OMNIVOICE_API_URL}/voices")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"TTS voices fetch failed: {e}")
        raise HTTPException(
            503,
            f"OmniVoice API không phản hồi tại {OMNIVOICE_API_URL}. "
            f"Khởi động omnivoice_server.py trước. Chi tiết: {e}",
        )


@app.post("/tts")
async def tts_generate(body: TTSRequest):
    """Text → Voice: proxy tới OmniVoice API, trả JSON audio_base64."""
    start = time.monotonic()
    logger.info(f"🎤 TTS request: voice={body.voice_name} lang={body.language} "
                f"text={body.text[:60]!r}")

    payload = {
        "voice_name": body.voice_name,
        "text": body.text,
        "instruct": body.instruct,
        "language": body.language,
        "num_step": body.num_step or OMNIVOICE_NUM_STEP,
    }
    try:
        # Model OmniVoice lazy-load 30-60s ở request đầu — timeout rộng rãi
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(f"{OMNIVOICE_API_URL}/tts/generate", json=payload)
            resp.raise_for_status()
            wav_bytes = resp.content
    except httpx.HTTPStatusError as e:
        detail = e.response.text[:300] if e.response is not None else str(e)
        logger.error(f"TTS generate failed: {detail}")
        raise HTTPException(502, f"OmniVoice API lỗi: {detail}")
    except Exception as e:
        logger.error(f"TTS generate failed: {e}")
        raise HTTPException(
            503,
            f"OmniVoice API không phản hồi tại {OMNIVOICE_API_URL}. "
            f"Khởi động omnivoice_server.py trước. Chi tiết: {e}",
        )

    if not wav_bytes:
        raise HTTPException(502, "OmniVoice API trả về rỗng")

    audio_b64 = base64.b64encode(wav_bytes).decode()
    total = time.monotonic() - start
    logger.info(f"✅ TTS done in {total:.2f}s: {len(wav_bytes)} bytes")

    return {
        "success": True,
        "audio_base64": audio_b64,
        "audio_format": "wav",
        "audio_sample_rate": 24000,
        "duration_s": _wav_duration(wav_bytes),
        "processing_time_s": round(total, 2),
    }


# ---------------------------------------------------------------------------
# STT test page — voice file/mic → text tiếng Việt (VietASR | Gipformer)
# ---------------------------------------------------------------------------
_STT_MODELS_META = [
    {"name": "gipformer", "label": "Gipformer (Zipformer)", "default": True},
    {"name": "vietasr", "label": "VietASR (Zipformer)", "default": False},
]

# Cache sherpa-onnx OfflineRecognizer theo tên model (load 1 lần)
_stt_recognizers: dict[str, Any] = {}


def _stt_model_available(name: str) -> bool:
    """Kiểm tra model có file .onnx trong thư mục model."""
    base = Path(GIPFORMER_MODEL_DIR) if name == "gipformer" else Path(VIETASR_MODEL_DIR)
    return any(base.rglob("*.onnx"))


def _get_stt_recognizer(name: str):
    """Lazy-load sherpa-onnx recognizer, cache theo tên model.

    Tái sử dụng logic load model (cuda fallback) của các STT service.
    """
    global _stt_recognizers
    if name in _stt_recognizers:
        return _stt_recognizers[name]

    if name == "gipformer":
        svc = GipformerSTTService(
            model_dir=GIPFORMER_MODEL_DIR,
            provider=GIPFORMER_PROVIDER,
            use_int8=GIPFORMER_USE_INT8,
            decoding_method="greedy_search",
            ttfs_p99_latency=2.0,
        )
    else:  # vietasr
        svc = VietASRSTTService(
            model_dir=VIETASR_MODEL_DIR,
            provider=VIETASR_PROVIDER,
            decoding_method="greedy_search",
        )

    logger.info(f"🔊 STT: loading {name} model ...")
    svc._load_model()
    _stt_recognizers[name] = svc._recognizer
    logger.info(f"🔊 STT: {name} model loaded")
    return svc._recognizer


# ── Silero VAD (offline segmentation theo khoảng lặng) ────────────────────────
_vad_model = None


def _get_vad_model():
    """Lazy-load Silero VAD (torch), cache ở module level."""
    global _vad_model
    if _vad_model is None:
        from silero_vad import load_silero_vad
        logger.info("🔊 VAD: loading Silero VAD model ...")
        _vad_model = load_silero_vad()
        logger.info("🔊 VAD: Silero VAD model loaded")
    return _vad_model


def _vad_segments(pcm: np.ndarray, sample_rate: int = 16000) -> list[dict]:
    """Silero VAD → danh sách đoạn nói {start, end} (samples).

    - min_speech_duration_ms: bỏ đoạn nhiễu ngắn < 250ms
    - min_silence_duration_ms: gộp khi khoảng lặng < 500ms
    - max_speech_duration_s: cắt đoạn nói liên tục quá 30s (tránh OOM)
    """
    import torch
    from silero_vad import get_speech_timestamps

    model = _get_vad_model()
    audio = torch.from_numpy(pcm.astype(np.float32) / 32768.0)
    segs = get_speech_timestamps(
        audio, model,
        threshold=0.5,
        sampling_rate=sample_rate,
        min_speech_duration_ms=250,
        min_silence_duration_ms=500,
        max_speech_duration_s=30,
    )
    return [{"start": int(s["start"]), "end": int(s["end"])} for s in segs]


def _stt_llm_available() -> bool:
    """Kiểm tra Ollama có model STT_LLM_MODEL (Qwen3-4B) không."""
    base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    try:
        import httpx as _httpx
        with _httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{base}/models")
            resp.raise_for_status()
            return any(m.get("id") == STT_LLM_MODEL for m in resp.json().get("data", []))
    except Exception:
        return False


def _llm_format_segments(segments_text: list[str]) -> list[str]:
    """Qwen3-4B: thêm dấu câu, viết hoa, chia đoạn, GIỮ NGUYÊN nội dung.

    - Prompt yêu cầu output dạng 'STT. nội dung' → parse theo index (map bền
      kể cả khi model gộp/thiếu dòng).
    - Luôn trả về ĐÚNG len(segments_text) dòng: ô thiếu → giữ input gốc,
      dòng thiếu dấu câu → tự thêm '.' (safety net).
    - Lowercase input để model luôn áp dụng định dạng.
    """
    n = len(segments_text)
    if n == 0:
        return []
    client = OpenAI(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        api_key="ollama",
        timeout=60,
    )
    numbered_in = "\n".join(f"{i + 1}. {t.strip().lower()}" for i, t in enumerate(segments_text))
    prompt = (
        "Bạn là công cụ định dạng transcript tiếng Việt:\n"
        "- THÊM dấu câu vào mỗi câu (., ? hoặc !)\n"
        "- VIẾT HOA đầu câu\n"
        "- GIỮ NGUYÊN 100% từ ngữ (không thêm/bớt/sửa từ)\n"
        f"- Trả về ĐÚNG {n} dòng, mỗi dòng bắt đầu bằng số thứ tự.\n\n"
        "Ví dụ:\nInput:\n1. hôm nay trời đẹp quá\n2. bạn có khỏe không\n"
        "Output:\n1. Hôm nay trời đẹp quá.\n2. Bạn có khỏe không?\n\n"
        f"Giờ làm tương tự với {n} dòng dưới đây, "
        f"trả về ĐÚNG {n} dòng dạng 'STT. Nội dung đã định dạng':\n{numbered_in}"
    )
    resp = client.chat.completions.create(
        model=STT_LLM_MODEL,
        messages=[
            {"role": "system",
             "content": "Bạn là công cụ định dạng transcript tiếng Việt, "
                        "giữ nguyên 100% từ ngữ."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        max_tokens=2000,
        extra_body={"options": {"think": False}},
    )
    content = resp.choices[0].message.content or ""

    # Parse output dạng 'STT. nội dung' → map theo index
    result: list[str | None] = [None] * n
    orphans: list[str] = []  # dòng không bắt đầu bằng số
    for ln in content.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        m = re.match(r"^(\d+)\s*[.)]\s*(.*)$", ln)
        if m:
            idx = int(m.group(1)) - 1
            txt = m.group(2).strip()
            if 0 <= idx < n and txt:
                result[idx] = txt
        else:
            orphans.append(ln)

    # Dòng không có số → điền vào ô trống theo thứ tự
    for txt in orphans:
        for i in range(n):
            if result[i] is None:
                result[i] = txt
                break

    # Fill ô còn thiếu bằng input gốc (sentence-case) + đảm bảo dấu câu cuối
    formatted = 0
    out: list[str] = []
    for i in range(n):
        txt = result[i]
        if txt is None:
            txt = segments_text[i].strip().lower()
            txt = txt[0].upper() + txt[1:] if len(txt) > 1 else txt.upper()
        else:
            formatted += 1
        if txt and txt[-1] not in ".,!?;:…":
            txt += "."
        out.append(txt)

    logger.info(f"✨ LLM postprocess: {n} segments → {formatted}/{n} formatted")
    return out


def _decode_audio_pcm16(data: bytes, suffix: str) -> tuple[np.ndarray, float]:
    """Giải mã audio bất kỳ (wav/mp3/ogg/m4a/...) → int16 PCM mono 16kHz.

    Dùng ffmpeg để decode + resample. Trả về (pcm, duration_s).
    """
    import subprocess
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=suffix or ".wav", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        proc = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", tmp_path,
             "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
            capture_output=True,
            timeout=60,
        )
        if proc.returncode != 0 or not proc.stdout:
            raise HTTPException(
                400,
                f"ffmpeg không giải mã được audio: "
                f"{proc.stderr.decode(errors='replace')[:200]}",
            )
        pcm = np.frombuffer(proc.stdout, dtype=np.int16)
        return pcm, len(pcm) / 16000.0
    except subprocess.TimeoutExpired:
        raise HTTPException(400, "Giải mã audio quá lâu (>60s)")
    finally:
        os.unlink(tmp_path)


@app.get("/stt-test")
async def stt_test_ui():
    path = CLIENT_HTML / "stt-test.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


@app.get("/stt/models")
async def stt_models():
    """Danh sách model STT có sẵn (Gipformer mặc định, VietASR) + LLM postprocess."""
    return {
        "models": [
            {
                "name": m["name"],
                "label": m["label"],
                "default": m["default"],
                "available": _stt_model_available(m["name"]),
            }
            for m in _STT_MODELS_META
        ],
        "postprocess": {
            "available": _stt_llm_available(),
            "model": STT_LLM_MODEL,
        },
    }


async def _process_audio_stt(
    pcm: np.ndarray, duration_s: float, model: str, postprocess: bool,
) -> dict:
    """Core STT dùng chung: Silero VAD → STT từng đoạn → ghép transcript → LLM.

    Dùng cho cả POST /stt (file/mic) và POST /stt/url (YouTube).
    """
    start = time.monotonic()
    loop = asyncio.get_event_loop()

    # 2. Silero VAD: chia đoạn theo khoảng lặng (blocking → executor)
    def _segment() -> list[dict]:
        return _vad_segments(pcm)

    segments_idx = await loop.run_in_executor(None, _segment)

    # Fallback: VAD không phát hiện (audio ồn/liền) → cả file là 1 đoạn
    if not segments_idx:
        logger.warning("VAD không tìm thấy đoạn nói → dùng toàn bộ audio")
        segments_idx = [{"start": 0, "end": len(pcm)}]

    # Bảo hiểm: hard-cap 25s/đoạn — audio liên tục (nhạc/video) VAD không tách
    # được, cắt cứng để tránh OOM khi inference segment quá dài
    MAX_SEG_SAMPLES = 25 * 16000  # 25 giây @ 16kHz
    capped: list[dict] = []
    for seg in segments_idx:
        s, e = seg["start"], seg["end"]
        if e - s <= MAX_SEG_SAMPLES:
            capped.append(seg)
        else:
            for cs in range(s, e, MAX_SEG_SAMPLES):
                capped.append({"start": cs, "end": min(cs + MAX_SEG_SAMPLES, e)})
    if len(capped) != len(segments_idx):
        logger.warning(f"🔧 Hard-cap: {len(segments_idx)} → {len(capped)} đoạn (max 25s/đoạn)")
    segments_idx = capped

    # 3. STT từng đoạn (mỗi đoạn ngắn → tránh OOM khi audio dài)
    def _infer_segment(seg: dict) -> str:
        seg_pcm = pcm[seg["start"]:seg["end"]]
        if len(seg_pcm) < 800:
            return ""
        rec = _get_stt_recognizer(model)
        samples = seg_pcm.astype(np.float32) / 32768.0
        stream = rec.create_stream()
        stream.accept_waveform(sample_rate=16000, waveform=samples)
        rec.decode_stream(stream)
        return stream.result.text.strip()

    segments_out: list[dict] = []
    text_parts: list[str] = []
    for seg in segments_idx:
        try:
            raw = await loop.run_in_executor(None, _infer_segment, seg)
        except Exception as e:
            logger.warning(f"⚠️ STT đoạn {seg.get('start')}-{seg.get('end')} thất bại, bỏ qua: {e}")
            continue
        if not raw:
            continue
        # VietASR/Gipformer output UPPERCASE → câu có hoa đầu
        seg_text = raw.lower()
        seg_text = seg_text[0].upper() + seg_text[1:] if len(seg_text) > 1 else seg_text.upper()
        segments_out.append({
            "start_s": round(seg["start"] / 16000, 2),
            "end_s": round(seg["end"] / 16000, 2),
            "text": seg_text + ".",
        })
        text_parts.append(seg_text)

    # 4. Ghép transcript: mỗi đoạn = 1 câu (thêm dấu câu)
    text = ". ".join(text_parts) + "." if text_parts else ""

    # 5. LLM postprocess (tùy chọn): thêm dấu câu, viết hoa, chia đoạn, giữ nội dung
    # Truyền RAW text (chưa có dấu câu) để LLM tự quyết định . / ? / !
    llm_used = False
    if postprocess and text_parts:
        try:
            def _format(parts: list[str]) -> list[str]:
                return _llm_format_segments(parts)

            formatted = await loop.run_in_executor(None, _format, text_parts)
            # _llm_format_segments luôn trả đúng len(segments_out) dòng
            if formatted and len(formatted) == len(segments_out):
                for seg, line in zip(segments_out, formatted):
                    seg["text"] = line
                text = " ".join(s["text"] for s in segments_out)
                llm_used = True
        except Exception as e:
            logger.warning(f"⚠️ LLM postprocess thất bại, giữ transcript gốc: {e}")

    total = time.monotonic() - start
    logger.info(f"✅ STT done ({model}) in {total:.2f}s: {len(segments_out)} segments "
                f"(llm={llm_used}) → {text[:100]!r}")
    return {
        "success": bool(text),
        "model": model,
        "text": text,
        "segments": segments_out,
        "segmented": len(segments_idx) > 1,
        "postprocess": llm_used,
        "duration_s": round(duration_s, 2),
        "processing_time_s": round(total, 2),
    }


@app.post("/stt")
async def stt_transcribe(
    file: UploadFile = File(...),
    model: str = Form("gipformer"),
    postprocess: bool = Form(False),
):
    """Upload voice file → text tiếng Việt (VietASR | Gipformer).

    postprocess=True → chạy Qwen3-4B thêm dấu câu, viết hoa, chia đoạn,
    giữ nguyên nội dung (tùy chọn).
    """
    model = model.lower().strip()
    if model not in ("gipformer", "vietasr"):
        raise HTTPException(400, f"Model không hợp lệ: {model}. Chọn 'gipformer' hoặc 'vietasr'")
    if not _stt_model_available(model):
        raise HTTPException(503, f"Model {model} chưa có file .onnx trong thư mục model")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File quá lớn (tối đa 50MB)")
    if len(contents) < 100:
        raise HTTPException(400, "File quá nhỏ để nhận diện")

    suffix = Path(file.filename or "").suffix.lower() or ".wav"
    logger.info(f"🎧 STT: {file.filename} ({len(contents)}B, model={model})")

    # 1. Giải mã → PCM int16 mono 16kHz (ffmpeg)
    pcm, duration_s = _decode_audio_pcm16(contents, suffix)
    if len(pcm) < 800:  # ~50ms @ 16kHz
        raise HTTPException(400, "Audio quá ngắn, không nhận diện được")

    return await _process_audio_stt(pcm, duration_s, model, postprocess)


# ── STT từ link YouTube ────────────────────────────────────────────────────────
_YOUTUBE_HOSTS = {"youtube.com", "youtu.be", "m.youtube.com",
                  "music.youtube.com", "youtube-nocookie.com"}


def _ytdlp_download_audio(url: str) -> tuple[str, dict]:
    """Tải bestaudio từ YouTube bằng yt-dlp.

    - Giới hạn: max_filesize, max_duration, no-playlist
    - Trả về (path_audio, info); file nằm trong thư mục temp (caller tự dọn)
    """
    import tempfile
    import yt_dlp

    info = _ytdlp_extract_info(url)  # pre-check title
    # Giới hạn duration chỉ áp dụng khi tải audio + STT (tốn tài nguyên)
    dur = info.get("duration") or 0
    if dur > YTDLP_MAX_DURATION:
        raise HTTPException(400, f"Video quá dài ({dur}s > {YTDLP_MAX_DURATION}s giới hạn)")

    outdir = tempfile.mkdtemp(prefix="ytdlp_")
    common = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 15,
        "retries": 3,
        "max_filesize": YTDLP_MAX_FILESIZE,
        "outtmpl": str(Path(outdir) / "audio.%(ext)s"),
    }

    # Download audio
    try:
        with yt_dlp.YoutubeDL(common) as ydl:
            ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(400, f"yt-dlp tải thất bại: {str(e)[:200]}")

    files = [f for f in Path(outdir).iterdir() if f.is_file()]
    if not files:
        raise HTTPException(502, "yt-dlp tải xong nhưng không tìm thấy file audio")
    return str(files[0]), info


def _ytdlp_download_video(url: str, quality: str = "best") -> tuple[str, dict]:
    """Tải VIDEO YouTube bằng yt-dlp (bestvideo+bestaudio → merge MP4).

    - quality: 'best' | '720' | '480' | '360' (giới hạn chiều cao)
    - Giới hạn YTDLP_VIDEO_MAX_DURATION (30 phút mặc định)
    - Trả về (path_video, info); file trong thư mục temp (caller tự dọn)
    """
    import tempfile
    import yt_dlp

    info = _ytdlp_extract_info(url)
    dur = info.get("duration") or 0
    if dur > YTDLP_VIDEO_MAX_DURATION:
        raise HTTPException(400, f"Video quá dài ({dur}s > {YTDLP_VIDEO_MAX_DURATION}s giới hạn)")

    outdir = tempfile.mkdtemp(prefix="ytdlp_vid_")
    height = {"720": "720", "480": "480", "360": "360"}.get(quality)
    if height:
        fmt = f"bv*[height<={height}]+ba/b[height<={height}]"
    else:
        fmt = "bv*+ba/b"  # best: video+audio tốt nhất, merge bằng ffmpeg
    opts = {
        "format": fmt,
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 15,
        "retries": 3,
        "outtmpl": str(Path(outdir) / "video.%(ext)s"),
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(400, f"yt-dlp tải thất bại: {str(e)[:200]}")

    files = [f for f in Path(outdir).iterdir() if f.is_file()]
    files.sort(key=lambda f: f.stat().st_size, reverse=True)  # ưu tiên file lớn nhất (video đã merge)
    if not files:
        raise HTTPException(502, "yt-dlp tải xong nhưng không tìm thấy file video")
    return str(files[0]), info


def _ytdlp_extract_info(url: str) -> dict:
    """Lấy thông tin video YouTube (không tải), kiểm tra giới hạn duration/title."""
    import yt_dlp

    opts = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 15,
        "retries": 3,
        "skip_download": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(502, f"Không lấy được thông tin video: {str(e)[:200]}")

    if not info.get("title"):
        raise HTTPException(400, "Video không có tiêu đề hợp lệ")
    return info


# ── Phụ đề YouTube miễn phí (tùy chọn) ────────────────────────────────────────
_SUBTITLE_LANGS = ("vi", "en")


def _fetch_youtube_subtitles(info: dict) -> tuple[str, list[dict]] | None:
    """Lấy phụ đề miễn phí (vi→en; manual→auto). Trả (text, segments) hoặc None."""
    import urllib.request

    for src in ("subtitles", "automatic_captions"):
        tracks_by_lang = info.get(src) or {}
        for lang in _SUBTITLE_LANGS:
            tracks = tracks_by_lang.get(lang)
            if not tracks:
                continue
            # Ưu tiên json3/srv3 (có timestamp) → vtt → ttml
            track = None
            for ext in ("json3", "srv3", "vtt", "ttml"):
                track = next((t for t in tracks if t.get("ext") == ext), None)
                if track:
                    break
            if not track or not track.get("url"):
                continue
            try:
                with urllib.request.urlopen(track["url"], timeout=20) as resp:
                    content = resp.read().decode("utf-8", "replace")
            except Exception as e:
                logger.warning(f"⚠️ Không tải được phụ đề {lang}/{src}: {e}")
                continue
            if track["ext"] in ("json3", "srv3"):
                parsed = _parse_subtitles_json3(content)
            elif track["ext"] == "vtt":
                parsed = _parse_subtitles_vtt(content)
            else:  # ttml — bỏ qua
                continue
            if parsed and parsed[1]:
                logger.info(f"📝 Dùng phụ đề YouTube ({src}/{lang}/{track['ext']}): "
                            f"{len(parsed[1])} dòng")
                return parsed
    return None


def _parse_subtitles_json3(content: str) -> tuple[str, list[dict]]:
    """Parse phụ đề json3 → (text, segments[{start_s, end_s, text}]).

    Phụ đề đã có dấu câu → giữ nguyên text, không thêm dấu chấm.
    """
    import json as _json

    data = _json.loads(content)
    segments: list[dict] = []
    text_parts: list[str] = []
    for e in data.get("events", []):
        t0 = e.get("tStartMs", 0) / 1000.0
        dur = e.get("dDurationMs", 0) / 1000.0
        text = "".join(s.get("utf8", "") for s in e.get("segs", []))
        text = text.replace("\n", " ").strip()
        if not text:
            continue
        segments.append({
            "start_s": round(t0, 2),
            "end_s": round(t0 + dur, 2),
            "text": text,
        })
        text_parts.append(text)
    return " ".join(text_parts), segments


def _parse_subtitles_vtt(content: str) -> tuple[str, list[dict]]:
    """Parse phụ đề WebVTT → (text, segments). Fallback khi không có json3."""

    def _ts(s: str) -> float:
        s = s.strip().replace(",", ".")
        toks = s.split(":")
        if len(toks) == 3:
            return float(toks[0]) * 3600 + float(toks[1]) * 60 + float(toks[2])
        return float(toks[0]) * 60 + float(toks[1])

    segments: list[dict] = []
    text_parts: list[str] = []
    cur_start = cur_end = None
    lines: list[str] = []
    for ln in content.splitlines():
        ln = ln.rstrip()
        if "-->" in ln:
            if cur_start is not None and lines:
                text = " ".join(x.strip() for x in lines).strip()
                if text:
                    segments.append({
                        "start_s": round(cur_start, 2),
                        "end_s": round(cur_end, 2),
                        "text": text,
                    })
                    text_parts.append(text)
            try:
                parts = ln.split("-->")
                cur_start = _ts(parts[0])
                cur_end = _ts(parts[1].split()[0])
            except Exception:
                cur_start = cur_end = None
            lines = []
        elif ln and not ln.startswith(("WEBVTT", "Kind:", "Language:", "NOTE", "STYLE", "Region:")):
            if re.match(r"^\d+$", ln):  # cue number
                continue
            lines.append(ln)
    # Flush cuối
    if cur_start is not None and lines:
        text = " ".join(x.strip() for x in lines).strip()
        if text:
            segments.append({
                "start_s": round(cur_start, 2),
                "end_s": round(cur_end, 2),
                "text": text,
            })
            text_parts.append(text)
    return " ".join(text_parts), segments


@app.post("/stt/url")
async def stt_transcribe_url(
    url: str = Form(...),
    model: str = Form("gipformer"),
    postprocess: bool = Form(False),
    use_subtitles: bool = Form(False),
):
    """Link YouTube → text tiếng Việt.

    Nếu use_subtitles=True và video có phụ đề miễn phí (vi/en) → dùng phụ đề
    luôn (không download/STT). Ngược lại → tải audio + STT như cũ.
    """
    import shutil
    from urllib.parse import urlparse

    model = model.lower().strip()
    if model not in ("gipformer", "vietasr"):
        raise HTTPException(400, f"Model không hợp lệ: {model}. Chọn 'gipformer' hoặc 'vietasr'")
    if not _stt_model_available(model):
        raise HTTPException(503, f"Model {model} chưa có file .onnx trong thư mục model")

    # SSRF guard: chỉ cho phép link YouTube
    host = (urlparse(url).netloc or "").lower().replace("www.", "")
    if host not in _YOUTUBE_HOSTS:
        raise HTTPException(400, f"Chỉ hỗ trợ link YouTube, nhận được: '{host or url[:40]}'")

    logger.info(f"🎬 STT URL: {url} (model={model}, postprocess={postprocess}, "
                f"use_subtitles={use_subtitles})")

    loop = asyncio.get_event_loop()

    # 1. Lấy info video (không tải) — dùng cho kiểm tra phụ đề + giới hạn
    info = await loop.run_in_executor(None, _ytdlp_extract_info, url)

    # 2. Tùy chọn: dùng phụ đề miễn phí nếu video có sẵn
    if use_subtitles:
        sub = await loop.run_in_executor(None, _fetch_youtube_subtitles, info)
        if sub:
            text, segments = sub
            return {
                "success": True,
                "model": "youtube_subtitle",
                "text": text,
                "segments": segments,
                "segmented": len(segments) > 1,
                "postprocess": False,
                "source_type": "subtitle",
                "source": info.get("title", ""),
                "source_url": url,
                "duration_s": round(info.get("duration") or 0, 2),
                "processing_time_s": 0,
            }
        logger.info("ℹ️ Video không có phụ đề khả dụng → fallback STT")

    # 3. Tải audio + STT
    audio_path, info = await loop.run_in_executor(None, _ytdlp_download_audio, url)
    try:
        suffix = Path(audio_path).suffix.lower() or ".webm"
        contents = Path(audio_path).read_bytes()
        pcm, duration_s = _decode_audio_pcm16(contents, suffix)
        if len(pcm) < 800:
            raise HTTPException(400, "Audio quá ngắn, không nhận diện được")

        result = await _process_audio_stt(pcm, duration_s, model, postprocess)
        result["source"] = info.get("title", "")
        result["source_url"] = url
        result["source_type"] = "stt"
        return result
    finally:
        shutil.rmtree(Path(audio_path).parent, ignore_errors=True)


# ---------------------------------------------------------------------------
# /yt-download — tải video YouTube bằng yt-dlp (server-side)
# ---------------------------------------------------------------------------
_yt_download_files: dict[str, str] = {}  # token → path (xóa sau khi serve)


@app.get("/yt-download")
async def yt_download_ui():
    path = CLIENT_HTML / "yt-download.html"
    return HTMLResponse(path.read_text(encoding="utf-8")) if path.exists() else HTMLResponse("Not found", 404)


class YTDownloadRequest(BaseModel):
    url: str = Field(..., description="Link YouTube")
    quality: str = Field("best", description="best | 720 | 480 | 360")


@app.post("/yt-download")
async def yt_download(body: YTDownloadRequest):
    """Dán link YouTube → yt-dlp tải video (MP4, merge bằng ffmpeg) → link tải."""
    from urllib.parse import urlparse

    # SSRF guard: chỉ cho phép YouTube
    host = (urlparse(body.url).netloc or "").lower().replace("www.", "")
    if host not in _YOUTUBE_HOSTS:
        raise HTTPException(400, f"Chỉ hỗ trợ link YouTube, nhận được: '{host or body.url[:40]}'")

    quality = (body.quality or "best").lower()
    if quality not in ("best", "720", "480", "360"):
        raise HTTPException(400, "quality phải là best | 720 | 480 | 360")

    logger.info(f"🎬 YT Download: {body.url} (quality={quality})")
    loop = asyncio.get_event_loop()
    video_path, info = await loop.run_in_executor(None, _ytdlp_download_video, body.url, quality)
    try:
        token = uuid.uuid4().hex
        _yt_download_files[token] = video_path
        name = Path(video_path).name
        return {
            "success": True,
            "filename": name,
            "title": info.get("title", ""),
            "duration_s": info.get("duration") or 0,
            "size_bytes": Path(video_path).stat().st_size,
            "download_url": f"/yt-download/file/{token}",
        }
    except Exception:
        shutil.rmtree(Path(video_path).parent, ignore_errors=True)
        raise


@app.get("/yt-download/file/{token}")
async def yt_download_file(token: str):
    """Phục vụ file đã tải + dọn dẹp sau khi stream xong (1 lần)."""
    from fastapi.responses import FileResponse
    from starlette.background import BackgroundTask

    path = _yt_download_files.pop(token, None)
    if not path or not Path(path).exists():
        raise HTTPException(404, "File không tồn tại hoặc đã hết hạn")
    p = Path(path)

    def _cleanup():
        import shutil
        shutil.rmtree(p.parent, ignore_errors=True)

    return FileResponse(str(p), media_type="video/mp4", filename=p.name,
                        background=BackgroundTask(_cleanup))


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


class DTMFNotification(BaseModel):
    call_uuid: str = ""
    digit: str = ""


@app.post("/dtmf-notify")
async def dtmf_notify_endpoint(data: DTMFNotification):
    """POST /dtmf-notify — receive DTMF digit from FreeSWITCH Lua script.

    Lua script goi endpoint nay khi co phim bam (qua setInputCallback).
    Khi nhan duoc digit 0 -> transfer truc tiep den queue support@default.
    """
    logger.info(f"🔢 DTMF notify: call={data.call_uuid[:8]} digit={data.digit}")

    # Neu digit 0: goi transfer API truc tiep (khong qua pipeline)
    if data.digit == "0" and data.call_uuid:
        logger.info(f"🔄 DTMF 0 -> initiating transfer to {FS_API_QUEUE}")
        asyncio.create_task(_execute_dtmf_transfer(data.call_uuid))

    # Van store vao queue cho pipeline (neu co)
    q = _dtmf_queues.get(data.call_uuid)
    if q:
        await q.put(data.digit)

    return {"success": True}


async def _execute_dtmf_transfer(call_uuid: str):
    """Execute transfer to callcenter queue khi nhan DTMF 0."""
    from fs_tools import _get_http_client, _ensure_token, _call_transfer_api, _delayed_stop_audio
    try:
        client = _get_http_client()
        base_url = FS_API_BASE_URL.rstrip("/")
        token = await _ensure_token(client, base_url, FS_API_USERNAME, FS_API_PASSWORD)
        result = await _call_transfer_api(client, base_url, call_uuid, FS_API_QUEUE, token)
        if result.get("data", {}).get("success"):
            logger.info(f"✅ DTMF transfer succeeded: {result}")
            asyncio.create_task(_delayed_stop_audio(client, base_url, call_uuid, token, 4))
        else:
            logger.warning(f"⚠️ DTMF transfer failed: {result}")
    except Exception as e:
        logger.error(f"❌ DTMF transfer error: {e}")


@app.post("/dtmf-notify/{call_uuid}/{digit}")
async def dtmf_notify_path(call_uuid: str, digit: str):
    """POST /dtmf-notify/{call_uuid}/{digit} — path-based variant."""
    return await dtmf_notify_endpoint(DTMFNotification(call_uuid=call_uuid, digit=digit))


@app.get("/dtmf-notify/{call_uuid}/{digit}")
async def dtmf_notify_get(call_uuid: str, digit: str):
    """GET /dtmf-notify/{call_uuid}/{digit} — for Lua curl (defaults to GET)."""
    return await dtmf_notify_endpoint(DTMFNotification(call_uuid=call_uuid, digit=digit))


# ---------------------------------------------------------------------------
# Transcribe endpoint — upload WAV, test STT → LLM → TTS độc lập
# ---------------------------------------------------------------------------

_cached_transcriber = None
_cached_piper_voice = None


def _get_transcriber():
    """Get cached faster-whisper model for transcribe endpoint."""
    global _cached_transcriber
    if _cached_transcriber is None:
        from faster_whisper import WhisperModel

        device = os.getenv("WHISPER_DEVICE", "cuda")
        compute = os.getenv("WHISPER_COMPUTE_TYPE", "float16")
        logger.info(f"Loading Whisper model (device={device}, compute={compute}) ...")
        _cached_transcriber = WhisperModel(
            "large",
            device=device,
            compute_type=compute,
        )
        logger.info("Whisper model loaded")
    return _cached_transcriber


def _get_piper_voice():
    """Get cached Piper voice for transcribe endpoint."""
    global _cached_piper_voice
    if _cached_piper_voice is None:
        from piper import PiperVoice

        voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
        if not voice_path.exists():
            logger.error(f"Piper voice not found: {voice_path}")
            return None
        #logger.info(f"Loading Piper voice: {voice_path}")
        #_cached_piper_voice = PiperVoice.load(voice_path, use_cuda=False)
        #logger.info("Piper voice loaded")
        logger.info(f"Loading Piper voice: {voice_path} (use_cuda={piper_use_cuda})")
        _cached_piper_voice = PiperVoice.load(voice_path, use_cuda=piper_use_cuda)
        logger.info("Piper voice loaded")        
    return _cached_piper_voice


def _resample_int16(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Resample int16 audio array to target sample rate using FFT."""
    if src_rate == dst_rate:
        return audio
    from scipy import signal as scipy_signal

    audio_float = audio.astype(np.float64)
    dst_len = int(round(len(audio_float) * dst_rate / src_rate))
    resampled = scipy_signal.resample(audio_float, dst_len)
    return np.clip(resampled, -32768, 32767).astype(np.int16)


def _pcm_to_wav(audio: np.ndarray, sample_rate: int) -> bytes:
    """Wrap int16 PCM audio in a WAV header."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())
    return buf.getvalue()


@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    """Upload WAV file → STT → LLM → TTS.

    Returns JSON with transcription, bot text response, and optional TTS audio.
    """
    start = time.monotonic()
    logger.info(f"📂 Transcribe: received '{file.filename}' ({file.content_type})")

    # ── 1. Read + parse WAV ──────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 50MB)")
    if len(contents) < 44:
        raise HTTPException(400, "File too small to be a valid WAV")

    try:
        with wave.open(io.BytesIO(contents)) as wf:
            sr = wf.getframerate()
            channels = wf.getnchannels()
            width = wf.getsampwidth()
            raw = wf.readframes(wf.getnframes())
    except Exception as e:
        raise HTTPException(400, f"Invalid WAV: {e}")

    if width != 2:
        raise HTTPException(400, f"Only 16-bit WAV supported, got {width * 8}-bit")
    if len(raw) < 256:
        return {"success": False, "error": "Audio too short"}

    # ── 2. Convert to mono int16 ─────────────────────────────────────────
    audio = np.frombuffer(raw, dtype=np.int16)
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1).astype(np.int16)

    audio_duration = len(audio) / sr
    logger.info(f"   WAV: {sr}Hz, {channels}ch, {audio_duration:.1f}s")

    # ── 3. STT: Whisper ──────────────────────────────────────────────────
    whisper_start = time.monotonic()

    try:
        model = _get_transcriber()
        # faster-whisper expects 16kHz float32
        audio_16k = _resample_int16(audio, sr, 16000)
        audio_float32 = audio_16k.astype(np.float32) / 32768.0

        segments, info = model.transcribe(
            audio_float32,
            beam_size=3,		# beam_size=5→3 Giảm số lượng hypothesis — nhanh hơn, ít ảo giác hơn
            temperature=0.0,	#  Ít sáng tạo hơn, chỉ nhận diện khi thực sự chắc chắn
            compression_ratio_threshold=2.4,	# Loại bỏ segment bị nén bất thường (dấu hiệu nhiễu) 
            language=None,  # None auto-detect
        )
        segments = list(segments)
        text = " ".join(s.text.strip() for s in segments if s.text.strip())
        stt_time = time.monotonic() - whisper_start

        logger.info(f"   STT ({stt_time:.2f}s): language={info.language} "
                    f"prob={info.language_probability:.2f} -> '{text[:80]}'")
    except Exception as e:
        logger.exception("Whisper error")
        return {"success": False, "error": f"STT failed: {e}"}

    if not text:
        return {"success": False, "error": "No speech detected", "duration_s": audio_duration}

    # ── 4. LLM: Ollama ──────────────────────────────────────────────────
    llm_start = time.monotonic()
    try:
        client = OpenAI(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            api_key="ollama",
        )
        llm_resp = client.chat.completions.create(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            max_tokens=10024,
            temperature=1.0,	# Old 0.7, temperature=0.0 (thêm vào gọi Whisper)  Ít sáng tạo hơn, chỉ nhận diện khi thực sự chắc chắn
            top_p=0.95,
            # top_k=64,   xung dot voi /upload-tes
        )
        response_text = llm_resp.choices[0].message.content.strip()
        llm_time = time.monotonic() - llm_start
        logger.info(f"   LLM ({llm_time:.2f}s): '{response_text[:80]}'")
    except Exception as e:
        logger.exception("Ollama error")
        response_text = ""
        llm_time = 0.0

    # ── 5. TTS: Piper ───────────────────────────────────────────────────
    tts_time = 0.0
    audio_b64 = None
    if response_text:
        try:
            tts_start = time.monotonic()
            voice = _get_piper_voice()
            if voice:
                # Collect all audio chunks
                all_audio = bytearray()
                for chunk in voice.synthesize(response_text):
                    all_audio.extend(chunk.audio_int16_bytes)

                if all_audio:
                    audio_np = np.frombuffer(all_audio, dtype=np.int16)
                    # Resample Piper native (22050) → 16000 for WAV response
                    audio_np = _resample_int16(audio_np, 22050, 16000)
                    wav_bytes = _pcm_to_wav(audio_np, 16000)
                    audio_b64 = base64.b64encode(wav_bytes).decode()
                    tts_time = time.monotonic() - tts_start
                    logger.info(f"   TTS ({tts_time:.2f}s): {len(wav_bytes)} bytes")
        except Exception as e:
            logger.exception("Piper error")

    total_time = time.monotonic() - start
    logger.info(f"✅ Transcribe done in {total_time:.2f}s")

    return {
        "success": True,
        "transcription": text,
        "response_text": response_text,
        "audio_base64": audio_b64,
        "audio_sample_rate": 16000,
        "duration_s": round(audio_duration, 2),
        "processing_time_s": round(total_time, 2),
        "timing": {
            "stt_s": round(stt_time, 2),
            "llm_s": round(llm_time, 2),
            "tts_s": round(tts_time, 2),
        },
    }


@app.get("/api/calls")
async def get_calls(limit: int = 10):
    """Xem N cuộc gọi gần nhất — trả về JSON có tiếng Việt."""
    from call_logger import CallLogger

    logger_calls = CallLogger()
    return {"success": True, "calls": logger_calls.get_recent_calls(limit)}


@app.get("/health")
async def health():
    return {"status": "ok", "active_connections": len(_active_connections)}


# ---------------------------------------------------------------------------
# Knowledge Base API
# ---------------------------------------------------------------------------

@app.get("/api/knowledge")
async def knowledge_list():
    """Xem danh sách documents trong knowledge base."""
    if _knowledge_base is None:
        return {"success": False, "error": "RAG not enabled"}
    return {"success": True, "documents": _knowledge_base.list_documents(), "total_chunks": _knowledge_base.count()}


class KnowledgeUploadRequest(BaseModel):
    filename: str
    content: str


@app.post("/api/knowledge/upload")
async def knowledge_upload(data: KnowledgeUploadRequest):
    """Upload document vào knowledge base."""
    if _knowledge_base is None:
        return {"success": False, "error": "RAG not enabled"}

    # Validate filename
    if not data.filename.endswith((".txt", ".md", ".json")):
        return {"success": False, "error": "Chỉ hỗ trợ .txt, .md, .json"}

    # Save to file
    from pathlib import Path
    kb_dir = Path(__file__).parent / "knowledge"
    kb_dir.mkdir(exist_ok=True)
    fpath = kb_dir / data.filename
    fpath.write_text(data.content, encoding="utf-8")

    # Index
    added = _knowledge_base._index_file(fpath)
    return {"success": True, "filename": data.filename, "chunks_added": added, "total_chunks": _knowledge_base.count()}


@app.post("/api/knowledge/reindex")
async def knowledge_reindex():
    """Re-index tất cả documents trong knowledge/."""
    if _knowledge_base is None:
        return {"success": False, "error": "RAG not enabled"}
    added = _knowledge_base.index_directory()
    return {"success": True, "chunks_added": added, "total_chunks": _knowledge_base.count()}


@app.delete("/api/knowledge/{source}")
async def knowledge_delete(source: str):
    """Xoá document khỏi knowledge base."""
    if _knowledge_base is None:
        return {"success": False, "error": "RAG not enabled"}
    deleted = _knowledge_base.delete_document(source)
    return {"success": True, "source": source, "chunks_deleted": deleted, "total_chunks": _knowledge_base.count()}


# ---------------------------------------------------------------------------
# Startup — khởi tạo knowledge base
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    global _knowledge_base
    if not RAG_ENABLED:
        logger.info("📚 RAG disabled via RAG_ENABLED=false")
        return

    # Khởi tạo knowledge base (lazy — chỉ load model khi cần)
    try:
        _knowledge_base = KnowledgeBase()
        if _knowledge_base.count() == 0:
            _knowledge_base.index_directory()
        logger.info(f"📚 RAG ready: {_knowledge_base.count()} chunks from {len(_knowledge_base.list_documents())} documents")
    except Exception as e:
        logger.error(f"📚 RAG init failed: {e}")
        logger.exception(e)
        _knowledge_base = None


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
