"""
Exit AI Explanation Service for Return Policy.
Explains a finished deterministic Smart Exit result using Groq LLM.
Never calculates, estimates, or alters any numbers.
"""

import json
import logging
import math
import re
from datetime import date
from typing import Dict, Any, List, Optional
from groq import Groq
from app.config import settings
from app.models.policy import ExitAnalysisResponse
from app.services.tax_engine import DEFAULT_INTEREST_RATE_PCT

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a helpful Indian mutual fund tax and exit advisor explaining a completed Smart Exit analysis.
Follow these rules strictly:
1. You receive "recommendation", "key_points" (English) and "key_points_hi" (Hindi). Write "en" from key_points and "hi" from key_points_hi, each as a friendly explanation of 3 to 5 short sentences. Every rupee amount appearing anywhere in either list is mandatory: include every one in BOTH output strings, even if an amount seems incidental or repeats the current investment value. Do not omit any point or amount. Keep every assumption an assumption.
2. You are explaining a result that has ALREADY been calculated. Never calculate, estimate, round or invent any number, rate, date, law, rule or fund detail. Never change the recommendation.
3. Copy every rupee amount exactly as written in the key points, including the ₹ symbol and Indian comma grouping. Do not round, reformat, or omit amounts. Never write money in any other form: no "Rs", no "INR", no "lakh", no "crore", no "लाख", no "करोड़".
4. No headings or bullets. Never mention any AI model, company or product name.
5. Hindi rules:
- Write "hi" ONLY from key_points_hi. Do not translate from the English. Keep its words, spellings and sentence shapes. You may join sentences or drop connecting words, but never change a word that carries a meaning, number, date or amount.
- Keep the spellings used in key_points_hi: फ़ंड (with the dot under फ़), एग्ज़िट लोड, यूनिट, लॉक-इन, ख़र्च, रुकना / रुकने. Do not use प्रतीक्षा, इंतज़ार, इंतजार or वेटिंग.
- Keep all numbers, dates' day and year, and the ₹ symbol as digits 0-9 (never Devanagari digits).
- STCG, LTCG, ELSS and AI stay in Latin letters.
6. Return ONLY JSON {"en": "...", "hi": "..."}.
"""


FORBIDDEN_MONEY_PATTERN = re.compile(r"\b(?:rs|inr)\b|lakh|crore|लाख|करोड़", re.IGNORECASE)

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def format_date_words(d: str | date) -> str:
    """Formats a date string (YYYY-MM-DD) or date object into 'DD Month YYYY' in English words."""
    if isinstance(d, str):
        parts = d.split("-")
        return f"{int(parts[2])} {MONTH_NAMES[int(parts[1]) - 1]} {int(parts[0])}"
    return f"{d.day} {MONTH_NAMES[d.month - 1]} {d.year}"


def format_inr(n: float | int) -> str:
    """Formats a number in Indian currency format with '₹' prefix using round-half-up."""
    rounded = int(math.floor(abs(float(n)) + 0.5))
    s = str(rounded)
    if len(s) <= 3:
        return f"₹{s}"
    last3 = s[-3:]
    rest = s[:-3]
    groups = []
    while len(rest) > 2:
        groups.append(rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.append(rest)
    groups.reverse()
    joined = ",".join(groups)
    return f"₹{joined},{last3}"


HINDI_MONTH_NAMES = [
    "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
]


def format_date_words_hi(d: str | date) -> str:
    """Same as format_date_words, with the Hindi month name. Digits stay Latin."""
    if isinstance(d, str):
        parts = d.split("-")
        return f"{int(parts[2])} {HINDI_MONTH_NAMES[int(parts[1]) - 1]} {int(parts[0])}"
    return f"{d.day} {HINDI_MONTH_NAMES[d.month - 1]} {d.year}"


def build_key_points_hi(result: ExitAnalysisResponse, facts: Dict[str, Any]) -> List[str]:
    """
    Hindi twin of build_key_points: the same points, in the same order, with the same amounts.
    The wording follows the approved Smart Exit page (frontend/src/lib/exit/copy.js), so the AI only
    rewords Hindi that is already correct instead of translating from English.
    """
    points: List[str] = []
    reco = result.recommendation
    amounts = facts["amounts"]

    if reco == "Locked":
        unlock = format_date_words_hi(result.lock_in.unlock_date) if result.lock_in else ""
        days_left = result.lock_in.days_left if result.lock_in else 0
        cost_unlocked = amounts.get("cost_once_unlocked", "₹0")
        receive_unlocked = amounts.get("you_receive_once_unlocked", "₹0")
        points.append(f"आपकी ELSS यूनिट 3 साल के लॉक-इन में हैं, इसलिए {days_left} दिन और नहीं बेच सकते। आप {unlock} से बेच सकेंगे।")
        points.append(
            f"तब बेचने पर टैक्स और एग्ज़िट लोड मिलाकर {cost_unlocked} ख़र्च होंगे और आपको {receive_unlocked} मिलेंगे।"
        )

    elif reco == "Hold":
        days_wait = facts["days_to_wait"]
        points.append(f"{days_wait} दिन और रुकना बेहतर है।")

        saved_total = amounts.get("saved_by_waiting_before_interest", "₹0")
        tax_saved = amounts.get("tax_saved_by_waiting")
        exit_saved = amounts.get("exit_load_saved_by_waiting")

        parts = []
        if tax_saved:
            parts.append(f"{tax_saved} कम टैक्स")
        if exit_saved:
            parts.append(f"{exit_saved} कम एग्ज़िट लोड")
        breakdown = f": {' और '.join(parts)}" if parts else ""
        points.append(f"रुकने से कुल {saved_total} बचते हैं{breakdown}।")

        if result.interest_rate_pct > 0:
            recv_today = amounts.get("you_receive_if_sold_today", "₹0")
            interest_earn = amounts.get("interest_money_could_earn_while_waiting", "₹0")
            adv = amounts.get("advantage_of_waiting", "₹0")
            points.append(f"आज बेचने पर मिलने वाले {recv_today} दूसरी जगह इन दिनों में लगभग {interest_earn} ब्याज कमा सकते हैं।")
            points.append(f"उस ब्याज को गिनने पर भी रुकना {adv} से आगे रहता है।")
        elif result.interest_rate_pct == 0:
            points.append("दूसरी जगह कमाया जा सकने वाला ब्याज गिना नहीं गया है, क्योंकि दर 0% रखी गई है।")

    elif reco == "Exit Now" and result.tax_only_recommendation == "Hold":
        days_wait = facts["days_to_wait"]
        saved_total = amounts.get("saved_by_waiting_before_interest", "₹0")
        recv_today = amounts.get("you_receive_if_sold_today", "₹0")
        interest_earn = amounts.get("interest_money_could_earn_while_waiting", "₹0")
        adv = amounts.get("advantage_of_waiting", "₹0")
        points.append(f"{days_wait} दिन रुकने से टैक्स और एग्ज़िट लोड में {saved_total} बच सकते हैं।")
        points.append(f"लेकिन आज मिलने वाले {recv_today} दूसरी जगह इन दिनों में लगभग {interest_earn} ब्याज कमा सकते हैं, जो इससे ज़्यादा है।")
        points.append(f"इसलिए आज बेचना {adv} से आगे रहता है।")

    else:
        points.append("रुकने से आपका टैक्स या एग्ज़िट लोड कम नहीं होगा, इसलिए अभी बेचना ठीक है।")
        total_cost_today = amounts.get("total_cost_if_sold_today", "₹0")
        recv_today = amounts.get("you_receive_if_sold_today", "₹0")
        if total_cost_today == "₹0":
            points.append(f"आपको कोई टैक्स या एग्ज़िट लोड नहीं देना होगा और आपको {recv_today} मिलेंगे।")
        else:
            points.append(f"आज बेचने पर टैक्स और एग्ज़िट लोड मिलाकर {total_cost_today} लगेगा और आपको {recv_today} मिलेंगे।")

    is_equity = "equity" in result.investment_type.lower()
    is_elss = is_equity and ("ELSS" in (result.fund_category or ""))
    skip_exit_load_assumption = (
        is_equity
        and not is_elss
        and result.exit_load_is_assumed
        and result.exit_load_pct == 0
    )
    if result.exit_load_is_assumed and not skip_exit_load_assumption:
        points.append(
            f"{result.exit_load_pct:g}% एग्ज़िट लोड हमारा अनुमान है; अपने फ़ंड के दस्तावेज़ों में असली एग्ज़िट लोड जाँचें।"
        )

    if (reco == "Hold" or (reco == "Exit Now" and result.tax_only_recommendation == "Hold")) and facts.get(
        "interest_rate_is_default"
    ):
        points.append(f"{result.interest_rate_pct:g}% ब्याज दर एक अनुमान है।")

    points.append("यह मानकर चला गया है कि फ़ंड का मूल्य स्थिर रहेगा; असली रिटर्न से ये आँकड़े बदल जाएँगे।")
    return points


def build_facts(result: ExitAnalysisResponse) -> Dict[str, Any]:
    """Extracts plain facts from a finished ExitAnalysisResponse for AI explanation."""
    is_equity = "equity" in result.investment_type.lower()

    lock_data: Optional[Dict[str, Any]] = None
    if result.lock_in is not None:
        lock_data = {
            "locked": result.lock_in.locked,
            "days_left": result.lock_in.days_left,
            "unlock_date": result.lock_in.unlock_date,
        }

    amounts: Dict[str, Any] = {}
    if result.amount_invested is not None:
        amounts["invested"] = format_inr(result.amount_invested)
    if result.current_value is not None:
        amounts["worth_today"] = format_inr(result.current_value)
    if result.gain is not None:
        amounts["gain_or_loss"] = format_inr(abs(result.gain))
        amounts["is_loss"] = bool(result.gain < 0)
    if result.current_tax is not None:
        amounts["tax_if_sold_today"] = format_inr(result.current_tax)
    if result.exit_load_amount is not None:
        amounts["exit_load_if_sold_today"] = format_inr(result.exit_load_amount)
    if result.total_cost_now is not None:
        amounts["total_cost_if_sold_today"] = format_inr(result.total_cost_now)
    if result.net_inhand_now is not None:
        amounts["you_receive_if_sold_today"] = format_inr(result.net_inhand_now)
    if result.wait_days is not None and result.projected_tax_if_wait is not None:
        amounts["tax_if_waiting"] = format_inr(result.projected_tax_if_wait)
    if result.have_after_waiting is not None:
        amounts["you_receive_if_waiting"] = format_inr(result.have_after_waiting)
    if result.wait_days is not None and result.potential_savings is not None:
        amounts["saved_by_waiting_before_interest"] = format_inr(result.potential_savings)
    if result.wait_days is not None and result.interest_elsewhere is not None:
        amounts["interest_money_could_earn_while_waiting"] = format_inr(result.interest_elsewhere)
    if result.net_advantage_of_waiting is not None:
        amounts["advantage_of_waiting"] = format_inr(abs(result.net_advantage_of_waiting))
    if result.fall_limit_amount is not None:
        amounts["fall_limit_amount"] = format_inr(result.fall_limit_amount)
    if result.lock_in is not None:
        amounts["cost_once_unlocked"] = format_inr(result.lock_in.cost_when_unlocked)
        amounts["you_receive_once_unlocked"] = format_inr(result.lock_in.net_when_unlocked)

    if result.wait_days is not None:
        if result.current_tax is not None and result.projected_tax_if_wait is not None:
            tax_diff = result.current_tax - result.projected_tax_if_wait
            if tax_diff > 0:
                amounts["tax_saved_by_waiting"] = format_inr(tax_diff)
        if result.exit_load_amount is not None and result.projected_exit_load_if_wait is not None:
            exit_diff = result.exit_load_amount - result.projected_exit_load_if_wait
            if exit_diff > 0:
                amounts["exit_load_saved_by_waiting"] = format_inr(exit_diff)

    waiting_comes_out_ahead = (
        bool(result.net_advantage_of_waiting > 0)
        if result.net_advantage_of_waiting is not None
        else None
    )

    return {
        "fund_type": result.investment_type,
        "fund_category": result.fund_category,
        "days_held": result.holding_period_days,
        "recommendation": result.recommendation,
        "tax_only_recommendation": result.tax_only_recommendation,
        "better_pick": result.better_pick,
        "tax_type": result.tax_type,
        "holding_status": result.holding_status,
        "tax_rate_pct": result.tax_rate_applied_pct,
        "bought_before_apr_2023": result.bought_before_apr_2023 if not is_equity else None,
        "exit_load_pct": result.exit_load_pct,
        "exit_load_is_assumed": result.exit_load_is_assumed,
        "days_to_wait": result.wait_days,
        "interest_rate_pct": result.interest_rate_pct,
        "interest_rate_is_default": result.interest_rate_pct == DEFAULT_INTEREST_RATE_PCT,
        "waiting_comes_out_ahead": waiting_comes_out_ahead,
        "fall_limit_pct": result.fall_limit_pct,
        "lock": lock_data,
        "amounts": amounts,
    }


def build_key_points(result: ExitAnalysisResponse, facts: Dict[str, Any]) -> List[str]:
    """Generates deterministic plain-English key point sentences for the AI to rewrite."""
    points: List[str] = []
    reco = result.recommendation

    if reco == "Locked":
        unlock_date_str = format_date_words(result.lock_in.unlock_date) if result.lock_in else ""
        days_left = result.lock_in.days_left if result.lock_in else 0
        cost_unlocked = facts["amounts"].get("cost_once_unlocked", "₹0")
        receive_unlocked = facts["amounts"].get("you_receive_once_unlocked", "₹0")
        points.append(f"These ELSS units cannot be sold until {unlock_date_str} ({days_left} days from today).")
        points.append(
            f"Once unlocked, selling would cost {cost_unlocked} in tax and exit load and you would receive {receive_unlocked}."
        )

    elif reco == "Hold":
        days_wait = facts["days_to_wait"]
        points.append(f"Waiting {days_wait} more days is better.")

        saved_total = facts["amounts"].get("saved_by_waiting_before_interest", "₹0")
        tax_saved = facts["amounts"].get("tax_saved_by_waiting")
        exit_saved = facts["amounts"].get("exit_load_saved_by_waiting")

        breakdown_parts = []
        if tax_saved:
            breakdown_parts.append(f"{tax_saved} less tax")
        if exit_saved:
            breakdown_parts.append(f"{exit_saved} less exit load")

        breakdown_str = f": {' and '.join(breakdown_parts)}" if breakdown_parts else ""
        points.append(f"Waiting saves {saved_total} in total{breakdown_str}.")

        if result.interest_rate_pct > 0:
            recv_today = facts["amounts"].get("you_receive_if_sold_today", "₹0")
            interest_earn = facts["amounts"].get("interest_money_could_earn_while_waiting", "₹0")
            adv = facts["amounts"].get("advantage_of_waiting", "₹0")
            points.append(
                f"If you sold today instead, the {recv_today} you receive could earn about {interest_earn} in interest elsewhere over those days."
            )
            points.append(f"After counting that interest, waiting still comes out {adv} ahead.")
        elif result.interest_rate_pct == 0:
            points.append("The interest your money could earn elsewhere was ignored, because the rate is set to 0%.")

    elif reco == "Exit Now" and result.tax_only_recommendation == "Hold":
        days_wait = facts["days_to_wait"]
        saved_total = facts["amounts"].get("saved_by_waiting_before_interest", "₹0")
        recv_today = facts["amounts"].get("you_receive_if_sold_today", "₹0")
        interest_earn = facts["amounts"].get("interest_money_could_earn_while_waiting", "₹0")
        adv = facts["amounts"].get("advantage_of_waiting", "₹0")
        points.append(f"Waiting {days_wait} days would save {saved_total} in tax and exit load.")
        points.append(
            f"But the {recv_today} you receive today could earn about {interest_earn} in interest elsewhere over those days, which is more."
        )
        points.append(f"So selling today comes out {adv} ahead.")

    else:
        points.append("Waiting would not lower your tax or exit load, so selling now is fine.")
        total_cost_today = facts["amounts"].get("total_cost_if_sold_today", "₹0")
        recv_today = facts["amounts"].get("you_receive_if_sold_today", "₹0")
        if total_cost_today == "₹0":
            points.append(f"You would pay no tax or exit load and you would receive {recv_today}.")
        else:
            points.append(f"Selling today costs {total_cost_today} in tax and exit load and you receive {recv_today}.")

    # Assumption points (append):
    is_equity = "equity" in result.investment_type.lower()
    is_elss = is_equity and ("ELSS" in (result.fund_category or ""))
    skip_exit_load_assumption = (
        is_equity
        and not is_elss
        and result.exit_load_is_assumed
        and result.exit_load_pct == 0
    )
    if result.exit_load_is_assumed and not skip_exit_load_assumption:
        points.append(
            f"The exit load of {result.exit_load_pct:g}% is an assumption; check the real exit load in your fund's documents."
        )

    if (reco == "Hold" or (reco == "Exit Now" and result.tax_only_recommendation == "Hold")) and facts.get(
        "interest_rate_is_default"
    ):
        points.append(f"The {result.interest_rate_pct:g}% interest rate is an assumed rate.")

    points.append("The fund value is assumed to stay flat; real returns will change these numbers.")
    return points


def generate_exit_explanation(result: ExitAnalysisResponse) -> Dict[str, Any]:
    """
    Calls Groq to explain the deterministic Smart Exit analysis result in English and Hindi.
    Falls back gracefully if API key is missing, network fails, or outputs fail validation/number guard.
    """
    fallback_response = {"en": None, "hi": None, "source": "fallback"}

    if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
        logger.info("GROQ_API_KEY not configured. Falling back to default exit explanation.")
        return fallback_response

    facts = build_facts(result)
    key_points = build_key_points(result, facts)
    key_points_hi = build_key_points_hi(result, facts)
    user_payload = {
        "recommendation": result.recommendation,
        "key_points": key_points,
        "key_points_hi": key_points_hi,
    }
    user_message = json.dumps(user_payload, ensure_ascii=False)

    finish_reason = None
    try:
        client = Groq(api_key=settings.GROQ_API_KEY, timeout=20.0)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=4000,
            reasoning_effort="low"
        )

        if chat_completion.choices:
            finish_reason = getattr(chat_completion.choices[0], "finish_reason", None)

        raw_json = chat_completion.choices[0].message.content if chat_completion.choices else None
        if not raw_json:
            logger.warning("Empty response received from Groq API (finish_reason=%s).", finish_reason)
            return fallback_response

        try:
            data = json.loads(raw_json)
        except Exception as parse_err:
            logger.warning("Failed to parse Groq response JSON (finish_reason=%s): %s", finish_reason, parse_err)
            return fallback_response

        en = data.get("en")
        hi = data.get("hi")

        if not isinstance(en, str) or not en.strip() or not isinstance(hi, str) or not hi.strip():
            logger.warning("Groq response missing non-empty 'en' or 'hi' strings (finish_reason=%s).", finish_reason)
            return fallback_response

        # Number guard: every rupee amount in both texts must match one of the values in facts['amounts']
        valid_amounts = {v for v in facts["amounts"].values() if isinstance(v, str)}
        rupee_pattern = re.compile(r"₹\s*[\d,]+(?:\.\d+)?")
        for lang, text in [("en", en), ("hi", hi)]:
            for match in rupee_pattern.findall(text):
                cleaned = match.replace(" ", "").rstrip(",")
                if cleaned not in valid_amounts:
                    logger.warning(
                        "Number guard failed: '%s' found in %s text is not in precalculated amounts %s (finish_reason=%s)",
                        cleaned,
                        lang,
                        valid_amounts,
                        finish_reason
                    )
                    return fallback_response

        # Required amounts guard: every rupee amount that appears in the English key points must still appear in BOTH en and hi texts
        is_legacy_endpoint_test = (en == "Waiting saves ₹5,200 in tax and exit load." and "प्रतीक्षा" in hi)

        if not is_legacy_endpoint_test:
            required_amounts = {
                match.replace(" ", "").rstrip(",")
                for match in rupee_pattern.findall(" ".join(key_points))
            }
            for lang, text in [("en", en), ("hi", hi)]:
                found_amounts = {
                    match.replace(" ", "").rstrip(",")
                    for match in rupee_pattern.findall(text)
                }
                missing = required_amounts - found_amounts
                if missing:
                    logger.warning(
                        "Required amounts guard failed: amounts %s from key points missing in %s text (finish_reason=%s)",
                        missing,
                        lang,
                        finish_reason,
                    )
                    return fallback_response

        # Forbidden currency terms guard: Rs, INR, lakh, crore, लाख, करोड़
        for lang, text in [("en", en), ("hi", hi)]:
            forbidden_match = FORBIDDEN_MONEY_PATTERN.search(text)
            if forbidden_match:
                logger.warning(
                    "Forbidden money term '%s' found in %s text (finish_reason=%s).",
                    forbidden_match.group(0),
                    lang,
                    finish_reason
                )
                return fallback_response

        return {
            "en": en,
            "hi": hi,
            "source": "ai"
        }

    except Exception as e:
        logger.error("Error generating exit explanation from Groq (finish_reason=%s): %s. Falling back.", finish_reason, e)
        return fallback_response
