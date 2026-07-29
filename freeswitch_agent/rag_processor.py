"""
RAGProcessor — Pipecat FrameProcessor chèn kiến thức nội bộ vào LLM context
============================================================================
Đặt giữa `user_agg` và `llm` trong pipeline. Khi user hỏi một câu:
  1. user_agg thêm câu hỏi vào LLM context, push LLMRunFrame
  2. RAGProcessor bắt LLMRunFrame, search KnowledgeBase
  3. Inject context (system message) vào LLM context ngay trước câu hỏi
  4. Forward LLMRunFrame → LLM đọc context (đã có kiến thức) → trả lời

Cách dùng:
    kb = get_knowledge_base()
    rag = RAGProcessor(context, kb)
    pipeline = Pipeline([..., user_agg, rag, llm, ...])
"""

from loguru import logger

from pipecat.frames.frames import Frame, LLMContextFrame, LLMRunFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from knowledge_base import KnowledgeBase, format_context


# Sentinel key để đánh dấu message do RAG inject — dễ tìm và xoá
_RAG_SENTINEL = "_rag"


class RAGProcessor(FrameProcessor):
    """FrameProcessor: chèn RAG context trước mỗi lượt LLM generation.

    - Xoá context đã inject ở lượt trước (chỉ giữ 1 context message)
    - Search KnowledgeBase với câu hỏi mới nhất
    - Inject kết quả dưới dạng system message
    """

    def __init__(
        self,
        context: LLMContext,
        knowledge_base: KnowledgeBase,
        top_k: int = 3,
        max_context_chars: int = 1500,
    ):
        super().__init__()
        self._context = context
        self._kb = knowledge_base
        self._top_k = top_k
        self._max_context_chars = max_context_chars

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Bắt cả LLMContextFrame (user_agg push sau khi user nói) và
        # LLMRunFrame (/chat endpoint push bằng tay) để inject context
        if isinstance(frame, (LLMContextFrame, LLMRunFrame)):
            await self._inject_context()

        await self.push_frame(frame, direction)

    async def _inject_context(self):
        """Search KB và inject context vào LLM context."""
        # 1. Xoá context đã inject từ lần trước (dùng sentinel)
        self._remove_previous_context()

        # 2. Lấy câu hỏi mới nhất từ user
        query = self._get_last_user_query()
        if not query:
            return

        # 3. Search KB
        chunks = self._kb.search(query, top_k=self._top_k)
        if not chunks:
            logger.info(f"📚 RAG: Không tìm thấy kiến thức liên quan cho: {query[:80]}")
            return

        # 4. Format context
        context_text = format_context(chunks, max_chars=self._max_context_chars)
        if not context_text:
            return

        # 5. Inject system message với thông tin tham khảo + sentinel
        rag_message = {
            "role": "system",
            "content": (
                "Đây là thông tin nội bộ hãy dùng nó để trả lời câu hỏi của khách hàng "
                "(ưu tiên hơn kiến thức mặc định của bạn):\n\n"
                f"{context_text}"
            ),
            _RAG_SENTINEL: True,
        }

        # Chèn ngay trước user message cuối cùng
        self._insert_before_last_user(rag_message)

        sources = list(set(c["source"] for c in chunks))
        logger.info(f"📚 RAG: injected {len(chunks)} chunk(s) từ {sources} — cho query: {query[:80]}")

    def _remove_previous_context(self):
        """Xoá các messages do RAG inject ở lần trước (dùng sentinel key)."""
        self._context.set_messages([
            m for m in self._context.get_messages() if not m.get(_RAG_SENTINEL)
        ])

    def _get_last_user_query(self) -> str | None:
        """Lấy nội dung user message cuối cùng trong context."""
        for msg in reversed(self._context.messages):
            if msg.get("role") == "user":
                return msg.get("content", "").strip()
        return None

    def _insert_before_last_user(self, message: dict):
        """Chèn message vào ngay trước user message cuối cùng."""
        # Tìm index của user message cuối cùng
        last_user_idx = -1
        for i in range(len(self._context.messages) - 1, -1, -1):
            if self._context.messages[i].get("role") == "user":
                last_user_idx = i
                break

        if last_user_idx >= 0:
            self._context.messages.insert(last_user_idx, message)
        else:
            # Fallback: append
            self._context.add_message(message)
