"""
PronunciationNormalizer — chuẩn hoá văn bản trước khi đưa vào Piper TTS
=========================================================================
Piper đọc theo mặt chữ (grapheme-based), không tự hiểu "km" là đơn vị đo
hay "HCM" là tên viết tắt. Processor này viết lại text TRƯỚC khi tới TTS:

  - Đơn vị đo đi liền số: "5km" → "5 ki lô mét"
  - Từ viết tắt/thuật ngữ: "HCM" → "Hồ Chí Minh", "cpc" → "xi pi xi"
  - Fallback: từ viết tắt IN HOA chưa có trong từ điển → tự đánh vần theo
    bảng chữ cái tiếng Việt (đỡ hơn để Piper đọc như một từ tiếng Anh)

QUAN TRỌNG VỀ VỊ TRÍ CHÈN:
Vì cần xử lý normalize trên CẢ CÂU hoàn chỉnh (không phải từng token nhỏ lẻ
LLM stream ra — nếu chuẩn hoá từng mảnh nhỏ, pattern như "5" + "km" tách rời
2 frame sẽ không match được), processor này BUFFER toàn bộ text giữa
LLMFullResponseStartFrame/LLMFullResponseEndFrame rồi mới normalize + đẩy
MỘT frame text đã chuẩn hoá xuống cho TTS. Điều này đánh đổi: TTS sẽ đợi
LLM sinh xong CẢ câu trả lời mới bắt đầu đọc (không streaming theo từng
chữ) — chấp nhận được vì SYSTEM_PROMPT đã giới hạn câu trả lời rất ngắn.

Cách dùng: chèn vào pipeline giữa llm và tts:

    pipeline = Pipeline([
        transport.input(),
        vad,
        stt,
        HallucinationFilter(...),
        user_agg,
        llm,
        PronunciationNormalizer("/path/to/pronunciation_dict.json"),  # <-- thêm
        tts,
        TTSAudioProcessor(),
        transport.output(),
        assistant_agg,
    ])
"""

import json
import os
import re
import time

from loguru import logger

