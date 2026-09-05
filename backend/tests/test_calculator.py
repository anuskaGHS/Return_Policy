import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import SimulationRequest
from app.services.calculator import calculate_deterministic_metrics
from app.services.groq_service import get_fallback_assessment

def test_calculator_basic_case():
    # ₹12,00,000 annual income = ₹1,00,000 monthly
    # ₹10,000 SIP = 10%
    # ₹20,000 EMI = 20%
    req = SimulationRequest(
        monthly_sip=10000.0,
        loan_emi=20000.0,
        loan_interest_rate=8.5,
        annual_income=1200000.0
    )
    metrics = calculate_deterministic_metrics(req)

    assert metrics.monthly_income == 100000.0
    assert metrics.emi_to_income_ratio_pct == 20.0
    assert metrics.sip_to_income_ratio_pct == 10.0
    assert metrics.five_year_sip_invested == 600000.0
    
    # 5 year SIP compounding check:
    # 10,000/month for 60 months at 12% CAGR yields ~₹8,24,863.67
    assert 824000.0 < metrics.five_year_sip_projected_wealth < 826000.0
    assert metrics.five_year_sip_estimated_returns > 224000.0
    assert metrics.debt_risk_category == "Healthy (<30%)"

def test_calculator_high_debt_risk():
    # ₹6,00,000 annual income = ₹50,000 monthly
    # ₹30,000 EMI = 60%
    req = SimulationRequest(
        monthly_sip=5000.0,
        loan_emi=30000.0,
        loan_interest_rate=12.0,
        annual_income=600000.0
    )
    metrics = calculate_deterministic_metrics(req)
    assert metrics.emi_to_income_ratio_pct == 60.0
    assert "High Risk" in metrics.debt_risk_category

def test_fallback_ai_assessment():
    req = SimulationRequest(
        monthly_sip=15000.0,
        loan_emi=10000.0,
        loan_interest_rate=7.5,
        annual_income=1500000.0
    )
    metrics = calculate_deterministic_metrics(req)
    assessment = get_fallback_assessment(req, metrics)

    assert 0 <= assessment.financial_health_score <= 100
    assert len(assessment.priority_action_plan) == 3
    assert assessment.rating_tier != ""
    assert assessment.score_rationale != ""

if __name__ == "__main__":
    test_calculator_basic_case()
    test_calculator_high_debt_risk()
    test_fallback_ai_assessment()
    print("All backend tests passed successfully!")
