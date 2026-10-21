import sys
import os
import json
from datetime import date
from pathlib import Path
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import ExitAnalysisRequest
from app.services.tax_engine import (
    calculate_exit_analysis,
    validate_exit_inputs,
    elss_lock_status,
    js_round,
    to_fixed_1,
)

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "reference" / "exit_cases.json"

with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
    fixture_data = json.load(f)

cases = fixture_data["cases"]


@pytest.mark.parametrize("case", cases, ids=[c["name"] for c in cases])
def test_exit_rules_fixture_cases(case):
    today = date(2026, 10, 21)
    expected = case["expected"]
    if not expected.get("valid", True):
        # Invalid cases
        validation_result = validate_exit_inputs(case["input"])
        assert validation_result == expected
        req = ExitAnalysisRequest(**case["input"])
        with pytest.raises(ValueError) as exc_info:
            calculate_exit_analysis(req, today=today)
        assert str(exc_info.value) == expected["message"]
    else:
        # Valid cases
        req = ExitAnalysisRequest(**case["input"])
        response = calculate_exit_analysis(req, today=today)
        for key, expected_val in expected.items():
            resp_val = getattr(response, key)
            if key == "lock_in":
                resp_val = resp_val.model_dump() if resp_val is not None else None
            assert resp_val == expected_val, f"Case '{case['name']}': mismatch for '{key}': {resp_val} != {expected_val}"


def test_elss_feb_29_unlock_march_1():
    today = date(2026, 10, 21)
    # Purchase on 2024-02-29 (leap year)
    holding_days = (today - date(2024, 2, 29)).days
    status = elss_lock_status(holding_days, now=today)
    assert status["unlock_date"] == "2027-03-01"


def test_js_round_halves():
    assert js_round(2.5) == 3
    assert js_round(-2.5) == -2


def test_to_fixed_1_helper():
    assert to_fixed_1(0.25) == 0.3
