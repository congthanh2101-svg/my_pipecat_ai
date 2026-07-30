"""
DTMFActionHandler — Xử lý TranscriptionFrame từ DTMFAggregator
================================================================
Khi DTMFAggregator (built-in Pipecat) gom các InputDTMFFrame và xuất ra
TranscriptionFrame("DTMF: 0"), handler này intercept và thực thi hành động
mà không cần qua LLM (phản hồi nhanh hơn).

Actions:
  - DTMF: 0  → transfer cuộc gọi đến queue support@default
  - DTMF: #  → nói "tạm biệt" và kết thúc cuộc gọi
  - Khác     → forward xuống LLM (cho phép xử lý sau)

Cách dùng:
    from dtmf_handler import DTMFActionHandler
    pipeline = Pipeline([
        ..., DTMFAggregator(), DTMFActionHandler(...), user_agg, ...
    ])
"""

from loguru import logger
from pipecat.frames.frames import (
    Frame, LLMRunFrame, TranscriptionFrame, TTSSpeakFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor


class DTMFActionHandler(FrameProcessor):
    """Xử lý TranscriptionFrame từ DTMFAggregator.

    Đặt giữa DTMFAggregator và user_agg trong pipeline.

    Args:
        call_uuid: UUID của cuộc gọi (để gọi API transfer/hangup).
        fs_api_config: Dict với base_url, username, password, queue.
        do_transfer_cb: Async callback thực hiện transfer.
                        Hàm này thường gọi API + schedule cleanup.
        do_end_call_cb: Async callback kết thúc cuộc gọi.
                        Thường là nói tạm biệt + hangup.
    """

    def __init__(
        self,
        call_uuid: str,
        fs_api_config: dict | None = None,
        do_transfer_cb=None,
        do_end_call_cb=None,
    ):
        super().__init__()
        self._call_uuid = call_uuid
        self._fs_api_config = fs_api_config
        self._do_transfer_cb = do_transfer_cb
        self._do_end_call_cb = do_end_call_cb
        self._action_taken = False  # tránh xử lý nhiều lần

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame) and frame.text.startswith("DTMF:"):
            digit = frame.text.replace("DTMF:", "").strip()
            logger.info(f"🔢 DTMF action: digit='{digit}' from '{frame.text}'")

            if digit == "0":
                if self._do_transfer_cb and not self._action_taken:
                    self._action_taken = True
                    await self._do_transfer_cb()
                return  # Không forward → LLM không thấy DTMF frame

            elif digit == "#":
                if self._do_end_call_cb and not self._action_taken:
                    self._action_taken = True
                    await self._do_end_call_cb()
                return

            else:
                # Digit khác: forward cho LLM xử lý
                logger.info(f"🔢 DTMF digit '{digit}' forwarded to LLM")

        await self.push_frame(frame, direction)

    async def _do_transfer(self):
        """Thực hiện transfer khi nhấn 0."""
        logger.info(f"🔄 DTMF transfer: call={self._call_uuid}")
        # Không gọi API trực tiếp ở đây — delegate qua callback
        if self._do_transfer_cb:
            await self._do_transfer_cb()

    async def _do_end_call(self):
        """Thực hiện kết thúc cuộc gọi khi nhấn #."""
        logger.info(f"🔚 DTMF end call: call={self._call_uuid}")
        if self._do_end_call_cb:
            await self._do_end_call_cb()
