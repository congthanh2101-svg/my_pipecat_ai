# Transcript TikTok & YouTube - Lấy phụ đề miễn phí

Chrome extension lấy **phụ đề có sẵn** (thủ công hoặc tự động) của video TikTok VÀ YouTube
ngay trong trình duyệt — **không download video, không cần STT, không cần proxy**.

Cách làm này giống hệt transcript24.com: đọc caption có sẵn của video từ dữ liệu trang.

---

## Cài đặt (Chrome)

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc phải)
3. Bấm **Load unpacked** → chọn thư mục `tiktok_caption_ext/`
4. Extension "TikTok Transcript - Lấy phụ đề" xuất hiện ✅

## Cách dùng

**TikTok:**
1. Mở video TikTok (`https://www.tiktok.com/...`)
2. **BẬT phụ đề (CC)** trên video player trước — để TikTok tải caption track
3. Bấm nút nổi **📝 Lấy phụ đề** (góc phải trên)
4. Panel hiện transcript kèm timestamp → **Copy** hoặc **Tải .srt**

**YouTube:**
1. Mở video YouTube (`https://www.youtube.com/watch?v=...` hoặc `/shorts/...`)
2. Bấm nút nổi **📝 Lấy phụ đề** (YouTube tải captionTracks sẵn trong player response)
3. Panel hiện transcript kèm timestamp → **Copy** hoặc **Tải .srt**

> ⚠️ TikTok: **bật CC trước** rồi bấm nút. Nếu chưa bật, debug `[network:0 ...]`
> và đề xuất chế độ ghi CC.

### Nếu panel báo "Không lấy được phụ đề sẵn [debug]"
- Nhìn **số trong debug**: `network:X` = số caption track bắt được từ mạng.
- Nếu `network:0` → video chưa bật CC, hoặc video không có caption track.
- Fallback: bật CC rồi dùng **🎬 Bắt đầu ghi (CC)** → chơi video → ghi lời thoại.

---

## Cơ chế (4 nguồn, ưu tiên từ trên xuống)

| Nguồn | Mô tả | Yêu cầu |
|-------|-------|---------|
| **1. Chặn mạng (chính)** | `capture.js` → background dùng `chrome.scripting.executeScript({world:'MAIN'})` (bypass CSP của TikTok) patch `fetch`/`XHR` → bắt video-detail JSON (`captionInfos`) + caption track (SRT/VTT) | **Bật CC trước** |
| **2. Đọc dữ liệu trang** | Parse `__UNIVERSAL_DATA_FOR_REHYDRATION__` → tìm `captionInfos` (camelCase) | Video có phụ đề + track trong dữ liệu trang |
| **3. Resource cache** | Track còn trong `performance` cache nếu từng bật CC | Đã bật CC trước đó |
| **4. Ghi CC (fallback)** | Monitor phần tử caption hiển thị + `video.currentTime` khi chơi video | Video hiển thị CC khi bật |

### Lọc đúng video (quan trọng)
TikTok dùng `multi/aweme/detail` trả **nhiều video cùng lúc** (đang xem + gợi ý).
Extension thu thập **tất cả** `captionInfos`, so khớp **video ID đang xem** (từ URL)
trước → chưa rõ ID → nếu chỉ có video khác rõ ràng thì **không bắt nhầm**.
Debug hiện trong panel: `🎬 Video: <id> (đang xem: <id>)`.

### 🔓 Phát khi tab ẩn
TikTok tự dừng video khi tab không còn hoạt động (chuyển tab, thu nhỏ, bị che).
Trong panel bấm checkbox **"🔓 Phát khi tab ẩn"**:
- Báo `document.hidden`/`visibilityState`/`hasFocus` luôn là *visible* → TikTok
  không nhận ra tab ẩn → không tự dừng
- **Tự phát lại** mỗi ~0.8s nếu video bị dừng không phải do bạn bấm pause
  (tôn trọng thao tác pause thủ công trong 4s)
