(() => {
  "use strict";

  const form = document.getElementById("dl-form");
  const input = document.getElementById("url");
  const btn = document.getElementById("dl-btn");
  const errorEl = document.getElementById("error");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");

  // Dark mode (nhớ lựa chọn)
  const themeToggle = document.getElementById("theme-toggle");
  const applyTheme = (dark) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    themeToggle.textContent = dark ? "☀️" : "🌙";
  };
  applyTheme(localStorage.getItem("ttdl-theme") === "dark");
  themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") !== "dark";
    localStorage.setItem("ttdl-theme", dark ? "dark" : "light");
    applyTheme(dark);
  });

  // Nút "Download" tải MP4 trực tiếp qua proxy server
  function downloadLink(url, filename, label, primary) {
    const a = document.createElement("a");
    a.href = "/api/download?url=" + encodeURIComponent(url) +
             "&filename=" + encodeURIComponent(filename);
    a.className = primary ? "dl-primary" : "dl-secondary";
    a.textContent = label;
    return a;
  }

  function render(d) {
    resultEl.innerHTML = "";

    const body = document.createElement("div");
    body.className = "result-body";

    const img = document.createElement("img");
    img.className = "result-cover";
    img.src = d.cover || "";
    img.alt = d.title || "TikTok video";
    img.onerror = () => { img.style.display = "none"; };

    const info = document.createElement("div");
    info.className = "result-info";

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = d.title || "TikTok video";

    const author = document.createElement("div");
    author.className = "result-author";
    author.textContent = d.author ? "@" + d.author : "";

    const links = document.createElement("div");
    links.className = "dl-links";
    if (d.play) {
      links.appendChild(downloadLink(d.play, "tiktok_" + d.videoId + ".mp4", "Download MP4 (không logo)", true));
    }
    if (d.wmplay) {
      links.appendChild(downloadLink(d.wmplay, "tiktok_" + d.videoId + "_wm.mp4", "Download MP4 (có logo)", false));
    }
    if (d.music) {
      links.appendChild(downloadLink(d.music, "tiktok_" + d.videoId + ".mp3", "Download MP3 (nhạc)", false));
    }

    info.appendChild(title);
    info.appendChild(author);
    info.appendChild(links);
    body.appendChild(img);
    body.appendChild(info);
    resultEl.appendChild(body);

    // Slideshow ảnh
    if (d.images && d.images.length) {
      const grid = document.createElement("div");
      grid.className = "images";
      d.images.forEach((src, i) => {
        const fig = document.createElement("figure");
        const im = document.createElement("img");
        im.src = src;
        im.loading = "lazy";
        const cap = document.createElement("figcaption");
        cap.textContent = "Ảnh " + (i + 1) + "/" + d.images.length;
        fig.appendChild(im);
        fig.appendChild(cap);
        grid.appendChild(fig);
      });
      resultEl.appendChild(grid);
    }

    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    errorEl.hidden = true;
    resultEl.hidden = true;
    btn.disabled = true;
    statusEl.textContent = "Đang phân tích link...";
    statusEl.hidden = false;

    try {
      const resp = await fetch("/api/analyze?url=" + encodeURIComponent(url));
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.detail || "Lỗi không xác định (" + resp.status + ")");
      statusEl.hidden = true;
      render(data);
    } catch (err) {
      statusEl.hidden = true;
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
})();
