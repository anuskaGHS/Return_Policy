import copy
import json
import os
from pathlib import Path
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.explainer_data import (
    load_explainer_data,
    list_funds,
    get_attribution_input,
    available_periods,
    PERIODS,
)
from app.services.explainer_engine import calculate_attribution



def get_valid_test_data() -> dict:
    return {
        "schema_version": 1,
        "as_of": "2025-03-31",
        "return_basis": {"6M": "absolute", "1Y": "absolute", "3Y": "annualised"},
        "sector_taxonomy": ["IT", "Financials", "Energy", "Healthcare"],
        "sector_returns": {
            "6M": {"IT": 10.0, "Financials": 6.0, "Energy": 4.0, "Healthcare": 2.0},
            "1Y": {"IT": 20.0, "Financials": 12.0, "Energy": 8.0, "Healthcare": 5.0},
            "3Y": {"IT": 15.0, "Financials": 10.0, "Energy": 7.0, "Healthcare": 4.0},
            "index_used": {
                "IT": "Nifty IT",
                "Financials": "Nifty Financial Services",
                "Energy": "Nifty Energy",
                "Healthcare": "Nifty Healthcare",
            },
            "sources": [
                {
                    "label": "NSE Sector Indices",
                    "url": "https://www.niftyindices.com",
                    "accessed_on": "2025-03-31",
                }
            ],
        },
        "benchmarks": {
            "benchmark_1": {
                "name": "Nifty 50 TRI",
                "weights": {
                    "IT": 30.0,
                    "Financials": 40.0,
                    "Energy": 20.0,
                    "Healthcare": 10.0,
                },
                "weights_as_of": "2025-03-31",
                "returns": {"6M": 8.0, "1Y": 15.0, "3Y": 12.0},
                "sources": [
                    {
                        "label": "NSE Nifty 50",
                        "url": "https://www.niftyindices.com",
                        "accessed_on": "2025-03-31",
                    }
                ],
            }
        },
        "funds": [
            {
                "id": "test-fund-a",
                "name": "TEST FUND A",
                "category": "Flexi Cap",
                "plan": "Direct Growth",
                "benchmark_id": "benchmark_1",
                "weights": {
                    "IT": 40.0,
                    "Financials": 30.0,
                    "Energy": 20.0,
                    "Healthcare": 10.0,
                },
                "portfolio_as_of": "2025-03-31",
                "returns": {"6M": 9.5, "1Y": 18.0, "3Y": 14.0},
                "sources": [
                    {
                        "label": "Fund Factsheet",
                        "url": "https://example.com/factsheet",
                        "accessed_on": "2025-03-31",
                    }
                ],
                "notes": None,
            }
        ],
    }


def write_json(path: Path, data: dict) -> Path:
    file_path = path / "explainer_funds.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return file_path


def test_happy_path_load_and_list_funds(tmp_path):
    raw = get_valid_test_data()
    file_path = write_json(tmp_path, raw)

    data = load_explainer_data(file_path)
    assert data.schema_version == 1
    assert data.as_of == "2025-03-31"

    funds = list_funds(data)
    assert len(funds) == 1
    f = funds[0]
    assert f["id"] == "test-fund-a"
    assert f["name"] == "TEST FUND A"
    assert f["category"] == "Flexi Cap"
    assert f["plan"] == "Direct Growth"
    assert f["benchmark_name"] == "Nifty 50 TRI"
    assert f["periods"] == ["6M", "1Y", "3Y"]
    assert f["as_of"] == "2025-03-31"


def test_get_attribution_input_and_engine_compatibility(tmp_path):
    raw = get_valid_test_data()
    file_path = write_json(tmp_path, raw)

    data = load_explainer_data(file_path)
    attr_input = get_attribution_input(data, "test-fund-a", "6M")

    assert attr_input.fund_return_pct == 9.5
    assert attr_input.benchmark_return_pct == 8.0
    assert attr_input.fund_weights == {
        "IT": 40.0,
        "Financials": 30.0,
        "Energy": 20.0,
        "Healthcare": 10.0,
    }
    assert attr_input.benchmark_weights == {
        "IT": 30.0,
        "Financials": 40.0,
        "Energy": 20.0,
        "Healthcare": 10.0,
    }
    assert attr_input.sector_returns == {
        "IT": 10.0,
        "Financials": 6.0,
        "Energy": 4.0,
        "Healthcare": 2.0,
    }

    # Verify calculation engine accepts it without error
    result = calculate_attribution(attr_input)
    assert result.fund_return_pct == 9.5
    assert result.benchmark_return_pct == 8.0
    assert result.gap_pts == 1.5


