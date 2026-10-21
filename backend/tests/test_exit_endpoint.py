import sys
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def disable_groq_api_key_by_default():
    """Ensure no endpoint tests accidentally reach the network unless explicitly mocked."""
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", ""):
        yield

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "reference" / "exit_cases.json"

with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
    fixture_data = json.load(f)

# Parametrize over only the valid cases where investment_type is "Equity Fund"
# and fund_category does NOT contain "ELSS" (these do not depend on today's date).
equity_cases = [
    c for c in fixture_data["cases"]
    if c["expected"].get("valid", True)
    and c["input"].get("investment_type") == "Equity Fund"
    and "ELSS" not in c["input"].get("fund_category", "")
]


@pytest.mark.parametrize("case", equity_cases, ids=[c["name"] for c in equity_cases])
def test_exit_analysis_fixture_equity_cases(case):
    response = client.post("/api/exit-analysis", json=case["input"])
    assert response.status_code == 200
    data = response.json()
    for key, expected_val in case["expected"].items():
        if key == "valid":
            continue
        assert data[key] == expected_val, f"Mismatch for '{key}': {data[key]} != {expected_val}"


def test_blank_amount_invested():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": "",
        "current_value": 120000,
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Enter what you invested."


def test_blank_current_value():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": 100000,
        "current_value": "",
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Enter what it is worth today."


def test_both_blank():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": "",
        "current_value": "",
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Enter what you invested and what it is worth today."


def test_invested_zero_gives_422_and_worth_today_zero_gives_200():
    # Invested 0 gives 422
    payload_inv_zero = {
        "investment_type": "Equity Fund",
        "amount_invested": 0,
        "current_value": 100000,
        "holding_period_days": 200,
    }
    res_inv_zero = client.post("/api/exit-analysis", json=payload_inv_zero)
    assert res_inv_zero.status_code == 422

    # Worth Today 0 gives 200 (a total loss is valid)
    payload_cur_zero = {
        "investment_type": "Equity Fund",
        "amount_invested": 100000,
        "current_value": 0,
        "holding_period_days": 200,
    }
    res_cur_zero = client.post("/api/exit-analysis", json=payload_cur_zero)
    assert res_cur_zero.status_code == 200


def test_no_upper_limit():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": 5000000000,
        "current_value": 8000000000,
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 200


def test_elss_held_one_day():
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: ELSS (Tax Saver - 3yr lock)",
        "amount_invested": 100000,
        "current_value": 110000,
        "holding_period_days": 1,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recommendation"] == "Locked"
    assert data["lock_in"] is not None
    assert data["lock_in"]["locked"] is True


