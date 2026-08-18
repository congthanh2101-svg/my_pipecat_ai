"""TikTok Downloader — FastAPI backend proxy.

- GET /api/analyze?url=...    → phân tích link, trả JSON media URLs
- GET /api/download?url=...&filename=... → proxy stream media về client
- GET /health                 → health check
"""

import logging
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from .analyzer import AnalyzerError, analyze
from .security import UA, is_allowed_download_url, sanitize_filename

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(title="TikTok Downloader", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # public tool, không auth
    allow_methods=["GET"],
    allow_headers=["*"],
)

DOWNLOAD_TIMEOUT = httpx.Timeout(120.0, connect=15.0)
MAX_PROXY_BYTES = 500 * 1024 * 1024  # 500MB — chặn abuse tải file khổng lồ


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/analyze")
async def api_analyze(url: str = Query(...)):
    try:
        result = await analyze(url)
    except AnalyzerError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not result.get("play"):
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy video có thể tải (video có thể là slideshow hoặc đã bị gỡ).",
        )
    return result


@app.get("/api/download")
async def api_download(
    url: str = Query(...),
    filename: str = Query("download.mp4"),
):
    if not is_allowed_download_url(url):
        raise HTTPException(status_code=403, detail="Host không được phép tải qua proxy.")

    safe_name = sanitize_filename(filename)

    client = httpx.AsyncClient(
        follow_redirects=True,
        timeout=DOWNLOAD_TIMEOUT,
        headers={"User-Agent": UA},
    )
    try:
        req = client.build_request("GET", url)
        resp = await client.send(req, stream=True)
    except httpx.HTTPError as e:
        await client.aclose()
        logger.warning("download upstream error: %s", e)
        raise HTTPException(status_code=502, detail="Không kết nối được nguồn video.")

    if resp.status_code != 200:
        await resp.aclose()
        await client.aclose()
        logger.warning("download upstream status %s for %s", resp.status_code, url)
        raise HTTPException(status_code=502, detail=f"Nguồn video trả về {resp.status_code}.")

    content_type = resp.headers.get("content-type", "application/octet-stream")
    length = int(resp.headers.get("content-length", 0) or 0)
    if length > MAX_PROXY_BYTES:
        await resp.aclose()
        await client.aclose()
        raise HTTPException(status_code=413, detail="File quá lớn.")

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}"',
        "Cache-Control": "no-store",
    }

    async def stream():
        try:
            async for chunk in resp.aiter_raw():
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(stream(), media_type=content_type, headers=headers)


# --- Static frontend ---


@app.get("/")
async def index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/style.css")
async def css():
    return FileResponse(FRONTEND_DIR / "style.css")


@app.get("/app.js")
async def js():
    return FileResponse(FRONTEND_DIR / "app.js")


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
