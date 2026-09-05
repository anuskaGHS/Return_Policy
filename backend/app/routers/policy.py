from fastapi import APIRouter, HTTPException
from app.models.policy import SimulationRequest, SimulationResponse
from app.services.calculator import calculate_deterministic_metrics
from app.services.groq_service import generate_ai_assessment
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
    2. Calls Groq llama3-8b-8192 (or fallback engine) to generate health score & 3-bullet action plan.
    """
    try:
        # Step 1: Run deterministic calculations
        deterministic_metrics = calculate_deterministic_metrics(request)

        # Step 2: Run AI assessment via Groq
        ai_assessment = generate_ai_assessment(request, deterministic_metrics)

        return SimulationResponse(
            deterministic_metrics=deterministic_metrics,
            ai_assessment=ai_assessment
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation processing failed: {str(e)}"
        )
