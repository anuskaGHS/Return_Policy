import sys
import os
import json
from datetime import date
from unittest.mock import patch, MagicMock
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import ExitAnalysisRequest
from app.services.tax_engine import calculate_exit_analysis
from app.services.exit_ai import (
    format_inr,
    build_facts,
    generate_exit_explanation,
    SYSTEM_PROMPT,
)


@pytest.fixture
def exit_cases():
    today = date(2026, 10, 21)
    # (a) equity Hold case
    req_a = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_a = calculate_exit_analysis(req_a, today=today)

    # (b) ELSS locked case
    req_b = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=400,
        investment_type="Equity Fund",
        fund_category="Equity: ELSS (Tax Saver - 3yr lock)",
    )
    res_b = calculate_exit_analysis(req_b, today=today)

    # (c) Exit Now case where interest outweighs tax saving
    req_c = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        interest_rate_pct=20,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_c = calculate_exit_analysis(req_c, today=today)

    return res_a, res_b, res_c


def test_successful_mocked_reply_source_is_ai(exit_cases):
    """1. Good mocked reply whose texts only use amounts from facts -> source 'ai', en and hi returned unchanged."""
    res_a, _, _ = exit_cases
    facts_a = build_facts(res_a)

    mock_en = f"You invested {facts_a['amounts']['invested']} which is now worth {facts_a['amounts']['worth_today']}. If you sell today you receive {facts_a['amounts']['you_receive_if_sold_today']}."
    mock_hi = f"आपने {facts_a['amounts']['invested']} निवेश किया जो अब {facts_a['amounts']['worth_today']} है। यदि आप आज बेचते हैं तो आपको {facts_a['amounts']['you_receive_if_sold_today']} मिलेंगे।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)

        assert explanation["source"] == "ai"
        assert explanation["en"] == mock_en
        assert explanation["hi"] == mock_hi


