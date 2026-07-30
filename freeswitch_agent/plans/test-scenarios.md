# Kịch Bản Test — DTMF, Transfer Extension, CRM

## 1. DTMF Detection

### Test 1.1: DTMF tone "5" (trong phòng lab)
```bash
cd /opt/my_pipecat_ai/freeswitch_agent
python3 << 'EOF'
import numpy as np
from dtmf_detector import DTMFDetectorProcessor

proc = DTMFDetectorProcessor()

# Tạo tone DTMF cho digit 5 (770Hz + 1336Hz)
t = np.arange(960) / 8000
tone = (np.sin(2 * np.pi * 770 * t) + np.sin(2 * np.pi * 1336 * t)) * 8000
audio = tone.astype(np.int16).tobytes()

digit = proc._detect_dtmf(audio)
assert digit == "5", f"Expected '5', got {digit}"
print(f"✅ DTMF 5 detected: '{digit}'")

# Test tất cả digits
test_cases = [
    (697, 1209, "1"), (697, 1336, "2"), (697, 1477, "3"),
    (770, 1209, "4"), (770, 1336, "5"), (770, 1477, "6"),
    (852, 1209, "7"), (852, 1336, "8"), (852, 1477, "9"),
    (941, 1209, "*"), (941, 1336, "0"), (941, 1477, "#"),
]
for low, high, expected in test_cases:
    t = np.arange(960) / 8000
    tone = (np.sin(2 * np.pi * low * t) + np.sin(2 * np.pi * high * t)) * 8000
    digit = proc._detect_dtmf(tone.astype(np.int16).tobytes())
    status = "✅" if digit == expected else "❌"
    print(f"{status} DTMF {expected} ({low}+{high}Hz): '{digit}'")

print(f"\nStats: {proc.stats}")
EOF
```

### Test 1.2: Gọi SIP + bấm phím (thực tế)

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Gọi SIP vào số bot | Bot chào: "Xin chào..." |
| 2 | Bấm phím **0** trên điện thoại | Log: `🔢 DTMF detected: '0'` |
| 3 | | Bot nói: "Tôi sẽ chuyển máy cho nhân viên hỗ trợ..." |
| 4 | | Call vào queue `support@default` |
| 5 | Agent pick up | Caller + agent nói chuyện ✅ |

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Gọi SIP vào số bot | Bot chào |
| 2 | Bấm phím **#** | Log: `🔢 DTMF detected: '#'` |
| 3 | | Bot nói: "Tạm biệt..." |
| 4 | | Call kết thúc ✅ |

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Gọi SIP, bấm **1** trong khi bot đang nói | Log: `🔢 DTMF forwarded to LLM` |
| 2 | | Không transfer, không kết thúc |

---

## 2. Transfer to Extension

### Test 2.1: Tool handler (lab)
```bash
cd /opt/my_pipecat_ai/freeswitch_agent
python3 << 'EOF'
import sys; sys.path.insert(0, '.')
from fs_tools import create_transfer_extension_tool

handler = create_transfer_extension_tool(
    call_uuid="test-uuid-123",
    api_base_url="http://192.168.1.153:8443/api/v1",
    api_username="admin",
    api_password="Winter2024$",
)
print(f"✅ Handler created: {handler.__name__}")
print(f"✅ Docstring: {handler.__doc__[:80]}...")
EOF
```

### Test 2.2: Gọi SIP + yêu cầu chuyển máy (thực tế)

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Gọi SIP | Bot chào |
| 2 | Nói: "chuyển máy 101 cho tôi" | LLM detect intent → gọi `transfer_to_extension` |
| 3 | | Log: `🔄 Transfer to extension: call=xxx, ext=101` |
| 4 | | Bot nói: "Tôi sẽ chuyển máy đến số 101..." |
| 5 | | API: POST /calls/{uuid}/transfer → destination=101 |
| 6 | Máy 101 đổ chuông | Người ở máy 101 nghe máy → nói chuyện ✅ |

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Nói: "chuyển cho phòng kỹ thuật" | LLM suy luận → gọi `transfer_to_extension(extension="...")` |
| 2 | | Tuỳ LLM có biết extension phòng kỹ thuật không |