- Tắt checkbox → reload tab để gỡ patch
> Giới hạn cứng của trình duyệt (throttle tab nền) không gỡ được 100%, nhưng
> video có audio thường vẫn chạy nền — và phần TikTok tự dừng là đã gỡ được.

### ✏️ Sửa nhanh nội dung
**Click vào một dòng** để sửa chữa lỗi auto-caption ngay trong panel:
- **Enter** (hoặc click chỗ khác) → lưu; **Esc** → hủy
- Dòng đã sửa được đánh dấu vàng; **Copy / tải .srt dùng bản đã sửa**
- Chỉ trong phiên — đóng panel / reload là mất (chưa lưu vĩnh viễn)

### ▶ Bám dòng phát
Checkbox **"▶ Bám dòng phát"**: highlight + tự cuộn tới dòng ứng với
`video.currentTime` (kiểu CC/karaoke). Khi đang gõ sửa nội dung thì **không tự
cuộn** (tránh kéo dòng đi giữa chừng). Tắt/đóng panel → dừng hẳn.

> **Chỉnh độ trễ highlight** (trong `content.js`):
> - `SYNC_OFFSET_YOUTUBE_S = 2.0` — dời highlight sớm cho YouTube
> - `SYNC_OFFSET_TIKTOK_S = 1.0` — dời highlight sớm cho TikTok
> Nếu highlight nhảy **trễ** → tăng số; nhảy **sớm** → giảm số.

### ⏱ Ẩn giờ
Checkbox **"⏱ Ẩn giờ"** trong panel: ẩn `[0:00.0 – 0:02.0]` ở các
đoạn và **không kèm timestamp khi Copy**. Lựa chọn được lưu nhớ (`chrome.storage`).
> File `.srt` tải về vẫn luôn giữ timestamp (định dạng SRT bắt buộc).

### ⟳ Refresh phụ đề
Nút **⟳** (góc phải footer): tải lại phụ đề của **video đang xem** — dùng khi
qua video khác (SPA) mà panel vẫn hiện phụ đề cũ, hoặc muốn refresh lại caption.
> Lưu ý: Refresh tải caption mới → **mất bản sửa nội dung** trong phiên.

### 🖱️ Kéo di chuyển panel
Giữ chuột vào **thanh tiêu đề "📝 Lấy phụ đề"** và kéo panel tới vị trí bất kỳ
trong trình duyệt (tự clamp trong màn hình). Nút **✕** vẫn đóng bình thường.
Vị trí theo phiên — mở lại panel về góc mặc định.

### Diagnostics
Nếu không lấy được, panel báo rõ:
- `Capture: JSON(cap)/JSON(noCap)/SRT` — TikTok trả gì
- `⚠️ TikTok báo: video không có phụ đề (noCaptionReason: ...)` — video thật sự
  không có caption (uploader tắt / TikTok không tạo) → cần STT, ngoài phạm vi extension

> Fetch cross-origin (track nằm trên `*.tiktokcdn.com`) đi qua **background service
> worker** để tránh CORS — đã cấu hình `host_permissions` + `scripting` trong `manifest.json`.

---

## Cấu trúc

```
tiktok_caption_ext/
├── manifest.json     # MV3, quyền: scripting; host: tiktok + tiktokcdn + youtube + ytimg
├── background.js     # Service worker — executeScript MAIN world + fetch cross-origin
├── capture.js        # document_start — nhờ background inject interceptor
├── content.js        # Nút nổi + panel + 4 nguồn lấy phụ đề + parse SRT/VTT/JSON
└── icons/            # 16/48/128
```

## Giới hạn / Lưu ý

- Hoạt động trên **trang web TikTok + YouTube** (đã login là tốt nhất).
- Chất lượng phụ đề = chất lượng caption nền tảng cung cấp (auto-caption có
  thể sai từ).
- TikTok đổi cấu trúc dữ liệu thường xuyên — nếu Phương án 1 ngừng hoạt động,
  dùng chế độ **ghi CC** (luôn hoạt động nếu video hiển thị phụ đề).
