from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

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
    language: str = Field(
        default="en",
        description="Language code for output: 'en' for English or 'hi' for Hindi"
    )
    sip_return_pct: float = Field(
        default=11.0,
        ge=0.0,
        le=25.0,
        description="Expected annual SIP return percentage (0.0% to 25.0%)"
    )
    term_cover: int = Field(
        default=5000000,
        ge=0,
        le=50000000,
        description="Term life insurance cover amount in INR (₹0 to ₹5,00,00,000)"
    )
    emergency_months: int = Field(
        default=3,
        ge=0,
        le=12,
        description="Emergency fund buffer in months of expenses (0 to 12)"
    )
    long_term_pct: float = Field(
        default=60.0,
        ge=0.0,
        le=100.0,
        description="Target allocation percentage for long-term investments (0.0% to 100.0%)"
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
    source: str = Field(default="fallback", description="'groq' when the text was written by the Groq LLM, 'fallback' when it came from the built-in fallback")

class HealthScorePoints(BaseModel):
    sip: int = Field(..., description="SIP score component points")
    loan: int = Field(..., description="Loan ratio score component points")
    ins: int = Field(..., description="Insurance adequacy component points")
    tax: int = Field(..., description="Tax efficiency component points")
    emg: int = Field(..., description="Emergency fund component points")

class HealthScoreResult(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Overall financial health score (0-100)")
    tier: str = Field(..., description="Financial health tier label")
    points: HealthScorePoints = Field(..., description="Component breakdown points")

class SimulationResponse(BaseModel):
    deterministic_metrics: DeterministicMetrics
    ai_assessment: AIAssessment
    health_score: Optional[HealthScoreResult] = None


class LockIn(BaseModel):
    locked: bool = Field(..., description="Whether units are currently locked in")
    days_left: int = Field(..., description="Days remaining until units unlock")
    unlock_date: str = Field(..., description="Date when units unlock in ISO format (YYYY-MM-DD)")
    cost_when_unlocked: float = Field(..., description="Total exit frictions once unlocked")
    net_when_unlocked: float = Field(..., description="Net in-hand proceeds once unlocked")


class ExitAnalysisRequest(BaseModel):
    investment_type: str = Field(
        default="Equity Fund",
        description="Type of investment: 'Equity Fund' or 'Debt Fund'"
    )
    amount_invested: Optional[float] = Field(
        default=None,
        description="Original invested principal amount in INR"
    )
    current_value: Optional[float] = Field(
        default=None,
        description="Current market value of the investment in INR"
    )
    holding_period_days: int = Field(
        ...,
        ge=0,
        description="Holding period of the investment in days"
    )
    fund_category: Optional[str] = Field(
        default=None,
        description="Specific fund category (e.g. Large Cap, Flexi Cap, Liquid Fund)"
    )
    exit_load_pct: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Custom exit load percentage. If omitted, default AMC standard tier applies."
    )
    applicable_slab_rate_pct: Optional[float] = Field(
        default=30.0,
        ge=0.0,
        le=45.0,
        description="Investor's marginal income tax slab rate % for debt fund gains (default: 30%)"
    )
    interest_rate_pct: Optional[float] = Field(
        default=None,
        description="Alternative risk-free interest rate percentage per annum"
    )

    @field_validator(
        "amount_invested",
        "current_value",
        "exit_load_pct",
        "applicable_slab_rate_pct",
        "interest_rate_pct",
        mode="before"
    )
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class ExitAnalysisResponse(BaseModel):
    valid: bool = Field(default=True, description="Input validity indicator")
    investment_type: str = Field(..., description="Normalized investment type (Equity Fund or Debt Fund)")
    fund_category: str = Field(..., description="Fund category evaluated")
    amount_invested: float = Field(..., description="Original investment amount in INR")
    current_value: float = Field(..., description="Current valuation in INR")
    holding_period_days: int = Field(..., description="Duration held in days")
    gain: float = Field(..., description="Total capital gain (or loss) in INR")
    gain_pct: float = Field(..., description="Percentage return on invested principal")
    is_gain: bool = Field(..., description="True if gain > 0")
    tax_type: str = Field(..., description="Applicable tax classification: 'STCG' or 'LTCG'")
    holding_status: str = Field(..., description="'Short-Term' or 'Long-Term'")
    tax_rate_applied_pct: float = Field(..., description="Statutory or slab tax rate % applied")
    current_tax: float = Field(..., description="Calculated tax liability if exiting today in INR")
    ltcg_exemption_applied: float = Field(..., description="Rupee amount of LTCG exemption utilized (up to ₹1,25,000)")
    exit_load_pct: float = Field(..., description="Applicable exit load %")
    exit_load_amount: float = Field(..., description="Exit load penalty in INR if exiting today")
    exit_load_is_assumed: bool = Field(..., description="Whether exit load was assumed rather than provided by user")
    total_cost_now: float = Field(..., description="Total exit frictions today = tax + exit load (INR)")
    net_inhand_now: float = Field(..., description="Net proceeds received if exiting today after tax & exit load")
    bought_before_apr_2023: bool = Field(..., description="Whether debt fund was acquired before 1 April 2023")
    days_to_ltcg_window: Optional[int] = Field(default=None, description="Days remaining until LTCG qualification (None if not applicable)")
    projected_tax_if_wait: float = Field(..., description="Projected tax if waiting until LTCG window (assuming flat valuation)")
    projected_exit_load_if_wait: float = Field(..., description="Projected exit load if waiting until LTCG window")
    total_cost_if_wait: float = Field(..., description="Total exit frictions after waiting = projected LTCG tax + exit load (INR)")
    net_inhand_if_wait: float = Field(..., description="Net proceeds received after waiting until LTCG window")
    potential_savings: float = Field(..., description="Net rupee savings gained by holding until LTCG window")
    tax_only_recommendation: str = Field(..., description="Tax-only recommendation before accounting for opportunity cost: 'Exit Now' or 'Hold'")
    interest_rate_pct: float = Field(..., description="Alternative interest rate % used for opportunity cost calculation")
    wait_days: Optional[int] = Field(default=None, description="Days to wait under consideration")
    interest_elsewhere: float = Field(..., description="Opportunity cost: estimated interest earned elsewhere while waiting")
    have_after_sell_today: Optional[float] = Field(default=None, description="Net in-hand today plus interest earned elsewhere")
    have_after_waiting: Optional[float] = Field(default=None, description="Net in-hand after waiting until LTCG window")
    net_advantage_of_waiting: Optional[float] = Field(default=None, description="Net financial advantage of waiting versus selling today")
    fall_limit_amount: Optional[float] = Field(default=None, description="Maximum rupee market decline before waiting becomes unprofitable")
    fall_limit_pct: Optional[float] = Field(default=None, description="Maximum percentage market decline before waiting becomes unprofitable")
    recommendation: str = Field(..., description="Actionable directive: 'Exit Now', 'Hold', or 'Locked'")
    better_pick: Optional[str] = Field(default=None, description="Better pick: 'wait', 'sell', or None if locked")
    lock_in: Optional[LockIn] = Field(default=None, description="ELSS lock-in details if applicable")
    recommendation_summary: str = Field(default="", description="Plain-language directive including days to wait and rupee savings")
    assumption_notes: List[str] = Field(default_factory=list, description="Explicit assumptions and flat-value caveats")
    rule_flags: List[str] = Field(default_factory=list, description="Statutory verification flags")
    ai_explanation_en: Optional[str] = Field(default=None, description="AI-generated plain language exit explanation in English")
    ai_explanation_hi: Optional[str] = Field(default=None, description="AI-generated plain language exit explanation in Hindi")
    ai_source: str = Field(default="fallback", description="'ai' when the explanation was written by the AI, 'fallback' when the page should use its own summary")


class LoanOptimizerRequest(BaseModel):
    outstanding_principal: float = Field(
        ...,
        gt=0.0,
        description="Outstanding loan balance in INR"
    )
    annual_interest_rate_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Annual loan interest rate in %"
    )
    remaining_tenure_months: int = Field(
        ...,
        gt=0,
        le=480,
        description="Remaining loan tenure in months"
    )
    monthly_surplus: float = Field(
        default=0.0,
        ge=0.0,
        description="Additional monthly surplus cash available for prepayment or investment in INR (default: 0)"
    )
    expected_equity_cagr_pct: float = Field(
        default=12.0,
        ge=0.0,
        le=100.0,
        description="Expected equity investment annual return (CAGR %) (default: 12.0%)"
    )


