
from app.services.finances_privacy import build_ai_input


def test_financial_figures_survive_and_identifiers_are_filtered():
    text = """
Customer Name: Test Person Example
Address: 12 Example Street, Sample Town 000000
PAN: ABCDE1234F
Aadhaar: 1234 5678 9012
Mobile: 9876543210
Email: test.person@example.com
Account: 123456789012
IFSC: ABCD0123456
EMI: 48,000
Outstanding: 48,00,000
"""

    result = build_ai_input(text, "loan_schedule")

    assert "Test Person Example" not in result
    assert "Example Street" not in result
    assert "ABCDE1234F" not in result
    assert "1234 5678 9012" not in result
    assert "9876543210" not in result
    assert "test.person@example.com" not in result
    assert "123456789012" not in result
    assert "ABCD0123456" not in result

    assert "48,000" in result
    assert "48,00,000" in result


from app.services.finances_privacy import (
    drop_identity_lines,
    keep_keyword_lines,
    mask_identifiers,
)


def test_identifier_patterns_are_masked():
    text = (
        "PAN ABCDE1234F\n"
        "Aadhaar 1234 5678 9012\n"
        "Mobile 9876543210\n"
        "Email test.person@example.com\n"
        "IFSC ABCD0123456\n"
        "Account 123456789012\n"
    )

    result = mask_identifiers(text)

    for identifier in (
        "ABCDE1234F",
        "1234 5678 9012",
        "9876543210",
        "test.person@example.com",
        "ABCD0123456",
        "123456789012",
    ):
        assert identifier not in result


def test_identity_lines_are_dropped():
    text = (
        "Customer Name: Test Person\n"
        "Address: Example Street\n"
        "EMI: 48,000\n"
        "Outstanding: 48,00,000\n"
    )

    result = drop_identity_lines(text)

    assert "Test Person" not in result
    assert "Example Street" not in result
    assert "EMI: 48,000" in result
    assert "Outstanding: 48,00,000" in result


def test_keyword_filter_keeps_relevant_financial_lines():
    text = (
        "Welcome to the bank\n"
        "EMI\n"
        "48,000\n"
        "Customer support information\n"
        "Outstanding principal: 48,00,000\n"
    )

    result = keep_keyword_lines(text, "loan_schedule")

    assert "EMI" in result
    assert "48,000" in result
    assert "Outstanding principal: 48,00,000" in result
    assert "Welcome to the bank" not in result
    assert "Customer support information" not in result


def test_unknown_document_type_returns_no_text():
    assert keep_keyword_lines("EMI: 48,000", "unknown") == ""


def test_keyword_filter_caps_output_length():
    text = "\n".join(
        f"EMI amount: {index},000" for index in range(1000)
    )

    result = keep_keyword_lines(text, "loan_schedule")

    assert len(result) <= 4000


def test_indian_amounts_are_not_masked():
    text = "EMI: 48,000\nOutstanding: 48,00,000"

    result = mask_identifiers(text)

    assert "48,000" in result
    assert "48,00,000" in result
