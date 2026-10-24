import copy
from datetime import date
import json
import os
from pathlib import Path
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.explainer_docs import SourceDocument
from app.services.explainer_retrieval import (
    load_documents,
    period_window,
    retrieve_plain,
)


def make_doc(
    doc_id: str,
    sectors: list[str],
    published_on: str = "2025-02-01",
    event_start: str = None,
    event_end: str = None,
    kind: str = "market",
    source_type: str = "news",
    summary: str = "A valid test summary.",
    extract: str = None,
    url: str = "https://example.com/test",
    title: str = "Test Title",
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


def test_sector_filter_and_all():
    docs = [
        make_doc("d1", ["IT"]),
        make_doc("d2", ["Financials"]),
        make_doc("d3", ["ALL"]),
        make_doc("d4", ["Energy"]),
    ]
    res = retrieve_plain(docs, sectors=["IT"], window_start="2025-01-01", window_end="2025-03-31")
    ids = [d.id for d in res.documents]
    assert "d1" in ids
    assert "d3" in ids
    assert "d2" not in ids
    assert "d4" not in ids


def test_date_overlap_boundaries_and_published_on():
    # Window: 2025-01-01 to 2025-03-31
    docs = [
        # Boundary touch at window_start
        make_doc("d_touch_start", ["IT"], event_start="2024-12-01", event_end="2025-01-01"),
        # Boundary touch at window_end
        make_doc("d_touch_end", ["IT"], event_start="2025-03-31", event_end="2025-04-15"),
        # Published on inside window (no event dates)
        make_doc("d_pub_only", ["IT"], published_on="2025-02-15"),
        # Entirely before window
        make_doc("d_before", ["IT"], event_start="2024-01-01", event_end="2024-12-31"),
        # Entirely after window (published_on after window)
        make_doc("d_after", ["IT"], published_on="2025-04-01"),
    ]
    res = retrieve_plain(docs, sectors=["IT"], window_start="2025-01-01", window_end="2025-03-31")
    ids = [d.id for d in res.documents]
    assert "d_touch_start" in ids
    assert "d_touch_end" in ids
    assert "d_pub_only" in ids
    assert "d_before" not in ids
    assert "d_after" not in ids


def test_kinds_filter_limit_and_ordering():
    # Test scoring:
    # 5 per matching sector + 2 if official + 1 if policy
    # Sectors requested: ["IT", "Financials"]
    docs = [
        # Matched sectors: IT, Financials -> 5*2=10. kind=market, source=news -> score=10, end=2025-03-15
        make_doc("d_two_sectors", ["IT", "Financials"], published_on="2025-03-15", kind="market", source_type="news"),
        # Matched sectors: IT -> 5*1=5 + 2(official) + 1(policy) = 8, end=2025-03-31
        make_doc("d_score_8_recent", ["IT"], published_on="2025-03-31", kind="policy", source_type="official"),
        # Matched sectors: IT -> 5*1=5 + 2(official) + 1(policy) = 8, end=2025-02-28, id="d_score_8_a"
        make_doc("d_score_8_a", ["IT"], published_on="2025-02-28", kind="policy", source_type="official"),
        # Matched sectors: IT -> 5*1=5 + 2(official) + 1(policy) = 8, end=2025-02-28, id="d_score_8_b"
        make_doc("d_score_8_b", ["IT"], published_on="2025-02-28", kind="policy", source_type="official"),
        # Matched sectors: Financials -> 5*1=5 + 0 + 0 = 5, end=2025-03-31
        make_doc("d_score_5", ["Financials"], published_on="2025-03-31", kind="market", source_type="news"),
    ]

    res = retrieve_plain(docs, sectors=["IT", "Financials"], window_start="2025-01-01", window_end="2025-03-31")
    ordered_ids = [d.id for d in res.documents]
    assert ordered_ids == [
        "d_two_sectors",     # score 10
        "d_score_8_recent",  # score 8, 2025-03-31
        "d_score_8_a",       # score 8, 2025-02-28, id 'a'
        "d_score_8_b",       # score 8, 2025-02-28, id 'b'
        "d_score_5",         # score 5
    ]

    # Test limit
    res_limit = retrieve_plain(docs, sectors=["IT", "Financials"], window_start="2025-01-01", window_end="2025-03-31", limit=2)
    assert len(res_limit.documents) == 2
    assert [d.id for d in res_limit.documents] == ["d_two_sectors", "d_score_8_recent"]

    # Test kinds filter
    res_kinds = retrieve_plain(docs, sectors=["IT", "Financials"], window_start="2025-01-01", window_end="2025-03-31", kinds=["policy"])
    assert all(d.kind == "policy" for d in res_kinds.documents)
    assert "d_two_sectors" not in [d.id for d in res_kinds.documents]

    # Test empty result
    res_empty = retrieve_plain(docs, sectors=["Healthcare"], window_start="2025-01-01", window_end="2025-03-31")
    assert res_empty.documents == []

    # Test empty sectors -> only ALL matches
    all_doc = make_doc("d_all", ["ALL"], published_on="2025-02-01")
    docs_with_all = docs + [all_doc]
    res_no_sec = retrieve_plain(docs_with_all, sectors=[], window_start="2025-01-01", window_end="2025-03-31")
    assert len(res_no_sec.documents) == 1
    assert res_no_sec.documents[0].id == "d_all"
    assert res_no_sec.documents[0].matched_sectors == []


def test_period_window():
    # 6M: 31 Aug 2026 -> 28 Feb 2026
    start, end = period_window(date(2026, 8, 31), "6M")
    assert start == date(2026, 2, 28)
    assert end == date(2026, 8, 31)

    # 6M leap year: 31 Aug 2024 -> 29 Feb 2024
    start_leap, end_leap = period_window(date(2024, 8, 31), "6M")
    assert start_leap == date(2024, 2, 29)
    assert end_leap == date(2024, 8, 31)

    # 1Y: 31 Mar 2025 -> 31 Mar 2024
    start_1y, end_1y = period_window(date(2025, 3, 31), "1Y")
    assert start_1y == date(2024, 3, 31)
    assert end_1y == date(2025, 3, 31)

    # 3Y: 31 Mar 2025 -> 31 Mar 2022
    start_3y, end_3y = period_window(date(2025, 3, 31), "3Y")
    assert start_3y == date(2022, 3, 31)
    assert end_3y == date(2025, 3, 31)

    # String as_of support
    s_str, e_str = period_window("2025-03-31", "1Y")
    assert s_str == date(2024, 3, 31)
    assert e_str == date(2025, 3, 31)

    # Unknown period
    with pytest.raises(ValueError, match="^Unknown period.$"):
        period_window(date(2025, 3, 31), "5Y")


def write_docs_file(path: Path, data: dict) -> Path:
    fp = path / "explainer_documents.json"
    with open(fp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return fp


def test_load_documents_validation_rules(tmp_path):
    base_data = {
        "schema_version": 1,
        "documents": [
            {
                "id": "doc-001",
                "title": "IT Sector Growth",
                "publisher": "Tech Times",
                "url": "https://example.com/it",
                "published_on": "2025-02-15",
                "event_start": "2025-01-01",
                "event_end": "2025-03-31",
                "kind": "policy",
                "source_type": "official",
                "sectors": ["IT"],
                "summary": "Government unveils new incentives for semiconductor and cloud sectors.",
                "extract": "A short exact quote.",
                "accessed_on": "2025-03-31",
            }
        ],
    }

    # Happy path
    fp = write_docs_file(tmp_path, base_data)
    loaded = load_documents(fp, taxonomy=["IT", "Financials"])
    assert len(loaded) == 1
    assert loaded[0].id == "doc-001"

    # Rule 1: duplicate ids
    d1 = copy.deepcopy(base_data)
    d1["documents"].append(copy.deepcopy(d1["documents"][0]))
    fp1 = write_docs_file(tmp_path, d1)
    with pytest.raises(ValueError, match="Duplicate document id"):
        load_documents(fp1)

    # Rule 2: url without https://
    d2 = copy.deepcopy(base_data)
    d2["documents"][0]["url"] = "http://insecure.com"
    fp2 = write_docs_file(tmp_path, d2)
    with pytest.raises(ValueError, match="does not start with 'https://'"):
        load_documents(fp2)

    # Rule 3: invalid date, event_end before event_start, or only one given
    d3_a = copy.deepcopy(base_data)
    d3_a["documents"][0]["published_on"] = "2025-13-45"
    fp3_a = write_docs_file(tmp_path, d3_a)
    with pytest.raises(ValueError, match="not a valid ISO date"):
        load_documents(fp3_a)

    d3_b = copy.deepcopy(base_data)
    d3_b["documents"][0]["event_end"] = "2024-12-31"  # before 2025-01-01
    fp3_b = write_docs_file(tmp_path, d3_b)
    with pytest.raises(ValueError, match="before event_start"):
        load_documents(fp3_b)

    d3_c = copy.deepcopy(base_data)
    d3_c["documents"][0]["event_end"] = None  # event_start given but end is None
    fp3_c = write_docs_file(tmp_path, d3_c)
    with pytest.raises(ValueError, match="must provide both event_start and event_end, or neither"):
        load_documents(fp3_c)

    # Rule 4: invalid kind or source_type
    d4_a = copy.deepcopy(base_data)
    d4_a["documents"][0]["kind"] = "unsupported_kind"
    fp4_a = write_docs_file(tmp_path, d4_a)
    with pytest.raises(ValueError, match="invalid kind"):
        load_documents(fp4_a)

    d4_b = copy.deepcopy(base_data)
    d4_b["documents"][0]["source_type"] = "unsupported_source"
    fp4_b = write_docs_file(tmp_path, d4_b)
    with pytest.raises(ValueError, match="invalid source_type"):
        load_documents(fp4_b)

    # Rule 5: empty sectors or sector not in taxonomy
    d5_a = copy.deepcopy(base_data)
    d5_a["documents"][0]["sectors"] = []
    fp5_a = write_docs_file(tmp_path, d5_a)
    with pytest.raises(ValueError, match="empty sectors list"):
        load_documents(fp5_a)

    d5_b = copy.deepcopy(base_data)
    d5_b["documents"][0]["sectors"] = ["UnknownSector"]
    fp5_b = write_docs_file(tmp_path, d5_b)
    with pytest.raises(ValueError, match="not in taxonomy"):
        load_documents(fp5_b, taxonomy=["IT", "Financials"])

    # Rule 6: summary empty, summary > 400 chars, extract > 40 words
    d6_a = copy.deepcopy(base_data)
    d6_a["documents"][0]["summary"] = "   "
    fp6_a = write_docs_file(tmp_path, d6_a)
    with pytest.raises(ValueError, match="summary cannot be empty"):
        load_documents(fp6_a)

    d6_b = copy.deepcopy(base_data)
    d6_b["documents"][0]["summary"] = "x" * 401
    fp6_b = write_docs_file(tmp_path, d6_b)
    with pytest.raises(ValueError, match="summary exceeds 400 characters"):
        load_documents(fp6_b)

    d6_c = copy.deepcopy(base_data)
    d6_c["documents"][0]["extract"] = " ".join(["word"] * 41)
    fp6_c = write_docs_file(tmp_path, d6_c)
    with pytest.raises(ValueError, match="extract exceeds 40 words"):
        load_documents(fp6_c)

    # Missing file
    missing = tmp_path / "non_existent.json"
    with pytest.raises(FileNotFoundError, match="Explainer documents file not found"):
        load_documents(missing)

    # Invalid JSON
    bad_json_fp = tmp_path / "bad.json"
    bad_json_fp.write_text("{bad json...", encoding="utf-8")
    with pytest.raises(ValueError, match="Invalid JSON"):
        load_documents(bad_json_fp)


def test_inputs_not_mutated():
    doc = make_doc("d1", ["IT", "Financials"], published_on="2025-02-01")
    docs = [doc]
    orig_docs = [copy.deepcopy(doc)]
    sectors = ["IT", "Financials"]
    orig_sectors = list(sectors)
    kinds = ["market"]
    orig_kinds = list(kinds)

    retrieve_plain(docs, sectors=sectors, window_start="2025-01-01", window_end="2025-03-31", kinds=kinds)

    assert docs == orig_docs
    assert sectors == orig_sectors
    assert kinds == orig_kinds
