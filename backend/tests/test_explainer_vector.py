from datetime import date
import hashlib
import math
import os
from pathlib import Path
import sys
import pytest

chromadb = pytest.importorskip("chromadb")
from chromadb.api.types import Documents, Embeddings, EmbeddingFunction

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.explainer_docs import SourceDocument
from app.services.explainer_retrieval import retrieve_plain
import app.services.explainer_vector as explainer_vector
from app.services.explainer_vector import (
    VectorIndex,
    build_vector_index,
    chroma_available,
    rank_with_vectors,
    reset_vector_cache,
    retrieve_vector,
)


class DeterministicFakeEF(EmbeddingFunction[Documents]):
    """Deterministic 64-dimension bag-of-words embedding function for testing."""

    def __init__(self, dim: int = 64) -> None:
        self.dim = dim

    @staticmethod
    def name() -> str:
        return "deterministic_fake_ef"

    def get_config(self) -> dict:
        return {"dim": self.dim}

    @staticmethod
    def build_from_config(config: dict) -> "DeterministicFakeEF":
        return DeterministicFakeEF(dim=config.get("dim", 64))

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            vec = [0.0] * self.dim
            for word in text.lower().split():
                idx = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % self.dim
                vec[idx] += 1.0
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            embeddings.append(vec)
        return embeddings


def make_doc(
    doc_id: str,
    sectors: list[str],
    title: str = "Test Title",
    summary: str = "Test summary.",
    extract: str = None,
    published_on: str = "2025-02-01",
    event_start: str = None,
    event_end: str = None,
    kind: str = "market",
    source_type: str = "news",
    url: str = "https://example.com/test",
    publisher: str = "Test Publisher",
    accessed_on: str = "2025-03-31",
) -> SourceDocument:
    return SourceDocument(
        id=doc_id,
        title=title,
        publisher=publisher,
        url=url,
        published_on=published_on,
        event_start=event_start,
        event_end=event_end,
        kind=kind,
        source_type=source_type,
        sectors=sectors,
        summary=summary,
        extract=extract,
        accessed_on=accessed_on,
    )


@pytest.fixture(autouse=True)
def clear_cache():
    reset_vector_cache()
    yield
    reset_vector_cache()


def test_chroma_available():
    assert chroma_available() is True


