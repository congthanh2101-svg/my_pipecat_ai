"""L16 PCM Frame Serializer cho FreeSWITCH mod_audio_stream.

Chuyển đổi giữa raw Linear PCM 16-bit (L16) và Pipecat Frame system.
Xử lý resampling (vd: Piper 22050Hz → 8000Hz cho FreeSWITCH).

FreeSWITCH mod_audio_stream protocol:
- Outbound (FS → app): Raw L16 PCM binary frames (16-bit signed LE, mono)
- Inbound (app → FS): Raw L16 PCM binary frames (16-bit signed LE, mono) — community edition
  hoặc JSON base64 (cho playback — community edition cần JSON format này)
- Default sample rate: 8000 Hz (8kHz)
- Default chunk size: 20 ms (= 320 bytes @ 8kHz mono)
"""

import numpy as np
from scipy import signal as scipy_signal

from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    OutputAudioRawFrame,
    OutputTransportMessageFrame,
)
from pipecat.serializers.base_serializer import FrameSerializer


def _decode_varint(data: bytes, offset: int) -> tuple[int, int]:
    """Decode một protobuf varint bắt đầu từ offset. Trả về (value, new_offset)."""
    value = 0
    shift = 0
    while True:
        b = data[offset]
        offset += 1
        value |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
    return value, offset


def parse_fs_audio_raw_frame(data: bytes) -> dict | None:
    """Giải mã gói tin protobuf hand-rolled mà mod_audio_stream gửi lên.

    Format thực tế (không phải raw PCM thuần):
        Frame { AudioRawFrame frame = 2; }
        AudioRawFrame { string type = 2; bytes audio = 3;
                        uint32 sample_rate = 4; uint32 num_channels = 5; }

    Trả về dict {'type', 'audio', 'sample_rate', 'num_channels'} nếu parse thành
    công và type == "audio", ngược lại trả về None (không phải định dạng này —
    có thể là raw PCM thuần từ bản community edition khác).
    """
    if not data or data[0] != 0x12:
        return None
    try:
        offset = 1
        inner_len, offset = _decode_varint(data, offset)
        inner_end = offset + inner_len
        if inner_end > len(data):
            return None
        inner = data[offset:inner_end]

        result: dict = {}
        o = 0
        while o < len(inner):
            tag, o = _decode_varint(inner, o)
            field_no = tag >> 3
            wire_type = tag & 0x07
            if wire_type == 0:  # varint
                val, o = _decode_varint(inner, o)
                if field_no == 4:
                    result["sample_rate"] = val
                elif field_no == 5:
                    result["num_channels"] = val
            elif wire_type == 2:  # length-delimited (string/bytes)
                length, o = _decode_varint(inner, o)
                payload = inner[o:o + length]
                o += length
                if field_no == 2:
                    result["type"] = payload.decode("utf-8", errors="ignore")
                elif field_no == 3:
                    result["audio"] = payload
            else:
                return None  # wire type không hỗ trợ → không phải format này

        if result.get("type") == "audio" and "audio" in result:
            return result
        return None
    except Exception:
        return None


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
        # AGC state — làm mượt gain qua các frame để tránh giật/nhiễu do
        # tính gain độc lập cho từng gói tin 40ms (mỗi gói tự khuếch đại
        # khác nhau tạo tiếng "chopping").
        self._agc_gain = 1.0

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
        """Deserialize dữ liệu từ FreeSWITCH → InputAudioRawFrame.

        mod_audio_stream gửi lên dạng protobuf hand-rolled (AudioRawFrame),
        KHÔNG phải raw PCM thuần — cần parse đúng field 'audio' bên trong.
        Fallback về raw PCM nếu dữ liệu không khớp định dạng protobuf này
        (để tương thích ngược với build community edition cũ gửi raw thuần).
        """
        if isinstance(data, bytes):
            parsed = parse_fs_audio_raw_frame(data)
            if parsed is not None:
                pcm = parsed["audio"]
                sample_rate = parsed.get("sample_rate", self._sample_rate)
                num_channels = parsed.get("num_channels", self._num_channels)
            else:
                # Không match format protobuf → coi như raw PCM thuần (cũ)
                pcm = data
                sample_rate = self._sample_rate
                num_channels = self._num_channels

            samples = np.frombuffer(pcm, dtype=np.int16)
            rms = float(np.sqrt(np.mean(samples.astype(float) ** 2))) if len(samples) > 0 else 0

            # Khuếch đại nếu audio quá nhỏ (mic gain thấp / đường truyền suy hao) —
            # giúp Whisper nhận diện tốt hơn. Dùng AGC làm mượt (EMA) thay vì tính
            # gain riêng cho từng gói 40ms — nếu không, gain nhảy đột ngột giữa các
            # gói liền kề tạo ra tiếng nhiễu/giật (chopping artifact).
            if len(samples) > 0:
                peak = float(np.max(np.abs(samples)))
                if peak > 70:  # bỏ qua khi gần như im lặng tuyệt đối, tránh khuếch đại nhiễu nền
                    target_gain = min(5.0, 8000.0 / peak)
                else:
                    target_gain = self._agc_gain  # giữ nguyên gain hiện tại lúc im lặng

                alpha = 0.15  # hệ số làm mượt — nhỏ hơn = mượt hơn nhưng phản ứng chậm hơn
                self._agc_gain = self._agc_gain * (1 - alpha) + target_gain * alpha
                self._agc_gain = max(1.0, min(5.0, self._agc_gain))

                if self._agc_gain > 1.01:
                    boosted = np.clip(samples.astype(np.float32) * self._agc_gain, -32767, 32767)
                    pcm = boosted.astype(np.int16).tobytes()
                    rms = rms * self._agc_gain

            if rms > 5000:  # Only log when there's actual speech-level audio
                import logging
                logging.getLogger().info(f"📥 L16 audio: {len(pcm)}b rms={rms:.0f}")
            frame = InputAudioRawFrame(
                audio=pcm,
                sample_rate=sample_rate,
                num_channels=num_channels,
            )
            return frame
        return None


