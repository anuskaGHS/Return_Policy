
"""Code-based dashboard calculations for My Finances."""

from datetime import date

from app.models.finances import DashboardRequest
from app.services.health_score import compute_health_score


def _format_indian_number(value: float | int) -> str:
    """Format a number with Indian digit grouping, rounded to whole rupees."""
    rounded = int(round(value))
    sign = "-" if rounded < 0 else ""
    digits = str(abs(rounded))
    if len(digits) <= 3:
        return f"{sign}{digits}"

    last_three = digits[-3:]
    prefix = digits[:-3]
    groups = []
    while prefix:
        groups.insert(0, prefix[-2:])
        prefix = prefix[:-2]
    return sign + ",".join([*groups, last_three])


def _months_to_maturity(
    maturity_date: date | None,
    today: date | None = None,
) -> int | None:
    """Return full calendar months until maturity, clamped at zero."""
    if maturity_date is None:
        return None

    today = today or date.today()
    months = (maturity_date.year - today.year) * 12
    months += maturity_date.month - today.month
    if maturity_date.day < today.day:
        months -= 1
    return max(0, months)


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

    sip_card = None
    if sip is not None:
        sip_card = sip.model_dump(mode="json")
        absolute_return_pct = None
        if (
            sip.invested_amount is not None
            and sip.invested_amount > 0
            and sip.current_value is not None
        ):
            absolute_return_pct = (
                (sip.current_value - sip.invested_amount)
                / sip.invested_amount
            ) * 100
        sip_card["absolute_return_pct"] = absolute_return_pct

    insurance_card = None
    if insurance is not None or suggested_cover is not None:
        insurance_card = (
            insurance.model_dump(mode="json")
            if insurance is not None
            else {"sum_assured": None, "annual_premium": None}
        )
        insurance_card["suggested_cover"] = suggested_cover
        insurance_card["gap"] = cover_gap

    fd_card = None
    if fd is not None:
        fd_card = fd.model_dump(mode="json")
        fd_card["months_to_maturity"] = _months_to_maturity(fd.maturity_date)

    cards = {
        "sip": sip_card,
        "loan": loan.model_dump(mode="json") if loan else None,
        "insurance": insurance_card,
        "fd": fd_card,
        "income": income.model_dump(mode="json") if income else None,
    }

    findings = []
    if annual_income is not None:
        annual_income_display = _format_indian_number(annual_income)
        monthly_gross_display = _format_indian_number(monthly_gross)
        findings.append(
            {
                "id": "annual_income",
                "title": f"Annual gross income: ₹{annual_income_display}",
                "title_hi": f"वार्षिक सकल आय: ₹{annual_income_display}",
                "text_en": (
                    f"The supplied monthly gross salary of ₹{monthly_gross_display} "
                    f"works out to annual gross income of ₹{annual_income_display}, "
                    "before deductions."
                ),
                "text_hi": (
                    f"दी गई मासिक सकल आय ₹{monthly_gross_display} के आधार पर, "
                    f"कटौतियों से पहले आपकी वार्षिक सकल आय ₹{annual_income_display} है।"
                ),
            }
        )

    if suggested_cover is not None:
        suggested_cover_display = _format_indian_number(suggested_cover)
        cover_gap_display = _format_indian_number(cover_gap)
        current_cover_display = _format_indian_number(sum_assured)
        findings.append(
            {
                "id": "suggested_cover",
                "title": (
                    "Suggested life cover "
                    f"(10× annual income): ₹{suggested_cover_display}"
                ),
                "title_hi": (
                    "सुझाया गया जीवन बीमा कवर "
                    f"(वार्षिक आय का 10 गुना): ₹{suggested_cover_display}"
                ),
                "text_en": (
                    "Using a simple planning heuristic of 10× annual gross income, "
                    f"the suggested life cover is ₹{suggested_cover_display}. "
                    "This is a starting estimate; actual needs depend on dependants, "
                    "liabilities, and existing assets."
                ),
                "text_hi": (
                    "वार्षिक सकल आय के 10 गुना के सामान्य अनुमान के अनुसार सुझाया गया "
                    f"जीवन बीमा कवर ₹{suggested_cover_display} है। यह केवल शुरुआती "
                    "अनुमान है; वास्तविक आवश्यकता आश्रितों, देनदारियों और मौजूदा "
                    "संपत्तियों पर निर्भर करती है।"
                ),
            }
        )

        if insurance is not None and insurance.sum_assured is not None:
            gap_text_en = (
                f"Your recorded life cover is ₹{current_cover_display}. "
                f"Compared with the suggested cover of ₹{suggested_cover_display}, "
                f"the estimated gap is ₹{cover_gap_display}."
            )
            gap_text_hi = (
                f"आपका दर्ज जीवन बीमा कवर ₹{current_cover_display} है। "
                f"सुझाए गए ₹{suggested_cover_display} कवर की तुलना में "
                f"अनुमानित कमी ₹{cover_gap_display} है।"
            )
        else:
            gap_text_en = (
                "No existing life-cover amount was provided. The calculation treats "
                f"existing cover as ₹0, so the estimated gap is ₹{cover_gap_display}."
            )
            gap_text_hi = (
                "मौजूदा जीवन बीमा कवर की राशि नहीं दी गई है। गणना में मौजूदा कवर "
                f"₹0 माना गया है, इसलिए अनुमानित कमी ₹{cover_gap_display} है।"
            )

        findings.append(
            {
                "id": "cover_gap",
                "title": f"Estimated cover gap: ₹{cover_gap_display}",
                "title_hi": f"अनुमानित बीमा कवर की कमी: ₹{cover_gap_display}",
                "text_en": gap_text_en,
                "text_hi": gap_text_hi,
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
