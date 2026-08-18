"""Bảo mật cho proxy download — chống SSRF.

/api/download là một proxy: nếu không giới hạn host, bất kỳ ai cũng dùng
server này quét mạng nội bộ. Chỉ cho phép proxy tới CDN của TikTok + các
provider mà chúng ta tin cậy (suffix-match subdomain).
"""

import re
from urllib.parse import urlparse

# Host cho phép proxy. Suffix-match: tên trùng hoặc subdomain.<host>.
ALLOWED_DOWNLOAD_HOSTS = {
    "tikwm.com",
    "zcdn.top",
    "tiktokcdn.com",
    "tiktokcdn-us.com",
    "tiktokv.com",
    "tiktok.com",
    "bytecdn.com",
    "byteoversea.com",
    "muscdn.com",
    "douyin.com",
    "douyinstatic.com",
    "ixigua.com",
}

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def is_allowed_download_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower().rstrip(".")
    return any(
        host == allowed or host.endswith("." + allowed)
        for allowed in ALLOWED_DOWNLOAD_HOSTS
    )


def sanitize_filename(name: str, fallback: str = "download.mp4") -> str:
    """Loại bỏ ký tự nguy hiểm khỏi filename, tránh path traversal."""
    cleaned = re.sub(r'[\\/:*?"<>|\r\n]+', "_", name).strip(" .")
    return cleaned or fallback
