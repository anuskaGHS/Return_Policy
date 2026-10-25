
"""API endpoints for the My Finances feature."""

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.finances import ExtractResponse, ExtractedDocument
from app.services.finances_detect import detect_document_type
from app.services.finances_extract import extract_financial_fields
from app.services.finances_pdf import extract_pdf_text

from app.models.finances import DashboardRequest, DashboardResponse
from app.services.finances_dashboard import build_finances_dashboard

from app.models.finances import ChatRequest, ChatResponse, DashboardRequest
from app.services.finances_chat import answer_finances_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/finances", tags=["My Finances"])

SUPPORTED_TYPES = {
    "sip_statement",
    "loan_schedule",
    "term_policy",
    "fd_receipt",
    "salary_slip",
}


def _message(status: str, language: str) -> str | None:
    messages = {
        "en": {
            "unknown": "We could not identify this document type.",
            "unreadable": "We could not read this PDF. Please try another file.",
            "partial": "Some financial fields could not be confirmed.",
            "read": "Document processed.",
        },
        "hi": {
            "unknown": "इस दस्तावेज़ का प्रकार पहचाना नहीं जा सका।",
            "unreadable": "यह PDF पढ़ी नहीं जा सकी। कृपया दूसरी फ़ाइल आज़माएँ।",
            "partial": "कुछ वित्तीय जानकारी की पुष्टि नहीं हो सकी।",
            "read": "दस्तावेज़ प्रोसेस किया गया।",
        },
    }
    return messages[language][status]


@router.post("/extract", response_model=ExtractResponse)
async def extract_finances(
    files: list[UploadFile] = File(...),
    language: str = Form("en"),
):
    """Read up to five PDFs and extract only approved financial fields."""
    if language not in {"en", "hi"}:
        raise HTTPException(
            status_code=422,
            detail="Language must be 'en' or 'hi'.",
        )

    if not 1 <= len(files) <= 5:
        raise HTTPException(
            status_code=422,
            detail="Upload between 1 and 5 PDF files.",
        )

    documents = []
    ai_sources = []

    for index, upload in enumerate(files):
        # Never log filenames or document contents.
        filename = upload.filename or "document.pdf"

        try:
            # Detect and filter are separated here because the PDF helper
            # currently returns a detected type and filtered text.
            doc_type, filtered_text = await extract_pdf_text(upload)

            if doc_type not in SUPPORTED_TYPES:
                documents.append(
                    ExtractedDocument(
                        index=index,
                        file_name=filename,
                        doc_type="unknown",
                        status="partial" if filtered_text else "unreadable",
                        fields={},
                        message=_message(
                            "unknown" if filtered_text else "unreadable",
                            language,
                        ),
                    )
                )
                continue

            fields, ai_source = extract_financial_fields(
                doc_type,
                filtered_text,
            )
            ai_sources.append(ai_source)

            status = (
                "read"
                if any(value is not None for value in fields.values())
                else "partial"
            )

            documents.append(
                ExtractedDocument(
                    index=index,
                    file_name=filename,
                    doc_type=doc_type,
                    status=status,
                    fields=fields,
                    message=_message(status, language),
                )
            )

        except HTTPException:
            raise

        except Exception:
            logger.warning("A finance document could not be processed.")
            documents.append(
                ExtractedDocument(
                    index=index,
                    file_name=filename,
                    doc_type="unknown",
                    status="unreadable",
                    fields={},
                    message=_message("unreadable", language),
                )
            )
        finally:
            await upload.close()

    ai_source = (
        "ai"
        if ai_sources and all(source == "ai" for source in ai_sources)
        else "fallback"
    )

    return ExtractResponse(
        documents=documents,
        ai_source=ai_source,
    )

@router.post("/dashboard", response_model=DashboardResponse)
async def finances_dashboard(request: DashboardRequest):
    """Calculate My Finances dashboard values without an AI call."""
    return build_finances_dashboard(request)


@router.post("/chat", response_model=ChatResponse)
async def finances_chat(request: ChatRequest):
    """Answer financial questions using server-recomputed dashboard figures."""
    result = answer_finances_chat(request, request.dashboard)
    return ChatResponse.model_validate(result)
