# OmniVoice REST API Server

**Ngày:** 2026-07-26
**Trạng thái:** ✅ Đã triển khai
**Mục tiêu:** REST API wrapper cho OmniVoice TTS — chạy độc lập không cần bot_fs, hỗ trợ cả local (upload file) và remote (voice mapping sẵn).

---

## 1. Kiến trúc

```
┌─────────────────────────────────────────────┐
│           OmniVoice API Server               │
│            (port 8001)                       │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │         FastAPI (uvicorn)            │    │
│  │                                      │    │
│  │  POST /voice-profile                 │    │
│  │  POST /tts/from-audio                │    │
│  │  POST /tts/from-profile              │    │
│  │  POST /tts/from-profile/mp3          │    │
│  │                                      │    │
│  │  GET  /voices                        │    │
│  │  POST /tts/generate                  │    │
│  │  POST /tts/generate/mp3              │    │
│  │                                      │    │
│  │  GET  /audio/{filename}              │    │
│  │  GET  /tts/cached                    │    │
│  │                                      │    │
│  │  POST   /admin/voices                │    │
│  │  PUT    /admin/voices/{name}         │    │
│  │  DELETE /admin/voices/{name}         │    │
│  │  POST   /admin/voices/reload         │    │
│  └──────────────────────────────────────┘    │
│                    │                          │
│         ┌──────────┴──────────┐              │
│         │   OmniVoice Model   │              │
│         │  (k2-fsa/OmniVoice) │              │
│         │  ~6-8GB VRAM        │              │
│         │  Lazy loading       │              │
│         └──────────┬──────────┘              │
│                    │                          │
│  ┌─────────────────┴─────────────────┐       │
│  │    Output Directory               │       │
│  │  /tmp/omnivoice_outputs/          │       │
│  │    *.wav / *.mp3 / *.pt           │       │
│  └───────────────────────────────────┘       │
│                                              │
│  ┌───────────────────────────────────┐       │
│  │    Voice Profiles Directory       │       │
│  │  /opt/.../OmniVoice/profiles/     │       │
│  │    12 x .pt voices                │       │
│  │    voices.json (metadata)         │       │
│  └───────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

### Luồng xử lý chung (tất cả endpoints)

```
Client Request
    │
    ▼
FastAPI Router
    │
    ├── Parse params (Form / JSON)
    │
    ├── Resolve voice profile
    │   ├── Local: load từ file upload tạm
    │   └── Remote: tra registry từ voices.json
    │
    ├── OmniVoice.model.generate()
    │   ├── text, language, instruct, num_step
    │   └── voice_clone_prompt (từ .pt)
    │
    ├── Output
    │   ├── WAV: soundfile.write()
    │   └── MP3: pydub + ffmpeg (int16 conversion)
    │
    ├── Save → OUTPUT_DIR với filename hash
    │
    └── FileResponse → Client (tải về hoặc nghe online)
