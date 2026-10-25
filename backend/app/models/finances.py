
"""Pydantic models for the My Finances API."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SIPFields(StrictModel):
    monthly_sip_amount: float | None = Field(default=None, ge=0, le=1e12)
    invested_amount: float | None = Field(default=None, ge=0, le=1e12)
    current_value: float | None = Field(default=None, ge=0, le=1e12)
    fund_count: int | None = Field(default=None, ge=0, le=1200)
    months_invested: int | None = Field(default=None, ge=0, le=1200)


class LoanFields(StrictModel):
    outstanding_principal: float | None = Field(default=None, ge=0, le=1e12)
    emi_amount: float | None = Field(default=None, ge=0, le=1e12)
    interest_rate_pct: float | None = Field(default=None, ge=0, le=100)
    remaining_months: int | None = Field(default=None, ge=0, le=1200)


class TermPolicyFields(StrictModel):
    sum_assured: float | None = Field(default=None, ge=0, le=1e12)
    annual_premium: float | None = Field(default=None, ge=0, le=1e12)


class FDFields(StrictModel):
    principal_amount: float | None = Field(default=None, ge=0, le=1e12)
    interest_rate_pct: float | None = Field(default=None, ge=0, le=100)
    maturity_amount: float | None = Field(default=None, ge=0, le=1e12)
    maturity_date: date | None = None


class SalaryFields(StrictModel):
    monthly_gross_salary: float | None = Field(default=None, ge=0, le=1e12)
    monthly_net_salary: float | None = Field(default=None, ge=0, le=1e12)


DocumentType = Literal[
    "sip_statement",
    "loan_schedule",
    "term_policy",
    "fd_receipt",
    "salary_slip",
    "unknown",
]

DocumentStatus = Literal["read", "partial", "unreadable", "unsupported"]


class ExtractedDocument(StrictModel):
    index: int = Field(ge=0)
    file_name: str
    doc_type: DocumentType
    status: DocumentStatus
    fields: dict[str, float | int | date | None]
    message: str | None = None


class ExtractResponse(StrictModel):
    documents: list[ExtractedDocument]
    ai_source: Literal["ai", "fallback"]

# Dashboard request and response models

class SIPInput(StrictModel):
    monthly_sip_amount: float | None = Field(default=None, ge=0, le=1e12)
    invested_amount: float | None = Field(default=None, ge=0, le=1e12)
    current_value: float | None = Field(default=None, ge=0, le=1e12)
    fund_count: int | None = Field(default=None, ge=0, le=1200)
    months_invested: int | None = Field(default=None, ge=0, le=1200)


class LoanInput(StrictModel):
    outstanding_principal: float | None = Field(default=None, ge=0, le=1e12)
    emi_amount: float | None = Field(default=None, ge=0, le=1e12)
    interest_rate_pct: float | None = Field(default=None, ge=0, le=100)
    remaining_months: int | None = Field(default=None, ge=0, le=1200)


class InsuranceInput(StrictModel):
    sum_assured: float | None = Field(default=None, ge=0, le=1e12)
    annual_premium: float | None = Field(default=None, ge=0, le=1e12)


class FDInput(StrictModel):
    principal_amount: float | None = Field(default=None, ge=0, le=1e12)
    interest_rate_pct: float | None = Field(default=None, ge=0, le=100)
    maturity_amount: float | None = Field(default=None, ge=0, le=1e12)
    maturity_date: date | None = None


class IncomeInput(StrictModel):
    monthly_gross_salary: float | None = Field(default=None, ge=0, le=1e12)
    monthly_net_salary: float | None = Field(default=None, ge=0, le=1e12)


class DashboardUserInputs(StrictModel):
    sip_return_pct: float = Field(default=0, ge=0, le=100)
    emergency_months: int = Field(default=0, ge=0, le=60)
    long_term_pct: float = Field(default=0, ge=0, le=100)


class DashboardRequest(StrictModel):
    sip: SIPInput | None = None
    loan: LoanInput | None = None
    insurance: InsuranceInput | None = None
    fd: FDInput | None = None
    income: IncomeInput | None = None
    user_inputs: DashboardUserInputs = Field(default_factory=DashboardUserInputs)
    language: Literal["en", "hi"] = "en"


class HealthScoreResult(StrictModel):
    points: dict[str, int]
    score: int
    tier: str
    tier_hi: str


class DashboardCards(StrictModel):
    sip: dict[str, float | int | None] | None = None
    loan: dict[str, float | int | None] | None = None
    insurance: dict[str, float | int | None] | None = None
    fd: dict[str, float | int | str | None] | None = None
    income: dict[str, float | int | None] | None = None

class DashboardFinding(StrictModel):
    title: str
    title_hi: str

class DashboardResponse(StrictModel):
    health: HealthScoreResult | None
    annual_income: float | None
    suggested_cover: float | None
    cover_gap: float | None
    cards: DashboardCards
    missing: list[str]
    findings: list[DashboardFinding]
    links: list[str]
    ai_source: Literal["none"] = "none"

# Chat request and response models

from typing import Literal


class ChatTurn(StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=1000)



class ChatRequest(StrictModel):
    question: str = Field(min_length=1, max_length=500)
    history: list[ChatTurn] = Field(default_factory=list, max_length=6)
    language: Literal["en", "hi"] = "en"
    dashboard: DashboardRequest = Field(default_factory=DashboardRequest)


class ChatResponse(StrictModel):
    answer: str
    ai_source: Literal["ai", "fallback"]
