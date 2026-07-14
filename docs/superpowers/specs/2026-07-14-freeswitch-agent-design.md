# FreeSWITCH Voice Agent — Thiết Kế Chi Tiết

**Ngày**: 2026-07-14
**Dựa trên**: `vi_assistant` (Whisper STT + Ollama LLM + Piper TTS)
**Mục đích**: Ứng dụng voice AI agent hỗ trợ WebSocket để tích hợp với `mod_audio_stream` của FreeSWITCH.

---

## Tổng Quan

Xây dựng một ứng dụng voice AI agent mới tách biệt với `vi_assistant`, thay thế transport WebRTC (Daily) bằng WebSocket server để FreeSWITCH kết nối qua module `mod_audio_stream`. Giữ nguyên các thành phần xử lý: STT (Whisper), LLM (Ollama), TTS (Piper).

## Yêu Cầu

| Yêu cầu | Giá trị |
|---|---|
| Protocol inbound (app → FS) | Raw binary PCM (L16) |
| Port | 8086 |
| Multi-call | Có, nhiều kết nối đồng thời |
| Web UI | Có, để test |
| Transport protocol | WebSocket raw PCM (không JSON) |

## Kiến Trúc

```
┌──────────────────────────────────────────────────────────────────┐
│  FreeSWITCH (mod_audio_stream)                                    │
│  uuid_audio_stream <uuid> start ws://host:8086/audio-stream mono 8k │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ WebSocket (raw L16 PCM @ 8kHz, mono)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI Server (port 8086)                                       │
│                                                                   │
│  ┌─ WebSocket Endpoint: /audio-stream ─────────────────────────┐ │
│  │                                                              │ │
│  │  ws.accept()                                                 │ │
│  │      │                                                       │ │
│  │      ▼                                                       │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │  Per-Connection Pipeline                              │   │ │
│  │  │                                                        │   │ │
│  │  │  L16 Serializer ──▶ Whisper STT ──▶ Ollama LLM       │   │ │
│  │  │       ▲                       (context management)    │   │ │
│  │  │       │                                                │   │ │
│  │  │  Piper TTS ◀──────────────────────────────────────────┘   │ │
│  │  │       │          (resample 22050Hz → 8000Hz)              │ │
│  │  └───────┼──────────────────────────────────────────────────┘ │
│  └──────────┼────────────────────────────────────────────────────┘
│             │
│  ┌─ HTTP Endpoint: / ─────────────────────────────────────────┐  │
│  │  Giao diện web test (client/index.html)                     │  │
│  │  - Ghi âm microphone → gửi raw PCM lên WebSocket            │  │
│  │  - Nhận raw PCM từ WebSocket → phát qua loa                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Components Chi Tiết

### 1. L16 PCM Serializer (`l16_serializer.py`)

Chuyển đổi giữa raw PCM bytes và Pipecat frames.

**Chức năng**:
- `deserialize(bytes)` → `InputAudioRawFrame(audio, sample_rate=8000, num_channels=1)`
- `serialize(OutputAudioRawFrame)` → `bytes` (raw PCM, resampled về 8000Hz nếu cần)

**Resampling**: Dùng numpy + linear interpolation để chuyển đổi sample rate (vd: Piper 22050Hz → 8000Hz). Không dùng `audioop` (deprecated từ Python 3.13).

**Protocol details** (FreeSWITCH `mod_audio_stream`):
- Outbound (FS → app): Raw L16 PCM binary frames, 16-bit signed, little-endian
- Inbound (app → FS): Raw L16 PCM binary frames, 16-bit signed, little-endian
- Sample rate: 8000 Hz (8kHz) — mặc định của `mod_audio_stream`
- Channels: mono (1)
- Kích thước chunk: 20ms (320 bytes) — configurable qua `STREAM_BUFFER_SIZE`

### 2. Bot Pipeline (`bot_fs.py`)

Pipeline xử lý, mỗi kết nối có một pipeline riêng.

```
Pipeline([
    transport.input(),          # FastAPIWebsocketInputTransport
    stt,                        # WhisperSTTService (medium, vi)
    user_aggregator,            # LLMUserAggregator (VAD-based)
    llm,                        # OLLamaLLMService (llama3.2)
    tts,                        # PiperTTSService (vi_VN, sample_rate=8000)
    transport.output(),         # FastAPIWebsocketOutputTransport
    assistant_aggregator,       # LLMAssistantAggregator
])
```

**Thay đổi so với `vi_assistant`**:
- Bỏ Daily transport, thay bằng `FastAPIWebsocketTransport`
- Thêm `L16FrameSerializer` — raw PCM thay vì Protobuf
- Piper TTS output `sample_rate=8000` để khớp với FreeSWITCH
- Mỗi kết nối WebSocket = một pipeline riêng (multi-call support)

### 3. Multi-call Handling

Mỗi WebSocket connection → pipeline riêng với services riêng:
- `WhisperSTTService`: Mỗi pipeline load model riêng (~1.5GB RAM/model)
- `OLLamaLLMService`: Mỗi pipeline giữ HTTP connection riêng đến Ollama
- `PiperTTSService`: Mỗi pipeline load model riêng (~100MB RAM/model)

**Giới hạn**: ~1-2 cuộc gọi đồng thời trên máy 8GB RAM.

### 4. Web Test UI

`client/index.html` — Giao diện web để test trước khi kết nối với FreeSWITCH.

**Luồng**:
1. User mở http://localhost:8086/
2. User cấp quyền microphone → ghi âm real-time
3. Audio được gửi lên WebSocket `/audio-stream` dưới dạng raw PCM (8kHz)
4. Pipeline xử lý → gửi audio response về
5. Browser phát audio response

## Data Flow

### Cuộc gọi FreeSWITCH

```
1. FS: uuid_audio_stream <uuid> start ws://host:8086/audio-stream mono 8k
2. WebSocket connection established
3. Server gửi lời chào (TTS) → FS phát cho caller nghe
4. Caller nói → FS gửi raw PCM → Server
   a. L16 Deserializer → InputAudioRawFrame
   b. SileroVAD → Whisper STT
   c. "tôi muốn hỏi về thời tiết"
   d. Ollama LLM → "Hôm nay trời đẹp, bạn có thể ra ngoài dạo chơi."
   e. Piper TTS → OutputAudioRawFrame (22050Hz)
   f. L16 Serializer (resample → 8000Hz) → raw PCM bytes
