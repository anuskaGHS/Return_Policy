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
        "Home Loan Tax Benefits Omitted: Section 24(b) tax deductions (up to ₹2,00,000/year on interest) are excluded in this baseline comparison.",
        "Single Redemption LTCG Taxation: Equity SIP corpus is assumed redeemed in a single tranche at the end of the original tenure, taxed at 12.5% on capital gains exceeding the ₹1,25,000 exemption limit under Section 112A (Budget 2024).",
        "Annuity-Due Monthly Compounding: Equity SIP compounding assumes beginning-of-month contributions compounding at a nominal monthly rate of (expected_equity_cagr_pct / 12).",
        "Identical Monthly Outflow Discipline: Both strategies deploy the exact same monthly cash outflow (EMI + monthly surplus). In Strategy A, any leftover cash in the month of loan closure is invested into SIP, and the full freed amount (EMI + surplus) is invested thereafter.",
        "Break-Even CAGR Solved Numerically: Calculated via high-precision bisection search (60 iterations) to find the equity CAGR hurdle rate where both strategies generate identical terminal net wealth.",
        "Constant Parameters Assumed: Loan interest rate and equity returns are assumed constant over the entire tenure; floating rate revisions and market volatility are not simulated."
    ]

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
        notes=notes
    )
