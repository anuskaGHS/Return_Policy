import sys
import os
import json
from unittest.mock import patch, MagicMock
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import SimulationRequest
from app.services.calculator import calculate_deterministic_metrics
from app.services.health_score import compute_health_score
from app.services.groq_service import generate_ai_assessment


@pytest.fixture
def default_input_data():
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


def test_english_prompt_contains_score_and_instruction(default_input_data):
    """1. English prompt sent to Groq contains the computed score (64 for the default input) and the 'Do NOT calculate' instruction."""
    req, metrics, health_score = default_input_data
    req.language = "en"

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "financial_health_score": 64,
                "rating_tier": "Balanced Saver",
                "score_rationale": "Balanced ratio",
                "priority_action_plan": [],
                "key_vulnerability": "Debt drag"
            })))
        ]

        generate_ai_assessment(req, metrics, health_score=health_score)

        messages = mock_client.chat.completions.create.call_args.kwargs["messages"]
        combined_prompt = " ".join(m["content"] for m in messages)

        assert "64" in combined_prompt
        assert "Do NOT calculate" in combined_prompt


def test_hindi_prompt_contains_computed_score(default_input_data):
    """2. Hindi prompt also contains the computed score."""
    req, metrics, health_score = default_input_data
    req.language = "hi"

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "financial_health_score": 64,
                "rating_tier": "संतुलित बचतकर्ता",
                "score_rationale": "संतुलित अनुपात",
                "priority_action_plan": [],
                "key_vulnerability": "ऋण बोझ"
            })))
        ]

        generate_ai_assessment(req, metrics, health_score=health_score)

        messages = mock_client.chat.completions.create.call_args.kwargs["messages"]
        combined_prompt = " ".join(m["content"] for m in messages)

        assert "64" in combined_prompt


def test_mocked_llm_replies_99_final_value_is_64(default_input_data):
    """3. If the mocked LLM replies with financial_health_score = 99, the final value is still 64."""
    req, metrics, health_score = default_input_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "financial_health_score": 99,
                "rating_tier": "Financially Resilient",
                "score_rationale": "Invented score",
                "priority_action_plan": [],
                "key_vulnerability": "None"
            })))
        ]

        res = generate_ai_assessment(req, metrics, health_score=health_score)

        assert res.financial_health_score == 64
        assert res.rating_tier == "Balanced Saver"


def test_mocked_groq_raises_fallback_has_score_64(default_input_data):
    """4. If the mocked Groq call raises, the fallback response also has financial_health_score = 64."""
    req, metrics, health_score = default_input_data

    with patch("app.services.groq_service.settings.GROQ_API_KEY", "mock-groq-key"), \
         patch("app.services.groq_service.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.side_effect = RuntimeError("Groq API network error")

        res = generate_ai_assessment(req, metrics, health_score=health_score)

        assert res.financial_health_score == 64
        assert res.rating_tier == "Balanced Saver"
