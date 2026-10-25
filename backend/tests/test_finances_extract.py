
from unittest.mock import patch

from app.services.finances_extract import (
    _validate_fields,
    extract_financial_fields,
)


def test_validates_loan_fields_against_source_text():
    result = _validate_fields(
        "loan_schedule",
        {
            "emi_amount": 48000,
            "outstanding_principal": 4800000,
            "interest_rate_pct": 8.5,
            "remaining_months": 180,
        },
        "EMI Amount: 48,000\n"
        "Outstanding Principal: 48,00,000\n"
        "Interest Rate: 8.5%\n"
        "Remaining Months: 180",
    )

    assert result["emi_amount"] == 48000
    assert result["outstanding_principal"] == 4800000


def test_rejects_unapproved_fields():
    try:
        _validate_fields(
            "loan_schedule",
            {"emi_amount": 48000, "customer_name": "Test Person"},
            "EMI Amount: 48,000",
        )
    except Exception:
        pass
    else:
        raise AssertionError("An unapproved field should be rejected")


def test_returns_fallback_when_api_key_is_missing():
    with patch("app.services.finances_extract.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = ""
        fields, source = extract_financial_fields(
            "loan_schedule",
            "EMI Amount: 48,000",
        )

    assert source == "fallback"
    assert fields["emi_amount"] is None
    assert fields["outstanding_principal"] is None


def test_unknown_document_type_does_not_call_ai():
    with patch("app.services.finances_extract.Groq") as mock_groq:
        fields, source = extract_financial_fields(
            "unknown",
            "Some unrecognized text",
        )

    mock_groq.assert_not_called()
    assert fields == {}
    assert source == "fallback"

import pytest

from app.services.finances_extract import _validate_fields


def test_rejects_amount_not_present_in_source_text():
    with pytest.raises(ValueError):
        _validate_fields(
            "loan_schedule",
            {"emi_amount": 99999},
            "EMI Amount: 48,000",
        )


def test_rejects_interest_rate_above_100():
    with pytest.raises(Exception):
        _validate_fields(
            "loan_schedule",
            {"interest_rate_pct": 150},
            "Interest Rate: 150%",
        )


def test_rejects_negative_financial_amount():
    with pytest.raises(Exception):
        _validate_fields(
            "loan_schedule",
            {"emi_amount": -48000},
            "EMI Amount: -48,000",
        )


def test_missing_fields_are_allowed():
    result = _validate_fields(
        "loan_schedule",
        {"emi_amount": 48000},
        "EMI Amount: 48,000",
    )

    assert result["emi_amount"] == 48000
    assert result["outstanding_principal"] is None
    assert result["interest_rate_pct"] is None
