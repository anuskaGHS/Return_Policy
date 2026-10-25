"""
Loan vs. Investment Optimizer Service for Return Policy
Compares Strategy A (Aggressive Loan Prepayment -> Reinvest Freed Cash Flow)
vs Strategy B (Regular EMI -> Consistent Surplus Equity SIP).
Calculates deterministic month-by-month reducing-balance loan amortization,
SIP compounding, Section 112A LTCG tax, and numerical break-even CAGR.
"""

from typing import Optional, List, Any
from app.models.policy import LoanOptimizerRequest, LoanStrategyResult, LoanOptimizerResponse
from app.services.tax_engine import EQUITY_LTCG_RATE_PCT, EQUITY_LTCG_EXEMPTION_INR


def _simulate_strategy_a(
    principal: float,
    r_loan: float,
    emi: float,
    tenure_months: int,
    monthly_surplus: float,
    r_sip: float
) -> tuple[int, float, float, float, float]:
    """
    Simulates Strategy A (Prepay):
    Pays EMI + monthly_surplus towards the loan until closed.
    In the closure month, any residual portion of (EMI + monthly_surplus) not needed
    to close the loan is invested into equity SIP.
    Once closed, the full freed amount (EMI + monthly_surplus) is invested into SIP
    each month until the original tenure ends.

    Returns:
        (loan_closure_month, total_interest_paid, final_sip_corpus, ltcg_tax, net_wealth)
    """
    bal = float(principal)
    tot_interest = 0.0
    closure_month = tenure_months
    sip_invested = 0.0
    sip_corpus = 0.0
    monthly_budget = emi + monthly_surplus

    for m in range(1, tenure_months + 1):
        if bal > 1e-7:
            interest = bal * r_loan
            tot_interest += interest
            due = bal + interest

            if due <= monthly_budget + 1e-7 or m == tenure_months:
                loan_pay = min(due, monthly_budget) if m < tenure_months else due
                bal = 0.0
                closure_month = m
                sip_contrib = max(0.0, monthly_budget - loan_pay)
            else:
                loan_pay = monthly_budget
                bal = max(0.0, due - loan_pay)
                sip_contrib = 0.0
        else:
            sip_contrib = monthly_budget

        # SIP compounding (annuity-due: deposit at beginning of month)
        if sip_contrib > 0:
            sip_invested += sip_contrib
            sip_corpus = (sip_corpus + sip_contrib) * (1.0 + r_sip)
        else:
            sip_corpus = sip_corpus * (1.0 + r_sip)

    gain = max(0.0, sip_corpus - sip_invested)
    tax = max(0.0, gain - EQUITY_LTCG_EXEMPTION_INR) * (EQUITY_LTCG_RATE_PCT / 100.0) if gain > 0 else 0.0
    net_wealth = sip_corpus - tax
    return closure_month, tot_interest, sip_corpus, tax, net_wealth


def _simulate_strategy_b(
    principal: float,
    r_loan: float,
    emi: float,
    tenure_months: int,
    monthly_surplus: float,
    r_sip: float
) -> tuple[int, float, float, float, float]:
    """
    Simulates Strategy B (Invest):
    Pays regular EMI towards the loan for the full tenure.
    Invests monthly_surplus into equity SIP every month for the full tenure.

    Returns:
        (loan_closure_month, total_interest_paid, final_sip_corpus, ltcg_tax, net_wealth)
    """
    bal = float(principal)
    tot_interest = 0.0
    closure_month = tenure_months
    sip_invested = 0.0
    sip_corpus = 0.0

    for m in range(1, tenure_months + 1):
        if bal > 1e-7:
            interest = bal * r_loan
            tot_interest += interest
            due = bal + interest
            if due <= emi + 1e-7 or m == tenure_months:
                loan_pay = due
                bal = 0.0
                closure_month = m
            else:
                loan_pay = emi
                bal = max(0.0, due - loan_pay)

        sip_contrib = monthly_surplus
        if sip_contrib > 0:
            sip_invested += sip_contrib
            sip_corpus = (sip_corpus + sip_contrib) * (1.0 + r_sip)
        else:
            sip_corpus = sip_corpus * (1.0 + r_sip)

    gain = max(0.0, sip_corpus - sip_invested)
    tax = max(0.0, gain - EQUITY_LTCG_EXEMPTION_INR) * (EQUITY_LTCG_RATE_PCT / 100.0) if gain > 0 else 0.0
    net_wealth = sip_corpus - tax
    return closure_month, tot_interest, sip_corpus, tax, net_wealth


