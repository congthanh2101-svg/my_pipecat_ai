"""
OmniVoice REST API — FastAPI wrapper cho OmniVoice TTS.

=== Local endpoints (cần upload file) ===
  POST /voice-profile          Tạo voice profile từ ref_audio + ref_text
  POST /tts/from-audio         TTS WAV từ ref_audio + text
  POST /tts/from-profile       TTS WAV từ uploaded .pt file
  POST /tts/from-profile/mp3   TTS MP3 từ uploaded .pt file

=== Remote endpoints (dùng voice_name mapping sẵn) ===
  GET  /voices                 Liệt kê voices có sẵn trên server
  POST /tts/generate           TTS WAV từ voice_name + text
  POST /tts/generate/mp3       TTS MP3 từ voice_name + text

=== Admin endpoints (quản lý voice profiles) ===
  POST   /admin/voices         Đăng ký voice mới (upload .pt)
  DELETE /admin/voices/{name}  Xoá voice
  POST   /admin/voices/reload  Quét lại thư mục profiles

=== Utility ===
  GET  /tts/cached             Liệt kê file WAV/MP3 đã sinh

Output filename được hash từ nội dung text để hỗ trợ caching.
"""

import hashlib
import json
import logging
import os
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from omnivoice import OmniVoice, VoiceClonePrompt

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config "OMNIVOICE_API_MODEL", "k2-fsa/OmniVoice"
# ---------------------------------------------------------------------------
_DEFAULT_MODEL = os.getenv("OMNIVOICE_API_MODEL", "k2-fsa/OmniVoice")
_DEFAULT_DEVICE = os.getenv("OMNIVOICE_API_DEVICE", "cuda:0")
_DEFAULT_DTYPE = os.getenv("OMNIVOICE_API_DTYPE", "float16")
_DEFAULT_NUM_STEP = int(os.getenv("OMNIVOICE_API_NUM_STEP", "32"))
_OUTPUT_DIR = Path(os.getenv("OMNIVOICE_API_OUTPUT_DIR", "/tmp/omnivoice_outputs"))

# ---------------------------------------------------------------------------
# Pydantic models — JSON request bodies cho generate endpoints
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    voice_name: str = Field(..., description="Tên voice (vd: zari, eddy, lily). Xem /voices")
    text: str = Field(..., min_length=1, description="Nội dung cần đọc")
    instruct: str | None = Field(None, description="Hướng dẫn giọng đọc (vd: 'female, gentle tone')")
    language: str | None = Field(None, description="Ngôn ngữ đích (vd: 'Vietnamese', 'English', 'vi', 'en')")
    num_step: int = Field(_DEFAULT_NUM_STEP, description="Số bước diffusion")


class GenerateMP3Request(GenerateRequest):
    bitrate: str = Field("192k", description="Chất lượng MP3: '128k', '192k', '256k', '320k'")


# Voice profile mapping — thư mục chứa .pt profiles
_VOICES_DIR = Path(os.getenv(
    "OMNIVOICE_API_VOICES_DIR",
    "/opt/my_pipecat_ai/OmniVoice/profiles",
))

# ---------------------------------------------------------------------------
# Global model (lazy-loaded singleton)
# ---------------------------------------------------------------------------
_model: OmniVoice | None = None


def _get_model() -> OmniVoice:
    global _model
    if _model is None:
        logger.info(
            f"Loading OmniVoice model {_DEFAULT_MODEL} "
            f"on {_DEFAULT_DEVICE} ({_DEFAULT_DTYPE}) ..."
        )
        _model = OmniVoice.from_pretrained(
            _DEFAULT_MODEL,
            device_map=_DEFAULT_DEVICE,
            dtype=getattr(torch, _DEFAULT_DTYPE.split(".")[-1], torch.float16),
        )
        logger.info(
            f"OmniVoice model loaded (sampling rate: {_model.sampling_rate} Hz)"
        )
    return _model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _hash_filename(text: str, suffix: str = ".wav") -> str:
    """Tạo filename từ MD5 của text — cùng text → cùng filename."""
    hash_ = hashlib.md5(text.encode("utf-8")).hexdigest()
    return f"{hash_}{suffix}"


