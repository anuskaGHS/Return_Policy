import json
import os
import sys
from unittest.mock import MagicMock, patch
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.explainer import AttributionResult, SectorEffect
from app.services.explainer_data import load_explainer_data, get_attribution_input
from app.services.explainer_engine import calculate_attribution
from app.services.explainer_ai import (
    generate_explainer_text,
    build_key_points,
)


def test_real_fund_key_points():
    data = load_explainer_data()
    attr_input = get_attribution_input(data, "kotak-large-cap-reg-g", "1Y")
    result = calculate_attribution(attr_input)

    res = generate_explainer_text(
        result=result,
        fund_name="Kotak Large Cap Fund",
        benchmark_name="Nifty 100 TRI",
        period="1Y",
        portfolio_as_of="2026-09-30",
    )

    en_pts = res["key_points"]
    hi_pts = res["key_points_hi"]

    assert len(en_pts) == 6
    assert len(hi_pts) == 6

    # Verify exact English key points
    assert en_pts[0] == (
        "Over the last 1 year, Kotak Large Cap Fund returned -5.4% and its benchmark, Nifty 100 TRI, returned -5.2%. "
        "The fund finished 0.3 percentage points behind the benchmark."
    )
    assert en_pts[1] == (
        "No single sector was a big enough difference to explain the gap. "
        "The largest sector effect was Metals & Mining, which cost the fund about 0.3 percentage points."
    )
    assert en_pts[2] == (
        "Sector mix accounts for about 0.1 percentage points of the gap; "
        "about 0.1 points are not explained by sector mix (for example, individual stock choices and cash held)."
    )
    assert en_pts[3] == (
        "Sector weights are based on the fund's holdings as of 30 September 2026 and are applied to the whole period, "
        "so this is an approximation."
    )
    assert en_pts[4] == "The 'Other sectors' group uses an estimated return."
    assert en_pts[5] == "Past performance does not guarantee future returns."

    # Verify exact Hindi key points 1 and 2
    assert hi_pts[0] == (
        "पिछले 1 साल में Kotak Large Cap Fund ने -5.4% रिटर्न दिया और उसके बेंचमार्क, Nifty 100 TRI, ने -5.2%। "
        "फ़ंड बेंचमार्क से 0.3 प्रतिशत अंक पीछे रहा।"
    )
    assert hi_pts[1] == (
        "कोई एक सेक्टर इतना बड़ा अंतर नहीं था कि इस फ़र्क़ को समझा सके। "
        "सबसे बड़ा असर धातु और खनन का रहा, जिससे फ़ंड को लगभग 0.3 प्रतिशत अंक नुक़सान हुआ।"
    )
    assert hi_pts[2] == (
        "सेक्टर मिक्स से लगभग 0.1 प्रतिशत अंक समझ आते हैं; "
        "बाक़ी लगभग 0.1 प्रतिशत अंक सेक्टर मिक्स से नहीं समझे जा सकते (जैसे अलग-अलग शेयरों का चुनाव और रखा गया नक़द)।"
    )
    assert hi_pts[3] == (
        "सेक्टर वेट फ़ंड के 30 सितंबर 2026 के होल्डिंग्स पर आधारित हैं और पूरी अवधि पर लगाए गए हैं, इसलिए यह एक अनुमान है।"
    )
    assert hi_pts[4] == "'अन्य सेक्टर' समूह का रिटर्न अनुमानित है।"
    assert hi_pts[5] == "पिछला प्रदर्शन भविष्य के रिटर्न की गारंटी नहीं है।"


def test_driver_case_helped():
    driver_res = AttributionResult(
        fund_return_pct=15.0,
        benchmark_return_pct=12.0,
        gap_pts=3.0,
        explained_pts=2.5,
        unexplained_pts=0.5,
        sectors=[
            SectorEffect(
                sector="Financial Services",
                fund_weight_pct=40.0,
                benchmark_weight_pct=30.0,
                active_weight_pct=10.0,
                sector_return_pct=25.0,
                relative_return_pct=13.0,
                effect_pts=2.5,
            ),
            SectorEffect(
                sector="Information Technology",
                fund_weight_pct=60.0,
                benchmark_weight_pct=70.0,
                active_weight_pct=-10.0,
                sector_return_pct=10.0,
                relative_return_pct=-2.0,
                effect_pts=0.0,
            ),
        ],
        top_drivers=["Financial Services"],
    )

    en_pts, hi_pts = build_key_points(
        result=driver_res,
        fund_name="Fund A",
        benchmark_name="Benchmark B",
        period="1Y",
        portfolio_as_of="2026-03-31",
    )

    assert en_pts[1] == (
        "Financial Services: the fund held 40.0% against the benchmark's 30.0%, and the sector returned 25.0% "
        "against the benchmark's 12.0%. That helped the fund about 2.5 percentage points."
    )
    assert hi_pts[1] == (
        "वित्तीय सेवाएँ: फ़ंड में इसका हिस्सा 40.0% था, जबकि बेंचमार्क में 30.0%, और इस सेक्टर ने 25.0% रिटर्न दिया, "
        "जबकि बेंचमार्क ने 12.0%। इससे फ़ंड को लगभग 2.5 प्रतिशत अंक फ़ायदा हुआ।"
    )


