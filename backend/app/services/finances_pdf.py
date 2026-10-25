
"""In-memory PDF validation and text extraction for My Finances."""

from io import BytesIO

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

from app.services.finances_privacy import build_ai_input
from app.services.finances_detect import detect_document_type

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PAGES = 10


async def extract_pdf_text(
    file: UploadFile,
) -> tuple[str, str]:
    """Validate a PDF, extract its text in memory, and filter it for AI use.

    No uploaded file is written to disk. The returned text is filtered
    for privacy and limited to relevant financial lines.
    """
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type != "application/pdf":
        raise HTTPException(
            status_code=422,
            detail="Please upload a PDF file only.",
        )

    content = await file.read(MAX_FILE_BYTES + 1)

    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Each PDF must be 5 MB or smaller.",
        )

    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=422,
            detail="The uploaded file is not a valid PDF.",
        )

    try:
        reader = PdfReader(BytesIO(content), strict=True)

        if reader.is_encrypted:
            raise HTTPException(
                status_code=422,
                detail="Password-protected PDFs are not supported.",
            )

        if len(reader.pages) > MAX_PAGES:
            raise HTTPException(
                status_code=422,
                detail="Each PDF must contain no more than 10 pages.",
            )

        extracted_pages = []
        for page in reader.pages:
            extracted_pages.append(page.extract_text() or "")

        raw_text = "\n".join(extracted_pages)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="This PDF could not be read. Please try another PDF.",
        ) from None

    if not raw_text.strip():
        return "unknown", ""

    doc_type = detect_document_type(raw_text)

    if doc_type == "unknown":
        return "unknown", ""

    filtered_text = build_ai_input(raw_text, doc_type)

    return doc_type, filtered_text