def test_rule_1_iso_date_validation(tmp_path):
    # Test invalid date string
    raw = get_valid_test_data()
    raw["as_of"] = "2025-99-99"
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="must be a valid ISO date"):
        load_explainer_data(file_path)

    # Test portfolio_as_of later than as_of
    raw2 = get_valid_test_data()
    raw2["funds"][0]["portfolio_as_of"] = "2025-04-01"
    file_path2 = write_json(tmp_path, raw2)
    with pytest.raises(ValueError, match="cannot be later than as_of date"):
        load_explainer_data(file_path2)


def test_rule_2_sources_non_empty_and_https(tmp_path):
    # Test empty sources
    raw = get_valid_test_data()
    raw["funds"][0]["sources"] = []
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="cannot be empty"):
        load_explainer_data(file_path)

    # Test non-https URL
    raw2 = get_valid_test_data()
    raw2["funds"][0]["sources"][0]["url"] = "http://example.com/insecure"
    file_path2 = write_json(tmp_path, raw2)
    with pytest.raises(ValueError, match="must start with 'https://'"):
        load_explainer_data(file_path2)


def test_rule_3_sectors_in_taxonomy(tmp_path):
    raw = get_valid_test_data()
    raw["funds"][0]["weights"] = {
        "Cryptocurrency": 40.0,
        "Financials": 30.0,
        "Energy": 20.0,
        "Healthcare": 10.0,
    }
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="is not in sector_taxonomy"):
        load_explainer_data(file_path)


def test_rule_4_weights_sum_to_100(tmp_path):
    # Fund weights sum outside 100 +/- 1.0
    raw = get_valid_test_data()
    raw["funds"][0]["weights"] = {
        "IT": 20.0,
        "Financials": 20.0,
        "Energy": 20.0,
        "Healthcare": 20.0,
    }  # sums to 80
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="must add up to about 100%"):
        load_explainer_data(file_path)


def test_rule_5_active_sector_returns_and_index_used(tmp_path):
    # Active sector missing a return for 3Y period
    raw = get_valid_test_data()
    del raw["sector_returns"]["3Y"]["IT"]
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="missing a sector return for period"):
        load_explainer_data(file_path)

    # Active sector missing in index_used
    raw2 = get_valid_test_data()
    del raw2["sector_returns"]["index_used"]["IT"]
    file_path2 = write_json(tmp_path, raw2)
    with pytest.raises(ValueError, match="missing an entry in index_used"):
        load_explainer_data(file_path2)


def test_rule_6_fund_id_unique_and_benchmark_exists(tmp_path):
    # Duplicate fund id
    raw = get_valid_test_data()
    raw["funds"].append(copy.deepcopy(raw["funds"][0]))
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="Duplicate fund id"):
        load_explainer_data(file_path)

    # Non-existent benchmark_id
    raw2 = get_valid_test_data()
    raw2["funds"][0]["benchmark_id"] = "non-existent-benchmark"
    file_path2 = write_json(tmp_path, raw2)
    with pytest.raises(ValueError, match="does not exist in benchmarks"):
        load_explainer_data(file_path2)


def test_rule_7_returns_valid_periods_finite_not_below_minus_100(tmp_path):
    # Missing period in benchmark returns
    raw = get_valid_test_data()
    del raw["benchmarks"]["benchmark_1"]["returns"]["3Y"]
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="must contain period"):
        load_explainer_data(file_path)

    # Non-finite return
    raw2 = get_valid_test_data()
    raw2["funds"][0]["returns"]["6M"] = float("nan")
    file_path2 = write_json(tmp_path, raw2)
    with pytest.raises(ValueError, match="must be a finite number"):
        load_explainer_data(file_path2)

    # Return below -100
    raw3 = get_valid_test_data()
    raw3["funds"][0]["returns"]["1Y"] = -105.0
    file_path3 = write_json(tmp_path, raw3)
    with pytest.raises(ValueError, match="cannot be below -100%"):
        load_explainer_data(file_path3)


