# Kế hoạch: DTMF Detection, Transfer Extension, Enhanced Knowledge Base

## Context

Sau khi hoàn thành tính năng tool calling transfer queue, user muốn mở rộng FS Bot với:
1. **DTMF detection** — Khi caller bấm `0` → gặp nhân viên, `#` → kết thúc
2. **Transfer to extension** — Chuyển máy đến số máy lẻ cụ thể (không qua queue)
3. **CRM + Product Catalog + Dynamic FAQ** — Knowledge base mạnh hơn với tool calling

---

## Feature 1: DTMF Detection

### Vấn đề
Pipecat có `InputDTMFFrame` + `DTMFAggregator` (tạo `TranscriptionFrame("DTMF: 0")`), nhưng chỉ hoạt động với telephony serializers có DTMF event riêng (Twilio, Plivo, Daily...). Với `mod_audio_stream` (L16 PCM raw), DTMF là **in-band** — tone trong audio stream. `FastAPIWebsocketTransport` không xử lý DTMF.

### Giải pháp
Tạo `DTMFDetectorProcessor` dùng numpy FFT để detect DTMF tones từ raw audio. Dùng `DTMFAggregator` (built-in Pipecat) và `DTMFActionHandler` (custom) để xử lý.

### DTMF frequency table (8kHz sampling)
```
      1209 Hz  1336 Hz  1477 Hz  1633 Hz
697 Hz   1        2        3        A
770 Hz   4        5        6        B
852 Hz   7        8        9        C
941 Hz   *        0        #        D
```

Giải thuật Goertzel không cần thư viện ngoài — dùng numpy FFT đơn giản:
- Buffer 120ms (960 samples @ 8kHz) với 50% overlap
- Tìm 2 peak tần số (một từ low-group, một từ high-group)
- Kiểm tra biên độ và tỷ lệ tín hiệu/nhiễu để tránh false positive
- Debounce: không detect lại digit giống nhau trong 200ms

### Kiến trúc pipeline

```
transport.input()
  → DTMFDetectorProcessor (mới, numpy FFT)
      ↓ khi detect digit → InputDTMFFrame(button=KeypadEntry.ZERO)
  → vad → stt → HallucinationFilter
  → DTMFAggregator (built-in Pipecat)
      ↓ InputDTMFFrame → TranscriptionFrame("DTMF: 0")
  → DTMFActionHandler (mới)
      ├── DTMF: 0  → gọi transfer logic (không qua LLM)
      ├── DTMF: #  → gọi end_call (nói tạm biệt + hangup)
      └── khác     → pass xuống LLM
  → user_agg → (RAG) → llm → ...
```

### Files mới

#### `dtmf_detector.py` (~150 dòng)
```python
class DTMFDetectorProcessor(FrameProcessor):
    """Detect DTMF tones from raw PCM audio using numpy FFT.

    - Buffer 120ms audio, 50% overlap
    - FFT → check 7 DTMF frequencies (2 groups)
    - Push InputDTMFFrame khi detect digit
    - Debounce 200ms để tránh trùng lặp
    """

    # DTMF frequency pairs
    LOW_FREQS = [697, 770, 852, 941]
    HIGH_FREQS = [1209, 1336, 1477, 1633]
    DIGIT_MAP = {
        (697, 1209): "1", (697, 1336): "2", (697, 1477): "3", (697, 1633): "A",
        (770, 1209): "4", (770, 1336): "5", (770, 1477): "6", (770, 1633): "B",
        (852, 1209): "7", (852, 1336): "8", (852, 1477): "9", (852, 1633): "C",
        (941, 1209): "*", (941, 1336): "0", (941, 1477): "#", (941, 1633): "D",
    }

    def __init__(self, threshold=5.0, debounce_ms=200):
        self._buf = bytearray()       # accumulate audio
        self._buf_sample_rate = 8000
        self._frame_size = 960        # 120ms @ 8kHz
        self._step = 480              # 50% overlap
        self._threshold = threshold   # magnitude threshold
        self._last_digit = None       # debounce state
        self._last_digit_time = 0.0

    def _detect_dtmf(self, audio_int16) -> str | None:
        """FFT → find DTMF digit → return str or None."""
        samples = np.frombuffer(audio_int16, dtype=np.int16).astype(np.float64)
        spectrum = np.abs(np.fft.rfft(samples * np.hanning(len(samples))))
        freqs = np.fft.rfftfreq(len(samples), 1/self._buf_sample_rate)

        # Find best low + high frequency peaks
        low_peak, high_peak = ...

        return self.DIGIT_MAP.get((nearest_low, nearest_high))
```

