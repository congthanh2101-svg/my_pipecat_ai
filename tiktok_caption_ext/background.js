// Service worker — fetch cross-origin + inject interceptor vào MAIN world
// (chrome.scripting.executeScript với world:'MAIN' bypass được CSP của TikTok,
//  khác với inject <script> inline bị chặn bởi CSP).

function interceptorFn() {
  // Chạy trong MAIN WORLD của trang — patch fetch/XHR thật của TikTok
  if (window.__tt_cap_int__) return;
  window.__tt_cap_int__ = true;

  const send = (data) => {
    try { window.postMessage({ __tt_capture: data }, '*'); } catch (e) {}
  };
  // Báo interceptor đã chạy (để content.js hiện debug int:true/false)
  send({ type: 'int' });

  function looksLikeCaption(text) {
    if (!text || typeof text !== 'string' || text.length < 8) return false;
    if (text.includes('-->')) return true;   // SRT / WebVTT
    if (/<text[\s>]/i.test(text)) return true; // YouTube timedtext XML
    const t = text.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) {
      // TikTok: captionInfos/subtitleType/noCaptionReason
      // YouTube: captionTracks (trong player response JSON)
      if (text.includes('captionInfos') || text.includes('caption_infos') ||
          text.includes('subtitleType') || text.includes('noCaptionReason') ||
          text.includes('"subtitle"') || text.includes('captionTracks')) return true;
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j.body) || Array.isArray(j.data) || Array.isArray(j.events)) return true;
      } catch (e) {}
    }
    return false;
  }

  function shouldSniff(url, ct) {
    if (!url) return false;
    if (/(caption|subtitle|\.srt|\.vtt|\.ttml|webvtt|timedtext|youtubei)/i.test(url)) return true;
    if (/json/i.test(ct || '')) return true;      // mọi response JSON
    if (/api\//i.test(url)) return true;          // mọi request API
    return false;
  }

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = async function (...args) {
      const resp = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        const ct = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || '';
        if (shouldSniff(url, ct)) {
          const text = await resp.clone().text();
          if (looksLikeCaption(text)) send({ url, text, at: Date.now() });
        }
      } catch (e) {}
      return resp;
    };
  }

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__tt_url = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    xhr.addEventListener('load', () => {
      try {
        const url = xhr.__tt_url || '';
        const ct = xhr.getResponseHeader('content-type') || '';
        if (shouldSniff(url, ct)) {
          const text = xhr.responseText || '';
          if (looksLikeCaption(text)) send({ url, text, at: Date.now() });
        }
      } catch (e) {}
    });
    return origSend.apply(this, args);
  };
}

// Mở khóa phát video khi tab ẩn — chạy trong MAIN WORLD
function unlockFn() {
  if (window.__tt_unlocked__) return;
  window.__tt_unlocked__ = true;

  // 1. Báo cho trang biết tab LUÔN "visible" → TikTok không tự dừng video
  try {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  } catch (e) {}
  try { document.hasFocus = () => true; } catch (e) {}

  // 2. Tự phát lại nếu video bị dừng không phải do người dùng
  let userPausedUntil = 0;
  document.addEventListener('pause', (e) => {
    const v = e.target;
    if (v && v.tagName === 'VIDEO' && navigator.userActivation && navigator.userActivation.isActive) {
      userPausedUntil = Date.now() + 4000; // user bấm pause — tôn trọng trong 4s
    }
  }, true);
  setInterval(() => {
    const v = document.querySelector('video');
    if (!v || v.ended || !v.paused) return;
    if (Date.now() < userPausedUntil) return;
    if (v.readyState >= 2) v.play().catch(() => {});
  }, 800);

  // 3. Báo cho content script biết đã kích hoạt
  try { window.postMessage({ __tt_unlock: true }, '*'); } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'INJECT_UNLOCK') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      injectImmediately: true,
      func: unlockFn,
    }).then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
  if (msg && msg.type === 'INJECT_MAIN') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      injectImmediately: true,
      func: interceptorFn,
    }).then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
  if (msg && msg.type === 'FETCH_URL') {
    fetch(msg.url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => sendResponse({ ok: true, text }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async
  }
});
