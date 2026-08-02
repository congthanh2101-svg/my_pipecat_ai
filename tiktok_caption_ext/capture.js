// capture.js — chạy ở document_start (isolated world)
// ===================================================
// Nhờ background dùng chrome.scripting.executeScript({world:'MAIN'}) để inject
// interceptor patch window.fetch/XHR của trang (bypass CSP — script inline bị
// TikTok chặn). Interceptor bắt response chứa phụ đề → postMessage về đây →
// lưu vào window.__TT_CAPTURED__ cho content.js đọc khi bấm nút.

(() => {
  if (window.__TT_CAPTURED__) return; // đã khởi tạo
  window.__TT_CAPTURED__ = [];
  window.__TT_INT__ = false; // interceptor đã chạy trong main world chưa

  // Nhận capture từ main-world interceptor
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.__tt_capture) return;
    if (d.__tt_capture.type === 'int') {
      window.__TT_INT__ = true;
    } else {
      window.__TT_CAPTURED__.push(d.__tt_capture);
    }
  });

  // Nhờ background inject interceptor vào MAIN world
  try {
    chrome.runtime.sendMessage({ type: 'INJECT_MAIN' }, () => {});
  } catch (e) {
    // nếu background chưa sẵn sàng, thử lại
    setTimeout(() => {
      try { chrome.runtime.sendMessage({ type: 'INJECT_MAIN' }, () => {}); } catch (e2) {}
    }, 300);
  }
})();