def test_rule_8_return_basis_exact(tmp_path):
    raw = get_valid_test_data()
    raw["return_basis"] = {"6M": "absolute", "1Y": "annualised", "3Y": "annualised"}
    file_path = write_json(tmp_path, raw)
    with pytest.raises(ValueError, match="return_basis must be exactly"):
        load_explainer_data(file_path)


def test_unknown_fund_id(tmp_path):
    raw = get_valid_test_data()
    file_path = write_json(tmp_path, raw)
    data = load_explainer_data(file_path)
    with pytest.raises(ValueError, match="^Unknown fund.$"):
        get_attribution_input(data, "unknown-fund-id", "6M")


def test_unknown_period(tmp_path):
    raw = get_valid_test_data()
    file_path = write_json(tmp_path, raw)
    data = load_explainer_data(file_path)
    with pytest.raises(ValueError, match="^Unknown period.$"):
        get_attribution_input(data, "test-fund-a", "5Y")


def test_missing_file():
    missing = Path("non_existent_explainer_file.json")
    with pytest.raises(FileNotFoundError, match="Explainer data file not found"):
        load_explainer_data(missing)


def get_1y_only_test_data() -> dict:
    raw = get_valid_test_data()
    raw["sector_returns"]["6M"] = {}
    raw["sector_returns"]["3Y"] = {}
    raw["benchmarks"]["benchmark_1"]["returns"] = {"1Y": 15.0}
    raw["funds"][0]["returns"] = {"1Y": 18.0}
    return raw


def test_only_1y_filled_loads_and_list_funds(tmp_path):
    raw = get_1y_only_test_data()
    file_path = write_json(tmp_path, raw)

    data = load_explainer_data(file_path)
    assert available_periods(data) == ["1Y"]

    funds = list_funds(data)
    assert len(funds) == 1
    assert funds[0]["periods"] == ["1Y"]


def test_no_periods_available_raises_error(tmp_path):
    raw = get_valid_test_data()
    raw["sector_returns"]["6M"] = {}
    raw["sector_returns"]["1Y"] = {}
    raw["sector_returns"]["3Y"] = {}
    file_path = write_json(tmp_path, raw)

    with pytest.raises(ValueError, match="At least one period must be available"):
        load_explainer_data(file_path)


def test_active_sector_missing_return_in_available_period(tmp_path):
    raw = get_1y_only_test_data()
    del raw["sector_returns"]["1Y"]["IT"]
    file_path = write_json(tmp_path, raw)

    with pytest.raises(ValueError, match="Active sector 'IT' is missing a sector return for period '1Y'"):
        load_explainer_data(file_path)


def test_unavailable_period_requested_raises_error(tmp_path):
    raw = get_1y_only_test_data()
    file_path = write_json(tmp_path, raw)

    data = load_explainer_data(file_path)
    with pytest.raises(ValueError, match="^This period is not available yet.$"):
        get_attribution_input(data, "test-fund-a", "6M")


def test_real_explainer_funds_file():
    data = load_explainer_data()
    assert data.schema_version == 1
    assert available_periods(data) == ["1Y"]

    funds = list_funds(data)
    assert any(f["id"] == "kotak-large-cap-reg-g" for f in funds)
    fund_info = next(f for f in funds if f["id"] == "kotak-large-cap-reg-g")
    assert fund_info["periods"] == ["1Y"]

    attr_input = get_attribution_input(data, "kotak-large-cap-reg-g", "1Y")
    result = calculate_attribution(attr_input)

    assert result.gap_pts == -0.3
    assert result.top_drivers == []

    mm_sector = next(s for s in result.sectors if s.sector == "Metals & Mining")
    assert mm_sector.effect_pts == -0.3


