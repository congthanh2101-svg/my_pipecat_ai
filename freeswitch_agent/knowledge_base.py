"""
KnowledgeBase — ChromaDB-backed RAG với Vietnamese Sentence Embedding
======================================================================
- Embedding: keepitreal/vietnamese-sbert (tối ưu cho tiếng Việt)
- Storage: ChromaDB persistent (SQLite backend, không cần Docker)
- Chunking: paragraph + sentence-based, tự động overlap

Cách dùng:
    kb = KnowledgeBase()
    kb.index_directory("knowledge/")   # index tất cả file .txt, .md, .pdf
    results = kb.search("câu hỏi của user", top_k=3)
"""

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Optional

from loguru import logger

# ---------------------------------------------------------------------------
# ChromaDB & SentenceTransformer (lazy import — tránh crash nếu không cài)
# ---------------------------------------------------------------------------
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    chromadb = None
    ChromaSettings = object

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"
CHROMA_PERSIST_DIR = str(KNOWLEDGE_DIR / "chroma_db")
EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "400"))       # ký tự per chunk
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "40"))  # overlap ký tự
TOP_K = int(os.getenv("RAG_TOP_K", "3"))                    # số chunks retrieved mặc định
SEARCH_CONFIDENCE = float(os.getenv("RAG_SEARCH_CONFIDENCE", "0.3"))  # ngưỡng similarity tối thiểu


