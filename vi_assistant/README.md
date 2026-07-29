# Trợ Lý Giọng Nói Tiếng Việt - Pipecat AI

Voice AI agent real-time hoàn toàn bằng tiếng Việt, sử dụng:

| Thành phần | Công nghệ |
|---|---|
| **STT** | Whisper (medium) — faster-whisper |
| **LLM** | Ollama — llama3.2:latest |
| **TTS** | Piper — vi_VN-vais1000-medium |
| **Transport** | WebRTC — Daily.co |

## Yêu Cầu

- Python >= 3.11
- [Ollama](https://ollama.com/) đã cài và chạy
- Piper voice model tiếng Việt (đã có sẵn)
- Daily API Key ([đăng ký miễn phí](https://dashboard.daily.co/))

## Cài Đặt

### 1. Cài Pipecat AI

```bash
cd /opt/my_pipecat_ai/pipecat
pip install -e ".[daily,whisper,piper]"
```

Hoặc cài từ PyPI:

```bash
pip install "pipecat-ai[daily,whisper,piper]"
pip install -e ".[daily,whisper,piper,websocket]"
```

### 2. Cấu hình Ollama

```bash
# Khởi động Ollama server
ollama serve

# Pull model llama3.2
ollama pull llama3.2:latest
```

### 3. Cấu hình Daily

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Sửa file `.env` với API key từ https://dashboard.daily.co/

### 4. Kiểm tra Piper voice

```bash
ls -la /opt/ollama-playground/local-voice-agent/voices/vi_VN-vais1000-medium*
```

Nếu chưa có, tải từ Hugging Face.

## Chạy Bot

```bash
cd /opt/my_pipecat_ai/vi_assistant

Enabne Python venv: source venv/bin/activate

# Chạy với Daily transport
python bot_vi.py -t daily
# Chạy với SmallWebRTC, webrtc
python bot_vi.py
```

Mở trình duyệt tại **http://localhost:7860** và cho phép truy cập microphone.

## Kiến Trúc

```
                           ┌──────────────────────────┐
                           │  Pipecat Bot Server       │
                           │  (port 7860)              │
                           │                           │
  ┌─────────┐  WebRTC      │  ┌─────────────────────┐  │
  │ Browser │◄────────────►│  │     Pipeline        │  │
  │ (Daily  │              │  │                     │  │
  │ Prebuilt│              │  │ Input → STT → LLM → │  │
  │   UI)   │              │  │         TTS → Output │  │
  └─────────┘              │  └─────────────────────┘  │
                           └──────────────────────────┘
```

## Tuỳ Chỉnh

- **Model Whisper**: Sửa `device` trong `bot_vi.py` (cpu/cuda)
- **Model Ollama**: Đổi biến môi trường `OLLAMA_MODEL`
- **System prompt**: Sửa hằng số `SYSTEM_PROMPT` trong `bot_vi.py`
- **Thời gian chờ**: Tham số `idle_timeout_secs` trong `PipelineWorker`

## Xử Lý Sự Cố

| Vấn đề | Kiểm tra |
|---|---|
| Bot không khởi động | DAILY_API_KEY đã đúng chưa? |
| Không nghe được âm thanh | Microphone đã được cấp quyền? |
| Ollama không phản hồi | `ollama serve` đã chạy chưa? |
| Piper không tìm thấy voice | File .onnx có trong thư mục voices/ không? |
| Whisper chậm | Dùng `WHISPER_DEVICE=cuda` nếu có GPU |
