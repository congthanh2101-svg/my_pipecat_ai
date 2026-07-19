"""OmniVoice TTS FrameProcessor thay thế PiperTTSService.

Dùng OmniVoice (diffusion LM) để sinh giọng nói từ text.
Không phải streaming (Piper-style) — đợi full response rồi generate batch.
"""

import asyncio
import logging
import os
from pathlib import Path

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


class OmniVoiceTTSService(FrameProcessor):
    """Custom TTS service sử dụng OmniVoice cho Vietnamese voice cloning.

    - Accumulate text giữa LLMFullResponseStartFrame / EndFrame
    - Ở EndFrame: gọi model.generate() với voice clone prompt
    - Output TTS frames (TTSAudioRawFrame) ở 24kHz cho TTSAudioProcessor xử lý
    - Model được load lazy (lần đầu process_frame) để không block startup
    - generate() chạy trong ThreadPoolExecutor để không block event loop
    """

    CHUNK_DURATION_S = float(os.getenv("OMNIVOICE_CHUNK_DURATION_S", "0.25"))

    def __init__(
        self,
        voice_prompt_path: str,
        model_name: str = "k2-fsa/OmniVoice",
        language: str = "vi",
        device_map: str = "cuda:0",
        dtype: str = "float16",
        num_step: int = 32,
        **kwargs,
    ):
        super().__init__(**kwargs)

        self._voice_prompt_path = voice_prompt_path
        self._model_name = model_name
        self._language = language
        self._device_map = device_map
        self._dtype = dtype
        self._num_step = num_step

        # Lazy-loaded state
        self._model = None
        self._voice_prompt = None

        # Accumulation state
        self._text_buffer: list[str] = []
        self._is_responding = False
        self._interrupted = False

    def _load_resources(self):
        """Load OmniVoice model + voice prompt (blocking, gọi từ executor)."""
        from omnivoice import OmniVoice, VoiceClonePrompt

        logger.info(f"Loading OmniVoice model {self._model_name} on {self._device_map} ...")
        self._model = OmniVoice.from_pretrained(
            self._model_name,
            device_map=self._device_map,
            dtype=self._dtype,
        )
        logger.info(f"OmniVoice model loaded. Sampling rate: {self._model.sampling_rate}Hz")

        logger.info(f"Loading voice prompt from {self._voice_prompt_path} ...")
        self._voice_prompt = VoiceClonePrompt.load(self._voice_prompt_path)
        logger.info(f"Voice prompt loaded: {self._voice_prompt.ref_text!r}")

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Lazy-load model on first relevant frame
        if self._model is None and isinstance(
            frame, (LLMFullResponseStartFrame, LLMFullResponseEndFrame, LLMTextFrame, TextFrame)
        ):
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._load_resources)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._text_buffer = []
            self._interrupted = False
            self._is_responding = True
            logger.debug(f"OmniVoice: LLM response started")

        elif isinstance(frame, (LLMTextFrame, TextFrame)) and self._is_responding:
            # PronNormalizer gửi TextFrame (không phải LLMTextFrame) —
            # xử lý cả 2 loại để tương thích với cả khi có/không PronNormalizer
            self._text_buffer.append(frame.text)
            logger.debug(f"OmniVoice: buffered [{len(frame.text)}c] (total {sum(len(t) for t in self._text_buffer)}c)")

        elif isinstance(frame, LLMFullResponseEndFrame):
            self._is_responding = False
            text = "".join(self._text_buffer).strip()
            logger.debug(f"OmniVoice: LLM response ended, text=[{text[:100]}] (total {len(text)}c)")
            if not self._interrupted and self._model is not None and text:
                await self._generate_and_push_audio(text)
            self._text_buffer = []
            if self._model is None:
                logger.warning("OmniVoice: model not loaded yet, dropping TTS generation")

        elif isinstance(frame, InterruptionFrame):
            self._interrupted = True
            self._text_buffer = []

        await self.push_frame(frame, direction)

    async def _generate_and_push_audio(self, text: str):
        """Generate TTS audio via OmniVoice và push TTSAudioRawFrame chunks."""
        loop = asyncio.get_event_loop()

        logger.debug(f"OmniVoice generating TTS [{len(text)}c]: {text[:80]}...")

        # Push start marker
        await self.push_frame(TTSStartedFrame())

        try:
            audios = await loop.run_in_executor(
                None,
                lambda: self._model.generate(
                    text=text,
                    language=self._language,
                    voice_clone_prompt=self._voice_prompt,
                    num_step=self._num_step,
                ),
            )

            audio_np: np.ndarray = audios[0]  # (T,) float32 at 24kHz
            sample_rate = self._model.sampling_rate  # 24000
            duration_s = len(audio_np) / sample_rate
            logger.debug(f"OmniVoice generated {len(audio_np)}samples ({duration_s:.2f}s)")

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
            logger.error(f"OmniVoice generation error: {e}")
            await self.push_error(ErrorFrame(error=f"OmniVoice TTS failed: {e}"))

        finally:
            await self.push_frame(TTSStoppedFrame())
