import sys
import os
import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.policy import SimulationRequest


def test_request_with_old_fields_uses_defaults():
    """1. A request with only the old fields still validates, and the 4 new fields take their defaults (11, 5000000, 3, 60)."""
    req = SimulationRequest(
        monthly_sip=10000.0,
        loan_emi=20000.0,
        loan_interest_rate=8.5,
        annual_income=1200000.0,
    )
    assert req.sip_return_pct == 11
    assert req.term_cover == 5000000
    assert req.emergency_months == 3
    assert req.long_term_pct == 60


def test_request_with_custom_valid_values():
    """2. A request with all 4 new fields set to valid values keeps those values."""
    req = SimulationRequest(
        monthly_sip=10000.0,
        loan_emi=20000.0,
        loan_interest_rate=8.5,
        annual_income=1200000.0,
        sip_return_pct=15.0,
        term_cover=10000000,
        emergency_months=6,
        long_term_pct=75.0,
    )
    assert req.sip_return_pct == 15.0
    assert req.term_cover == 10000000
    assert req.emergency_months == 6
    assert req.long_term_pct == 75.0


def test_out_of_range_values_raise_validation_error():
    """3. Out-of-range values (for example emergency_months=13, long_term_pct=101) raise a validation error."""
    base_payload = {
        "monthly_sip": 10000.0,
        "loan_emi": 20000.0,
        "loan_interest_rate": 8.5,
        "annual_income": 1200000.0,
    }

    # emergency_months out of range (allowed: 0 to 12)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, emergency_months=13)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, emergency_months=-1)

    # long_term_pct out of range (allowed: 0 to 100)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, long_term_pct=101.0)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, long_term_pct=-1.0)

    # sip_return_pct out of range (allowed: 0 to 25)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, sip_return_pct=26.0)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, sip_return_pct=-1.0)

    # term_cover out of range (allowed: 0 to 50000000)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, term_cover=50000001)
    with pytest.raises(ValidationError):
        SimulationRequest(**base_payload, term_cover=-1)
