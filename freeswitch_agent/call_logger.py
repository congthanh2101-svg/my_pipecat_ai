"""Call logging module — records call history in SQLite database.

Tự động lưu lịch sử cuộc gọi gồm conversation_id, phone, thời gian,
và transcript hội thoại. Dùng SQLite với WAL mode cho concurrent safe.

Cách dùng:
    from call_logger import CallLogger, extract_conversation

    logger = CallLogger()
    logger.log_start("uuid-123", "0901234567")
    # ... call diễn ra ...
    transcript = extract_conversation(context.messages)
    logger.log_end("uuid-123", transcript=transcript)
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_conversation(messages: list[dict]) -> str:
    """Lọc messages từ LLMContext, loại bỏ system prompt, trả về JSON string.

    Input format:  [{"role": "system", "content": "..."},
                     {"role": "user", "content": "Xin chào"},
                     {"role": "assistant", "content": "Chào bạn..."}]

    Output format: JSON array của user/assistant exchanges.
    """
    exchanges = []
    for msg in messages:
        role = msg.get("role", "")
        if role == "system" or role == "tool":
            continue
        content = msg.get("content", "")
        if content and isinstance(content, str) and content.strip():
            exchanges.append({
                "role": role,
                "content": content.strip(),
            })
    return json.dumps(exchanges, ensure_ascii=False)


class CallLogger:
    """Ghi nhật ký cuộc gọi vào SQLite database.

    Mỗi cuộc gọi tương ứng 1 row:
        log_start() → INSERT
        log_end()   → UPDATE (end_time, duration_s, transcript)
    """

    def __init__(self, db_path: str | None = None):
        self._db_path = db_path or str(
            Path(__file__).parent / "call_logs.db"
        )
        self._init_db()

    def _init_db(self):
        """Tạo table nếu chưa có + bật WAL mode."""
        try:
            with sqlite3.connect(self._db_path) as conn:
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS call_logs (
                        id              INTEGER PRIMARY KEY AUTOINCREMENT,
                        conversation_id TEXT NOT NULL,
                        phone           TEXT DEFAULT '',
                        start_time      TEXT NOT NULL,
                        end_time        TEXT,
                        duration_s      REAL,
                        status          TEXT DEFAULT 'in_progress',
                        transcript      TEXT DEFAULT ''
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"CallLogger DB init error: {e}")

    def log_start(self, conversation_id: str, phone: str = "") -> None:
        """Ghi nhận cuộc gọi mới bắt đầu."""
        try:
            with sqlite3.connect(self._db_path) as conn:
                conn.execute(
                    """INSERT INTO call_logs
                       (conversation_id, phone, start_time, status)
                       VALUES (?, ?, ?, ?)""",
                    (
                        conversation_id,
                        phone,
                        datetime.now(timezone.utc).isoformat(),
                        "in_progress",
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.error(f"CallLogger log_start error: {e}")

    def log_end(
        self,
        conversation_id: str,
        status: str = "completed",
        transcript: str = "",
    ) -> None:
        """Ghi nhận cuộc gọi kết thúc — cập nhật row mới nhất có conversation_id."""
        try:
            end_time = datetime.now(timezone.utc)
            with sqlite3.connect(self._db_path) as conn:
                row = conn.execute(
                    """SELECT id, start_time FROM call_logs
                       WHERE conversation_id = ? ORDER BY id DESC LIMIT 1""",
                    (conversation_id,),
                ).fetchone()
                if row:
                    call_id, start_time_str = row
                    start_time = datetime.fromisoformat(start_time_str)
                    duration_s = (end_time - start_time).total_seconds()
                    conn.execute(
                        """UPDATE call_logs
                           SET end_time = ?, duration_s = ?, status = ?, transcript = ?
                           WHERE id = ?""",
                        (
                            end_time.isoformat(),
                            round(duration_s, 1),
                            status,
                            transcript,
                            call_id,
                        ),
                    )
                    conn.commit()
                    logger.info(
                        f"📞 Call logged: {conversation_id} | "
                        f"{duration_s:.0f}s | {status}"
                    )
        except Exception as e:
            logger.error(f"CallLogger log_end error: {e}")

    def get_recent_calls(self, limit: int = 10) -> list[dict]:
        """Lấy N cuộc gọi gần nhất."""
        try:
            with sqlite3.connect(self._db_path) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    "SELECT * FROM call_logs ORDER BY id DESC LIMIT ?",
                    (limit,),
                ).fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"CallLogger get_recent_calls error: {e}")
            return []
