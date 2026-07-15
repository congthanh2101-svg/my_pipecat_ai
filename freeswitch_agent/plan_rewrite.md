# Kế hoạch Rewrite `bot_fs.py` theo Pipecat Websocket Example

## Vấn đề hiện tại

- **STT không hoạt động**: Dù đã fix `audio_in_passthrough=True`, user báo STT vẫn không chạy
- **EnergyVADAnalyzer custom**: Dùng RMS threshold thay vì Silero VAD chuẩn của Pipecat
- **Pipeline pattern không chuẩn**: Dùng `PipelineWorker` trực tiếp thay vì `WorkerRunner`
- **Lifecycle phức tạp**: `TaskManager` thủ công, thiếu proper shutdown

## Giải pháp

Áp dụng pattern từ `/opt/my_pipecat_ai/pipecat-examples/websocket/bot.py`:

```
transport_params → FastAPIWebsocketTransport → Pipeline
    → SileroVADAnalyzer (chuẩn)
    → LLMContextAggregatorPair
    → PipelineWorker + WorkerRunner
    → worker.rtvi.event_handler("on_client_ready") cho greeting
```

## Thay đổi cụ thể

### 1. VAD: EnergyVADAnalyzer → SileroVADAnalyzer
- Không cần RMS threshold tuning
- Hoạt động ở 8000Hz (cần kiểm tra)
- Tích hợp sẵn với `LLMUserAggregatorParams`

### 2. Pipeline: TaskManager → WorkerRunner
- `WorkerRunner` quản lý lifecycle chuẩn (signal handling, cleanup)
- `await runner.run()` thay vì `await worker.run()`

### 3. Greeting: event_handler → worker.rtvi
- `@worker.rtvi.event_handler("on_client_ready")` thay vì `@transport.event_handler`
- `context.add_message` + `LLMRunFrame()` giữ nguyên

### 4. Giữ nguyên
- FastAPI app + HTTP endpoints ("/", "/chat", "/health", ...)
- L16 serializer + RTVI compatible serializer
- WhisperSTTService (medium, auto-language)
- OLLamaLLMService (llama3.2)
- PiperTTSService (vi_VN)
- Chat queue + poller pattern

### 5. Kiểm tra SileroVAD 8000Hz
- SileroVADAnalyzer mặc định 16000Hz
- WebSocket transport ở 8000Hz
- Cần test: pass `sample_rate=8000` hoặc để auto-detect
