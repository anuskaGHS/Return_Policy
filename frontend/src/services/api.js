const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "offline", groq_configured: false, error: err.message };
  }
}

export async function simulatePolicy(payload) {
  const res = await fetch(`${API_BASE_URL}/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }

  return await res.json();
}

// Call this only when the user presses "Get my exit advice". The live numbers on the
// page come from calculateLocalExitAnalysis() below, which is free and instant.
export async function analyzeExitTax(payload) {
  const check = validateExitInputs(payload);
  if (!check.valid) throw new Error(check.message);

  const res = await fetch(`${API_BASE_URL}/exit-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }

  return await res.json();
}

/* ------------------------------------------------------------------ */
/* Smart Exit & Hold Tax Advisor: rules                                */
/* The page and the backend must follow exactly these rules.           */
/* ------------------------------------------------------------------ */

const DAY_MS = 86400000;
const EQUITY_SHORT_TERM_DAYS = 365;        // held 365 days or fewer = short term (STCG)
const EQUITY_STCG_PCT = 20;
const LTCG_PCT = 12.5;                     // equity above the exemption; debt (bought before 1 Apr 2023) after 24 months
const EQUITY_LTCG_EXEMPTION = 125000;      // per financial year
const DEBT_LONG_TERM_DAYS = 730;           // 24 months, only for debt units bought before 1 Apr 2023
const DEBT_RULE_START_UTC = Date.UTC(2023, 3, 1); // 1 April 2023
const ELSS_LOCK_YEARS = 3;
const ELSS_LOCK_APPROX_DAYS = 1095;        // only used to price "what selling would cost once it unlocks"
const DEFAULT_EQUITY_EXIT_LOAD_PCT = 1.0;  // ASSUMPTION, not a rule: funds set their own
export const DEFAULT_INTEREST_RATE_PCT = 6.25; // SBI, deposits of 1 to under 2 years, since 15 Dec 2025

