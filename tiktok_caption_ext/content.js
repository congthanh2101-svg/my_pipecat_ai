// TikTok Transcript - Lấy phụ đề miễn phí từ video TikTok
// ========================================================
// Cơ chế (theo thứ tự ưu tiên):
//   1. Đọc __UNIVERSAL_DATA_FOR_REHYDRATION__ trong trang → tìm caption tracks
//      (video có phụ đề thủ công / tự động sẽ có sẵn trong dữ liệu trang)
//   2. Kiểm tra resource cache (nếu user đã bật CC trước đó)
//   3. Fallback: DOM capture — bật CC trên video, chơi video, ghi lại dòng chữ
//
// Mọi fetch cross-origin (caption track trên *.tiktokcdn.com) đều đi qua
// background service worker để tránh CORS.

(() => {
  if (window.__TT_CAPTION_EXT__) return; // tránh inject 2 lần
  window.__TT_CAPTION_EXT__ = true;

  const PREFERRED_LANGS = ['vi', 'en', 'zh-Hans', 'auto'];
  const MAX_DEPTH = 10;

  // ── Tiện ích ──────────────────────────────────────────────────────────────
  function fetchViaBackground(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'FETCH_URL', url }, (resp) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(resp || { ok: false, error: 'no response' });
      });
    });
  }

  // Nhận diện mảng caption tracks: items có url/baseUrl + lang
  // (TikTok: url; YouTube: baseUrl)
  function isCaptionArray(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    const it = arr[0];
    if (typeof it !== 'object' || it === null) return false;
    const url = it.url || it.Url || it.baseUrl || '';
    if (typeof url !== 'string') return false;
    const hasLang = !!(it.language_code || it.languageCode || it.lang || it.language_name || it.language);
    return hasLang || /\.(srt|vtt|ttml)$/i.test(url);
  }

  // Tìm TẤT CẢ caption tracks trong object + ID video sở hữu (đệ quy).
  // TikTok dùng multi/aweme/detail (nhiều video cùng response) → phải thu thập
  // hết, rồi pickContext chọn đúng video đang xem.
  function findCaptionContexts(obj, currentId = '', depth = 0, out = []) {
    if (!obj || depth > MAX_DEPTH) return out;
    const id = obj.aweme_id || obj.awemeId || obj.videoId ||
               (obj.videoDetails && obj.videoDetails.videoId) || obj.id || currentId;
    if (Array.isArray(obj)) {
      if (isCaptionArray(obj)) {
        out.push({ tracks: obj, videoId: id });
        return out;
      }
      for (const item of obj) findCaptionContexts(item, id, depth + 1, out);
      return out;
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (['caption_infos', 'captionInfos', 'captionTracks', 'subtitle', 'captions', 'caption_list'].includes(k)) {
          const v = obj[k];
          if (Array.isArray(v) && v.length) out.push({ tracks: v, videoId: id });
        }
      }
      for (const k of Object.keys(obj)) findCaptionContexts(obj[k], id, depth + 1, out);
    }
    return out;
  }

  // ID video đang xem từ URL
  // TikTok:  /@user/video/<số>   |   YouTube: /watch?v=<id> hoặc /shorts/<id>
  function currentVideoId() {
    const tt = window.location.pathname.match(/\/video\/(\d+)/);
    if (tt) return tt[1];
    if (/youtube\.com/i.test(window.location.hostname)) {
      try {
        const v = new URL(window.location.href).searchParams.get('v');
        if (v) return v;
      } catch (e) {}
      const s = window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
      if (s) return s[1];
    }
    return '';
  }

  // Lọc context theo video đang xem: khớp ID → chưa rõ ID → KHÔNG dùng video khác
  function pickContext(list, currentId) {
    if (!currentId) return list[0] || null;
    const exact = list.find((c) => c.videoId === currentId);
    if (exact) return exact;
    // Context không xác định được ID — có thể chính là video đang xem
    const unknown = list.filter((c) => !c.videoId);
    if (unknown.length) return unknown[0];
    return null; // chỉ có video khác rõ ràng → không lấy nhầm
  }

  function readRehydrationData() {
    // 1. Global
    if (window.__UNIVERSAL_DATA_FOR_REHYDRATION__) {
      return findCaptionContexts(window.__UNIVERSAL_DATA_FOR_REHYDRATION__);
    }
    // 2. Script tag
    const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (el && el.textContent) {
      try {
        return findCaptionContexts(JSON.parse(el.textContent));
      } catch (e) { /* bỏ qua */ }
    }
    // 3. SIGI_STATE (TikTok)
    if (window.SIGI_STATE) return findCaptionContexts(window.SIGI_STATE);
    // 4. ytInitialPlayerResponse (YouTube) — chứa captionTracks
    if (window.ytInitialPlayerResponse) return findCaptionContexts(window.ytInitialPlayerResponse);
    return [];
  }

  // Tìm caption track đã load trong resource cache
  function findFromResourceCache() {
    const entries = performance.getEntriesByType('resource');
    for (const e of entries) {
      if (/(caption|subtitle|\.srt|\.vtt|\.ttml|timedtext)/i.test(e.name)) {
        return [{ url: e.name, language_code: 'auto' }];
      }
    }
    return null;
  }

  // Parse SRT / VTT → segments [{start, end, text}]
  function parseSrtVtt(text) {
    const segments = [];
    const blocks = text.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const timeIdx = lines.findIndex((l) => l.includes('-->'));
      if (timeIdx < 0) continue;
      const m = lines[timeIdx].match(
        /(\d{1,2}):(\d{2}):(\d{2})[,.](\d+)\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d+)/
      );
      if (!m) continue;
      const ts = (a, b, c, d) => +a * 3600 + +b * 60 + +c + +d / 1000;
      let txtLines = lines.slice(timeIdx + 1);
      if (txtLines.length && /^\d+$/.test(txtLines[0])) txtLines = txtLines.slice(1);
      const text = txtLines.join(' ').replace(/<[^>]+>/g, '').trim();
      if (text) {
        segments.push({
          start: ts(m[1], m[2], m[3], m[4]),
          end: ts(m[5], m[6], m[7], m[8]),
          text,
        });
      }
    }
    return segments;
  }

  // Parse TikTok JSON caption {"body":[{"from":ms,"to":ms,"content":"..."}]}
  function parseTiktokJson(text) {
    try {
      const data = JSON.parse(text);
      const arr = data.body || data.data || data.events || null;
      if (Array.isArray(arr)) {
        return arr
          .map((e) => {
            const from = e.from !== undefined ? e.from : e.tStartMs || e.start || 0;
            const to = e.to !== undefined ? e.to : e.dDurationMs ? (e.tStartMs || 0) + e.dDurationMs : e.end || from;
            const content = (e.content || e.text || (e.segs ? e.segs.map((s) => s.utf8).join('') : ''))
              .replace(/<[^>]+>/g, '').trim();
            if (!content) return null;
            return { start: from / 1000, end: to / 1000, text: content };
          })
          .filter(Boolean);
      }
    } catch (e) { /* không phải JSON */ }
    return null;
  }

  function parseCaption(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const jsonSegs = parseTiktokJson(trimmed);
      if (jsonSegs && jsonSegs.length) return jsonSegs;
      // JSON nhưng không phải định dạng body → có thể data chứa SRT string
      try {
        const obj = JSON.parse(trimmed);
        const srt = obj.data;
        if (typeof srt === 'string' && srt.includes('-->')) return parseSrtVtt(srt);
      } catch (e) { /* bỏ qua */ }
    }
    if (trimmed.includes('-->')) return parseSrtVtt(trimmed);
    return [];
  }

  // ── Diagnostics: mô tả các capture đã bắt được ────────────────────────────
  function describeCaptures(captured) {
    return (captured || []).map((c) => {
      const t = c.text || '';
      if (t.includes('-->')) return 'SRT';
      const tr = t.trimStart();
      if (tr.startsWith('{') || tr.startsWith('[')) {
        if (t.includes('captionInfos') || t.includes('caption_infos')) return 'JSON(cap)';
        if (t.includes('noCaptionReason')) return 'JSON(noCap)';
        return 'JSON';
      }
      return '?';
    }).join(', ');
  }

  // Tìm noCaptionReason (lý do TikTok không có phụ đề) trong JSON
  function findNoCaptionReason(text) {
    try {
      const j = JSON.parse(text);
      let reason = null;
      (function walk(o, d) {
        if (reason || d > 8 || !o) return;
        if (typeof o === 'object') {
          if (o.noCaptionReason) { reason = String(o.noCaptionReason); return; }
          for (const k of Object.keys(o)) walk(o[k], d + 1);
        }
      })(j, 0);
      return reason;
    } catch (e) { return null; }
  }

  // ── UI: nút nổi + panel ────────────────────────────────────────────────────
  const css = `
    .ttcap-btn{position:fixed;top:16px;right:16px;z-index:99999;background:linear-gradient(135deg,#fe2c55,#ff5f6d);
      color:#fff;border:none;border-radius:24px;padding:10px 16px;font:600 13px/1 system-ui;cursor:pointer;
      box-shadow:0 4px 16px rgba(254,44,85,.4);display:flex;align-items:center;gap:6px;transition:transform .15s;}
    .ttcap-btn:hover{transform:scale(1.05)}
    .ttcap-panel{position:fixed;top:56px;right:16px;z-index:99999;width:400px;max-width:calc(100vw - 32px);
      max-height:70vh;background:#111;color:#eee;border:1px solid #333;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5);
      display:flex;flex-direction:column;font:14px/1.5 system-ui;overflow:hidden}
    .ttcap-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #222;font-weight:600;background:#1a1a1a;cursor:move;user-select:none;touch-action:none}
    .ttcap-close{margin-left:auto;background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;line-height:1}
    .ttcap-body{overflow:auto;padding:12px 14px;flex:1}
    .ttcap-seg{display:flex;gap:10px;margin-bottom:6px;padding:6px 8px;border-radius:6px;background:#1a1a1a}
    .ttcap-time{color:#fe2c55;font:12px/1.5 ui-monospace,monospace;white-space:nowrap;padding-top:2px;min-width:92px}
    .ttcap-text{color:#eee}
    .ttcap-loading{color:#999;text-align:center;padding:20px 0}
    .ttcap-note{color:#ffb02e;font-size:13px;margin:8px 0;padding:8px 10px;background:#2a2110;border-radius:6px}
    .ttcap-foot{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #222;background:#1a1a1a}
    .ttcap-opt{display:flex;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid #222;background:#151515;font-size:13px;color:#ccc}
    .ttcap-opt input{accent-color:#fe2c55;width:15px;height:15px;cursor:pointer}
    .ttcap-hide-time .ttcap-time{display:none}
    .ttcap-dragging{opacity:.9}
    .ttcap-dragging *{user-select:none!important}
    .ttcap-text{cursor:text}
    .ttcap-text:focus{outline:1px solid #fe2c55;border-radius:3px;background:#222}
    .ttcap-seg.edited{background:#2a1f12}
    .ttcap-seg.edited .ttcap-text{color:#ffd700}
    .ttcap-seg.active{background:rgba(254,44,85,.15);box-shadow:inset 3px 0 0 #fe2c55}
    .ttcap-foot button{flex:1;padding:8px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px}
    .ttcap-copy{background:#fe2c55;color:#fff}
    .ttcap-dl{background:#333;color:#eee}
    .ttcap-dom{background:#25f4ee;color:#000}
    .ttcap-refresh{flex:0 0 auto;background:#333;color:#eee;padding:8px 10px}
    .ttcap-refresh:disabled{opacity:.5;cursor:wait}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.documentElement.appendChild(style);

  const btn = document.createElement('button');
  btn.className = 'ttcap-btn';
  btn.textContent = '📝 Lấy phụ đề';
  btn.title = 'Lấy phụ đề miễn phí của video TikTok/YouTube này';
  document.documentElement.appendChild(btn);

  let panel = null;
  let domCaptureActive = false;
  let unlockActive = false; // mở khóa phát khi tab ẩn (main-world script báo về)
  let hideTimes = false; // ẩn mốc thời gian trong panel/copy
  let syncPlay = false; // đồng bộ dòng đang phát (highlight + auto-scroll)
  let syncTimer = null;
  let lastSyncTime = null; // currentTime lần poll trước — để phát hiện video loop/restart
  const SYNC_INTERVAL_MS = 100; // poll video.currentTime (100ms = bám sát hơn)
  const SYNC_PAGE_ROWS = 6;     // mỗi lần chạm đáy → cuộn xuống 6 dòng
  // Dời highlight SỚM hơn N giây để khớp âm thanh — chỉnh RIÊNG từng nền tảng
  const SYNC_OFFSET_YOUTUBE_S = 2.0; // YouTube: bạn đã chốt 2.0 là vừa
  const SYNC_OFFSET_TIKTOK_S = 0.5;  // TikTok: 2.0 quá nhanh → thử 1.0, chỉnh tiếp nếu cần
  const IS_YT = /youtube\.com/i.test(window.location.hostname);

  // Nạp lựa chọn đã lưu
  try {
    chrome.storage.local.get({ hideTimes: false }, (o) => { hideTimes = !!o.hideTimes; });
  } catch (e) {}

  // Nhận tín hiệu từ main-world unlock script
  window.addEventListener('message', (e) => {
    if (e.data && e.data.__tt_unlock) unlockActive = true;
  });

  // Chặn phím tắt video player khi đang sửa ô nội dung (contentEditable).
  // YouTube bắt keydown/keyup trên document ở CAPTURE phase — chạy TRƯỚC
  // listener ở target, nên e.stopPropagation() trong ô sửa là quá trễ.
  // → Bắt capture trên window (chạy trước document capture) + stopImmediatePropagation.
  // KHÔNG preventDefault để vẫn gõ được chữ. Enter/Escape/Tab để ô sửa xử lý
  // (Enter lưu, Esc hủy, Tab blur).
  function blockPlayerShortcutsWhileEditing(e) {
    const ce = document.activeElement;
    if (!(ce && ce.isContentEditable && ce.closest('.ttcap-panel'))) return;
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') return;
    e.stopImmediatePropagation();
  }
  window.addEventListener('keydown', blockPlayerShortcutsWhileEditing, true);
  window.addEventListener('keyup', blockPlayerShortcutsWhileEditing, true);

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = (s - m * 60).toFixed(1);
    return `${m}:${sec.padStart(4, '0')}`;
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'ttcap-panel';
    panel.innerHTML = `
      <div class="ttcap-head">📝 Lấy phụ đề <button class="ttcap-close">✕</button></div>
      <div class="ttcap-body"></div>
      <div class="ttcap-opt">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;width:100%">
          <input type="checkbox" id="ttcap-unlock"> 🔓 Phát khi tab ẩn
        </label>
      </div>
      <div class="ttcap-opt">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;width:100%">
          <input type="checkbox" id="ttcap-hidetime"> ⏱ Ẩn giờ
        </label>
      </div>
      <div class="ttcap-opt">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;width:100%">
          <input type="checkbox" id="ttcap-sync"> ▶ Bám dòng phát
        </label>
      </div>
      <div class="ttcap-foot">
        <button class="ttcap-copy">📋 Copy</button>
        <button class="ttcap-dl">⬇ Tải .srt</button>
        <button class="ttcap-dom">🎬 Bắt đầu ghi (CC)</button>
        <button class="ttcap-refresh" title="Tải lại phụ đề (video đang xem)">⟳</button>
      </div>`;

    // Toggle mở khóa phát khi tab ẩn
    const unlockCb = panel.querySelector('#ttcap-unlock');
    unlockCb.checked = unlockActive;
    unlockCb.onchange = () => {
      if (unlockCb.checked) {
        chrome.runtime.sendMessage({ type: 'INJECT_UNLOCK' }, (r) => {
          if (r && r.ok) { unlockActive = true; }
          else { unlockCb.checked = false; } // lỗi → bỏ chọn
        });
      } else {
        location.reload(); // bỏ patch bằng cách reload tab
      }
    };

    // Toggle ẩn mốc thời gian (lưu chrome.storage)
    const timeCb = panel.querySelector('#ttcap-hidetime');
    timeCb.checked = hideTimes;
    panel.classList.toggle('ttcap-hide-time', hideTimes);
    timeCb.onchange = () => {
      hideTimes = timeCb.checked;
      panel.classList.toggle('ttcap-hide-time', hideTimes);
      try { chrome.storage.local.set({ hideTimes }); } catch (e) {}
    };

    // Toggle đồng bộ dòng đang phát (highlight + auto-scroll)
    const syncCb = panel.querySelector('#ttcap-sync');
    syncCb.checked = syncPlay;
    syncCb.onchange = () => {
      syncPlay = syncCb.checked;
      if (syncPlay) startSync(); else stopSync();
    };
    if (syncPlay) startSync(); // mở lại panel mà vẫn bật → chạy tiếp

    panel.querySelector('.ttcap-close').onclick = () => { stopSync(); panel.remove(); panel = null; };
    document.documentElement.appendChild(panel);
    makePanelDraggable(panel); // kéo di chuyển panel
    return panel;
  }

  function renderSegments(segments, note = '') {
    const body = panel.querySelector('.ttcap-body');
    body.innerHTML = '';
    if (note) {
      const n = document.createElement('div');
      n.className = 'ttcap-note';
      n.textContent = note;
      body.appendChild(n);
    }
    if (!segments.length) {
      body.innerHTML = `<div class="ttcap-loading">Không có phụ đề nào cho video này.</div>`;
      return;
    }
    for (const s of segments) {
      const row = document.createElement('div');
      row.className = 'ttcap-seg' + (s.edited ? ' edited' : '');
      row.dataset.start = s.start; // dùng cho đồng bộ dòng đang phát
      row.dataset.end = s.end;
      row.innerHTML = `<span class="ttcap-time">[${fmt(s.start)} – ${fmt(s.end)}]</span>
                       <span class="ttcap-text" title="Click để sửa nhanh — Enter lưu, Esc hủy"></span>`;
      const textEl = row.querySelector('.ttcap-text');
      textEl.textContent = s.text;

      // Sửa nhanh nội dung: click dòng → gõ → Enter lưu / Esc hủy / click chỗ khác lưu
      textEl.contentEditable = 'true';
      textEl.addEventListener('keydown', (e) => {
        e.stopPropagation(); // chặn phím tắt video player (f/m/space...) khi đang sửa
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          textEl.blur();
        } else if (e.key === 'Escape') {
          textEl.textContent = s.text; // hủy thay đổi
          textEl.blur();
        }
      });
      textEl.addEventListener('blur', () => {
        const newText = textEl.textContent.trim();
        if (newText && newText !== s.text) {
          s.text = newText; // cập nhật nguồn → Copy/SRT dùng bản đã sửa
          s.edited = true;
          row.classList.add('edited');
        }
        textEl.textContent = s.text; // chuẩn hóa (bỏ dư khoảng trắng)
      });

      body.appendChild(row);
    }
    panel.querySelector('.ttcap-copy').onclick = () => {
      // Nếu đang ẩn mốc thời gian → copy không kèm timestamp
      const lines = segments.map((s) => (hideTimes ? s.text : `[${fmt(s.start)}-${fmt(s.end)}] ${s.text}`));
      navigator.clipboard.writeText(lines.join('\n'))
        .then(() => { alert('✅ Đã copy transcript'); });
    };
    panel.querySelector('.ttcap-dl').onclick = () => {
      const srt = segments.map((s, i) =>
        `${i + 1}\n${toSrtTime(s.start)} --> ${toSrtTime(s.end)}\n${s.text}\n`).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([srt], { type: 'text/plain' }));
      a.download = `tiktok_${Date.now()}.srt`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // ── Đồng bộ dòng đang phát: highlight + auto-scroll theo video.currentTime ──
  function syncActiveLine() {
    if (!panel) return;
    const v = document.querySelector('video');
    if (!v) return;
    const t = v.currentTime;

    // Video kết thúc & phát lại (loop/restart): currentTime tụt ngược → đưa
    // panel về đầu để bắt đầu lại từ dòng 1
    if (lastSyncTime !== null && t < lastSyncTime - 1.5) {
      const body = panel.querySelector('.ttcap-body');
      if (body && body.scrollTop > 0) body.scrollTop = 0;
    }
    lastSyncTime = t;

    const rows = panel.querySelectorAll('.ttcap-seg');
    let activeIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const st = parseFloat(rows[i].dataset.start);
      const en = parseFloat(rows[i].dataset.end);
      // Dời highlight SỚM theo offset của từng nền tảng (khớp caption với âm thanh)
      const off = IS_YT ? SYNC_OFFSET_YOUTUBE_S : SYNC_OFFSET_TIKTOK_S;
      if (t >= st - off && t < en - off) { activeIdx = i; break; }
    }
    for (let i = 0; i < rows.length; i++) rows[i].classList.toggle('active', i === activeIdx);
    if (activeIdx >= 0) {
      // Không cuộn khi đang sửa nội dung (tránh kéo dòng đi giữa chừng)
      const ae = document.activeElement;
      if (!(ae && ae.isContentEditable)) {
        scrollToActive(rows[activeIdx]);
      }
    }
  }

  // Cuộn theo TRANG: panel đứng yên cho tới khi dòng active CHẠM ĐÁY, lúc đó
  // nhảy xuống 6 dòng rồi lại đứng yên → nội dung ít biến động, dễ theo dõi.
  function scrollToActive(row) {
    const body = panel.querySelector('.ttcap-body');
    if (!body) return;
    const bodyRect = body.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    // Vẫn nằm trong viewport (chưa chạm đáy) → không cuộn
    if (rowRect.bottom <= bodyRect.bottom - 2) return;

    const rowH = row.offsetHeight || 40;
    const pageH = SYNC_PAGE_ROWS * rowH;
    if (rowRect.bottom - bodyRect.bottom > pageH) {
      // Seek xa (nhảy tới giữa video) → đưa dòng active về sát đáy 1 lần
      const relTop = rowRect.top - bodyRect.top + body.scrollTop;
      body.scrollTop = Math.max(0, relTop - body.clientHeight + rowH);
    } else {
      // Chạm đáy bình thường → cuộn xuống đúng 6 dòng
      body.scrollTop += pageH;
    }
  }

  function startSync() {
    if (syncTimer) return;
    lastSyncTime = null; // bắt đầu theo dõi mới
    syncTimer = setInterval(syncActiveLine, SYNC_INTERVAL_MS);
  }

  function stopSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    if (panel) panel.querySelectorAll('.ttcap-seg.active').forEach((r) => r.classList.remove('active'));
  }

  // ── Kéo panel di chuyển (thanh tiêu đề) ────────────────────────────────────
  function makePanelDraggable(p) {
    const head = p.querySelector('.ttcap-head');
    let dragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ttcap-close')) return; // nút ✕ → không kéo
      // Lần đầu kéo: đổi right → left để định vị được
      if (!p.style.left) {
        const r = p.getBoundingClientRect();
        p.style.left = r.left + 'px';
        p.style.top = r.top + 'px';
        p.style.right = 'auto';
      }
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseFloat(p.style.left);
      origTop = parseFloat(p.style.top);
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
      p.classList.add('ttcap-dragging');
      e.preventDefault();
    });

    head.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      let left = origLeft + (e.clientX - startX);
      let top = origTop + (e.clientY - startY);
      // Clamp trong viewport
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;
      left = Math.max(0, Math.min(left, window.innerWidth - pw));
      top = Math.max(0, Math.min(top, window.innerHeight - ph));
      p.style.left = left + 'px';
      p.style.top = top + 'px';
    });

    const stop = (e) => {
      if (!dragging) return;
      dragging = false;
      p.classList.remove('ttcap-dragging');
      try { head.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
  }

  function toSrtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(h)}:${p(m)}:${p(s)},${String(ms).padStart(3, '0')}`;
  }

  // ── Lấy caption tracks → fetch track đầu tiên parse được ──────────────────
  // Normalize ngôn ngữ: "eng-US"/"vi-VN" → "en"/"vi"; "auto" giữ nguyên
  function normLang(l) {
    const s = String(l || '').toLowerCase();
    if (!s || s === 'auto') return 'auto';
    if (s.startsWith('vi')) return 'vi';
    if (s.startsWith('en')) return 'en';
    return s.split('-')[0] || s;
  }

  // Danh sách URL cần thử cho 1 track: ưu tiên URL giống caption (webvtt/vtt)
  // TikTok: url/urlList; YouTube: baseUrl (timedtext)
  function trackUrls(t) {
    const urls = [];
    const isCap = (u) => /webvtt|\.vtt|\.srt|caption|format=webvtt|timedtext/i.test(u);
    if (Array.isArray(t.urlList)) {
      urls.push(...t.urlList.filter(isCap));
      urls.push(...t.urlList.filter((u) => !isCap(u)));
    }
    for (const u of [t.baseUrl, t.url, t.Url, t.srt_url]) {
      if (u && !urls.includes(u)) urls.push(u);
    }
    // YouTube timedtext: ép định dạng VTT (dễ parse) nếu chưa có fmt=
    return urls.map((u) =>
      u.includes('timedtext') && !/fmt=/i.test(u)
        ? u + (u.includes('?') ? '&' : '?') + 'fmt=vtt'
        : u
    );
  }

  async function fetchFirstTrack(tracks) {
    const pick = (t) => normLang(t.language || t.languageCode || t.language_code || t.lang || t.language_name || 'auto');
    const sorted = [...tracks].sort((a, b) => {
      const ia = PREFERRED_LANGS.indexOf(pick(a));
      const ib = PREFERRED_LANGS.indexOf(pick(b));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    for (const t of sorted.slice(0, 5)) {
      for (const url of trackUrls(t)) {
        const r = await fetchViaBackground(url);
        if (!r.ok) continue;
        const segs = parseCaption(r.text);
        if (segs && segs.length) return { segs, lang: pick(t) };
      }
    }
    return null;
  }

  // ── Phương án 1: network captures (capture.js bắt khi bật CC) ─────────────
  async function tryNetworkCaptures() {
    const captured = window.__TT_CAPTURED__ || [];
    if (!captured.length) return null;
    const currentId = currentVideoId();

    // 1. JSON contexts (captionInfos) — thu thập TẤT CẢ, lọc theo video đang xem
    const contexts = [];
    for (let i = captured.length - 1; i >= 0; i--) {
      let obj = null;
      try { obj = JSON.parse(captured[i].text); } catch (e) { continue; }
      contexts.push(...findCaptionContexts(obj));
    }
    const chosen = pickContext(contexts, currentId);
    if (chosen) {
      const r = await fetchFirstTrack(chosen.tracks);
      if (r) return { ...r, videoId: chosen.videoId, matchedId: currentId, contexts };
    }

    // 2. Raw SRT/VTT (chỉ khi không có context JSON) — last resort
    for (let i = captured.length - 1; i >= 0; i--) {
      const segs = parseCaption(captured[i].text);
      if (segs && segs.length) return { segs, lang: 'network', contexts };
    }

    // Thất bại — kèm diagnostics để biết TikTok trả gì
    let noCap = null;
    for (let i = captured.length - 1; i >= 0; i--) {
      const r = findNoCaptionReason(captured[i].text);
      if (r) { noCap = r; break; }
    }
    return {
      segs: null,
      contexts,
      captureSummary: describeCaptures(captured),
      noCaptionReason: noCap,
    };
  }

  // ── Tổng hợp: network → rehydration → resource cache ──────────────────────
  async function tryCaptions() {
    const currentId = currentVideoId();
    const dbg = {
      int: window.__TT_INT__ === true,
      network: (window.__TT_CAPTURED__ || []).length,
      rehydration: 0,
      cache: 0,
    };

    // 1. Network captures
    const net = await tryNetworkCaptures();
    if (net && net.segs && net.segs.length) return { ...net, dbg };
    const netDiag = net || {};

    // 2. Rehydration data (lọc theo video đang xem)
    const ctxList = readRehydrationData();
    dbg.rehydration = ctxList.length;
    const chosenCtx = pickContext(ctxList, currentId);
    if (chosenCtx) {
      const r = await fetchFirstTrack(chosenCtx.tracks);
      if (r) return { ...r, videoId: chosenCtx.videoId, matchedId: currentId, dbg };
    }

    // 3. Resource cache
    const tracks = findFromResourceCache();
    dbg.cache = tracks ? tracks.length : 0;
    if (tracks && tracks.length) {
      const r = await fetchFirstTrack(tracks);
      if (r) return { ...r, matchedId: currentId, dbg };
    }

    return { segs: null, dbg, ...netDiag };
  }

  // ── Phương án 3: DOM capture khi bật CC + chơi video ───────────────────────
  function startDomCapture() {
    const video = document.querySelector('video');
    if (!video) {
      alert('Không tìm thấy video player. Mở video TikTok rồi thử lại.');
      return;
    }
    if (domCaptureActive) return;
    domCaptureActive = true;

    const body = panel.querySelector('.ttcap-body');
    body.innerHTML = `<div class="ttcap-note">
        Đang ghi CC... Bật phụ đề (CC) trên video rồi CHƠI VIDEO — dòng chữ sẽ được ghi lại theo thời gian.
        Bấm lại nút "🎬 Bắt đầu ghi (CC)" để dừng.</div>`;

    const segments = [];
    let lastText = '';
    let lastTime = 0;

    const tick = () => {
      if (!domCaptureActive) return;
      // Tìm phần tử caption đang hiển thị (nhiều selector dự phòng)
      const sel = [
        '[data-e2e="captions"]',
        '[class*="Caption"][class*="captions"]',
        '.ttCaptions',
        '[data-e2e="video-caption"]',
        '[class*="caption"][class*="container"]',
      ].join(',');
      const capEl = document.querySelector(sel);
      const text = capEl ? capEl.innerText.trim() : '';
      const t = video.currentTime;
      if (text && text !== lastText && Math.abs(t - lastTime) > 0.4) {
        segments.push({ start: t, end: t + 2, text });
        lastText = text;
        lastTime = t;
      }
      setTimeout(tick, 150);
    };
    tick();

    panel.querySelector('.ttcap-dom').onclick = () => {
      domCaptureActive = false;
      panel.querySelector('.ttcap-dom').textContent = '🎬 Bắt đầu ghi (CC)';
      renderSegments(segments, 'Ghi xong từ chế độ CC. Có thể không đầy đủ nếu video chưa chơi hết.');
    };
    panel.querySelector('.ttcap-dom').textContent = '⏹ Dừng ghi';
  }

  // ── Tải/tải lại phụ đề cho video hiện tại + render ────────────────────────
  async function reloadCaptions() {
    const body = panel.querySelector('.ttcap-body');
    const refreshBtn = panel.querySelector('.ttcap-refresh');
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '…'; }
    body.innerHTML = '<div class="ttcap-loading">⏳ Đang tìm phụ đề...</div>';

    const found = await tryCaptions();
    if (found && found.segs && found.segs.length) {
      const dbgStr = `[int:${found.dbg.int ? '✓' : '✗'} · net:${found.dbg.network} · rehy:${found.dbg.rehydration} · cache:${found.dbg.cache}]`;
      const vidStr = found.videoId
        ? `\n🎬 Video: ${found.videoId}${found.matchedId ? ` (đang xem: ${found.matchedId})` : ''}`
        : '';
      renderSegments(
        found.segs,
        `Lấy từ phụ đề có sẵn của video (${found.lang || 'auto'}). ${dbgStr}${vidStr}`
      );
    } else {
      // Không có → hiển thị debug để báo cáo
      const dbgStr = found
        ? `[int:${found.dbg.int ? '✓' : '✗'} · net:${found.dbg.network} · rehy:${found.dbg.rehydration} · cache:${found.dbg.cache}]`
        : '';
      const curId = currentVideoId();
      const ctxStr = found && found.contexts && found.contexts.length
        ? `\nContexts tìm được: ${found.contexts.map((c) => c.videoId || '?').join(', ')}`
        : '';
      const capSum = found && found.captureSummary ? `\nCapture: ${found.captureSummary}` : '';
      const noCapStr = found && found.noCaptionReason
        ? `\n⚠️ TikTok báo: video không có phụ đề (noCaptionReason: ${found.noCaptionReason}).`
        : '';
      body.innerHTML = `<div class="ttcap-note">
        Không lấy được phụ đề sẵn ${dbgStr}. Video đang xem: ${curId || '(không xác định)'}.${ctxStr}${capSum}${noCapStr}
        Video có thể không có caption track, HOẶC chưa bật CC.
        Cách dùng chế độ ghi CC: bật phụ đề (CC) trên video, nhấn
        "🎬 Bắt đầu ghi (CC)" rồi CHƠI video để ghi lại lời thoại.</div>`;
    }

    if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '⟳'; }
  }

  // ── Xử lý khi bấm nút ──────────────────────────────────────────────────────
  btn.onclick = async () => {
    if (panel) { stopSync(); panel.remove(); panel = null; return; }
    panel = buildPanel();
    // Nút ⟳ Refresh: tải lại phụ đề (dùng khi đổi video mới / muốn refresh)
    panel.querySelector('.ttcap-refresh').onclick = reloadCaptions;
    await reloadCaptions();
  };
})();