def _find_break_even_cagr(
    principal: float,
    r_loan: float,
    emi: float,
    tenure_months: int,
    monthly_surplus: float,
    annual_loan_rate_pct: float
) -> float:
    """
    Finds the break-even equity CAGR (%) numerically using bisection where:
    Net Wealth (Strategy A) == Net Wealth (Strategy B).
    """
    if monthly_surplus <= 1e-7 or principal <= 0 or tenure_months <= 0:
        return round(annual_loan_rate_pct, 4)

    def diff(cagr: float) -> float:
        r_sip = (cagr / 100.0) / 12.0
        _, _, _, _, net_a = _simulate_strategy_a(principal, r_loan, emi, tenure_months, monthly_surplus, r_sip)
        _, _, _, _, net_b = _simulate_strategy_b(principal, r_loan, emi, tenure_months, monthly_surplus, r_sip)
        return net_b - net_a

    low = 0.0
    high = max(25.0, annual_loan_rate_pct * 2.0)

    diff_low = diff(low)
    diff_high = diff(high)

    iteration = 0
    while diff_high < 0 and high < 200.0 and iteration < 10:
        high *= 1.5
        diff_high = diff(high)
        iteration += 1

    if diff_low >= 0:
        return 0.0
    if diff_high <= 0:
        return round(high, 4)

    for _ in range(60):
        mid = (low + high) / 2.0
        if diff(mid) < 0:
            low = mid
        else:
            high = mid

    return round(mid, 4)



def _format_indian_number(value: float) -> str:
    """Round to rupees and group digits in Indian numbering style."""
    rounded = int(round(float(value)))
    sign = "-" if rounded < 0 else ""
    digits = str(abs(rounded))

    if len(digits) <= 3:
        return sign + digits

    groups = [digits[-3:]]
    digits = digits[:-3]
    while digits:
        groups.insert(0, digits[-2:] if len(digits) > 2 else digits)
        digits = digits[:-2] if len(digits) > 2 else ""

    return sign + ",".join(groups)


def _months_as_years(months: int, language: str) -> str:
    years, remaining = divmod(max(0, int(months)), 12)

    if language == "hi":
        parts = ([f"{years} साल"] if years else [])
        parts += ([f"{remaining} महीने"] if remaining else [])
        return " ".join(parts) if parts else "0 महीने"

    parts = (
        [f"{years} year" if years == 1 else f"{years} years"]
        if years else []
    )
    parts += (
        [f"{remaining} month" if remaining == 1 else f"{remaining} months"]
        if remaining else []
    )
    return " ".join(parts) if parts else "0 months"


