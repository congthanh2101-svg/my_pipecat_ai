"""
OmniVoice API — standalone server, chạy độc lập không cần bot_fs.

Usage:
    python omnivoice_server.py

    # hoặc chỉ định GPU / model:
    CUDA_VISIBLE_DEVICES=0 python omnivoice_server.py
    OMNIVOICE_API_DEVICE=cpu python omnivoice_server.py
"""

import logging
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI

from omnivoice_api import _VOICES_JSON, _scan_voices, router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config từ env
# ---------------------------------------------------------------------------
HOST = os.getenv("OMNIVOICE_API_HOST", "0.0.0.0")
PORT = int(os.getenv("OMNIVOICE_API_PORT", "8001"))
OUTPUT_DIR = os.getenv("OMNIVOICE_API_OUTPUT_DIR", "/tmp/omnivoice_outputs")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="OmniVoice TTS API",
    description="REST API cho OmniVoice — voice cloning, voice profile, TTS",
    version="1.0.0",
)
app.include_router(router)


@app.on_event("startup")
async def startup():
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    logger.info(f"OmniVoice API ready @ http://{HOST}:{PORT}")
    logger.info("Model sẽ load lazy ở request đầu tiên.")
    logger.info(f"Output dir: {OUTPUT_DIR}")
    voices = _scan_voices()
    if voices:
        logger.info(f"🎤 Available voices ({len(voices)}): {', '.join(sorted(voices.keys()))}")
        if _VOICES_JSON.exists():
            logger.info(f"📄 Voice metadata: {_VOICES_JSON}")
    else:
        logger.warning("🎤 No voice profiles found")
    logger.info(f"Config: model={os.getenv('OMNIVOICE_API_MODEL', 'k2-fsa/OmniVoice')} | "
                f"device={os.getenv('OMNIVOICE_API_DEVICE', 'cuda:0')} | "
                f"dtype={os.getenv('OMNIVOICE_API_DTYPE', 'float16')} | "
                f"num_step={os.getenv('OMNIVOICE_API_NUM_STEP', '32')}")


if __name__ == "__main__":
    uvicorn.run(
        "omnivoice_server:app",
        host=HOST,
        port=PORT,
        log_level="info",
    )
