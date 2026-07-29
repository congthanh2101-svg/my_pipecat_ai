# Kế Hoạch Tích Hợp VietASR vào Pipecat AI

## 1. Mục Tiêu

Thêm tuỳ chọn STT provider: có thể chọn **Whisper** (hiện tại) hoặc **VietASR** thông qua biến môi trường `STT_PROVIDER`.

```
STT_PROVIDER=whisper   # (mặc định) dùng Whisper large-v3 như hiện tại
STT_PROVIDER=vietasr   # dùng VietASR Zipformer
```

---

## 2. Kiến Trúc Tổng Thể

### 2.1. Kiến trúc hiện tại (Whisper)

```
[8kHz PCM] → VAD → MinSpeechDurationFilter → DebugWhisperSTTService → HallucinationFilter → user_agg → LLM
                                              └── WhisperSTTService (faster-whisper)
```

### 2.2. Kiến trúc mới (thêm VietASR)

```
[8kHz PCM] → VAD → MinSpeechDurationFilter → STTSelector → HallucinationFilter → user_agg → LLM
                                              │
                                              ├── DebugWhisperSTTService (khi STT_PROVIDER=whisper)
                                              │   └── faster-whisper large-v3
                                              │
                                              └── VietASRSTTService (khi STT_PROVIDER=vietasr)
                                                  ├── Resample 8kHz → 16kHz
                                                  ├── Compute FBank features (80-dim)
                                                  └── Zipformer Transducer inference
```

### 2.3. Factory Pattern

```python
# Trong create_services():
if STT_PROVIDER == "vietasr":
    stt = VietASRSTTService(...)
else:
    stt = DebugWhisperSTTService(...)
```

---

## 3. Các File Cần Tạo/Sửa

### File Mới

| File | Mô tả |
|------|-------|
| `freeswitch_agent/vietasr_stt.py` | **VietASRSTTService** — custom STT service cho Pipecat |
| `freeswitch_agent/plans/add-vietasr-stt-option.md` | (file này) |

### File Cần Sửa

| File | Thay đổi |
|------|----------|
| `freeswitch_agent/bot_fs.py` | Thêm import + factory cho VietASR trong `create_services()`; thêm biến `STT_PROVIDER` |
| `freeswitch_agent/bot_sdk.py` | Tương tự nếu cần hỗ trợ ở SDK path |
| `freeswitch_agent/.env.example` | Thêm `STT_PROVIDER` |

---

## 4. Thiết Kế VietASRSTTService

### 4.1. Interface (kế thừa STTService)

```python
from pipecat.services.stt_service import STTService
from pipecat.frames.frames import TranscriptionFrame

class VietASRSTTService(STTService):
    def __init__(self, 
                 model_path: str,
                 tokens_path: str,
                 device: str = "cuda",
                 sample_rate: int = 16000,
                 use_streaming: bool = True):
        ...
    
    async def run_stt(self, audio: bytes):
        """
        Audio: 8kHz Int16 PCM bytes từ pipeline
        1. Resample 8kHz → 16kHz
        2. Compute FBank (80-dim, 25ms window, 10ms shift)
        3. Run Zipformer encoder → decoder → joiner
        4. Decode BPE tokens → text
        5. yield TranscriptionFrame
        """
```

### 4.2. Phương án tích hợp — 3 lựa chọn

#### Option A: Sherpa-ONNX (Khuyến nghị)

Sử dụng [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) — đã hỗ trợ Zipformer, không cần k2/kaldifeat.

**Ưu điểm:**
- Không cần cài k2, kaldifeat, icefall (dependencies nặng)
- Có sẵn Python binding: `pip install sherpa-onnx`
- Hỗ trợ CPU + CUDA
- Có sẵn pipeline streaming (OnlineRecognizer)
- Đã hỗ trợ model Zipformer

**Code mẫu:**
```python
import sherpa_onnx
import numpy as np

class VietASRSTTService(STTService):
    def __init__(self, tokens_path, encoder_path, decoder_path, joiner_path):
        self.recognizer = sherpa_onnx.OnlineRecognizer(
            tokens=tokens_path,
            encoder=encoder_path,
            decoder=decoder_path,
            joiner=joiner_path,
            sample_rate=16000,
            feature_dim=80,
            decoding_method="greedy_search",
            provider="cuda",  # hoặc "cpu"
        )
        self.stream = self.recognizer.create_stream()
    
    async def run_stt(self, audio: bytes):
        # Resample 8kHz → 16kHz
        audio_16k = self._resample(audio, 8000, 16000)
        
        # Push to recognizer
        samples = np.frombuffer(audio_16k, dtype=np.int16).astype(np.float32) / 32768.0
        self.stream.accept_waveform(sample_rate=16000, waveform=samples)
        
        # Flush để nhận kết quả cuối
        self.stream.input_finished()
        
        # Get result
        text = self.recognizer.decode_stream(self.stream)
        if text.strip():
            yield TranscriptionFrame(text, self._user_id, timestamp, language="vi")
```

