from fastapi import APIRouter, HTTPException
from app.models.policy import (
    SimulationRequest,
    SimulationResponse,
    ExitAnalysisRequest,
    ExitAnalysisResponse,
    LoanOptimizerRequest,
    LoanOptimizerResponse
)
from app.services.calculator import calculate_deterministic_metrics
from app.services.groq_service import generate_ai_assessment
from app.services.health_score import compute_health_score
from app.services.tax_engine import calculate_exit_analysis
from app.services.loan_optimizer import calculate_loan_vs_invest
from app.config import settings

router = APIRouter(prefix="/api", tags=["Policy & Wealth Simulation"])

@router.get("/health")
def health_check():
    """Health check endpoint to verify backend status and Groq readiness."""
    has_groq_key = bool(settings.GROQ_API_KEY.strip()) if settings.GROQ_API_KEY else False
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "groq_configured": has_groq_key,
        "groq_model": settings.GROQ_MODEL
    }

@router.post("/simulate", response_model=SimulationResponse)
def simulate_policy(request: SimulationRequest):
    """
    Simulates personal financial health:
    1. Computes deterministic metrics (5-year 12% CAGR SIP wealth, debt-to-income ratio).
    2. Computes pure health score across 5 weighted categories.
    3. Calls Groq llama3-8b-8192 (or fallback engine) to explain health score & generate 3-bullet action plan.
    """
    try:
        # Step 1: Run deterministic calculations
        deterministic_metrics = calculate_deterministic_metrics(request)

        # Step 2: Compute pure health score
        health_score = compute_health_score(
            monthly_sip=request.monthly_sip,
            loan_emi=request.loan_emi,
            loan_interest_rate=request.loan_interest_rate,
            annual_income=request.annual_income,
            sip_return_pct=request.sip_return_pct,
            term_cover=request.term_cover,
            emergency_months=request.emergency_months,
            long_term_pct=request.long_term_pct,
        )

        # Step 3: Run AI assessment via Groq explaining the computed health score
        ai_assessment = generate_ai_assessment(request, deterministic_metrics, health_score=health_score)

        return SimulationResponse(
            deterministic_metrics=deterministic_metrics,
            ai_assessment=ai_assessment,
            health_score=health_score
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation processing failed: {str(e)}"
        )

@router.post("/exit-analysis", response_model=ExitAnalysisResponse)
def get_exit_analysis(request: ExitAnalysisRequest):
    """
    Evaluates whether an investor should exit their mutual fund investment today or hold until the LTCG window.
    Calculates deterministic STCG vs LTCG tax, exit load penalty, days to window, and quantifiable savings.
    """
    try:
        return calculate_exit_analysis(req=request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Exit tax analysis failed: {str(e)}"
        )

@router.post("/loan-optimizer", response_model=LoanOptimizerResponse)
def optimize_loan(request: LoanOptimizerRequest):
    """
    Compares Strategy A (Prepay loan early, then invest freed EMI + surplus in equity SIP)
    vs Strategy B (Pay regular EMI, invest surplus in equity SIP for full tenure).
    Computes month-by-month reducing-balance loan amortization, compounding SIP wealth,
    Section 112A LTCG tax, terminal net wealth difference, and numerical break-even CAGR.
    """
    try:
        return calculate_loan_vs_invest(req=request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Loan optimizer simulation failed: {str(e)}"
        )