def test_no_api_key_returns_fallback(exit_cases):
    """2. No API key -> fallback with en and hi None."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", ""):
        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_groq_raises_returns_fallback(exit_cases):
    """3. Groq raises -> fallback."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.side_effect = RuntimeError("Groq connection timeout")

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_reply_not_json_returns_fallback(exit_cases):
    """4. Reply is not JSON -> fallback."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Plain text instead of JSON response"))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_reply_missing_hi_returns_fallback(exit_cases):
    """5. Reply missing 'hi' -> fallback."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": "Only English content provided"})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_reply_contains_invented_rupee_amount_triggers_guard(exit_cases):
    """6. Reply contains a rupee amount not in the facts (e.g. '₹99,999') -> fallback."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({
                "en": "You will receive ₹99,999 if you sell today.",
                "hi": "यदि आप आज बेचते हैं तो आपको ₹99,999 मिलेंगे।"
            })))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_build_facts_structure(exit_cases):
    """7. build_facts for case (a), case (b), case (c)."""
    res_a, res_b, res_c = exit_cases

    facts_a = build_facts(res_a)
    assert facts_a["amounts"]["you_receive_if_sold_today"] == format_inr(res_a.net_inhand_now)
    assert facts_a["waiting_comes_out_ahead"] is True

    facts_c = build_facts(res_c)
    assert facts_c["waiting_comes_out_ahead"] is False

    facts_b = build_facts(res_b)
    assert facts_b["lock"]["locked"] is True
    assert facts_b["better_pick"] is None


def test_user_message_and_system_prompt_content(exit_cases):
    """8. User message sent contains formatted net_inhand_now, system prompt contains 'Never calculate'."""
    res_a, _, _ = exit_cases

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": "Valid", "hi": "सटीक"})))
        ]

        generate_exit_explanation(res_a)

        _, kwargs = mock_client.chat.completions.create.call_args
        messages = kwargs["messages"]
        system_content = next(m["content"] for m in messages if m["role"] == "system")
        user_content = next(m["content"] for m in messages if m["role"] == "user")

        assert format_inr(res_a.net_inhand_now) in user_content
        assert "Never calculate" in system_content


def test_format_inr_values():
    """9. format_inr test cases."""
    assert format_inr(0) == "₹0"
    assert format_inr(999) == "₹999"
    assert format_inr(1000) == "₹1,000"
    assert format_inr(123456) == "₹1,23,456"
    assert format_inr(1234567) == "₹12,34,567"
    assert format_inr(-5200) == "₹5,200"
    assert format_inr(2.5) == "₹3"


def test_reply_with_amounts_followed_by_comma(exit_cases):
    """10. Reply texts where each allowed amount is followed by a comma -> source 'ai'."""
    res_a, _, _ = exit_cases
    facts_a = build_facts(res_a)
    x = facts_a["amounts"]["you_receive_if_sold_today"]
    y = facts_a["amounts"]["you_receive_if_waiting"]

    mock_en = f"You receive {x}, and waiting gives {y}, so wait."
    mock_hi = f"आपको {x}, मिलते हैं, और प्रतीक्षा करने पर {y}, मिलते हैं।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation["source"] == "ai"
        assert explanation["en"] == mock_en
        assert explanation["hi"] == mock_hi


def test_reply_with_amount_followed_by_full_stop(exit_cases):
    """11. Amounts at the end of a sentence followed by a full stop -> source 'ai'."""
    res_a, _, _ = exit_cases
    facts_a = build_facts(res_a)
    x = facts_a["amounts"]["you_receive_if_sold_today"]

    mock_en = f"You receive {x}."
    mock_hi = f"आपको {x} मिलते हैं।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
          ]

        explanation = generate_exit_explanation(res_a)
        assert explanation["source"] == "ai"
        assert explanation["en"] == mock_en
        assert explanation["hi"] == mock_hi


def test_reply_with_wrong_amount_followed_by_comma(exit_cases):
    """12. The same sentence with a wrong amount ('₹99,999,') -> fallback."""
    res_a, _, _ = exit_cases
    mock_en = "You receive ₹99,999, and waiting gives more."
    mock_hi = "आपको ₹99,999, मिलते हैं।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_build_facts_interest_rate_is_default():
    """a. build_facts: for equity Hold case with interest_rate_pct left blank, interest_rate_is_default is True; with interest_rate_pct 7.5 it is False."""
    today = date(2026, 10, 21)
    req_blank = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_blank = calculate_exit_analysis(req_blank, today=today)
    facts_blank = build_facts(res_blank)
    assert facts_blank["interest_rate_is_default"] is True

    req_7_5 = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        interest_rate_pct=7.5,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_7_5 = calculate_exit_analysis(req_7_5, today=today)
    facts_7_5 = build_facts(res_7_5)
    assert facts_7_5["interest_rate_is_default"] is False


def test_reply_with_rs_returns_fallback(exit_cases):
    """b. A reply whose English text says 'You receive Rs 5,200' -> fallback."""
    res_a, _, _ = exit_cases
    mock_en = "You receive Rs 5,200 if you sell today."
    mock_hi = "यदि आप आज बेचते हैं तो आपको ₹5,200 मिलेंगे।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_reply_with_lakh_returns_fallback(exit_cases):
    """c. A reply whose English text says 'about 5 lakh' -> fallback."""
    res_a, _, _ = exit_cases
    mock_en = "Your investment is about 5 lakh in total."
    mock_hi = "आपका निवेश अच्छा है।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_reply_with_hindi_lakh_returns_fallback(exit_cases):
    """d. A reply whose Hindi text contains 'लाख' -> fallback."""
    res_a, _, _ = exit_cases
    mock_en = "Your investment is growing well."
    mock_hi = "आपका निवेश लगभग 1 लाख है।"

    with patch("app.services.exit_ai.settings.GROQ_API_KEY", "mock-groq-api-key"), \
         patch("app.services.exit_ai.Groq") as mock_groq_cls:
        mock_client = mock_groq_cls.return_value
        mock_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=json.dumps({"en": mock_en, "hi": mock_hi})))
        ]

        explanation = generate_exit_explanation(res_a)
        assert explanation == {"en": None, "hi": None, "source": "fallback"}


def test_system_prompt_contains_required_phrases():
    """f. SYSTEM_PROMPT contains 'interest_rate_is_default' and 'Never calculate'."""
    assert "interest_rate_is_default" in SYSTEM_PROMPT
    assert "Never calculate" in SYSTEM_PROMPT


