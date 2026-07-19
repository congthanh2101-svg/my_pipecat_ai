# Tích hợp OmniVoice TTS vào FreeSWITCH Agent

**Ngày:** 2026-07-19
**Trạng thái:** ✅ Đã triển khai thành công
**Mục tiêu:** Thay thế Piper TTS bằng OmniVoice (k2-fsa) để nâng cao chất lượng giọng đọc tiếng Việt, sử dụng voice cloning từ reference audio.

---

## 1. Kiến trúc

### Tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Pipeline (Pipecat AI)                       │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  VAD +   │ Whisper  │   LLM    │ Markdown │  Pronun  │              │
│  STT     │ (large)  │(Ollama / │ Stripper │ Norm     │   TTS Engine │
│          │          │ Deepseek)│          │(optional)│              │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────┬───────┘
                                                               │
                                  ┌────────────────────────────┼──────────┐
                                  │         TTS_ENGINE         │          │
                                  │  piper ────────────────────┤ piper    │
                                  │  omnivoice ────────────────┤ OmniVoice│
                                  └────────────────────────────┴──────────┘
                                                               │
                                                  ┌────────────▼──────────┐
                                                  │   TTSAudioProcessor   │
                                                  │  (resample → 8kHz)   │
                                                  └────────────┬──────────┘
                                                               │
                                                  ┌────────────▼──────────┐
                                                  │   FreeSWITCH / Client │
                                                  └───────────────────────┘
```

### Luồng xử lý chi tiết

#### Piper (streaming)
```
LLMTextFrame ──→ PiperTTSService ──→ TTSAudioRawFrame (22050Hz) ──→ TTSAudioProc ──→ 8kHz
     │                │                      │
     │          (sinh từng                     (streaming, latency thấp)
     │           token/ phoneme)
  Text xử lý     ~200ms đầu câu
```

#### OmniVoice (batch)
```
LLMFullResponseStartFrame ──→ OmniVoiceTTSService ──→ nhận TextFrame(s)
     │                               │
     │                        ┌──────▼──────┐
     │                        │  Accumulate  │
     │                        │  text buffer │
     │                        └──────┬──────┘
     │                               │
LLMFullResponseEndFrame ────────────┤
     │                               │
     │                        ┌──────▼──────────────┐
     │                        │  model.generate()   │
     │                        │  (ThreadPoolExec)   │
     │                        │  ~0.3-1.0s          │
     │                        └──────┬──────────────┘
     │                               │
     │                     TTSStartedFrame
     │                     TTSAudioRawFrame (24kHz chunks)
     │                     TTSStoppedFrame
     │                               │
     │                        ┌──────▼──────┐
     │                        │TTSAudioProc  │
     │                        │(24kHz→8kHz)  │
     │                        └──────┬──────┘
     │                               │
     │                         Audio → FS
```

---

## 2. File cấu phần

| File | Chức năng |
|------|-----------|
| `omnivoice_tts.py` | `OmniVoiceTTSService` — FrameProcessor custom thay thế PiperTTSService |
| `voice_profile_nu_mien_bac_1.pt` | Voice clone prompt (giọng nữ miền Bắc) — sinh từ ref audio |
| `plans/add-omnivoice-tts.md` | Tài liệu kiến trúc và hướng dẫn |

### File sửa đổi

| File | Thay đổi |
|------|----------|
| `bot_fs.py` | Thêm import `OmniVoiceTTSService`, config `TTS_ENGINE` và `OMNIVOICE_*`, sửa `create_services()` |

---

## 3. Biến môi trường

| Biến | Mặc định | Mô tả |
|------|:--------:|-------|
| `TTS_ENGINE` | `piper` | `piper` (mặc định) hoặc `omnivoice` |
| `OMNIVOICE_VOICE_PROFILE` | `<app_dir>/voice_profile_nu_mien_bac_1.pt` | Path đến voice prompt `.pt` |
| `OMNIVOICE_MODEL` | `k2-fsa/OmniVoice` | HuggingFace model name |
| `OMNIVOICE_NUM_STEP` | `32` | Số diffusion steps (`16` = nhanh, `32` = chất lượng cao) |
| `OMNIVOICE_CHUNK_DURATION_S` | `0.25` | Kích thước chunk TTS audio (giây) — chunk nhỏ hơn = realtime hơn |

---

## 4. Hướng dẫn sử dụng

### Chạy với OmniVoice

```bash
cd /opt/my_pipecat_ai/freeswitch_agent

# Sử dụng OmniVoice
TTS_ENGINE=omnivoice python bot_fs.py

# Tuỳ chỉnh số diffusion steps (16 = nhanh hơn, chất lượng thấp hơn 1 chút)
TTS_ENGINE=omnivoice OMNIVOICE_NUM_STEP=16 python bot_fs.py

