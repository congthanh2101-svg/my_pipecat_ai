# Kế hoạch: Thêm Option sử dụng Deepseek LLM

**Ngày:** 2026-07-18
**Mục tiêu:** Cho phép chuyển đổi linh hoạt giữa Ollama (local) và Deepseek API (cloud) qua biến môi trường.

## Kiến trúc

- Giữ nguyên `OLLamaLLMService` làm mặc định (`LLM_PROVIDER=ollama`)
- Thêm `OpenAILLMService` cho Deepseek (`LLM_PROVIDER=deepseek`)
- Chuyển đổi hoàn toàn qua biến môi trường, không cần sửa code

## Biến môi trường mới

| Biến | Mặc định | Mô tả |
|------|:--------:|-------|
| `LLM_PROVIDER` | `ollama` | `ollama` (local) hoặc `deepseek` |
| `DEEPSEEK_API_KEY` | — | API key từ Deepseek |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | Endpoint API |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | Model name |
| `DEEPSEEK_TEMPERATURE` | `0.3` | Nhiệt độ sinh (0.0-1.0) |
| `DEEPSEEK_MAX_TOKENS` | `64` | Số token tối đa |

## Cách dùng

```bash
# Mặc định: Ollama local
python bot_fs.py

# Deepseek
DEEPSEEK_API_KEY=sk-xxxx LLM_PROVIDER=deepseek python bot_fs.py
```

## Thay đổi trong code

### 1. Import mới
Thêm `OpenAILLMService` từ `pipecat.services.openai.llm`

### 2. Config mới
Thêm biến môi trường cho LLM provider + Deepseek

### 3. Sửa `create_services()`
- `LLM_PROVIDER=ollama` → dùng `OLLamaLLMService` (giống hiện tại)
- `LLM_PROVIDER=deepseek` → dùng `OpenAILLMService` với Deepseek config

## So sánh

| Khía cạnh | Ollama (local) | Deepseek (API) |
|-----------|:--------------:|:--------------:|
| Model | llama3.2:latest (8B) | deepseek-v4-flash (236B) |
| Tốc độ | Phụ thuộc GPU local | API cloud |
| Chi phí | Miễn phí (điện + GPU) | Trả tiền theo token |
| Latency | ~300ms | ~200-500ms + network |
| Yêu cầu | Ollama server chạy local | Internet + API key |
