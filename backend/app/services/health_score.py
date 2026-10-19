import math
from typing import Dict, Any


def _half_up(x: float) -> int:
    return math.floor(x + 0.5)


def compute_health_score(
    monthly_sip: float,
    loan_emi: float,
    loan_interest_rate: float,
    annual_income: float,
    sip_return_pct: float,
    term_cover: int,
    emergency_months: int,
    long_term_pct: float,
) -> Dict[str, Any]:
    # monthly_sip and loan_interest_rate are accepted but not used in the score formula
    _ = (monthly_sip, loan_interest_rate)

    # 1. SIP return vs benchmark: 25 * min(sip_return_pct, 12) / 12
    sip_pts = _half_up(25.0 * min(sip_return_pct, 12.0) / 12.0)

    # 2. Loan & 3. Insurance adequacy
    if annual_income <= 0:
        loan_pts = 0
        ins_pts = 0
    else:
        # raw = loan_emi / (annual_income / 12) * 100 (do not round raw)
        raw = loan_emi / (annual_income / 12.0) * 100.0
        loan_pts = _half_up(20.0 * (60.0 - min(raw, 60.0)) / 60.0)
        ins_pts = _half_up(20.0 * min(term_cover, 10.0 * annual_income) / (10.0 * annual_income))

    # 4. Tax efficiency: 20 * long_term_pct / 100
    tax_pts = _half_up(20.0 * long_term_pct / 100.0)

    # 5. Emergency fund: 15 * min(emergency_months, 6) / 6
    emg_pts = _half_up(15.0 * min(emergency_months, 6.0) / 6.0)

    # Total score is the sum of the 5 rounded parts
    score = sip_pts + loan_pts + ins_pts + tax_pts + emg_pts

    # Tier by score
    if score < 40:
        tier = "Critical Debt Stress"
    elif score < 60:
        tier = "Vulnerable Leveraged"
    elif score < 75:
        tier = "Balanced Saver"
    elif score < 90:
        tier = "Solid Wealth Builder"
    else:
        tier = "Financially Resilient"

    return {
        "points": {
            "sip": sip_pts,
            "loan": loan_pts,
            "ins": ins_pts,
            "tax": tax_pts,
            "emg": emg_pts,
        },
        "score": score,
        "tier": tier,
    }
