import logging
from fastapi import APIRouter, HTTPException

from app.models.explainer_api import ExplainerAnalyzeRequest
from app.services import explainer_service
from app.services.explainer_data import list_funds

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/explainer", tags=["Return Explainer"])


@router.get("/funds")
def get_funds():
    try:
        data = explainer_service.get_data()
    except (FileNotFoundError, ValueError) as e:
        logger.error("Failed to load explainer data: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The Explainer data is not available right now.",
        )
    except Exception as e:
        logger.error("Unexpected error loading explainer data: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The Explainer data is not available right now.",
        )

    return {
        "as_of": data.as_of,
        "funds": list_funds(data),
    }


@router.post("/analyze")
def analyze(request: ExplainerAnalyzeRequest):
    # Verify data availability first
    try:
        explainer_service.get_data()
    except (FileNotFoundError, ValueError) as e:
        logger.error("Failed to load explainer data: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The Explainer data is not available right now.",
        )
    except Exception as e:
        logger.error("Unexpected error loading explainer data: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The Explainer data is not available right now.",
        )

    try:
        return explainer_service.analyze(
            fund_id=request.fund_id,
            period=request.period,
            language=request.language,
        )
    except ValueError as e:
        msg = str(e)
        if msg == "Unknown fund.":
            raise HTTPException(status_code=404, detail="Unknown fund.")
        if msg in ("This period is not available yet.", "Unknown period."):
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    except Exception as e:
        logger.error("Unexpected error analyzing fund: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")
