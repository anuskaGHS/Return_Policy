import json
import logging
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from app.models.finances import ChatRequest, DashboardRequest
from app.services import finances_chat
from app.services.finances_extract import (
    _extract_fallback,
    _read_date,
    extract_financial_fields,
)
from app.services.finances_privacy import build_ai_input


def _reply(text):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=text))]
    )


def _fake_groq(text=None, error=None):
    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    if error:
                        raise error
                    return _reply(text)

    return FakeGroq


def _dashboard():
    return DashboardRequest.model_validate({
        "income": {"monthly_gross_salary": 100000, "monthly_net_salary": 92000},
        "insurance": {"sum_assured": 10000000, "annual_premium": 14500},
        "fd": {"principal_amount": 500000, "maturity_amount": 535500},
    })


# ---- extraction -----------------------------------------------------------

def test_reads_dates_in_common_formats():
    assert _read_date("25 October 2027") == date(2027, 10, 25)
    assert _read_date("25 Oct 2027") == date(2027, 10, 25)
    assert _read_date("25-10-2027") == date(2027, 10, 25)
    assert _read_date("2027-10-25") == date(2027, 10, 25)
    assert _read_date("not a date") is None


def test_label_reader_finds_fd_date_and_sip_values():
    fd = _extract_fallback("fd_receipt", "Maturity date\n25 October 2027")
    assert fd["maturity_date"] == date(2027, 10, 25)

    sip = _extract_fallback(
        "sip_statement",
        "Total contributions\n■96,000\nCurrent illustrative value\n■101,250",
    )
    assert sip["invested_amount"] == 96000.0
    assert sip["current_value"] == 101250.0


def test_privacy_filter_keeps_the_date_line_after_the_maturity_label():
    text = "Deposit reference\nDEMO-FD-1\nMaturity date\n25 October 2027\nTenure\n12 months"
    kept = build_ai_input(text, "fd_receipt")
    assert "25 October 2027" in kept


def test_ai_gaps_are_filled_from_labelled_lines(monkeypatch):
    reply = json.dumps({"fields": {
        "principal_amount": 500000, "interest_rate_pct": None,
        "maturity_amount": None, "maturity_date": None,
    }})
    monkeypatch.setattr("app.services.finances_extract.Groq", _fake_groq(reply))
    with patch("app.services.finances_extract.settings") as settings:
        settings.GROQ_API_KEY = "test-key"
        settings.GROQ_MODEL = "test-model"
        fields, source = extract_financial_fields(
            "fd_receipt",
            "Principal amount\n500000\nMaturity date\n25 October 2027",
        )
    assert source == "ai"
    assert fields["principal_amount"] == 500000
    assert fields["maturity_date"] == date(2027, 10, 25)


# ---- chat -----------------------------------------------------------------

def test_hindi_question_without_english_words_reaches_the_ai(monkeypatch):
    monkeypatch.setattr(
        finances_chat, "Groq", _fake_groq("आपका जीवन बीमा कवर ₹1,00,00,000 है।")
    )
    request = ChatRequest(
        question="क्या मेरा बीमा कवर काफ़ी है?", language="hi", dashboard=_dashboard()
    )
    result = finances_chat.answer_finances_chat(request, _dashboard())
    assert result["ai_source"] == "ai"


def test_unrelated_hindi_question_is_out_of_scope(monkeypatch):
    calls = []
    monkeypatch.setattr(finances_chat, "Groq", lambda **kw: calls.append(1))
    request = ChatRequest(
        question="आज मौसम कैसा है?", language="hi", dashboard=_dashboard()
    )
    result = finances_chat.answer_finances_chat(request, _dashboard())
    assert result["ai_source"] == "fallback"
    assert result["answer"] == finances_chat.OUT_OF_SCOPE_HI
    assert calls == []


def test_ai_gets_ready_made_indian_amounts_and_the_fixed_rules():
    request = ChatRequest(question="Is my cover enough?", dashboard=_dashboard())
    figures = finances_chat._dashboard_figures(request, _dashboard())
    assert figures["cards"]["fd"]["maturity_amount_formatted"] == "₹5,35,500"
    assert figures["cover_gap_formatted"] == "₹20,00,000"
    assert figures["cards"]["insurance"]["sum_assured_formatted"] == "₹1,00,00,000"
    assert figures["calculation_constants"]["suggested_cover_income_multiplier"] == 10


def test_health_points_are_not_shown_as_rupees():
    request = ChatRequest(question="How is my score?", dashboard=_dashboard())
    figures = finances_chat._dashboard_figures(request, _dashboard())
    assert "sip_formatted" not in figures["health"]["points"]


def test_sip_return_comes_with_a_rounded_text_version():
    dashboard = DashboardRequest.model_validate({
        "income": {"monthly_gross_salary": 100000},
        "sip": {"monthly_sip_amount": 8000, "invested_amount": 96000, "current_value": 101250},
    })
    request = ChatRequest(question="How is my SIP doing?", dashboard=dashboard)
    figures = finances_chat._dashboard_figures(request, dashboard)
    assert figures["cards"]["sip"]["absolute_return_pct_text"] == "5.47%"


def test_amount_in_indian_format_is_accepted(monkeypatch):
    monkeypatch.setattr(
        finances_chat, "Groq", _fake_groq("Your FD pays ₹5,35,500 at maturity.")
    )
    request = ChatRequest(question="What does my FD pay?", dashboard=_dashboard())
    result = finances_chat.answer_finances_chat(request, _dashboard())
    assert result["ai_source"] == "ai"


def test_error_kind_is_logged_without_the_question(monkeypatch, caplog):
    monkeypatch.setattr(
        finances_chat, "Groq", _fake_groq(error=TimeoutError("secret detail"))
    )
    request = ChatRequest(question="Is my cover enough?", dashboard=_dashboard())
    with caplog.at_level(logging.WARNING):
        result = finances_chat.answer_finances_chat(request, _dashboard())
    assert result["ai_source"] == "fallback"
    assert "TimeoutError" in caplog.text
    assert "secret detail" not in caplog.text
    assert "cover" not in caplog.text


def test_number_check_rejection_is_logged_without_the_answer(monkeypatch, caplog):
    monkeypatch.setattr(
        finances_chat, "Groq", _fake_groq("Your income is ₹7,77,777.")
    )
    request = ChatRequest(question="What is my income?", dashboard=_dashboard())
    with caplog.at_level(logging.WARNING):
        result = finances_chat.answer_finances_chat(request, _dashboard())
    assert result["ai_source"] == "fallback"
    assert "number guard" in caplog.text
    assert "7,77,777" not in caplog.text
