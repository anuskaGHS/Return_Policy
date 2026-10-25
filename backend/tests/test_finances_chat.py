
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

def test_finance_filter_accepts_english_sip_question():
    question = "How much am I investing in SIPs every month?"

    assert finances_chat.FINANCE_TERMS.search(question)


def test_finance_filter_accepts_hindi_insurance_question():
    question = "क्या मेरा जीवन बीमा कवर पर्याप्त है?"

    assert any(
        term in question
        for term in finances_chat.HINDI_FINANCE_TERMS
    )


def test_finance_filter_accepts_hindi_take_home_salary_question():
    question = "मेरी मासिक टेक-होम सैलरी कितनी है?"

    assert any(
        term in question
        for term in finances_chat.HINDI_FINANCE_TERMS
    )

def test_numeric_guard_accepts_supplied_amount_and_constants():
    figures = {
        "monthly_income": 100000,
        "monthly_income_formatted": "₹1,00,000",
        "calculation_constants": {
            "suggested_cover_income_multiplier": 10,
            "months_per_year": 12,
        },
    }

    answer = "A cover estimate uses 10 times income over 12 months."

    assert finances_chat._answer_numbers_are_allowed(answer, figures)


def test_numeric_guard_rejects_unsupported_amount():
    figures = {
        "monthly_income": 100000,
        "monthly_income_formatted": "₹1,00,000",
    }

    answer = "Your income is ₹9,99,999."

    assert not finances_chat._answer_numbers_are_allowed(answer, figures)

def test_format_indian_amount_uses_indian_grouping():
    assert finances_chat._format_indian_amount(535500) == "5,35,500"
    assert finances_chat._format_indian_amount(10000000) == "1,00,00,000"
    assert finances_chat._format_indian_amount(500) == "500"
    assert finances_chat._format_indian_amount(None) is None

def test_system_prompts_distinguish_insurance_cover_values():
    from app.services.finances_chat import SYSTEM_PROMPTS

    english = SYSTEM_PROMPTS["en"]
    hindi = SYSTEM_PROMPTS["hi"]

    for prompt in (english, hindi):
        assert "sum_assured" in prompt
        assert "suggested_cover" in prompt
        assert "cover_gap" in prompt

    assert "Never describe suggested_cover as the user's current cover." in english
    assert "कभी भी वर्तमान कवर न बताएं" in hindi