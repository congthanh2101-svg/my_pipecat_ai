# TikTok Downloader

Trang web tải video TikTok **không logo (watermark)**, tải MP3, slideshow — kiến trúc **backend proxy** (phương án B đã duyệt).

## Kiến trúc

```
Browser ── link ──► GET /api/analyze ──► tikwm.com (primary, retry 10×/1.2s)
   │  ◄── JSON media URLs (play/wmplay/music/images/cover/title/author)
   │
   └──► <a href="/api/download?url=<media>&filename=<name>">
            ──► server proxy stream CDN ──► file MP4/MP3 về máy
```

- Video **không lưu trên server** — stream trực tiếp từ CDN.
- `/api/download` có **SSRF allowlist** (chỉ proxy tới host CDN TikTok + provider).
- Download dạng Blob trong browser (như snaptik) sẽ bị CORS chặn → phải qua proxy server (lý do chọn phương án B).

## Chạy

```bash
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
# hoặc: .venv/bin/python -m app.main
```

Mở http://localhost:8000

## Test

```bash
.venv/bin/python -m pytest
```

## API

| Endpoint | Mô tả |
|---|---|
| `GET /api/analyze?url=<link>` | Phân tích link (short link `vt.tiktok.com` OK) → JSON media |
| `GET /api/download?url=<media>&filename=<name>` | Proxy stream file về client (allowlist host) |
| `GET /health` | Health check |

## Trạng thái

- **Phase 1 ✅**: analyze (tikwm) + download proxy (allowlist) + frontend MVP — đã test end-to-end với video thật.
- **Phase 2 ⏳**: fallback d.zcdn.top, oembed metadata, cache + rate-limit, xử lý lỗi tinh tế.
- **Phase 3 ⏳**: slideshow ảnh đầy đủ, progress bar, tối ưu di động.
- **Phase 4 ⏳**: trang SEO tĩnh + i18n vi/en + PWA + dark mode.

> Dịch vụ không liên kết với ByteDance/TikTok. Chỉ dùng cho mục đích cá nhân.