# Dùng lại Piper (mặc định)
python bot_fs.py
```

### Kiểm tra log khi chạy

Khi khởi động thành công, log sẽ hiển thị:
```
🔊 TTS: OmniVoice (k2-fsa/OmniVoice)
🔊 Voice profile: /opt/.../voice_profile_nu_mien_bac_1.pt
```

Khi có cuộc gọi, model được load lazy (lần đầu tiên có LLM response):
```
Loading OmniVoice model ...
OmniVoice model loaded. Sampling rate: 24000Hz
Loading voice prompt ...
```

Mỗi lần bot trả lời:
```
OmniVoice: LLM response started
OmniVoice: buffered [32c]
OmniVoice: LLM response ended, text=[...]
OmniVoice generating TTS [42c]: ...
OmniVoice generated 51600samples (2.15s)
```

### Tạo voice profile mới

```python
from omnivoice import OmniVoice, VoiceClonePrompt

model = OmniVoice.from_pretrained(
    "k2-fsa/OmniVoice",
    device_map="cuda:0",
    dtype="float16",
)

prompt = model.create_voice_clone_prompt(
    ref_audio="path/to/ref_audio.wav",
    ref_text="Transcript của reference audio.",
)

prompt.save("my_voice_prompt.pt")
```

### File `.pt` — độc lập, có thể xoá bản gốc

File `.pt` là **self-contained** — chứa sẵn audio tokens đã encode, không phụ thuộc vào file gốc:

| Trong `.pt` | Mô tả |
|-------------|-------|
| `ref_audio_tokens` | Tensor (8, 47) — audio tokens đã encode sẵn từ model HiggsAudioV2 |
| `ref_text` | Text của reference (dùng để căn chỉnh) |
| `ref_rms` | Volume gốc (dùng để chuẩn hoá âm lượng) |

→ **Sau khi tạo xong `.pt`, có thể xoá `ref.wav` và `ref.wav.txt` mà không ảnh hưởng gì.**

---

## 5. Chi tiết kỹ thuật

### OmniVoiceTTSService

- **Kế thừa:** `FrameProcessor` (không phải `TTSService` — vì OmniVoice là batch, không streaming)
- **Input:** `LLMFullResponseStartFrame` / `TextFrame` / `LLMTextFrame` / `LLMFullResponseEndFrame`
- **Output:** `TTSStartedFrame` → `TTSAudioRawFrame` chunks (24kHz) → `TTSStoppedFrame`
- **Model loading:** Lazy (lần đầu tiên nhận frame có text), chạy trong `ThreadPoolExecutor`
- **Generation:** Chạy trong `ThreadPoolExecutor` để không block event loop
- **Interruption:** Khi nhận `InterruptionFrame`, clear buffer và bỏ qua generation
- **Compatibility:** Xử lý cả `TextFrame` (khi PronNormalizer bật, nó convert `LLMTextFrame` → `TextFrame`) và `LLMTextFrame` (khi PronNormalizer tắt)

### Voice Profile

| Thông số | Giá trị |
|----------|---------|
| Reference audio | ~3.0s, 90540 bytes |
| Giọng | Nữ miền Bắc |
| Text | "Cả hai bên hãy cố gắng hiểu cho nhau." |
| RMS | 0.154 |
| Audio tokens | (8, 47) — 8 codebooks × 47 frames |
| Sample rate | 24000 Hz |

### Các class trong omnivoice_tts.py

```
OmniVoiceTTSService(FrameProcessor)
├── __init__()              — Khởi tạo, nhận config + voice prompt path
├── _load_resources()       — Load model + prompt (blocking, gọi từ executor)
├── process_frame()         — Xử lý frame: buffer text / trigger generation / interruption
├── _generate_and_push_audio()  — Gọi model.generate() và push TTSAudioRawFrame chunks
│
│ Constants:
├── CHUNK_DURATION_S = 0.25 — Kích thước chunk TTS audio
│
│ State:
├── _model                  — OmniVoice model instance (lazy)
├── _voice_prompt           — VoiceClonePrompt instance (lazy)
├── _text_buffer[]          — Accumulated text từ LLM
├── _is_responding          — Đang trong response (giữa Start/End Frame)
└── _interrupted            — User interruption flag
```

### Xử lý frame flow

```
Frame đến → super().process_frame() → lazy load (nếu model chưa có)
  → LLMFullResponseStartFrame?  → reset buffer, set _is_responding = True
  → TextFrame/LLMTextFrame?     → append text to buffer (nếu _is_responding)
  → LLMFullResponseEndFrame?    → generate audio from buffer → TTS frames
  → InterruptionFrame?          → set _interrupted = True, clear buffer
  → push frame downstream
