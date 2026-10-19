"""
Smart Exit & Hold Tax Advisor Service for Return Policy
Computes deterministic capital gains tax (STCG vs LTCG), exit load obligations,
and breakeven holding recommendations for Indian mutual fund investors.
"""

from typing import Optional, List, Any
from app.models.policy import ExitAnalysisRequest, ExitAnalysisResponse

# Statutory Rates & Exemptions (Finance Act 2024 & Income Tax Act)
EQUITY_STCG_RATE_PCT = 20.0        # Section 111A (revised from 15% to 20% in Budget 2024)
EQUITY_LTCG_RATE_PCT = 12.5        # Section 112A (revised from 10% to 12.5% in Budget 2024)
EQUITY_LTCG_EXEMPTION_INR = 125000.0  # Annual exemption limit under Sec 112A (revised from ₹1,00,000 to ₹1,25,000)
EQUITY_LTCG_THRESHOLD_DAYS = 365   # >12 months / 365 days for equity mutual funds

# Debt fund threshold (Legacy rules: >36 months / 1095 days)
DEBT_LTCG_THRESHOLD_DAYS = 1095
DEFAULT_DEBT_SLAB_RATE_PCT = 30.0

def calculate_exit_analysis(
    investment_type: Any = None,
    amount_invested: Optional[float] = None,
    current_value: Optional[float] = None,
    holding_period_days: Optional[int] = None,
    fund_category: Optional[str] = None,
    exit_load_pct: Optional[float] = None,
    applicable_slab_rate_pct: Optional[float] = None,
    req: Optional[ExitAnalysisRequest] = None
) -> ExitAnalysisResponse:
    """
    Evaluates whether an investor should exit now or hold until the LTCG window opens.
    Accepts either an ExitAnalysisRequest object or individual positional/keyword arguments.
    Returns full tax and exit load breakdowns with quantifiable rupee savings.
    """
    # Handle polymorphic call: calculate_exit_analysis(req) vs calculate_exit_analysis(investment_type, ...)
    if isinstance(investment_type, ExitAnalysisRequest):
        req = investment_type
    elif req is None:
        req = ExitAnalysisRequest(
            investment_type=str(investment_type or "Equity Fund"),
            amount_invested=float(amount_invested if amount_invested is not None else 0.0),
            current_value=float(current_value if current_value is not None else 0.0),
            holding_period_days=int(holding_period_days if holding_period_days is not None else 0),
            fund_category=fund_category or "Equity: General",
            exit_load_pct=exit_load_pct,
            applicable_slab_rate_pct=applicable_slab_rate_pct or DEFAULT_DEBT_SLAB_RATE_PCT
        )

    inv_type = (req.investment_type or "Equity Fund").strip().lower()
    is_equity = "equity" in inv_type or inv_type == "mf" or "stock" in inv_type
    
    amount_invested_val = float(req.amount_invested)
    current_value_val = float(req.current_value)
    holding_days = int(req.holding_period_days)
    gain = round(current_value_val - amount_invested_val, 2)
    gain_pct = round((gain / amount_invested_val * 100.0), 2) if amount_invested_val > 0 else 0.0
    is_gain = gain > 0

    threshold_days = EQUITY_LTCG_THRESHOLD_DAYS if is_equity else DEBT_LTCG_THRESHOLD_DAYS
    # STCG if holding_period_days <= 365 for equity (or <= 1095 for debt)
    is_short_term = holding_days <= threshold_days
    tax_type = "STCG" if is_short_term else "LTCG"
    holding_status = "Short-Term" if is_short_term else "Long-Term"

    assumption_notes: List[str] = [
        "Projected tax assuming portfolio value stays flat (market returns will fluctuate)."
    ]
    rule_flags: List[str] = []

    # --- 1. Exit Load Calculation ---
    # Assume 1% if holding_period_days < 365 for equity funds, 0% after; configurable via exit_load_pct
    if req.exit_load_pct is not None:
        applied_exit_load_pct = max(0.0, float(req.exit_load_pct))
    else:
        if is_equity:
            applied_exit_load_pct = 1.0 if holding_days < EQUITY_LTCG_THRESHOLD_DAYS else 0.0
        else:
            # Debt fund illustrative heuristic default
            applied_exit_load_pct = 0.25 if holding_days <= 30 else 0.0

    exit_load_amount = round(current_value_val * (applied_exit_load_pct / 100.0), 2)
    rule_flags.append(
        "Exit Load Rule Note: Exit load is assumed at 1.0% (<365 days for equity funds) for illustrative purposes. "
        "Exact exit load rules vary by fund and AMC and should be verified against actual SEBI/AMFI scheme documents (SID/KIM)."
    )

    # --- 2. Current Tax Calculation ---
    ltcg_exemption_applied = 0.0
    if is_equity:
        assumption_notes.append("Equity Taxation reflects Budget 2024 rules: STCG @ 20% (Sec 111A), LTCG @ 12.5% above ₹1,25,000 exemption (Sec 112A).")
        if is_short_term:
            tax_rate_applied_pct = EQUITY_STCG_RATE_PCT
            current_tax = round(gain * (EQUITY_STCG_RATE_PCT / 100.0), 2) if is_gain else 0.0
        else:
            tax_rate_applied_pct = EQUITY_LTCG_RATE_PCT
            if is_gain:
                taxable_gain = max(0.0, gain - EQUITY_LTCG_EXEMPTION_INR)
                ltcg_exemption_applied = min(gain, EQUITY_LTCG_EXEMPTION_INR)
                current_tax = round(taxable_gain * (EQUITY_LTCG_RATE_PCT / 100.0), 2)
            else:
                current_tax = 0.0
    else:
        # Debt Mutual Funds
        slab_rate = float(req.applicable_slab_rate_pct if req.applicable_slab_rate_pct is not None else DEFAULT_DEBT_SLAB_RATE_PCT)
        tax_rate_applied_pct = slab_rate
        rule_flags.append(
            "RULE VERIFICATION FLAG: Under Section 50AA of the Income Tax Act (introduced via Finance Act 2023), "
            "mutual funds where domestic equity exposure is <=35% acquired on or after April 1, 2023 are deemed "
            "Short-Term Capital Gains taxed at your marginal slab rate regardless of holding duration. The 3-year "
            "(1095-day) threshold applies only to legacy units acquired prior to April 1, 2023 or hybrid funds (35%-65% equity)."
        )
        if is_gain:
            if is_short_term:
                current_tax = round(gain * (slab_rate / 100.0), 2)
            else:
                # Legacy LTCG or hybrid: 12.5% without indexation under Finance Act 2024
                tax_rate_applied_pct = 12.5
                current_tax = round(gain * 0.125, 2)
        else:
            current_tax = 0.0

    total_cost_now = round(current_tax + exit_load_amount, 2)
    net_inhand_now = round(current_value_val - total_cost_now, 2)

    # --- 3. Projected Cost If Wait (LTCG Window) ---
    if is_short_term:
        # Days remaining until it becomes long-term (365 - holding_period_days for equity)
        days_to_ltcg_window = max(0, threshold_days - holding_days)
        projected_exit_load_if_wait = 0.0  # Exit load is typically 0% once in LTCG window
        
        if is_equity:
            if is_gain:
                # Recompute using LTCG rate for the same gain, assuming value doesn't change
                proj_taxable = max(0.0, gain - EQUITY_LTCG_EXEMPTION_INR)
                projected_tax_if_wait = round(proj_taxable * (EQUITY_LTCG_RATE_PCT / 100.0), 2)
            else:
                projected_tax_if_wait = 0.0
        else:
            if is_gain:
                projected_tax_if_wait = round(gain * 0.125, 2)
            else:
                projected_tax_if_wait = 0.0
        
        total_cost_if_wait = round(projected_tax_if_wait + projected_exit_load_if_wait, 2)
        net_inhand_if_wait = round(current_value_val - total_cost_if_wait, 2)
        potential_savings = max(0.0, round(total_cost_now - total_cost_if_wait, 2))
    else:
        days_to_ltcg_window = None
        projected_tax_if_wait = current_tax
        projected_exit_load_if_wait = exit_load_amount
        total_cost_if_wait = total_cost_now
        net_inhand_if_wait = net_inhand_now
        potential_savings = 0.0

    # --- 4. Recommendation Formulation ---
    # "Exit Now" or "Hold" based on whichever total_cost is lower
    if is_short_term and total_cost_if_wait < total_cost_now:
        recommendation = "Hold"
        recommendation_summary = f"Hold — wait {days_to_ltcg_window} more days, save ₹{int(round(potential_savings)):,}"
    elif is_short_term and total_cost_now <= total_cost_if_wait:
        recommendation = "Exit Now"
        recommendation_summary = "Exit Now — Waiting for the LTCG window provides ₹0 net savings under current capital gains exemption limits."
    else:
        recommendation = "Exit Now"
        recommendation_summary = "Exit Now — Already in the optimal LTCG window; 0% exit load applies."

    return ExitAnalysisResponse(
        investment_type="Equity Fund" if is_equity else "Debt Fund",
        fund_category=req.fund_category or ("Equity: General" if is_equity else "Debt: General"),
        amount_invested=amount_invested_val,
        current_value=current_value_val,
        holding_period_days=holding_days,
        gain=gain,
        gain_pct=gain_pct,
        is_gain=is_gain,
        tax_type=tax_type,
        holding_status=holding_status,
        tax_rate_applied_pct=tax_rate_applied_pct,
        current_tax=current_tax,
        ltcg_exemption_applied=ltcg_exemption_applied,
        exit_load_pct=applied_exit_load_pct,
        exit_load_amount=exit_load_amount,
        total_cost_now=total_cost_now,
        net_inhand_now=net_inhand_now,
        days_to_ltcg_window=days_to_ltcg_window,
        projected_tax_if_wait=projected_tax_if_wait,
        projected_exit_load_if_wait=projected_exit_load_if_wait,
        total_cost_if_wait=total_cost_if_wait,
        net_inhand_if_wait=net_inhand_if_wait,
        potential_savings=potential_savings,
        recommendation=recommendation,
        recommendation_summary=recommendation_summary,
        assumption_notes=assumption_notes,
        rule_flags=rule_flags
    )
