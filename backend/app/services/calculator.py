from app.models.policy import SimulationRequest, DeterministicMetrics

def calculate_deterministic_metrics(req: SimulationRequest) -> DeterministicMetrics:
    """
    Computes deterministic personal financial indicators for Indian households:
    - Monthly Gross Income
    - EMI-to-Income Debt Ratio (%)
    - SIP-to-Income Savings Ratio (%)
    - 5-Year SIP Wealth Growth at flat 12% CAGR
    - Estimated Annual Interest Drag
    - Debt Risk Category
    """
    monthly_income = req.annual_income / 12.0
    
    # Ratios
    emi_to_income_pct = round((req.loan_emi / monthly_income) * 100.0, 2)
    sip_to_income_pct = round((req.monthly_sip / monthly_income) * 100.0, 2)

    # 5-Year SIP Compounding at 12% Annual CAGR
    # r = monthly interest rate = 0.12 / 12 = 0.01
    # n = 60 months
    # FV = P * [((1 + r)^n - 1) / r] * (1 + r)
    monthly_rate = 0.12 / 12.0
    total_months = 5 * 12  # 60
    compounding_factor = (((1.0 + monthly_rate) ** total_months) - 1.0) / monthly_rate
    five_year_projected_wealth = round(req.monthly_sip * compounding_factor * (1.0 + monthly_rate), 2)
    five_year_invested = round(req.monthly_sip * total_months, 2)
    five_year_returns = round(five_year_projected_wealth - five_year_invested, 2)

    # Approximate annual interest burden on current debt
    annual_interest_burden = round((req.loan_emi * 12.0) * (req.loan_interest_rate / 100.0), 2)

    # Debt Risk Classification
    if emi_to_income_pct < 30.0:
        debt_category = "Healthy (<30%)"
    elif emi_to_income_pct <= 45.0:
        debt_category = "Moderate (30-45%)"
    else:
        debt_category = "High Risk / Overleveraged (>45%)"

    return DeterministicMetrics(
        monthly_income=round(monthly_income, 2),
        emi_to_income_ratio_pct=emi_to_income_pct,
        sip_to_income_ratio_pct=sip_to_income_pct,
        five_year_sip_invested=five_year_invested,
        five_year_sip_projected_wealth=five_year_projected_wealth,
        five_year_sip_estimated_returns=five_year_returns,
        annual_interest_burden_est=annual_interest_burden,
        debt_risk_category=debt_category
    )
