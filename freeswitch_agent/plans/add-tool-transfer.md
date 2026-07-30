# Tool Calling, DTMF, CRM & Transfer Extension
## Tai Lieu Kien Truc, Trien Khai & Huong Dan Su Dung

> **Cap nhat:** 2026-07-31  
> **Phien ban code:** fs_tools.py, dtmf_detector.py, dtmf_handler.py, crm_db.py, crm_tools.py, bot_fs.py, pipecat_ivr_inbound.lua  
> **Tac gia:** Claude Code

---

## 1. Tong Quan Cac Tinh Nang

| Tinh nang | Mo ta | Trang thai |
|-----------|-------|-----------|
| **Transfer Queue** | Chuyen cuoc goi den queue callcenter (support@default) | ✅ Hoat dong |
| **Transfer Extension** | Chuyen cuoc goi den so may le cu the | ✅ Hoat dong |
| **DTMF RFC2833** | Phim bam qua RTP events → Lua callback → API | ✅ Hoat dong |
| **DTMF SIP-INFO** | Phim bam qua SIP INFO → Lua callback → API | ✅ Hoat dong |
| **DTMF In-band** | Phim bam trong audio → FFT detect → pipeline | ✅ Hoat dong |
| **CRM Lookup** | Tra cuu khach hang, don hang, san pham, FAQ | ✅ Hoat dong |
| **CRM FAQ Dynamics** | Luu cau hoi moi tu cuoc goi, tu hoc cho lan sau | ✅ Hoat dong |

---

## 2. Kien Truc Tong The

### 2.1. So Do He Thong

```
                           ┌─────────────────────┐
                           │   FreeSWITCH         │
                           │  (mod_audio_stream)  │
                           │  pipecat_ivr_inbound │
                           │  .lua               │
                           └────┬────┬────┬───────┘
                                │    │    │
              ┌─────────────────┤    │    └──────────────────┐
              │ RFC2833/SIP-INFO│    │ In-band              │
              │ (setInputCallback)│  │ (audio stream)       │
              ▼                 │    ▼                      ▼
     ┌────────────────┐        │   ┌──────────────────────────┐
     │  Lua curl      │        │   │  FFT Detector            │
     │  POST/GET      │        │   │  (dtmf_detector.py)      │
     │  /dtmf-notify  │        │   └──────────┬───────────────┘
     └───────┬────────┘        │              │
             │                 │              │ InputDTMFFrame
             ▼                 │              ▼
     ┌────────────────┐        │   ┌──────────────────────────┐
     │  Bot HTTP      │        │   │  DTMFAggregator          │
     │  endpoint      │        │   │  (built-in Pipecat)      │
     │  -> direct     │        │   └──────────┬───────────────┘
     │  transfer      │        │              │ TranscriptionFrame
     └───────┬────────┘        │              ▼
             │                 │   ┌──────────────────────────┐
             ▼                 │   │  DTMFActionHandler       │
     ┌────────────────┐        │   │  (dtmf_handler.py)       │
     │  FS API Server │        │   │  0 -> transfer           │
     │  192.168.1.153 │        │   │  # -> end call           │
     │  :8443         │        │   └──────────────────────────┘
     └───────┬────────┘        │
             │                 │
             ▼                 ▼
     ┌─────────────────────────────────────────────────┐
     │            Callcenter Queue                      │
     │         support@default / sale_queue / tech_queue │
     │                                                 │
     │  Agent01 (1016) / Agent02 (1012) / ...          │
     └─────────────────────────────────────────────────┘
```

### 2.2. Danh Sach File

