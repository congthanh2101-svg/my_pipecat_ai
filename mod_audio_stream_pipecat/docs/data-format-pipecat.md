# Data Format: mod_audio_stream → PipeCat AI

Tài liệu này mô tả định dạng dữ liệu giao tiếp giữa FreeSWITCH module `mod_audio_stream` và PipeCat AI server.

---

## 1. Giao thức truyền tải

| Thuộc tính | Giá trị |
|------------|---------|
| **Giao thức** | WebSocket (mặc định) — IXWebSocket C++ library |
| **URL** | `ws://host:port/path` hoặc `wss://host:port/path` |
| **Loại frame** | Binary frames cho audio, Text frames cho JSON |
| **Reconnection** | Tự động — có thể tắt qua channel variable |
| **Xác thực** | Custom HTTP headers (JSON) qua `STREAM_EXTRA_HEADERS` |

> **Lưu ý:** Có thể fallback sang TCP raw socket (không protobuf, chỉ PCM thô) khi đổi `STREAM_TYPE` thành `"TCP"`.

---

## 2. Định dạng dữ liệu

Module dùng **Protobuf wire format encode thủ công** (không có `.proto` compiler, không protobuf runtime library).  
File encode/decode: [`protobuf_audio.h`](../protobuf_audio.h)

### 2.1. Dữ liệu gửi đi (FreeSWITCH → PipeCat) — Microphone → Bot

```protobuf
message AudioRawFrame {
  optional string type = 2;          // Luôn là "audio"
  optional bytes audio = 3;          // Raw PCM data
  optional uint32 sample_rate = 4;   // 8000 Hz
  optional uint32 num_channels = 5;  // 1 (mono)
}

message Frame {
  optional AudioRawFrame frame = 2;  // wrapper
}
```

#### Binary wire format cụ thể

| Offset (hex) | Field | Giá trị | Ghi chú |
|-------------|-------|---------|---------|
| `0x12` | Tag field 2 + wire type 2 | Fixed | Outer frame wrapper |
| varint | Length của inner AudioRawFrame | Thay đổi | |
| `0x12` | Tag `type` (string, field 2) | Fixed | Inner field |
| varint | Length của string | 5 | `"audio"` dài 5 bytes |
| `0x61 0x75 0x64 0x69 0x6f` | `"audio"` | Fixed | |
| `0x1a` | Tag `audio` (bytes, field 3) | Fixed | Dữ liệu PCM |
| varint | Length của PCM data | VD: 640 | |
| raw bytes | PCM audio data | Signed 16-bit LE | |
| `0x20` | Tag `sample_rate` (varint, field 4) | Fixed | |
| varint | `8000` | 0xe8 0x3e | |
| `0x28` | Tag `num_channels` (varint, field 5) | Fixed | |
| varint | `1` | 0x01 | Mono |

#### Audio spec — Outbound

| Thuộc tính | Giá trị |
|------------|---------|
| **Sample format** | Signed 16-bit Linear PCM (L16) |
| **Sample rate** | **8000 Hz** — hardcoded trong `AudioStreamer::writeBinary()` |
| **Bit depth** | 16 bits per sample |
| **Channels** | 1 (mono) |
| **Byte order** | Little-endian |
| **Frame size** | 320 bytes (20ms @ 8kHz, 16-bit mono) |
| **Bufferization** | Gom 500ms (`BUFFERIZATION_INTERVAL_MS`) trước khi gửi |

---

### 2.2. Dữ liệu nhận về (PipeCat → FreeSWITCH) — Bot → Caller

Module expect nhận dữ liệu theo schema này:

```protobuf
message OutputAudioRawFrame {
  optional uint32 sequence_number = 1;  // Số thứ tự
  optional string type = 2;             // "OutputAudioRawFrame"
  optional bytes audio = 3;             // PCM audio data
  optional uint32 sample_rate = 4;      // Sample rate (VD: 24000)
  optional uint32 num_channels = 5;     // 1 (mono)
}

message Frame {
  optional OutputAudioRawFrame frame = 2;  // wrapper
}
```

#### Binary wire format

| Offset (hex) | Field | Giá trị |
|-------------|-------|---------|
| `0x12` | Tag field 2 + wire type 2 | Fixed |
| varint | Length inner frame | Thay đổi |
| `0x08` | `sequence_number` (varint, field 1) | Optional |
| `0x12` | `type` string (field 2) | `"OutputAudioRawFrame"` |
| `0x1a` | `audio` bytes (field 3) | PCM data |
| `0x20` | `sample_rate` varint (field 4) | VD: 24000 |
| `0x28` | `num_channels` varint (field 5) | 1 |

**Xử lý khi nhận:**
- Module dùng Speex resampler để resample về 8000 Hz nếu sample_rate khác
- Audio được đưa vào ring buffer playback, FreeSWITCH ghi vào luồng WRITE_REPLACE

---

### 2.3. JSON / Metrics messages

Ngoài audio, còn có message dạng JSON (nhận dạng qua outer tag `0x22` — field 4 + wire type 2):

```protobuf
message JsonFrame {
  optional string json = 1;  // JSON string
}
```

- Gửi dưới dạng **WebSocket Text frame** (xử lý ở `audio_streamer_glue.cpp:311-324`)
- Hoặc **Binary frame** với outer tag `0x22`
- Dùng cho: bot messages, transcripts, sự kiện...
- Module forward các JSON này thành FreeSWITCH event `mod_audio_stream::json`

---

## 3. Luồng dữ liệu End-to-End

### Outbound — User speech → PipeCat

