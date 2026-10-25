import json
import os
import sys
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.models.explainer_api import ExplainerAnalyzeRequest
from app.routers.explainer import analyze, get_funds
from app.services import explainer_service


@pytest.fixture(autouse=True)
def clean_environment_and_caches(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.delenv("USE_CHROMA", raising=False)
    explainer_service.clear_caches()
    yield
    explainer_service.clear_caches()


def test_get_funds_lists_kotak_fund():
    resp = get_funds()
    assert resp["as_of"] == "2026-09-30"
    funds = resp["funds"]
    assert any(f["id"] == "kotak-large-cap-reg-g" for f in funds)
    kotak = next(f for f in funds if f["id"] == "kotak-large-cap-reg-g")
    assert kotak["periods"] == ["1Y"]


def test_analyze_kotak_fund_1y():
    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    res = analyze(req)

    assert res["result"]["gap_pts"] == -0.3
    assert res["result"]["top_drivers"] == []
    assert res["explanation"]["source"] == "code"
    assert res["explanation"]["en"].startswith("Over the last 1 year, Kotak Large Cap Fund")

    doc_ids = [d["id"] for d in res["documents"]]
    assert "steel-safeguard-duty-2025" in doc_ids
    assert "metal-stocks-rally-may-2026" in doc_ids
    assert "it-ai-fears-feb-2026" in doc_ids

    for d in res["documents"]:
        assert "score" not in d

    assert len(res["data_sources"]) > 0
    for s in res["data_sources"]:
        assert s["url"].startswith("https://")

    assert res["retrieval"]["mode"] == "filter"


def test_json_dump_no_groq_no_fallback_reason():
    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    res = analyze(req)
    dumped = json.dumps(res).lower()
    assert "groq" not in dumped
    assert "fallback_reason" not in dumped


def test_error_handling_unknown_fund_and_periods():
    # Unknown fund -> 404
    req_unknown = ExplainerAnalyzeRequest(fund_id="unknown-fund-id", period="1Y")
    with pytest.raises(HTTPException) as exc_info:
        analyze(req_unknown)
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Unknown fund."

    # Period 6M -> 400 "This period is not available yet."
    req_6m = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="6M")
    with pytest.raises(HTTPException) as exc_info:
        analyze(req_6m)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "This period is not available yet."

    # Period 5Y -> 400 "Unknown period."
    req_5y = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="5Y")
    with pytest.raises(HTTPException) as exc_info:
        analyze(req_5y)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Unknown period."


def test_documents_file_missing_returns_200_with_empty_documents(monkeypatch):
    monkeypatch.setattr(
        "app.services.explainer_service.load_documents",
        MagicMock(side_effect=FileNotFoundError("Documents file not found")),
    )
    explainer_service.clear_caches()

    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    res = analyze(req)
    assert res["documents"] == []
    assert res["fund"]["id"] == "kotak-large-cap-reg-g"


def test_data_file_missing_returns_503(monkeypatch):
    monkeypatch.setattr(
        "app.services.explainer_service.load_explainer_data",
        MagicMock(side_effect=FileNotFoundError("Explainer data file not found")),
    )
    explainer_service.clear_caches()

    with pytest.raises(HTTPException) as exc_info:
        get_funds()
    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "The Explainer data is not available right now."

    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    with pytest.raises(HTTPException) as exc_info:
        analyze(req)
    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "The Explainer data is not available right now."


def test_use_chroma_enabled_but_unavailable_mode_filter(monkeypatch):
    monkeypatch.setenv("USE_CHROMA", "1")
    monkeypatch.setattr("app.services.explainer_vector.chroma_available", lambda: False)
    explainer_service.clear_caches()

    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    res = analyze(req)
    assert res["retrieval"]["mode"] == "filter"


def test_valid_mocked_groq_reply_returns_source_ai(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "mock-groq-key")

    req = ExplainerAnalyzeRequest(fund_id="kotak-large-cap-reg-g", period="1Y")
    # First get the exact key points
    base_res = analyze(req)
    kp_en = base_res["explanation"]["key_points"]
    kp_hi = base_res["explanation"]["key_points_hi"]

    mock_json = json.dumps({"en": " ".join(kp_en), "hi": " ".join(kp_hi)})

    with patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        explainer_service.clear_caches()
        res = analyze(req)
        assert res["explanation"]["source"] == "ai"


def test_main_registers_explainer_routes():
    from main import app
    paths = [r.path for r in app.routes if "explainer" in r.path]
    assert "/api/explainer/funds" in paths
    assert "/api/explainer/analyze" in paths
