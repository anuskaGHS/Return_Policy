
"""Best-effort privacy filtering before financial text reaches AI.

Regex filtering cannot guarantee that every name or identifier is removed.
Only relevant financial lines should be sent after this filtering step.
"""

import re


IDENTITY_LINE_PATTERN = re.compile(
    r"\b(?:name|address|holder|nominee|mobile|phone|email|"
    r"pan|dob|date\s+of\s+birth|customer\s+id)\b"
    r"|नाम|पता|मोबाइल|फोन|ईमेल|जन्म\s*तिथि|खाताधारक|नामांकित",
    re.IGNORECASE,
)

IDENTIFIER_PATTERNS = [
    re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),
    re.compile(r"(?<!\d)\d{4}\s?\d{4}\s?\d{4}(?!\d)"),
    re.compile(r"(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)"),
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b"),
    re.compile(r"(?<!\d)\d{9,18}(?!\d)"),
]

PLACEHOLDER = "[REDACTED]"

DOCUMENT_KEYWORDS = {
    "sip_statement": (
        "sip", "invested", "current value", "fund count",
        "months invested", "mutual fund", "units", "nav",
    ),
    "loan_schedule": (
        "emi", "outstanding", "interest rate", "tenure",
        "principal", "loan balance", "remaining months",
    ),
    "term_policy": (
        "sum assured", "annual premium", "term insurance",
        "life cover", "policy premium", "insurance cover",
    ),
    "fd_receipt": (
        "fixed deposit", "fd", "principal", "interest rate",
        "maturity", "deposit amount", "maturity amount",
    ),
    "salary_slip": (
        "gross", "net pay", "net salary", "gross salary",
        "earnings", "deductions", "take home", "take-home",
    ),
}

NUMBER_ONLY_PATTERN = re.compile(
    r"^\s*(?:₹|■)?\s*"
    r"(?:\d{1,3}(?:,\d{2,3})+|\d+)"
    r"(?:\.\d+)?%?\s*$"
)

def drop_identity_lines(text: str) -> str:
    """Drop lines containing common identity labels; this is not foolproof."""
    return "\n".join(
        line
        for line in text.splitlines()
        if not IDENTITY_LINE_PATTERN.search(line)
    )


def mask_identifiers(text: str) -> str:
    """Mask recognizable identifier patterns as a best-effort safeguard."""
    for pattern in IDENTIFIER_PATTERNS:
        text = pattern.sub(PLACEHOLDER, text)
    return text


def keep_keyword_lines(text: str, doc_type: str) -> str:
    """Keep relevant document lines and an immediately following numeric line.

    The returned text is capped at 4,000 characters.
    """
    keywords = DOCUMENT_KEYWORDS.get(doc_type)
    if not keywords:
        return ""

    lines = text.splitlines()
    kept = []
    seen = set()

    for index, line in enumerate(lines):
        if not any(keyword in line.lower() for keyword in keywords):
            continue

        candidates = [line]

        if index + 1 < len(lines):
            next_line = lines[index + 1]
            if NUMBER_ONLY_PATTERN.fullmatch(next_line):
                candidates.append(next_line)

        for candidate in candidates:
            candidate = candidate.strip()
            if candidate and candidate not in seen:
                seen.add(candidate)
                kept.append(candidate)

    return "\n".join(kept)[:4000]


def build_ai_input(text: str, doc_type: str) -> str:
    """Filter identity lines, mask identifiers, then retain relevant figures.

    This is best effort, not a guarantee that all personal information is removed.
    """
    text = drop_identity_lines(text)
    text = mask_identifiers(text)
    return keep_keyword_lines(text, doc_type)
