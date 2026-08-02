# TikTok Transcript - Lấy phụ đề miễn phí

Chrome extension lấy **phụ đề có sẵn** (thủ công hoặc tự động) của video TikTok
ngay trong trình duyệt — **không download video, không cần STT, không cần proxy**.

Cách làm này giống hệt transcript24.com: đọc caption có sẵn của video từ dữ liệu trang.

---

## Cài đặt (Chrome)

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc phải)
3. Bấm **Load unpacked** → chọn thư mục `tiktok_caption_ext/`
4. Extension "TikTok Transcript - Lấy phụ đề" xuất hiện ✅

## Cách dùng

1. Mở 1 video TikTok bất kỳ (`https://www.tiktok.com/...`)
2. **BẬT phụ đề (CC)** trên video player trước (nút "CC") — để TikTok tải caption track
3. Bấm nút nổi **📝 Phụ đề TikTok** (góc phải trên)
4. Panel hiện transcript kèm timestamp → **Copy** hoặc **Tải .srt**

> ⚠️ Quan trọng: **bật CC trước**, rồi mới bấm nút lấy phụ đề — extension bắt
> caption track khi TikTok tải về. Nếu chưa bật CC, extension sẽ báo debug
> `[network:0 ...]` và đề xuất chế độ ghi CC.

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
├── manifest.json     # MV3, quyền: activeTab, storage; host: tiktok + tiktokcdn
├── background.js     # Service worker — fetch cross-origin cho content script
├── content.js        # Nút nổi + panel + 3 phương án lấy phụ đề + parse SRT/VTT/JSON
└── icons/            # 16/48/128
```

## Giới hạn / Lưu ý

- Chỉ hoạt động trên **trang TikTok web** (đã login là tốt nhất).
- Chất lượng phụ đề = chất lượng caption TikTok cung cấp (auto-caption có thể
  sai từ, giống YouTube).
- TikTok đổi cấu trúc dữ liệu thường xuyên — nếu Phương án 1 ngừng hoạt động,
  dùng chế độ **ghi CC** (luôn hoạt động nếu video hiển thị phụ đề).
