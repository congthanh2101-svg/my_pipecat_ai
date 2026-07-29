---
name: project-pipecat-ai-client
description: "Pipecat AI Client web app - architecture, event flow, and fixes applied"
metadata: 
  node_type: memory
  type: project
  originSessionId: cffd3ca3-95ee-4f82-96a3-e10477a69390
---

# Pipecat AI Client — Project Notes

## Architecture

Đây là ứng dụng web **React C2 Pipecat AI Client** — giao tiếp real-time voice AI qua WebSocket sử dụng **RTVI-like protocol** (Pipecat variant). Được build bằng Vite + Vanilla TypeScript (single-page app, không framework).

### Files
- `index.html` — main HTML, UI structure, chat bar inline script
- `assets/index-BCv1OZq-.css` — minified CSS bundle
- `assets/index-rIARzXse.js` — minified JS bundle (source: Vite + TS)
- `audio-processor.js` — AudioWorklet processor for mic capture

### Cấu trúc JS bundle (class chính)
| Class | Purpose |
|---|---|
| `_` | WebSocket RTVI client — connect, send/receive binary + text messages |
| `J` | Audio capture + playback via AudioWorklet/ScriptProcessor |
| `K` | Debug Log UI (console-like) |
| `Y` | Settings manager |
| Các hàm `l`, `x`, `R`, ... | DOM helpers (tạo element, query selector, transcript rendering) |

---

## Server Event Flow (Pipecat-specific, NOT standard RTVI)

Server gửi các event sau qua WebSocket (binary RTVI frame):

### Message types discovered
| Type | When | Xử lý |
|---|---|---|
| `bot-ready` | Bot sẵn sàng | Hiển thị "Ready to chat." |
| `user-transcription` | User nói xong, STT trả về | Hiển thị text của user |
| `bot-llm-started` | LLM bắt đầu generate | Reset state, chuẩn bị accumulate |
| `bot-llm-text` | **Từng token riêng lẻ** từ LLM | Accumulate vào `_botText`, **không hiển thị** |
| `bot-transcription` | **Partial text** từ bot (nhiều lần) | **Bỏ qua**, không hiển thị |
| `bot-llm-stopped` | LLM generate xong | **Hiển thị** `_botText` thành **1 entry duy nhất** |
| `bot-tts-started` | Bot bắt đầu nói (TTS) | Log |
| `bot-tts-stopped` | Bot nói xong | Log |

### Khác biệt so với RTVI chuẩn
- Server **không** gửi `bot-output`, `bot-started-speaking`, `bot-stopped-speaking`
- Server dùng **Pipecat-specific** events: `bot-llm-text`, `bot-transcription`, `bot-llm-started`, `bot-llm-stopped`
- `bot-llm-text` gửi từng token riêng lẻ (character/subword level)
- `bot-transcription` gửi **nhiều lần** với text chưa hoàn chỉnh
- `bot-llm-stopped` là tín hiệu duy nhất cho biết câu đã hoàn chỉnh

---

## Các Fix đã áp dụng

### Fix 1: Bot response không hiển thị trong Conversation
**Root cause**: Code chỉ xử lý `bot-output` (RTVI standard), nhưng server gửi `bot-llm-text` + `bot-transcription` (Pipecat events). Các event này rơi vào `default` case và được `R("bot", text)` tạo entry riêng cho mỗi message.

**Fix**: Thêm handlers cho `bot-llm-started`, `bot-llm-text`, `bot-transcription`, `bot-llm-stopped`.

### Fix 2: Bot response hiện quá nhiều entry (từng token)
**Root cause**: Mỗi `bot-llm-text` (token riêng lẻ) và `bot-transcription` (partial text) đều được thêm vào transcript.

**Fix**: 
- `bot-llm-text` → **accumulate** vào biến `_botText`
- `bot-transcription` → **ignore**
- `bot-llm-stopped` → show `_botText` thành **1 entry duy nhất**

### Fix 3: Chat message không hiện trong Conversation
**Root cause**: Hàm `sendChat` trong `index.html` chỉ POST lên server, không thêm vào transcript.

**Fix**: Gọi `window.addTranscript('user', text)` sau khi gửi chat. Xuất hàm `R` ra global: `window.addTranscript=R`.

### Fix 4: Chiều cao khung Conversation không giảm
**Root cause**: Trong JS có `h.style.height = Math.max(y - 80, 200) + "px"` ghi đè CSS `height: 450px`.

**Fix**: Đổi thành `h.style.height = "315px"` (70% của 450px).

### Fix 5: Debug Log quá nhiều
- Bỏ log `Received: ...` trong `handleBinaryMessage`
- Bỏ log `Bot token: ...` trong `bot-llm-text`
- Bỏ log `Bot partial: ...` trong `bot-transcription`
- Chỉ giữ: `Bot LLM started`, `Bot LLM stopped`, `Bot: "..."`

---

## Code Patterns

### accumulate + show on done
```
bot-llm-started → reset _botText, _botNewEntry = true
bot-llm-text   → _botText += token (silent accumulate)
bot-llm-stopped → show _botText as 1 entry
```

### `_botNewEntry` flag
- `_botNewEntry = true`: tạo entry mới
- `_botNewEntry = false`: cập nhật entry cuối
- Reset `= true` ở `user-transcription` (khi user nói → lượt mới)

### Lưu ý khi edit file minified
- Mỗi `break` phải kèm `;` hoặc `}` để tránh `breakcase` (dính liền)
- Dùng `JSON.stringify()` thay vì template literals `${}` để tránh lỗi xuống dòng
- Verify syntax với `node --check` sau mỗi lần edit
