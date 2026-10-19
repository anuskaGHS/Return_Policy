import sys
import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.services.groq_service import get_fallback_assessment

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_groq_api():
    """Mock generate_ai_assessment to ensure no network calls or API keys are required."""
    with patch("app.routers.policy.generate_ai_assessment", side_effect=get_fallback_assessment) as mock:
        yield mock


def test_simulate_default_input_returns_health_score():
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
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "health_score" in data
    hs = data["health_score"]
    assert hs["score"] == 64
    assert hs["tier"] == "Balanced Saver"
    assert hs["points"] == {
        "sip": 23,
        "loan": 14,
        "ins": 7,
        "tax": 12,
        "emg": 8,
    }


def test_simulate_omits_new_fields_returns_200():
    payload = {
        "monthly_sip": 15000.0,
        "loan_emi": 22000.0,
        "loan_interest_rate": 8.5,
        "annual_income": 1400000.0,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "health_score" in data
    hs = data["health_score"]
    assert hs["score"] == 64
    assert hs["tier"] == "Balanced Saver"
    assert hs["points"] == {
        "sip": 23,
        "loan": 14,
        "ins": 7,
        "tax": 12,
        "emg": 8,
    }
