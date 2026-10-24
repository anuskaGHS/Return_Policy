from datetime import date
import json
import math
from pathlib import Path
from typing import Optional, Union

from app.models.explainer import AttributionInput
from app.models.explainer_data import ExplainerData
from app.services.explainer_engine import WEIGHT_TOLERANCE_PTS

PERIODS = ("6M", "1Y", "3Y")
DEFAULT_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "explainer_funds.json"
EXPECTED_RETURN_BASIS = {"6M": "absolute", "1Y": "absolute", "3Y": "annualised"}


def validate_explainer_data(data: ExplainerData) -> None:
    # 1. ISO date validation and portfolio_as_of / weights_as_of not later than as_of
    try:
        as_of_dt = date.fromisoformat(data.as_of)
    except (ValueError, TypeError):
        raise ValueError(f"as_of date '{data.as_of}' must be a valid ISO date (YYYY-MM-DD).")

    for src in data.sector_returns.sources:
        try:
            date.fromisoformat(src.accessed_on)
        except (ValueError, TypeError):
            raise ValueError(f"accessed_on date '{src.accessed_on}' in sector return sources must be a valid ISO date (YYYY-MM-DD).")

    for bm_id, bm in data.benchmarks.items():
        try:
            bm_dt = date.fromisoformat(bm.weights_as_of)
        except (ValueError, TypeError):
            raise ValueError(f"weights_as_of date '{bm.weights_as_of}' for benchmark '{bm_id}' must be a valid ISO date (YYYY-MM-DD).")
        if bm_dt > as_of_dt:
            raise ValueError(f"weights_as_of date '{bm.weights_as_of}' for benchmark '{bm_id}' cannot be later than as_of date '{data.as_of}'.")
        for src in bm.sources:
            try:
                date.fromisoformat(src.accessed_on)
            except (ValueError, TypeError):
                raise ValueError(f"accessed_on date '{src.accessed_on}' for benchmark '{bm_id}' must be a valid ISO date (YYYY-MM-DD).")

    for fund in data.funds:
        try:
            fund_dt = date.fromisoformat(fund.portfolio_as_of)
        except (ValueError, TypeError):
            raise ValueError(f"portfolio_as_of date '{fund.portfolio_as_of}' for fund '{fund.id}' must be a valid ISO date (YYYY-MM-DD).")
        if fund_dt > as_of_dt:
            raise ValueError(f"portfolio_as_of date '{fund.portfolio_as_of}' for fund '{fund.id}' cannot be later than as_of date '{data.as_of}'.")
        for src in fund.sources:
            try:
                date.fromisoformat(src.accessed_on)
            except (ValueError, TypeError):
                raise ValueError(f"accessed_on date '{src.accessed_on}' for fund '{fund.id}' must be a valid ISO date (YYYY-MM-DD).")

    # 2. Every sources list must be non-empty and every url must start with 'https://'
    if not data.sector_returns.sources:
        raise ValueError("Sources list for sector returns cannot be empty.")
    for src in data.sector_returns.sources:
        if not src.url.startswith("https://"):
            raise ValueError(f"Source URL '{src.url}' in sector returns must start with 'https://'.")

    for bm_id, bm in data.benchmarks.items():
        if not bm.sources:
            raise ValueError(f"Sources list for benchmark '{bm_id}' cannot be empty.")
        for src in bm.sources:
            if not src.url.startswith("https://"):
                raise ValueError(f"Source URL '{src.url}' for benchmark '{bm_id}' must start with 'https://'.")

    for fund in data.funds:
        if not fund.sources:
            raise ValueError(f"Sources list for fund '{fund.id}' cannot be empty.")
        for src in fund.sources:
            if not src.url.startswith("https://"):
                raise ValueError(f"Source URL '{src.url}' for fund '{fund.id}' must start with 'https://'.")

    # 3. Every sector name used in any weights dict, in sector_returns, or in index_used must be in sector_taxonomy
    tax = set(data.sector_taxonomy)
    for p in PERIODS:
        for s in data.sector_returns[p].keys():
            if s not in tax:
                raise ValueError(f"Sector '{s}' in sector returns for period '{p}' is not in sector_taxonomy.")

    for s in data.sector_returns.index_used.keys():
        if s not in tax:
            raise ValueError(f"Sector '{s}' in index_used is not in sector_taxonomy.")

    for bm_id, bm in data.benchmarks.items():
        for s in bm.weights.keys():
            if s not in tax:
                raise ValueError(f"Sector '{s}' in weights for benchmark '{bm_id}' is not in sector_taxonomy.")

    for fund in data.funds:
        for s in fund.weights.keys():
            if s not in tax:
                raise ValueError(f"Sector '{s}' in weights for fund '{fund.id}' is not in sector_taxonomy.")

    # 4. Weights of every fund and every benchmark must each add up to 100 +/- WEIGHT_TOLERANCE_PTS
    for bm_id, bm in data.benchmarks.items():
        bm_sum = sum(bm.weights.values())
        if abs(bm_sum - 100.0) > WEIGHT_TOLERANCE_PTS + 1e-9:
            raise ValueError(f"Weights for benchmark '{bm_id}' must add up to about 100% (got {bm_sum}%).")

    for fund in data.funds:
        fund_sum = sum(fund.weights.values())
        if abs(fund_sum - 100.0) > WEIGHT_TOLERANCE_PTS + 1e-9:
            raise ValueError(f"Weights for fund '{fund.id}' must add up to about 100% (got {fund_sum}%).")

    # 5. Every sector with non-zero weight in any fund or benchmark must have a sector return for all 3 periods, and an entry in index_used
    active_sectors = set()
    for bm in data.benchmarks.values():
        for s, w in bm.weights.items():
            if w != 0.0:
                active_sectors.add(s)
    for fund in data.funds:
        for s, w in fund.weights.items():
            if w != 0.0:
                active_sectors.add(s)

    for s in sorted(active_sectors):
        for p in PERIODS:
            if s not in data.sector_returns[p]:
                raise ValueError(f"Active sector '{s}' is missing a sector return for period '{p}'.")
        if s not in data.sector_returns.index_used:
            raise ValueError(f"Active sector '{s}' is missing an entry in index_used.")

    # 6. Fund ids must be unique; every fund's benchmark_id must exist in benchmarks
    seen_fund_ids = set()
    for fund in data.funds:
        if fund.id in seen_fund_ids:
            raise ValueError(f"Duplicate fund id '{fund.id}' found in funds.")
        seen_fund_ids.add(fund.id)

    for fund in data.funds:
        if fund.benchmark_id not in data.benchmarks:
            raise ValueError(f"Benchmark id '{fund.benchmark_id}' for fund '{fund.id}' does not exist in benchmarks.")

    # 7. Returns must contain all 3 periods; every number must be finite; a return cannot be below -100
    for p in PERIODS:
        for s, ret in data.sector_returns[p].items():
            if not isinstance(ret, (int, float)) or isinstance(ret, bool) or not math.isfinite(ret):
                raise ValueError(f"Return for sector '{s}' in period '{p}' must be a finite number.")
            if ret < -100.0:
                raise ValueError(f"Return for sector '{s}' in period '{p}' cannot be below -100%.")

    for bm_id, bm in data.benchmarks.items():
        for p in PERIODS:
            if p not in bm.returns:
                raise ValueError(f"Returns for benchmark '{bm_id}' must contain period '{p}'.")
            ret = bm.returns[p]
            if not isinstance(ret, (int, float)) or isinstance(ret, bool) or not math.isfinite(ret):
                raise ValueError(f"Return for benchmark '{bm_id}' in period '{p}' must be a finite number.")
            if ret < -100.0:
                raise ValueError(f"Return for benchmark '{bm_id}' in period '{p}' cannot be below -100%.")

    for fund in data.funds:
        for p in PERIODS:
            if p not in fund.returns:
                raise ValueError(f"Returns for fund '{fund.id}' must contain period '{p}'.")
            ret = fund.returns[p]
            if not isinstance(ret, (int, float)) or isinstance(ret, bool) or not math.isfinite(ret):
                raise ValueError(f"Return for fund '{fund.id}' in period '{p}' must be a finite number.")
            if ret < -100.0:
                raise ValueError(f"Return for fund '{fund.id}' in period '{p}' cannot be below -100%.")

    # 8. return_basis must be exactly {"6M": "absolute", "1Y": "absolute", "3Y": "annualised"}
    if data.return_basis != EXPECTED_RETURN_BASIS:
        raise ValueError("return_basis must be exactly {'6M': 'absolute', '1Y': 'absolute', '3Y': 'annualised'}.")


