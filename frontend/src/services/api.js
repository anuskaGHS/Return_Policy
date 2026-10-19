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

export async function analyzeExitTax(payload) {
  const res = await fetch(`${API_BASE_URL}/exit-analysis`, {
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


export function calculateLocalExitAnalysis(inputs) {
  const amount_invested = Number(inputs.amount_invested) || 0;
  const current_value = Number(inputs.current_value) || 0;
  const holding_period_days = Number(inputs.holding_period_days) || 0;
  const investment_type = inputs.investment_type || "Equity Fund";
  const fund_category = inputs.fund_category || (investment_type === "Equity Fund" ? "Equity: General" : "Debt: General");
  const is_equity = investment_type.toLowerCase().includes("equity");

  const gain = Math.round((current_value - amount_invested) * 100) / 100;
  const gain_pct = amount_invested > 0 ? Math.round((gain / amount_invested * 100) * 100) / 100 : 0;
  const is_gain = gain > 0;

  const threshold_days = is_equity ? 365 : 1095;
  const is_short_term = holding_period_days <= threshold_days;
  const tax_type = is_short_term ? "STCG" : "LTCG";
  const holding_status = is_short_term ? "Short-Term" : "Long-Term";

  let exit_load_pct = inputs.exit_load_pct !== undefined && inputs.exit_load_pct !== null && inputs.exit_load_pct !== ""
    ? Math.max(0, Number(inputs.exit_load_pct))
    : (is_equity ? (holding_period_days < 365 ? 1.0 : 0.0) : (holding_period_days <= 30 ? 0.25 : 0.0));

  const exit_load_amount = Math.round(current_value * (exit_load_pct / 100) * 100) / 100;

  let current_tax = 0;
  let tax_rate_applied_pct = 0;
  let ltcg_exemption_applied = 0;

  if (is_equity) {
    if (is_short_term) {
      tax_rate_applied_pct = 20.0;
      current_tax = is_gain ? Math.round(gain * 0.20 * 100) / 100 : 0;
    } else {
      tax_rate_applied_pct = 12.5;
      if (is_gain) {
        const taxable = Math.max(0, gain - 125000);
        ltcg_exemption_applied = Math.min(gain, 125000);
        current_tax = Math.round(taxable * 0.125 * 100) / 100;
      }
    }
  } else {
    const slab_rate = Number(inputs.applicable_slab_rate_pct) || 30.0;
    tax_rate_applied_pct = is_short_term ? slab_rate : 12.5;
    if (is_gain) {
      current_tax = is_short_term ? Math.round(gain * (slab_rate / 100) * 100) / 100 : Math.round(gain * 0.125 * 100) / 100;
    }
  }

  const total_cost_now = Math.round((current_tax + exit_load_amount) * 100) / 100;
  const net_inhand_now = Math.round((current_value - total_cost_now) * 100) / 100;

  let days_to_ltcg_window = null;
  let projected_tax_if_wait = current_tax;
  let projected_exit_load_if_wait = exit_load_amount;
  let total_cost_if_wait = total_cost_now;
  let net_inhand_if_wait = net_inhand_now;
  let potential_savings = 0;

  if (is_short_term) {
    days_to_ltcg_window = Math.max(0, threshold_days - holding_period_days);
    projected_exit_load_if_wait = 0.0;

    if (is_equity) {
      if (is_gain) {
        const proj_taxable = Math.max(0, gain - 125000);
        projected_tax_if_wait = Math.round(proj_taxable * 0.125 * 100) / 100;
      } else {
        projected_tax_if_wait = 0.0;
      }
    } else {
      projected_tax_if_wait = is_gain ? Math.round(gain * 0.125 * 100) / 100 : 0.0;
    }

    total_cost_if_wait = Math.round((projected_tax_if_wait + projected_exit_load_if_wait) * 100) / 100;
    net_inhand_if_wait = Math.round((current_value - total_cost_if_wait) * 100) / 100;
    potential_savings = Math.max(0, Math.round((total_cost_now - total_cost_if_wait) * 100) / 100);
  }

  let recommendation = "Exit Now";
  let recommendation_summary = "Exit Now — Already in the optimal LTCG window; 0% exit load applies.";

  if (is_short_term && total_cost_if_wait < total_cost_now) {
    recommendation = "Hold";
    recommendation_summary = `Hold — wait ${days_to_ltcg_window} more days, save ₹${Math.round(potential_savings).toLocaleString('en-IN')}`;
  } else if (is_short_term) {
    recommendation = "Exit Now";
    recommendation_summary = "Exit Now — Waiting for the LTCG window provides ₹0 net savings under current capital gains exemption limits.";
  }

  return {
    investment_type,
    fund_category,
    amount_invested,
    current_value,
    holding_period_days,
    gain,
    gain_pct,
    is_gain,
    tax_type,
    holding_status,
    tax_rate_applied_pct,
    current_tax,
    ltcg_exemption_applied,
    exit_load_pct,
    exit_load_amount,
    total_cost_now,
    net_inhand_now,
    days_to_ltcg_window,
    projected_tax_if_wait,
    projected_exit_load_if_wait,
    total_cost_if_wait,
    net_inhand_if_wait,
    potential_savings,
    recommendation,
    recommendation_summary,
    assumption_notes: [
      "Projected tax assuming portfolio value stays flat (market returns will fluctuate).",
      is_equity
        ? "Equity Taxation reflects Budget 2024 rules: STCG @ 20% (Sec 111A), LTCG @ 12.5% above ₹1,25,000 exemption (Sec 112A)."
        : "Debt fund taxation under Section 50AA."
    ],
    rule_flags: [
      "Exit Load Rule Note: Exit load is assumed at 1.0% (<365 days for equity funds) for illustrative purposes. Exact exit load rules vary by fund and AMC and should be verified against actual SEBI/AMFI scheme documents (SID/KIM)."
    ]
  };
}