```

---

## 2. File cấu phần

| File | Chức năng |
|------|-----------|
| `omnivoice_api.py` | FastAPI router: tất cả endpoints, model loading, helpers, voice registry |
| `omnivoice_server.py` | Standalone entry point: uvicorn runner, startup logging |
| `OmniVoice/profiles/voices.json` | Metadata cho từng voice (description, gender, age, pitch, accent) |

### Phụ thuộc

```bash
pip install pydub           # Chỉ cần cho endpoint /mp3
apt-get install ffmpeg       # Chỉ cần cho endpoint /mp3 (Ubuntu/Debian)
```

---

## 3. Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `OMNIVOICE_API_MODEL` | `k2-fsa/OmniVoice` | HuggingFace model name |
| `OMNIVOICE_API_DEVICE` | `cuda:0` | GPU device (`cuda:0`, `cpu`, `mps`) |
| `OMNIVOICE_API_DTYPE` | `float16` | Model precision |
| `OMNIVOICE_API_NUM_STEP` | `32` | Diffusion steps (`16`=nhanh, `32-64`=chất lượng) |
| `OMNIVOICE_API_PORT` | `8001` | Server port |
| `OMNIVOICE_API_HOST` | `0.0.0.0` | Bind host |
| `OMNIVOICE_API_OUTPUT_DIR` | `/tmp/omnivoice_outputs` | Thư mục lưu WAV/MP3/pt |
| `OMNIVOICE_API_VOICES_DIR` | `/opt/.../OmniVoice/profiles` | Thư mục chứa .pt profiles |
| `OMNIVOICE_API_VOICES_JSON` | `{VOICES_DIR}/voices.json` | File metadata voices |

---

## 4. Danh sách REST API

### Nhóm 1: Local endpoints (cần upload file)

#### `POST /voice-profile`

Tạo voice profile `.pt` từ file audio gốc.

```bash
curl -X POST http://localhost:8001/voice-profile \
  -F "ref_audio=@gioi_thieu.wav" \
  -F "ref_text=Transcript chính xác của audio" \
  -o voice_profile.pt
```

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `ref_audio` | file | ✅ | File .wav/.mp3 giọng gốc (3-10s, rõ, ít nhiễu) |
| `ref_text` | string | ❌ | Transcript. Bỏ trống → Whisper auto-transcribe |

**Response:** file `.pt` (VoiceClonePrompt) — self-contained, có thể dùng lại với `/tts/from-profile`.

#### `POST /tts/from-audio`

TTS WAV trực tiếp từ audio mẫu (không cần tạo profile riêng).

```bash
curl -X POST http://localhost:8001/tts/from-audio \
  -F "ref_audio=@gioi_thieu.wav" \
  -F "text=Nội dung cần đọc" \
  -F "instruct=female, gentle tone" \
  -F "language=Vietnamese" \
  -F "num_step=32" \
  -o output.wav
```

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `text` | string | ✅ | Nội dung cần đọc |
| `ref_audio` | file | ✅ | File audio mẫu |
| `ref_text` | string | ❌ | Transcript (bỏ trống → auto-transcribe) |
| `instruct` | string | ❌ | Overlay giọng (vd: `female, gentle tone`) |
| `language` | string | ❌ | Ngôn ngữ đích (`Vietnamese`, `English`, `vi`, `en`) |
| `num_step` | int | ❌(32) | Diffusion steps |

**Response:** file `.wav` (24kHz, 16-bit PCM, 1 channel).

#### `POST /tts/from-profile`

TTS WAV từ file `.pt` profile đã tạo trước.

```bash
curl -X POST http://localhost:8001/tts/from-profile \
  -F "voice_profile=@voice_profile.pt" \
  -F "text=Nội dung cần đọc" \
  -F "instruct=female, gentle tone" \
  -F "language=vi" \
  -o output.wav
```

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `text` | string | ✅ | Nội dung cần đọc |
| `voice_profile` | file | ✅ | File .pt từ /voice-profile |
| `instruct` | string | ❌ | Overlay giọng |
| `language` | string | ❌ | Ngôn ngữ đích |
| `num_step` | int | ❌(32) | Diffusion steps |

#### `POST /tts/from-profile/mp3`

TTS MP3 từ file `.pt` profile (dung lượng nhẹ hơn WAV ~10 lần).

```bash
curl -X POST http://localhost:8001/tts/from-profile/mp3 \
  -F "voice_profile=@voice_profile.pt" \
  -F "text=Nội dung cần đọc" \
  -F "instruct=female, gentle tone" \
  -F "bitrate=192k" \
  -o output.mp3