from pipecat.frames.frames import (
    Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    TextFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

# Bảng chữ cái tiếng Việt dùng cho fallback đánh vần — style "vietnamese"
# (đọc theo cách gọi tên chữ cái truyền thống trong tiếng Việt)
_VN_LETTER_NAMES = {
    "A": "a", "B": "bê", "C": "xê", "D": "dê", "E": "e", "F": "ép",
    "G": "gờ", "H": "hát", "I": "i", "J": "gi", "K": "ca", "L": "lờ",
    "M": "mờ", "N": "nờ", "O": "o", "P": "pê", "Q": "quy", "R": "rờ",
    "S": "ét sì", "T": "tê", "U": "u", "V": "vê", "W": "đáp liu", "X": "ích",
    "Y": "i", "Z": "dét",
}

# Style thay thế — đọc kiểu Anh-hoá phổ biến trong giới kỹ thuật/marketing
# (vd: "CPC" → "xi pi xi" thay vì "xê pê xê"). Đổi "style": "anglicized"
# trong JSON để dùng bảng này.
_EN_LETTER_NAMES = {
    "A": "ây", "B": "bi", "C": "xi", "D": "đi", "E": "i", "F": "ép",
    "G": "gi", "H": "ếch", "I": "ai", "J": "giây", "K": "kê", "L": "eo",
    "M": "em", "N": "en", "O": "âu", "P": "pi", "Q": "kiu", "R": "a",
    "S": "ét", "T": "ti", "U": "diu", "V": "vi", "W": "đắp liu", "X": "ích",
    "Y": "quai", "Z": "dét",
}


class PronunciationNormalizer(FrameProcessor):
    def __init__(self, config_path: str, reload_check_interval_s: float = 5.0):
        super().__init__()
        self._config_path = config_path
        self._reload_interval = reload_check_interval_s
        self._last_check = 0.0
        self._last_mtime = 0.0

        self._units: dict[str, str] = {}
        self._abbrev: dict[str, str] = {}
        self._countries: dict[str, str] = {}  # key đã lowercase để match case-insensitive
        self._companies: dict[str, str] = {}  # key đã lowercase để match case-insensitive
        self._spell_fallback_enabled = True
        self._spell_min_len = 2
        self._spell_max_len = 6
        self._letter_table = _VN_LETTER_NAMES

        self._range_enabled = True
        self._range_regex: re.Pattern | None = None
        self._unit_regex: re.Pattern | None = None
        self._country_regex: re.Pattern | None = None
        self._company_regex: re.Pattern | None = None
        self._abbrev_regex: re.Pattern | None = None
        self._spell_regex: re.Pattern | None = None

        self._buf = ""
        self._in_response = False

        self._load_config(force=True)

    # ------------------------------------------------------------------
    # Config loading / hot-reload
    # ------------------------------------------------------------------
    def _load_config(self, force: bool = False):
        now = time.monotonic()
        if not force and (now - self._last_check) < self._reload_interval:
            return
        self._last_check = now

        try:
            mtime = os.path.getmtime(self._config_path)
        except OSError:
            logger.warning(f"PronunciationNormalizer: không đọc được {self._config_path}")
            return
        if not force and mtime == self._last_mtime:
            return

        try:
            with open(self._config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception as e:
            logger.error(f"PronunciationNormalizer: lỗi đọc {self._config_path}: {e}")
            return

        self._units = {k: v for k, v in cfg.get("units", {}).items() if not k.startswith("_")}
        self._abbrev = {k: v for k, v in cfg.get("abbreviations", {}).items() if not k.startswith("_")}

        # Countries: match KHÔNG phân biệt hoa/thường (tên đầy đủ nhiều âm tiết,
        # ít rủi ro trùng từ thông dụng hơn nhiều so với mã viết tắt 2 ký tự).
        raw_countries = {k: v for k, v in cfg.get("countries", {}).items() if not k.startswith("_")}
        self._countries = {k.lower(): v for k, v in raw_countries.items()}
        if self._countries:
            country_keys = sorted(raw_countries.keys(), key=len, reverse=True)
            country_alt = "|".join(re.escape(c) for c in country_keys)
            self._country_regex = re.compile(rf"\b({country_alt})\b", re.IGNORECASE)
        else:
            self._country_regex = None
            
        # Companies: match KHÔNG phân biệt hoa/thường (tên đầy đủ nhiều âm tiết,
        # ít rủi ro trùng từ thông dụng hơn nhiều so với mã viết tắt 2 ký tự).            
        raw_companies = {k: v for k, v in cfg.get("companies", {}).items() if not k.startswith("_")}
        self._companies = {k.lower(): v for k, v in raw_companies.items()}
        if self._companies:
            company_keys = sorted(raw_companies.keys(), key=len, reverse=True)
            company_alt = "|".join(re.escape(c) for c in company_keys)
            self._company_regex = re.compile(rf"\b({company_alt})\b", re.IGNORECASE)
        else:
            self._company_regex = None            

        range_cfg = cfg.get("ranges", {})
        self._range_enabled = range_cfg.get("enabled", True)
        separators = range_cfg.get("separators", ["-", "–", "—"])
        if self._range_enabled and separators:
            sep_alt = "|".join(re.escape(s) for s in separators)
            # Bắt buộc CẢ 2 bên đều là số — tránh nhầm với số âm đứng riêng
            # (vd: "-5 độ") hoặc các trường hợp chữ-số khác (vd: "gpu-1.19").
            self._range_regex = re.compile(
                rf"(\d+(?:[.,]\d+)?)\s*(?:{sep_alt})\s*(\d+(?:[.,]\d+)?)"
            )
        else:
            self._range_regex = None

        spell_cfg = cfg.get("spell_out_fallback", {})
        self._spell_fallback_enabled = spell_cfg.get("enabled", True)
        self._spell_min_len = spell_cfg.get("min_len", 2)
        self._spell_max_len = spell_cfg.get("max_len", 6)
        self._letter_table = (
            _EN_LETTER_NAMES if spell_cfg.get("style") == "anglicized" else _VN_LETTER_NAMES
        )

        # Regex đơn vị: số + đơn vị liền nhau, dài nhất trước để ưu tiên match "km/h" trước "km"
        if self._units:
            unit_keys = sorted(self._units.keys(), key=len, reverse=True)
            unit_alt = "|".join(re.escape(u) for u in unit_keys)
            self._unit_regex = re.compile(
                rf"(\d+(?:[.,]\d+)?)\s*({unit_alt})\b", re.IGNORECASE
            )
        else:
            self._unit_regex = None

        # Regex viết tắt: nguyên từ, dài nhất trước
        if self._abbrev:
            abbrev_keys = sorted(self._abbrev.keys(), key=len, reverse=True)
            abbrev_alt = "|".join(re.escape(a) for a in abbrev_keys)
            self._abbrev_regex = re.compile(rf"\b({abbrev_alt})\b")
        else:
            self._abbrev_regex = None

        # Regex fallback: chuỗi toàn chữ IN HOA (có thể kèm số) độ dài min-max
        self._spell_regex = re.compile(
            rf"\b([A-ZĐ]{{{self._spell_min_len},{self._spell_max_len}}})\b"
        )

        self._last_mtime = mtime
        logger.info(
            f"PronunciationNormalizer: đã load {len(self._units)} đơn vị, "
            f"{len(self._abbrev)} từ viết tắt, {len(self._countries)} quốc gia từ {self._config_path}",
            f"{len(self._abbrev)} từ viết tắt, {len(self._companies)} công ty từ {self._config_path}"
        )

    # ------------------------------------------------------------------
    # Normalize logic
    # ------------------------------------------------------------------
    def _spell_letters(self, token: str) -> str:
        return " ".join(self._letter_table.get(ch, ch) for ch in token)

    def normalize(self, text: str) -> str:
        if not text:
            return text

        # 0. Khoảng giá trị X-Y → "X đến Y" — chạy TRƯỚC units để "55-60km"
        #    vẫn ra đúng "55 đến 60 ki lô mét" (unit áp cho số cuối ở bước sau).
        if self._range_regex:
            text = self._range_regex.sub(lambda m: f"{m.group(1)} đến {m.group(2)}", text)

        # 1. Đơn vị đo đi liền số — làm trước để không bị regex viết tắt/spell
        #    "ăn nhầm" phần chữ cái của đơn vị (vd: "KM" viết hoa dễ trùng spell fallback)
        if self._unit_regex:
            def _unit_sub(m: re.Match) -> str:
                number, unit = m.group(1), m.group(2)
                vn = self._units.get(unit.lower())
                return f"{number} {vn}" if vn else m.group(0)

            text = self._unit_regex.sub(_unit_sub, text)

        # 1.5 Tên quốc gia (không phân biệt hoa/thường)
        if self._country_regex:
            def _country_sub(m: re.Match) -> str:
                return self._countries.get(m.group(1).lower(), m.group(0))

            text = self._country_regex.sub(_country_sub, text)
            
        # 1.6 Tên công ty (không phân biệt hoa/thường)
        if self._company_regex:
            def _company_sub(m: re.Match) -> str:
                return self._companies.get(m.group(1).lower(), m.group(0))

            text = self._company_regex.sub(_company_sub, text)            

        # 2. Từ viết tắt có trong từ điển — override toàn bộ cách đọc
        if self._abbrev_regex:
            def _abbrev_sub(m: re.Match) -> str:
                return self._abbrev.get(m.group(1), m.group(0))

            text = self._abbrev_regex.sub(_abbrev_sub, text)

        # 3. Fallback: chuỗi IN HOA còn sót lại (chưa có trong từ điển) → đánh vần
        if self._spell_fallback_enabled and self._spell_regex:
            def _spell_sub(m: re.Match) -> str:
                token = m.group(1)
                if token in self._abbrev:  # đã xử lý ở bước 2, không đụng lại
                    return token
                return self._spell_letters(token)

            text = self._spell_regex.sub(_spell_sub, text)

        return text

    # ------------------------------------------------------------------
    # Frame handling — buffer cả câu trả lời rồi mới normalize 1 lần
    # ------------------------------------------------------------------
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._load_config()
            self._buf = ""
            self._in_response = True
            await self.push_frame(frame, direction)

        elif isinstance(frame, (LLMTextFrame, TextFrame)) and self._in_response:
            self._buf += frame.text
            # Không push — giữ lại, chỉ đẩy bản đã chuẩn hoá ở LLMFullResponseEndFrame

        elif isinstance(frame, LLMFullResponseEndFrame):
            if self._buf:
                normalized = self.normalize(self._buf)
                if normalized != self._buf:
                    logger.info(f"🔤 Normalize: {self._buf!r} → {normalized!r}")
                await self.push_frame(TextFrame(text=normalized), direction)
            self._buf = ""
            self._in_response = False
            await self.push_frame(frame, direction)

        else:
            await self.push_frame(frame, direction)
