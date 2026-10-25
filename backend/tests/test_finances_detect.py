
import pytest

from app.services.finances_detect import detect_document_type


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        (
            "Mutual Fund Statement. Monthly SIP. Invested Amount. Current Value.",
            "sip_statement",
        ),
        (
            "Loan Schedule. Outstanding Principal. EMI Amount. Interest Rate.",
            "loan_schedule",
        ),
        (
            "Term Insurance Policy. Sum Assured. Annual Premium.",
            "term_policy",
        ),
        (
            "Fixed Deposit Receipt. Principal Amount. Maturity Date.",
            "fd_receipt",
        ),
        (
            "Salary Slip. Gross Salary. Net Pay. Deductions.",
            "salary_slip",
        ),
        (
            "Welcome to our customer service portal.",
            "unknown",
        ),
        (
            "Interest Rate and Maturity Date",
            "unknown",
        ),
    ],
)
def test_detect_document_type(text, expected):
    assert detect_document_type(text) == expected