class LoanStrategyResult(BaseModel):
    strategy_name: str = Field(..., description="Name of the strategy: 'Prepay' or 'Invest'")
    loan_closure_month: int = Field(..., description="Month in which the loan balance is fully paid off")
    total_interest_paid: float = Field(..., description="Total interest paid across the loan tenure in INR")
    final_sip_corpus: float = Field(..., description="Total nominal value of the equity SIP corpus at the end of original tenure in INR")
    ltcg_tax: float = Field(..., description="Long Term Capital Gains tax payable on single redemption at end of tenure in INR")
    net_wealth: float = Field(..., description="Net terminal wealth in INR (final SIP corpus minus LTCG tax)")


class LoanOptimizerResponse(BaseModel):
    strategy_a: LoanStrategyResult = Field(..., description="Strategy A: Prepay loan aggressively, then invest freed EMI + surplus in SIP")
    strategy_b: LoanStrategyResult = Field(..., description="Strategy B: Pay regular EMI, invest surplus in SIP for full tenure")
    net_wealth_difference: float = Field(..., description="Absolute difference in net terminal wealth between the two strategies in INR")
    recommendation: str = Field(..., description="Recommended strategy: 'Prepay' or 'Invest'")
    break_even_cagr: float = Field(..., description="Break-even equity CAGR % where both strategies yield equal net terminal wealth")
    break_even_cagr_pct: Optional[float] = Field(default=None, description="Alias for break_even_cagr")
    notes: List[str] = Field(default_factory=list, description="Simplifications and statutory rules applied")
    notes_hi: List[str] = Field(default_factory=list, description="Hindi explanations of the same six assumptions")
    key_points: List[str] = Field(default_factory=list, description="Plain-language comparison highlights in English")
    key_points_hi: List[str] = Field(default_factory=list, description="Hindi translations of the comparison highlights")


