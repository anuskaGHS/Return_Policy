import calendar
from datetime import date
import json
from pathlib import Path
from typing import Optional, Sequence, Union

from app.models.explainer_docs import (
    ExplainerDocumentsData,
    RetrievedDocument,
    RetrievalResult,
    SourceDocument,
)

DEFAULT_DOCS_PATH = Path(__file__).resolve().parents[1] / "data" / "explainer_documents.json"
VALID_KINDS = ("policy", "global", "company", "market")
VALID_SOURCE_TYPES = ("official", "news", "other")
PERIOD_MONTHS = {"6M": 6, "1Y": 12, "3Y": 36}


def load_documents(
    path: Optional[Union[str, Path]] = None,
    taxonomy: Optional[Sequence[str]] = None,
) -> list[SourceDocument]:
    if path is None:
        file_path = DEFAULT_DOCS_PATH
    else:
        file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(f"Explainer documents file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            raw_data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in explainer documents file: {e}")

    try:
        data = ExplainerDocumentsData.model_validate(raw_data)
    except Exception as e:
        raise ValueError(f"Document schema validation failed: {e}")

    # Validation rules
    seen_ids = set()
    tax_set = set(taxonomy) if taxonomy is not None else None

    for doc in data.documents:
        # 1. ids unique
        if doc.id in seen_ids:
            raise ValueError(f"Duplicate document id '{doc.id}' found.")
        seen_ids.add(doc.id)

        # 2. url starts with 'https://'
        if not doc.url.startswith("https://"):
            raise ValueError(f"Document '{doc.id}' has URL '{doc.url}' that does not start with 'https://'.")

        # 3. all dates valid ISO; event_end not before event_start; if only one of event_start/event_end is given, that is an error
        try:
            date.fromisoformat(doc.published_on)
        except (ValueError, TypeError):
            raise ValueError(f"Document '{doc.id}' published_on date '{doc.published_on}' is not a valid ISO date.")

        try:
            date.fromisoformat(doc.accessed_on)
        except (ValueError, TypeError):
            raise ValueError(f"Document '{doc.id}' accessed_on date '{doc.accessed_on}' is not a valid ISO date.")

        if (doc.event_start is None) != (doc.event_end is None):
            raise ValueError(f"Document '{doc.id}' must provide both event_start and event_end, or neither.")

        if doc.event_start is not None and doc.event_end is not None:
            try:
                start_dt = date.fromisoformat(doc.event_start)
            except (ValueError, TypeError):
                raise ValueError(f"Document '{doc.id}' event_start date '{doc.event_start}' is not a valid ISO date.")

            try:
                end_dt = date.fromisoformat(doc.event_end)
            except (ValueError, TypeError):
                raise ValueError(f"Document '{doc.id}' event_end date '{doc.event_end}' is not a valid ISO date.")

            if end_dt < start_dt:
                raise ValueError(f"Document '{doc.id}' has event_end '{doc.event_end}' before event_start '{doc.event_start}'.")

        # 4. kind and source_type in the allowed lists
        if doc.kind not in VALID_KINDS:
            raise ValueError(f"Document '{doc.id}' has invalid kind '{doc.kind}'.")
        if doc.source_type not in VALID_SOURCE_TYPES:
            raise ValueError(f"Document '{doc.id}' has invalid source_type '{doc.source_type}'.")

        # 5. sectors non-empty; if taxonomy is given, each sector must be in taxonomy or be 'ALL'
        if not doc.sectors:
            raise ValueError(f"Document '{doc.id}' has an empty sectors list.")
        if tax_set is not None:
            for s in doc.sectors:
                if s != "ALL" and s not in tax_set:
                    raise ValueError(f"Document '{doc.id}' contains sector '{s}' not in taxonomy.")

        # 6. summary non-empty and at most 400 characters; extract, if present, at most 40 words
        if not doc.summary or not doc.summary.strip():
            raise ValueError(f"Document '{doc.id}' summary cannot be empty.")
        if len(doc.summary) > 400:
            raise ValueError(f"Document '{doc.id}' summary exceeds 400 characters.")

        if doc.extract is not None and doc.extract.strip():
            words = doc.extract.split()
            if len(words) > 40:
                raise ValueError(f"Document '{doc.id}' extract exceeds 40 words.")

    return data.documents


def period_window(as_of: Union[str, date], period: str) -> tuple[date, date]:
    if period not in PERIOD_MONTHS:
        raise ValueError("Unknown period.")

    if isinstance(as_of, str):
        as_of = date.fromisoformat(as_of)

    months = PERIOD_MONTHS[period]
    total_months = as_of.year * 12 + (as_of.month - 1) - months
    target_year = total_months // 12
    target_month = (total_months % 12) + 1
    max_days = calendar.monthrange(target_year, target_month)[1]
    target_day = min(as_of.day, max_days)

    start = date(target_year, target_month, target_day)
    end = as_of
    return (start, end)


def retrieve_plain(
    documents: Sequence[SourceDocument],
    sectors: Sequence[str],
    window_start: Union[str, date],
    window_end: Union[str, date],
    kinds: Optional[Sequence[str]] = None,
    limit: int = 6,
) -> RetrievalResult:
    if isinstance(window_start, str):
        w_start = date.fromisoformat(window_start)
    else:
        w_start = window_start

    if isinstance(window_end, str):
        w_end = date.fromisoformat(window_end)
    else:
        w_end = window_end

    sectors_set = set(sectors)
    kinds_set = set(kinds) if kinds is not None else None

    candidates = []

    for doc in documents:
        # (a) sector filter: at least one sector in `sectors` or 'ALL'
        has_sector = ("ALL" in doc.sectors) or any(s in sectors_set for s in doc.sectors)
        if not has_sector:
            continue

        # (b) date range overlap with [window_start, window_end] inclusive
        doc_start = date.fromisoformat(doc.event_start) if doc.event_start else date.fromisoformat(doc.published_on)
        doc_end = date.fromisoformat(doc.event_end) if doc.event_end else date.fromisoformat(doc.published_on)

        overlaps = (doc_start <= w_end) and (doc_end >= w_start)
        if not overlaps:
            continue

        # (c) kinds filter
        if kinds_set is not None and doc.kind not in kinds_set:
            continue

        # Scoring
        doc_sectors_set = set(doc.sectors)
        matched = [s for s in sectors if s in doc_sectors_set and s != "ALL"]
        score = 5 * len(matched)
        if doc.source_type == "official":
            score += 2
        if doc.kind == "policy":
            score += 1

        candidates.append((doc, score, matched, doc_end))

    # Order: score descending, then range end date descending (more recent first), then id A to Z
    candidates.sort(key=lambda item: (-item[1], -item[3].toordinal(), item[0].id))

    selected = candidates[:limit]
    retrieved_docs = [
        RetrievedDocument(
            **item[0].model_dump(),
            score=item[1],
            matched_sectors=item[2],
        )
        for item in selected
    ]

    return RetrievalResult(mode="filter", documents=retrieved_docs)
