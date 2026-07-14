# FreeSWITCH Voice Agent — Pipecat AI

Voice AI agent real-time tích hợp với FreeSWITCH qua `mod_audio_stream`.

| Thành phần | Công nghệ |
|---|---|
| **STT** | Whisper (medium) — faster-whisper |
| **LLM** | Ollama — llama3.2:latest |
| **TTS** | Piper — vi_VN-vais1000-medium |
| **Transport** | WebSocket — raw L16 PCM @ 8kHz |
| **Server** | FastAPI + uvicorn (port 8086) |

## Yêu Cầu

- Python >= 3.11
- [Ollama](https://ollama.com/) đã cài và chạy
- Piper voice model tiếng Việt (đã có sẵn)
- FreeSWITCH với module `mod_audio_stream` (cho production)

## Cài Đặt

### 1. Cài dependencies

```bash
# Dùng venv riêng
cd /opt/my_pipecat_ai/freeswitch_agent
python3 -m venv venv
source venv/bin/activate

# Cài pipecat + extras
pip install "pipecat-ai[whisper,piper]>=1.3.0"

# Cài các dependencies khác
pip install fastapi uvicorn[standard] python-dotenv loguru numpy
```

Hoặc dùng pip từ file cấu hình:

```bash
pip install -e .
```

### 2. Cấu hình Ollama

```bash
# Khởi động Ollama server
ollama serve

# Pull model llama3.2
ollama pull llama3.2:latest
```

### 3. Kiểm tra Piper voice

```bash
ls -la /opt/ollama-playground/local-voice-agent/voices/vi_VN-vais1000-medium*
```

### 4. Cấu hình môi trường

```bash
cp .env.example .env
# Chỉnh sửa nếu cần (các giá trị mặc định đã hoạt động)
```

## Chạy

```bash
cd /opt/my_pipecat_ai/freeswitch_agent
source venv/bin/activate  # nếu dùng venv

python bot_fs.py
```

Server khởi động tại **http://localhost:8086**.

## Test Với Web UI

Mở **http://localhost:8086/** trong trình duyệt:

1. Cho phép truy cập microphone
2. Nhấn "Kết nối" → WebSocket kết nối tới `/audio-stream`
3. Nói vào mic → audio được gửi dưới dạng raw PCM (8kHz, 16-bit)
4. Pipeline xử lý (STT → LLM → TTS) → gửi audio response về
5. Trình duyệt phát response qua loa

## Kết Nối FreeSWITCH

### Cấu hình dialplan

```xml
<extension name="voice_agent">
    <condition field="destination_number" expression="^voiceagent$">
        <action application="answer"/>
        <action application="set" data="STREAM_PLAYBACK=true"/>
        <action application="set" data="STREAM_SAMPLE_RATE=8000"/>
        <action application="set" data="STREAM_BUFFER_SIZE=20"/>
        <action application="sleep" data="500"/>
        <action application="uuid_audio_stream" 
                data="${uuid} start ws://your-server:8086/audio-stream mono 8k"/>
    </condition>
</extension>
```

### Hoặc từ CLI FreeSWITCH

```bash
uuid_audio_stream <uuid> start ws://127.0.0.1:8086/audio-stream mono 8k
```

### Tham số

| Parameter | Mô tả |
|---|---|
| `mono` | Chỉ stream audio của caller (không mix) |
| `8k` | Sample rate 8kHz |
| `STREAM_PLAYBACK=true` | Tự động phát audio server trả về |
| `STREAM_SAMPLE_RATE=8000` | Sample rate cho inbound playback |

### Dừng streaming

```bash
uuid_audio_stream <uuid> stop
```

## Kiến Trúc

```
FreeSWITCH (mod_audio_stream)
    │
    │ WebSocket (raw L16 PCM @ 8kHz, mono)
    ▼
FastAPI Server (port 8086)
    │
    ├── /audio-stream  →  Pipeline: L16 Serializer → Whisper STT
    │                                             → Ollama LLM
    │                                             → Piper TTS (resample 8kHz)
    │                                             → L16 Serializer
    │
    └── /              →  Web test UI (client/index.html)
```

## Cấu Trúc Files

```
freeswitch_agent/
├── pyproject.toml          # Dependencies
├── .env.example            # Biến môi trường
├── README.md               # Hướng dẫn (file này)
├── bot_fs.py               # FastAPI server + WebSocket + pipeline
├── l16_serializer.py       # L16 PCM serializer (raw PCM ↔ Pipecat frames)
└── client/
    └── index.html          # Web test UI
```

## So Sánh Với `vi_assistant`

| Tính năng | vi_assistant | freeswitch_agent |
|---|---|---|
| **Transport** | WebRTC (Daily.co) | WebSocket (raw PCM) |
| **Client** | Browser (Daily Prebuilt) | FreeSWITCH / Web test UI |
| **STT** | Whisper medium (vi) | Whisper medium (vi) |
| **LLM** | Ollama llama3.2 | Ollama llama3.2 |
| **TTS** | Piper vi_VN | Piper vi_VN @ 8kHz |
| **Audio format** | Opus over WebRTC | L16 PCM over WebSocket |
| **Multi-call** | Không (single room) | Có (multiple connections) |
| **API Key** | Daily.co required | Không cần |

## Environment Variables

| Biến | Mặc định | Mô tả |
|---|---|---|
| `HOST` | `0.0.0.0` | Host để bind server |
| `PORT` | `8086` | Port WebSocket server |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2:latest` | Ollama model name |
| `WHISPER_DEVICE` | `cpu` | Thiết bị cho Whisper (`cpu`/`cuda`) |
| `IDLE_TIMEOUT_SECS` | `300` | Thời gian timeout (giây) |
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warning`) |

## Xử Lý Sự Cố

| Vấn đề | Kiểm tra |
|---|---|
| Bot không khởi động | `pip install` đã đủ? `ollama serve` đã chạy chưa? |
| WebSocket không connect | Port 8086 đã được mở? Có firewall không? |
| Whisper không hoạt động | Model `medium` đã được tải? Đủ RAM (~1.5GB)? |
| Ollama không phản hồi | `ollama serve` đang chạy? `ollama pull llama3.2`? |
| Piper không tìm thấy voice | File `.onnx` có trong thư mục voices/ không? |
| FreeSWITCH không kết nối | `mod_audio_stream` đã load? URL ws:// đúng? |
| Audio không nghe được | `STREAM_PLAYBACK=true` đã set? Sample rate match? |
