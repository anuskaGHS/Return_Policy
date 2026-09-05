const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
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

/**
 * Instant client-side deterministic calculation for zero-latency UI preview
 * while the server AI assessment request is in flight.
 */
export function calculateInstantPreview(inputs) {
  const { monthly_sip, loan_emi, loan_interest_rate, annual_income } = inputs;
  const monthly_income = annual_income / 12;
  const emi_to_income_ratio_pct = (loan_emi / monthly_income) * 100;
  const sip_to_income_ratio_pct = (monthly_sip / monthly_income) * 100;

  // 12% CAGR 5-Year SIP compounding formula
  const r = 0.12 / 12;
  const n = 60;
  const compounding_factor = (Math.pow(1 + r, n) - 1) / r;
  const five_year_sip_projected_wealth = monthly_sip * compounding_factor * (1 + r);
  const five_year_sip_invested = monthly_sip * 60;
  const five_year_sip_estimated_returns = five_year_sip_projected_wealth - five_year_sip_invested;
  const annual_interest_burden_est = loan_emi * 12 * (loan_interest_rate / 100);

  let debt_risk_category = "Healthy (<30%)";
  if (emi_to_income_ratio_pct > 45) {
    debt_risk_category = "High Risk / Overleveraged (>45%)";
  } else if (emi_to_income_ratio_pct >= 30) {
    debt_risk_category = "Moderate (30-45%)";
  }

  return {
    monthly_income,
    emi_to_income_ratio_pct,
    sip_to_income_ratio_pct,
    five_year_sip_invested,
    five_year_sip_projected_wealth,
    five_year_sip_estimated_returns,
    annual_interest_burden_est,
    debt_risk_category
  };
}
