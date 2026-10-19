import sys
import os
import json
from pathlib import Path
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.health_score import compute_health_score

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "reference" / "score_cases.json"

with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
    fixture_data = json.load(f)

cases = fixture_data["cases"]


@pytest.mark.parametrize("case", cases, ids=[c["name"] for c in cases])
def test_health_score_fixture_cases(case):
    result = compute_health_score(**case["input"])
    assert result["points"] == case["points"]
    assert result["score"] == case["score"]
    assert result["tier"] == case["tier"]


def test_default_input_score_64():
    result = compute_health_score(
        monthly_sip=15000,
        loan_emi=22000,
        loan_interest_rate=8.5,
        annual_income=1400000,
        sip_return_pct=11,
        term_cover=5000000,
        emergency_months=3,
        long_term_pct=60,
    )
    assert result["score"] == 64
    assert result["points"] == {
        "sip": 23,
        "loan": 14,
        "ins": 7,
        "tax": 12,
        "emg": 8,
    }
    assert result["tier"] == "Balanced Saver"


def test_annual_income_zero_does_not_crash():
    result = compute_health_score(
        monthly_sip=15000,
        loan_emi=22000,
        loan_interest_rate=8.5,
        annual_income=0,
        sip_return_pct=11,
        term_cover=5000000,
        emergency_months=3,
        long_term_pct=60,
    )
    assert result["points"]["loan"] == 0
    assert result["points"]["ins"] == 0
    assert isinstance(result["score"], int)
    assert isinstance(result["tier"], str)
