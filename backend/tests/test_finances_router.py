
from io import BytesIO
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.finances import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_extract_requires_at_least_one_file():
    response = client.post("/api/finances/extract", data={"language": "en"})

    assert response.status_code == 422


def test_extract_rejects_invalid_language():
    response = client.post(
        "/api/finances/extract",
        data={"language": "fr"},
        files=[
            ("files", ("sample.pdf", b"%PDF-1.4", "application/pdf"))
        ],
    )

    assert response.status_code == 422


def test_extract_rejects_more_than_five_files():
    files = [
        ("files", (f"sample{i}.pdf", b"%PDF-1.4", "application/pdf"))
        for i in range(6)
    ]

    response = client.post(
        "/api/finances/extract",
        data={"language": "en"},
        files=files,
    )

    assert response.status_code == 422


def test_unknown_document_returns_safe_result():
    with patch(
        "app.routers.finances.extract_pdf_text",
        new_callable=AsyncMock,
        return_value=("unknown", ""),
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("sample.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200
    document = response.json()["documents"][0]
    assert document["doc_type"] == "unknown"
    assert document["fields"] == {}


def test_known_document_uses_extraction_service():
    with (
        patch(
            "app.routers.finances.extract_pdf_text",
            new_callable=AsyncMock,
            return_value=(
                "loan_schedule",
                "EMI Amount: 48,000\nOutstanding Principal: 48,00,000",
            ),
        ),
        patch(
            "app.routers.finances.extract_financial_fields",
            return_value=(
                {
                    "outstanding_principal": 4800000,
                    "emi_amount": 48000,
                    "interest_rate_pct": None,
                    "remaining_months": None,
                },
                "ai",
            ),
        ),
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("loan.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200
    body = response.json()
    assert body["ai_source"] == "ai"
    assert body["documents"][0]["doc_type"] == "loan_schedule"
    assert body["documents"][0]["fields"]["emi_amount"] == 48000

def test_rejects_non_pdf_upload():
    response = client.post(
        "/api/finances/extract",
        data={"language": "en"},
        files=[
            ("files", ("notes.txt", b"not a PDF", "text/plain"))
        ],
    )

    assert response.status_code == 422


def test_falls_back_when_extraction_service_fails():
    with (
        patch(
            "app.routers.finances.extract_pdf_text",
            new_callable=AsyncMock,
            return_value=(
                "loan_schedule",
                "EMI Amount: 48,000",
            ),
        ),
        patch(
            "app.routers.finances.extract_financial_fields",
            return_value=(
                {
                    "outstanding_principal": None,
                    "emi_amount": None,
                    "interest_rate_pct": None,
                    "remaining_months": None,
                },
                "fallback",
            ),
        ),
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("loan.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200
    body = response.json()
    assert body["ai_source"] == "fallback"
    assert body["documents"][0]["status"] == "partial"


def test_unknown_document_text_is_not_sent_to_ai():
    with (
        patch(
            "app.routers.finances.extract_pdf_text",
            new_callable=AsyncMock,
            return_value=("unknown", ""),
        ),
        patch(
            "app.routers.finances.extract_financial_fields",
        ) as mock_extract,
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("sample.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200
    mock_extract.assert_not_called()

def test_rejects_pdf_over_5_mb():
    oversized_pdf = b"%PDF-" + b"x" * (5 * 1024 * 1024)

    response = client.post(
        "/api/finances/extract",
        data={"language": "en"},
        files=[
            (
                "files",
                ("large.pdf", oversized_pdf, "application/pdf"),
            )
        ],
    )

    assert response.status_code == 413

def test_rejects_pdf_with_more_than_10_pages():
    from io import BytesIO
    from pypdf import PdfWriter

    writer = PdfWriter()
    for _ in range(11):
        writer.add_blank_page(width=300, height=300)

    output = BytesIO()
    writer.write(output)
    pdf_bytes = output.getvalue()

    response = client.post(
        "/api/finances/extract",
        data={"language": "en"},
        files=[
            (
                "files",
                ("too_many_pages.pdf", pdf_bytes, "application/pdf"),
            )
        ],
    )

    assert response.status_code == 422

def test_router_passes_filtered_text_to_extraction_service():
    sensitive_text = (
        "Loan Schedule\n"
        "Customer Name: Test Person\n"
        "PAN: ABCDE1234F\n"
        "EMI Amount: 48,000\n"
        "Outstanding Principal: 48,00,000"
    )
    filtered_text = (
        "EMI Amount: 48,000\n"
        "Outstanding Principal: 48,00,000"
    )

    with (
        patch(
            "app.routers.finances.extract_pdf_text",
            new_callable=AsyncMock,
            return_value=("loan_schedule", filtered_text),
        ),
        patch(
            "app.routers.finances.extract_financial_fields",
            return_value=(
                {
                    "outstanding_principal": 4800000,
                    "emi_amount": 48000,
                    "interest_rate_pct": None,
                    "remaining_months": None,
                },
                "ai",
            ),
        ) as mock_extract,
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("loan.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200

    # The router should forward only the filtered text it receives
    # from the PDF service.
    mock_extract.assert_called_once_with("loan_schedule", filtered_text)

    passed_text = mock_extract.call_args.args[1]
    assert "Test Person" not in passed_text
    assert "ABCDE1234F" not in passed_text
    assert "48,000" in passed_text
    assert "48,00,000" in passed_text

def test_router_returns_only_allowed_fields_for_document_type():
    with (
        patch(
            "app.routers.finances.extract_pdf_text",
            new_callable=AsyncMock,
            return_value=(
                "loan_schedule",
                "EMI Amount: 48,000",
            ),
        ),
        patch(
            "app.routers.finances.extract_financial_fields",
            return_value=(
                {
                    "emi_amount": 48000,
                    "customer_name": "Test Person",
                },
                "ai",
            ),
        ),
    ):
        response = client.post(
            "/api/finances/extract",
            data={"language": "en"},
            files=[
                ("files", ("loan.pdf", b"%PDF-1.4", "application/pdf"))
            ],
        )

    assert response.status_code == 200
    fields = response.json()["documents"][0]["fields"]

    assert "customer_name" not in fields
    assert set(fields).issubset(
        {
            "outstanding_principal",
            "emi_amount",
            "interest_rate_pct",
            "remaining_months",
        }
    )

def test_chat_endpoint_accepts_valid_financial_question():
    with patch(
        "app.routers.finances.answer_finances_chat",
        return_value={
            "answer": "Your annual gross income is ₹1,440,000.",
            "ai_source": "ai",
        },
    ) as mock_chat:
        response = client.post(
            "/api/finances/chat",
            json={
                "question": "Explain my annual income",
                "language": "en",
                "dashboard": {
                    "income": {
                        "monthly_gross_salary": 120000,
                        "monthly_net_salary": 98000,
                    }
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["ai_source"] == "ai"
    assert "1,440,000" in body["answer"]
    mock_chat.assert_called_once()


def test_chat_endpoint_rejects_question_over_500_characters():
    response = client.post(
        "/api/finances/chat",
        json={
            "question": "income " * 100,
            "language": "en",
            "dashboard": {},
        },
    )

    assert response.status_code == 422


def test_chat_endpoint_rejects_more_than_six_history_turns():
    response = client.post(
        "/api/finances/chat",
        json={
            "question": "Explain my income",
            "language": "en",
            "history": [
                {"role": "user", "content": "income"}
                for _ in range(7)
            ],
            "dashboard": {},
        },
    )

    assert response.status_code == 422
