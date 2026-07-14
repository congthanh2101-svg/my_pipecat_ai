# Kế hoạch & Ghi chú xây dựng FreeSWITCH Voice Agent

## Kiến trúc cuối cùng

```
FreeSWITCH (mod_audio_stream)          Browser (Pipecat Client SDK)
         |                                        |
         | L16 PCM raw @ 8kHz                     | RTVI Protobuf @ 8kHz input / 24kHz output
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI Server (port 8086)                      │
│                                                                      │
│  /audio-stream ← L16 FrameSerializer → Pipeline → response           │
│  /rtvi-ws       ← RTVICompatibleSerializer → Pipeline → response    │
│  /connect       ← REST → {wsUrl} cho RTVI client                    │
│  /              ← L16 Web UI (index.html)                            │
│  /pipecat-client ← RTVI Web UI (pipecat-client.html)                │
│  /health        ← Health check                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Pipeline (cả RTVI và L16)

```
transport.input() → VADProcessor(Silero) → WhisperSTT(base, vi)
                                                ↓
              LLMUserAggregator ← user_aggregator
                                                ↓
              OLLamaLLMService (llama3.2)
                                                ↓
              PiperTTSService (vi_VN)
                                                ↓
              transport.output() → LLMAssistantAggregator
```

## Các thông số đã fix

### Server (bot_fs.py)

| Thông số | RTVI path | L16 path |
|---|---|---|
| **STT model** | BASE (GPU) | BASE (GPU) |
| **STT device** | cuda | cuda |
| **STT compute_type** | float16 | float16 |
| **no_speech_prob** | 0.6 | 0.6 |
| **audio_in_sample_rate** | 8000 | 8000 |
| **audio_out_sample_rate** | 24000 | 8000 |
| **Piper TTS sample_rate** | 24000 | 8000 |
| **VAD** | SileroVADAnalyzer | SileroVADAnalyzer |
| **VAD confidence** | 0.5 | 0.5 |
| **VAD min_volume** | 0.01 | 0.01 |
| **SpeechTimeout** | 0.6s | 0.6s |
| **wait_for_transcript** | false | false |
| **user_turn_stop_timeout** | 15s | 15s |

### Serializer (RTVICompatibleSerializer)

- **SERIALIZE**: chỉ `OutputAudioRawFrame` + `MessageFrame`
- **DESERIALIZE**: Float32 PCM từ client → Int16 PCM (NaN cleanup)
- NaN/INF → 0.0 (client SDK gửi Float32 bị lỗi)
- `np.frombuffer(..., dtype=np.float32).copy()` — tạo writable array

### RTVIObserverParams

```python
bot_output_enabled=False   # v1 client không hiểu "bot-output"
bot_tts_enabled=True       # v1 client hiểu "bot-tts-text"
bot_speaking_enabled=False # v1 client không hiểu "bot-interrupted"
user_llm_enabled=False     # v1 client không hiểu "user-llm-text"
metrics_enabled=False      # v1 client không hiểu metrics
```

## Các vấn đề đã gặp

### 1. Sample rate mismatch (nguyên nhân gây rè/méo)
- **Client SDK `PLAYER_SAMPLE_RATE = 24000`** — nhưng server gửi audio ở 16000Hz hoặc 22050Hz
- **Fix**: Piper TTS output 24000Hz + `audio_out_sample_rate=24000`
- **Kết quả**: âm thanh rõ ràng, không rè

### 2. Float32 audio từ client SDK bị lỗi
- Client SDK dùng `e.buffer` → lấy cả vùng nhớ rác (NaN, INF, 1e20)
- **Fix**: `np.nan_to_num()` trong `RTVICompatibleSerializer.deserialize()`
- **Fix2**: `np.frombuffer(...).copy()` — tránh read-only array

### 3. Silero VAD không hoạt động ở 8000Hz
- Ban đầu tưởng VAD không detect speech do sample rate
- **Thực tế**: Silero VAD hỗ trợ 8000Hz, nhưng confidence rất thấp với audio chất lượng thấp
- **Fix**: Giảm `min_volume=0.01`

### 4. Turn không kết thúc vì thiếu transcript
- `SpeechTimeoutUserTurnStopStrategy` mặc định `wait_for_transcript=True`
- Whisper không transcribe được audio 8000Hz từ client → không có text → turn không bao giờ trigger
- **Fix**: `wait_for_transcript=False`

### 5. `WorkerParams` thiếu `task_manager`
- **Lỗi**: `WorkerParams()` thiếu required arg `task_manager`
- **Fix**: `WorkerParams(task_manager=TaskManager())`

### 6. `bot-interrupted` client warning
- Server gửi `BotInterruptedMessage` (RTVI v2) → v1 client không hiểu
- **Fix**: `bot_speaking_enabled=False`

## Kiến trúc file

```
freeswitch_agent/
├── bot_fs.py              # Server chính (FastAPI + pipeline)
├── l16_serializer.py      # L16 PCM serializer (FreeSWITCH)
├── client/
│   ├── index.html          # L16 Web UI
│   ├── pipecat-client.html # RTVI Web UI (Pipecat Client SDK)
│   └── assets/
│       └── pipecat-sdk.js  # Pipecat Client JS SDK v1.4.0
├── PLAN.md                 # File này
├── README.md               # Hướng dẫn chạy
├── .env                    # Biến môi trường
└── pyproject.toml          # Dependencies
```

## Run

```bash
cd /opt/my_pipecat_ai/freeswitch_agent
source venv/bin/activate
python bot_fs.py
```

Server khởi động tại **http://localhost:8086**
- RTVI UI: http://localhost:8086/pipecat-client
- L16 UI: http://localhost:8086/
- Health: http://localhost:8086/health