| File | Chuc nang | DONG |
|------|-----------|------|
| `bot_fs.py` | Server chinh: FastAPI endpoints, pipeline, DTMF notify, env vars | ~1979 |
| `fs_tools.py` | Transfer tools: queue, extension, JWT cache, HTTP client, cleanup | ~280 |
| `dtmf_detector.py` | FFT in-band detector + Queue poll processor | ~170 |
| `dtmf_handler.py` | DTMF action handler: 0→transfer, #→end call | ~70 |
| `crm_db.py` | CRM SQLite database: customers, orders, products, FAQ + seed | ~200 |
| `crm_tools.py` | 5 tool handlers: lookup, orders, products, FAQ, save | ~160 |
| `pipecat_ivr_inbound.lua` | FreeSWITCH Lua: DTMF callback (setInputCallback) | ~130 |
| `l16_serializer.py` | L16 PCM serializer + AGC + protobuf cho FS | ~340 |
| `ai_call_handler.lua` | Lua script cu (backup) | ~110 |
| `plans/add-tool-transfer.md` | Tai lieu nay | ~400 |

### 2.3. Bien Moi Truong

| Bien | Mac dinh | Mo ta |
|------|----------|-------|
| `FS_API_BASE_URL` | `http://192.168.1.153:8443/api/v1` | Base URL FS REST API |
| `FS_API_USERNAME` | `admin` | Username JWT auth |
| `FS_API_PASSWORD` | `Winter2024$` | Password JWT auth |
| `FS_API_QUEUE` | `support@default` | Queue dich |
| `FS_TRANSFER_CLEANUP_DELAY` | `8` | Delay (giay) truoc khi stop audio stream |
| `DTMF_ENABLED` | `true` | Bat/tat DTMF detection |
| `CRM_DB_PATH` | `data/crm.db` | Duong dan CRM database |

---

## 3. DTMF Detection (3 Mode)

### 3.1. Kien Truc

Co 3 co che phat hien DTMF hoat dong song song:

#### A. RFC2833 & SIP-INFO (qua Lua setInputCallback)

```
FreeSWITCH nhan DTMF (RFC2833/SIP-INFO)
  → Lua on_input(s, "dtmf", {digit="0"})
  → curl GET http://192.168.1.20:8086/dtmf-notify/{uuid}/{digit}
  → bot_fs.py: dtmf_notify_endpoint()
  → _execute_dtmf_transfer() duoc goi truc tiep
  → POST /api/v1/callcenter/queues/transfer/{uuid}
  → queue support@default ✅
```

#### B. In-band (qua FFT)

```
Audio stream (co tone DTMF in-band)
  → DTMFDetectorProcessor (numpy FFT)
  → InputDTMFFrame(button=KeypadEntry.ZERO)
  → DTMFAggregator (built-in Pipecat)
  → TranscriptionFrame("DTMF: 0")
  → DTMFActionHandler
  → _dtmf_transfer() → queue ✅
```

### 3.2. File: `pipecat_ivr_inbound.lua`

Lua script chay tren FreeSWITCH, chiu trach nhiem:
- Answer cuoc goi
- Start uuid_audio_stream den Pipecat bot
- Record cuoc goi
- Lang nghe DTMF qua `setInputCallback`
- Khi co phim bam: curl ve bot

```lua
-- Thiet lap DTMF mode
session:setVariable("rfc2833_dtmf_events", "true")
session:setVariable("inbound_dtmf_events", "true")
session:execute("set", "dtmfmode=inband")

-- Input callback (hoat dong voi MOI mode)
function on_input(s, input_type, obj)
    if input_type == "dtmf" and obj and obj.digit then
        os.execute(string.format(
            "curl -s -m 3 'http://192.168.1.20:8086/dtmf-notify/%s/%s' >/dev/null 2>&1 &",
            call_uuid, obj.digit))
    end
    return ""
end
session:setInputCallback("on_input")

-- Giu session song
while session:ready() do session:streamFile("silence_stream://-1") end
```

### 3.3. File: `dtmf_detector.py`

2 class processor:

| Class | Co che | Input | Output |
|-------|--------|-------|--------|
| `DTMFDetectorProcessor` | FFT numpy (in-band) | InputAudioRawFrame | InputDTMFFrame |
| `DTMFPollProcessor` | Queue (RFC2833/SIP-INFO) | asyncio.Queue | InputDTMFFrame |

### 3.4. File: `dtmf_handler.py`

