import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import LoanOptimizerRequest
from app.services.loan_optimizer import calculate_loan_vs_invest
from main import app

client = TestClient(app)

def test_surplus_zero_identical():
    """
    Acceptance check 1:
    monthly_surplus = 0 gives identical results for both strategies.
    """
    req = LoanOptimizerRequest(
        outstanding_principal=5000000.0,
        annual_interest_rate_pct=9.0,
        remaining_tenure_months=240,
        monthly_surplus=0.0,
        expected_equity_cagr_pct=12.0
    )
    res = calculate_loan_vs_invest(req)

    assert res.strategy_a.loan_closure_month == 240
    assert res.strategy_b.loan_closure_month == 240
    assert res.strategy_a.total_interest_paid == res.strategy_b.total_interest_paid
    assert res.strategy_a.final_sip_corpus == 0.0
    assert res.strategy_b.final_sip_corpus == 0.0
    assert res.strategy_a.ltcg_tax == 0.0
    assert res.strategy_b.ltcg_tax == 0.0
    assert res.strategy_a.net_wealth == 0.0
    assert res.strategy_b.net_wealth == 0.0
    assert res.net_wealth_difference == 0.0
    assert len(res.notes) > 0


def test_break_even_cagr_makes_difference_near_zero():
    """
    Acceptance check 2:
    Setting expected_equity_cagr_pct to the reported break-even makes the net
    wealth difference about 0.
    """
    req = LoanOptimizerRequest(
        outstanding_principal=5000000.0,
        annual_interest_rate_pct=9.0,
        remaining_tenure_months=240,
        monthly_surplus=25000.0,
        expected_equity_cagr_pct=12.0
    )
    res = calculate_loan_vs_invest(req)
    be_cagr = res.break_even_cagr
    assert be_cagr > 0.0

    # Re-run simulation with expected_equity_cagr_pct set to break_even_cagr
    req_be = LoanOptimizerRequest(
        outstanding_principal=5000000.0,
        annual_interest_rate_pct=9.0,
        remaining_tenure_months=240,
        monthly_surplus=25000.0,
        expected_equity_cagr_pct=be_cagr
    )
    res_be = calculate_loan_vs_invest(req_be)

    # Net wealth difference should be practically zero (< ₹5 on a ₹1.64 Crore terminal corpus)
    assert res_be.net_wealth_difference < 5.0
    assert abs(res_be.strategy_a.net_wealth - res_be.strategy_b.net_wealth) < 5.0


def test_worked_example():
    """
    Validates a standard realistic Indian home loan scenario:
    Principal: ₹50,00,000, 9% annual interest, 20-year (240 months) tenure,
    Surplus: ₹25,000/month, expected equity CAGR: 12.0%.
    """
    res = calculate_loan_vs_invest(
        outstanding_principal=5000000.0,
        annual_interest_rate_pct=9.0,
        remaining_tenure_months=240,
        monthly_surplus=25000.0,
        expected_equity_cagr_pct=12.0
    )

    # Strategy A prepays early: closes in ~103 months (< 9 years instead of 20 years)
    assert res.strategy_a.loan_closure_month == 103
    # Significant interest saved in Strategy A (~₹21.89L vs ~₹57.97L)
    assert res.strategy_a.total_interest_paid < 2200000.0
    assert res.strategy_b.total_interest_paid > 5790000.0

    # At 12% equity CAGR, investing the surplus (Strategy B) beats prepaying (Strategy A)
    assert res.strategy_b.net_wealth > res.strategy_a.net_wealth
    assert res.recommendation == "Invest"
    assert res.net_wealth_difference == round(res.strategy_b.net_wealth - res.strategy_a.net_wealth, 2)
    # Break-even CAGR is ~9.48% (higher than 9% loan rate due to LTCG tax on equity)
    assert 9.40 < res.break_even_cagr < 9.55