---

## 3. CRM Lookup

### Test 3.1: Tra cứu khách hàng (lab)
```bash
cd /opt/my_pipecat_ai/freeswitch_agent
python3 << 'EOF'
import sys; sys.path.insert(0, '.')
from crm_db import get_crm_db

db = get_crm_db()

print("=== Danh sách khách hàng ===")
for phone in ["0901234567", "0909876543", "0912345678", "0933445566",
               "0977889900", "0905112233", "0988776655", "0911223344"]:
    c = db.get_customer_by_phone(phone)
    if c:
        print(f"  {c['phone']} → {c['name']:20s} | Nợ: {c['debt']:>8,.0f}đ | Điểm: {c['loyalty_points']}")
    else:
        print(f"  {phone} → ❌ KHÔNG TÌM THẤY")

print("\n=== Tìm kiếm sản phẩm ===")
for q in ["iPhone", "laptop", "tai nghe", "sạc", "Loa"]:
    results = db.search_products(q)
    print(f"  '{q}': {len(results)} kết quả")
    for p in results[:2]:
        print(f"    - {p['name']:35s} | {p['price']:>8,.0f}đ | Tồn: {p['stock']}")

print("\n=== Tra cứu đơn hàng ===")
for phone in ["0901234567", "0988776655"]:
    orders = db.get_orders_by_phone(phone)
    print(f"  {phone}: {len(orders)} đơn hàng")
    for o in orders[:3]:
        print(f"    - {o['product_name']:30s} | {o['amount']:>8,.0f}đ | {o['status']}")

print("\n=== FAQ ===")
for q in ["bảo hành", "trả góp", "đổi trả", "giao hàng", "thanh toán"]:
    faqs = db.search_faq(q)
    print(f"  '{q}': {len(faqs)} kết quả")
    for f in faqs[:2]:
        print(f"    - {f['question'][:60]}")

print("\n✅ CRM test hoàn tất")
EOF
```

### Test 3.2: Gọi SIP + hỏi về khách hàng (thực tế)

| Câu hỏi | Tool được gọi | Kỳ vọng |
|---------|---------------|---------|
| "kiểm tra thông tin số 0901234567" | `lookup_customer(phone="0901234567")` | Bot: "Anh Nguyễn Văn An... dư nợ 0 đồng, tích luỹ 1200 điểm" |
| "số 0988776655 còn nợ bao nhiêu?" | `lookup_customer(phone="0988776655")` | Bot: "Mai Văn Giàu... không có dư nợ, đã chi tiêu 150 triệu" |
| "kiểm tra đơn hàng của 0901234567" | `check_orders(phone="0901234567")` | Bot: "3 đơn hàng: iPhone 15 Pro Max (đã giao), Apple Watch (đang giao), Sạc Anker (chờ xử lý)" |
| "số 0933445566 mua gì rồi?" | `check_orders(phone="0933445566")` | Bot: "2 đơn: Dell XPS 15 (đã giao), Chuột Logitech (đã giao)" |
| "có bán iPhone 16 không?" | `search_product(query="iPhone")` | Bot: "iPhone 16 Pro Max 256GB giá 34,990,000đ, còn 15 cái" |
| "laptop nào ngon?" | `search_product(query="laptop")` | Bot: "MacBook Air M4 29,990,000đ, Dell XPS 16 45,990,000đ, Lenovo ThinkPad..." |
| "chính sách đổi trả thế nào?" | `search_faq(query="đổi trả")` | Bot: "Đổi trả trong 7 ngày, sản phẩm còn nguyên hộp..." |
| "mua trả góp được không?" | `search_faq(query="trả góp")` | Bot: "Có thể trả góp qua thẻ tín dụng VISA, Mastercard..." |