```

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `text` | string | ✅ | Nội dung cần đọc |
| `voice_profile` | file | ✅ | File .pt |
| `instruct` | string | ❌ | Overlay giọng |
| `language` | string | ❌ | Ngôn ngữ đích |
| `num_step` | int | ❌(32) | Diffusion steps |
| `bitrate` | string | ❌(192k) | `128k`, `192k`, `256k`, `320k` |

---

### Nhóm 2: Remote endpoints (JSON body, dùng voice_name)

#### `GET /voices`

Liệt kê tất cả voices có sẵn trên server (kèm metadata).

```bash
curl http://localhost:8001/voices
```

Response:
```json
{
  "count": 12,
  "voices": [
    {
      "name": "zari",
      "file": "57251_zari.pt",
      "size_bytes": 7362,
      "description": "Cô gái tuổi teen tràn đầy năng lượng...",
      "gender": "female",
      "age": "teenager",
      "language": "en",
      "pitch": "high pitch",
      "accent": ""
    },
    ...
  ]
}
```

#### `POST /tts/generate`

TTS WAV từ voice_name mapping (JSON body, không upload file).

```bash
curl -X POST http://localhost:8001/tts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "voice_name": "zari",
    "text": "Xin chào, tôi là Zari",
    "instruct": "female, gentle tone",
    "language": "Vietnamese",
    "num_step": 32
  }' \
  -o output.wav
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `voice_name` | string | ✅ | Tên voice từ /voices |
| `text` | string | ✅ | Nội dung cần đọc |
| `instruct` | string | ❌ | Overlay giọng |
| `language` | string | ❌ | Ngôn ngữ đích |
| `num_step` | int | ❌(32) | Diffusion steps |

#### `POST /tts/generate/mp3`

TTS MP3 từ voice_name mapping.

```bash
curl -X POST http://localhost:8001/tts/generate/mp3 \
  -H "Content-Type: application/json" \
  -d '{
    "voice_name": "eddy",
    "text": "Hello, I am Eddy from Duolingo",
    "instruct": "male, enthusiastic",
    "language": "English",
    "bitrate": "192k"
  }' \
  -o output.mp3
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `voice_name` | string | ✅ | Tên voice từ /voices |
| `text` | string | ✅ | Nội dung cần đọc |
| `instruct` | string | ❌ | Overlay giọng |
| `language` | string | ❌ | Ngôn ngữ đích |
| `num_step` | int | ❌(32) | Diffusion steps |
| `bitrate` | string | ❌(192k) | `128k`, `192k`, `256k`, `320k` |

---

### Nhóm 3: Admin endpoints

#### `POST /admin/voices`

Đăng ký voice profile mới (upload .pt file).

```bash
curl -X POST http://localhost:8001/admin/voices \
  -F "voice_name=my_support_agent" \
  -F "voice_file=@my_voice.pt"
```

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `voice_name` | string | ✅ | Tên voice (không trùng, không dấu, không space) |
| `voice_file` | file | ✅ | File .pt |

#### `PUT /admin/voices/{voice_name}`

Cập nhật metadata cho voice (lưu vào voices.json).

```bash
curl -X PUT http://localhost:8001/admin/voices/oscar \
  -F "description=Giáo viên mỹ thuật kịch tính" \
  -F "gender=male" \
  -F "age=adult" \
  -F "language=en" \
  -F "pitch=moderate pitch" \
  -F "accent=british accent"