def test_ahead_case():
    res = AttributionResult(
        fund_return_pct=12.0,
        benchmark_return_pct=10.0,
        gap_pts=2.0,
        explained_pts=1.0,
        unexplained_pts=1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
    assert "The fund finished 2.0 percentage points ahead of the benchmark." in en_pts[0]
    assert "फ़ंड बेंचमार्क से 2.0 प्रतिशत अंक आगे रहा।" in hi_pts[0]


def test_level_case_gap_zero():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=10.0,
        gap_pts=0.0,
        explained_pts=0.0,
        unexplained_pts=0.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
    assert "The fund finished level with the benchmark." in en_pts[0]
    assert "फ़ंड बेंचमार्क के बराबर रहा।" in hi_pts[0]


def test_opposite_sign_case():
    res = AttributionResult(
        fund_return_pct=9.0,
        benchmark_return_pct=10.0,
        gap_pts=-1.0,
        explained_pts=0.5,
        unexplained_pts=-1.5,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
    assert en_pts[2] == (
        "Sector mix pulled the other way by about 0.5 percentage points; the rest of the gap comes from other things "
        "(for example, individual stock choices and cash held)."
    )
    assert hi_pts[2] == (
        "सेक्टर मिक्स ने उलटी दिशा में लगभग 0.5 प्रतिशत अंक का असर डाला; बाक़ी फ़र्क़ दूसरी बातों से आता है "
        "(जैसे अलग-अलग शेयरों का चुनाव और रखा गया नक़द)।"
    )


def test_3y_period_annualised_text():
    res = AttributionResult(
        fund_return_pct=12.5,
        benchmark_return_pct=10.0,
        gap_pts=2.5,
        explained_pts=1.0,
        unexplained_pts=1.5,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "3Y", "2026-03-31")
    assert "Over the last 3 years, Fund A returned 12.5% a year and its benchmark, Benchmark B, returned 10.0% a year." in en_pts[0]
    assert "पिछले 3 साल में Fund A ने 12.5% सालाना रिटर्न दिया और उसके बेंचमार्क, Benchmark B, ने 10.0% सालाना।" in hi_pts[0]


def test_no_groq_api_key_falls_back_to_code():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=10.0,
        gap_pts=0.0,
        explained_pts=0.0,
        unexplained_pts=0.0,
        sectors=[],
        top_drivers=[],
    )
    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", ""):
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"
        assert out["en"] == " ".join(out["key_points"])
        assert out["hi"] == " ".join(out["key_points_hi"])


def test_good_mocked_reply_returns_ai():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")

    mock_json = json.dumps({"en": " ".join(en_pts), "hi": " ".join(hi_pts)})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"
        assert out["en"] == " ".join(en_pts)


def test_guard_rejects_invented_number():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")

    # Includes invented number 99.9
    mock_json = json.dumps({"en": "Fund returned 99.9% in error.", "hi": " ".join(hi_pts)})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"


def test_guard_rejects_groq_mention():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")

    mock_json = json.dumps({"en": "According to Groq, the fund lost 2.0 percentage points.", "hi": " ".join(hi_pts)})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"


def test_guard_rejects_devanagari_digits():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")

    # Contains Devanagari digit २
    mock_json = json.dumps({"en": " ".join(en_pts), "hi": "फ़ंड ने २.० प्रतिशत दिया।"})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"


def test_guard_rejects_malformed_json():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Invalid JSON response {"))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"


def test_client_raising_exception_falls_back():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.side_effect = RuntimeError("Network timeout connecting to Groq")
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"


def test_mocked_reply_identical_to_key_points_returns_code():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
    mock_json = json.dumps({"en": " ".join(en_pts), "hi": " ".join(hi_pts)})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "code"
        assert out["en"] == " ".join(en_pts)


def test_mocked_reply_different_passes_guards_returns_ai():
    res = AttributionResult(
        fund_return_pct=10.0,
        benchmark_return_pct=12.0,
        gap_pts=-2.0,
        explained_pts=-1.0,
        unexplained_pts=-1.0,
        sectors=[],
        top_drivers=[],
    )
    en_pts, hi_pts = build_key_points(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
    reworded_en = (
        "During the period, Fund A returned 10.0% and Benchmark B had 12.0%. "
        "The gap was 2.0 percentage points. Sector mix covers 1.0 points, while 1.0 points are other factors. "
        "Approximated as of 31 March 2026. Past performance does not guarantee future returns."
    )
    reworded_hi = (
        "इस अवधि में Fund A ने 10.0% और Benchmark B ने 12.0% रिटर्न दिया। "
        "फ़र्क़ 2.0 प्रतिशत अंक रहा। सेक्टर मिक्स से 1.0 प्रतिशत अंक समझ आते हैं, जबकि 1.0 प्रतिशत अंक अन्य कारणों से हैं। "
        "31 March 2026 के अनुसार अनुमान। पिछला प्रदर्शन भविष्य के रिटर्न की गारंटी नहीं है।"
    )
    mock_json = json.dumps({"en": reworded_en, "hi": reworded_hi})

    with patch("app.services.explainer_ai.settings.GROQ_API_KEY", "fake-key"), \
         patch("app.services.explainer_ai.Groq") as mock_groq:
        client = mock_groq.return_value
        client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content=mock_json))
        ]
        out = generate_explainer_text(res, "Fund A", "Benchmark B", "1Y", "2026-03-31")
        assert out["source"] == "ai"
        assert out["en"] == reworded_en
        assert out["hi"] == reworded_hi