#### `dtmf_handler.py` (~80 dòng)
```python
class DTMFActionHandler(FrameProcessor):
    """Xử lý TranscriptionFrame từ DTMFAggregator.

    - DTMF: 0 → transfer_to_agent
    - DTMF: # → end_call (TTSSpeakFrame + hangup)
    - Khác → forward cho LLM
    """

    def __init__(self, call_uuid, fs_api_config):
        self._call_uuid = call_uuid
        self._fs_api_config = fs_api_config

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        if isinstance(frame, TranscriptionFrame) and frame.text.startswith("DTMF:"):
            digit = frame.text.replace("DTMF:", "").strip()
            if digit == "0":
                await self._do_transfer()
                return  # don't forward frame
            elif digit == "#":
                await self._do_end_call()
                return
        await self.push_frame(frame, direction)
```

### Env var
```python
DTMF_ENABLED = os.getenv("DTMF_ENABLED", "true").lower() == "true"
```

---

## Feature 2: Transfer to Extension

### API endpoint
- **`POST /api/v1/calls/{uuid}/transfer`** với body `{"destination": "101", "dialplan": "XML", "context": "default"}`
- Nội bộ gọi `uuid_transfer <uuid> user/101 XML default`

### File: `fs_tools.py` (MODIFY, +50 dòng)

```python
def create_transfer_extension_tool(call_uuid, api_base_url, api_username, api_password):
    """Factory: transfer đến máy lẻ cụ thể."""

    async def transfer_to_extension(params, extension: str):
        """Chuyển cuộc gọi đến số máy lẻ cụ thể.

        Gọi hàm này khi khách hàng yêu cầu chuyển máy đến số nội bộ,
        máy lẻ, phòng ban cụ thể (vd: "101", "200", "phòng kỹ thuật").

        Args:
            extension: Số máy lẻ cần chuyển đến
        """
        token = await _ensure_token(...)
        resp = await client.post(
            f"{base_url}/calls/{call_uuid}/transfer",
            json={"destination": extension, "dialplan": "XML", "context": "default"},
            headers={"Authorization": f"Bearer {token}"},
        )
        result = resp.json()
        if result.get("success"):
            asyncio.create_task(_delayed_stop_audio(...))
        await params.result_callback(result)

    return transfer_to_extension
```

### File: `bot_fs.py` (MODIFY)
Đăng ký cả 2 tools trong `LLMContext`:
```python
if call_uuid and fs_api_config:
    tools = [
        create_transfer_tool(...),
        create_transfer_extension_tool(...),
    ]
    context = LLMContext(tools=tools)
```

---

## Feature 3: CRM + Product Catalog + Dynamic FAQ

### Kiến trúc

Tạo CSDL SQLite riêng (`data/crm.db`) với mock data. Dùng tool calling để tra cứu.

```
freeswitch_agent/data/
  └── crm.db (SQLite)
      ├── customers ── lookup_customer(phone) → tên, dư nợ, điểm
      ├── orders ────── check_orders(phone) → đơn hàng gần đây
      ├── products ──── search_product(query) → sản phẩm + giá + tồn kho
      └── faq ───────── search_faq(query) + save_faq(q, a) → học từ cuộc gọi
```

### File mới: `crm_db.py` (~200 dòng)

```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,            -- "0901234567"
    name TEXT NOT NULL,                    -- "Nguyễn Văn A"
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    debt REAL DEFAULT 0.0,                -- dư nợ VND
    total_spent REAL DEFAULT 0.0,
    loyalty_points INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,            -- "iPhone 15 Pro Max"
    quantity INTEGER DEFAULT 1,
    amount REAL NOT NULL,                  -- 25,000,000 VND
    status TEXT DEFAULT 'pending',         -- pending|shipped|delivered|cancelled
    order_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- "Điện thoại Samsung Galaxy S24"
    category TEXT DEFAULT '',              -- "Điện thoại"|"Laptop"|"Phụ kiện"
    price REAL NOT NULL,                   -- 15,990,000 VND
    stock INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',          -- 'manual' | 'call'
    created_at TEXT DEFAULT (datetime('now'))
);
```

**Seed data:**
- 8 khách hàng mẫu (số điện thoại 090xxxxxxx format) với dư nợ, điểm thưởng
- 15-20 đơn hàng mẫu (trạng thái khác nhau)
- 15 sản phẩm: 5 điện thoại, 5 laptop/tablet, 5 phụ kiện
- 10 FAQ mẫu (câu hỏi thường gặp về sản phẩm, vận chuyển, đổi trả)