**Nhược điểm:** Cần convert VietASR checkpoint sang ONNX format mà sherpa-onnx hiểu. Format của sherpa-onnx Zipformer cần:
- `encoder.onnx` (Zipformer encoder)
- `decoder.onnx` (embedding decoder)  
- `joiner.onnx` (joiner network)
- `tokens.txt` (BPE vocabulary)

Phải dùng `export.py` của VietASR/icefall để export ONNX, hoặc dùng script `sherpa-onnx/scripts/export-zipformer-onnx.py`.

#### Option B: PyTorch trực tiếp (dùng checkpoint .pt)

Load checkpoint `.pt` từ VietASR, chạy inference bằng PyTorch + kaldifeat.

**Ưu điểm:**
- Dùng đúng model gốc, không cần convert
- Có thể dùng JIT script để tối ưu

**Nhược điểm:**
- Cần cài toàn bộ stack: `pip install k2 kaldifeat icefall sentencepiece`
- `k2` khó cài, dễ conflict
- Không production-friendly

#### Option C: Server riêng (microservice)

Chạy VietASR như một service riêng (FastAPI/gRPC), bot gọi qua HTTP.

**Ưu điểm:**
- Tách biệt dependencies
- Có thể scale riêng
- Không ảnh hưởng đến bot hiện tại

**Nhược điểm:**
- Thêm network latency
- Phức tạp hơn trong triển khai

---

## 5. Vấn Đề Sample Rate (QUAN TRỌNG)

### 5.1. Hiện tại

| Component | Sample Rate |
|-----------|-------------|
| FreeSWITCH audio | 8 kHz |
| WebSocket transport | 8 kHz |
| VAD (Silero) | 8 kHz |
| Whisper input | 8 kHz → internal 16 kHz |
| **VietASR yêu cầu** | **16 kHz** |

### 5.2. Giải pháp cho VietASR

**Cách 1 (nhanh): Resample trong STT service** — 8kHz → 16kHz trước khi đưa vào VietASR

```python
import soxr

audio_16k = soxr.resample(audio_8k_np, 8000, 16000)
```
- Dễ implement, không ảnh hưởng đến pipeline khác
- **Nhược điểm:** Upsampling 8kHz → 16kHz không thêm được thông tin tần số > 4kHz, làm giảm lợi thế của VietASR

**Cách 2 (triệt để): Chuyển pipeline lên 16kHz**

Cần sửa:
- `ai_call_handler.lua`: `SAMPLE_RATE = "16000"` thay vì "8000"
- `mod_audio_stream_pipecat`: `build_audio_raw_frame()` từ 8000→16000
- `bot_fs.py`: `audio_in_sample_rate=16000`, `audio_out_sample_rate=8000` hoặc 16000
- `TTSAudioProcessor`: output sample rate
- `L16FrameSerializer`: sample rate mặc định

**Khuyến nghị:** Làm cách 1 trước (resample trong STT), sau đó upgrade lên cách 2 nếu cần thêm chất lượng.

---

## 6. Các Bước Triển Khai Chi Tiết

### Phase 1: Chuẩn bị (1-2 ngày)

- [ ] Verify pretrained model trên HuggingFace: `zzasdf/viet_iter3_pseudo_label`
- [ ] Nếu không có checkpoint, liên hệ tác giả hoặc tìm model thay thế
- [ ] Export checkpoint sang ONNX format sherpa-onnx
- [ ] Kiểm thử inference với sherpa-onnx standalone

### Phase 2: Tích hợp core (2-3 ngày)

- [ ] Tạo `vietasr_stt.py` với `VietASRSTTService`
- [ ] Thêm factory trong `bot_fs.py` (`create_services`)
- [ ] Xử lý resample 8kHz → 16kHz
- [ ] Kiểm thử với /transcribe endpoint (upload file)
- [ ] Kiểm thử với /audio-stream (SIP call)

### Phase 3: Streaming (2-3 ngày)

- [ ] Implement streaming chunk-by-chunk (không cần đợi VAD stop)
- [ ] State management cho Zipformer streaming states
- [ ] Tối ưu latency

