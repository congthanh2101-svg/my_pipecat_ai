"""
GipformerSTTService — Custom Pipecat STT Service dùng Gipformer Zipformer
=========================================================================
Sử dụng sherpa-onnx OfflineRecognizer để chạy inference model
Gipformer-65M-RNNT (Zipformer Transducer) cho tiếng Việt.

Kế thừa SegmentedSTTService để tích luỹ audio và chỉ gọi run_stt()
khi VAD phát hiện kết thúc câu nói.

Model HuggingFace: g-group-ai-lab/gipformer-65M-rnnt

Env vars:
  GIPFORMER_MODEL_DIR   : thư mục chứa model files
                          (mặc định: models/gipformer trong thư mục bot)
  GIPFORMER_USE_INT8    : "true" để dùng model INT8 quantized (nhanh hơn, nhẹ hơn)
                          (mặc định: "false" — dùng FP32)
  GIPFORMER_PROVIDER    : "cpu" | "cuda" (mặc định: cuda nếu available, cpu fallback)
  GIPFORMER_DECODING    : "greedy_search" (mặc định)

Usage:
    STT_PROVIDER=gipformer python bot_fs.py
    STT_PROVIDER=gipformer GIPFORMER_USE_INT8=true python bot_fs.py
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


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
HUGGINGFACE_REPO = "g-group-ai-lab/gipformer-65M-rnnt"
MODEL_SAMPLE_RATE = 16000
FEATURE_DIM = 80
MIN_AUDIO_BYTES = 5120  # ~320ms at 8kHz


class GipformerSTTService(SegmentedSTTService):
    """Pipecat STT service using Gipformer-65M-RNNT model via sherpa-onnx.

    Kế thừa SegmentedSTTService để tự động tích luỹ audio từ pipeline
    và chỉ gọi run_stt() khi VAD phát hiện kết thúc câu nói.

    Audio flow:
      8kHz Int16 PCM (pipeline)
        → SegmentedSTTService accumulates audio in _audio_buffer
        → VADUserStoppedSpeakingFrame triggers run_stt(accumulated_audio)
        → Resample 8kHz → 16kHz → Float32 [-1,1]
        → sherpa-onnx OfflineRecognizer → TranscriptionFrame

    Hỗ trợ FP32 (mặc định) và INT8 quantized (khi use_int8=True).

    Nếu model chưa có trong model_dir, tự động tải từ HuggingFace
    (g-group-ai-lab/gipformer-65M-rnnt) khi start().

    Example::

        stt = GipformerSTTService(
            model_dir="/path/to/models/gipformer",
            provider="cuda",
            use_int8=True,
        )
    """

    def __init__(
        self,
        *,
        model_dir: str = "",
        provider: str = "cuda",
        use_int8: bool = False,
        decoding_method: str = "greedy_search",
        **kwargs,
    ):
        """Initialize Gipformer STT service.

        Args:
            model_dir: Directory containing encoder/decoder/joiner ONNX files
                       and tokens.txt. Auto-downloaded from HuggingFace if empty.
            provider: "cpu" or "cuda" (onnxruntime execution provider).
            use_int8: If True, use INT8 quantized model (smaller, faster,
                      minimal accuracy loss). Default: False (FP32).
            decoding_method: "greedy_search" or "modified_beam_search".
            **kwargs: Additional arguments passed to SegmentedSTTService.
        """
        # Provide settings to avoid STTSettings validation warning
        stt_settings = STTSettings(
            model="gipformer",
            language=Language.VI,
        )
        super().__init__(settings=stt_settings, **kwargs)
        self._model_dir = Path(model_dir) if model_dir else self._default_model_dir()
        self._provider = provider
        self._use_int8 = use_int8
        self._decoding_method = decoding_method
        self._recognizer = None

    # ------------------------------------------------------------------
    # SegmentedSTTService contract
    # ------------------------------------------------------------------
    @property
    def wants_wav_segments(self) -> bool:
        """Gipformer consumes raw Int16 PCM directly, not WAV-wrapped."""
        return False

    # ------------------------------------------------------------------
    # Model file discovery
    # ------------------------------------------------------------------
    def _default_model_dir(self) -> Path:
        """Default model directory: models/gipformer next to bot file."""
        bot_dir = Path(__file__).parent
        return bot_dir / "models" / "gipformer"

    def _has_onnx_files(self) -> bool:
        """Check if any ONNX files exist in the model directory."""
        return any(self._model_dir.rglob("*.onnx"))

    def _find_file(self, name: str) -> str:
        """Find a model file by prefix match (handles epoch suffixes).

        Searches for files like:
          - encoder-epoch-35-avg-6.onnx        (FP32)
          - encoder-epoch-35-avg-6.int8.onnx   (INT8, when use_int8=True)

        Uses rglob matching to find the correct file regardless of
        epoch suffix. When use_int8=False, excludes .int8.onnx files.
        """
        candidates = []
        for f in self._model_dir.rglob(f"*{name}*"):
            if f.is_file() and not f.name.startswith("."):
                candidates.append(f)

        if not candidates:
            raise FileNotFoundError(
                f"Cannot find ONNX file matching '*{name}*' in {self._model_dir}"
            )

        if self._use_int8:
            # INT8 mode: prefer .int8.onnx, fallback to FP32
            for f in candidates:
                if str(f).endswith(".int8.onnx"):
                    return str(f)
            for f in candidates:
                if f.suffix == ".onnx" and ".int8" not in str(f):
                    logger.warning(
                        f"INT8 model not found for '{name}', falling back to FP32"
                    )
                    return str(f)
        else:
            # FP32 mode: exclude .int8.onnx files
            for f in candidates:
                if f.suffix == ".onnx" and ".int8" not in str(f):
                    return str(f)

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
    # HuggingFace auto-download
    # ------------------------------------------------------------------
    def _ensure_model_downloaded(self):
        """Auto-download Gipformer model from HuggingFace if not present."""
        if self._has_onnx_files():
            return  # Already have model files

        logger.info(f"Gipformer: model not found in {self._model_dir}, downloading...")
        try:
            from huggingface_hub import snapshot_download
        except ImportError:
            logger.warning(
                "huggingface_hub not installed. "
                "Run: pip install huggingface_hub\n"
                "Or download model manually from: "
                f"https://huggingface.co/{HUGGINGFACE_REPO}"
            )
            raise

        self._model_dir.mkdir(parents=True, exist_ok=True)
        snapshot_download(
            HUGGINGFACE_REPO,
            local_dir=str(self._model_dir),
            local_dir_use_symlinks=False,
        )
        logger.info(f"Gipformer model downloaded to {self._model_dir}")

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------
    async def start(self, frame):
        """Load Gipformer model during pipeline startup."""
        await super().start(frame)
        self._ensure_model_downloaded()
        self._load_model()

    def _load_model(self):
        """Load sherpa-onnx OfflineRecognizer with Gipformer model."""
        import sherpa_onnx

        encoder = self._find_file("encoder")
        decoder = self._find_file("decoder")
        joiner = self._find_file("joiner")
        tokens = self._find_tokens()

        for name, path in [
            ("encoder", encoder),
            ("decoder", decoder),
            ("joiner", joiner),
            ("tokens", tokens),
        ]:
            if not Path(path).exists():
                raise FileNotFoundError(f"Gipformer {name} not found: {path}")

        logger.info(f"Loading Gipformer model:")
        logger.info(f"   encoder: {encoder}")
        logger.info(f"   decoder: {decoder}")
        logger.info(f"   joiner:  {joiner}")
        logger.info(f"   tokens:  {tokens}")
        logger.info(f"   provider: {self._provider}")
        logger.info(f"   decoding: {self._decoding_method}")
        logger.info(f"   use_int8: {self._use_int8}")

        # Probe CUDA availability
        import time
        time.sleep(0.1)
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
            sample_rate=MODEL_SAMPLE_RATE,
            feature_dim=FEATURE_DIM,
            decoding_method=self._decoding_method,
            provider=resolved_provider,
            num_threads=4,
        )
        logger.info(f"Gipformer model loaded ({resolved_provider})")

    # ------------------------------------------------------------------
    # STT interface
    # ------------------------------------------------------------------
    async def run_stt(self, audio: bytes):
        """Transcribe audio using Gipformer.

        Args:
            audio: Raw Int16 PCM audio at pipeline sample rate (8kHz),
                  accumulated by SegmentedSTTService.

        Yields:
            TranscriptionFrame with recognized Vietnamese text,
            or ErrorFrame on failure.
        """
        if self._recognizer is None:
            logger.warning("Gipformer model not loaded yet, loading now")
            self._load_model()

        if not audio or len(audio) < MIN_AUDIO_BYTES:
            logger.debug(
                f"Gipformer: audio too short "
                f"({len(audio)}B < {MIN_AUDIO_BYTES}B), skipping"
            )
            return

        try:
            # 1. Resample pipeline 8kHz -> model 16kHz
            audio_np = np.frombuffer(audio, dtype=np.int16)
            if MODEL_SAMPLE_RATE != 8000:
                audio_16k = soxr.resample(
                    audio_np, 8000, MODEL_SAMPLE_RATE, quality="VHQ"
                )
            else:
                audio_16k = audio_np

            # 2. Convert Int16 -> Float32 [-1, 1]
            samples = audio_16k.astype(np.float32) / 32768.0

            # 3. Run inference
            stream = self._recognizer.create_stream()
            stream.accept_waveform(
                sample_rate=MODEL_SAMPLE_RATE, waveform=samples
            )
            self._recognizer.decode_stream(stream)

            text = stream.result.text.strip()

            # Gipformer outputs UPPERCASE (BPE tokens). Normalize to
            # Sentence case so OmniVoice/Piper TTS doesn't spell letters.
            if text:
                text = text.lower()
                text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()

            if text:
                logger.info(f"Gipformer: [{text}]")
                yield TranscriptionFrame(
                    text,
                    self._user_id,
                    time_now_iso8601(),
                    "vi",
                )
            else:
                logger.debug("Gipformer: no speech detected")

        except Exception as e:
            logger.error(f"Gipformer error: {e} (audio={len(audio)}B)")
            logger.exception(e)
            yield ErrorFrame(f"Gipformer error: {e}")

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    async def cleanup(self):
        """Release resources."""
        self._recognizer = None
        await super().cleanup()
