import logging
import threading
from functools import lru_cache
from typing import Any, Dict, List, Optional, Sequence

from app.models.explainer import AttributionResult
from app.models.explainer_data import ExplainerData
from app.models.explainer_docs import SourceDocument
from app.services import explainer_search
from app.services.explainer_ai import PERIOD_EN, generate_explainer_text
from app.services.explainer_data import get_attribution_input, load_explainer_data
from app.services.explainer_engine import calculate_attribution
from app.services.explainer_retrieval import load_documents, period_window
from app.services.explainer_search import build_query_text, use_chroma_enabled, warm_up_vector

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_data() -> ExplainerData:
    return load_explainer_data()


@lru_cache(maxsize=1)
def get_documents() -> list[SourceDocument]:
    try:
        data = get_data()
        taxonomy = data.sector_taxonomy if data else None
        return load_documents(taxonomy=taxonomy)
    except Exception as e:
        logger.warning("Failed to load explainer documents: %s", e)
        return []


def clear_caches() -> None:
    get_data.cache_clear()
    get_documents.cache_clear()


def warm_up() -> None:
    try:
        data = get_data()
        docs = get_documents()
        if use_chroma_enabled():
            t = threading.Thread(target=warm_up_vector, args=(docs,), daemon=True)
            t.start()
    except Exception as e:
        logger.warning("Explainer warm_up encountered error: %s", e)


def analyze(fund_id: str, period: str = "1Y", language: str = "en") -> dict:
    # 1. Load data, find fund and benchmark, calculate attribution
    data = get_data()
    fund = next((f for f in data.funds if f.id == fund_id), None)
    if fund is None:
        raise ValueError("Unknown fund.")

    if fund.benchmark_id not in data.benchmarks:
        raise ValueError(f"Unknown benchmark '{fund.benchmark_id}'.")
    benchmark = data.benchmarks[fund.benchmark_id]

    attr_input = get_attribution_input(data, fund_id, period)
    attribution = calculate_attribution(attr_input)

    # 2. Choose retrieval sectors from attribution.sectors
    valid_sectors = [s for s in attribution.sectors if "estimated" not in s.sector.lower()]
    qualifying = [s for s in valid_sectors if abs(s.effect_pts) >= 0.2]

    if qualifying:
        qualifying.sort(key=lambda s: abs(s.effect_pts), reverse=True)
        retrieval_sectors = [s.sector for s in qualifying[:3]]
    elif valid_sectors:
        single_largest = max(valid_sectors, key=lambda s: abs(s.effect_pts))
        retrieval_sectors = [single_largest.sector]
    else:
        retrieval_sectors = []

    # 3. Retrieve documents
    w_start, w_end = period_window(data.as_of, period)
    period_label = PERIOD_EN.get(period, period)
    query_text = build_query_text(retrieval_sectors, period_label=period_label)
    docs = get_documents()
    res = explainer_search.retrieve(
        documents=docs,
        sectors=retrieval_sectors,
        window_start=w_start,
        window_end=w_end,
        query_text=query_text,
        limit=4,
    )

    # 4. Generate AI/code explanation
    explanation = generate_explainer_text(
        result=attribution,
        fund_name=fund.name,
        benchmark_name=benchmark.name,
        period=period,
        portfolio_as_of=fund.portfolio_as_of,
        language=language,
    )

    # 5. Format response dict
    formatted_documents = [
        {
            "id": doc.id,
            "title": doc.title,
            "publisher": doc.publisher,
            "url": doc.url,
            "published_on": doc.published_on,
            "kind": doc.kind,
            "source_type": doc.source_type,
            "summary": doc.summary,
            "extract": doc.extract,
            "matched_sectors": doc.matched_sectors,
        }
        for doc in res.documents
    ]

    # De-duplicate data sources by url
    all_sources = fund.sources + benchmark.sources + data.sector_returns.sources
    seen_urls = set()
    data_sources = []
    for src in all_sources:
        if src.url not in seen_urls:
            seen_urls.add(src.url)
            data_sources.append({
                "label": src.label,
                "url": src.url,
                "accessed_on": src.accessed_on,
            })

    return {
        "fund": {
            "id": fund.id,
            "name": fund.name,
            "category": fund.category,
            "plan": fund.plan,
        },
        "benchmark": {
            "name": benchmark.name,
        },
        "period": period,
        "as_of": data.as_of,
        "portfolio_as_of": fund.portfolio_as_of,
        "result": attribution.model_dump(),
        "explanation": explanation,
        "documents": formatted_documents,
        "data_sources": data_sources,
        "index_used": data.sector_returns.index_used,
        "notes": fund.notes,
        "retrieval": {
            "mode": res.mode,
        },
    }
