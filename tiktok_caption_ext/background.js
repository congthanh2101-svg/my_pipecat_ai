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
    const t = text.trimStart();
    if (t.startsWith('{') || t.startsWith('[')) {
      // TikTok dùng 'captionInfos' (camelCase) + subtitleType + noCaptionReason
      // → bắt cả trường hợp video KHÔNG có caption để hiển thị lý do
      if (text.includes('captionInfos') || text.includes('caption_infos') ||
          text.includes('subtitleType') || text.includes('noCaptionReason') ||
          text.includes('"subtitle"')) return true;
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j.body) || Array.isArray(j.data) || Array.isArray(j.events)) return true;
      } catch (e) {}
    }
    return false;
  }

  function shouldSniff(url, ct) {
    if (!url) return false;
    if (/(caption|subtitle|\.srt|\.vtt|\.ttml|webvtt)/i.test(url)) return true;
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