### File mới: `crm_tools.py` (~200 dòng)

```python
async def lookup_customer(params, phone: str):
    """Tra cứu thông tin khách hàng theo số điện thoại."""
    ...

async def check_orders(params, phone: str):
    """Kiểm tra đơn hàng của khách hàng."""
    ...

async def search_product(params, query: str):
    """Tìm kiếm sản phẩm theo tên hoặc danh mục."""
    ...

async def search_faq(params, query: str):
    """Tìm kiếm câu hỏi thường gặp."""
    ...

async def save_faq(params, question: str, answer: str):
    """Lưu câu hỏi mới vào cơ sở kiến thức FAQ dynamics."""
    ...
```

Mỗi handler là direct function cho Pipecat — pattern giống `transfer_to_agent`.

### File: `bot_fs.py` (MODIFY)
- Khởi tạo CRM DB khi startup
- Thêm tools vào `LLMContext(tools=[...])`
- Thêm instruction vào SYSTEM_PROMPT

### Lưu ý: 2 hệ thống KB song song

| Hệ thống | Lưu trữ | Dùng cho | Tìm kiếm |
|----------|---------|----------|----------|
| **RAG cũ** (`knowledge_base.py`) | ChromaDB | Kiến thức nội bộ (công ty, chính sách) | Vector search (tự động) |
| **CRM mới** (`crm_db.py`) | SQLite | Customer, order, product, FAQ | Tool calling (chủ động) |

Không gộp làm một vì bản chất khác nhau: RAG tự động search context, CRM là tra cứu có chủ đích qua tool calling.

---

## Pipeline cuối cùng (đầy đủ)

```
transport.input()
  → DTMFDetectorProcessor          (mới, detect tone → InputDTMFFrame)
  → vad
  → stt
  → HallucinationFilter
  → DTMFAggregator                  (built-in, InputDTMFFrame → TranscriptionFrame)
  → DTMFActionHandler               (mới, DTMF 0→transfer, #→end)
  → user_agg
  → (RAGProcessor)
  → llm (với tools: transfer_to_agent, transfer_to_extension,
                     lookup_customer, check_orders, search_product,
                     save_faq, search_faq)
  → MarkdownStripper
  → (PronunciationNormalizer)
  → tts
  → ThinkingDelayProcessor
  → TTSAudioProcessor
  → transport.output()
  → assistant_agg
```

## SYSTEM_PROMPT bổ sung (thêm vào cuối)

```python
"- Khi khách hàng hỏi về thông tin cá nhân/đơn hàng, "
 "hãy gọi lookup_customer và check_orders.\n"
"- Khi khách hàng hỏi về sản phẩm, hãy gọi search_product.\n"
"- Khi khách hàng hỏi câu hỏi mới, hãy gọi search_faq. "
 "Nếu vẫn không có, nói 'chưa có thông tin' và gọi save_faq.\n"
```

(Không cần thêm instruction về DTMF — `DTMFActionHandler` xử lý trước khi tới LLM)

## Files Summary

| File | Hành động | ~Dòng |
|------|-----------|-------|
| `dtmf_detector.py` | **NEW** — numpy FFT DTMF detection | 150 |
| `dtmf_handler.py` | **NEW** — DTMF 0→transfer, #→end | 80 |
| `crm_db.py` | **NEW** — SQLite CRM + seed data | 200 |
| `crm_tools.py` | **NEW** — 5 tool handlers | 200 |
| `fs_tools.py` | **MODIFY** — +transfer_to_extension tool | +50 |
| `bot_fs.py` | **MODIFY** — pipeline, tools, env vars, prompt | +80 |
| `data/crm.db` | **NEW** — auto-created at startup | SQLite |

## Verification

1. **DTMF 0:** Gọi SIP → bấm `0` → Bot detect → transfer → queue ✅
2. **DTMF #:** Gọi SIP → bấm `#` → Bot detect → nói tạm biệt → call end ✅
3. **Transfer extension:** "chuyển máy 101" → tool → `POST /calls/{uuid}/transfer` → transfer ✅
4. **CRM:** "kiểm tra thông tin số 0901234567" → `lookup_customer` → trả lời ✅
5. **Product:** "có bán iPhone không?" → `search_product` → trả lời ✅
6. **FAQ:** "Làm sao đổi trả hàng?" → `search_faq` → trả lời ✅
7. **Dynamic FAQ:** Bot không biết → `save_faq` → lần sau có thông tin ✅
8. **RAG cũ vẫn OK:** Hỏi về Xon Len → RProcessor vẫn trả lời từ ChromaDB ✅
