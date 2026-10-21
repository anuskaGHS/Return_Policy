import sys
import os
import json
import re
from pathlib import Path
from datetime import date
from unittest.mock import patch, MagicMock
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import ExitAnalysisRequest
from app.services.tax_engine import calculate_exit_analysis
from app.services.exit_ai import (
    format_inr,
    build_facts,
    build_key_points,
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
    assert facts_a["amounts"]["tax_saved_by_waiting"] == format_inr(4000)
    assert facts_a["amounts"]["exit_load_saved_by_waiting"] == format_inr(1200)
    assert facts_a["waiting_comes_out_ahead"] is True

    facts_c = build_facts(res_c)
    assert facts_c["waiting_comes_out_ahead"] is False

    facts_b = build_facts(res_b)
    assert facts_b["lock"]["locked"] is True
    assert facts_b["better_pick"] is None


def test_user_message_and_system_prompt_content(exit_cases):
    """8. User message sent contains 'key_points' and recommendation; system prompt contains 'Never calculate' and 'key_points'."""
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

        assert "key_points" in user_content
        assert res_a.recommendation in user_content
        assert "Never calculate" in system_content
        assert "key_points" in system_content


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
    """f. SYSTEM_PROMPT contains 'Never calculate' and 'key_points'."""
    assert "Never calculate" in SYSTEM_PROMPT
    assert "key_points" in SYSTEM_PROMPT


def test_equity_hold_key_points():
    """Equity Hold case (100000 -> 120000, 200 days): contains ₹5,200, ₹4,000 less tax, ₹1,200 less exit load, ₹1,937 ahead; no 'No tax'."""
    today = date(2026, 10, 21)
    req = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res = calculate_exit_analysis(req, today=today)
    facts = build_facts(res)
    points = build_key_points(res, facts)

    combined = " ".join(points)
    assert "₹5,200" in combined
    assert "₹4,000 less tax" in combined
    assert "₹1,200 less exit load" in combined
    assert "₹1,937 ahead" in combined
    for p in points:
        assert "No tax" not in p


def test_interest_beats_tax_saved_key_points():
    """The case where interest beats the tax saved: contains 'which is more' and 'comes out'; does not contain 'waiting still comes out'."""
    today = date(2026, 10, 21)
    req = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        interest_rate_pct=20,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res = calculate_exit_analysis(req, today=today)
    facts = build_facts(res)
    points = build_key_points(res, facts)

    combined = " ".join(points)
    assert "which is more" in combined
    assert "comes out" in combined
    assert "waiting still comes out" not in combined


def test_elss_locked_key_points():
    """ELSS locked case: contains '16 September 2028' and no point contains the word 'interest'."""
    today = date(2026, 10, 21)
    req = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=400,
        investment_type="Equity Fund",
        fund_category="Equity: ELSS (Tax Saver - 3yr lock)",
    )
    res = calculate_exit_analysis(req, today=today)
    facts = build_facts(res)
    points = build_key_points(res, facts)

    combined = " ".join(points)
    assert "16 September 2028" in combined
    for p in points:
        assert "interest" not in p.lower()


def test_user_typed_vs_default_exit_load_key_points():
    """User-typed exit load (0.5): no point contains 'is an assumption'. Default exit load: it does."""
    today = date(2026, 10, 21)
    req_custom = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        exit_load_pct=0.5,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_custom = calculate_exit_analysis(req_custom, today=today)
    facts_custom = build_facts(res_custom)
    points_custom = build_key_points(res_custom, facts_custom)
    for p in points_custom:
        assert "is an assumption" not in p

    req_default = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_default = calculate_exit_analysis(req_default, today=today)
    facts_default = build_facts(res_default)
    points_default = build_key_points(res_default, facts_default)
    assert any("is an assumption" in p for p in points_default)


def test_interest_rate_zero_key_points():
    """interest_rate_pct 0: contains 'was ignored'; no point contains 'assumed rate'."""
    today = date(2026, 10, 21)
    req = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        interest_rate_pct=0,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res = calculate_exit_analysis(req, today=today)
    facts = build_facts(res)
    points = build_key_points(res, facts)

    combined = " ".join(points)
    assert "was ignored" in combined
    for p in points:
        assert "assumed rate" not in p


def test_interest_rate_default_vs_custom_key_points():
    """Default interest rate on a Hold case: contains 'assumed rate'. User-typed rate (7.5): does not."""
    today = date(2026, 10, 21)
    req_default = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_default = calculate_exit_analysis(req_default, today=today)
    facts_default = build_facts(res_default)
    points_default = build_key_points(res_default, facts_default)
    assert any("assumed rate" in p for p in points_default)

    req_custom = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=200,
        interest_rate_pct=7.5,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res_custom = calculate_exit_analysis(req_custom, today=today)
    facts_custom = build_facts(res_custom)
    points_custom = build_key_points(res_custom, facts_custom)
    for p in points_custom:
        assert "assumed rate" not in p


def test_long_term_equity_no_waiting_key_points():
    """A long-term equity case with no waiting: contains 'would not lower'."""
    today = date(2026, 10, 21)
    req = ExitAnalysisRequest(
        amount_invested=100000,
        current_value=120000,
        holding_period_days=400,
        investment_type="Equity Fund",
        fund_category="Equity: Flexi Cap / Large Cap",
    )
    res = calculate_exit_analysis(req, today=today)
    facts = build_facts(res)
    points = build_key_points(res, facts)

    combined = " ".join(points)
    assert "would not lower" in combined


def test_every_valid_case_in_exit_cases_fixture():
    """For EVERY valid case in reference/exit_cases.json: build_key_points returns >= 2 points, every ₹ amount in points is in facts['amounts']."""
    today = date(2026, 10, 21)
    fixture_path = Path(__file__).resolve().parents[2] / "reference" / "exit_cases.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rupee_pattern = re.compile(r"₹\s*[\d,]+(?:\.\d+)?")

    for case in data["cases"]:
        if not case["expected"].get("valid", True):
            continue
        req = ExitAnalysisRequest(**case["input"])
        res = calculate_exit_analysis(req, today=today)
        facts = build_facts(res)
        points = build_key_points(res, facts)

        assert len(points) >= 2, f"Expected >= 2 points for {case['name']}, got: {points}"

        valid_amounts = {v for v in facts["amounts"].values() if isinstance(v, str)}
        for p in points:
            for match in rupee_pattern.findall(p):
                cleaned = match.replace(" ", "").rstrip(",")
                assert cleaned in valid_amounts, (
                    f"Amount {cleaned} found in key point '{p}' is not in facts['amounts'] {valid_amounts} for case {case['name']}"
                )
