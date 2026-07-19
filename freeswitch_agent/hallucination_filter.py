"""
HallucinationFilter — chặn các TranscriptionFrame là "ảo giác" của Whisper
============================================================================
Whisper đôi khi "bịa" ra các câu quen thuộc trong tập huấn luyện (thường là
phụ đề YouTube: quảng cáo subscribe, lời chào tạm biệt video...) khi nhận
audio nhiễu/gần như im lặng. Vì các câu này gần như CỐ ĐỊNH, ta có thể chặn
bằng cách so khớp text với danh sách đã biết trước khi cho đi tiếp vào LLM.

Cách dùng: chèn vào pipeline ngay SAU stt, TRƯỚC user_agg:

    pipeline = Pipeline([
        transport.input(),
        vad,
        stt,
        HallucinationFilter("/path/to/hallucination_phrases.json"),  # <-- thêm
        user_agg,
        llm,
        tts,
        ...
    ])

Danh sách cụm từ nằm trong file JSON riêng (hallucination_phrases.json) —
tự động reload mỗi khi file thay đổi (theo mtime), KHÔNG cần restart bot khi
bạn thêm câu mới phát hiện được.
"""

import difflib
import json
import os
import re
import time

from loguru import logger

from pipecat.frames.frames import Frame, TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

_DEFAULT_CONFIG = {
    "exact_phrases": [],
    "patterns": [],
    "fuzzy_threshold": 0.82,
    "min_len_for_fuzzy": 15,
}


class HallucinationFilter(FrameProcessor):
    def __init__(self, config_path: str, reload_check_interval_s: float = 5.0):
        super().__init__()
        self._config_path = config_path
        self._reload_interval = reload_check_interval_s
        self._last_check = 0.0
        self._last_mtime = 0.0
        self._exact_phrases: list[str] = []
        self._patterns: list[re.Pattern] = []
        self._fuzzy_threshold = 0.82
        self._min_len_for_fuzzy = 15
        self._load_config(force=True)

    def _load_config(self, force: bool = False):
        now = time.monotonic()
        if not force and (now - self._last_check) < self._reload_interval:
            return
        self._last_check = now

        try:
            mtime = os.path.getmtime(self._config_path)
        except OSError:
            logger.warning(f"HallucinationFilter: không đọc được {self._config_path}, dùng danh sách rỗng")
            return

        if not force and mtime == self._last_mtime:
            return  # file không đổi, khỏi reload

        try:
            with open(self._config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception as e:
            logger.error(f"HallucinationFilter: lỗi đọc {self._config_path}: {e}")
            return

        self._exact_phrases = [self._normalize(p) for p in cfg.get("exact_phrases", [])]
        self._patterns = []
        for p in cfg.get("patterns", []):
            try:
                self._patterns.append(re.compile(p, re.IGNORECASE))
            except re.error as e:
                logger.error(f"HallucinationFilter: pattern lỗi '{p}': {e}")
        self._fuzzy_threshold = cfg.get("fuzzy_threshold", 0.82)
        self._min_len_for_fuzzy = cfg.get("min_len_for_fuzzy", 15)
        self._last_mtime = mtime
        logger.info(
            f"HallucinationFilter: đã load {len(self._exact_phrases)} exact phrase(s), "
            f"{len(self._patterns)} pattern(s) từ {self._config_path}"
        )

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.strip().lower()
        text = re.sub(r"\s+", " ", text)
        text = text.strip(" .!?…")
        return text

    def _is_hallucination(self, text: str) -> str | None:
        """Trả về lý do match nếu là hallucination, None nếu không."""
        norm = self._normalize(text)
        if not norm:
            return None

        for pattern in self._patterns:
            if pattern.search(norm):
                return f"pattern:{pattern.pattern}"

        if len(norm) >= self._min_len_for_fuzzy:
            for phrase in self._exact_phrases:
                ratio = difflib.SequenceMatcher(None, norm, phrase).ratio()
                if ratio >= self._fuzzy_threshold:
                    return f"fuzzy:{ratio:.2f}~{phrase!r}"

        return None

    def is_hallucination(self, text: str) -> bool:
        """Public check — returns True nếu text khớp hallucination pattern.

        Dùng để kiểm tra trong STT service trước khi yield TranscriptionFrame,
        tránh RTVIObserver gửi hallucinated text đến RTVI client.
        """
        self._load_config()
        return self._is_hallucination(text) is not None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame):
            self._load_config()  # kiểm tra reload định kỳ (rẻ, chỉ stat() file)
            reason = self._is_hallucination(frame.text)
            if reason:
                logger.warning(f"🚫 HallucinationFilter chặn: {frame.text!r} ({reason})")
                return  # KHÔNG push đi tiếp — coi như không có gì được nói

        await self.push_frame(frame, direction)