```

| Field | Giá trị hợp lệ (theo OmniVoice voice-design.md) |
|---|---|
| `gender` | `male`, `female` |
| `age` | `child`, `teenager`, `young adult`, `middle-aged`, `elderly`, `adult` |
| `pitch` | `very low pitch`, `low pitch`, `moderate pitch`, `high pitch`, `very high pitch` |
| `accent` | `american accent`, `british accent`, `australian accent`, `canadian accent`, `indian accent`, `chinese accent`, ... |

#### `DELETE /admin/voices/{voice_name}`

Xoá voice (cả file .pt + metadata).

```bash
curl -X DELETE http://localhost:8001/admin/voices/my_support_agent
```

#### `POST /admin/voices/reload`

Quét lại thư mục profiles + voices.json.

```bash
curl -X POST http://localhost:8001/admin/voices/reload
```

---

### Nhóm 4: Utility

#### `GET /audio/{filename}`

Serve file WAV/MP3 đã sinh — mở trên browser nghe trực tiếp.

```
http://localhost:8001/audio/af216052b593e6591b7078a5e267634d.mp3
```

#### `GET /tts/cached`

Liệt kê tất cả file WAV/MP3 đã sinh.

```bash
curl http://localhost:8001/tts/cached
```

---

## 5. Danh sách voices hiện có

Dựa trên thông tin nhân vật Duolingo Stories và OmniVoice voice profiles:

| Voice | Gender | Age | Pitch | Accent | Mô tả |
|---|---|---|---|---|---|
| `zari` | female | teenager | high pitch | — | Năng lượng, nhiệt huyết, luôn đứng đầu lớp |
| `eddy` | male | young adult | moderate | — | Giáo viên thể dục 30t, cha đơn thân, nhiệt tình |
| `bea` | female | young adult | moderate | — | Tham vọng, thích du lịch, người yêu của Eddy |
| `junior` | male | child | high pitch | — | Cậu bé 8 tuổi láu cá, con trai Eddy |
| `lily` | female | teenager | low pitch | — | Tóc tím, hay chán đời, bạn thân Zari |
| `lin` | female | young adult | moderate | — | Chinese-American, hipster, thích DJ |
| `lucy` | female | elderly | moderate | — | Bà cụ cool ngầu, từng leo Everest |
| `oscar` | male | adult | moderate | british | Giáo viên mỹ thuật kịch tính |
| `falstaff` | male | middle-aged | low pitch | — | Gấu to lớn, cáu kỉnh |
| `vikram` | male | adult | moderate | indian | Tốt bụng, lạc quan, thích nấu ăn |
| `narrator_men` | male | adult | moderate | — | Dẫn chuyện nam, trung tính |
| `narrator_girl` | female | young adult | high pitch | — | Dẫn chuyện nữ trẻ, dễ thương |

---

## 6. Caching

| Endpoint | Caching key | Extension |
|---|---|---|
| `/tts/from-audio` | MD5(language + text) | .wav |
| `/tts/from-profile` | MD5(language + text) | .wav |
| `/tts/from-profile/mp3` | MD5(language + bitrate + text) | .mp3 |
| `/tts/generate` | MD5(voice_name + language + text) | .wav |
| `/tts/generate/mp3` | MD5(voice_name + language + bitrate + text) | .mp3 |

Cùng input → cùng filename → file được reuse, không generate lại.

---

## 7. So sánh dung lượng

Dựa trên giọng nói ~15s:

| Format | Bitrate | Dung lượng |
|---|---|---|
| WAV 24kHz 16-bit | 384 kbps (fixed) | ~720 KB |
| MP3 320kbps | 320 kbps | ~600 KB |
| MP3 192kbps | 192 kbps | ~360 KB |
| MP3 128kbps | 128 kbps | ~240 KB |

**Lưu ý WAV:** bitrate WAV là cố định (sample_rate × bit_depth × channels = 24000 × 16 × 1 = 384 kbps). Không thể giảm giống MP3. Nếu cần file nhẹ → dùng `/mp3`.

---

## 8. Hướng dẫn triển khai

### Yêu cầu hệ thống

- **GPU:** NVIDIA với CUDA, VRAM ≥ 8GB (model OmniVoice ~6-8GB)
- **Python:** 3.10+
- **Disk:** ~10GB cho model + output cache

### Cài đặt

```bash
# Đã có sẵn trong môi trường (OmniVoice local repo)
cd /opt/my_pipecat_ai/freeswitch_agent

# Nếu cần MP3
pip install pydub
apt-get install ffmpeg
```

### Khởi động

```bash
# Chạy default
python omnivoice_server.py

# Tuỳ chỉnh
CUDA_VISIBLE_DEVICES=0 OMNIVOICE_API_PORT=8001 python omnivoice_server.py