def _ensure_output_dir():
    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _save_audio(audio_np, filename: str) -> Path:
    """Ghi numpy array thành WAV file, trả về đường dẫn."""
    _ensure_output_dir()
    model = _get_model()
    path = _OUTPUT_DIR / filename
    sf.write(str(path), audio_np, model.sampling_rate)
    logger.info(f"Saved audio ({len(audio_np)} samples @ {model.sampling_rate} Hz) → {path}")
    return path


# ---------------------------------------------------------------------------
# MP3 conversion (lazy import pydub — chỉ lỗi nếu dùng endpoint /mp3)
# ---------------------------------------------------------------------------
_PYDUB_AVAILABLE: bool | None = None


def _check_pydub() -> bool:
    """Kiểm tra pydub + ffmpeg availability (cache kết quả)."""
    global _PYDUB_AVAILABLE
    if _PYDUB_AVAILABLE is not None:
        return _PYDUB_AVAILABLE
    try:
        from pydub import AudioSegment  # noqa: F401
        import subprocess
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            check=True,
        )
        _PYDUB_AVAILABLE = True
    except Exception:
        _PYDUB_AVAILABLE = False
    return _PYDUB_AVAILABLE


def _save_mp3(audio_np: np.ndarray, filename: str, bitrate: str = "192k") -> Path:
    """Ghi numpy array thành MP3 file, trả về đường dẫn."""
    from pydub import AudioSegment

    _ensure_output_dir()
    model = _get_model()
    path = _OUTPUT_DIR / filename

    # float32 [-1.0, 1.0] → int16 PCM (pydub cần raw int16 bytes)
    audio_int16 = (audio_np * 32767).clip(-32768, 32767).astype(np.int16)
    segment = AudioSegment(
        audio_int16.tobytes(),
        frame_rate=model.sampling_rate,
        sample_width=2,  # 16-bit
        channels=1,
    )
    segment.export(str(path), format="mp3", bitrate=bitrate)
    logger.info(
        f"Saved audio ({len(audio_np)} samples → MP3 {bitrate} @ "
        f"{model.sampling_rate} Hz) → {path}"
    )
    return path


# ---------------------------------------------------------------------------
# Voice profile mapping — tự động quét thư mục + voices.json metadata
# ---------------------------------------------------------------------------
_VOICES_JSON: Path = Path(os.getenv(
    "OMNIVOICE_API_VOICES_JSON",
    str(_VOICES_DIR / "voices.json"),
))

_voice_registry: dict[str, "VoiceInfo"] | None = None


class VoiceInfo:
    """Thông tin một voice profile."""
    def __init__(self, path: Path, description: str = "",
                 gender: str = "", age: str = "",
                 language: str = "", pitch: str = "",
                 accent: str = ""):
        self.path = path
        self.description = description
        self.gender = gender
        self.age = age
        self.language = language
        self.pitch = pitch
        self.accent = accent

    def to_dict(self) -> dict:
        return {
            "name": self.path.stem.split("_", 1)[1] if "_" in self.path.stem else self.path.stem,
            "file": self.path.name,
            "size_bytes": self.path.stat().st_size,
            "description": self.description,
            "gender": self.gender,
            "age": self.age,
            "language": self.language,
            "pitch": self.pitch,
            "accent": self.accent,
        }


def _load_voices_metadata() -> dict[str, dict]:
    """Load metadata từ voices.json (nếu có)."""
    if _VOICES_JSON.exists():
        try:
            data = json.loads(_VOICES_JSON.read_text(encoding="utf-8"))
            logger.info(f"📄 Loaded metadata for {len(data)} voices from {_VOICES_JSON}")
            return data
        except Exception as e:
            logger.warning(f"Failed to load {_VOICES_JSON}: {e}")
    return {}


