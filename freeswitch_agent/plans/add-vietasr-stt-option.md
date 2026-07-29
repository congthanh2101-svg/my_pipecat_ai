# STT Providers & Thinking Delay cho FS Bot
## Tài Liệu Kiến Trúc, Triển Khai & Hướng Dẫn Sử Dụng

> **Cập nhật:** 2026-07-29  
> **Phiên bản code:** bot_fs.py + gipformer_stt.py + vietasr_stt.py  
> **Tác giả:** Claude Code

---

## 1. Mục Tiêu

1. Thêm tuỳ chọn STT provider: có thể chọn **Whisper**, **VietASR**, hoặc **Gipformer** thông qua `STT_PROVIDER`
2. Thêm khoảng dừng tự nhiên trước khi bot trả lời (**ThinkingDelayProcessor**)
3. Tăng VAD stop_secs để khách hàng có thời gian nói nhiều hơn

```
STT_PROVIDER=whisper     # (mặc định) dùng Whisper large-v3
STT_PROVIDER=vietasr     # dùng VietASR Zipformer
STT_PROVIDER=gipformer   # dùng Gipformer-65M-RNNT
```

---

## 2. Kiến Trúc Tổng Thể

### 2.1. Factory Pattern (trong `create_services()`)

```python
if STT_PROVIDER == "vietasr":
    stt = VietASRSTTService(...)
elif STT_PROVIDER == "gipformer":
    stt = GipformerSTTService(...)
else:
    stt = DebugWhisperSTTService(...)
```

### 2.2. Pipeline Hoàn Chỉnh

```
Input → VAD → STT → HallucinationFilter → user_agg → (RAG) → LLM
  → MarkdownStripper → PronNorm (optional)
  → ThinkingDelayProcessor (800ms)         ← THÊM MỚI
  → TTS → TTSAudioProcessor → Output → assistant_agg
```

### 2.3. So Sánh Các Provider STT

| Tiêu chí | Whisper (large-v3) | VietASR (Zipformer) | Gipformer-65M-RNNT |
|----------|-------------------|---------------------|---------------------|
| **Tham số** | ~3B | ~50M | 65M |
| **Framework** | faster-whisper | sherpa-onnx | sherpa-onnx |
| **API** | `WhisperSTTService` | `OfflineRecognizer.from_transducer()` | `OfflineRecognizer.from_transducer()` |
| **Sample rate** | 8kHz → 16kHz nội bộ | 16kHz (resample) | 16kHz (resample) |
| **Feature dim** | 80 (Mel) | 80 (FBank) | 80 (FBank) |
| **GPU** | ✅ CUDA | ✅ CUDA | ✅ CUDA |
| **INT8 quantized** | ❌ | ❌ | ✅ (70MB) |
| **License** | MIT | ❓ Không rõ | MIT |
| **Auto-download** | ❌ | ❌ | ✅ HuggingFace |
| **Kích thước** | ~3GB | ~270MB | ~270MB / ~73MB (INT8) |

Cả 3 provider dùng chung VAD (SileroVADAnalyzer) và HallucinationFilter.

### 2.4. Benchmark Gipformer

| Benchmark | Gipformer | Next-best |
|-----------|-----------|-----------|
| tele-medium (call-center) | **15.53% WER** | 19.95% |
| tele-difficult-north | **25.10% WER** | 31.78% |
| vivos | **4.12% WER** | 6.99% |
| VietMed | **17.87% WER** | 22.93% |

---

## 3. File Mới: `gipformer_stt.py` (180 dòng)

### 3.1. Class: `GipformerSTTService`

Kế thừa `SegmentedSTTService` (giống VietASR), sử dụng sherpa-onnx `OfflineRecognizer.from_transducer()`.

**Constructor params:**
| Param | Default | Mô tả |
|-------|---------|-------|
| `model_dir` | `models/gipformer/` | Thư mục chứa model files |
| `provider` | `cuda` | `"cpu"` hoặc `"cuda"` |
| `use_int8` | `False` | Dùng model INT8 quantized |
| `decoding_method` | `greedy_search` | Hoặc `modified_beam_search` |