`DTMFActionHandler` — FrameProcessor bat `TranscriptionFrame("DTMF: ...")`:

| Digit | Hanh dong |
|-------|-----------|
| `0` | Goi `_dtmf_transfer()` → queue support@default |
| `#` | Goi `_dtmf_end_call()` → stop stream + end call |
| Khac | Forward xuong LLM de xu ly (cho mo rong menu) |

---

## 4. Transfer Tools

### 4.1. File: `fs_tools.py`

| Ham | Chuc nang |
|-----|-----------|
| `create_transfer_tool()` | Tao handler cho queue transfer (callcenter) |
| `create_transfer_extension_tool()` | Tao handler cho extension transfer |
| `_ensure_token()` | Cache JWT token (24h), auto-refresh |
| `_call_transfer_api()` | POST /queues/transfer/{uuid} |
| `_call_transfer_extension_api()` | POST /calls/{uuid}/transfer |
| `_call_stop_audio_stream()` | POST /commands uuid_audio_stream stop |
| `_delayed_stop_audio()` | Stop stream sau delay (cho TTS noi goodbye) |

### 4.2. Transfer to Queue

```python
POST /api/v1/callcenter/queues/transfer/{call_uuid}
Body: {"queue_name": "support@default"}
```

Goi `uuid_transfer <uuid> callcenter:<queue> inline default` trong FS.

### 4.3. Transfer to Extension

```python
POST /api/v1/calls/{uuid}/transfer
Body: {"destination": "101", "dialplan": "XML", "context": "default"}
```

Goi `uuid_transfer <uuid> user/<ext> XML default` trong FS.

### 4.4. Cleanup Flow

Sau transfer, bot can stop `uuid_audio_stream` de ngat ket noi:

1. Bot schedule `_delayed_stop_audio()` voi delay `FS_TRANSFER_CLEANUP_DELAY` (default 8s)
2. Delay cho TTS noi xong goodbye
3. Goi `POST /api/v1/commands` voi `uuid_audio_stream <uuid> stop`
4. WebSocket dong → pipeline cleanup

**Bug fix:** Lua script KHONG duoc goi `uuid_audio_stream stop` vi se gay conflict.
(Lua cleanup da duoc comment bo: `-- api:executeString(...)`)

---

## 5. CRM & Knowledge Base

### 5.1. File: `crm_db.py`

SQLite database voi 4 bang:

```sql
customers (8 records)   — phone, name, debt, total_spent, loyalty_points
orders (18 records)     — customer_id, product_name, amount, status
products (15 records)   — name, category, price, stock, description
faq (10 records)        — question, answer, category, source
```

Seed data tu tao lan dau khi DB chua ton tai.

### 5.2. File: `crm_tools.py`

5 direct function handlers cho Pipecat LLM:

| Tool | Chuc nang |
|------|-----------|
| `lookup_customer(phone)` | Tra cuu KH theo SDT: ten, du no, diem thuong |
| `check_orders(phone)` | Kiem tra don hang theo SDT |
| `search_product(query)` | Tim san pham theo ten/danh muc |
| `search_faq(query)` | Tim cau hoi thuong gap |
| `save_faq(question, answer)` | Luu cau hoi moi (hoc tu cuoc goi) |

### 5.3. 2 He Thong KB Song Song

| He thong | Luu tru | Co che | Dung cho |
|----------|---------|--------|----------|
| **RAG cu** (knowledge_base.py) | ChromaDB | Vector search (tu dong) | Kien thuc noi bo (cong ty, chinh sach) |
| **CRM moi** (crm_db.py) | SQLite | Tool calling (chu dong) | Customer, order, product, FAQ |

---

## 6. Pipeline Hoan Chinh

