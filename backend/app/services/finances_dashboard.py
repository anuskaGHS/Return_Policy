
"""Code-based dashboard calculations for My Finances."""

from app.models.finances import DashboardRequest
from app.services.health_score import compute_health_score


def build_finances_dashboard(request: DashboardRequest) -> dict:
    """Calculate dashboard values using only validated request data."""

    sip = request.sip
    loan = request.loan
    insurance = request.insurance
    fd = request.fd
    income = request.income
    user_inputs = request.user_inputs

    missing = []
    if sip is None:
        missing.append("sip")
    if loan is None:
        missing.append("loan")
    if insurance is None:
        missing.append("insurance")
    if fd is None:
        missing.append("fd")
    if income is None or income.monthly_gross_salary is None:
        missing.append("income")

    monthly_gross = (
        income.monthly_gross_salary
        if income and income.monthly_gross_salary is not None
        else None
    )
    annual_income = monthly_gross * 12 if monthly_gross is not None else None

    sum_assured = (
        insurance.sum_assured
        if insurance and insurance.sum_assured is not None
        else 0
    )
    suggested_cover = 10 * annual_income if annual_income is not None else None
    cover_gap = (
        max(0, suggested_cover - sum_assured)
        if suggested_cover is not None
        else None
    )

    health = None
    if annual_income is not None:
        health = compute_health_score(
            monthly_sip=(
                sip.monthly_sip_amount
                if sip and sip.monthly_sip_amount is not None
                else 0
            ),
            loan_emi=(
                loan.emi_amount
                if loan and loan.emi_amount is not None
                else 0
            ),
            loan_interest_rate=(
                loan.interest_rate_pct
                if loan and loan.interest_rate_pct is not None
                else 0
            ),
            annual_income=annual_income,
            sip_return_pct=user_inputs.sip_return_pct,
            term_cover=sum_assured,
            emergency_months=user_inputs.emergency_months,
            long_term_pct=user_inputs.long_term_pct,
        )
        tier_translations = {
            "Critical Debt Stress": "गंभीर ऋण तनाव",
            "Vulnerable Leveraged": "ऋण के प्रति संवेदनशील",
            "Balanced Saver": "संतुलित बचतकर्ता",
            "Solid Wealth Builder": "मजबूत संपत्ति निर्माता",
            "Financially Resilient": "आर्थिक रूप से सुदृढ़",
        }
        health["tier_hi"] = tier_translations.get(
            health["tier"], health["tier"]
        )

    cards = {
        "sip": sip.model_dump(mode="json") if sip else None,
        "loan": loan.model_dump(mode="json") if loan else None,
        "insurance": insurance.model_dump(mode="json") if insurance else None,
        "fd": fd.model_dump(mode="json") if fd else None,
        "income": income.model_dump(mode="json") if income else None,
    }
    findings = []
    if annual_income is not None:
        findings.append(
            {
                "title": f"Annual gross income: ₹{annual_income:,.0f}",
                "title_hi": f"वार्षिक सकल आय: ₹{annual_income:,.0f}",
            }
        )
    if suggested_cover is not None:
        findings.append(
            {
                "title": (
                    "Suggested life cover "
                    f"(10× annual income): ₹{suggested_cover:,.0f}"
                ),
                "title_hi": (
                    "सुझाया गया जीवन बीमा कवर "
                    f"(वार्षिक आय का 10 गुना): ₹{suggested_cover:,.0f}"
                ),
            }
        )
        findings.append(
            {
                "title": f"Estimated cover gap: ₹{cover_gap:,.0f}",
                "title_hi": f"अनुमानित बीमा कवर की कमी: ₹{cover_gap:,.0f}",
            }
        )

    links = [
        "calculator",
        "exit-advisor",
        "explainer",
        "loan",
    ]

    return {
        "health": health,
        "annual_income": annual_income,
        "suggested_cover": suggested_cover,
        "cover_gap": cover_gap,
        "cards": cards,
        "missing": missing,
        "findings": findings,
        "links": links,
        "ai_source": "none",
    }
