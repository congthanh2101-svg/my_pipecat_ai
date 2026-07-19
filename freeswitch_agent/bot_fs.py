"""
FreeSWITCH Voice Agent — Pipecat AI Bot
========================================
Rewrite based on pipecat-examples/websocket pattern:
- SileroVADAnalyzer (instead of custom RMS VAD)
- WorkerRunner lifecycle (instead of manual TaskManager)
- worker.rtvi.event_handler("on_client_ready") for RTVI greetingPiperVoice

STT: Whisper (medium, auto-language) | LLM: Ollama/Deepseek | TTS: Piper/OmniVoice

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
import wave
from pathlib import Path

import base64
import numpy as np
import soxr          # ← THÊM DÒNG NÀY
from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from openai import OpenAI
from pydantic import BaseModel

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
from call_logger import CallLogger, extract_conversation

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

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
VOICES_DIR = Path(os.getenv("PIPER_VOICES_DIR", "/opt/ollama-playground/local-voice-agent/voices"))

# LLM Provider: "ollama" (local) hoặc "deepseek" (API cloud)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
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

SYSTEM_PROMPT = (
    "Bạn là trợ lý giọng nói tiếng Việt thân thiện, hữu ích.\n\n"
    "Quy tắc:\n"
    "- Bạn tên là Xon Len hay còn gọi là Xen Long, trợ lý giọng nói thân thiện.\n"
    "- Trả lời NGẮN GỌN, tối đa 1-2 câu\n"
    "- LUÔN LUÔN có khoảng trắng giữa các từ. "
    "Ví dụ viết ĐÚNG: 'Tôi là Xon Len' — KHÔNG viết 'TôilàXonLen'.\n"
    "- TUYỆT ĐỐI KHÔNG được dùng markdown, ký tự đặc biệt, dấu sao ** **, "
    "dấu gạch * *, dấu `, dấu #, emoji, hay bất kỳ định dạng nào. "
    "Chỉ trả lời bằng chữ thuần tuý, không có ký hiệu định dạng.\n"
    "- Trả lời bằng tiếng Việt\n"
    "- Nếu câu hỏi không rõ ràng, vô nghĩa, hoặc bạn không chắc chắn, "
    "hãy nói 'Dạ, em chưa nghe rõ, anh/chị nói lại được không ạ!'\n"
    "- KHÔNG BAO GIỜ tự bịa ra câu trả lời. Nếu không biết, hãy nói không biết."
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

    # Pre-load shared Whisper model (cả Piper và OmniVoice đều cần)
    load_whisper_model()

    if TTS_ENGINE == "omnivoice":
        # Không cần load Piper voice — OmniVoice load model riêng
        logger.info(f"🔊 TTS: OmniVoice ({OMNIVOICE_MODEL})")
        logger.info(f"🔊 Voice profile: {OMNIVOICE_VOICE_PROFILE}")
        if not Path(OMNIVOICE_VOICE_PROFILE).exists():
            logger.error(f"❌ OmniVoice profile not found: {OMNIVOICE_VOICE_PROFILE}")
            return None, None, None
    else:
        voice_path = VOICES_DIR / "vi_VN-vais1000-medium.onnx"
        if not voice_path.exists():
            logger.error(f"Piper voice not found: {voice_path}")
            return None, None, None
        load_piper_voice()

    # STT: per-pipeline instance, inject shared model to avoid re-loading
    stt = DebugWhisperSTTService(
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        settings=WhisperSTTService.Settings(
            model=Model.LARGE,
            language=Language.VI,  # cố định tiếng Việt — audio giờ đã rõ hơn nhờ AGC,
            # auto-detect (None) dễ đoán nhầm sang tiếng Anh trên audio nhiễu → hallucination
            no_speech_prob=0.9,  # 0.6 quá thấp — segment giọng nói THẬT đo được no_speech_prob~0.82
            # temperature=0.0,   # Ko có
            # logprob_threshold=-0.05,  # Ko có
            # compression_ratio_threshold=1.85,  Ko có
            # (xem log 🎤), phải để ngưỡng cao hơn giá trị đó mới không loại nhầm
        ),
    )
    stt._model = _shared_whisper_model  # Use shared model → no GPU OOM

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
        llm = OLLamaLLMService(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            settings=OLLamaLLMService.Settings(
                model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
                system_instruction=SYSTEM_PROMPT,
                temperature=0.0,
                max_tokens=256,
            ),
        )

    # TTS: tuỳ chọn engine (piper mặc định, omnivoice chất lượng cao)
    if TTS_ENGINE == "omnivoice":
        tts = OmniVoiceTTSService(
            voice_prompt_path=OMNIVOICE_VOICE_PROFILE,
            model_name=OMNIVOICE_MODEL,
            language="vi",
            device_map="cuda:0",
            dtype="float16",
            num_step=OMNIVOICE_NUM_STEP,
        )
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

    # VAD phải chạy TRƯỚC stt để sinh UserStartedSpeakingFrame /
    # UserStoppedSpeakingFrame — WhisperSTTService (batch, non-streaming)
    # cần các frame này để biết lúc nào gom đủ audio và chạy transcribe.
    # confidence=0.5 và min_volume=0.1 khá thấp — tăng lên để VAD khó bị kích hoạt bởi tiếng động nhỏ:
    vad = VADProcessor(
        vad_analyzer=SileroVADAnalyzer(
            sample_rate=8000,
            params=VADParams(confidence=0.85, min_volume=0.5),
        ),
    )

    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=120.0,
        ),
    )

    pipeline_steps = [
        transport.input(),
        # DebugFrameLogger("1-after-input", capture_on_speech=True, max_captures=3),
        vad,
        # DebugFrameLogger("2-after-vad", capture_on_speech=True, max_captures=3),
        MinSpeechDurationFilter(),
        stt,
        HallucinationFilter(HALLUCINATION_CONFIG_PATH),
        # DebugFrameLogger("3-after-stt"),
        user_agg,
        llm,
        # TextDebugLogger("llm-to-tts"),
        MarkdownStripper(),   # Strip markdown/emoji TRƯỚC, để PronNorm xử lý text sạch
    ]

    if PRONUNCIATION_NORMALIZER_ENABLED:
        logger.info("🔤 PronunciationNormalizer: ENABLED (strip markdown → normalize → TTS)")
        pipeline_steps.append(PronunciationNormalizer(PRONUNCIATION_CONFIG_PATH))
    else:
        logger.info("🔤 PronunciationNormalizer: DISABLED (MarkdownStripper → TTS)")

    pipeline_steps.extend([
        tts,
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

        worker, context = await create_pipeline(transport, stt, llm, tts)

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

        worker, context = await create_pipeline(transport, stt, llm, tts)

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
            model=os.getenv("OLLAMA_MODEL", "llama3.2:latest"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            max_tokens=256,
            temperature=0.0,	# Old 0.7, temperature=0.0 (thêm vào gọi Whisper)  Ít sáng tạo hơn, chỉ nhận diện khi thực sự chắc chắn
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
