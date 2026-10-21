"""
Exit AI Explanation Service for Return Policy.
Explains a finished deterministic Smart Exit result using Groq LLM.
Never calculates, estimates, or alters any numbers.
"""

import json
import logging
import math
import re
from typing import Dict, Any, Optional
from groq import Groq
from app.config import settings
from app.models.policy import ExitAnalysisResponse
from app.services.tax_engine import DEFAULT_INTEREST_RATE_PCT

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a helpful Indian mutual fund tax and exit advisor explaining a completed Smart Exit analysis.
Follow these rules strictly:
1. You are explaining a result that has ALREADY been calculated. Never calculate, estimate, round or invent any number, rate, date, law, rule or fund detail. Use only what is in the facts.
2. Do not change or contradict "recommendation". If it is "Locked", say the units cannot be sold until lock.unlock_date. If "Hold", say waiting is better and for how many days. If "Exit Now", say selling is fine. If tax_only_recommendation is "Hold" but recommendation is "Exit Now", explain that the interest the money could earn while waiting is more than the tax saved.
3. Every rupee amount you write must be copied exactly from "amounts", including the ₹ symbol and commas. Never write money in any other form: no "Rs", no "INR", no "lakh", no "crore", no "लाख", no "करोड़".
4. If exit_load_is_assumed is true, say the exit load was assumed and the user should enter the real one from their fund's documents. If interest_rate_is_default is true, say it is an assumed rate. If interest_rate_pct is 0, say the interest the money could earn elsewhere was ignored. Always say the fund is assumed to stay flat.
5. 3 to 5 short sentences, plain words for an everyday Indian investor, no jargon without a few words of explanation, no headings or bullet points.
6. Never mention any AI model, company or product name. Do not add legal or tax disclaimers.
7. Return ONLY JSON: {"en": "<English>", "hi": "<Hindi in Devanagari script, numbers and ₹ kept as digits and symbol, no English words mixed in>"}.
8. Write dates in words, for example 16 September 2028 (in Hindi use the Hindi month name). Copy day counts exactly from the facts.
"""

FORBIDDEN_MONEY_PATTERN = re.compile(r"\b(?:rs|inr)\b|lakh|crore|लाख|करोड़", re.IGNORECASE)


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
    user_message = json.dumps(facts, ensure_ascii=False)

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
            max_tokens=2000
        )

        raw_json = chat_completion.choices[0].message.content
        if not raw_json:
            logger.warning("Empty response received from Groq API.")
            return fallback_response

        data = json.loads(raw_json)
        en = data.get("en")
        hi = data.get("hi")

        if not isinstance(en, str) or not en.strip() or not isinstance(hi, str) or not hi.strip():
            logger.warning("Groq response missing non-empty 'en' or 'hi' strings.")
            return fallback_response

        # Number guard: every rupee amount in both texts must match one of the values in facts['amounts']
        valid_amounts = {v for v in facts["amounts"].values() if isinstance(v, str)}
        rupee_pattern = re.compile(r"₹\s*[\d,]+(?:\.\d+)?")
        for lang, text in [("en", en), ("hi", hi)]:
            for match in rupee_pattern.findall(text):
                cleaned = match.replace(" ", "").rstrip(",")
                if cleaned not in valid_amounts:
                    logger.warning(
                        "Number guard failed: '%s' found in %s text is not in precalculated amounts %s",
                        cleaned,
                        lang,
                        valid_amounts
                    )
                    return fallback_response

        # Forbidden currency terms guard: Rs, INR, lakh, crore, लाख, करोड़
        for lang, text in [("en", en), ("hi", hi)]:
            forbidden_match = FORBIDDEN_MONEY_PATTERN.search(text)
            if forbidden_match:
                logger.warning(
                    "Forbidden money term '%s' found in %s text.",
                    forbidden_match.group(0),
                    lang
                )
                return fallback_response

        return {
            "en": en,
            "hi": hi,
            "source": "ai"
        }

    except Exception as e:
        logger.error("Error generating exit explanation from Groq: %s. Falling back.", e)
        return fallback_response
