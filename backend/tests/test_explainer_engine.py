import copy
import json
import math
import os
from pathlib import Path
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.explainer import AttributionInput, AttributionResult, SectorEffect
from app.services.explainer_engine import (
    calculate_attribution,
    _round_1dp,
    WEIGHT_TOLERANCE_PTS,
    DRIVER_MIN_PTS,
    MAX_DRIVERS,
)

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "reference" / "explainer_cases.json"

with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
    fixture_data = json.load(f)

cases = fixture_data["cases"]


@pytest.mark.parametrize("case", cases, ids=[c["name"] for c in cases])
def test_explainer_fixture_cases(case):
    expected = case["expected"]
    if not expected.get("valid", True):
        req = AttributionInput(**case["input"])
        with pytest.raises(ValueError) as exc_info:
            calculate_attribution(req)
        assert str(exc_info.value) == expected["message"]
    else:
        req = AttributionInput(**case["input"])
        response = calculate_attribution(req)
        assert response.gap_pts == expected["gap_pts"]
        assert response.explained_pts == expected["explained_pts"]
        assert response.unexplained_pts == expected["unexplained_pts"]
        assert response.top_drivers == expected["top_drivers"]
        assert [s.model_dump() for s in response.sectors] == expected["sectors"]


def test_nan_and_infinity_inputs():
    base_input = {
        "fund_return_pct": 10.0,
        "benchmark_return_pct": 8.0,
        "fund_weights": {"IT": 50.0, "Financials": 50.0},
        "benchmark_weights": {"IT": 60.0, "Financials": 40.0},
        "sector_returns": {"IT": 12.0, "Financials": 6.0},
    }

    # NaN in fund_return_pct
    inp = copy.deepcopy(base_input)
    inp["fund_return_pct"] = float("nan")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))

    # Inf in benchmark_return_pct
    inp = copy.deepcopy(base_input)
    inp["benchmark_return_pct"] = float("inf")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))

    # -Inf in benchmark_return_pct
    inp = copy.deepcopy(base_input)
    inp["benchmark_return_pct"] = float("-inf")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))

    # NaN in fund_weights
    inp = copy.deepcopy(base_input)
    inp["fund_weights"]["IT"] = float("nan")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))

    # Inf in benchmark_weights
    inp = copy.deepcopy(base_input)
    inp["benchmark_weights"]["IT"] = float("inf")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))

    # NaN in sector_returns
    inp = copy.deepcopy(base_input)
    inp["sector_returns"]["IT"] = float("nan")
    with pytest.raises(ValueError, match="^Returns must be valid numbers.$"):
        calculate_attribution(AttributionInput(**inp))


def test_round_half_up_negative_ties():
    # Direct tests of round-half-up (away from zero on ties)
    assert _round_1dp(0.25) == 0.3
    assert _round_1dp(-0.25) == -0.3
    assert _round_1dp(0.05) == 0.1
    assert _round_1dp(-0.05) == -0.1
    assert _round_1dp(1.25) == 1.3
    assert _round_1dp(-1.25) == -1.3
    assert _round_1dp(-2.55) == -2.6

    # Test via attribution calculation where an effect produces -0.25
    # effect = (fund_w - bm_w)/100 * (sec_ret - bm_ret)
    # fund_w = 25, bm_w = 50 -> active = -25 -> -0.25
    # sec_ret = 11.0, bm_ret = 10.0 -> rel = 1.0
    # effect = -0.25 * 1.0 = -0.25 -> should round to -0.3
    inp = AttributionInput(
        fund_return_pct=8.0,
        benchmark_return_pct=10.0,
        fund_weights={"A": 25.0, "B": 75.0},
        benchmark_weights={"A": 50.0, "B": 50.0},
        sector_returns={"A": 11.0, "B": 10.0},
    )
    result = calculate_attribution(inp)
    sec_a = next(s for s in result.sectors if s.sector == "A")
    assert sec_a.effect_pts == -0.3


def test_no_negative_zero_in_output():
    # In Case D, IT has active -50.0 and relative 0.0 -> effect is 0.0, never -0.0
    inp = AttributionInput(
        fund_return_pct=5.0,
        benchmark_return_pct=10.0,
        fund_weights={"IT": 50.0, "Financials": 50.0},
        benchmark_weights={"IT": 100.0},
        sector_returns={"IT": 10.0, "Financials": 0.0},
    )
    result = calculate_attribution(inp)
    for s in result.sectors:
        assert str(s.effect_pts) != "-0.0"
        if s.effect_pts == 0.0:
            assert math.copysign(1.0, s.effect_pts) == 1.0

    assert str(result.unexplained_pts) != "-0.0"
    if result.unexplained_pts == 0.0:
        assert math.copysign(1.0, result.unexplained_pts) == 1.0

    # Test negative tiny number that rounds to 0.0
    tiny_rounded = _round_1dp(-0.04)
    assert tiny_rounded == 0.0
    assert str(tiny_rounded) != "-0.0"
    assert math.copysign(1.0, tiny_rounded) == 1.0


