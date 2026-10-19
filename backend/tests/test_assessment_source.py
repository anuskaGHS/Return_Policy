import sys
import os
import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.models.policy import SimulationRequest
from app.services.calculator import calculate_deterministic_metrics
from app.services.health_score import compute_health_score
from app.services.groq_service import generate_ai_assessment


@pytest.fixture
def sample_simulation_data():
    req = SimulationRequest(
        monthly_sip=15000.0,
        loan_emi=22000.0,
        loan_interest_rate=8.5,
        annual_income=1400000.0,
        sip_return_pct=11.0,
        term_cover=5000000,
        emergency_months=3,
        long_term_pct=60.0,
        language="en",
    )
    metrics = calculate_deterministic_metrics(req)
    health_score = compute_health_score(
        monthly_sip=req.monthly_sip,
        loan_emi=req.loan_emi,
        loan_interest_rate=req.loan_interest_rate,
        annual_income=req.annual_income,
        sip_return_pct=req.sip_return_pct,
        term_cover=req.term_cover,
        emergency_months=req.emergency_months,
        long_term_pct=req.long_term_pct,
    )
    return req, metrics, health_score


def test_successful_mocked_groq_reply_source_is_groq(sample_simulation_data):
    """1. Successful mocked Groq reply -> ai_assessment.source == 'groq'."""
    req, metrics, health_score = sample_simulation_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "financial_health_score": 64,
                "rating_tier": "Balanced Saver",
                "score_rationale": "Solid balanced ratio across assets.",
                "priority_action_plan": [
                    {"bullet_number": 1, "title": "Debt Step-down", "action": "Prepay principal."}
                ],
                "key_vulnerability": "Loan interest rate."
            })))
        ]

        assessment = generate_ai_assessment(req, metrics, health_score=health_score)

        assert assessment.source == "groq"


def test_mocked_groq_exception_source_is_fallback(sample_simulation_data):
    """2. Mocked Groq exception -> source == 'fallback'."""
    req, metrics, health_score = sample_simulation_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.side_effect = RuntimeError("Groq rate limit or connection error")

        assessment = generate_ai_assessment(req, metrics, health_score=health_score)

        assert assessment.source == "fallback"


def test_mocked_groq_invalid_json_source_is_fallback(sample_simulation_data):
    """Invalid JSON response from Groq -> source == 'fallback'."""
    req, metrics, health_score = sample_simulation_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Invalid non-JSON response from LLM"))
        ]

        assessment = generate_ai_assessment(req, metrics, health_score=health_score)

        assert assessment.source == "fallback"


def test_no_groq_api_key_source_is_fallback(sample_simulation_data):
    """3. No GROQ_API_KEY -> source == 'fallback'."""
    req, metrics, health_score = sample_simulation_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", ""):
        assessment = generate_ai_assessment(req, metrics, health_score=health_score)

        assert assessment.source == "fallback"


def test_simulate_endpoint_response_contains_ai_assessment_source():
    """4. POST /api/simulate response JSON contains ai_assessment.source."""
    client = TestClient(app)
    payload = {
        "monthly_sip": 15000.0,
        "loan_emi": 22000.0,
        "loan_interest_rate": 8.5,
        "annual_income": 1400000.0,
        "sip_return_pct": 11.0,
        "term_cover": 5000000,
        "emergency_months": 3,
        "long_term_pct": 60.0,
    }

    # Case A: When Groq succeeds
    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "financial_health_score": 64,
                "rating_tier": "Balanced Saver",
                "score_rationale": "Solid balanced ratio across assets.",
                "priority_action_plan": [
                    {"bullet_number": 1, "title": "Debt Step-down", "action": "Prepay principal."}
                ],
                "key_vulnerability": "Loan interest rate."
            })))
        ]

        response = client.post("/api/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ai_assessment" in data
        assert "source" in data["ai_assessment"]
        assert data["ai_assessment"]["source"] == "groq"

    # Case B: When Groq falls back (no API key)
    with patch("app.services.groq_service.settings.GROQ_API_KEY", ""):
        response = client.post("/api/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ai_assessment" in data
        assert "source" in data["ai_assessment"]
        assert data["ai_assessment"]["source"] == "fallback"
