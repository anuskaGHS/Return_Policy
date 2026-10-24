from pydantic import BaseModel


class AttributionInput(BaseModel):
    fund_return_pct: float
    benchmark_return_pct: float
    fund_weights: dict[str, float]
    benchmark_weights: dict[str, float]
    sector_returns: dict[str, float]


class SectorEffect(BaseModel):
    sector: str
    fund_weight_pct: float
    benchmark_weight_pct: float
    active_weight_pct: float
    sector_return_pct: float
    relative_return_pct: float
    effect_pts: float


class AttributionResult(BaseModel):
    fund_return_pct: float
    benchmark_return_pct: float
    gap_pts: float
    explained_pts: float
    unexplained_pts: float
    sectors: list[SectorEffect]
    top_drivers: list[str]
