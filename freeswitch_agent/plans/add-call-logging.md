# Ghi lịch sử cuộc gọi FreeSWITCH Agent

**Ngày:** 2026-07-19
**Trạng thái:** ✅ Đã triển khai thành công
**Mục tiêu:** Lưu lịch sử cuộc gọi (conversation_id, phone, thời gian, transcript) vào SQLite database, hỗ trợ cả FreeSWITCH (mod_audio_stream) và Pipecat AI Client (RTVI WebSocket).

---

## 1. Kiến trúc

### Tổng quan

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FreeSWITCH Voice Agent                        │
│                          (FastAPI + Pipecat)                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────────────┐  │
│  │ FreeSWITCH│───→│ /audio-stream│───→ │  CallLogger              │  │
│  │ Lua Script│     │ WebSocket    │     │  ┌────────────────────┐  │  │
│  │ (FS call) │     │ parse params │     │  │  call_logs.db      │  │  │
│  └──────────┘     └──────────────┘     │  │  (SQLite WAL)       │  │  │
│                                          │  └────────────────────┘  │  │
│  ┌──────────┐     ┌──────────────┐     └──────────────────────────┘  │
│  │ React C1  │───→│ POST /connect │────→ wsUrl?conversation_id=..    │
│  │ Client    │     └──────┬───────┘        &phone=..                 │
│  └──────────┘             │                                          │
│                           ▼                                          │
│                    ┌──────────────┐     ┌──────────────────────────┐  │
│                    │  /rtvi-ws    │───→ │  CallLogger              │  │
│                    │  WebSocket   │     │  ┌────────────────────┐  │  │
│                    │  parse params│     │  │  call_logs.db      │  │  │
│                    └──────────────┘     │  │  (SQLite WAL)       │  │  │
│                                          │  └────────────────────┘  │  │
│                                          └──────────────────────────┘  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  /api/calls  ←── GET endpoint để xem call history (JSON)        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Luồng dữ liệu

#### FreeSWITCH (mod_audio_stream → /audio-stream)

```
ai_call_handler.lua
  │
  │ ws://192.168.1.20:8086/audio-stream?conversation_id=<uuid>&phone=<number>
  │
  ▼
/audio-stream handler (bot_fs.py)
  ├── [1] Parse ws.query_params → conversation_id, phone
  ├── [2] CallLogger.log_start(conversation_id, phone)
  │         └── INSERT INTO call_logs (conversation_id, phone, start_time, status='in_progress')
  ├── [3] Pipeline chạy bình thường (STT → LLM → TTS → output)
  ├── [4] User cúp máy / worker kết thúc
  └── [5] finally block:
        ├── Lấy context.messages → extract_conversation() → transcript JSON
        └── CallLogger.log_end(conversation_id, transcript)
              └── UPDATE call_logs SET end_time, duration_s, status, transcript
```

#### React C1 Client (RTVI → /rtvi-ws)

```
React C1 UI
  ├── Phone Number: "0909835115"  (user nhập)
  ├── Conversation ID: "a1b2c3d4" (tự động UUID, hoặc user nhập mới)
  │
  ├── Click "Connect"
  │     └── POST /connect  { phone: "0909835115", conversation_id: "a1b2c3d4" }
  │           └── wsUrl = "wss://host:8086/rtvi-ws?conversation_id=a1b2c3d4&phone=0909835115"
  │
  ▼
/rtvi-ws handler (bot_fs.py)
  ├── [1] Parse ws.query_params → conversation_id, phone
  ├── [2] CallLogger.log_start(conversation_id, phone)
  ├── [3] Pipeline chạy bình thường
  └── [4] finally block:
        ├── extract_conversation(context.messages)
        └── CallLogger.log_end(conversation_id, transcript)
```

---

## 2. File cấu phần

