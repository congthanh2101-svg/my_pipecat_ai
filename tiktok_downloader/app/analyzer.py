"""Orchestrate các provider để phân tích link TikTok thành media URLs."""

import logging

import httpx

from .providers.tikwm import TikWMError, fetch_media_urls

logger = logging.getLogger(__name__)


async def analyze(raw_url: str) -> dict:
    """Phân tích link → dict media chuẩn. Raise AnalyzerError khi lỗi."""
    url = raw_url.strip()
    if not url or "." not in url:
        raise AnalyzerError("Vui lòng dán link TikTok hợp lệ.")

    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={"User-Agent": "TikTokDownloader/0.1"},
        timeout=httpx.Timeout(60.0),
    ) as client:
        try:
            return await fetch_media_urls(client, url)
        except TikWMError as e:
            raise AnalyzerError(str(e)) from e


class AnalyzerError(Exception):
    """Lỗi phân tích — message hiển thị được cho người dùng."""