```

---

## 6. Hiệu năng thực tế

**Thiết bị:** RTX 5060 Ti 16GB — CUDA 13.0 — Driver 580.167.08

| Khía cạnh | Piper | OmniVoice |
|-----------|:-----:|:---------:|
| Load model (lazy) | ~200ms | ~3-5s (download + cache lần đầu) |
| Gen câu 2.2s (lần đầu - warmup) | — | **1.07s** (RTF 0.50) |
| Gen câu 2.4s (lần sau) | ~0.3s | **0.30s** (RTF 0.126) |
| Gen câu 5s (câu dài) | ~0.8s | ~0.6-0.8s |
| Streaming đầu câu | ~0.1s | ~1s (batch, đợi full text + gen) |
| VRAM tiêu thụ thêm | ~50MB | ~6-8GB |
| Chất lượng giọng | Tốt (ONNX) | **Xuất sắc** (Diffusion LM) |

**Nhận xét:**
- OmniVoice có RTF 0.126 (sau warmup) = gần 8x real-time, rất nhanh
- Latency cảm nhận ~1s do phải đợi LLM output xong + gen audio batch
- Piper streaming bắt đầu nói sau ~0.1s, nhưng chất lượng kém hơn đáng kể

---

## 7. So sánh chi tiết

| Tiêu chí | Piper | OmniVoice |
|----------|:-----:|:---------:|
| **Chất lượng giọng** | Tốt (ONNX phổ thông) | **Xuất sắc** (Diffusion LM hiện đại) |
| **Tự nhiên** | Tốt (hơi robotic) | **Rất tự nhiên** (ngữ điệu, cảm xúc) |
| **Tiếng Việt** | Tốt (vi_VN-vais1000) | **Rất tốt** (8.482 giờ training data) |
| **Voice cloning** | ❌ Không hỗ trợ | ✅ Có sẵn (từ ref audio 3-10s) |
| **Đa ngôn ngữ** | ~100 voices riêng lẻ | 600+ languages (1 model) |
| **Streaming** | ✅ Token-by-token | ❌ Batch full câu (latency ~1s) |
| **Kích thước model** | ~150MB (ONNX) | ~6-8GB (transformers) |
| **Tài nguyên** | CPU hoặc GPU | GPU bắt buộc |
| **Fallback khi OOM** | — | Tắt OmniVoice, quay về Piper |

---

## 8. Các vấn đề đã gặp và cách fix

### Vấn đề 1: ModuleNotFoundError — whisper_stt.py

**Lỗi:** `from whisper_stt import DebugWhisperSTTService` — file không tồn tại.

**Nguyên nhân:** Class `DebugWhisperSTTService` được định nghĩa trong chính `bot_fs.py`, không cần import.

**Fix:** Xoá dòng import thừa.

### Vấn đề 2: Bot không nói — không có audio

**Lỗi:** Không nghe thấy bot nói, log không có message nào từ OmniVoiceTTSService.

**Nguyên nhân:** `PronunciationNormalizer` chặn `LLMTextFrame` — nó buffer text và chỉ gửi ra một `TextFrame` duy nhất trước `LLMFullResponseEndFrame`. `OmniVoiceTTSService` chỉ xử lý `LLMTextFrame` nên không nhận được text → buffer rỗng → không sinh audio.

**Fix:** Thêm `TextFrame` vào handler của `OmniVoiceTTSService` — xử lý cả hai loại frame.

### Vấn đề 3: CUDA library not found

**Lỗi:** `libcudart.so.12` không tìm thấy khi cài torch bản cu128.

**Nguyên nhân:** Hệ thống có CUDA 13.2, torch bản cu128 cần libcudart.so.12.

**Fix:** Cài torch bản cu130: `uv pip install torch==2.13.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130`

---

## 9. Các bước tạo voice profile (tham khảo)

```bash
cd /opt/my_pipecat_ai/freeswitch_agent

# Kích hoạt môi trường
source .venv/bin/activate

# Chạy script tạo prompt
python3 << 'EOF'
from omnivoice import OmniVoice, VoiceClonePrompt

model = OmniVoice.from_pretrained(
    "k2-fsa/OmniVoice",
    device_map="cuda:0",
    dtype="float16",
)

prompt = model.create_voice_clone_prompt(
    ref_audio="/path/to/voice.wav",
    ref_text="Transcript của audio.",
)

prompt.save("voice_profile.pt")
print("✅ Done")
EOF
```

---

## 10. Kiến trúc chi tiết của OmniVoice

### Model Architecture

OmniVoice sử dụng **Diffusion Language Model**:
- LLM backbone (từ Qwen3 hoặc tương đương) ~2-8B parameters
- 8 codebook audio tokenizer (HiggsAudioV2)
- Diffusion head sinh audio tokens qua iterative unmasking (32 steps)
- Output: raw waveform 24kHz

### Data Pipeline

```
Text → Text Tokenizer (transformers) → LLM Embeddings
                                             │
Reference Audio → HiggsAudioV2 → Audio Tokens ──→ Embedding + Position IDs
                                                    │
                                              LLM Forward (flex_attention)
                                                    │
                                              Audio Head → [8×1025] logits
                                                    │
                                              Diffusion Decoding (32 steps)
                                                    │
                                              HiggsAudioV2 Decode → 24kHz PCM
```

### So sánh Whisper

OmniVoice bao gồm Whisper (`openai/whisper-large-v3-turbo`) nhưng **chỉ dùng để auto-transcribe** reference audio khi tạo voice clone prompt. Không liên quan đến pipeline STT real-time. Whisper STT hiện tại (`faster-whisper-large-v3`) giữ nguyên.

---
