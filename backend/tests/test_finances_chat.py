
from types import SimpleNamespace

from app.models.finances import ChatRequest, DashboardRequest
from app.services import finances_chat


def _dashboard_request():
    return DashboardRequest.model_validate({
        "income": {
            "monthly_gross_salary": 120000,
            "monthly_net_salary": 98000,
        }
    })


def _fake_response(answer):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=answer)
            )
        ]
    )


def test_chat_returns_ai_answer_with_verified_amount(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return _fake_response(
                        "Your annual gross income is ₹1,440,000."
                    )

    monkeypatch.setattr(finances_chat, "Groq", FakeGroq)

    request = ChatRequest(
        question="Explain my annual income",
        dashboard=_dashboard_request(),
    )

    result = finances_chat.answer_finances_chat(
        request, _dashboard_request()
    )

    assert result["ai_source"] == "ai"
    assert "1,440,000" in result["answer"]


def test_chat_rejects_unsupported_amount(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return _fake_response(
                        "Your annual gross income is ₹9,999,999."
                    )

    monkeypatch.setattr(finances_chat, "Groq", FakeGroq)

    request = ChatRequest(
        question="Explain my annual income",
        dashboard=_dashboard_request(),
    )

    result = finances_chat.answer_finances_chat(
        request, _dashboard_request()
    )

    assert result["ai_source"] == "fallback"
    assert "9,999,999" not in result["answer"]


def test_chat_refuses_unrelated_question_without_calling_ai(monkeypatch):
    def unexpected_call(**kwargs):
        raise AssertionError("AI should not be called")

    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                create = staticmethod(unexpected_call)

    monkeypatch.setattr(finances_chat, "Groq", FakeGroq)

    request = ChatRequest(question="Tell me a joke")

    result = finances_chat.answer_finances_chat(
        request, _dashboard_request()
    )

    assert result["ai_source"] == "fallback"


def test_chat_falls_back_when_ai_raises_error(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise RuntimeError("simulated provider failure")

    monkeypatch.setattr(finances_chat, "Groq", FakeGroq)

    request = ChatRequest(
        question="Explain my annual income",
        dashboard=_dashboard_request(),
    )

    result = finances_chat.answer_finances_chat(
        request, _dashboard_request()
    )

    assert result["ai_source"] == "fallback"
    assert result["answer"]


def test_chat_fallback_uses_hindi(monkeypatch):
    class FakeGroq:
        def __init__(self, **kwargs):
            pass

        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return _fake_response(
                        "Your annual gross income is ₹9,999,999."
                    )

    monkeypatch.setattr(finances_chat, "Groq", FakeGroq)

    request = ChatRequest(
        question="मेरी income समझाइए",
        language="hi",
    )

    result = finances_chat.answer_finances_chat(
        request, _dashboard_request()
    )

    assert result["ai_source"] == "fallback"
    assert "मैं" in result["answer"]