```
FreeSWITCH channel (PCMA/PCMU 8kHz)
  │
  ▼ [mod_audio_stream.c] capture_callback SWITCH_ABC_TYPE_READ
stream_frame()
  │
  ▼ [audio_streamer_glue.cpp] Gom dữ liệu vào ring buffer
Khi buffer ≥ frame size → drain buffer thành chunk
  │
  ▼ [audio_streamer_glue.cpp:598-627] AudioStreamer::writeBinary()
build_audio_raw_frame(pcm_data, len, 8000, 1)
  │
  ▼ WebSocket sendBinary()
Protobuf-encoded AudioRawFrame
  │
  ║===== Internet / Network =====║
  │
  ▼ PipeCat AI Server
```

### Inbound — PipeCat → Bot speech

```
PipeCat AI Server
  │
  ║===== Internet / Network =====║
  │
  ▼ WebSocket Binary Frame (OutputAudioRawFrame)
  │
  ▼ [audio_streamer_glue.cpp:197-310] onMessage callback
extract_audio_from_protobuf()
  │
  ▼ Speex resampler (nếu sample_rate ≠ 8000)
Resample về 8000 Hz
  │
  ▼ Ring buffer playback (tech_pvt->playbackBuffer)
65536 bytes (~4 giây)
  │
  ▼ [mod_audio_stream.c:48-81] SWITCH_ABC_TYPE_WRITE_REPLACE
Drain buffer → replace frame → gửi đến caller
```

---

## 4. Code phía PipeCat AI (Python) — Gợi ý

### 4.1. WebSocket server nhận dữ liệu

```python
import asyncio
import struct
import websockets
from google.protobuf import internal

# Proto schema definition (dùng protobuf hoặc parse thủ công)

# Cấu trúc varint decoder
async def decode_varint(data: bytes, offset: int) -> tuple:
    value = 0
    shift = 0
    while True:
        byte = data[offset]
        value |= (byte & 0x7F) << shift
        shift += 7
        offset += 1
        if not (byte & 0x80):
            break
    return value, offset

# Parse AudioRawFrame từ binary
def parse_audio_raw_frame(data: bytes) -> dict:
    """Parse protobuf AudioRawFrame message từ binary."""
    result = {}
    offset = 0
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field_number = tag >> 3
        wire_type = tag & 0x07
        
        if wire_type == 0:  # varint
            value, offset = decode_varint(data, offset)
            result[field_number] = value
        elif wire_type == 2:  # length-delimited
            length, offset = decode_varint(data, offset)
            if field_number == 2:  # type string
                result['type'] = data[offset:offset+length].decode('utf-8')
            elif field_number == 3:  # audio bytes
                result['audio'] = data[offset:offset+length]
            offset += length
    
    return result

# WebSocket handler
async def handle_audio(websocket):
    async for message in websocket:
        if isinstance(message, bytes):
            # Parse outer frame (tag 0x12 = field 2, wire type 2)
            if len(message) > 0 and message[0] == 0x12:
                _, offset = decode_varint(message, 1)
                inner_len, offset = decode_varint(message, offset)
                inner_data = message[offset:offset+inner_len]
                
                audio_frame = parse_audio_raw_frame(inner_data)
                pcm_data = audio_frame.get('audio')
                sample_rate = audio_frame.get('sample_rate', 8000)
                
                # pcm_data là signed 16-bit LE, 8000 Hz, mono
                # → PipeCat pipeline xử lý tiếp
                
                # Gửi phản hồi (OutputAudioRawFrame)
                response = build_output_audio_frame(bot_audio, 24000, 1)
                await websocket.send(response)
```

### 4.2. Gửi phản hồi dạng protobuf

```python
def encode_varint(value: int) -> bytes:
    """Encode integer thành protobuf varint."""
    result = []
    while value > 0x7F:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value & 0x7F)
    return bytes(result)

def build_output_audio_frame(audio_data: bytes, sample_rate: int, channels: int) -> bytes:
    """Build OutputAudioRawFrame protobuf message."""
    frame_content = b''
    
    # Field 3: audio bytes (tag 0x1a)
    frame_content += b'\x1a' + encode_varint(len(audio_data)) + audio_data
    
    # Field 4: sample_rate (tag 0x20)
    frame_content += b'\x20' + encode_varint(sample_rate)
    
    # Field 5: num_channels (tag 0x28)
    frame_content += b'\x28' + encode_varint(channels)
    
    # Outer wrapper: AudioRawFrame ở field 2
    result = b'\x12' + encode_varint(len(frame_content)) + frame_content
    
    return result
```

---

## 5. Các hằng số quan trọng

| Hằng số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `BUFFERIZATION_INTERVAL_MS` | 500ms | Khoảng thời gian gom audio trước khi gửi |
| `PLAYBACK_BUFFER_SIZE` | 65536 bytes | Kích thước ring buffer playback (~4s @ 8kHz) |
| `PLAYBACK_PREFILL_BYTES` | 1600 bytes | Prefill trước khi bắt đầu playback (~100ms) |
| `FRAME_SIZE_8000` | 160 samples | Kích thước frame FreeSWITCH @ 8kHz (20ms) |
| Sample rate outbound | 8000 Hz | Hardcoded trong `AudioStreamer::writeBinary()` |
| Audio format | L16 (signed 16-bit LE) | Linear PCM |
| Channels | 1 (mono) | |

---

### Lịch sử thay đổi

- **Pipecat Protobuf patch (16kHz)** — Bản gốc gửi audio ở 16000 Hz
- **Pipecat Protobuf 8kHz patch** — Chuyển xuống 8000 Hz để tương thích với UniMRCP
- Hiện tại code dùng **8000 Hz** cho outbound