| File | Chức năng |
|------|-----------|
| `call_logger.py` | **NEW** — class `CallLogger` (SQLite) + helper `extract_conversation()` |
| `call_logs.db` | **NEW** — SQLite database (tự động tạo tại thư mục app) |
| `bot_fs.py` | **MODIFY** — thêm logging vào `/audio-stream`, `/rtvi-ws`, `/connect` |
| `react-c1/assets/index-*.js` | **MODIFY** — gửi phone + conversation_id lên `/connect` |

---

## 3. Database Schema

File: `call_logs.db` (tự động tạo, WAL mode)

```sql
CREATE TABLE call_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    phone           TEXT DEFAULT '',
    start_time      TEXT NOT NULL,       -- ISO 8601 UTC
    end_time        TEXT,                -- ISO 8601 UTC, NULL nếu chưa kết thúc
    duration_s      REAL,                -- giây, NULL nếu chưa kết thúc
    status          TEXT DEFAULT 'in_progress',  -- in_progress | completed
    transcript      TEXT DEFAULT ''       -- JSON array [{role, content}, ...]
);
```

### Mẫu dữ liệu

```
id | conversation_id | phone      | start_time                    | end_time                      | duration_s | status    | transcript
---+-----------------+------------+-------------------------------+-------------------------------+------------+-----------+-----------------------------------
1  | a1b2c3d4-...   | 0909835115 | 2026-07-19T06:17:33+00:00     | 2026-07-19T06:18:45+00:00     | 72.0       | completed | [{"role":"user","content":"Xin chào"}...
2  | f5e6d7c8-...   | 0912345678 | 2026-07-19T06:20:00+00:00     | 2026-07-19T06:20:15+00:00     | 15.0       | completed | [{"role":"user","content":"..."}]...
```

---

## 4. API Endpoint

### GET /api/calls?limit=10

Trả về danh sách N cuộc gọi gần nhất (JSON, tiếng Việt có dấu đầy đủ).

**Request:**
```bash
curl http://localhost:8086/api/calls?limit=5
```

**Response:**
```json
{
  "success": true,
  "calls": [
    {
      "id": 1,
      "conversation_id": "a1b2c3d4-...",
      "phone": "0909835115",
      "start_time": "2026-07-19T06:17:33+00:00",
      "end_time": "2026-07-19T06:18:45+00:00",
      "duration_s": 72.0,
      "status": "completed",
      "transcript": "[{\"role\": \"user\", \"content\": \"Xin chào\"}, ...]"
    }
  ]
}
```

---

## 5. Class call_logger.py

### CallLogger

| Method | Mô tả |
|--------|-------|
| `__init__(db_path)` | Mặc định `call_logs.db` tại thư mục app |
| `log_start(conversation_id, phone)` | INSERT row mới, `start_time=now UTC` |
| `log_end(conversation_id, status, transcript)` | UPDATE row cuối cùng có cùng conversation_id |
| `get_recent_calls(limit)` | Lấy N cuộc gọi gần nhất (list of dict) |

### extract_conversation()

```python
def extract_conversation(messages: list[dict]) -> str:
```

- Input: `LLMContext.messages` — list `[{role, content}, ...]`
- Lọc bỏ `role == "system"` và `role == "tool"`
- Format: JSON array `[{"role": "user", "content": "..."}, ...]`
- Output: JSON string (ensure_ascii=False — tiếng Việt có dấu)

---

## 6. Hướng dẫn sử dụng

### Xem call history

**Cách 1 — API (khuyên dùng):**
```bash
curl http://localhost:8086/api/calls | python3 -m json.tool
```

**Cách 2 — SQLite CLI:**
```bash
cd /opt/my_pipecat_ai/freeswitch_agent

# Tất cả cuộc gọi (dạng bảng gọn)
sqlite3 -header -column call_logs.db \
  "SELECT id, phone, start_time, duration_s, status FROM call_logs ORDER BY id DESC;"

# Xem transcript cuộc gọi gần nhất
sqlite3 call_logs.db \
  "SELECT transcript FROM call_logs ORDER BY id DESC LIMIT 1;" | cat
```

