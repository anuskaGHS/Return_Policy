from typing import List
from pydantic import BaseModel, Field

class SimulationRequest(BaseModel):
    monthly_sip: float = Field(
        ...,
        ge=1000.0,
        le=50000.0,
        description="Monthly Systematic Investment Plan (SIP) in INR (₹1,000 to ₹50,000)"
    )
    loan_emi: float = Field(
        ...,
        ge=0.0,
        le=100000.0,
        description="Total monthly loan EMIs in INR (₹0 to ₹1,00,000)"
    )
    loan_interest_rate: float = Field(
        ...,
        ge=5.0,
        le=15.0,
        description="Weighted average annual interest rate on loans in % (5.0% to 15.0%)"
    )
    annual_income: float = Field(
        ...,
        ge=300000.0,
        le=5000000.0,
        description="Gross annual household income in INR (₹3,00,000 to ₹50,00,000)"
    )

class DeterministicMetrics(BaseModel):
    monthly_income: float = Field(..., description="Monthly gross income in INR")
    emi_to_income_ratio_pct: float = Field(..., description="EMI as % of monthly income")
    sip_to_income_ratio_pct: float = Field(..., description="SIP investment as % of monthly income")
    five_year_sip_invested: float = Field(..., description="Total principal invested over 5 years (60 months)")
    five_year_sip_projected_wealth: float = Field(..., description="Projected future value at 12% CAGR over 5 years")
    five_year_sip_estimated_returns: float = Field(..., description="Net wealth gain over principal invested")
    annual_interest_burden_est: float = Field(..., description="Estimated annual interest outflow on loans")
    debt_risk_category: str = Field(..., description="Debt risk classification (Healthy, Moderate, Overleveraged)")

class ActionItem(BaseModel):
    bullet_number: int = Field(..., ge=1, le=3, description="Priority rank (1, 2, or 3)")
    title: str = Field(..., description="Concise rule / action title")
    action: str = Field(..., description="Actionable recommendation tailored to Indian retail personal finance")

class AIAssessment(BaseModel):
    financial_health_score: int = Field(..., ge=0, le=100, description="Overall health score (0-100)")
    rating_tier: str = Field(..., description="Tier label (e.g., Cautious Saver, Balanced Builder, Debt Heavy)")
    score_rationale: str = Field(..., description="Brief explanation linking debt load to wealth growth")
    priority_action_plan: List[ActionItem] = Field(..., description="3-bullet priority action plan")
    key_vulnerability: str = Field(..., description="Primary risk or drag on personal financial health")

class SimulationResponse(BaseModel):
    deterministic_metrics: DeterministicMetrics
    ai_assessment: AIAssessment