**Audio flow:**
```
8kHz Int16 PCM (pipeline)
  → SegmentedSTTService accumulates trong _audio_buffer
  → VADUserStoppedSpeakingFrame trigger run_stt(accumulated_audio)
  → Resample 8kHz→16kHz (soxr VHQ)
  → Int16→Float32 [-1,1]
  → sherpa-onnx OfflineRecognizer → TranscriptionFrame(text, "vi")
```

**Xử lý text output:**
```python
# Cả VietASR và Gipformer đều output UPPERCASE (BPE tokens)
text = text.lower()
text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
```

### 3.2. File Discovery

Dùng `rglob(f"*encoder*")` phân biệt INT8 vs FP32 dựa trên `.int8.onnx` suffix.

### 3.3. HuggingFace Auto-Download

Nếu model chưa có trong `model_dir`, tự động tải từ `g-group-ai-lab/gipformer-65M-rnnt`:
```python
from huggingface_hub import snapshot_download
snapshot_download("g-group-ai-lab/gipformer-65M-rnnt", local_dir=model_dir)
```

### 3.4. Model Files

```
models/gipformer/
├── encoder-epoch-35-avg-6.onnx          # FP32 (249MB)
├── decoder-epoch-35-avg-6.onnx          # FP32 (5.0MB)
├── joiner-epoch-35-avg-6.onnx           # FP32 (4.0MB)
├── encoder-epoch-35-avg-6.int8.onnx     # INT8 (68MB)
├── decoder-epoch-35-avg-6.int8.onnx     # INT8 (1.3MB)
├── joiner-epoch-35-avg-6.int8.onnx      # INT8 (1.0MB)
├── tokens.txt                           # BPE vocabulary (26KB)
├── bpe.model                            # SentencePiece model (không dùng)
├── config.json                          # Config metadata (không dùng)
├── epoch-35-avg-6.pt                    # PyTorch checkpoint (267MB)
└── epoch-999.pt                         # PyTorch checkpoint (267MB)
```

---

## 4. File Sửa: `bot_fs.py`

| Dòng | Thay đổi |
|------|----------|
| 9 | Module docstring: thêm `Gipformer` |
| 87 | `from gipformer_stt import GipformerSTTService` |
| 238–242 | 3 env vars: `GIPFORMER_MODEL_DIR`, `GIPFORMER_USE_INT8`, `GIPFORMER_PROVIDER` |
| 1087–1094 | Nhánh `elif STT_PROVIDER == "gipformer"` trong factory |
| 1023–1052 | `ThinkingDelayProcessor` class (xem section 6) |
| 1223 | VAD `stop_secs=2` (Option 1) |
| 1262–1263 | `ThinkingDelayProcessor(800)` chèn vào pipeline |

### Env Vars Added

```python
GIPFORMER_MODEL_DIR  = os.getenv("GIPFORMER_MODEL_DIR", str(Path(__file__).parent / "models" / "gipformer"))
GIPFORMER_USE_INT8   = os.getenv("GIPFORMER_USE_INT8", "false").lower() == "true"
GIPFORMER_PROVIDER   = os.getenv("GIPFORMER_PROVIDER", "cuda")
```

---

## 5. Option 1: VAD stop_secs

**Mục đích:** Tăng khoảng lặng VAD chờ trước khi kết luận "user stopped speaking", cho khách hàng thời gian nói tiếp.

**Sửa tại `bot_fs.py` dòng 1223:**
```python
# Trước:
params=VADParams(confidence=0.85, min_volume=0.5)

# Sau:
params=VADParams(confidence=0.85, min_volume=0.5, stop_secs=2)
```
→ Khách có thể ngừng ~2 giây trước khi bot can thiệp.

---

## 6. Option 2: ThinkingDelayProcessor

### 6.1. Class (bot_fs.py dòng 1023–1052)

```python
class ThinkingDelayProcessor(FrameProcessor):
    """Chèn delay trước TTSStartedFrame đầu tiên để bot có cảm giác đang 'suy nghĩ'."""

    def __init__(self, delay_ms: float = 800):
        super().__init__()
        self._delay_s = delay_ms / 1000.0
        self._pending = True

    async def process_frame(self, frame, direction):
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, TTSStartedFrame):
                if self._pending:
                    logger.info(f"⏳ Thinking delay {self._delay_s*1000:.0f}ms...")
                    await asyncio.sleep(self._delay_s)
                    self._pending = False
            elif isinstance(frame, TTSStoppedFrame):
                self._pending = True
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)  # bắt buộc: forward frame
```

