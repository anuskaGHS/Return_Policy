"""
Smart Exit & Hold Tax Advisor Service
Computes deterministic capital gains tax, exit load obligations,
and breakeven holding recommendations for Indian mutual fund investors.
"""

import math
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any

from app.models.policy import ExitAnalysisRequest, ExitAnalysisResponse, LockIn

EQUITY_SHORT_TERM_DAYS = 365  # held 365 days or fewer = short term (STCG)
EQUITY_STCG_PCT = 20.0
LTCG_PCT = 12.5  # equity above the exemption; debt (bought before 1 Apr 2023) after 24 months
EQUITY_LTCG_EXEMPTION = 125000.0  # per financial year
DEBT_LONG_TERM_DAYS = 730  # 24 months, only for debt units bought before 1 Apr 2023
DEBT_RULE_START_DATE = date(2023, 4, 1)  # 1 April 2023
ELSS_LOCK_YEARS = 3
ELSS_LOCK_APPROX_DAYS = 1095  # only used to price "what selling would cost once it unlocks"
DEFAULT_EQUITY_EXIT_LOAD_PCT = 1.0  # ASSUMPTION, not a rule: funds set their own
DEFAULT_INTEREST_RATE_PCT = 6.25  # SBI, deposits of 1 to under 2 years, since 15 Dec 2025

# Backward compatibility aliases for existing services
EQUITY_LTCG_RATE_PCT = LTCG_PCT
EQUITY_LTCG_EXEMPTION_INR = EQUITY_LTCG_EXEMPTION


def js_round(x: float) -> int:
    """Replicates JavaScript Math.round (halves round toward positive infinity)."""
    return math.floor(x + 0.5)


def round2(n: float) -> float:
    """Rounds to 2 decimal places using JS rounding rules."""
    return js_round(n * 100) / 100


