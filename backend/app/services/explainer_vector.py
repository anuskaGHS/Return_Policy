from dataclasses import dataclass
from datetime import date
import hashlib
import logging
from typing import Any, Optional, Sequence, Union
import uuid

from app.models.explainer_docs import (
    RetrievalResult,
    RetrievedDocument,
    SourceDocument,
)
from app.services.explainer_retrieval import retrieve_plain

logger = logging.getLogger(__name__)

try:
    import chromadb
    from chromadb.config import Settings
    _CHROMA_AVAILABLE = True
except ImportError:
    chromadb = None  # type: ignore
    Settings = None  # type: ignore
    _CHROMA_AVAILABLE = False


def chroma_available() -> bool:
    """Return True if chromadb is installed and importable."""
    return _CHROMA_AVAILABLE


@dataclass(frozen=True)
class VectorIndex:
    collection: Any
    document_count: int


_INDEX_CACHE: dict[str, VectorIndex] = {}


def reset_vector_cache() -> None:
    """Clear the in-memory vector index cache."""
    _INDEX_CACHE.clear()


def _doc_to_text(doc: SourceDocument) -> str:
    text = f"{doc.title}. {doc.summary}"
    if doc.extract:
        text += f" {doc.extract}"
    return text


def _compute_cache_key(
    documents: Sequence[SourceDocument],
    embedding_function: Any = None,
) -> str:
    h = hashlib.sha256()
    for doc in documents:
        text = _doc_to_text(doc)
        h.update(f"{doc.id}:{text}\n".encode("utf-8"))
    if embedding_function is not None:
        ef_name = getattr(embedding_function, "name", lambda: None)() or type(embedding_function).__name__
        h.update(f"::ef::{ef_name}".encode("utf-8"))
    return h.hexdigest()


def build_vector_index(
    documents: Sequence[SourceDocument],
    embedding_function: Any = None,
) -> VectorIndex:
    """Build or retrieve a cached in-memory Chroma vector index for documents."""
    if not chroma_available():
        raise RuntimeError("ChromaDB is not installed or available.")

    cache_key = _compute_cache_key(documents, embedding_function)
    if cache_key in _INDEX_CACHE:
        return _INDEX_CACHE[cache_key]

    logger.info("Building vector index for %d documents (cache_key=%s)", len(documents), cache_key[:8])

    client = chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))
    collection_name = f"col_{uuid.uuid4().hex}"

    if embedding_function is not None:
        collection = client.create_collection(
            name=collection_name,
            embedding_function=embedding_function,
        )
    else:
        collection = client.create_collection(name=collection_name)

    if documents:
        ids = [doc.id for doc in documents]
        texts = [_doc_to_text(doc) for doc in documents]
        metadatas = [{"doc_id": doc.id} for doc in documents]
        collection.add(ids=ids, documents=texts, metadatas=metadatas)

    index = VectorIndex(collection=collection, document_count=len(documents))
    _INDEX_CACHE[cache_key] = index
    return index


def rank_with_vectors(
    index: VectorIndex,
    candidate_ids: list[str],
    query_text: str,
) -> list[str]:
    """Query Chroma collection filtered to candidate IDs and return IDs ordered by similarity."""
    if not candidate_ids or index.document_count == 0:
        return []

    results = index.collection.query(
        query_texts=[query_text],
        where={"doc_id": {"$in": candidate_ids}},
        n_results=len(candidate_ids),
    )

    if results and "ids" in results and results["ids"] and results["ids"][0]:
        return list(results["ids"][0])
    return []


def retrieve_vector(
    documents: Sequence[SourceDocument],
    sectors: Sequence[str],
    window_start: Union[str, date],
    window_end: Union[str, date],
    query_text: str,
    kinds: Optional[Sequence[str]] = None,
    limit: int = 6,
    embedding_function: Any = None,
) -> RetrievalResult:
    """Retrieve documents using hard filters first, then ranking candidates by vector similarity."""
    plain_result = retrieve_plain(
        documents=documents,
        sectors=sectors,
        window_start=window_start,
        window_end=window_end,
        kinds=kinds,
        limit=len(documents),
    )

    candidate_docs = plain_result.documents
    if not candidate_docs:
        return RetrievalResult(mode="vector", documents=[])

    candidate_ids = [doc.id for doc in candidate_docs]
    candidate_map = {doc.id: doc for doc in candidate_docs}

    index = build_vector_index(documents, embedding_function=embedding_function)
    ranked_ids = rank_with_vectors(index, candidate_ids=candidate_ids, query_text=query_text)

    seen_ids = set()
    ordered_docs: list[RetrievedDocument] = []

    for doc_id in ranked_ids:
        if doc_id in candidate_map and doc_id not in seen_ids:
            ordered_docs.append(candidate_map[doc_id])
            seen_ids.add(doc_id)

    # Documents Chroma does not return keep their plain order after the ranked ones
    for doc in candidate_docs:
        if doc.id not in seen_ids:
            ordered_docs.append(doc)
            seen_ids.add(doc.id)

    return RetrievalResult(mode="vector", documents=ordered_docs[:limit])