const round2 = (n) => Math.round(n * 100) / 100;
const inr = (n) => "₹" + Math.round(Math.abs(Number(n) || 0)).toLocaleString("en-IN");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2028-09-16" -> "16 Sep 2028" (the format the page shows) */
const dateEn = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS_EN[m - 1]} ${y}`; };

/** Days between 1 April 2023 and today. A debt fund held for more days than this was bought before 1 April 2023. */
export function daysSinceDebtRuleStart(now = new Date()) {
  return Math.floor((now.getTime() - DEBT_RULE_START_UTC) / DAY_MS);
}

/**
 * ELSS lock-in: 3 years from the date of allotment, counted to the third anniversary.
 * `holding_period_days` must be counted from the ALLOTMENT date on the fund statement.
 * For a SIP, every instalment has its own lock-in, so pass the latest instalment's days.
 * Unverified: whether units can be sold ON the anniversary or only the day after.
 */
export function elssLockStatus(holdingPeriodDays, now = new Date()) {
  const days = Math.max(0, Number(holdingPeriodDays) || 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const purchase = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  const unlock = new Date(purchase.getFullYear() + ELSS_LOCK_YEARS, purchase.getMonth(), purchase.getDate());
  const daysLeft = Math.round((unlock.getTime() - today.getTime()) / DAY_MS);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    locked: daysLeft > 0,
    days_left: Math.max(0, daysLeft),
    unlock_date: `${unlock.getFullYear()}-${pad(unlock.getMonth() + 1)}-${pad(unlock.getDate())}`
  };
}

/**
 * Both amounts are needed before any verdict. Invested must be above 0; Worth Today may be 0
 * (a total loss is a valid answer). There is no upper limit on either amount.
 * Returns { valid, missing: ["amount_invested" | "current_value"], message }.
 */
export function validateExitInputs(inputs = {}) {
  const blank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  const missing = [];
  const inv = Number(inputs.amount_invested);
  const cur = Number(inputs.current_value);
  if (blank(inputs.amount_invested) || !Number.isFinite(inv) || !(inv > 0)) missing.push("amount_invested");
  if (blank(inputs.current_value) || !Number.isFinite(cur) || cur < 0) missing.push("current_value");

  let message = "";
  if (missing.length === 2) message = "Enter what you invested and what it is worth today.";
  else if (missing[0] === "amount_invested") message = "Enter what you invested.";
  else if (missing[0] === "current_value") message = "Enter what it is worth today.";
  return { valid: missing.length === 0, missing, message };
}

/** Tax and exit load if the units are sold after `days` days. No waiting logic here. */
function taxAtDay(inputs, days) {
  const amount_invested = Number(inputs.amount_invested) || 0;
  const current_value = Number(inputs.current_value) || 0;
  const investment_type = inputs.investment_type || "Equity Fund";
  const is_equity = investment_type.toLowerCase().includes("equity");

  const gain = round2(current_value - amount_invested);
  const gain_pct = amount_invested > 0 ? round2((gain / amount_invested) * 100) : 0;
  const is_gain = gain > 0;

  // Debt: bought on or after 1 Apr 2023 is always taxed at the slab rate. Bought before: 12.5% after 24 months.
  const bought_before_apr_2023 = !is_equity && days > (inputs._debtCutoffDays ?? 0);
  const is_short_term = is_equity
    ? days <= EQUITY_SHORT_TERM_DAYS
    : (!bought_before_apr_2023 || days <= DEBT_LONG_TERM_DAYS);

  const user_exit_load =
    inputs.exit_load_pct !== undefined && inputs.exit_load_pct !== null && inputs.exit_load_pct !== "";
  const exit_load_pct = user_exit_load
    ? Math.max(0, Number(inputs.exit_load_pct))
    : (is_equity ? (days < EQUITY_SHORT_TERM_DAYS ? DEFAULT_EQUITY_EXIT_LOAD_PCT : 0) : 0);
  const exit_load_amount = round2(current_value * (exit_load_pct / 100));

  let current_tax = 0;
  let tax_rate_applied_pct = 0;
  let ltcg_exemption_applied = 0;

  if (is_equity) {
    if (is_short_term) {
      tax_rate_applied_pct = EQUITY_STCG_PCT;
      current_tax = is_gain ? round2(gain * (EQUITY_STCG_PCT / 100)) : 0;
    } else {
      tax_rate_applied_pct = LTCG_PCT;
      if (is_gain) {
        const taxable = Math.max(0, gain - EQUITY_LTCG_EXEMPTION);
        ltcg_exemption_applied = Math.min(gain, EQUITY_LTCG_EXEMPTION);
        current_tax = round2(taxable * (LTCG_PCT / 100));
      }
    }
  } else {
    const slab_rate = Number(inputs.applicable_slab_rate_pct) || 30.0;
    tax_rate_applied_pct = is_short_term ? slab_rate : LTCG_PCT;
    if (is_gain) current_tax = round2(gain * (tax_rate_applied_pct / 100));
  }

  const total_cost_now = round2(current_tax + exit_load_amount);
  const net_inhand_now = round2(current_value - total_cost_now);

  // Waiting only helps equity that is still short term: after the gate the load goes and the tax drops to LTCG.
  let days_to_ltcg_window = null;
  let projected_tax_if_wait = current_tax;
  let projected_exit_load_if_wait = exit_load_amount;
  let total_cost_if_wait = total_cost_now;
  let net_inhand_if_wait = net_inhand_now;
  let potential_savings = 0;

  if (is_equity && is_short_term) {
    days_to_ltcg_window = Math.max(0, EQUITY_SHORT_TERM_DAYS + 1 - days);
    projected_exit_load_if_wait = 0.0;
    projected_tax_if_wait = is_gain ? round2(Math.max(0, gain - EQUITY_LTCG_EXEMPTION) * (LTCG_PCT / 100)) : 0.0;
    total_cost_if_wait = round2(projected_tax_if_wait + projected_exit_load_if_wait);
    net_inhand_if_wait = round2(current_value - total_cost_if_wait);
    potential_savings = Math.max(0, round2(total_cost_now - total_cost_if_wait));
  }

  const tax_only_recommendation = is_short_term && total_cost_if_wait < total_cost_now ? "Hold" : "Exit Now";

  return {
    gain, gain_pct, is_gain, is_equity, is_short_term, bought_before_apr_2023,
    tax_type: is_short_term ? "STCG" : "LTCG",
    holding_status: is_short_term ? "Short-Term" : "Long-Term",
    tax_rate_applied_pct, current_tax, ltcg_exemption_applied,
    exit_load_pct, exit_load_amount, exit_load_is_assumed: !user_exit_load,
    total_cost_now, net_inhand_now, days_to_ltcg_window,
    projected_tax_if_wait, projected_exit_load_if_wait, total_cost_if_wait, net_inhand_if_wait,
    potential_savings, tax_only_recommendation
  };
}

/**
 * The full Smart Exit analysis. Pure maths, no AI, no network: call it on every keystroke.
 *
 * inputs: {
 *   investment_type: "Equity Fund" | "Debt Fund",
 *   fund_category: e.g. "Equity: ELSS (Tax Saver - 3yr lock)",
 *   amount_invested, current_value,           // both required (see validateExitInputs)
 *   holding_period_days,                      // from the purchase (ELSS: allotment) date
 *   exit_load_pct,                            // optional; blank = assumed (equity 1% under a year, debt 0%)
 *   applicable_slab_rate_pct,                 // debt only; default 30
 *   interest_rate_pct                         // optional; blank/undefined = 6.25; 0 = ignore
 * }
 * If an amount is missing it returns { valid: false, missing, message } and nothing else.
 */
export function calculateLocalExitAnalysis(inputs = {}, now = new Date()) {
  const check = validateExitInputs(inputs);
  if (!check.valid) return { valid: false, missing: check.missing, message: check.message };

  const investment_type = inputs.investment_type || "Equity Fund";
  const fund_category = inputs.fund_category || (investment_type === "Equity Fund" ? "Equity: General" : "Debt: General");
  const holding_period_days = Math.max(0, Number(inputs.holding_period_days) || 0);
  const is_equity = investment_type.toLowerCase().includes("equity");
  const is_elss = is_equity && fund_category.includes("ELSS");

  const withCutoff = { ...inputs, _debtCutoffDays: daysSinceDebtRuleStart(now) };
  const base = taxAtDay(withCutoff, holding_period_days);

  // Opportunity cost: the money you would get today, earning simple interest elsewhere while you wait.
  const rawRate = inputs.interest_rate_pct;
  const interest_rate_pct = rawRate === undefined || rawRate === null
    ? DEFAULT_INTEREST_RATE_PCT
    : (Number(rawRate) >= 0 ? Number(rawRate) : 0);
  const taxHold = base.tax_only_recommendation === "Hold";
  const wait_days = Math.max(1, base.days_to_ltcg_window || 0);
  const interest_elsewhere = taxHold ? Math.round(base.net_inhand_now * interest_rate_pct / 100 * wait_days / 365) : 0;
  const netWait = base.potential_savings - interest_elsewhere;
  const hold = taxHold && netWait >= 1;
  const flip = taxHold && !hold;

  // ELSS: nothing can be sold until the lock-in ends.
  const lock = is_elss ? elssLockStatus(holding_period_days, now) : null;
  const locked = !!(lock && lock.locked);
  let lock_in = null;
  if (is_elss) {
    const after = taxAtDay(withCutoff, ELSS_LOCK_APPROX_DAYS);
    lock_in = {
      locked,
      days_left: lock.days_left,
      unlock_date: lock.unlock_date,
      cost_when_unlocked: after.total_cost_now,
      net_when_unlocked: after.net_inhand_now
    };
  }

  const recommendation = locked ? "Locked" : (hold ? "Hold" : "Exit Now");
  const better_pick = locked ? null : (hold ? "wait" : "sell");

  const result = {
    valid: true,
    investment_type,
    fund_category,
    amount_invested: Number(inputs.amount_invested),
    current_value: Number(inputs.current_value),
    holding_period_days,
    gain: base.gain,
    gain_pct: base.gain_pct,
    is_gain: base.is_gain,
    tax_type: base.tax_type,
    holding_status: base.holding_status,
    tax_rate_applied_pct: base.tax_rate_applied_pct,
    current_tax: base.current_tax,
    ltcg_exemption_applied: base.ltcg_exemption_applied,
    exit_load_pct: base.exit_load_pct,
    exit_load_amount: base.exit_load_amount,
    exit_load_is_assumed: base.exit_load_is_assumed,
    total_cost_now: base.total_cost_now,
    net_inhand_now: base.net_inhand_now,
    bought_before_apr_2023: base.bought_before_apr_2023,
    days_to_ltcg_window: base.days_to_ltcg_window,
    projected_tax_if_wait: base.projected_tax_if_wait,
    projected_exit_load_if_wait: base.projected_exit_load_if_wait,
    total_cost_if_wait: base.total_cost_if_wait,
    net_inhand_if_wait: base.net_inhand_if_wait,
    potential_savings: base.potential_savings,          // tax and exit load saved by waiting, before interest
    tax_only_recommendation: base.tax_only_recommendation,

    // opportunity cost
    interest_rate_pct,
    wait_days: taxHold ? wait_days : null,
    interest_elsewhere,                                  // what the money could earn while you wait
    have_after_sell_today: taxHold ? round2(base.net_inhand_now + interest_elsewhere) : null,
    have_after_waiting: taxHold ? base.net_inhand_if_wait : null,
    net_advantage_of_waiting: taxHold ? netWait : null,  // negative = selling today comes out ahead
    fall_limit_amount: hold ? netWait : null,            // waiting still pays if the fund falls by less than this
    fall_limit_pct: hold && Number(inputs.current_value) > 0
      ? Number((netWait / Number(inputs.current_value) * 100).toFixed(1)) : null,

    // final call
    recommendation,                                      // "Hold" | "Exit Now" | "Locked"
    better_pick,                                         // "wait" | "sell" | null (locked)
    lock_in                                              // null unless the fund is an ELSS
  };

  result.recommendation_summary = buildSummary(result, { hold, flip, locked });
  result.fallback_explanation = buildFallbackExplanation(result, { hold, flip, locked });
  result.assumption_notes = buildAssumptionNotes(result, is_equity);
  result.rule_flags = buildRuleFlags(result, is_equity, is_elss);
  return result;
}

function buildSummary(r, { hold, flip, locked }) {
  const equity = r.investment_type.toLowerCase().includes("equity");
  if (locked) {
    return `Can't sell yet — ELSS units are locked in until ${dateEn(r.lock_in.unlock_date)} (${plural(r.lock_in.days_left, "more day")}).`;
  }
  if (hold) {
    return `Hold — wait ${plural(r.wait_days, "more day")}, save ${inr(r.potential_savings)} in tax and exit load` +
      (r.interest_elsewhere > 0 ? ` (${inr(r.net_advantage_of_waiting)} after interest you could earn elsewhere).` : ".");
  }
  if (flip) {
    return `Exit Now — waiting saves ${inr(r.potential_savings)} in tax and exit load, but the money you get today could earn about ${inr(r.interest_elsewhere)} elsewhere in ${plural(r.wait_days, "day")}.`;
  }
  if (!equity) return "Exit Now — waiting does not change the tax on a debt fund, so sell when you need the money.";
  if (r.tax_type === "STCG") return "Exit Now — waiting would not make this cheaper.";
  return `Exit Now — past day ${EQUITY_SHORT_TERM_DAYS}, the long-term rate applies and waiting will not make it cheaper.`;
}