5. Server gửi raw PCM → FS → caller nghe response
6. Lặp lại bước 4-5 cho tới khi call kết thúc
```

### Test với Web UI

```
1. User mở http://localhost:8086/
2. User nói → Browser AudioContext → raw PCM @ 8kHz → WebSocket
3. Pipeline xử lý → raw PCM response → WebSocket
4. Browser decode → phát qua loa
```

## Cấu Trúc Files

```
freeswitch_agent/
├── pyproject.toml          # Dependencies
├── .env.example            # Environment variables template
├── README.md               # Hướng dẫn cài đặt & sử dụng
├── bot_fs.py               # FastAPI server + WebSocket endpoint + pipeline
├── l16_serializer.py       # L16 PCM frame serializer
└── client/
    └── index.html          # Web test UI
```

## Các Vấn Đề & Giải Pháp

| Vấn đề | Giải pháp |
|---|---|
| Piper output rate (22050Hz) ≠ FS rate (8000Hz) | L16Serializer resample bằng numpy |
| Nhiều pipeline → nhiều Whisper model | Per-connection cho PoC; pool model cho production |
| Pipeline lifecycle | Mỗi connection tạo/cleanup pipeline riêng |
| Concurrent audio processing | Mỗi pipeline chạy độc lập trong asyncio tasks |
| FS gửi continuous stream | Pipeline xử lý tự nhiên qua VAD + STT |

## Lệnh FreeSWITCH

Kết nối FreeSWITCH tới agent:

```xml
<!-- dialplan extension -->
<action application="set" data="STREAM_PLAYBACK=true"/>
<action application="set" data="STREAM_SAMPLE_RATE=8000"/>
<action application="set" data="STREAM_BUFFER_SIZE=20"/>
<action application="uuid_audio_stream" data="${uuid} start ws://your-server:8086/audio-stream mono 8k"/>
```

Hoặc từ CLI:
```
uuid_audio_stream <uuid> start ws://127.0.0.1:8086/audio-stream mono 8k
```
