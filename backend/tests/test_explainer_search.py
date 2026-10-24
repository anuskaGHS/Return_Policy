import hashlib
import math
import os
from pathlib import Path
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.explainer_docs import SourceDocument
from app.services.explainer_retrieval import retrieve_plain
import app.services.explainer_search as explainer_search
from app.services.explainer_search import (
    build_query_text,
    retrieve,
    use_chroma_enabled,
    warm_up_vector,
)


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


def test_use_chroma_enabled_parsing(monkeypatch):
    # Accepted values
    for val in ["1", "true", "True", "TRUE", "yes", "  yes  ", "on", "ON"]:
        monkeypatch.setenv("USE_CHROMA", val)
        assert use_chroma_enabled() is True

    # Rejected values
    for val in ["0", "false", "FALSE", "no", "off", "", "   ", "random", "2"]:
        monkeypatch.setenv("USE_CHROMA", val)
        assert use_chroma_enabled() is False

    # Unset
    monkeypatch.delenv("USE_CHROMA", raising=False)
    assert use_chroma_enabled() is False


def test_use_vector_override_environment(monkeypatch):
    doc = make_doc("d1", ["IT"])
    docs = [doc]

    # Env enabled, but use_vector=False overrides to disabled
    monkeypatch.setenv("USE_CHROMA", "1")
    monkeypatch.setattr(
        explainer_search,
        "retrieve_vector",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("Should not call retrieve_vector")),
    )
    res_disabled = retrieve(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        use_vector=False,
    )
    assert res_disabled.mode == "filter"
    assert res_disabled.fallback_reason is None

    # Env disabled, but use_vector=True overrides to enabled
    monkeypatch.setenv("USE_CHROMA", "0")
    monkeypatch.setattr(explainer_search, "chroma_available", lambda: False)
    res_enabled = retrieve(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        use_vector=True,
    )
    assert res_enabled.mode == "filter"
    assert res_enabled.fallback_reason == "ChromaDB is not installed."


def test_disabled_mode(monkeypatch):
    monkeypatch.delenv("USE_CHROMA", raising=False)
    monkeypatch.setattr(
        explainer_search,
        "retrieve_vector",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("Should not call retrieve_vector")),
    )

    doc = make_doc("d1", ["IT"])
    res = retrieve(
        documents=[doc],
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
    )
    assert res.mode == "filter"
    assert res.fallback_reason is None
    assert len(res.documents) == 1
    assert res.documents[0].id == "d1"


def test_enabled_with_working_vector_search(monkeypatch):
    pytest.importorskip("chromadb")
    from chromadb.api.types import Documents, Embeddings, EmbeddingFunction

    class DeterministicFakeEF(EmbeddingFunction[Documents]):
        def __init__(self, dim: int = 64) -> None:
            self.dim = dim

        @staticmethod
        def name() -> str:
            return "search_test_ef"

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

    monkeypatch.setenv("USE_CHROMA", "1")
    ef = DeterministicFakeEF()

    d1 = make_doc("d1", ["IT"], title="Cloud Growth", summary="Cloud software enterprise infrastructure.")
    d2 = make_doc("d2", ["IT"], title="IT Hardware", summary="Laptops monitors hardware peripherals.")
    docs = [d1, d2]

    res = retrieve(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
        query_text="cloud enterprise software",
        embedding_function=ef,
    )

    assert res.mode == "vector"
    assert res.fallback_reason is None
    assert [d.id for d in res.documents] == ["d1", "d2"]


def test_enabled_vector_search_raises_runtime_error(monkeypatch, caplog):
    monkeypatch.setenv("USE_CHROMA", "1")
    monkeypatch.setattr(explainer_search, "chroma_available", lambda: True)

    def failing_retrieve_vector(*args, **kwargs):
        raise RuntimeError("Vector database failed to execute query.")

    monkeypatch.setattr(explainer_search, "retrieve_vector", failing_retrieve_vector)

    d1 = make_doc("d1", ["IT"], summary="Document 1.")
    d2 = make_doc("d2", ["IT"], summary="Document 2.")
    docs = [d1, d2]

    with caplog.at_level("WARNING"):
        res = retrieve(
            documents=docs,
            sectors=["IT"],
            window_start="2025-01-01",
            window_end="2025-03-31",
        )

    assert res.mode == "filter"
    assert res.fallback_reason == "Vector search failed: RuntimeError"
    assert "Vector search failed: RuntimeError" in caplog.text

    expected_plain = retrieve_plain(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
    )
    assert [d.id for d in res.documents] == [d.id for d in expected_plain.documents]
    assert [d.score for d in res.documents] == [d.score for d in expected_plain.documents]