def _build_key_points(
    *,
    loan_closure_month,
    invest_closure_month,
    interest_saved,
    net_prepay,
    net_invest,
    net_wealth_difference,
    recommendation,
    break_even_cagr,
    expected_cagr,
):
    """Build matching English and Hindi highlights from calculated results."""
    a_close = int(loan_closure_month)
    b_close = int(invest_closure_month)

    a_text = _months_as_years(a_close, "en")
    a_text_hi = _months_as_years(a_close, "hi")
    interest = _format_indian_number(interest_saved)
    net_a = _format_indian_number(net_prepay)
    net_b = _format_indian_number(net_invest)
    diff = _format_indian_number(net_wealth_difference)
    be = f"{break_even_cagr:.2f}"
    cagr = f"{expected_cagr:g}"

    en = [
        f"If you prepay, the loan closes in month {a_close} "
        f"({a_text}) instead of month {b_close}."
    ]
    hi = [
        f"लोन जल्दी चुकाने पर लोन महीना {a_close} ({a_text_hi}) "
        f"में बंद हो जाता है, महीना {b_close} में नहीं।"
    ]

    if interest_saved > 0:
        en.append(f"That saves about ₹{interest} in interest.")
        hi.append(f"इससे ब्याज में करीब ₹{interest} की बचत होती है।")

    equal = abs(net_prepay - net_invest) < 0.005

    if equal:
        en.append("On these assumptions both options end with the same money.")
        hi.append("इन अनुमानों पर दोनों विकल्पों में अंत में बराबर रकम बचती है।")
    elif recommendation == "Invest":
        en.append(
            f"If you invest the extra money instead, you end with ₹{net_b} "
            f"against ₹{net_a}, a difference of ₹{diff}, after tax on the gains."
        )
        hi.append(
            f"इसके बजाय अतिरिक्त रकम निवेश करने पर अंत में ₹{net_b} बचते हैं, "
            f"जबकि लोन जल्दी चुकाने पर ₹{net_a}। अंतर ₹{diff} है, "
            "मुनाफ़े पर टैक्स के बाद।"
        )
    else:
        en.append(
            f"If you prepay, you end with ₹{net_a} against ₹{net_b} "
            f"if you invest, a difference of ₹{diff}, after tax on the gains."
        )
        hi.append(
            f"लोन जल्दी चुकाने पर अंत में ₹{net_a} बचते हैं, जबकि निवेश "
            f"करने पर ₹{net_b}। अंतर ₹{diff} है, मुनाफ़े पर टैक्स के बाद।"
        )

    if not equal:
        if recommendation == "Invest":
            en.append(
                f"The break-even return is {be}% a year. If the market gives "
                "less than that, prepaying comes out ahead."
            )
            hi.append(
                f"ब्रेक-ईवन रिटर्न सालाना {be}% है। बाज़ार इससे कम दे तो "
                "लोन जल्दी चुकाना आगे रहता है।"
            )
        else:
            en.append(
                f"The break-even return is {be}% a year. If the market gives "
                "more than that, investing comes out ahead."
            )
            hi.append(
                f"ब्रेक-ईवन रिटर्न सालाना {be}% है। बाज़ार इससे ज़्यादा दे तो "
                "निवेश आगे रहता है।"
            )

    en.append(
        f"This assumes a steady {cagr}% return and a fixed loan rate. "
        "Real markets go up and down."
    )
    hi.append(
        f"यह मानकर चला गया है कि रिटर्न हर साल {cagr}% रहेगा और लोन की दर "
        "तय रहेगी। असल बाज़ार ऊपर-नीचे होता है।"
    )

    return en, hi