def test_semantic_order():
    ef = DeterministicFakeEF()
    doc_bank = make_doc(
        "doc_bank",
        sectors=["Financials"],
        title="Bank Credit Growth",
        summary="Commercial bank credit loans retail deposits margin expansion.",
    )
    doc_cloud = make_doc(
        "doc_cloud",
        sectors=["IT"],
        title="Cloud Software Demand",
        summary="Enterprise cloud software demand infrastructure SaaS applications.",
    )
    docs = [doc_bank, doc_cloud]

    res = retrieve_vector(
        documents=docs,
        sectors=["IT", "Financials"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="cloud software enterprise",
        embedding_function=ef,
    )

    ids = [d.id for d in res.documents]
    assert ids == ["doc_cloud", "doc_bank"]


def test_filters_still_win():
    ef = DeterministicFakeEF()
    # Semantically closest doc to query "cloud software demand", but in Healthcare (fails sector filter)
    doc_cloud_wrong_sector = make_doc(
        "d_wrong_sector",
        sectors=["Healthcare"],
        title="Cloud Software Demand in Clinics",
        summary="Cloud software demand enterprise SaaS applications.",
    )
    # Semantically closest doc but published outside date window
    doc_cloud_wrong_date = make_doc(
        "d_wrong_date",
        sectors=["IT"],
        title="Cloud Software Demand",
        summary="Cloud software demand enterprise SaaS applications.",
        published_on="2023-01-01",
    )
    # Semantically closest doc but kind fails
    doc_cloud_wrong_kind = make_doc(
        "d_wrong_kind",
        sectors=["IT"],
        title="Cloud Software Demand",
        summary="Cloud software demand enterprise SaaS applications.",
        kind="company",
    )
    # Allowed doc (Financials, market kind, valid date)
    doc_bank_valid = make_doc(
        "d_bank_valid",
        sectors=["Financials"],
        title="Bank Credit and Deposits",
        summary="Commercial bank lending and credit deposit rates.",
        kind="policy",
    )

    docs = [doc_cloud_wrong_sector, doc_cloud_wrong_date, doc_cloud_wrong_kind, doc_bank_valid]

    res = retrieve_vector(
        documents=docs,
        sectors=["IT", "Financials"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="cloud software demand enterprise",
        kinds=["policy"],
        embedding_function=ef,
    )

    ids = [d.id for d in res.documents]
    assert "d_wrong_sector" not in ids
    assert "d_wrong_date" not in ids
    assert "d_wrong_kind" not in ids
    assert ids == ["d_bank_valid"]


def test_mode_score_and_matched_sectors():
    ef = DeterministicFakeEF()
    doc1 = make_doc(
        "d1",
        sectors=["IT", "Financials"],
        title="IT and Banking Synergy",
        summary="Cloud banking software systems.",
        source_type="official",
        kind="policy",
    )
    doc2 = make_doc(
        "d2",
        sectors=["IT"],
        title="Software Industry Overview",
        summary="Software applications and enterprise systems.",
        source_type="news",
        kind="market",
    )
    docs = [doc1, doc2]

    plain_res = retrieve_plain(
        documents=docs,
        sectors=["IT", "Financials"],
        window_start="2025-01-01",
        window_end="2025-03-31",
    )
    plain_map = {d.id: d for d in plain_res.documents}

    vector_res = retrieve_vector(
        documents=docs,
        sectors=["IT", "Financials"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="enterprise software systems",
        embedding_function=ef,
    )

    assert vector_res.mode == "vector"
    assert len(vector_res.documents) == len(plain_res.documents)
    for v_doc in vector_res.documents:
        p_doc = plain_map[v_doc.id]
        assert v_doc.score == p_doc.score
        assert v_doc.matched_sectors == p_doc.matched_sectors


def test_limit_empty_and_single_candidate():
    ef = DeterministicFakeEF()
    d1 = make_doc("d1", sectors=["IT"], summary="Software enterprise systems A.")
    d2 = make_doc("d2", sectors=["IT"], summary="Software enterprise systems B.")
    d3 = make_doc("d3", sectors=["IT"], summary="Software enterprise systems C.")
    docs = [d1, d2, d3]

    # Test limit = 2
    res_limit = retrieve_vector(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="software systems",
        limit=2,
        embedding_function=ef,
    )
    assert len(res_limit.documents) == 2

    # Test empty candidate list (no docs match sector)
    res_empty = retrieve_vector(
        documents=docs,
        sectors=["Energy"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="software systems",
        embedding_function=ef,
    )
    assert res_empty.documents == []
    assert res_empty.mode == "vector"

    # Test empty input documents list
    res_no_docs = retrieve_vector(
        documents=[],
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="software systems",
        embedding_function=ef,
    )
    assert res_no_docs.documents == []
    assert res_no_docs.mode == "vector"

    # Test single candidate
    res_single = retrieve_vector(
        documents=[d1],
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="software systems",
        embedding_function=ef,
    )
    assert len(res_single.documents) == 1
    assert res_single.documents[0].id == "d1"


def test_cache(caplog):
    ef = DeterministicFakeEF()
    d1 = make_doc("d1", sectors=["IT"], summary="Software cloud.")
    d2 = make_doc("d2", sectors=["Financials"], summary="Bank credit.")
    docs = [d1, d2]

    reset_vector_cache()
    assert len(explainer_vector._INDEX_CACHE) == 0

    with caplog.at_level("INFO"):
        idx1 = build_vector_index(docs, embedding_function=ef)
        assert len(explainer_vector._INDEX_CACHE) == 1
        assert "Building vector index" in caplog.text

    caplog.clear()
    with caplog.at_level("INFO"):
        idx2 = build_vector_index(docs, embedding_function=ef)
        assert len(explainer_vector._INDEX_CACHE) == 1
        assert "Building vector index" not in caplog.text
        assert idx1 is idx2

    reset_vector_cache()
    assert len(explainer_vector._INDEX_CACHE) == 0


def test_no_files_created_by_in_memory_client():
    ef = DeterministicFakeEF()
    cwd = Path.cwd()
    files_before = set(cwd.iterdir())

    d1 = make_doc("d1", sectors=["IT"], summary="Software cloud.")
    d2 = make_doc("d2", sectors=["Financials"], summary="Bank credit.")
    docs = [d1, d2]

    index = build_vector_index(docs, embedding_function=ef)
    ranked = rank_with_vectors(index, candidate_ids=["d1", "d2"], query_text="cloud")
    assert len(ranked) == 2

    files_after = set(cwd.iterdir())
    assert files_before == files_after


@pytest.mark.skipif(
    os.environ.get("RUN_REAL_EMBEDDING") != "1",
    reason="Requires RUN_REAL_EMBEDDING=1 to run with Chroma's default embedding model",
)
def test_real_default_embedding():
    doc_bank = make_doc(
        "doc_bank",
        sectors=["Financials"],
        title="Bank Credit Growth",
        summary="Commercial bank credit loans retail deposits margin expansion.",
    )
    doc_cloud = make_doc(
        "doc_cloud",
        sectors=["IT"],
        title="Cloud Software Demand",
        summary="Enterprise cloud software demand infrastructure SaaS applications.",
    )
    docs = [doc_bank, doc_cloud]

    res = retrieve_vector(
        documents=docs,
        sectors=["IT", "Financials"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="cloud software demand",
        embedding_function=None,  # Uses Chroma's real default embedding
    )

    ids = [d.id for d in res.documents]
    assert len(ids) == 2
    assert ids[0] == "doc_cloud"
    assert ids[1] == "doc_bank"