def test_sector_zero_weight_both_sides_ignored():
    # "Cash" has 0 weight on both sides and is omitted from sector_returns
    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=8.0,
        fund_weights={"IT": 60.0, "Financials": 40.0, "Cash": 0.0},
        benchmark_weights={"IT": 50.0, "Financials": 50.0, "Cash": 0.0},
        sector_returns={"IT": 12.0, "Financials": 6.0},
    )
    result = calculate_attribution(inp)
    sectors = [s.sector for s in result.sectors]
    assert "Cash" not in sectors
    assert set(sectors) == {"IT", "Financials"}


def test_tie_break_by_sector_name():
    # 3 sectors with identical absolute effect 0.0
    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=10.0,
        fund_weights={"Zeta": 30.0, "Beta": 30.0, "Alpha": 40.0},
        benchmark_weights={"Zeta": 30.0, "Beta": 30.0, "Alpha": 40.0},
        sector_returns={"Zeta": 10.0, "Beta": 10.0, "Alpha": 10.0},
    )
    result = calculate_attribution(inp)
    sectors = [s.sector for s in result.sectors]
    assert sectors == ["Alpha", "Beta", "Zeta"]

    # Sectors with same absolute effect but different signs: e.g. +1.0 and -1.0
    # Zeta: active = +10, rel = 10 -> effect = 1.0
    # Alpha: active = -10, rel = 10 -> effect = -1.0
    inp2 = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=10.0,
        fund_weights={"Zeta": 60.0, "Alpha": 40.0},
        benchmark_weights={"Zeta": 50.0, "Alpha": 50.0},
        sector_returns={"Zeta": 20.0, "Alpha": 20.0},
    )
    result2 = calculate_attribution(inp2)
    sectors2 = [s.sector for s in result2.sectors]
    assert sectors2 == ["Alpha", "Zeta"]


def test_input_dicts_not_mutated():
    fund_w = {"IT": 50.0, "Financials": 50.0}
    bm_w = {"IT": 60.0, "Financials": 40.0}
    sec_ret = {"IT": 12.0, "Financials": 6.0}

    orig_fund_w = copy.deepcopy(fund_w)
    orig_bm_w = copy.deepcopy(bm_w)
    orig_sec_ret = copy.deepcopy(sec_ret)

    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=8.0,
        fund_weights=fund_w,
        benchmark_weights=bm_w,
        sector_returns=sec_ret,
    )
    calculate_attribution(inp)

    assert inp.fund_weights == orig_fund_w
    assert inp.benchmark_weights == orig_bm_w
    assert inp.sector_returns == orig_sec_ret


def test_explained_unexplained_gap_identity():
    # Check that abs(explained + unexplained - gap) <= 0.1 for all valid cases in fixture
    for case in cases:
        if case["expected"].get("valid", True):
            inp = AttributionInput(**case["input"])
            result = calculate_attribution(inp)
            diff = abs(result.explained_pts + result.unexplained_pts - result.gap_pts)
            assert diff <= 0.1 + 1e-9, f"Failed for case {case['name']}: diff={diff}"


def test_benchmark_weights_sum_outside_tolerance():
    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=8.0,
        fund_weights={"IT": 50.0, "Financials": 50.0},
        benchmark_weights={"IT": 50.0, "Financials": 40.0},
        sector_returns={"IT": 10.0, "Financials": 8.0},
    )
    with pytest.raises(ValueError, match="^The benchmark's sector weights should add up to about 100%.$"):
        calculate_attribution(inp)


def test_benchmark_return_below_minus_100():
    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=-101.0,
        fund_weights={"IT": 50.0, "Financials": 50.0},
        benchmark_weights={"IT": 50.0, "Financials": 50.0},
        sector_returns={"IT": 10.0, "Financials": 8.0},
    )
    with pytest.raises(ValueError, match="^A return cannot be below -100%.$"):
        calculate_attribution(inp)


def test_gap_zero_top_drivers_empty():
    inp = AttributionInput(
        fund_return_pct=10.0,
        benchmark_return_pct=10.0,
        fund_weights={"IT": 60.0, "Financials": 40.0},
        benchmark_weights={"IT": 40.0, "Financials": 60.0},
        sector_returns={"IT": 20.0, "Financials": 0.0},
    )
    result = calculate_attribution(inp)
    assert result.gap_pts == 0.0
    assert result.top_drivers == []


def test_max_drivers_limit():
    # 4 sectors all have large positive effects when gap is positive
    # fund_w - bm_w = 25 - 0 = 25 -> active = 25
    # rel = 15 - 10 = 5 -> effect = 0.25 * 5 = 1.25 >= 0.5
    inp = AttributionInput(
        fund_return_pct=15.0,
        benchmark_return_pct=10.0,
        fund_weights={"S1": 25.0, "S2": 25.0, "S3": 25.0, "S4": 25.0},
        benchmark_weights={"S5": 100.0},
        sector_returns={"S1": 15.0, "S2": 15.0, "S3": 15.0, "S4": 15.0, "S5": 10.0},
    )
    result = calculate_attribution(inp)
    assert len(result.top_drivers) == MAX_DRIVERS