def to_fixed_1(x: float) -> float:
    """Replicates JS toFixed(1) using exact binary floating-point representation."""
    return float(Decimal(x).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def days_since_debt_rule_start(now: Optional[date] = None) -> int:
    """Days between 1 April 2023 and today. A debt fund held for more days than this was bought before 1 April 2023."""
    today = now or date.today()
    return (today - DEBT_RULE_START_DATE).days


def elss_lock_status(holding_period_days: int, now: Optional[date] = None) -> Dict[str, Any]:
    """
    ELSS lock-in: 3 years from the date of allotment, counted to the third anniversary.
    Purchase = today - timedelta(days=holding_days).
    Unlock = same day and month 3 years later; if 29 Feb, rollover to 1 March.
    """
    today = now or date.today()
    days = max(0, int(holding_period_days or 0))
    purchase = today - timedelta(days=days)
    try:
        unlock = date(purchase.year + ELSS_LOCK_YEARS, purchase.month, purchase.day)
    except ValueError:
        # Rollover 29 Feb in leap year to 1 March
        unlock = date(purchase.year + ELSS_LOCK_YEARS, 3, 1)

    days_left = (unlock - today).days
    return {
        "locked": days_left > 0,
        "days_left": max(0, days_left),
        "unlock_date": unlock.isoformat()
    }


def validate_exit_inputs(inputs: Any = None) -> Dict[str, Any]:
    """
    Both amounts are needed before any verdict. Invested must be above 0; Worth Today may be 0
    (a total loss is a valid answer). There is no upper limit on either amount.
    Returns { valid, missing: ["amount_invested" | "current_value"], message }.
    """
    if inputs is None:
        data = {}
    elif hasattr(inputs, "model_dump"):
        data = inputs.model_dump()
    elif isinstance(inputs, dict):
        data = inputs
    elif hasattr(inputs, "__dict__"):
        data = vars(inputs)
    else:
        data = {}

    def is_blank(v):
        return v is None or (isinstance(v, str) and v.strip() == "")

    missing = []
    inv_val = data.get("amount_invested")
    cur_val = data.get("current_value")

    if is_blank(inv_val):
        missing.append("amount_invested")
    else:
        try:
            inv = float(inv_val)
            if not math.isfinite(inv) or not (inv > 0):
                missing.append("amount_invested")
        except (ValueError, TypeError):
            missing.append("amount_invested")

    if is_blank(cur_val):
        missing.append("current_value")
    else:
        try:
            cur = float(cur_val)
            if not math.isfinite(cur) or cur < 0:
                missing.append("current_value")
        except (ValueError, TypeError):
            missing.append("current_value")

    message = ""
    if len(missing) == 2:
        message = "Enter what you invested and what it is worth today."
    elif len(missing) == 1:
        if missing[0] == "amount_invested":
            message = "Enter what you invested."
        elif missing[0] == "current_value":
            message = "Enter what it is worth today."

    return {
        "valid": len(missing) == 0,
        "missing": missing,
        "message": message
    }


def tax_at_day(inputs: Dict[str, Any], days: int, debt_cutoff_days: int) -> Dict[str, Any]:
    """Tax and exit load if the units are sold after `days` days. No waiting logic here."""
    amount_invested = float(inputs.get("amount_invested") or 0.0)
    current_value = float(inputs.get("current_value") or 0.0)
    investment_type = inputs.get("investment_type") or "Equity Fund"
    is_equity = "equity" in investment_type.lower()

    gain = round2(current_value - amount_invested)
    gain_pct = round2((gain / amount_invested) * 100) if amount_invested > 0 else 0.0
    is_gain = gain > 0

    # Debt: bought on or after 1 Apr 2023 is always taxed at the slab rate. Bought before: 12.5% after 24 months.
    bought_before_apr_2023 = (not is_equity) and (days > debt_cutoff_days)
    is_short_term = days <= EQUITY_SHORT_TERM_DAYS if is_equity else ((not bought_before_apr_2023) or (days <= DEBT_LONG_TERM_DAYS))

    raw_load = inputs.get("exit_load_pct")
    user_exit_load = raw_load is not None and raw_load != ""
    if user_exit_load:
        exit_load_pct = max(0.0, float(raw_load))
    else:
        exit_load_pct = DEFAULT_EQUITY_EXIT_LOAD_PCT if (is_equity and days < EQUITY_SHORT_TERM_DAYS) else 0.0
    exit_load_amount = round2(current_value * (exit_load_pct / 100.0))

    current_tax = 0.0
    tax_rate_applied_pct = 0.0
    ltcg_exemption_applied = 0.0

    if is_equity:
        if is_short_term:
            tax_rate_applied_pct = float(EQUITY_STCG_PCT)
            current_tax = round2(gain * (EQUITY_STCG_PCT / 100.0)) if is_gain else 0.0
        else:
            tax_rate_applied_pct = float(LTCG_PCT)
            if is_gain:
                taxable = max(0.0, gain - EQUITY_LTCG_EXEMPTION)
                ltcg_exemption_applied = min(gain, float(EQUITY_LTCG_EXEMPTION))
                current_tax = round2(taxable * (LTCG_PCT / 100.0))
    else:
        raw_slab = inputs.get("applicable_slab_rate_pct")
        slab_rate = float(raw_slab) if (raw_slab is not None and raw_slab != "" and float(raw_slab) != 0) else 30.0
        tax_rate_applied_pct = float(slab_rate) if is_short_term else float(LTCG_PCT)
        if is_gain:
            current_tax = round2(gain * (tax_rate_applied_pct / 100.0))

    total_cost_now = round2(current_tax + exit_load_amount)
    net_inhand_now = round2(current_value - total_cost_now)

    # Waiting only helps equity that is still short term: after the gate the load goes and the tax drops to LTCG.
    days_to_ltcg_window = None
    projected_tax_if_wait = current_tax
    projected_exit_load_if_wait = exit_load_amount
    total_cost_if_wait = total_cost_now
    net_inhand_if_wait = net_inhand_now
    potential_savings = 0.0

    if is_equity and is_short_term:
        days_to_ltcg_window = max(0, EQUITY_SHORT_TERM_DAYS + 1 - days)
        projected_exit_load_if_wait = 0.0
        projected_tax_if_wait = round2(max(0.0, gain - EQUITY_LTCG_EXEMPTION) * (LTCG_PCT / 100.0)) if is_gain else 0.0
        total_cost_if_wait = round2(projected_tax_if_wait + projected_exit_load_if_wait)
        net_inhand_if_wait = round2(current_value - total_cost_if_wait)
        potential_savings = max(0.0, round2(total_cost_now - total_cost_if_wait))

    tax_only_recommendation = "Hold" if (is_short_term and total_cost_if_wait < total_cost_now) else "Exit Now"

    return {
        "gain": gain,
        "gain_pct": gain_pct,
        "is_gain": is_gain,
        "is_equity": is_equity,
        "is_short_term": is_short_term,
        "bought_before_apr_2023": bought_before_apr_2023,
        "tax_type": "STCG" if is_short_term else "LTCG",
        "holding_status": "Short-Term" if is_short_term else "Long-Term",
        "tax_rate_applied_pct": tax_rate_applied_pct,
        "current_tax": current_tax,
        "ltcg_exemption_applied": ltcg_exemption_applied,
        "exit_load_pct": exit_load_pct,
        "exit_load_amount": exit_load_amount,
        "exit_load_is_assumed": not user_exit_load,
        "total_cost_now": total_cost_now,
        "net_inhand_now": net_inhand_now,
        "days_to_ltcg_window": days_to_ltcg_window,
        "projected_tax_if_wait": projected_tax_if_wait,
        "projected_exit_load_if_wait": projected_exit_load_if_wait,
        "total_cost_if_wait": total_cost_if_wait,
        "net_inhand_if_wait": net_inhand_if_wait,
        "potential_savings": potential_savings,
        "tax_only_recommendation": tax_only_recommendation
    }


def calculate_exit_analysis(
    req: ExitAnalysisRequest,
    today: Optional[date] = None
) -> ExitAnalysisResponse:
    """
    Evaluates whether an investor should exit now, hold until the LTCG window opens, or wait for ELSS lock-in.
    Pure deterministic rules calculation.
    """
    now = today or date.today()

    data = req.model_dump() if hasattr(req, "model_dump") else (req if isinstance(req, dict) else vars(req))
    check = validate_exit_inputs(data)
    if not check["valid"]:
        raise ValueError(check["message"])

    investment_type = data.get("investment_type") or "Equity Fund"
    fund_category = data.get("fund_category") or ("Equity: General" if investment_type == "Equity Fund" else "Debt: General")
    holding_period_days = max(0, int(data.get("holding_period_days") or 0))
    is_equity = "equity" in investment_type.lower()
    is_elss = is_equity and ("ELSS" in fund_category)

    debt_cutoff_days = days_since_debt_rule_start(now)
    base = tax_at_day(data, holding_period_days, debt_cutoff_days)

    # Opportunity cost: the money you would get today, earning simple interest elsewhere while you wait.
    raw_rate = data.get("interest_rate_pct")
    if raw_rate is None or raw_rate == "":
        interest_rate_pct = DEFAULT_INTEREST_RATE_PCT
    else:
        interest_rate_pct = float(raw_rate) if float(raw_rate) >= 0 else 0.0

    tax_hold = base["tax_only_recommendation"] == "Hold"
    wait_days = max(1, base["days_to_ltcg_window"] or 0)
    interest_elsewhere = js_round(base["net_inhand_now"] * interest_rate_pct / 100 * wait_days / 365) if tax_hold else 0
    net_wait = base["potential_savings"] - interest_elsewhere
    hold = tax_hold and (net_wait >= 1)

    # ELSS: nothing can be sold until the lock-in ends.
    lock = elss_lock_status(holding_period_days, now) if is_elss else None
    locked = bool(lock and lock["locked"])
    lock_in_obj: Optional[LockIn] = None
    if is_elss:
        after = tax_at_day(data, ELSS_LOCK_APPROX_DAYS, debt_cutoff_days)
        lock_in_obj = LockIn(
            locked=locked,
            days_left=lock["days_left"],
            unlock_date=lock["unlock_date"],
            cost_when_unlocked=after["total_cost_now"],
            net_when_unlocked=after["net_inhand_now"]
        )

    recommendation = "Locked" if locked else ("Hold" if hold else "Exit Now")
    better_pick = None if locked else ("wait" if hold else "sell")

    current_val = float(data["current_value"])
    fall_limit_amount = net_wait if hold else None
    fall_limit_pct = to_fixed_1((net_wait / current_val) * 100) if (hold and current_val > 0) else None

    # Plain English recommendation summary sentence
    if locked:
        recommendation_summary = "ELSS units are locked in."
    elif hold:
        recommendation_summary = f"Hold — wait {wait_days} more days to save in tax and exit load."
    else:
        recommendation_summary = "Exit now."

    return ExitAnalysisResponse(
        valid=True,
        investment_type=investment_type,
        fund_category=fund_category,
        amount_invested=float(data["amount_invested"]),
        current_value=current_val,
        holding_period_days=holding_period_days,
        gain=base["gain"],
        gain_pct=base["gain_pct"],
        is_gain=base["is_gain"],
        tax_type=base["tax_type"],
        holding_status=base["holding_status"],
        tax_rate_applied_pct=base["tax_rate_applied_pct"],
        current_tax=base["current_tax"],
        ltcg_exemption_applied=base["ltcg_exemption_applied"],
        exit_load_pct=base["exit_load_pct"],
        exit_load_amount=base["exit_load_amount"],
        exit_load_is_assumed=base["exit_load_is_assumed"],
        total_cost_now=base["total_cost_now"],
        net_inhand_now=base["net_inhand_now"],
        bought_before_apr_2023=base["bought_before_apr_2023"],
        days_to_ltcg_window=base["days_to_ltcg_window"],
        projected_tax_if_wait=base["projected_tax_if_wait"],
        projected_exit_load_if_wait=base["projected_exit_load_if_wait"],
        total_cost_if_wait=base["total_cost_if_wait"],
        net_inhand_if_wait=base["net_inhand_if_wait"],
        potential_savings=base["potential_savings"],
        tax_only_recommendation=base["tax_only_recommendation"],
        interest_rate_pct=interest_rate_pct,
        wait_days=wait_days if tax_hold else None,
        interest_elsewhere=interest_elsewhere,
        have_after_sell_today=round2(base["net_inhand_now"] + interest_elsewhere) if tax_hold else None,
        have_after_waiting=base["net_inhand_if_wait"] if tax_hold else None,
        net_advantage_of_waiting=net_wait if tax_hold else None,
        fall_limit_amount=fall_limit_amount,
        fall_limit_pct=fall_limit_pct,
        recommendation=recommendation,
        better_pick=better_pick,
        lock_in=lock_in_obj,
        recommendation_summary=recommendation_summary,
        assumption_notes=[],
        rule_flags=[]
    )
