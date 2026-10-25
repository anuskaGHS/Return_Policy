
import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from pypdf import PdfWriter

from app.services.finances_pdf import extract_pdf_text

from reportlab.pdfgen import canvas

def make_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def make_upload(
    content: bytes,
    content_type: str = "application/pdf",
    filename: str = "sample.pdf",
) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers={"content-type": content_type},
    )


def run_extract(upload: UploadFile) -> tuple[str, str]:
    return asyncio.run(extract_pdf_text(upload))


def test_rejects_non_pdf_content_type():
    upload = make_upload(b"%PDF-1.4", "text/plain")

    with pytest.raises(HTTPException) as exc:
        run_extract(upload)

    assert exc.value.status_code == 422


def test_rejects_invalid_pdf_signature():
    upload = make_upload(b"not a PDF")

    with pytest.raises(HTTPException) as exc:
        run_extract(upload)

    assert exc.value.status_code == 422


def test_rejects_files_over_5_mb():
    upload = make_upload(b"%PDF-" + b"x" * (5 * 1024 * 1024))

    with pytest.raises(HTTPException) as exc:
        run_extract(upload)

    assert exc.value.status_code == 413


def test_rejects_more_than_10_pages():
    writer = PdfWriter()
    for _ in range(11):
        writer.add_blank_page(width=300, height=300)

    output = BytesIO()
    writer.write(output)

    upload = make_upload(output.getvalue())

    with pytest.raises(HTTPException) as exc:
        run_extract(upload)

    assert exc.value.status_code == 422


def test_accepts_pdf_without_extractable_text():
    upload = make_upload(make_pdf())

    doc_type, result = run_extract(upload)

    assert doc_type == "unknown"
    assert result == ""



def test_extracts_and_filters_financial_text():
    output = BytesIO()
    pdf = canvas.Canvas(output)
    pdf.drawString(50, 750, "Loan Schedule")
    pdf.drawString(50, 720, "EMI Amount: 48,000")
    pdf.drawString(50, 690, "Outstanding Principal: 48,00,000")
    pdf.drawString(50, 660, "Customer Name: Test Person")
    pdf.save()

    upload = make_upload(output.getvalue())

    doc_type, result = run_extract(upload)

    assert doc_type == "loan_schedule"
    assert "48,000" in result
    assert "48,00,000" in result
    assert "Test Person" not in result
