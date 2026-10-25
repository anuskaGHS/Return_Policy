
from app.models.finances import DashboardRequest
from app.services.finances_dashboard import build_finances_dashboard


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


def test_dashboard_missing_groups_have_null_cards():
    request = DashboardRequest.model_validate({
        "income": {"monthly_gross_salary": 100000}
    })

    result = build_finances_dashboard(request)

    assert result["cards"]["sip"] is None
    assert result["cards"]["loan"] is None
    assert result["cards"]["insurance"] is None
    assert result["cards"]["fd"] is None
    assert "sip" in result["missing"]
    assert "loan" in result["missing"]
    assert "insurance" in result["missing"]
    assert "fd" in result["missing"]


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

def test_dashboard_findings_support_hindi():
    request = DashboardRequest.model_validate({
        "language": "hi",
        "income": {"monthly_gross_salary": 100000},
        "insurance": {
            "sum_assured": 5000000,
            "annual_premium": 12000,
        },
    })

    result = build_finances_dashboard(request)

    assert any(
        "Annual gross income" in finding["title"]
        and "वार्षिक सकल आय" in finding["title_hi"]
        for finding in result["findings"]
    )

    assert all(
        finding.get("title") and finding.get("title_hi")
        for finding in result["findings"]
    )