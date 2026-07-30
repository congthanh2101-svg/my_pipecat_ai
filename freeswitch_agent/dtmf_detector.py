"""
DTMF Processors — Phat hien DTMF tu audio in-band (FFT) hoac ESL events
=========================================================================
- DTMFDetectorProcessor: FFT-based (hien tai la chinh, vi ESL events
  khong hoat dong tren FreeSWITCH version nay)
- DTMFPollProcessor: Poll FS API Server (ESL events, du phong)
"""

import asyncio
import time
import numpy as np
from loguru import logger
from pipecat.audio.dtmf.types import KeypadEntry
from pipecat.frames.frames import Frame, InputAudioRawFrame, InputDTMFFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

_LOW_FREQS = np.array([697, 770, 852, 941], dtype=np.float64)
_HIGH_FREQS = np.array([1209, 1336, 1477, 1633], dtype=np.float64)

_DIGIT_MAP: dict[tuple[float, float], str] = {
    (697, 1209): "1", (697, 1336): "2", (697, 1477): "3",
    (770, 1209): "4", (770, 1336): "5", (770, 1477): "6",
    (852, 1209): "7", (852, 1336): "8", (852, 1477): "9",
    (941, 1209): "*", (941, 1336): "0", (941, 1477): "#",
}

_CHAR_TO_KEYPAD: dict[str, KeypadEntry] = {
    "1": KeypadEntry.ONE, "2": KeypadEntry.TWO, "3": KeypadEntry.THREE,
    "4": KeypadEntry.FOUR, "5": KeypadEntry.FIVE, "6": KeypadEntry.SIX,
    "7": KeypadEntry.SEVEN, "8": KeypadEntry.EIGHT, "9": KeypadEntry.NINE,
    "0": KeypadEntry.ZERO, "*": KeypadEntry.STAR, "#": KeypadEntry.POUND,
}


class DTMFDetectorProcessor(FrameProcessor):
    """Phat hien DTMF tu raw PCM audio bang numpy FFT.

    Dat trong pipeline SAU transport.input(), TRUOC vad.
    Yeu cau `dtmfmode=inband` trong FreeSWITCH de tone DTMF
    duoc mix vao audio stream.
    """

    def __init__(self, sample_rate=8000, frame_ms=120, threshold=8.0,
                 ratio_threshold=0.3, debounce_ms=250, energy_min=500.0):
        super().__init__()
        self._sample_rate = sample_rate
        self._frame_size = int(sample_rate * frame_ms / 1000)
        self._step = self._frame_size // 2
        self._threshold = threshold
        self._ratio_threshold = ratio_threshold
        self._debounce_s = debounce_ms / 1000.0
        self._energy_min = energy_min
        self._buf = bytearray()
        self._buf_byte_size = self._frame_size * 2
        self._fft_freqs = np.fft.rfftfreq(self._frame_size, 1.0 / sample_rate)
        self._last_digit: str | None = None
        self._last_digit_time: float = 0.0
        self._window = np.hanning(self._frame_size)
        self._total_frames = 0
        self._detected_digits = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, InputAudioRawFrame):
            self._buf.extend(frame.audio)
            while len(self._buf) >= self._buf_byte_size:
                chunk = bytes(self._buf[:self._buf_byte_size])
                del self._buf[:self._step * 2]
                digit = self._detect_dtmf(chunk)
                if digit is not None:
                    await self._handle_digit(digit)
        await self.push_frame(frame, direction)

    def _detect_dtmf(self, audio_bytes: bytes) -> str | None:
        self._total_frames += 1
        samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float64)
        if np.sqrt(np.mean(samples ** 2)) < self._energy_min:
            self._last_digit = None
            return None
        spectrum = np.abs(np.fft.rfft(samples * self._window))
        slen = len(spectrum)
        freq_bin = self._fft_freqs

        def _best_peak(freqs):
            best_mag, best_freq = -1.0, 0.0
            for target in freqs:
                idx = int(np.argmin(np.abs(freq_bin - target)))
                mag = spectrum[idx] if idx < slen else 0.0
                if idx > 0 and idx < slen - 1:
                    mag = max(mag, spectrum[idx - 1], spectrum[idx + 1])
                if mag > best_mag:
                    best_mag, best_freq = mag, float(freq_bin[idx])
            return (best_freq, best_mag) if best_mag >= self._threshold else None

        low = _best_peak(_LOW_FREQS)
        high = _best_peak(_HIGH_FREQS)
        if low is None or high is None:
            return None
        low_freq, low_mag = low
        high_freq, high_mag = high
        if (low_mag + high_mag) / (float(np.sum(spectrum)) + 1e-10) < self._ratio_threshold:
            return None

        def _nearest(f, targets):
            return float(targets[int(np.argmin(np.abs(targets - f)))])
        return _DIGIT_MAP.get((_nearest(low_freq, _LOW_FREQS), _nearest(high_freq, _HIGH_FREQS)))

    async def _handle_digit(self, digit: str):
        if digit not in _CHAR_TO_KEYPAD:
            return
        now = time.monotonic()
        if digit == self._last_digit and (now - self._last_digit_time) < self._debounce_s:
            return
        self._last_digit = digit
        self._last_digit_time = now
        self._detected_digits += 1
        logger.info(f"🔢 DTMF (FFT): '{digit}' (#{self._detected_digits})")
        await self.push_frame(InputDTMFFrame(button=_CHAR_TO_KEYPAD[digit]))

    async def cleanup(self):
        self._buf.clear()
        await super().cleanup()


class DTMFPollProcessor(FrameProcessor):
    """DTMF detection via local queue (nhan tu /dtmf-notify endpoint).

    Lua script goi curl POST http://bot:8086/dtmf-notify/{call_uuid}/{digit}
    khi co phim bam (qua setInputCallback). Processor nay doc tu queue.
    """

    def __init__(self, dtmf_queue: asyncio.Queue | None = None, poll_interval=0.3):
        super().__init__()
        self._queue = dtmf_queue or asyncio.Queue()
        self._poll_interval = poll_interval
        self._poll_task: asyncio.Task | None = None
        self._stopped = False
        logger.info(f"DTMFPollProcessor created, queue={id(self._queue)}")

    async def start(self, frame):
        await super().start(frame)
        self._poll_task = asyncio.create_task(self._poll_loop())
        logger.info("DTMFPollProcessor poll loop started")

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)

    async def _poll_loop(self):
        try:
            while not self._stopped:
                try:
                    digit = await asyncio.wait_for(
                        self._queue.get(), timeout=self._poll_interval
                    )
                    logger.info(f"🔢 DTMF (notify): got '{digit}' from queue (queue_id={id(self._queue)})")
                    if digit and digit in _CHAR_TO_KEYPAD:
                        await self.push_frame(InputDTMFFrame(button=_CHAR_TO_KEYPAD[digit]))
                except asyncio.TimeoutError:
                    continue
                except asyncio.CancelledError:
                    break
        except asyncio.CancelledError:
            pass

    async def cleanup(self):
        self._stopped = True
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
        await super().cleanup()
