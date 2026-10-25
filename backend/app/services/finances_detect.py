
"""Rule-based detection of supported financial document types."""

import re

DOCUMENT_KEYWORDS = {
    "sip_statement": (
        "systematic investment plan",
        "mutual fund",
        "monthly sip",
        "sip amount",
        "invested amount",
        "current value",
        "fund count",
    ),
    "loan_schedule": (
        "loan schedule",
        "outstanding principal",
        "emi amount",
        "equated monthly instalment",
        "equated monthly installment",
        "interest rate",
        "remaining months",
    ),
    "term_policy": (
        "term insurance",
        "sum assured",
        "annual premium",
        "life cover",
        "insurance policy",
    ),
    "fd_receipt": (
        "fixed deposit",
        "fd receipt",
        "maturity amount",
        "maturity date",
        "deposit amount",
    ),
    "salary_slip": (
        "salary slip",
        "salary statement",
        "gross salary",
        "monthly gross",
        "net pay",
        "net salary",
        "take-home pay",
    ),
}


def detect_document_type(text: str) -> str:
    """Return the best rule-based document type, or 'unknown'.

    This is a conservative keyword detector. Ambiguous documents
    should be handled by the extraction layer rather than guessed.
    """
    normalized = re.sub(r"\s+", " ", text.lower())

    scores = {
        doc_type: sum(
            1 for keyword in keywords if keyword in normalized
        )
        for doc_type, keywords in DOCUMENT_KEYWORDS.items()
    }

    highest_score = max(scores.values(), default=0)
    if highest_score == 0:
        return "unknown"

    winners = [
        doc_type
        for doc_type, score in scores.items()
        if score == highest_score
    ]

    if len(winners) != 1:
        return "unknown"

    return winners[0]