### 6.2. Vị trí trong pipeline (dòng 1262–1263)

```python
pipeline_steps.extend([
    ThinkingDelayProcessor(800),  # ⏳ khoảng dừng tự nhiên trước khi bot nói
    tts,
    ...
])
```

### 6.3. Bug Fix Log

| Lần | Code | Lỗi | Nguyên nhân |
|-----|------|-----|-------------|
| 1 | `self.push_frame(frame)` | `"StartFrame not received yet"` | Bỏ qua `super().process_frame()` → không set `__started` |
| 2 | `super().process_frame()` (thiếu push) | `"CancelFrame timeout"` sau 5s | StartFrame/CancelFrame bị nuốt, không push xuống TTS |
| 3 ✅ | `super().process_frame()` + `self.push_frame()` | **Hoạt động ổn định** | Đúng pattern: super xử lý state, push_frame forward tiếp |

**Root cause:** Trong Pipecat 1.5.0, `FrameProcessor.process_frame()` xử lý `StartFrame` (set `__started=True`) và `CancelFrame` (set `_cancelling=True`) nhưng **không tự động push frame xuống processor tiếp theo**. Pattern đúng là:

```python
async def process_frame(self, frame, direction):
    # Custom logic (delay, filter, ...)
    await super().process_frame(frame, direction)  # state management
    await self.push_frame(frame, direction)        # forward to next processor
```

---

## 7. Các File Không Cần Sửa

- `vietasr_stt.py` — giữ nguyên
- `bot_sdk.py` — không ảnh hưởng
- `l16_serializer.py` — không ảnh hưởng
- `.gitignore` — đã có `models/`

---

## 8. Dependencies

### Đã cài thêm

```bash
pip install huggingface_hub    # auto-download Gipformer model
```

### Dependencies hiện tại

| Package | Dùng cho |
|---------|----------|
| `sherpa-onnx` | VietASR + Gipformer inference |
| `soxr` | Resample 8kHz→16kHz |
| `numpy` | Audio buffer xử lý |
| `onnxruntime-gpu` | GPU execution provider |
| `soundfile` | Đọc WAV (transcribe endpoint) |
| `huggingface_hub` | Auto-download Gipformer model |

---

## 9. Hướng Dẫn Sử Dụng

### 9.1. Chạy các chế độ STT

```bash
# Whisper (mặc định)
python bot_fs.py

# VietASR
STT_PROVIDER=vietasr python bot_fs.py

# Gipformer FP32
STT_PROVIDER=gipformer python bot_fs.py

# Gipformer INT8 (nhanh hơn, model 70MB encoder)
STT_PROVIDER=gipformer GIPFORMER_USE_INT8=true python bot_fs.py

# Gipformer CPU (fallback nếu không có GPU)
STT_PROVIDER=gipformer GIPFORMER_PROVIDER=cpu python bot_fs.py
```

### 9.2. Tuỳ chỉnh thời gian

```python
# ThinkingDelayProcessor(delay_ms): 500ms → 0.5 giây, 1200ms → 1.2 giây
ThinkingDelayProcessor(500),

# VAD stop_secs: thời gian chờ sau khi khách ngừng nói
params=VADParams(confidence=0.85, min_volume=0.5, stop_secs=1.5)
```

### 9.3. Timing tổng thể

```
Khách ngừng nói → VAD stop_secs=2s → user stopped
  → STT decode (~50ms) → LLM generate (~200-500ms)
  → ThinkingDelay 800ms → TTS bắt đầu đọc
─────────────────────────────────────────────────
Tổng delay ~3s từ lúc khách ngừng nói → bot trả lời
```

---

## 10. Rủi Ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| Gipformer quality không tốt | Giữ song song 3 provider, so sánh A/B |
| INT8 quantized giảm accuracy | FP32 làm mặc định, INT8 là option |
| huggingface_hub network timeout | Cache model local, tự động fallback |
| Pipeline frame bị nuốt (processor bug) | Pattern: `super()` + `push_frame()` cùng nhau |
| Thinking delay làm người dùng sốt ruột | Config 500ms thay vì 800ms |
