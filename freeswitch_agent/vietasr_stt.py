"""
VietASRSTTService — Custom Pipecat STT Service dùng VietASR Zipformer
======================================================================
Sử dụng sherpa-onnx OfflineRecognizer để chạy inference model
VietASR (Zipformer Transducer) cho tiếng Việt.

Kế thừa SegmentedSTTService để tích luỹ audio và chỉ gọi run_stt()
khi VAD phát hiện kết thúc câu nói.

Env vars:
  VIETASR_MODEL_DIR    : thư mục chứa model files
                         (mặc định: models/vietasr trong thư mục bot)
  VIETASR_PROVIDER     : "cpu" | "cuda" (mặc định: cuda nếu available, cpu fallback)
  VIETASR_DECODING     : "greedy_search" (mặc định)
"""

import os
from pathlib import Path

import numpy as np
import soxr
from loguru import logger

from pipecat.frames.frames import ErrorFrame, TranscriptionFrame
from pipecat.services.stt_service import SegmentedSTTService
from pipecat.services.settings import STTSettings
from pipecat.transcriptions.language import Language
from pipecat.utils.time import time_now_iso8601


class VietASRSTTService(SegmentedSTTService):
    """Pipecat STT service using VietASR Zipformer model via sherpa-onnx.

    Kế thừa SegmentedSTTService để tự động tích luỹ audio từ pipeline
    và chỉ gọi run_stt() khi VAD phát hiện kết thúc câu nói.

    Audio flow:
      8kHz Int16 PCM (pipeline)
        → SegmentedSTTService accumulates audio in _audio_buffer
        → VADUserStoppedSpeakingFrame triggers run_stt(accumulated_audio)
        → Resample 8kHz → 16kHz → Float32 [-1,1]
        → sherpa-onnx OfflineRecognizer → TranscriptionFrame

    Example::

        stt = VietASRSTTService(
            model_dir="/path/to/models/vietasr",
            provider="cuda",
        )
    """

    def __init__(
        self,
        *,
        model_dir: str = "",
        provider: str = "cuda",
        decoding_method: str = "greedy_search",
        model_sample_rate: int = 16000,
        feature_dim: int = 80,
        **kwargs,
    ):
        """Initialize VietASR STT service.

        Args:
            model_dir: Directory containing encoder.onnx, decoder.onnx,
                      joiner.onnx, and tokens.txt.
            provider: "cpu" or "cuda" (onnxruntime execution provider).
            decoding_method: "greedy_search" or "modified_beam_search".
            model_sample_rate: Model sample rate (must be 16000 for VietASR).
            feature_dim: FBank feature dimension (80 for VietASR).
            **kwargs: Additional arguments passed to SegmentedSTTService.
        """
        # Provide settings to avoid STTSettings validation warning
        stt_settings = STTSettings(
            model="vietasr",
            language=Language.VI,
        )
        super().__init__(settings=stt_settings, **kwargs)
        self._model_dir = Path(model_dir) if model_dir else self._default_model_dir()
        self._provider = provider
        self._decoding_method = decoding_method
        self._model_sample_rate = model_sample_rate
        self._feature_dim = feature_dim
        self._recognizer = None

    # ------------------------------------------------------------------
    # SegmentedSTTService contract: local model, not cloud API
    # ------------------------------------------------------------------
    @property
    def wants_wav_segments(self) -> bool:
        """VietASR consumes raw Int16 PCM directly, not WAV-wrapped.

        Returning False avoids wrapping the audio buffer in a 44-byte WAV
        header that would be misinterpreted as audio samples.
        """
        return False

    # ------------------------------------------------------------------
    # Model file discovery
    # ------------------------------------------------------------------
    def _default_model_dir(self) -> Path:
        """Return default model directory relative to bot file."""
        bot_dir = Path(__file__).parent
        return bot_dir / "models" / "vietasr"

    def _find_file(self, name: str) -> str:
        """Find a model file by prefix match (handles epoch suffixes)."""
        for f in self._model_dir.rglob(f"*{name}*"):
            if f.suffix in (".onnx", ".txt"):
                return str(f)
        p = self._model_dir / "exp" / name
        if p.exists():
            return str(p)
        p = self._model_dir / name
        if p.exists():
            return str(p)
        raise FileNotFoundError(
            f"Cannot find {name} in {self._model_dir} "
            f"(looked for *{name}* recursively)"
        )

    def _find_tokens(self) -> str:
        """Find tokens.txt in model directory."""
        for f in self._model_dir.rglob("tokens.txt"):
            return str(f)
        raise FileNotFoundError(
            f"Cannot find tokens.txt in {self._model_dir}"
        )

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------
    def _load_model(self):
        """Load sherpa-onnx OfflineRecognizer với model VietASR."""
        import sherpa_onnx

        encoder = self._find_file("encoder-epoch-12-avg-8.onnx")
        decoder = self._find_file("decoder-epoch-12-avg-8.onnx")
        joiner = self._find_file("joiner-epoch-12-avg-8.onnx")
        tokens = self._find_tokens()

        for name, path in [
            ("encoder", encoder),
            ("decoder", decoder),
            ("joiner", joiner),
            ("tokens", tokens),
        ]:
            if not Path(path).exists():
                raise FileNotFoundError(f"VietASR {name} not found: {path}")

        logger.info(f"Loading VietASR model:")
        logger.info(f"   encoder: {encoder}")
        logger.info(f"   decoder: {decoder}")
        logger.info(f"   joiner:  {joiner}")
        logger.info(f"   tokens:  {tokens}")
        logger.info(f"   provider: {self._provider}")
        logger.info(f"   decoding: {self._decoding_method}")

        # Try CUDA, fallback to CPU
        resolved_provider = self._provider
        if resolved_provider == "cuda":
            try:
                import onnxruntime as ort
                if "CUDAExecutionProvider" not in ort.get_available_providers():
                    resolved_provider = "cpu"
                    logger.warning("CUDA not available, falling back to CPU")
            except Exception:
                resolved_provider = "cpu"
                logger.warning("CUDA check failed, falling back to CPU")

        self._recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=encoder,
            decoder=decoder,
            joiner=joiner,
            tokens=tokens,
            sample_rate=self._model_sample_rate,
            feature_dim=self._feature_dim,
            decoding_method=self._decoding_method,
            provider=resolved_provider,
            num_threads=4,
        )
        logger.info(f"VietASR model loaded ({resolved_provider})")

    # ------------------------------------------------------------------
    # STT interface — called by SegmentedSTTService when VAD detects end
    # of speech
    # ------------------------------------------------------------------
    async def run_stt(self, audio: bytes) -> "AsyncGenerator[Frame | None, None]":
        """Transcribe audio using VietASR.

        Args:
            audio: Raw Int16 PCM audio at pipeline sample rate (8kHz),
                  accumulated by SegmentedSTTService from VAD start to stop.

        Yields:
            TranscriptionFrame containing recognized Vietnamese text,
            or ErrorFrame on failure.
        """
        if self._recognizer is None:
            self._load_model()

        MIN_AUDIO_BYTES = 5120  # ~320ms at 8kHz
        if not audio or len(audio) < MIN_AUDIO_BYTES:
            logger.debug(
                f"VietASR: audio too short "
                f"({len(audio)}B < {MIN_AUDIO_BYTES}B), skipping"
            )
            return

        try:
            # 1. Resample pipeline 8kHz -> model 16kHz
            audio_np = np.frombuffer(audio, dtype=np.int16)
            if self._model_sample_rate != 8000:
                audio_16k = soxr.resample(
                    audio_np, 8000, self._model_sample_rate, quality="VHQ"
                )
            else:
                audio_16k = audio_np

            # 2. Convert Int16 -> Float32 [-1, 1]
            samples = audio_16k.astype(np.float32) / 32768.0

            # 3. Run inference
            stream = self._recognizer.create_stream()
            stream.accept_waveform(
                sample_rate=self._model_sample_rate, waveform=samples
            )
            self._recognizer.decode_stream(stream)

            text = stream.result.text.strip()

            # VietASR model outputs UPPERCASE text (BPE tokens
            # are all uppercase). Convert to lowercase with first
            # letter capitalised so OmniVoice/Piper TTS reads
            # correctly and doesn't spell out letters.
            if text:
                text = text.lower()
                text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()

            if text:
                logger.info(f"VietASR: [{text}]")
                yield TranscriptionFrame(
                    text,
                    self._user_id,
                    time_now_iso8601(),
                    "vi",
                )
            else:
                logger.debug("VietASR: no speech detected")

        except Exception as e:
            logger.error(f"VietASR error: {e} (audio={len(audio)}B)")
            logger.exception(e)
            yield ErrorFrame(f"VietASR error: {e}")

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    async def cleanup(self):
        """Release resources."""
        self._recognizer = None
        await super().cleanup()