def _save_voices_metadata(metadata: dict[str, dict]):
    """Ghi metadata vào voices.json."""
    _VOICES_JSON.parent.mkdir(parents=True, exist_ok=True)
    _VOICES_JSON.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _scan_voices() -> dict[str, VoiceInfo]:
    """Quét thư mục profiles, gộp với metadata từ voices.json."""
    global _voice_registry
    if _voice_registry is not None:
        return _voice_registry

    metadata = _load_voices_metadata()
    _voice_registry = {}

    if not _VOICES_DIR.is_dir():
        logger.warning(f"Voices directory not found: {_VOICES_DIR}")
        return _voice_registry

    for fpath in sorted(_VOICES_DIR.iterdir()):
        if fpath.suffix.lower() != ".pt":
            continue
        parts = fpath.stem.split("_", 1)
        voice_name = parts[1] if len(parts) > 1 else parts[0]

        # Lấy metadata từ voices.json nếu có
        meta = metadata.get(voice_name, {})
        info = VoiceInfo(
            path=fpath,
            description=meta.get("description", ""),
            gender=meta.get("gender", ""),
            age=meta.get("age", ""),
            language=meta.get("language", ""),
            pitch=meta.get("pitch", ""),
            accent=meta.get("accent", ""),
        )

        if voice_name in _voice_registry:
            existing = _voice_registry[voice_name]
            if fpath.stat().st_mtime > existing.path.stat().st_mtime:
                _voice_registry[voice_name] = info
        else:
            _voice_registry[voice_name] = info

    logger.info(f"🎤 Scanned {len(_voice_registry)} voices from {_VOICES_DIR}")
    return _voice_registry


def _reset_voice_registry():
    """Reset cache để lần gọi scan tiếp theo quét lại."""
    global _voice_registry
    _voice_registry = None


def _resolve_voice(voice_name: str) -> Path:
    """Tra cứu voice_name → path .pt, raise 404 nếu không tìm thấy."""
    registry = _scan_voices()
    info = registry.get(voice_name)
    if info is None or not info.path.exists():
        available = sorted(registry.keys())
        raise HTTPException(
            404,
            f"Voice '{voice_name}' not found. Available: {', '.join(available)}",
        )
    return info.path


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="", tags=["OmniVoice TTS"])


@router.post("/voice-profile")
async def create_voice_profile(
    ref_audio: UploadFile = File(..., description="File audio giọng nói gốc"),
    ref_text: str = Form(None, description="Transcript của ref_audio (để trống để Whisper auto-transcribe)"),
):
    """Tạo voice profile từ file audio mẫu.

    - Upload file .wav/.mp3 giọng nói
    - Nhận về file .pt (VoiceClonePrompt) để dùng lại với `/tts/from-profile`
    """
    if not ref_audio.filename:
        raise HTTPException(400, "ref_audio is required")

    # Đọc data trước để vừa lưu file vừa hash
    audio_bytes = await ref_audio.read()
    suffix = Path(ref_audio.filename).suffix or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = _get_model()
        prompt = model.create_voice_clone_prompt(
            ref_audio=tmp_path,
            ref_text=ref_text,
        )

        # Filename hash từ ref_text hoặc nội dung audio để hỗ trợ cache
        hash_input = ref_text or hashlib.md5(audio_bytes).hexdigest()
        hash_ = hashlib.md5(hash_input.encode("utf-8")).hexdigest()
        profile_name = f"voice_{hash_}.pt"

        _ensure_output_dir()
        profile_path = _OUTPUT_DIR / profile_name
        prompt.save(str(profile_path))

        return FileResponse(
            str(profile_path),
            media_type="application/octet-stream",
            filename=profile_name,
        )
    except Exception as e:
        logger.error(f"Voice profile creation failed: {e}")
        raise HTTPException(500, f"Voice profile creation failed: {e}")
    finally:
        os.unlink(tmp_path)


@router.post("/tts/from-audio")
async def tts_from_audio(
    text: str = Form(..., description="Nội dung cần đọc"),
    ref_audio: UploadFile = File(..., description="File audio giọng nói gốc để clone"),
    ref_text: str = Form(None, description="Transcript của ref_audio (để trống để Whisper auto-transcribe)"),
    instruct: str = Form(None, description="Hướng dẫn giọng đọc (vd: 'female, gentle tone')"),
    language: str = Form(None, description="Ngôn ngữ đích (vd: 'Vietnamese', 'English', 'vi', 'en'). Mặc định: None = language-agnostic"),
    num_step: int = Form(_DEFAULT_NUM_STEP, description="Số bước diffusion (cao → chất lượng hơn)"),
):
    """TTS trực tiếp từ reference audio + text + hướng dẫn giọng.

    Output filename = MD5(text + language).wav để caching.
    """
    if not text or not text.strip():
        raise HTTPException(400, "text is required")

    # Lưu file upload tạm
    suffix = Path(ref_audio.filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await ref_audio.read())
        ref_path = tmp.name

    try:
        model = _get_model()
        audios = model.generate(
            text=text,
            ref_audio=ref_path,
            ref_text=ref_text,
            instruct=instruct,
            language=language,
            num_step=num_step,
        )

        filename = _hash_filename(f"{language or ''}:{text}")
        path = _save_audio(audios[0], filename)

        return FileResponse(
            str(path),
            media_type="audio/wav",
            filename=filename,
        )
    except Exception as e:
        logger.error(f"TTS from audio failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {e}")
    finally:
        os.unlink(ref_path)