def _encode_varint(value: int) -> bytes:
    """Encode một số nguyên thành protobuf varint."""
    result = bytearray()
    while value > 0x7F:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value & 0x7F)
    return bytes(result)


def _build_output_audio_frame_protobuf(
    audio_data: bytes, sample_rate: int, num_channels: int, sequence_number: int | None = None
) -> bytes:
    """Đóng gói OutputAudioRawFrame theo đúng wire format hand-rolled protobuf
    mà mod_audio_stream mong đợi (xem data-format-pipecat.md mục 2.2):

        message OutputAudioRawFrame {
          optional uint32 sequence_number = 1;
          optional string type = 2;             // "OutputAudioRawFrame"
          optional bytes audio = 3;
          optional uint32 sample_rate = 4;
          optional uint32 num_channels = 5;
        }
        message Frame { optional OutputAudioRawFrame frame = 2; }
    """
    inner = bytearray()

    if sequence_number is not None:
        inner += b"\x08" + _encode_varint(sequence_number)  # field 1, varint

    type_bytes = b"OutputAudioRawFrame"
    inner += b"\x12" + _encode_varint(len(type_bytes)) + type_bytes  # field 2, string

    inner += b"\x1a" + _encode_varint(len(audio_data)) + audio_data  # field 3, bytes

    inner += b"\x20" + _encode_varint(sample_rate)  # field 4, varint
    inner += b"\x28" + _encode_varint(num_channels)  # field 5, varint

    return b"\x12" + _encode_varint(len(inner)) + bytes(inner)  # outer wrapper, field 2


class FSJsonFrameSerializer(L16FrameSerializer):
    """Serializer cho FreeSWITCH mod_audio_stream.

    Mỗi OutputAudioRawFrame được gửi ngay dưới dạng JSON base64 (không buffer)
    để tránh mất audio do OutputTransportMessageUrgentFrame xen giữa.

    JSON format:
    ```json
    {
      "type": "streamAudio",
      "data": {
        "audioDataType": "raw",
        "sampleRate": 8000,
        "audioData": "<base64 encoded PCM>"
      }
    }
    ```
    """

    async def serialize(self, frame: Frame) -> str | None:
        """Serialize frames for FreeSWITCH mod_audio_stream."""
        import base64
        import json

        # OutputTransportMessageFrame: pass through as-is (already JSON)
        if isinstance(frame, OutputTransportMessageFrame):
            return frame.message

        if not isinstance(frame, OutputAudioRawFrame):
            return None

        pcm = await L16FrameSerializer.serialize(self, frame)
        if not pcm:
            return None

        return json.dumps({
            "type": "streamAudio",
            "data": {
                "audioDataType": "raw",
                "sampleRate": self._sample_rate,
                "audioData": base64.b64encode(pcm).decode("ascii"),
            },
        })


class FSProtobufFrameSerializer(L16FrameSerializer):
    """Serializer cho FreeSWITCH mod_audio_stream — dùng protobuf nhị phân cho
    CẢ 2 chiều (giống hệt chiều mic đã xác nhận hoạt động ổn định), thay vì
    JSON+base64 ở chiều output. Nhẹ hơn ~25% (không base64), không tốn CPU
    parse JSON — thử dùng class này nếu JSON gây giật/trễ/audio bị kẹt lại.
    """

    def __init__(self, sample_rate: int = 8000, num_channels: int = 1):
        super().__init__(sample_rate=sample_rate, num_channels=num_channels)
        self._out_seq = 0

    async def serialize(self, frame: Frame) -> bytes | str | None:
        if isinstance(frame, OutputTransportMessageFrame):
            return frame.message

        if not isinstance(frame, OutputAudioRawFrame):
            return None

        pcm = await L16FrameSerializer.serialize(self, frame)
        if not pcm:
            return None

        self._out_seq += 1
        return _build_output_audio_frame_protobuf(
            pcm, self._sample_rate, self._num_channels, sequence_number=self._out_seq
        )