### Test 3.3: FAQ Dynamics — bot tự học

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Hỏi: "cửa hàng ở đâu?" | Bot search FAQ → không có → Bot nói: "Chưa có thông tin" → gọi `save_faq(question="cửa hàng ở đâu?", answer="...")` |
| 2 | Kiểm tra DB: `sqlite3 data/crm.db "SELECT * FROM faq WHERE source='call';"` | Thấy bản ghi mới ✅ |
| 3 | Hỏi lại: "cửa hàng ở đâu?" (call khác) | Bot search FAQ → CÓ kết quả → Bot trả lời được ✅ |

---

## 4. Kịch Bản Tổng Hợp — Cuộc Gọi Mẫu

### Kịch bản 1: Hỗ trợ khách hàng + chuyển máy

```
Caller: "Alo, cho tôi hỏi về đơn hàng"
Bot:   "Dạ, anh/chị cho tôi xin số điện thoại đã đặt hàng ạ?"
Caller: "0901234567"
Bot:   (gọi lookup_customer → tìm thấy Nguyễn Văn An)
       "Dạ, anh An. Anh muốn kiểm tra đơn hàng nào ạ?"
Caller: "Đơn iPhone 15"
Bot:   (gọi check_orders) "Đơn iPhone 15 Pro Max 256GB đã giao ngày 15/05.
        Còn đơn Sạc dự phòng Anker đang chờ xử lý."
Caller: "Cho tôi gặp nhân viên tư vấn"
Bot:   (gọi transfer_to_agent) "Tôi sẽ chuyển máy cho nhân viên hỗ trợ..."
       (call vào queue → agent pick up)
```

### Kịch bản 2: Tư vấn sản phẩm + chuyển extension

```
Caller: "Cho tôi hỏi có laptop nào xịn không?"
Bot:   (gọi search_product(query="laptop"))
       "Dạ có MacBook Air M4 giá 30 triệu, Dell XPS 16 giá 46 triệu,
        và Lenovo ThinkPad giá 43 triệu."
Caller: "Cho tôi nói chuyện với phòng kỹ thuật"
Bot:   (gọi transfer_to_extension(extension="..."))
       "Tôi sẽ chuyển máy cho phòng kỹ thuật..."
```

### Kịch bản 3: Tra cứu nhanh bằng DTMF

```
Caller: Gọi vào bot, nghe greeting
Caller: Bấm phím 0  (không nói gì)
Bot:   (detect DTMF: 0) "Tôi sẽ chuyển máy cho nhân viên hỗ trợ..."
       → call vào queue
       
Hoặc:

Caller: Bấm phím #
Bot:   (detect DTMF: #) "Cảm ơn anh/chị, tạm biệt..."
       → call kết thúc
```

### Kịch bản 4: FAQ không có — bot tự học

```
Caller: "Có ship đi nước ngoài không?"
Bot:   (search_faq → không có)
       (save_faq: "Có ship đi nước ngoài không?" → "Chưa có thông tin, mời gọi 1900...")
       "Xin lỗi, tôi chưa có thông tin về vấn đề này.
        Tôi đã ghi nhận câu hỏi của anh/chị."
```

---

## 5. Kiểm Tra Nhanh API

```bash
# 1. Auth
TOKEN=$(curl -sk http://192.168.1.153:8443/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Winter2024$"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 2. Kiểm tra agent sẵn sàng
curl -sk "http://192.168.1.153:8443/api/v1/callcenter/agents" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# 3. Kiểm tra transfer extension API (fake UUID)
curl -sk -X POST "http://192.168.1.153:8443/api/v1/calls/test-uuid/transfer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"destination":"101","dialplan":"XML","context":"default"}'

# 4. Kiểm tra CRM
curl -sk "http://192.168.1.153:8443/api/v1/campaigns" \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Xem Log CRM

```bash
cd /opt/my_pipecat_ai/freeswitch_agent
sqlite3 data/crm.db -header -column \
  "SELECT c.name, c.phone, c.debt, c.loyalty_points FROM customers c ORDER BY c.total_spent DESC LIMIT 5"

sqlite3 data/crm.db "SELECT COUNT(*) as faq_count, source FROM faq GROUP BY source"
```