def test_nan_amount_invested():
    raw_body = '{"investment_type":"Equity Fund","amount_invested":NaN,"current_value":100000,"holding_period_days":200}'
    response = client.post(
        "/api/exit-analysis",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422


def test_no_groq_keys_in_response():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()

    def check_no_groq(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                assert "groq" not in k.lower(), f"Key contains 'groq': {k}"
                check_no_groq(v)
        elif isinstance(obj, list):
            for item in obj:
                check_no_groq(item)

    check_no_groq(data)


def test_category_omitted():
    # POST investment_type "Debt Fund" with NO fund_category gives 200 and fund_category == "Debt: General"
    payload_debt = {
        "investment_type": "Debt Fund",
        "amount_invested": 100000,
        "current_value": 110000,
        "holding_period_days": 200,
    }
    res_debt = client.post("/api/exit-analysis", json=payload_debt)
    assert res_debt.status_code == 200
    assert res_debt.json()["fund_category"] == "Debt: General"

    # POST "Equity Fund" with no fund_category gives "Equity: General"
    payload_equity = {
        "investment_type": "Equity Fund",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    res_equity = client.post("/api/exit-analysis", json=payload_equity)
    assert res_equity.status_code == 200
    assert res_equity.json()["fund_category"] == "Equity: General"


def test_too_large_numbers():
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": 1e308,
        "current_value": 1e308,
        "holding_period_days": 200,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "That number is too large to calculate."


def test_too_long_held():
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: ELSS (Tax Saver - 3yr lock)",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 900000000,
    }
    response = client.post("/api/exit-analysis", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "That number is too large to calculate."


def test_ai_explanation_good_mocked_reply():
    """A. Good mocked reply -> 200, ai_source == 'ai', explanations equal mocked texts, no 'groq' in response text."""
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: Flexi Cap / Large Cap",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    mock_en = "Waiting saves ₹5,200 in tax and exit load."
    mock_hi = "प्रतीक्षा करने से कर में ₹5,200 की बचत होती है।"
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]
        response = client.post("/api/exit-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ai_source"] == "ai"
        assert data["ai_explanation_en"] == mock_en
        assert data["ai_explanation_hi"] == mock_hi
        assert "groq" not in response.text.lower()


def test_ai_explanation_no_key():
    """B. No key -> 200, ai_source == 'fallback', both explanations None, numbers still present."""
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: Flexi Cap / Large Cap",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", ""):
        response = client.post("/api/exit-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ai_source"] == "fallback"
        assert data["ai_explanation_en"] is None
        assert data["ai_explanation_hi"] is None
        assert data["recommendation"] == "Hold"


def test_ai_explanation_groq_raises():
    """C. Groq raises -> 200, ai_source 'fallback'."""
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: Flexi Cap / Large Cap",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.side_effect = RuntimeError("Groq connection error")
        response = client.post("/api/exit-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ai_source"] == "fallback"
        assert data["ai_explanation_en"] is None
        assert data["ai_explanation_hi"] is None


def test_ai_explanation_wrong_rupee_amount():
    """D. Reply contains a wrong rupee amount (e.g. '₹99,999') -> 200 and ai_source 'fallback'."""
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: Flexi Cap / Large Cap",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "en": "You receive ₹99,999 if you sell today.",
                "hi": "यदि आप आज बेचते हैं तो आपको ₹99,999 मिलेंगे।"
            })))
        ]
        response = client.post("/api/exit-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ai_source"] == "fallback"
        assert data["ai_explanation_en"] is None
        assert data["ai_explanation_hi"] is None


def test_ai_explanation_same_numbers_with_and_without_ai():
    """E. Same numbers with and without AI: post the same payload under test A's mock and under test B's setup."""
    payload = {
        "investment_type": "Equity Fund",
        "fund_category": "Equity: Flexi Cap / Large Cap",
        "amount_invested": 100000,
        "current_value": 120000,
        "holding_period_days": 200,
    }
    # With AI
    mock_en = "Waiting saves ₹5,200 in tax and exit load."
    mock_hi = "प्रतीक्षा करने से कर में ₹5,200 की बचत होती है।"
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]
        res_with_ai = client.post("/api/exit-analysis", json=payload)
        assert res_with_ai.status_code == 200
        data_with_ai = res_with_ai.json()

    # Without AI
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", ""):
        res_without_ai = client.post("/api/exit-analysis", json=payload)
        assert res_without_ai.status_code == 200
        data_without_ai = res_without_ai.json()

    for key in ["ai_explanation_en", "ai_explanation_hi", "ai_source"]:
        data_with_ai.pop(key, None)
        data_without_ai.pop(key, None)

    assert data_with_ai == data_without_ai


def test_ai_explanation_invalid_input_does_not_call_groq():
    """F. Invalid input (blank amount_invested) -> 422 and the mocked Groq create method was NOT called."""
    payload = {
        "investment_type": "Equity Fund",
        "amount_invested": "",
        "current_value": 120000,
        "holding_period_days": 200,
    }
    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        response = client.post("/api/exit-analysis", json=payload)
        assert response.status_code == 422
        mock_client.chat.completions.create.assert_not_called()


