from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class Source(BaseModel):
    label: str
    url: str
    accessed_on: str


class SectorReturnsData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    m6: dict[str, float] = Field(alias="6M")
    y1: dict[str, float] = Field(alias="1Y")
    y3: dict[str, float] = Field(alias="3Y")
    index_used: dict[str, str]
    sources: list[Source]

    def __getitem__(self, period: str) -> dict[str, float]:
        if period == "6M":
            return self.m6
        elif period == "1Y":
            return self.y1
        elif period == "3Y":
            return self.y3
        raise KeyError(period)

    def __contains__(self, period: object) -> bool:
        return period in ("6M", "1Y", "3Y")

    def get(self, period: str, default=None):
        if period in self:
            return self[period]
        return default


class BenchmarkData(BaseModel):
    name: str
    weights: dict[str, float]
    weights_as_of: str
    returns: dict[str, float]
    sources: list[Source]


class FundData(BaseModel):
    id: str
    name: str
    category: str
    plan: str = "Direct Growth"
    benchmark_id: str
    weights: dict[str, float]
    portfolio_as_of: str
    returns: dict[str, float]
    sources: list[Source]
    notes: Optional[str] = None


class ExplainerData(BaseModel):
    schema_version: int = 1
    as_of: str
    return_basis: dict[str, str]
    sector_taxonomy: list[str]
    sector_returns: SectorReturnsData
    benchmarks: dict[str, BenchmarkData]
    funds: list[FundData]