@router.post("/tts/from-profile")
async def tts_from_profile(
    text: str = Form(..., description="Nội dung cần đọc"),
    voice_profile: UploadFile = File(..., description="File .pt từ /voice-profile"),
    instruct: str = Form(None, description="Hướng dẫn giọng đọc (vd: 'female, gentle tone')"),
    language: str = Form(None, description="Ngôn ngữ đích (vd: 'Vietnamese', 'English', 'vi', 'en'). Mặc định: None = language-agnostic"),
    num_step: int = Form(_DEFAULT_NUM_STEP, description="Số bước diffusion"),
):
    """TTS từ voice profile đã tạo trước + text + hướng dẫn giọng.

    - Upload file .pt từ endpoint `/voice-profile`
    - Output filename = MD5(text + language).wav để caching
    """
    if not text or not text.strip():
        raise HTTPException(400, "text is required")

    # Lưu .pt upload tạm
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        tmp.write(await voice_profile.read())
        profile_path = tmp.name

    try:
        prompt = VoiceClonePrompt.load(profile_path)
        model = _get_model()

        audios = model.generate(
            text=text,
            voice_clone_prompt=prompt,
            instruct=instruct,
            language=language,
            num_step=num_step,
        )

        filename = _hash_filename(f"{language or ''}:{text}")
        path = _save_audio(audios[0], filename)

        return FileResponse(
            str(path),
            media_type="audio/wav",
            filename=filename,
        )
    except Exception as e:
        logger.error(f"TTS from profile failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {e}")
    finally:
        os.unlink(profile_path)


@router.post("/tts/from-profile/mp3")
async def tts_from_profile_mp3(
    text: str = Form(..., description="Nội dung cần đọc"),
    voice_profile: UploadFile = File(..., description="File .pt từ /voice-profile"),
    instruct: str = Form(None, description="Hướng dẫn giọng đọc (vd: 'female, gentle tone')"),
    language: str = Form(None, description="Ngôn ngữ đích (vd: 'Vietnamese', 'English', 'vi', 'en'). Mặc định: None = language-agnostic"),
    num_step: int = Form(_DEFAULT_NUM_STEP, description="Số bước diffusion"),
    bitrate: str = Form("192k", description="Chất lượng MP3: '128k', '192k', '256k', '320k'. Cao hơn = nặng hơn, chất lượng tốt hơn"),
):
    """TTS từ voice profile, xuất trực tiếp ra MP3 (dung lượng nhẹ hơn WAV ~10 lần).

    - Upload file .pt từ endpoint `/voice-profile`
    - Output filename = MD5(text + language + bitrate).mp3 để caching
    - Yêu cầu `pydub` + `ffmpeg` trên server
    """
    if not text or not text.strip():
        raise HTTPException(400, "text is required")
    if not _check_pydub():
        raise HTTPException(
            503,
            "MP3 conversion not available. Install: pip install pydub && apt-get install ffmpeg",
        )

    # Đọc .pt upload
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        tmp.write(await voice_profile.read())
        profile_path = tmp.name

    try:
        prompt = VoiceClonePrompt.load(profile_path)
        model = _get_model()

        audios = model.generate(
            text=text,
            voice_clone_prompt=prompt,
            instruct=instruct,
            language=language,
            num_step=num_step,
        )

        # Hash = text + language + bitrate (cùng text + bitrate → cùng file)
        hash_key = f"{language or ''}:{bitrate}:{text}"
        filename = _hash_filename(hash_key, suffix=".mp3")
        path = _save_mp3(audios[0], filename, bitrate=bitrate)

        return FileResponse(
            str(path),
            media_type="audio/mpeg",
            filename=filename,
        )
    except Exception as e:
        logger.error(f"TTS MP3 from profile failed: {e}")
        raise HTTPException(500, f"TTS MP3 generation failed: {e}")
    finally:
        os.unlink(profile_path)