def test_api_endpoint():
    """
    Validates the FastAPI POST /api/loan-optimizer endpoint.
    """
    payload = {
        "outstanding_principal": 3000000.0,
        "annual_interest_rate_pct": 8.5,
        "remaining_tenure_months": 180,
        "monthly_surplus": 15000.0,
        "expected_equity_cagr_pct": 12.0
    }
    response = client.post("/api/loan-optimizer", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "strategy_a" in data
    assert "strategy_b" in data
    assert "net_wealth_difference" in data
    assert "recommendation" in data
    assert "break_even_cagr" in data
    assert "notes" in data
    assert len(data["notes"]) == 6
    assert data["strategy_a"]["loan_closure_month"] < 180
    assert data["strategy_b"]["loan_closure_month"] == 180


if __name__ == "__main__":
    test_surplus_zero_identical()
    test_break_even_cagr_makes_difference_near_zero()
    test_worked_example()
    test_api_endpoint()
    print("All loan optimizer unit tests passed successfully!")



def test_localized_response_fields_and_key_points():
    req = LoanOptimizerRequest(
        outstanding_principal=4800000,
        annual_interest_rate_pct=8.5,
        remaining_tenure_months=180,
        monthly_surplus=20000,
        expected_equity_cagr_pct=12,
    )
    data = calculate_loan_vs_invest(req).model_dump()

    assert {
        "strategy_a", "strategy_b", "net_wealth_difference", "recommendation",
        "break_even_cagr", "break_even_cagr_pct", "notes", "notes_hi",
        "key_points", "key_points_hi",
    }.issubset(data)
    assert len(data["notes"]) == len(data["notes_hi"]) == 6
    assert len(data["key_points"]) == len(data["key_points_hi"])
    assert len(data["key_points"]) in (4, 5)
    assert all(
        isinstance(x, str) and x
        for x in data["key_points"] + data["key_points_hi"]
    )
    assert "₹92,95,705" in data["key_points"][2]
    assert "₹92,95,705" in data["key_points_hi"][2]
    assert "9.13%" in data["key_points"][3]
    assert "9.13%" in data["key_points_hi"][3]


def test_expected_case_one_matches_pack_within_one_rupee():
    res = calculate_loan_vs_invest(
        outstanding_principal=4800000,
        annual_interest_rate_pct=8.5,
        remaining_tenure_months=180,
        monthly_surplus=20000,
        expected_equity_cagr_pct=12,
    )

    expected_a = [1910209.96, 8303415.27, 347559.43, 7955855.84]
    expected_b = [3708149.78, 10091519.99, 795815.00, 9295704.99]

    actual_a = [
        res.strategy_a.total_interest_paid,
        res.strategy_a.final_sip_corpus,
        res.strategy_a.ltcg_tax,
        res.strategy_a.net_wealth,
    ]
    actual_b = [
        res.strategy_b.total_interest_paid,
        res.strategy_b.final_sip_corpus,
        res.strategy_b.ltcg_tax,
        res.strategy_b.net_wealth,
    ]

    assert res.strategy_a.loan_closure_month == 100
    assert res.strategy_b.loan_closure_month == 180
    assert all(abs(actual - expected) <= 1 for actual, expected in zip(actual_a, expected_a))
    assert all(abs(actual - expected) <= 1 for actual, expected in zip(actual_b, expected_b))
    assert abs(res.net_wealth_difference - 1339849.15) <= 1
    assert res.recommendation == "Invest"
    assert abs(res.break_even_cagr - 9.128) < 0.01

def test_expected_case_two_matches_pack_within_one_rupee():
    res = calculate_loan_vs_invest(
        outstanding_principal=4800000,
        annual_interest_rate_pct=8.5,
        remaining_tenure_months=180,
        monthly_surplus=20000,
        expected_equity_cagr_pct=8,
    )

    expected_a = [1910209.96, 7154662.02, 203965.28, 6950696.75]
    expected_b = [3708149.78, 6966902.86, 405237.86, 6561665.00]

    actual_a = [
        res.strategy_a.total_interest_paid,
        res.strategy_a.final_sip_corpus,
        res.strategy_a.ltcg_tax,
        res.strategy_a.net_wealth,
    ]
    actual_b = [
        res.strategy_b.total_interest_paid,
        res.strategy_b.final_sip_corpus,
        res.strategy_b.ltcg_tax,
        res.strategy_b.net_wealth,
    ]

    assert res.strategy_a.loan_closure_month == 100
    assert res.strategy_b.loan_closure_month == 180
    assert all(
        abs(actual - expected) <= 1
        for actual, expected in zip(actual_a, expected_a)
    )
    assert all(
        abs(actual - expected) <= 1
        for actual, expected in zip(actual_b, expected_b)
    )
    assert abs(res.net_wealth_difference - 389031.75) <= 1
    assert res.recommendation == "Prepay"
    assert abs(res.break_even_cagr - 9.128) < 0.01