def calculate_loan_vs_invest(
    outstanding_principal: Any = None,
    annual_interest_rate_pct: Optional[float] = None,
    remaining_tenure_months: Optional[int] = None,
    monthly_surplus: Optional[float] = None,
    expected_equity_cagr_pct: Optional[float] = None,
    req: Optional[LoanOptimizerRequest] = None
) -> LoanOptimizerResponse:
    """
    Compares Strategy A (Prepay loan then invest freed outflow) vs Strategy B (Regular EMI + Invest surplus).
    Simulates month by month with reducing-balance EMI and monthly compounding SIP.
    """
    if isinstance(outstanding_principal, LoanOptimizerRequest):
        req = outstanding_principal
    elif req is None:
        req = LoanOptimizerRequest(
            outstanding_principal=float(outstanding_principal if outstanding_principal is not None else 0.0),
            annual_interest_rate_pct=float(annual_interest_rate_pct if annual_interest_rate_pct is not None else 0.0),
            remaining_tenure_months=int(remaining_tenure_months if remaining_tenure_months is not None else 0),
            monthly_surplus=float(monthly_surplus if monthly_surplus is not None else 0.0),
            expected_equity_cagr_pct=float(expected_equity_cagr_pct if expected_equity_cagr_pct is not None else 12.0)
        )

    p = float(req.outstanding_principal)
    r_loan_pct = float(req.annual_interest_rate_pct)
    n = int(req.remaining_tenure_months)
    surplus = float(req.monthly_surplus)
    cagr_pct = float(req.expected_equity_cagr_pct)

    # Monthly loan interest rate
    r_loan = (r_loan_pct / 100.0) / 12.0 if r_loan_pct > 0 else 0.0

    # Monthly reducing-balance regular EMI formula
    if r_loan > 0 and n > 0:
        comp = (1.0 + r_loan) ** n
        emi = p * (r_loan * comp) / (comp - 1.0)
    elif n > 0:
        emi = p / n
    else:
        emi = 0.0

    # Monthly SIP compounding rate
    r_sip = (cagr_pct / 100.0) / 12.0

    # 1. Simulate Strategy A (Prepay)
    cl_a, int_a, corp_a, tax_a, net_a = _simulate_strategy_a(p, r_loan, emi, n, surplus, r_sip)

    # 2. Simulate Strategy B (Invest)
    cl_b, int_b, corp_b, tax_b, net_b = _simulate_strategy_b(p, r_loan, emi, n, surplus, r_sip)

    # 3. Find Numerical Break-Even CAGR
    break_even_cagr = _find_break_even_cagr(p, r_loan, emi, n, surplus, r_loan_pct)

    # 4. Net Wealth Difference & Recommendation
    diff = round(abs(net_a - net_b), 2)
    if net_a > net_b:
        recommendation = "Prepay"
    else:
        recommendation = "Invest"

    notes = [
        "Home loan tax benefits left out: tax deductions on home loan interest (up to ₹2,00,000 a year) are not counted. They could change the result.",
        "Tax on gains: the investment is assumed to be sold in one go at the end, with 12.5% tax on gains above ₹1,25,000. Check the current rates before you decide.",
        "Monthly investing: each month’s money is invested at the start of the month and grows at your expected return divided by 12.",
        "Same monthly spend: both options use the same total every month (EMI plus your extra money). Under Prepay, the leftover in the month the loan closes, and the full amount after that, goes into investing.",
        "Break-even return: the yearly return at which both options end with the same money. It is found by repeated trial, not by a formula.",
        "Fixed rates: the loan rate and the investment return stay the same for the whole period. Real loans can change rate and markets go up and down."
    ]
    notes_hi = [
        "होम लोन के टैक्स लाभ शामिल नहीं: होम लोन के ब्याज पर टैक्स कटौती (साल में ₹2,00,000 तक) नहीं गिनी गई है। इससे नतीजा बदल सकता है।",
        "मुनाफ़े पर टैक्स: मान लिया गया है कि निवेश अंत में एक बार में बेचा जाएगा और ₹1,25,000 से ऊपर के मुनाफ़े पर 12.5% टैक्स लगेगा। फ़ैसले से पहले मौजूदा दरें जाँच लें।",
        "हर महीने निवेश: हर महीने की रकम महीने की शुरुआत में निवेश होती है और आपके अपेक्षित सालाना रिटर्न को 12 से भाग देकर हर महीने बढ़ती है।",
        "हर महीने उतना ही खर्च: दोनों विकल्पों में हर महीने कुल रकम बराबर है (EMI और आपकी अतिरिक्त रकम)। लोन जल्दी चुकाने में, लोन बंद होने के महीने की बची रकम और उसके बाद पूरी रकम निवेश में जाती है।",
        "ब्रेक-ईवन रिटर्न: वह सालाना रिटर्न जिस पर दोनों विकल्पों में अंत में बराबर रकम बचती है। इसे बार-बार आज़माकर निकाला गया है, किसी सीधे सूत्र से नहीं।",
        "तय दरें: पूरी अवधि में लोन की दर और निवेश का रिटर्न एक जैसे माने गए हैं। असल में लोन की दर बदल सकती है और बाज़ार ऊपर-नीचे होता है।"
    ]
    key_points, key_points_hi = _build_key_points(
        loan_closure_month=cl_a,
        invest_closure_month=cl_b,
        interest_saved=int_b - int_a,
        net_prepay=net_a,
        net_invest=net_b,
        net_wealth_difference=diff,
        recommendation=recommendation,
        break_even_cagr=break_even_cagr,
        expected_cagr=cagr_pct,
    )

    strategy_a_res = LoanStrategyResult(
        strategy_name="Prepay",
        loan_closure_month=cl_a,
        total_interest_paid=round(int_a, 2),
        final_sip_corpus=round(corp_a, 2),
        ltcg_tax=round(tax_a, 2),
        net_wealth=round(net_a, 2)
    )

    strategy_b_res = LoanStrategyResult(
        strategy_name="Invest",
        loan_closure_month=cl_b,
        total_interest_paid=round(int_b, 2),
        final_sip_corpus=round(corp_b, 2),
        ltcg_tax=round(tax_b, 2),
        net_wealth=round(net_b, 2)
    )

    return LoanOptimizerResponse(
        strategy_a=strategy_a_res,
        strategy_b=strategy_b_res,
        net_wealth_difference=diff,
        recommendation=recommendation,
        break_even_cagr=break_even_cagr,
        break_even_cagr_pct=break_even_cagr,
        notes=notes,
        notes_hi=notes_hi,
        key_points=key_points,
        key_points_hi=key_points_hi,
    )
