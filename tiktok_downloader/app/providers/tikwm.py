"""Provider: tikwm.com — API TikTok download miễn phí (primary).

TikWM trả JSON {code, msg, data}. Khi bị giới hạn free ("Free Api Limit"),
retry tối đa 10 lần với backoff 1.2s (giống snaptik).
"""

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

TIKWM_BASE = "https://tikwm.com/api/"
MAX_RETRIES = 10
RETRY_DELAY_S = 1.2
TIMEOUT = httpx.Timeout(30.0, connect=15.0)


class TikWMError(Exception):
    """Lỗi từ provider — message thân thiện cho client."""


async def fetch_media_urls(client: httpx.AsyncClient, url: str) -> dict:
    """Trả về dict media đã chuẩn hoá hoặc raise TikWMError."""
    payload = await _call_with_retry(client, url)
    return _extract(payload)


async def _call_with_retry(client: httpx.AsyncClient, url: str) -> dict:
    for attempt in range(MAX_RETRIES):
        try:
            resp = await client.get(TIKWM_BASE, params={"url": url}, timeout=TIMEOUT)
            payload = resp.json()
        except (httpx.HTTPError, ValueError) as e:
            logger.warning("tikwm request failed (attempt %s): %s", attempt + 1, e)
            payload = {"code": -1, "msg": "network error"}

        if payload.get("code") == -1 and "Free Api Limit" in (payload.get("msg") or ""):
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY_S)
                continue
            raise TikWMError("TikWM đang bị giới hạn lượt dùng. Thử lại sau ít phút.")

        return payload
    raise TikWMError("TikWM unavailable")  # unreachable, để an toàn


def _extract(payload: dict) -> dict:
    code = payload.get("code")
    msg = payload.get("msg") or "Unknown error"

    if code != 0:
        if "parse" in msg.lower() or "Url" in msg:
            raise TikWMError("Link TikTok không hợp lệ. Hãy dán link dạng "
                             "https://www.tiktok.com/@user/video/123...")
        raise TikWMError(f"TikWM: {msg}")

    data = payload.get("data") or {}
    author = data.get("author") or {}
    return {
        "videoId": str(data.get("id") or ""),
        "title": data.get("title") or "",
        "cover": data.get("cover") or "",
        "author": author.get("nickname") or "",
        "play": data.get("play") or None,      # không watermark
        "wmplay": data.get("wmplay") or None,  # có watermark
        "music": data.get("music") or None,    # MP3
        "images": data.get("images") or [],    # slideshow
        "source": "tikwm",
    }
