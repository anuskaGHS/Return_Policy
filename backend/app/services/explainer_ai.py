"""
Explainer AI Service.
Generates friendly natural language explanations (English and Hindi)
for a completed return attribution result using Groq LLM.
Never calculates, estimates, or alters any numbers.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional
from groq import Groq

from app.config import settings
from app.models.explainer import AttributionResult
from app.services.exit_ai import format_date_words, format_date_words_hi

logger = logging.getLogger(__name__)

PERIOD_EN = {"6M": "6 months", "1Y": "1 year", "3Y": "3 years"}
PERIOD_HI = {"6M": "6 महीने", "1Y": "1 साल", "3Y": "3 साल"}

SECTOR_HI = {
    "Financial Services": "वित्तीय सेवाएँ",
    "Automobile and Auto Components": "ऑटोमोबाइल और ऑटो कंपोनेंट्स",
    "Information Technology": "सूचना प्रौद्योगिकी (IT)",
    "FMCG": "FMCG",
    "Metals & Mining": "धातु और खनन",
    "Realty": "रियल एस्टेट",
    "Other sectors (estimated)": "अन्य सेक्टर (अनुमानित)",
}

SYSTEM_PROMPT = """You are a helpful Indian mutual fund analyst explaining a completed portfolio return attribution.
Follow these rules strictly:
1. You receive "key_points" (English) and "key_points_hi" (Hindi). They make the same points in the same order. Write "en" from key_points and "hi" from key_points_hi, each as a friendly explanation of 4 to 7 short sentences. Include every point, add nothing, drop nothing.
2. You are explaining a result that has ALREADY been calculated. NEVER give reasons, events, causes, news, predictions or advice. Never calculate or change a number; copy numbers exactly as written, with the same "-" sign.
3. No headings or bullets. Never mention any AI model, company or product name.
4. Hindi rules:
- Write "hi" ONLY from key_points_hi. Keep its words, spellings and sentence shapes.
- Keep the spellings used in key_points_hi: फ़ंड, फ़ायदा, नुक़सान, नक़द.
- Keep all numbers and digits as 0-9 only (never Devanagari digits).
5. Return ONLY JSON {"en": "...", "hi": "..."}.
"""

FORBIDDEN_MONEY_PATTERN = re.compile(r"\b(?:rs|inr|lakh|crore)\b", re.IGNORECASE)
FORBIDDEN_AI_PATTERN = re.compile(r"\b(?:groq|llama|gpt|openai|anthropic|claude)\b|\bai model\b", re.IGNORECASE)
DEVANAGARI_DIGIT_PATTERN = re.compile(r"[\u0966-\u096F]")
NUMBER_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")


def build_key_points(
    result: AttributionResult,
    fund_name: str,
    benchmark_name: str,
    period: str,
    portfolio_as_of: str,
) -> tuple[List[str], List[str]]:
    key_points: List[str] = []
    key_points_hi: List[str] = []

    fund_ret = f"{result.fund_return_pct:.1f}"
    bm_ret = f"{result.benchmark_return_pct:.1f}"
    gap = result.gap_pts
    abs_gap = f"{abs(gap):.1f}"
    p_en = PERIOD_EN.get(period, period)
    p_hi = PERIOD_HI.get(period, period)

    # 1. Point 1
    if period == "3Y":
        en_pt1_ret = f"Over the last {p_en}, {fund_name} returned {fund_ret}% a year and its benchmark, {benchmark_name}, returned {bm_ret}% a year."
        hi_pt1_ret = f"पिछले {p_hi} में {fund_name} ने {fund_ret}% सालाना रिटर्न दिया और उसके बेंचमार्क, {benchmark_name}, ने {bm_ret}% सालाना।"
    else:
        en_pt1_ret = f"Over the last {p_en}, {fund_name} returned {fund_ret}% and its benchmark, {benchmark_name}, returned {bm_ret}%."
        hi_pt1_ret = f"पिछले {p_hi} में {fund_name} ने {fund_ret}% रिटर्न दिया और उसके बेंचमार्क, {benchmark_name}, ने {bm_ret}%।"

    if gap < 0:
        en_pt1_dir = f" The fund finished {abs_gap} percentage points behind the benchmark."
        hi_pt1_dir = f" फ़ंड बेंचमार्क से {abs_gap} प्रतिशत अंक पीछे रहा।"
    elif gap > 0:
        en_pt1_dir = f" The fund finished {abs_gap} percentage points ahead of the benchmark."
        hi_pt1_dir = f" फ़ंड बेंचमार्क से {abs_gap} प्रतिशत अंक आगे रहा।"
    else:
        en_pt1_dir = " The fund finished level with the benchmark."
        hi_pt1_dir = " फ़ंड बेंचमार्क के बराबर रहा।"

    key_points.append(en_pt1_ret + en_pt1_dir)
    key_points_hi.append(hi_pt1_ret + hi_pt1_dir)

    # 2. Point 2: Drivers
    if result.top_drivers:
        for driver in result.top_drivers:
            sec = next(s for s in result.sectors if s.sector == driver)
            fw = f"{sec.fund_weight_pct:.1f}"
            bw = f"{sec.benchmark_weight_pct:.1f}"
            sr = f"{sec.sector_return_pct:.1f}"
            bm = f"{result.benchmark_return_pct:.1f}"
            eff = f"{abs(sec.effect_pts):.1f}"
            verb_en = "helped" if sec.effect_pts > 0 else "cost"
            verb_hi = "फ़ायदा हुआ" if sec.effect_pts > 0 else "नुक़सान हुआ"
            sec_hi = SECTOR_HI.get(sec.sector, sec.sector)

            key_points.append(
                f"{sec.sector}: the fund held {fw}% against the benchmark's {bw}%, and the sector returned {sr}% against the benchmark's {bm}%. That {verb_en} the fund about {eff} percentage points."
            )
            key_points_hi.append(
                f"{sec_hi}: फ़ंड में इसका हिस्सा {fw}% था, जबकि बेंचमार्क में {bw}%, और इस सेक्टर ने {sr}% रिटर्न दिया, जबकि बेंचमार्क ने {bm}%। इससे फ़ंड को लगभग {eff} प्रतिशत अंक {verb_hi}।"
            )
    else:
        if result.sectors:
            largest_sec = max(result.sectors, key=lambda s: abs(s.effect_pts))
            eff_val = abs(largest_sec.effect_pts)
            eff = f"{eff_val:.1f}"
            if eff == "0.0":
                key_points.append("No sector difference made a noticeable difference.")
                key_points_hi.append("सेक्टरों के किसी अंतर का कोई ख़ास असर नहीं दिखा।")
            else:
                verb_en = "helped" if largest_sec.effect_pts > 0 else "cost"
                verb_hi = "फ़ायदा हुआ" if largest_sec.effect_pts > 0 else "नुक़सान हुआ"
                sec_hi = SECTOR_HI.get(largest_sec.sector, largest_sec.sector)
                key_points.append(
                    f"No single sector was a big enough difference to explain the gap. The largest sector effect was {largest_sec.sector}, which {verb_en} the fund about {eff} percentage points."
                )
                key_points_hi.append(
                    f"कोई एक सेक्टर इतना बड़ा अंतर नहीं था कि इस फ़र्क़ को समझा सके। सबसे बड़ा असर {sec_hi} का रहा, जिससे फ़ंड को लगभग {eff} प्रतिशत अंक {verb_hi}।"
                )
        else:
            key_points.append("No sector difference made a noticeable difference.")
            key_points_hi.append("सेक्टरों के किसी अंतर का कोई ख़ास असर नहीं दिखा।")

    # 3. Point 3: Explained vs unexplained
    explained_str = f"{abs(result.explained_pts):.1f}"
    unexplained_str = f"{abs(result.unexplained_pts):.1f}"

    is_opposite = (result.gap_pts * result.explained_pts < 0)

    if not is_opposite:
        key_points.append(
            f"Sector mix accounts for about {explained_str} percentage points of the gap; about {unexplained_str} points are not explained by sector mix (for example, individual stock choices and cash held)."
        )
        key_points_hi.append(
            f"सेक्टर मिक्स से लगभग {explained_str} प्रतिशत अंक समझ आते हैं; बाक़ी लगभग {unexplained_str} प्रतिशत अंक सेक्टर मिक्स से नहीं समझे जा सकते (जैसे अलग-अलग शेयरों का चुनाव और रखा गया नक़द)।"
        )
    else:
        key_points.append(
            f"Sector mix pulled the other way by about {explained_str} percentage points; the rest of the gap comes from other things (for example, individual stock choices and cash held)."
        )
        key_points_hi.append(
            f"सेक्टर मिक्स ने उलटी दिशा में लगभग {explained_str} प्रतिशत अंक का असर डाला; बाक़ी फ़र्क़ दूसरी बातों से आता है (जैसे अलग-अलग शेयरों का चुनाव और रखा गया नक़द)।"
        )

    # 4. Point 4: As-of approximation
    date_en = format_date_words(portfolio_as_of)
    date_hi = format_date_words_hi(portfolio_as_of)
    key_points.append(
        f"Sector weights are based on the fund's holdings as of {date_en} and are applied to the whole period, so this is an approximation."
    )
    key_points_hi.append(
        f"सेक्टर वेट फ़ंड के {date_hi} के होल्डिंग्स पर आधारित हैं और पूरी अवधि पर लगाए गए हैं, इसलिए यह एक अनुमान है।"
    )

    # 5. Point 5: Estimated sector note
    has_estimated = any(
        "estimated" in s.sector.lower() and (s.fund_weight_pct != 0.0 or s.benchmark_weight_pct != 0.0)
        for s in result.sectors
    )
    if has_estimated:
        key_points.append("The 'Other sectors' group uses an estimated return.")
        key_points_hi.append("'अन्य सेक्टर' समूह का रिटर्न अनुमानित है।")

    # 6. Point 6: Disclaimer
    key_points.append("Past performance does not guarantee future returns.")
    key_points_hi.append("पिछला प्रदर्शन भविष्य के रिटर्न की गारंटी नहीं है।")

    return key_points, key_points_hi


def generate_explainer_text(
    result: AttributionResult,
    fund_name: str,
    benchmark_name: str,
    period: str,
    portfolio_as_of: str,
    language: str = "en",
) -> dict:
    key_points, key_points_hi = build_key_points(
        result=result,
        fund_name=fund_name,
        benchmark_name=benchmark_name,
        period=period,
        portfolio_as_of=portfolio_as_of,
    )

    fallback_response = {
        "en": " ".join(key_points),
        "hi": " ".join(key_points_hi),
        "source": "code",
        "key_points": key_points,
        "key_points_hi": key_points_hi,
    }

    if not getattr(settings, "GROQ_API_KEY", None):
        return fallback_response

    try:
        user_payload = {
            "key_points": key_points,
            "key_points_hi": key_points_hi,
        }
        user_message = json.dumps(user_payload, ensure_ascii=False)

        client = Groq(api_key=settings.GROQ_API_KEY, timeout=20.0)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=4000,
            reasoning_effort="low",
        )

        raw_json = chat_completion.choices[0].message.content if chat_completion.choices else None
        if not raw_json:
            logger.warning("Empty response received from Groq API.")
            return fallback_response

        try:
            data = json.loads(raw_json)
        except Exception as parse_err:
            logger.warning("Failed to parse Groq response JSON: %s", parse_err)
            return fallback_response

        en = data.get("en")
        hi = data.get("hi")

        # Guard 1: Non-empty strings
        if not isinstance(en, str) or not en.strip() or not isinstance(hi, str) or not hi.strip():
            logger.warning("Groq response missing non-empty 'en' or 'hi' strings.")
            return fallback_response

        # Guard 2: Numbers guard
        allowed_numbers = set()
        for pt in key_points + key_points_hi:
            allowed_numbers.update(NUMBER_PATTERN.findall(pt))

        for lang, text in [("en", en), ("hi", hi)]:
            found = NUMBER_PATTERN.findall(text)
            for n in found:
                if n not in allowed_numbers:
                    logger.warning("Number guard failed: '%s' in %s not in allowed numbers %s", n, lang, allowed_numbers)
                    return fallback_response

        # Guard 3: Hindi Devanagari digits guard
        if DEVANAGARI_DIGIT_PATTERN.search(hi):
            logger.warning("Devanagari digits guard failed in Hindi text.")
            return fallback_response

        # Guard 4: Forbidden AI terms guard
        for lang, text in [("en", en), ("hi", hi)]:
            if FORBIDDEN_AI_PATTERN.search(text):
                logger.warning("Forbidden AI term found in %s text.", lang)
                return fallback_response

        # Guard 5: Forbidden money terms guard
        for lang, text in [("en", en), ("hi", hi)]:
            if FORBIDDEN_MONEY_PATTERN.search(text):
                logger.warning("Forbidden money term found in %s text.", lang)
                return fallback_response

        same_text = " ".join(en.split()) == " ".join(fallback_response["en"].split()) and " ".join(hi.split()) == " ".join(fallback_response["hi"].split())
        return {
            "en": en,
            "hi": hi,
            "source": "code" if same_text else "ai",
            "key_points": key_points,
            "key_points_hi": key_points_hi,
        }

    except Exception as e:
        logger.warning("Error generating explainer text from Groq: %s. Falling back to code.", e)
        return fallback_response