def load_explainer_data(path: Optional[Union[str, Path]] = None) -> ExplainerData:
    if path is None:
        file_path = DEFAULT_DATA_PATH
    else:
        file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(f"Explainer data file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            raw_data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in explainer data file: {e}")

    try:
        data = ExplainerData.model_validate(raw_data)
    except Exception as e:
        raise ValueError(f"Data schema validation failed: {e}")

    validate_explainer_data(data)
    return data


def list_funds(data: ExplainerData) -> list[dict]:
    result = []
    for fund in data.funds:
        bm = data.benchmarks.get(fund.benchmark_id)
        bm_name = bm.name if bm else ""
        result.append({
            "id": fund.id,
            "name": fund.name,
            "category": fund.category,
            "plan": fund.plan,
            "benchmark_name": bm_name,
            "periods": list(PERIODS),
            "as_of": data.as_of,
        })
    return result


def get_attribution_input(data: ExplainerData, fund_id: str, period: str) -> AttributionInput:
    fund = next((f for f in data.funds if f.id == fund_id), None)
    if fund is None:
        raise ValueError("Unknown fund.")

    if period not in PERIODS:
        raise ValueError("Unknown period.")

    benchmark = data.benchmarks[fund.benchmark_id]

    return AttributionInput(
        fund_return_pct=fund.returns[period],
        benchmark_return_pct=benchmark.returns[period],
        fund_weights=fund.weights,
        benchmark_weights=benchmark.weights,
        sector_returns=data.sector_returns[period],
    )