# Chạy trên CPU (chậm)
OMNIVOICE_API_DEVICE=cpu python omnivoice_server.py
```

### Kiểm tra

```bash
# Server đã chạy chưa?
curl http://localhost:8001/voices

# Thử TTS
curl -X POST http://localhost:8001/tts/generate/mp3 \
  -H "Content-Type: application/json" \
  -d '{"voice_name": "zari", "text": "Hello world"}' \
  -o test.mp3
```

### Systemd (tuỳ chọn)

```ini
[Unit]
Description=OmniVoice TTS API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/my_pipecat_ai/freeswitch_agent
ExecStart=/opt/my_pipecat_ai/freeswitch_agent/.venv/bin/python omnivoice_server.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 9. Các lưu ý kỹ thuật

### WAV vs MP3

- **WAV:** format chuẩn cho xử lý âm thanh, không nén, 384kbps cố định
- **MP3:** cần `pydub` + `ffmpeg`, giảm ~10 lần dung lượng, chất lượng 192k gần như không phân biệt với WAV
- Endpoint `/mp3` trả về HTTP 503 nếu thiếu pydub/ffmpeg

### Chuyển đổi float32 → int16 cho MP3

`audio_np` từ model trả về là `float32 [-1.0, 1.0]`. Khi đưa vào pydub, phải convert:
```python
audio_int16 = (audio_np * 32767).clip(-32768, 32767).astype(np.int16)
```
Nếu không, MP3 ra âm thanh rác.

### Model lazy loading

Model chỉ load khi có request đầu tiên (mất ~30-60s). Request đầu tiên sẽ chậm hơn các request sau.

### VRAM

Model OmniVoice chiếm ~6-8GB VRAM. Cần GPU có ≥ 8GB VRAM. Có thể giảm bằng `OMNIVOICE_API_DTYPE=float32` (tốn hơn) nhưng float16 đã ổn.

### Security

- Endpoint `/audio/{filename}` chặn path traversal (`/` và `\\` trong filename)
- Chỉ serve file `.wav` và `.mp3` từ output directory
- Admin endpoints không có auth — nên chạy sau reverse proxy nếu public

### Voice registry

- Server tự động quét `OMNIVOICE_API_VOICES_DIR` khi khởi động
- Metadata lưu trong `voices.json` — có thể sửa thủ công hoặc qua `PUT /admin/voices/{name}`
- Sau khi thêm/xoá file thủ công, gọi `POST /admin/voices/reload` để cập nhật
- File `.pt` có tên `57251_zari.pt` → voice_name = `zari`

### SoapUI

- **Local endpoints** (upload file): dùng `multipart/form-data`, attach file
- **Remote endpoints** (`/tts/generate`, `/tts/generate/mp3`): dùng `application/json`
- Response là binary — Save As từ tab Raw

---

## 10. Toàn bộ API — tóm tắt nhanh

| # | Method | Endpoint | Request | Response |
|---|---|---|---|---|
| 1 | POST | `/voice-profile` | multipart (file) | .pt file |
| 2 | POST | `/tts/from-audio` | multipart (file) | .wav |
| 3 | POST | `/tts/from-profile` | multipart (file) | .wav |
| 4 | POST | `/tts/from-profile/mp3` | multipart (file) | .mp3 |
| 5 | GET | `/voices` | — | JSON list |
| 6 | POST | `/tts/generate` | JSON body | .wav |
| 7 | POST | `/tts/generate/mp3` | JSON body | .mp3 |
| 8 | POST | `/admin/voices` | multipart (file) | JSON |
| 9 | PUT | `/admin/voices/{name}` | form-data | JSON |
| 10 | DELETE | `/admin/voices/{name}` | — | JSON |
| 11 | POST | `/admin/voices/reload` | — | JSON |
| 12 | GET | `/audio/{filename}` | — | .wav/.mp3 |
| 13 | GET | `/tts/cached` | — | JSON list |

Swagger UI: `http://localhost:8001/docs`
