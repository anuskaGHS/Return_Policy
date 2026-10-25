from datetime import date

from app.models.finances import DashboardRequest, DashboardResponse
from app.services.finances_dashboard import (
    _format_indian_number,
    _months_to_maturity,
    build_finances_dashboard,
)


def test_dashboard_calculates_income_and_insurance_gap():
    request = DashboardRequest.model_validate({
        "income": {
            "monthly_gross_salary": 120000,
            "monthly_net_salary": 98000,
        },
        "insurance": {
            "sum_assured": 5000000,
            "annual_premium": 14000,
        },
    })

    result = build_finances_dashboard(request)

    assert result["annual_income"] == 1440000
    assert result["suggested_cover"] == 14400000
    assert result["cover_gap"] == 9400000
    assert result["cards"]["insurance"]["suggested_cover"] == 14400000
    assert result["cards"]["insurance"]["gap"] == 9400000
    assert result["health"] is not None
    assert result["ai_source"] == "none"


def test_dashboard_without_income_has_no_health_score():
    request = DashboardRequest.model_validate({})

    result = build_finances_dashboard(request)

    assert result["annual_income"] is None
    assert result["suggested_cover"] is None
    assert result["cover_gap"] is None
    assert result["health"] is None
    assert "income" in result["missing"]


def test_dashboard_missing_groups_keep_derived_insurance_card_values():
    request = DashboardRequest.model_validate({
        "income": {"monthly_gross_salary": 100000}
    })

    result = build_finances_dashboard(request)

    assert result["cards"]["sip"] is None
    assert result["cards"]["loan"] is None
    assert result["cards"]["insurance"]["sum_assured"] is None
    assert result["cards"]["insurance"]["suggested_cover"] == 12000000
    assert result["cards"]["insurance"]["gap"] == 12000000
    assert result["cards"]["fd"] is None
    assert "insurance" in result["missing"]


def test_dashboard_never_reports_negative_cover_gap():
    request = DashboardRequest.model_validate({
        "income": {"monthly_gross_salary": 100000},
        "insurance": {
            "sum_assured": 20000000,
            "annual_premium": 20000,
        },
    })

    result = build_finances_dashboard(request)

    assert result["cover_gap"] == 0
    assert result["cards"]["insurance"]["gap"] == 0


def test_dashboard_adds_sip_absolute_return_pct():
    request = DashboardRequest.model_validate({
        "sip": {
            "monthly_sip_amount": 8000,
            "invested_amount": 100000,
            "current_value": 115000,
        },
    })

    result = build_finances_dashboard(request)

    assert result["cards"]["sip"]["absolute_return_pct"] == 15.0


def test_sip_absolute_return_is_none_when_not_calculable():
    request = DashboardRequest.model_validate({
        "sip": {
            "invested_amount": 0,
            "current_value": 10000,
        },
    })

    result = build_finances_dashboard(request)

    assert result["cards"]["sip"]["absolute_return_pct"] is None


def test_fd_card_includes_months_to_maturity():
    today = date.today()
    request = DashboardRequest.model_validate({
        "fd": {
            "principal_amount": 500000,
            "maturity_date": today,
        },
    })

    result = build_finances_dashboard(request)

    assert result["cards"]["fd"]["months_to_maturity"] == 0


def test_months_to_maturity_returns_full_months_and_clamps_past_dates():
    assert _months_to_maturity(
        date(2026, 12, 24), today=date(2026, 10, 25)
    ) == 1
    assert _months_to_maturity(
        date(2026, 10, 24), today=date(2026, 10, 25)
    ) == 0
    assert _months_to_maturity(
        None, today=date(2026, 10, 25)
    ) is None


def test_indian_number_format_uses_lakh_and_crore_grouping():
    assert _format_indian_number(1440000) == "14,40,000"
    assert _format_indian_number(14400000) == "1,44,00,000"
    assert _format_indian_number(9400000) == "94,00,000"


def test_dashboard_findings_include_required_fields_and_indian_format():
    request = DashboardRequest.model_validate({
        "language": "hi",
        "income": {"monthly_gross_salary": 120000},
        "insurance": {
            "sum_assured": 5000000,
            "annual_premium": 12000,
        },
    })

    result = build_finances_dashboard(request)
    response = DashboardResponse.model_validate(result)

    assert any(
        finding.id == "annual_income"
        and "₹14,40,000" in finding.title
        and "वार्षिक सकल आय" in finding.title_hi
        and finding.text_en
        and finding.text_hi
        for finding in response.findings
    )
    assert any(
        finding.id == "suggested_cover"
        and "₹1,44,00,000" in finding.title
        and finding.text_en
        and finding.text_hi
        for finding in response.findings
    )
    assert any(
        finding.id == "cover_gap"
        and "₹94,00,000" in finding.title
        and finding.text_en
        and finding.text_hi
        for finding in response.findings
    )
    assert all(
        finding.id and finding.title and finding.title_hi
        and finding.text_en and finding.text_hi
        for finding in response.findings
    )