/** Plain-words text from the numbers alone. The page shows it as the "Quick summary" and uses it if the AI cannot answer. */
function buildFallbackExplanation(r, { hold, flip, locked }) {
  const equity = r.investment_type.toLowerCase().includes("equity");
  const load = r.exit_load_amount;
  if (locked) {
    return `Your ELSS units are locked in for 3 years from purchase, so you cannot sell for ${plural(r.lock_in.days_left, "more day")}. ` +
      `You can sell from ${dateEn(r.lock_in.unlock_date)}. If your fund’s value stays flat, selling then costs ${inr(r.lock_in.cost_when_unlocked)} and you would receive ${inr(r.lock_in.net_when_unlocked)}.`;
  }
  if (!equity) {
    const why = r.bought_before_apr_2023
      ? "These units were bought before 1 April 2023, so gains are taxed at the 12.5% long-term rate."
      : "Debt fund units bought on or after 1 April 2023 are taxed at your slab rate, however long you hold them.";
    return `${why} If you sell today, you pay ${inr(r.current_tax)} in tax${load > 0 ? ` and ${inr(load)} in exit load` : ""}. Waiting will not change the tax. You would receive ${inr(r.net_inhand_now)}.`;
  }
  if (flip) {
    return `Waiting would save you ${inr(r.potential_savings)} in tax and exit load, but the ${inr(r.net_inhand_now)} you get today could earn about ${inr(r.interest_elsewhere)} elsewhere in ${plural(r.wait_days, "day")}. ` +
      `Selling today comes out ahead by ${inr(-r.net_advantage_of_waiting)}. This assumes your fund’s value stays flat.`;
  }
  if (hold) {
    const pt = r.projected_tax_if_wait;
    const reason = pt <= 0 && r.gain > 0 ? ", because your gain is within the ₹1.25L tax-free limit" : "";
    return `If you sell today, you pay ${inr(r.current_tax)} in ${r.tax_type} tax${load > 0 ? ` and ${inr(load)} in exit load` : ""}. ` +
      `If you wait ${plural(r.wait_days, "more day")}, ${load > 0 ? "the exit load goes away and " : ""}you pay ${pt > 0 ? `${inr(pt)} in long-term tax` : `no tax${reason}`}. ` +
      `That saves you ${inr(r.potential_savings)}.` +
      (r.interest_elsewhere > 0 ? ` Even after about ${inr(r.interest_elsewhere)} you could earn elsewhere in that time, waiting comes out ahead by ${inr(r.net_advantage_of_waiting)}.` : "") +
      " This assumes your fund’s value stays flat.";
  }
  if (r.tax_type === "STCG") {
    return `Waiting would not make this cheaper. Selling today costs ${inr(r.total_cost_now)}, and waiting costs ${inr(r.total_cost_if_wait)}. You would receive ${inr(r.net_inhand_now)}.`;
  }
  return `You are past day ${EQUITY_SHORT_TERM_DAYS}, so the ${r.tax_rate_applied_pct}% long-term rate applies. Selling now costs ${inr(r.total_cost_now)} in tax and exit load together. Waiting would not make it cheaper. You would receive ${inr(r.net_inhand_now)}.`;
}