def test_enabled_chroma_missing(monkeypatch, caplog):
    monkeypatch.setenv("USE_CHROMA", "1")
    monkeypatch.setattr(explainer_search, "chroma_available", lambda: False)

    doc = make_doc("d1", ["IT"])
    docs = [doc]

    with caplog.at_level("WARNING"):
        res = retrieve(
            documents=docs,
            sectors=["IT"],
            window_start="2025-01-01",
            window_end="2025-03-31",
        )

    assert res.mode == "filter"
    assert res.fallback_reason == "ChromaDB is not installed."
    assert "ChromaDB is not installed" in caplog.text

    expected_plain = retrieve_plain(
        documents=docs,
        sectors=["IT"],
        window_start="2025-01-01",
        window_end="2025-03-31",
    )
    assert [d.id for d in res.documents] == [d.id for d in expected_plain.documents]


def test_bad_date_string_propagates_value_error(monkeypatch):
    monkeypatch.setenv("USE_CHROMA", "1")
    doc = make_doc("d1", ["IT"])
    docs = [doc]

    with pytest.raises(ValueError):
        retrieve(
            documents=docs,
            sectors=["IT"],
            window_start="invalid-date",
            window_end="2025-03-31",
        )

    with pytest.raises(ValueError):
        retrieve(
            documents=docs,
            sectors=["IT"],
            window_start="2025-01-01",
            window_end="2025-13-45",
        )


def test_build_query_text():
    # 0 sectors
    assert (
        build_query_text([])
        == "Indian stock market performance, policy and market events"
    )
    assert (
        build_query_text([], period_label="1Y")
        == "Indian stock market performance, policy and market events over 1Y"
    )

    # 1 sector
    assert (
        build_query_text(["IT"])
        == "IT sector performance, policy and market events"
    )
    assert (
        build_query_text(["IT"], period_label="6M")
        == "IT sector performance, policy and market events over 6M"
    )

    # 2 sectors
    assert (
        build_query_text(["IT", "Financials"])
        == "IT, Financials sector performance, policy and market events"
    )
    assert (
        build_query_text(["IT", "Financials"], period_label="3Y")
        == "IT, Financials sector performance, policy and market events over 3Y"
    )


def test_warm_up_vector(monkeypatch):
    doc = make_doc("d1", ["IT"], summary="Software cloud.")
    docs = [doc]

    # False when disabled
    monkeypatch.delenv("USE_CHROMA", raising=False)
    assert warm_up_vector(docs) is False

    # When enabled with fake EF
    pytest.importorskip("chromadb")
    from chromadb.api.types import Documents, Embeddings, EmbeddingFunction

    class DeterministicFakeEF(EmbeddingFunction[Documents]):
        def __init__(self, dim: int = 64) -> None:
            self.dim = dim

        @staticmethod
        def name() -> str:
            return "warmup_fake_ef"

        def get_config(self) -> dict:
            return {"dim": self.dim}

        @staticmethod
        def build_from_config(config: dict) -> "DeterministicFakeEF":
            return DeterministicFakeEF(dim=config.get("dim", 64))

        def __call__(self, input: Documents) -> Embeddings:
            return [[1.0] * self.dim for _ in input]

    monkeypatch.setenv("USE_CHROMA", "1")
    assert warm_up_vector(docs, embedding_function=DeterministicFakeEF()) is True

    # False and no exception when build_vector_index raises
    def failing_build(*args, **kwargs):
        raise RuntimeError("Model download failed")

    monkeypatch.setattr(explainer_search, "build_vector_index", failing_build)
    assert warm_up_vector(docs, embedding_function=DeterministicFakeEF()) is False