# ---------------------------------------------------------------------------
# Voice mapping endpoints — dùng voice_name (không cần upload file)
# ---------------------------------------------------------------------------

@router.get("/voices")
async def list_voices():
    """Liệt kê tất cả voice profiles có sẵn trên server (kèm metadata)."""
    registry = _scan_voices()
    return {
        "count": len(registry),
        "voices": [info.to_dict() for info in sorted(registry.values(), key=lambda x: x.path.name)],
    }


@router.post("/tts/generate")
async def tts_generate(body: GenerateRequest = Body(...)):
    """TTS WAV từ voice profile có sẵn trên server.

    - Gửi JSON body, nhận về file .wav
    - Output filename = MD5(voice_name + language + text).wav để caching
    """
    profile_path = _resolve_voice(body.voice_name)

    try:
        prompt = VoiceClonePrompt.load(str(profile_path))
        model = _get_model()

        audios = model.generate(
            text=body.text,
            voice_clone_prompt=prompt,
            instruct=body.instruct,
            language=body.language,
            num_step=body.num_step,
        )

        hash_key = f"{body.voice_name}:{body.language or ''}:{body.text}"
        filename = _hash_filename(hash_key)
        path = _save_audio(audios[0], filename)

        return FileResponse(
            str(path),
            media_type="audio/wav",
            filename=filename,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS generate failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {e}")


@router.post("/tts/generate/mp3")
async def tts_generate_mp3(body: GenerateMP3Request = Body(...)):
    """TTS MP3 từ voice profile có sẵn trên server.

    - Gửi JSON body, nhận về file .mp3
    - Output filename = MD5(voice_name + language + bitrate + text).mp3 để caching
    - Yêu cầu `pydub` + `ffmpeg` trên server
    """
    if not _check_pydub():
        raise HTTPException(
            503,
            "MP3 conversion not available. Install: pip install pydub && apt-get install ffmpeg",
        )

    profile_path = _resolve_voice(body.voice_name)

    try:
        prompt = VoiceClonePrompt.load(str(profile_path))
        model = _get_model()

        audios = model.generate(
            text=body.text,
            voice_clone_prompt=prompt,
            instruct=body.instruct,
            language=body.language,
            num_step=body.num_step,
        )

        # hash_key = f"{body.voice_name}:{body.language or ''}:{body.bitrate}:{body.text}"
        hash_key = f"{body.voice_name}:{body.text}"
        filename = _hash_filename(hash_key, suffix=".mp3")
        path = _save_mp3(audios[0], filename, bitrate=body.bitrate)

        return FileResponse(
            str(path),
            media_type="audio/mpeg",
            filename=filename,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS MP3 generate failed: {e}")
        raise HTTPException(500, f"TTS MP3 generation failed: {e}")


# ---------------------------------------------------------------------------
# Admin endpoints — quản lý voice profiles
# ---------------------------------------------------------------------------

@router.post("/admin/voices")
async def admin_add_voice(
    voice_name: str = Form(..., description="Tên voice (vd: my_voice, support_agent)"),
    voice_file: UploadFile = File(..., description="File .pt voice profile"),
):
    """Đăng ký voice profile mới (upload .pt, lưu vào server).

    - Lưu file vào thư mục profiles với tên voice_name
    - Sau đó có thể dùng ngay với `/tts/generate` và `/tts/generate/mp3`
    """
    if not voice_name or not voice_name.strip():
        raise HTTPException(400, "voice_name is required")
    if not voice_file.filename or not voice_file.filename.endswith(".pt"):
        raise HTTPException(400, "voice_file must be a .pt file")

    # Đảm bảo thư mục profiles tồn tại
    _VOICES_DIR.mkdir(parents=True, exist_ok=True)

    # Lưu file với tên voice_name (giữ nguyên đuôi .pt)
    safe_name = voice_name.strip().replace(" ", "_").replace("/", "_")
    dest_path = _VOICES_DIR / f"{safe_name}.pt"

    if dest_path.exists():
        raise HTTPException(409, f"Voice '{voice_name}' already exists. Delete first or use a different name.")

    content = await voice_file.read()
    dest_path.write_bytes(content)
    logger.info(f"➕ Voice profile added: {voice_name} → {dest_path}")

    # Reset registry để lần scan tới thấy voice mới
    _reset_voice_registry()

    return {
        "success": True,
        "message": f"Voice '{voice_name}' registered",
        "path": str(dest_path),
        "size_bytes": len(content),
    }


@router.put("/admin/voices/{voice_name}")
async def admin_update_voice_metadata(
    voice_name: str,
    description: str = Form("", description="Mô tả giọng đọc"),
    gender: str = Form("", description="Giới tính (male/female)"),
    age: str = Form("", description="Độ tuổi (child, young adult, middle-aged, elderly)"),
    language: str = Form("", description="Ngôn ngữ chính (vi/en/...)"),
    pitch: str = Form("", description="Cao độ: very low, low, moderate, high, very high pitch"),
    accent: str = Form("", description="Giọng vùng: american, british, australian, indian, ... accent"),
):
    """Cập nhật thông tin mô tả cho một voice.

    Dữ liệu được lưu vào voices.json, không ảnh hưởng đến file .pt gốc.
    Các giá trị gender/age/pitch/accent tuân theo chuẩn OmniVoice voice-design.md.
    Tham khảo: https://github.com/k2-fsa/OmniVoice/blob/master/docs/voice-design.md
    """
    registry = _scan_voices()
    if voice_name not in registry:
        available = sorted(registry.keys())
        raise HTTPException(
            404,
            f"Voice '{voice_name}' not found. Available: {', '.join(available)}",
        )

    # Load metadata hiện tại, cập nhật
    metadata = _load_voices_metadata()
    metadata[voice_name] = {
        "description": description,
        "gender": gender,
        "age": age,
        "language": language,
        "pitch": pitch,
        "accent": accent,
    }
    _save_voices_metadata(metadata)
    _reset_voice_registry()

    logger.info(f"📝 Voice metadata updated: {voice_name}")
    return {
        "success": True,
        "message": f"Voice '{voice_name}' metadata updated",
        "metadata": metadata[voice_name],
    }


@router.delete("/admin/voices/{voice_name}")
async def admin_delete_voice(voice_name: str):
    """Xoá voice profile khỏi server (cả .pt và metadata)."""
    registry = _scan_voices()
    info = registry.get(voice_name)

    if info is None:
        available = sorted(registry.keys())
        raise HTTPException(
            404,
            f"Voice '{voice_name}' not found. Available: {', '.join(available)}",
        )

    # Xoá file .pt
    info.path.unlink(missing_ok=True)

    # Xoá metadata khỏi voices.json
    metadata = _load_voices_metadata()
    if voice_name in metadata:
        del metadata[voice_name]
        _save_voices_metadata(metadata)

    logger.info(f"🗑️ Voice profile deleted: {voice_name} → {info.path}")

    _reset_voice_registry()

    return {
        "success": True,
        "message": f"Voice '{voice_name}' deleted",
        "path": str(info.path),
    }


@router.post("/admin/voices/reload")
async def admin_reload_voices():
    """Quét lại thư mục profiles, cập nhật danh sách voices.

    Dùng sau khi thêm/xoá file .pt thủ công trong thư mục profiles.
    """
    _reset_voice_registry()
    registry = _scan_voices()

    return {
        "success": True,
        "message": f"Reloaded {len(registry)} voices",
        "voices": sorted(registry.keys()),
    }


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve file WAV/MP3 đã sinh — mở trong browser để nghe trực tiếp.

    Ví dụ: http://localhost:8001/audio/af216052b593e6591b7078a5e267634d.mp3
    """
    # Chỉ cho phép .wav và .mp3 (bảo mật)
    if not filename.lower().endswith((".wav", ".mp3")):
        raise HTTPException(400, "Only .wav and .mp3 files are allowed")
    # Chặn path traversal
    if "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")

    file_path = _OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {filename}")

    media_type = "audio/mpeg" if filename.lower().endswith(".mp3") else "audio/wav"
    return FileResponse(str(file_path), media_type=media_type, filename=filename)


@router.get("/tts/cached")
async def list_cached():
    """Liệt kê tất cả file WAV/MP3 đã sinh trong output directory."""
    _ensure_output_dir()
    files = sorted(_OUTPUT_DIR.glob("*.wav"))
    files += sorted(_OUTPUT_DIR.glob("*.mp3"))
    return {
        "count": len(files),
        "files": [
            {
                "name": f.name,
                "size_bytes": f.stat().st_size,
                "modified": f.stat().st_mtime,
            }
            for f in files
        ],
    }
