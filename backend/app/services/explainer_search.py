from datetime import date
import logging
import os
import time
from typing import Any, Optional, Sequence, Union

from app.models.explainer_docs import RetrievalResult, SourceDocument
from app.services.explainer_retrieval import retrieve_plain
from app.services.explainer_vector import (
    build_vector_index,
    chroma_available,
    rank_with_vectors,
    retrieve_vector,
)

logger = logging.getLogger(__name__)


def use_chroma_enabled() -> bool:
    """Return True if USE_CHROMA environment variable is set to a truthy value."""
    val = os.getenv("USE_CHROMA", "").strip().lower()
    return val in {"1", "true", "yes", "on"}


def build_query_text(
    sectors: Sequence[str],
    period_label: Optional[str] = None,
) -> str:
    """Construct search query text from sector list and optional period label."""
    if sectors:
        text = f"{', '.join(sectors)} sector performance, policy and market events"
    else:
        text = "Indian stock market performance, policy and market events"

    if period_label:
        text += f" over {period_label}"
    return text


def retrieve(
    documents: Sequence[SourceDocument],
    sectors: Sequence[str],
    window_start: Union[str, date],
    window_end: Union[str, date],
    query_text: Optional[str] = None,
    kinds: Optional[Sequence[str]] = None,
    limit: int = 6,
    use_vector: Optional[bool] = None,
    embedding_function: Any = None,
) -> RetrievalResult:
    """Retrieve documents using Chroma vector search if enabled, falling back to plain retrieval."""
    # Ensure invalid date strings raise ValueError immediately (propagating plain path validation)
    if isinstance(window_start, str):
        date.fromisoformat(window_start)
    if isinstance(window_end, str):
        date.fromisoformat(window_end)

    is_enabled = use_chroma_enabled() if use_vector is None else bool(use_vector)

    if not is_enabled:
        return retrieve_plain(
            documents=documents,
            sectors=sectors,
            window_start=window_start,
            window_end=window_end,
            kinds=kinds,
            limit=limit,
        )

    if not chroma_available():
        logger.warning("ChromaDB is not installed; falling back to plain retrieval.")
        plain_res = retrieve_plain(
            documents=documents,
            sectors=sectors,
            window_start=window_start,
            window_end=window_end,
            kinds=kinds,
            limit=limit,
        )
        return RetrievalResult(
            mode="filter",
            documents=plain_res.documents,
            fallback_reason="ChromaDB is not installed.",
        )

    effective_query = query_text if query_text is not None else build_query_text(sectors)

    try:
        return retrieve_vector(
            documents=documents,
            sectors=sectors,
            window_start=window_start,
            window_end=window_end,
            query_text=effective_query,
            kinds=kinds,
            limit=limit,
            embedding_function=embedding_function,
        )
    except Exception as e:
        logger.warning(
            "Vector search failed: %s: %s; falling back to plain retrieval.",
            type(e).__name__,
            str(e),
        )
        plain_res = retrieve_plain(
            documents=documents,
            sectors=sectors,
            window_start=window_start,
            window_end=window_end,
            kinds=kinds,
            limit=limit,
        )
        return RetrievalResult(
            mode="filter",
            documents=plain_res.documents,
            fallback_reason=f"Vector search failed: {type(e).__name__}",
        )


def warm_up_vector(
    documents: Sequence[SourceDocument],
    embedding_function: Any = None,
    use_vector: Optional[bool] = None,
) -> bool:
    """Warm up vector index and embedding model. Never raises."""
    is_enabled = use_chroma_enabled() if use_vector is None else bool(use_vector)
    if not is_enabled or not chroma_available():
        return False

    start_time = time.perf_counter()
    try:
        index = build_vector_index(documents, embedding_function=embedding_function)
        candidate_ids = [documents[0].id] if documents else []
        rank_with_vectors(index, candidate_ids=candidate_ids, query_text="warmup")
        elapsed = time.perf_counter() - start_time
        logger.info("Vector warm-up completed in %.3f seconds.", elapsed)
        return True
    except Exception as e:
        elapsed = time.perf_counter() - start_time
        logger.warning(
            "Vector warm-up failed after %.3f seconds with %s: %s.",
            elapsed,
            type(e).__name__,
            str(e),
        )
        return False