**Cách 3 — Trình duyệt:**
Mở `http://localhost:8086/api/calls` trong browser.

### Xoá log cũ (nếu cần)
```bash
# Xoá toàn bộ
sqlite3 call_logs.db "DELETE FROM call_logs;"

# Xoá log có duration dưới 10s (cuộc gọi lỗi)
sqlite3 call_logs.db "DELETE FROM call_logs WHERE duration_s < 10;"

# Vacuum để thu nhỏ file
sqlite3 call_logs.db "VACUUM;"
```

---

## 7. Chi tiết kỹ thuật

### Các frame được capture

Từ `LLMContext.messages` ở cuối call:
```python
# messages structure:
[
    {"role": "system", "content": "Bạn là trợ lý..."},     # → bỏ qua
    {"role": "user", "content": "Chào bạn"},               # → giữ lại
    {"role": "assistant", "content": "Chào bạn, tôi..."},  # → giữ lại
]
```

### Xử lý concurrent

- SQLite WAL mode: nhiều connection có thể ghi đồng thời
- Mỗi WebSocket handler tạo `CallLogger` instance riêng
- FreeSWITCH và React C1 có thể dùng đồng thời

### Xử lý lỗi

- Nếu `/connect` không nhận được body → trả về wsUrl không params → `/rtvi-ws` auto-generate conversation_id
- Nếu context là `None` (pipeline chưa kịp tạo) → bỏ qua transcript
- Nếu SQLite lỗi → log error, không ảnh hưởng pipeline

---

## 8. So sánh hai đường dẫn

| Tiêu chí | FreeSWITCH (L16) | React C1 (RTVI) |
|----------|:----------------:|:----------------:|
| WebSocket path | `/audio-stream` | `/rtvi-ws` |
| Nguồn phone | Query param từ Lua script | UI input → `/connect` POST |
| Nguồn conversation_id | `call_uuid` từ FS session | UI auto-generate UUID |
| Audio transport | L16 PCM JSON/Protobuf | RTVI Protobuf |
| Kiểu kết nối | SIP → mod_audio_stream | Browser → WebSocket |

---

## 9. Các vấn đề đã gặp và cách fix

### Vấn đề 1: Client JS không gửi phone và conversation_id

**Lỗi:** Dù UI có trường Phone Number và Conversation ID, client không gửi lên server — `POST /connect` không có body, WebSocket mở URL trần không params.

**Fix:** Sửa 3 chỗ trong file JS minified:
- `startBot(t)` → `startBot(t, r={})` — thêm body JSON vào POST
- `startBotAndConnect(t)` → `startBotAndConnect(t, e)` — pass params qua
- Call site: gửi `{phone: e.value.trim(), conversation_id: n.value.trim()}`

### Vấn đề 2: Tiếng Việt hiển thị dạng \uXXXX

**Lỗi:** `sqlite3` pipe qua `python3 -m json.tool` re-encode thành ASCII-safe.

**Fix:** Dùng API endpoint `/api/calls` thay vì SQLite CLI.

### Vấn đề 3: RTVI handler không có call logging

**Lỗi:** Call logging chỉ được thêm vào `/audio-stream`, `/rtvi-ws` không có.

**Fix:** Thêm cùng pattern (parse params → log_start → log_end) vào `/rtvi-ws`.

---

## 10. Mở rộng sau này

- **LLM summary**: Gọi LLM tóm tắt nội dung cuộc gọi dài thành vài dòng trước khi lưu
- **Filter/Search API**: `/api/calls?phone=xxx&date_from=...&date_to=...`
- **Auto-delete**: Xoá log cũ hơn N ngày tự động
- **Export CSV**: Button/endpoint tải call log dạng CSV
- **Thống kê**: Tổng số cuộc gọi, thời gian trung bình, top số điện thoại
