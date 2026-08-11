"""VieNeu-TTS v3 Turbo FrameProcessor — thay thế Piper/OmniVoice.

Dùng VieNeu-TTS (14 giọng có sẵn + 3 style) để sinh giọng nói từ text.
- ONNX/CPU (torch-free) chạy realtime, RTF < 1 — phù hợp cuộc gọi ngắn.
- Không streaming (Piper-style) — đợi full response rồi generate batch.
- Output 48kHz → TTSAudioProcessor resample xuống 8kHz.
"""

import asyncio
import logging
import os

import numpy as np

from pipecat.frames.frames import (
    ErrorFrame,
    Frame,
    InterruptionFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    TextFrame,
    TTSAudioRawFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

logger = logging.getLogger(__name__)


class VieNeuTTSService(FrameProcessor):
    """Custom TTS service sử dụng VieNeu-TTS v3 Turbo.

    - Accumulate text giữa LLMFullResponseStartFrame / EndFrame
    - Ở EndFrame: gọi vieneu.infer() với voice preset + style
    - Output TTS frames (TTSAudioRawFrame) ở 48kHz cho TTSAudioProcessor xử lý
    - Model được load lazy (lần đầu process_frame) để không block startup
    - infer() chạy trong ThreadPoolExecutor để không block event loop
    """

    CHUNK_DURATION_S = float(os.getenv("VIENEU_CHUNK_DURATION_S", "0.25"))

    def __init__(
        self,
        voice: str = "Trúc Ly",
        style: str = "tu_nhien",
        backend: str = "onnx",
        precision: str = "int8",
        **kwargs,
    ):
        super().__init__(**kwargs)

        self._voice = voice
        self._style = style
        self._backend = backend
        self._precision = precision

        # Lazy-loaded state
        self._tts = None

        # Accumulation state
        self._text_buffer: list[str] = []
        self._is_responding = False
        self._interrupted = False

    def _load_resources(self):
        """Load VieNeu-TTS model (blocking, gọi từ executor)."""
        from vieneu import Vieneu

        logger.info(f"Loading VieNeu-TTS v3 Turbo (backend={self._backend}, precision={self._precision}) ...")
        self._tts = Vieneu(
            mode="v3turbo",
            backend=self._backend,
            precision=self._precision,
        )
        logger.info(f"VieNeu-TTS loaded. Sample rate: {self._tts.sample_rate}Hz, backend={self._tts.backend}")
        voices = [v for _, v in self._tts.list_preset_voices()]
        if self._voice not in voices:
            default_voice = getattr(self._tts, "_default_voice", None)
            logger.warning(f"VIENEU_VOICE '{self._voice}' không có trong preset voices: {voices} — dùng mặc định ({default_voice})")
            self._voice = default_voice
        else:
            logger.info(f"VieNeu-TTS voice: {self._voice!r}, style: {self._style!r}")

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Lazy-load model on first relevant frame
        if self._tts is None and isinstance(
            frame, (LLMFullResponseStartFrame, LLMFullResponseEndFrame, LLMTextFrame, TextFrame)
        ):
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_resources)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._text_buffer = []
            self._interrupted = False
            self._is_responding = True
            logger.debug("VieNeu: LLM response started")

        elif isinstance(frame, (LLMTextFrame, TextFrame)) and self._is_responding:
            # PronNormalizer gửi TextFrame (không phải LLMTextFrame) —
            # xử lý cả 2 loại để tương thích với cả khi có/không PronNormalizer
            self._text_buffer.append(frame.text)
            logger.debug(f"VieNeu: buffered [{len(frame.text)}c] (total {sum(len(t) for t in self._text_buffer)}c)")

        elif isinstance(frame, LLMFullResponseEndFrame):
            self._is_responding = False
            text = "".join(self._text_buffer).strip()
            logger.debug(f"VieNeu: LLM response ended, text=[{text[:100]}] (total {len(text)}c)")
            if not self._interrupted and self._tts is not None and text:
                await self._generate_and_push_audio(text)
            self._text_buffer = []
            if self._tts is None:
                logger.warning("VieNeu: model not loaded yet, dropping TTS generation")

        elif isinstance(frame, InterruptionFrame):
            self._interrupted = True
            self._text_buffer = []

        await self.push_frame(frame, direction)

    async def _generate_and_push_audio(self, text: str):
        """Generate TTS audio via VieNeu và push TTSAudioRawFrame chunks."""
        loop = asyncio.get_event_loop()

        logger.debug(f"VieNeu generating TTS [{len(text)}c]: {text[:80]}...")

        # Push start marker
        await self.push_frame(TTSStartedFrame())

        try:
            audio_np: np.ndarray = await loop.run_in_executor(
                None,
                lambda: self._tts.infer(text=text, voice=self._voice, style=self._style),
            )

            sample_rate = self._tts.sample_rate  # 48000
            if len(audio_np) == 0:
                logger.warning("VieNeu: infer trả về audio rỗng")
                return

            duration_s = len(audio_np) / sample_rate
            logger.debug(f"VieNeu generated {len(audio_np)}samples ({duration_s:.2f}s)")

            # Normalize và convert float32 → int16 PCM
            peak = np.abs(audio_np).max()
            if peak > 0.95:
                audio_np = audio_np / peak * 0.95  # soft limit, tránh clip
            pcm_bytes = (audio_np * 32767).astype(np.int16).tobytes()

            # Chunk và push các TTSAudioRawFrame
            chunk_samples = int(self.CHUNK_DURATION_S * sample_rate)
            chunk_bytes = chunk_samples * 2  # 16-bit

            for offset in range(0, len(pcm_bytes), chunk_bytes):
                chunk = pcm_bytes[offset : offset + chunk_bytes]
                await self.push_frame(
                    TTSAudioRawFrame(
                        audio=chunk,
                        sample_rate=sample_rate,
                        num_channels=1,
                    )
                )

        except Exception as e:
            logger.error(f"VieNeu generation error: {e}")
            await self.push_error(ErrorFrame(error=f"VieNeu TTS failed: {e}"))

        finally:
            await self.push_frame(TTSStoppedFrame())