# ---------------------------------------------------------------------------
# KnowledgeBase class
# ---------------------------------------------------------------------------
class KnowledgeBase:
    """Quản lý vector store cho RAG — ChromaDB + Vietnamese Sentence Transformer.

    Usage:
        kb = KnowledgeBase()
        kb.index_directory()          # index tất cả documents trong knowledge/
        kb.search("câu hỏi của user") # retrieve chunks
    """

    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR, collection_name: str = "knowledge"):
        if chromadb is None:
            raise ImportError("chromadb chưa được cài đặt. Chạy: pip install chromadb")
        if SentenceTransformer is None:
            raise ImportError(
                "sentence-transformers chưa được cài đặt. Chạy: pip install sentence-transformers"
            )

        self._persist_dir = persist_dir
        self._collection_name = collection_name

        # Embedding model (load 1 lần, dùng chung)
        logger.info(f"📚 Loading embedding model: {EMBEDDING_MODEL} ...")
        self._embedder = SentenceTransformer(EMBEDDING_MODEL)
        dim = getattr(self._embedder, "get_embedding_dimension", self._embedder.get_sentence_embedding_dimension)()
        logger.info(f"📚 Embedding model loaded (dim={dim})")

        # ChromaDB client
        os.makedirs(persist_dir, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # cosine similarity
        )
        logger.info(f"📚 ChromaDB ready @ {persist_dir} ({self._collection.count()} chunks)")

    # -----------------------------------------------------------------------
    # Document indexing
    # -----------------------------------------------------------------------
    def index_directory(self, directory: str | Path = KNOWLEDGE_DIR) -> int:
        """Index tất cả .txt, .md, .pdf, .json files trong thư mục.

        Returns:
            Số chunks đã thêm mới.
        """
        directory = Path(directory)
        if not directory.exists():
            logger.warning(f"📚 knowledge/ directory not found: {directory}")
            return 0

        files = sorted(
            p for p in directory.iterdir()
            if p.suffix.lower() in (".txt", ".md", ".json") and p.is_file()
        )
        if not files:
            logger.info("📚 No documents found in knowledge/")
            return 0

        total_chunks = 0
        for fpath in files:
            added = self._index_file(fpath)
            total_chunks += added
            logger.info(f"📚 Indexed {fpath.name}: {added} chunks")

        logger.info(f"📚 Total: {total_chunks} new chunks (collection: {self._collection.count()})")
        return total_chunks

    def _index_file(self, fpath: Path) -> int:
        """Index một file, bỏ qua chunks đã tồn tại (dùng content hash)."""
        text = fpath.read_text(encoding="utf-8")
        chunks = self._chunk_text(text)

        # Tính hash cho mỗi chunk để tránh index trùng
        new_chunks = []
        new_ids = []
        new_metadatas = []
        existing_ids = set(self._collection.get()["ids"]) if self._collection.count() else set()

        for chunk in chunks:
            chunk_id = hashlib.md5(chunk.encode("utf-8")).hexdigest()
            if chunk_id not in existing_ids:
                new_chunks.append(chunk)
                new_ids.append(chunk_id)
                new_metadatas.append({"source": fpath.name})

        if not new_chunks:
            return 0

        # Embed
        embeddings = self._embedder.encode(new_chunks, show_progress_bar=False).tolist()

        # Add to ChromaDB
        self._collection.add(
            embeddings=embeddings,
            documents=new_chunks,
            ids=new_ids,
            metadatas=new_metadatas,
        )
        return len(new_chunks)

    # -----------------------------------------------------------------------
    # Search / retrieval
    # -----------------------------------------------------------------------
    def search(
        self, query: str, top_k: int = TOP_K, min_score: float = SEARCH_CONFIDENCE
    ) -> list[dict]:
        """Tìm kiếm chunks liên quan nhất đến query.

        Returns:
            List of dict: [{"text": "...", "score": 0.85, "source": "file.md"}, ...]
        """
        if not query or not query.strip():
            return []
        if self._collection.count() == 0:
            return []

        q_emb = self._embedder.encode([query]).tolist()
        results = self._collection.query(
            query_embeddings=q_emb,
            n_results=min(top_k, self._collection.count()),
            include=["documents", "distances", "metadatas"],
        )

        # ChromaDB returns distances; convert to similarity score
        items = []
        for i in range(len(results["ids"][0])):
            distance = results["distances"][0][i]  # cosine distance [0, 2]
            score = 1.0 - distance / 2.0  # normalize to [0, 1]
            if score >= min_score:
                items.append({
                    "text": results["documents"][0][i],
                    "score": round(score, 4),
                    "source": (results["metadatas"][0][i] or {}).get("source", "unknown"),
                })

        # Sort by score descending
        items.sort(key=lambda x: x["score"], reverse=True)
        return items

    def search_texts(self, query: str, top_k: int = TOP_K) -> list[str]:
        """Convenience: chỉ lấy text, bỏ qua metadata."""
        return [item["text"] for item in self.search(query, top_k=top_k)]

    # -----------------------------------------------------------------------
    # Document management
    # -----------------------------------------------------------------------
    def list_documents(self) -> list[dict]:
        """Liệt kê tất cả source documents và số chunks."""
        if self._collection.count() == 0:
            return []
        data = self._collection.get(include=["metadatas"])
        sources = {}
        for meta in data["metadatas"]:
            src = (meta or {}).get("source", "unknown")
            sources[src] = sources.get(src, 0) + 1
        return [{"source": src, "chunks": count} for src, count in sorted(sources.items())]

    def delete_document(self, source: str) -> int:
        """Xoá tất cả chunks từ một source document."""
        data = self._collection.get(where={"source": source})
        ids = data["ids"]
        if ids:
            self._collection.delete(ids=ids)
            logger.info(f"📚 Deleted {len(ids)} chunks from '{source}'")
        return len(ids)

    def count(self) -> int:
        """Tổng số chunks trong collection."""
        return self._collection.count()

    # -----------------------------------------------------------------------
    # Text chunking
    # -----------------------------------------------------------------------
    @staticmethod
    def _chunk_text(text: str) -> list[str]:
        """Chia văn bản thành chunks với overlap.

        Strategy:
        1. Tách theo paragraph (\n\n) trước
        2. Ghép các paragraph nhỏ cho đến khi đạt CHUNK_SIZE
        3. Overlap CHUNK_OVERLAP ký tự từ chunk trước
        """
        # Normalize whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = text.strip()
        if not text:
            return []

        paragraphs = text.split("\n\n")
        chunks = []
        current = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if not current:
                current = para
            elif len(current) + len(para) < CHUNK_SIZE:
                current += "\n\n" + para
            else:
                chunks.append(current)
                # Overlap: lấy CHUNK_OVERLAP ký tự cuối của chunk trước
                overlap = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
                current = overlap + "\n\n" + para

        if current:
            chunks.append(current)

        return chunks


# ---------------------------------------------------------------------------
# Singleton + auto-index on first use
# ---------------------------------------------------------------------------
_knowledge_base: Optional[KnowledgeBase] = None


def get_knowledge_base(reindex: bool = False) -> KnowledgeBase:
    """Get or create singleton KnowledgeBase — auto-index nếu chưa có data."""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase()
        if reindex or _knowledge_base.count() == 0:
            _knowledge_base.index_directory()
    return _knowledge_base


def format_context(chunks: list[dict], max_chars: int = 1500) -> str:
    """Format danh sách chunks thành context string để inject vào prompt.

    Args:
        chunks: list từ KnowledgeBase.search()
        max_chars: Giới hạn tổng độ dài context (tránh tràn token)

    Returns:
        String đã format, sẵn sàng inject.
    """
    if not chunks:
        return ""

    parts = []
    total = 0
    for chunk in chunks:
        text = chunk["text"]
        if total + len(text) > max_chars:
            # Cắt bớt
            remaining = max_chars - total
            if remaining > 50:
                parts.append(text[:remaining] + "...")
            break
        parts.append(text)
        total += len(text)

    context = "\n\n---\n".join(parts)
    return context