function buildAssumptionNotes(r, is_equity) {
  const notes = [
    "Projected tax assumes your fund’s value stays flat. Real returns will move.",
    "Tax shown is before 4% cess and any surcharge.",
    "Tax rates are taken from published sources as of October 2026, not from the text of the Act. Confirm them on the Income Tax Department website (incometaxindia.gov.in) or with a tax professional."
  ];
  notes.push(is_equity
    ? "Equity funds: 20% on gains if held 12 months or less; 12.5% on gains above ₹1,25,000 a year if held longer."
    : "Debt funds: units bought on or after 1 April 2023 are taxed at your slab rate however long you hold them; units bought before that date at 12.5% after 24 months.");
  if (r.wait_days !== null) {
    notes.push(`Interest elsewhere is simple interest at ${r.interest_rate_pct}% a year on what you would receive today, before tax on that interest.`);
  }
  return notes;
}

function buildRuleFlags(r, is_equity, is_elss) {
  const flags = [];
  if (r.exit_load_is_assumed) {
    flags.push(is_equity
      ? "Exit load is our assumption (1% on a sale within a year), used only as an example. Each fund sets its own. Find yours under “Exit load” in the fund’s SID, KIM or factsheet, or enter it yourself."
      : "Exit load is assumed to be 0%, which is an assumption. Some debt funds charge one. Find yours under “Exit load” in the fund’s SID, KIM or factsheet, or enter it yourself.");
  }
  if (!is_equity) {
    flags.push("These debt rules apply to funds that put more than 65% of their money in debt and money market instruments. Hybrid, gold and international funds can be taxed differently. Check the SID or factsheet for the debt share.");
  }
  if (is_elss) {
    flags.push("ELSS lock-in is 3 years from the date of allotment on your statement. For a SIP, each instalment has its own lock-in, so use the latest instalment’s date to see when everything is free. Whether units can be sold on the anniversary itself or only the day after is not confirmed.");
  }
  return flags;
}