```
transport.input()
  → DTMFDetectorProcessor           (FFT in-band)
  → DTMFPollProcessor               (queue tu /dtmf-notify)
  → VAD (SileroVADAnalyzer)
  → STT (Whisper|VietASR|Gipformer)
  → HallucinationFilter
  → DTMFAggregator                  (InputDTMFFrame → TranscriptionFrame)
  → DTMFActionHandler               (0→transfer, #→end)
  → user_agg (LLMUserAggregator)
  → RAGProcessor                    (optional, ChromaDB)
  → llm (Ollama|Deepseek)
    [tools: transfer_to_agent, transfer_to_extension,
     lookup_customer, check_orders, search_product, search_faq, save_faq]
  → MarkdownStripper
  → PronunciationNormalizer         (optional)
  → tts (Piper|OmniVoice)
  → ThinkingDelayProcessor          (800ms)
  → TTSAudioProcessor               (resample 22050→8kHz)
  → transport.output()
  → assistant_agg
```

---

## 7. FS REST API Endpoints Su Dung

| Method | Endpoint | Muc dich |
|--------|----------|----------|
| `POST` | `/api/v1/auth/token` | JWT authentication |
| `POST` | `/api/v1/callcenter/queues/transfer/{call_uuid}` | Transfer to queue |
| `POST` | `/api/v1/calls/{uuid}/transfer` | Transfer to extension |
| `POST` | `/api/v1/commands` | Raw FS command (uuid_audio_stream stop) |

---

## 8. So Dien Thoai CRM

| SDT | Ten | Ghi chu |
|-----|-----|---------|
| 0901234567 | Nguyen Van An | VIP, chi 45tr |
| 0909876543 | Tran Thi Binh | No 2.5tr |
| 0912345678 | Le Van Cuong | Chi 89tr, 2500 diem |
| 0933445566 | Pham Thi Dung | VIP, no 1.5tr |
| 0977889900 | Hoang Van Em | Moi, chi 5.5tr |
| 0905112233 | Do Thi Phuong | No 500k |
| 0988776655 | Mai Van Giau | **Than thiet nhat**, chi 150tr, 5000 diem |
| 0911223344 | Vu Thi Hanh | Chi 7.2tr |

---

## 9. Huong Dan Su Dung

### Chay bot

```bash
cd /opt/my_pipecat_ai/freeswitch_agent
source .venv/bin/activate

# Mac dinh (Whisper STT + Ollama LLM + Piper TTS)
python3 bot_fs.py

# Lựa chon STT
STT_PROVIDER=gipformer python3 bot_fs.py
STT_PROVIDER=vietasr python3 bot_fs.py

# Lựa chon TTS
TTS_ENGINE=omnivoice python3 bot_fs.py

# Lựa chon LLM
LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=sk-xxx python3 bot_fs.py
```

### Kich ban test

```bash
# 1. Goi SIP vao bot → bot chao
# 2. DTMF 0 → bot nhan → transfer vao queue → agent pick up
# 3. "chuyen may 101" → LLM goi transfer_to_extension → extension 101 do chuong
# 4. "kiem tra thong tin so 0901234567" → CRM lookup
# 5. "co ban iPhone khong?" → search product
# 6. "chinh sach bao hanh?" → search FAQ
# 7. DTMF # → bot noi tam biet → call ket thuc
```

### Kiem tra CRM

```bash
cd /opt/my_pipecat_ai/freeswitch_agent
sqlite3 data/crm.db -header -column \
  "SELECT name, phone, debt, loyalty_points FROM customers"

sqlite3 data/crm.db -header -column \
  "SELECT count(*) as faqs, source FROM faq GROUP BY source"
```

---

## 10. Thong Tin FS Server

- **Host:** 192.168.1.153 (fs-ubt23)
- **FS API:** http://localhost:8443/api/v1
- **Auth:** JWT (admin / Winter2024$)
- **FS version:** 1.10.13-dev (git 2025-11-21)
- **Queues:** support@default, tech_queue, sale_queue
- **Agents:** Agent01(1016), Agent02(1012), Agent03-10
- **ESL:** 127.0.0.1:8021 / ClueCon
- **DTMF endpoints:** /api/v1/calls/{uuid}/dtmf/start|poll|stop
- **DTMF collector:** Da thread subscribing DTMF events (ESL)
