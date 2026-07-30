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
  → MarkdownStripper → PronNorm (optional) → TTS
  → ⏳ ThinkingDelayProcessor (800ms)         ← giữa TTS và audio output
  → TTSAudioProcessor → Output → assistant_agg
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
| 1023–1053 | `ThinkingDelayProcessor` class (section 6) |
| 1088–1095 | Nhánh `elif STT_PROVIDER == "gipformer"` trong factory |
| 1223 | VAD `stop_secs=2` (Option 1) |
| 1270–1272 | `ThinkingDelayProcessor(800)` chèn vào pipeline **sau TTS, trước TTSAudioProcessor** |

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

### 6.1. Mục đích

Thêm khoảng dừng ~800ms trước khi bot bắt đầu nói, tạo cảm giác bot đang "suy nghĩ" thay vì trả lời ngay lập tức. Chỉ delay **câu đầu tiên** mỗi lượt nói, các câu sau trong cùng lượt không bị delay.

### 6.2. Vị trí trong pipeline

Đặt **giữa TTS và TTSAudioProcessor** — đây là vị trí duy nhất đảm bảo cả `TTSStartedFrame` và `TTSStoppedFrame` đều chảy qua processor:

```
Input → VAD → STT → HallucinationFilter → user_agg → (RAG) → LLM
  → MarkdownStripper → PronNorm (optional) → TTS
  → ⏳ ThinkingDelayProcessor (800ms)         ← SAU TTS
  → TTSAudioProcessor → Output → assistant_agg
```

(`bot_fs.py` dòng 1270-1273):
```python
pipeline_steps.extend([
    tts,
    ThinkingDelayProcessor(800),
    TTSAudioProcessor(),
    transport.output(),
    assistant_agg,
])
```

### 6.3. Class ThinkingDelayProcessor

(`bot_fs.py` dòng 1023-1053)

```python
class ThinkingDelayProcessor(FrameProcessor):
    """Chèn delay sau TTS: delay TTSStartedFrame đầu tiên mỗi lượt bot nói.

    Đặt GIỮA TTS và TTSAudioProcessor.
    TTSStartedFrame → delay `delay_ms` → forward xuống TTSAudioProcessor.
    TTSStoppedFrame  → reset cờ → lượt sau được delay tiếp.
    """

    def __init__(self, delay_ms: float = 800):
        super().__init__()
        self._delay_s = delay_ms / 1000.0
        self._pending = True  # delay lần TTSStarted đầu tiên sau mỗi TTSStopped

    async def process_frame(self, frame, direction):
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, TTSStartedFrame) and self._pending:
                logger.info(f"⏳ Thinking delay {self._delay_s*1000:.0f}ms...")
                await asyncio.sleep(self._delay_s)
                self._pending = False
            elif isinstance(frame, TTSStoppedFrame):
                self._pending = True  # reset cho lượt nói tiếp theo
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)
```

### 6.4. Luồng frame chi tiết

```
Lượt bot nói (vd: greeting):
  TTS xử lý text xong
    → push TTSStartedFrame ──→ ThinkingDelayProcessor
                                   ↓ _pending = True
                                   ↓ "⏳ Thinking delay 800ms..."
                                   ↓ asyncio.sleep(0.8)
                                   ↓ _pending = False
                                   ↓ forward TTSStartedFrame
                               → TTSAudioProcessor → audio output
    → push TTSAudioFrame ────→ ThinkingDelayProcessor
                                   ↓ không phải TTSStartedFrame → forward ngay
                               → TTSAudioProcessor → audio output
    → push TTSStoppedFrame ──→ ThinkingDelayProcessor
                                   ↓ _pending = True (reset)
                                   ↓ forward TTSStoppedFrame
                               → TTSAudioProcessor

Người dùng nói → VAD → STT → LLM → ... (lượt mới)

Lượt bot nói (trả lời câu hỏi):
  TTSStartedFrame → ThinkingDelayProcessor
                      ↓ _pending = True (đã được reset bởi TTSStoppedFrame)
                      ↓ delay 800ms → forward → TTSAudioProcessor
  ...cứ thế lặp lại cho mỗi lượt...
```

### 6.5. Bug Fix Log (3 lần fix)

| Lần | Code | Lỗi | Nguyên nhân gốc rễ |
|-----|------|-----|-------------------|
| **1** | `self.push_frame(frame)` (bỏ qua super) | `"StartFrame not received yet"` trên console | Trong Pipecat 1.5.0, `push_frame()` gọi `_check_started()` kiểm tra `__started`. Chỉ có `super().process_frame()` mới set `__started = True` khi nhận `StartFrame`. Gọi `push_frame` trực tiếp → không set flag → mọi frame bị từ chối. |
| **2** | `super().process_frame()` (thiếu push_frame) | `"CancelFrame timeout"` sau 5 giây, pipeline chết | Base class `process_frame()` xử lý `StartFrame` (set `__started`) và `CancelFrame` (set `_cancelling`) nhưng **không tự động push frame xuống processor tiếp theo**. CancelFrame bị nuốt → không đến cuối pipeline → `wait_for_cancel()` timeout. |
| **3a** | `super()` + `push_frame()`, processor **trước** TTS, intercept `TextFrame` | Chỉ delay greeting, các câu sau không delay | `TTSStoppedFrame` do TTS push ra output, **không chảy ngược qua processor** khi processor đặt trước TTS. `_pending` không reset → chỉ delay đúng 1 lần duy nhất. |
| **3b ✅** | `super()` + `push_frame()`, processor **sau** TTS, intercept `TTSStartedFrame`/`TTSStoppedFrame` | **Hoạt động đúng** | Cả `TTSStartedFrame` (trigger delay) và `TTSStoppedFrame` (reset) đều chảy qua processor khi nó nằm sau TTS. Mỗi lượt bot nói đều được delay. |

**Pattern đúng cho FrameProcessor trong Pipecat 1.5.0:**
```python
async def process_frame(self, frame, direction):
    # Custom logic (delay, filter, ...)
    await super().process_frame(frame, direction)  # bắt buộc: xử lý state (StartFrame→__started, CancelFrame→_cancelling, ...)
    await self.push_frame(frame, direction)         # bắt buộc: forward frame xuống processor tiếp theo
```

### 6.6. Tại sao intercept TTSStartedFrame thay vì TextFrame?

| Frame | Vị trí phát | Chảy qua processor khi đặt sau TTS? |
|-------|-------------|--------------------------------------|
| `TextFrame` | LLM → MarkdownStripper → PronNorm | ❌ Không (đã bị TTS tiêu thụ trước) |
| `TTSStartedFrame` | TTS (khi bắt đầu gen audio) | ✅ Có |
| `TTSStoppedFrame` | TTS (khi gen xong) | ✅ Có |
| `TTSAudioFrame` | TTS (từng chunk audio) | ✅ Có |

→ Intercept `TTSStartedFrame` là lựa chọn duy nhất: nó chỉ xuất hiện 1 lần mỗi lượt (tự nhiên), và `TTSStoppedFrame` reset cờ cũng chỉ 1 lần.

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
