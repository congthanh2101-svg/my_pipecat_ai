"""L16 PCM Frame Serializer cho FreeSWITCH mod_audio_stream.

Chuyển đổi giữa raw Linear PCM 16-bit (L16) và Pipecat Frame system.
Xử lý resampling (vd: Piper 22050Hz → 8000Hz cho FreeSWITCH).

FreeSWITCH mod_audio_stream protocol:
- Outbound (FS → app): Raw L16 PCM binary frames (16-bit signed LE, mono)
- Inbound (app → FS): Raw L16 PCM binary frames (16-bit signed LE, mono)
- Default sample rate: 8000 Hz (8kHz)
- Default chunk size: 20 ms (= 320 bytes @ 8kHz mono)
"""

import numpy as np
from scipy import signal as scipy_signal

from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    OutputAudioRawFrame,
)
from pipecat.serializers.base_serializer import FrameSerializer


def _resample_pcm(audio: bytes, src_rate: int, dst_rate: int) -> bytes:
    """Resample 16-bit PCM audio using FFT-based resampling (anti-aliasing).

    Dùng scipy.signal.resample thay vì linear interpolation để tránh aliasing
    khi downsampling (vd: 22050Hz → 8000Hz).

    Args:
        audio: Raw 16-bit PCM bytes.
        src_rate: Source sample rate in Hz.
        dst_rate: Target sample rate in Hz.

    Returns:
        Resampled 16-bit PCM bytes.
    """
    if src_rate == dst_rate:
        return audio

    audio_np = np.frombuffer(audio, dtype=np.int16).astype(np.float64)
    src_len = len(audio_np)
    dst_len = int(round(src_len * dst_rate / src_rate))

    # FFT-based resampling — chống aliasing tốt hơn linear interpolation
    resampled = scipy_signal.resample(audio_np, dst_len).astype(np.int16)
    return resampled.tobytes()


class L16FrameSerializer(FrameSerializer):
    """Serialize/deserialize Pipecat frames ↔ L16 raw PCM audio.

    Dùng cho FreeSWITCH mod_audio_stream integration:

    - Deserialize: raw PCM bytes → InputAudioRawFrame (8kHz, mono, 16-bit)
    - Serialize: OutputAudioRawFrame → raw PCM bytes (resampled về 8kHz nếu cần)
    """

    def __init__(self, sample_rate: int = 8000, num_channels: int = 1):
        """Initialize serializer.

        Args:
            sample_rate: Target sample rate (default 8000 cho FreeSWITCH).
            num_channels: Number of channels (default 1 = mono).
        """
        self._sample_rate = sample_rate
        self._num_channels = num_channels

    async def setup(self, frame: Frame) -> None:
        """Setup serializer (no-op for L16)."""
        pass

    async def serialize(self, frame: Frame) -> bytes | str | None:
        """Serialize OutputAudioRawFrame → raw PCM bytes.

        Resamples về sample_rate mục tiêu nếu cần.

        Args:
            frame: Frame cần serialize.

        Returns:
            Raw PCM bytes nếu frame là OutputAudioRawFrame, None otherwise.
        """
        if not isinstance(frame, OutputAudioRawFrame):
            return None

        audio = frame.audio

        # Resample nếu sample rate khác target
        if frame.sample_rate != self._sample_rate:
            audio = _resample_pcm(audio, frame.sample_rate, self._sample_rate)

        # Downmix to mono nếu cần
        if frame.num_channels > 1 and self._num_channels == 1:
            audio_np = np.frombuffer(audio, dtype=np.int16).astype(np.float32)
            # Average channels
            audio_np = audio_np.reshape(-1, frame.num_channels).mean(axis=1)
            audio = audio_np.astype(np.int16).tobytes()

        return audio

    async def deserialize(self, data: bytes | str) -> Frame | None:
        """Deserialize raw PCM bytes → InputAudioRawFrame."""
        if isinstance(data, bytes):
            import numpy as np
            samples = np.frombuffer(data, dtype=np.int16)
            rms = float(np.sqrt(np.mean(samples.astype(float)**2))) if len(samples) > 0 else 0
            if rms > 5000:  # Only log when there's actual speech-level audio
                import logging
                logging.getLogger().info(f"📥 L16 audio: {len(data)}b rms={rms:.0f}")
            frame = InputAudioRawFrame(
                audio=data,
                sample_rate=self._sample_rate,
                num_channels=self._num_channels,
            )
            return frame
        return None
