"""Unit test Phase 1: health, security, download allowlist."""

from fastapi.testclient import TestClient

from app.main import app
from app.security import is_allowed_download_url, sanitize_filename

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_frontend_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "TikTok Downloader" in r.text


def test_download_rejects_bad_scheme():
    r = client.get("/api/download", params={"url": "file:///etc/passwd", "filename": "x"})
    assert r.status_code == 403


def test_download_rejects_localhost():
    r = client.get("/api/download", params={"url": "http://169.254.169.254/latest/meta-data", "filename": "x"})
    assert r.status_code == 403


def test_download_rejects_random_host():
    r = client.get("/api/download", params={"url": "http://evil.example.com/x.mp4", "filename": "x"})
    assert r.status_code == 403


def test_download_requires_url():
    r = client.get("/api/download")
    assert r.status_code == 422


# --- security helpers ---


def test_allowlist_matches_tiktok_cdn():
    assert is_allowed_download_url("https://v16m.tiktokcdn.com/foo.mp4")
    assert is_allowed_download_url("https://www.tikwm.com/file/video/abc.mp4")
    assert is_allowed_download_url("https://p16-sign-va.tiktokcdn-us.com/video/abc.mp4")


def test_allowlist_rejects_foreign():
    assert not is_allowed_download_url("http://169.254.169.254/")
    assert not is_allowed_download_url("http://evil.example.com/a.mp4")
    assert not is_allowed_download_url("ftp://tiktokcdn.com/a.mp4")


def test_sanitize_filename():
    assert sanitize_filename("a/b\\c:d*.mp4") == "a_b_c_d_.mp4"
    assert sanitize_filename("") == "download.mp4"
