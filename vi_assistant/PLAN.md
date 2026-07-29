# Kế Hoạch Xây Dựng Ứng Dụng Pipecat AI - Trợ Lý Giọng Nói Tiếng Việt

## 🎯 Mục Tiêu

Xây dựng một voice AI agent real-time hoàn chỉnh sử dụng Pipecat AI framework với các thành phần chạy local:

| Thành phần | Công nghệ | Model |
|---|---|---|
| **STT** (Speech-to-Text) | Whisper (faster-whisper) | `medium` (đa ngôn ngữ) |
| **LLM** (Large Language Model) | Ollama | `llama3.2:latest` |
| **TTS** (Text-to-Speech) | Piper | `vi_VN-vais1000-medium` (tiếng Việt) |
| **Transport** | WebRTC (Daily) | - |

## 🏗 Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                      Pipecat Bot Server                          │
│   (FastAPI server on port 7860 + Pipecat Runner)                 │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Pipeline                              │   │
│   │                                                         │   │
│   │  DailyInput  →  WhisperSTT  →  UserAggregator          │   │
│   │       ↑                                      ↓          │   │
│   │  DailyOutput ←  PiperTTS    ←  OllamaLLM   ←           │   │
│   │       ↑                        AssistantAggregator      │   │
│   └───────┼─────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ WebRTC (Daily.co)                                    │
└───────────┼──────────────────────────────────────────────────────┘
            │
┌───────────┴──────────────────┐
│      Daily Room              │
│  (WebRTC bridge/server)      │
└───────────┬──────────────────┘
            │
┌───────────┴──────────────────┐
│    Client (Web Browser)      │
│  - Daily Prebuilt UI         │
│    http://localhost:7860      │
│  - Hoặc custom HTML/JS       │
└──────────────────────────────┘
```

## 📁 Cấu Trúc Thư Mục Dự Án

```
/opt/my_pipecat_ai/vi_assistant/
├── PLAN.md                   # Kế hoạch dự án (file này)
├── bot_vi.py                 # Bot chính (pipeline xử lý)
├── pyproject.toml             # Dependencies
├── .env.example               # Mẫu biến môi trường
└── README.md                  # Hướng dẫn cài đặt & chạy
```

## 🔄 Flow Xử Lý Chi Tiết

### 1. Khởi động
- `python bot_vi.py -t daily` → FastAPI server khởi động
- Runner tạo Daily room + token
- Browser mở `http://localhost:7860`

### 2. User nói
```
Micro → Daily WebRTC → DailyInput (16kHz PCM audio)
                      → AudioRawFrame → WhisperSTTService
```

### 3. STT (Whisper medium)
```
Audio bytes → faster-whisper transcribe(language="vi")
            → "Tôi muốn hỏi về thời tiết"
            → TranscriptionFrame(text="Tôi muốn hỏi về thời tiết")
```

### 4. LLM (Ollama + llama3.2)
```
TranscriptionFrame → UserAggregator (thêm vào LLMContext)
                  → LLMRunFrame → OLLamaLLMService
                  → Ollama API (http://localhost:11434/v1)
                  → "Hôm nay trời đẹp, bạn có thể ra ngoài dạo chơi."
                  → TextFrame
```

### 5. TTS (Piper tiếng Việt)
```
TextFrame → PiperTTSService
          → PiperVoice.synthesize("Hôm nay trời đẹp...")
          → AudioRawFrame (16-bit PCM)
```

### 6. Output
```
AudioRawFrame → DailyOutput → Daily WebRTC
             → User nghe response qua loa
```

### 7. AssistantAggregator
Thu thập response của bot vào `LLMContext` để duy trì hội thoại.

## 🛠 Các Bước Cài Đặt Chi Tiết

### Bước 1: Cài Pipecat AI + Dependencies

```bash
# Di chuyển vào thư mục pipecat source
cd /opt/my_pipecat_ai/pipecat

# Cài đặt pipecat với các extras cần thiết
pip install -e ".[daily,whisper,piper]"

# Hoặc nếu dùng pip install trực tiếp:
# pip install "pipecat-ai[daily,whisper,piper]"
```

### Bước 2: Kiểm tra các dependencies khác

```bash
# Kiểm tra Ollama
ollama serve
ollama pull llama3.2:latest

# Kiểm tra Piper voice (đã có sẵn)
ls -la /opt/ollama-playground/local-voice-agent/voices/vi_VN-vais1000-medium*

# Kiểm tra daily-python
pip show daily-python || pip install daily-python
```

### Bước 3: Cấu hình Daily API

1. Đăng ký tài khoản Daily: https://dashboard.daily.co/
2. Lấy API Key từ dashboard
3. Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
# Sửa DAILY_API_KEY=your-key-here
```

### Bước 4: Chạy Bot

```bash
cd /opt/my_pipecat_ai/vi_assistant
python bot_vi.py -t daily
```

### Bước 5: Kết nối

- Mở trình duyệt: `http://localhost:7860`
- Cho phép truy cập microphone
- Bắt đầu nói chuyện với trợ lý

## 🧩 Bot Script (`bot_vi.py`) — Chi Tiết

### Import & Services

```python
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.transports.daily.transport import DailyTransport, DailyParams
```

### Pipeline Assembly

```
Pipeline([
    transport.input(),     # Daily microphone input
    stt,                   # Whisper STT (medium, vi)
    user_aggregator,       # Thu thập user context
    llm,                   # Ollama LLM
    tts,                   # Piper TTS (tiếng Việt)
    transport.output(),    # Daily speaker output
    assistant_aggregator,  # Thu thập bot context
])
```

### RTVI Events

- `on_client_ready`: Gửi tin nhắn chào đầu tiên
- `on_client_disconnected`: Dừng bot khi client ngắt kết nối

## ⚠️ Các Vấn Đề & Giải Pháp

| Vấn đề | Giải pháp |
|---|---|
| **DAILY_API_KEY** chưa có | Đăng ký Daily.co (miễn phí) |
| **daily-python** chưa cài | `pip install daily-python` |
| **Piper voice config path** | `PiperVoice.load()` dùng `f"{model}.json"` → file `.onnx.json` khớp ✓ |
| **Whisper medium ~1.5GB RAM** | Dùng `device="cpu"` hoặc `"cuda"` nếu có GPU |
| **Ollama API endpoint** | Mặc định `http://localhost:11434/v1` |
| **Ollama system prompt** | `supports_developer_role = False` → dùng `system_instruction` |
| **Piper voice file local** | `download_dir` trỏ tới thư mục chứa voice |
| **Vietnamese language** | Whisper hỗ trợ `Language.VI` |
| **Dừng bot sau 5 phút im lặng** | `idle_timeout_secs` trong PipelineParams |
| **RTVI protocol** | Cần `@worker.rtvi.event_handler` |
| **WorkerRunner thay cho PipelineRunner** | Dùng `WorkerRunner` (API mới từ Pipecat 1.3+) |

## 📚 Tài Liệu Tham Khảo

- Pipecat AI: https://docs.pipecat.ai/
- Daily: https://docs.daily.co/
- Piper TTS: https://github.com/rhasspy/piper
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- Ollama: https://ollama.com/