### Phase 4: Fine-tune (1-2 ngày)

- [ ] Điều chỉnh `no_speech_prob` / confidence threshold cho VietASR
- [ ] Cập nhật hallucination filter
- [ ] Tune VAD params (có thể khác với Whisper)
- [ ] Benchmark WER so với Whisper

---

## 7. Dependencies

### Cần cài đặt

```bash
# Option A (khuyến nghị) - sherpa-onnx
pip install sherpa-onnx

# Option B - PyTorch stack
pip install k2 kaldifeat icefall sentencepiece torch torchaudio
```

### Tác động đến dependencies hiện tại

- `sherpa-onnx` có thể conflict với `torch` version hiện tại
- Kiểm tra trong `.venv` trước khi cài

---

## 8. Quản Lý Model

### Model files cần có

```
models/vietasr/
├── encoder.onnx         # Zipformer encoder (ONNX)
├── decoder.onnx         # Embedding decoder (ONNX)  
├── joiner.onnx          # Joiner network (ONNX)
└── tokens.txt           # BPE vocabulary
```

Hoặc nếu dùng PyTorch:
```
models/vietasr/
├── pretrained.pt        # Checkpoint (state_dict hoặc JIT)
├── tokens.txt           # BPE vocabulary
└── bpe.model            # SentencePiece model
```

---

## 9. Thay Đổi Trong bot_fs.py

### Thêm biến môi trường

```python
# Sau dòng LLM_PROVIDER:
STT_PROVIDER = os.getenv("STT_PROVIDER", "whisper").lower()
VIETASR_MODEL_DIR = os.getenv("VIETASR_MODEL_DIR", str(Path(__file__).parent / "models" / "vietasr"))
```

### Sửa create_services() — factory pattern

```python
def create_services() -> tuple:
    # ... load_whisper_model() vẫn chạy nếu dùng Whisper
    
    if STT_PROVIDER == "vietasr":
        from vietasr_stt import VietASRSTTService
        stt = VietASRSTTService(
            model_path=VIETASR_MODEL_DIR,
            device=os.getenv("WHISPER_DEVICE", "cuda"),  # reuse env var
            use_streaming=True,
        )
    else:
        stt = DebugWhisperSTTService(...)  # như hiện tại
    
    # Phần còn lại giữ nguyên
```

---

## 10. So Sánh Chi Phí & Lợi Ích

### Khi Whisper (nguyên trạng)
- ✅ Hoạt động ổn định
- ✅ Nhiều tài liệu, dễ debug
- ❌ Nhận diện tiếng Việt qua SIP/PCMA rất kém
- ❌ Streaming không support (phải đợi hết câu)
- ❌ Model 3B tham số → tốn GPU

### Khi thêm VietASR
- ✅ Model nhẹ (~50M), có thể chạy CPU real-time
- ✅ Streaming native (chunk-by-chunk)
- ✅ Train riêng cho tiếng Việt (70k giờ)
- ✅ Kỳ vọng tốt hơn với audio codec quality thấp
- ⚠️ Chất lượng trên clean audio cần kiểm tra
- ⚠️ Cần export ONNX model (chưa có public)
- ❌ Dependency phức tạp hơn

---

## 11. Rủi Ro & Mitigation

| Rủi ro | Mitigation |
|---------|------------|
| Không có pretrained model ONNX | Dùng PyTorch JIT thay vì ONNX |
| sherpa-onnx không support Zipformer | Dùng PyTorch inference trực tiếp |
| Chất lượng VietASR không như kỳ vọng | Giữ song song Whisper, so sánh A/B |
| Resample 8kHz→16kHz giảm chất lượng | Nâng pipeline lên 16kHz ở phase sau |
| K2/kaldifeat khó cài | Dùng sherpa-onnx (không cần 2 thư viện này) |

---

## 12. Kết Luận

**Khả thi:** ✅ Có thể tích hợp, ưu tiên dùng **sherpa-onnx** (Option A).

**Lộ trình khuyến nghị:**
1. Kiểm tra HF checkpoint → nếu không có, tìm model Zipformer tiếng Việt khác (hoặc tự train)
2. Export ONNX → kiểm thử standalone với sherpa-onnx
3. Viết `VietASRSTTService` → tích hợp vào bot_fs.py
4. Kiểm thử với SIP phone, so sánh WER với Whisper
5. Nếu quality tốt hơn rõ rệt → đặt làm mặc định cho FS path

**Luôn giữ Whisper làm fallback** — dùng `STT_PROVIDER` để chuyển đổi linh hoạt.
