import json
import logging
from typing import Optional
from groq import Groq
from app.config import settings
from app.models.policy import (
    SimulationRequest,
    DeterministicMetrics,
    AIAssessment,
    ActionItem
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_EN = """You are an elite, CFP-grade Personal Wealth Advisor and Financial Policy Strategist specializing in Indian Middle & Upper-Middle-Class Household Finance.
Your task is to analyze the user's monthly income, SIP investments, loan EMIs, and interest rate.
Evaluate their financial health, explain their pre-computed Financial Health Score and tier, and prescribe a disciplined 3-bullet "Personal Policy Action Plan" tailored to Indian retail investors (covering debt prepayment, SIP step-ups, emergency buffers, or interest mitigation).
Language requirement: Respond entirely in English.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "financial_health_score": <int between 0 and 100, copy the given score>,
  "rating_tier": "<string, explain the given tier>",
  "score_rationale": "<2-3 sentence concise rationale explaining the given tier and which components pull the score up or down>",
  "priority_action_plan": [
    {
      "bullet_number": 1,
      "title": "<Concise action/policy title, e.g., 'Targeted 50% Bonus Prepayment Policy'>",
      "action": "<Direct, actionable, quantified guidance with ₹ numbers or percentages>"
    },
    {
      "bullet_number": 2,
      "title": "<Concise action/policy title, e.g., 'Mandatory 10% Annual SIP Step-Up'>",
      "action": "<Direct, actionable, quantified guidance>"
    },
    {
      "bullet_number": 3,
      "title": "<Concise action/policy title, e.g., '6-Month Liquidity Safety Policy'>",
      "action": "<Direct, actionable, quantified guidance>"
    }
  ],
  "key_vulnerability": "<1 clear sentence highlighting their biggest financial risk or opportunity cost>"
}
"""

SYSTEM_PROMPT_HI = """You are an elite, CFP-grade Personal Wealth Advisor and Financial Policy Strategist specializing in Indian Middle & Upper-Middle-Class Household Finance.
Your task is to analyze the user's monthly income, SIP investments, loan EMIs, and interest rate.
Evaluate their financial health, explain their pre-computed Financial Health Score and tier, and prescribe a disciplined 3-bullet "Personal Policy Action Plan" tailored to Indian retail investors (covering debt prepayment, SIP step-ups, emergency buffers, or interest mitigation).

CRITICAL LANGUAGE AND SCRIPT MANDATE:
You MUST respond entirely in clean Hindi using Devanagari script (हिन्दी).
Every textual field in the JSON ('rating_tier', 'score_rationale', 'title', 'action', and 'key_vulnerability') MUST be written in pure Hindi Devanagari script.
IMPORTANT: Keep all numbers, percentages (%), and currency figures (₹) exactly as standard numeric digits and symbols (e.g. ₹15,000, 12%, 5 साल) — do NOT transliterate numbers into Hindi words or alter ₹ symbols.
DO NOT produce Hinglish or mix Latin-script English words into sentences. Use formal Hindi financial terms (ऋण / लोन, ईएमआई (EMI), बचत, निवेश, ब्याज, आपातकालीन कोष).
(Note: If minor natural code-switching occurs, maintain Devanagari script as the primary medium).

You MUST respond strictly with a valid JSON object matching this schema:
{
  "financial_health_score": <0 से 100 के बीच पूर्णांक, दिया गया स्कोर कॉपी करें (copy the given score)>,
  "rating_tier": "<Hindi tier in Devanagari, दिए गए टियर की व्याख्या करें>",
  "score_rationale": "<2-3 sentence concise rationale in Hindi explaining the given tier and which components pull the score up or down>",
  "priority_action_plan": [
    {
      "bullet_number": 1,
      "title": "<Concise action/policy title in Hindi Devanagari>",
      "action": "<Direct, actionable, quantified guidance in Hindi with ₹ numbers or percentages>"
    },
    {
      "bullet_number": 2,
      "title": "<Concise action/policy title in Hindi Devanagari>",
      "action": "<Direct, actionable, quantified guidance in Hindi with ₹ numbers or percentages>"
    },
    {
      "bullet_number": 3,
      "title": "<Concise action/policy title in Hindi Devanagari>",
      "action": "<Direct, actionable, quantified guidance in Hindi with ₹ numbers or percentages>"
    }
  ],
  "key_vulnerability": "<1 clear sentence in Hindi highlighting their biggest financial risk or opportunity cost>"
}
"""

def get_fallback_assessment(
    req: SimulationRequest,
    metrics: DeterministicMetrics,
    health_score: Optional[dict] = None
) -> AIAssessment:
    """
    Heuristic rule-based fallback if Groq API key is missing or encounters a network/quota error.
    Respects language choice ('en' or 'hi') to deliver a fully localized offline evaluation.
    When health_score is provided, bypasses baseline heuristic and uses the precomputed score and tier.
    """
    is_hindi = bool(req.language and req.language.lower().startswith("hi"))

    if health_score is not None:
        score = int(health_score["score"])
        tier = str(health_score["tier"])
    else:
        # Baseline score calculation:
        # Starts at 50, +1.5 * SIP%, -1.0 * EMI%, -1.2 * (Interest Rate - 7.0)
        score = 50.0 + (metrics.sip_to_income_ratio_pct * 1.5) - (metrics.emi_to_income_ratio_pct * 0.9) - ((req.loan_interest_rate - 7.0) * 0.5)
        score = int(max(15, min(95, round(score))))
        tier = None

    if is_hindi:
        # Note: Clean Hindi fallback translations provided for offline / no-Groq mode.
        # Hinglish avoidance: Pure Devanagari Hindi strings used, preserving numeric figures & ₹.
        if score < 40:
            local_tier = "गंभीर ऋण तनाव"
            action1_title = "ऋण आपातकालीन पूर्व-भुगतान नियम"
            action1_body = f"आपकी ईएमआई मासिक आय का {metrics.emi_to_income_ratio_pct}% हिस्सा ले रही है। गैर-ज़रूरी खर्चों को तुरंत रोकें और {req.loan_interest_rate}% ब्याज वाले ऋण को पहले चुकाएं।"
            action2_title = "रक्षात्मक बजट पुनर्गठन"
            action2_body = f"जब तक ईएमआई अनुपात 35% से नीचे न आ जाए, ₹{int(metrics.monthly_income):,} मासिक वेतन के खर्च को 40% से नीचे सीमित रखें।"
            action3_title = "आपातकालीन तरलता फंड"
            action3_body = "एसआईपी में आक्रामक वृद्धि करने से पहले कम से कम 3 महीने के आवश्यक खर्च को सुरक्षित बैंक डिपॉजिट में रखें।"
            vuln = f"मासिक आय के {metrics.emi_to_income_ratio_pct}% हिस्से का ईएमआई में जाना गंभीर जोखिम है, जो आपातकाल में समस्या उत्पन्न कर सकता है।"
        elif score < 65:
            local_tier = "असुरक्षित उत्तोलन"
            action1_title = "त्वरित ऋण मूलधन कटौती"
            action1_body = f"आपका {req.loan_interest_rate}% का ऋण सामान्य दरों से अधिक है। ऋण की अवधि घटाने के लिए हर साल 1-2 अतिरिक्त ईएमआई का पूर्व-भुगतान करें।"
            action2_title = "संतुलित 10% स्टेप-अप एसआईपी"
            action2_body = f"अपनी ₹{int(req.monthly_sip):,} की एसआईपी चालू रखें, और 5 वर्षों में ₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} लाख के लक्ष्य के लिए 10% वार्षिक स्टेप-अप लागू करें।"
            action3_title = "आपातकालीन सुरक्षा बफर"
            action3_body = f"कम से कम ₹{int(req.loan_emi * 6):,} (6 महीने की ईएमआई देनदारी) को आसानी से निकासी योग्य लिक्विड फंड में सुरक्षित रखें।"
            vuln = f"{req.loan_interest_rate}% की ऋण ब्याज दर आपके एसआईपी से अर्जित संपत्ति लाभ को लगातार कम कर रही है।"
        elif score < 80:
            local_tier = "मजबूत धन निर्माता"
            action1_title = "बोनस आवंटन नीति (50:50 विभाजन)"
            action1_body = f"जब भी वार्षिक बोनस मिले, 50% राशि {req.loan_interest_rate}% वाले ऋण के पूर्व-भुगतान में और 50% इक्विटी म्यूचुअल फंड में लगाएं।"
            action2_title = "10% वार्षिक स्टेप-अप चक्रवृद्धि"
            action2_body = f"अपनी ₹{int(req.monthly_sip):,} की एसआईपी को प्रति वर्ष 10% बढ़ाएं, जिससे 5 साल में ₹{round((metrics.five_year_sip_projected_wealth * 1.25) / 100000, 2)} लाख से अधिक का फंड बन सके।"
            action3_title = "शुद्ध टर्म और स्वास्थ्य बीमा सुरक्षा"
            action3_body = "यह सुनिश्चित करें कि आपका टर्म इंश्योरेंस वार्षिक आय का कम से कम 10-15 गुना हो ताकि परिवार की संपत्ति सुरक्षित रहे।"
            vuln = "ऋण पूर्व-भुगतान की धीमी गति के कारण नकदी देनदारियों में फंसी रह सकती है, जिससे इक्विटी चक्रवृद्धि का अधिकतम लाभ नहीं मिल पाता।"
        else:
            local_tier = "वित्तीय रूप से सुदृढ़"
            action1_title = "आक्रामक इक्विटी चक्रवृद्धि नीति"
            action1_body = f"मात्र {metrics.emi_to_income_ratio_pct}% के कम ईएमआई भार के साथ, अपनी अतिरिक्त बचत का 70% डायवर्सिफाइड इंडेक्स फंड्स में लगाएं।"
            action2_title = "अवधि संपीड़न पूर्व-भुगतान"
            action2_body = "कुल ऋण ब्याज को 40% से अधिक कम करने के लिए सालाना अपने बकाया मूलधन का 5% पूर्व-भुगतान करें।"
            action3_title = "लक्ष्य-आधारित पोर्टफोलियो पुनर्संतुलन"
            action3_body = f"अपने अनुमानित 5-वर्षीय फंड ₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} लाख की वार्षिक समीक्षा करें और लक्ष्य के करीब आने पर सुरक्षित फंड में स्थानांतरित करें।"
            vuln = "अतिरिक्त नकदी को कम ब्याज वाले बचत खातों में बेकार छोड़ना, जिससे मुद्रास्फीति के मुकाबले संपत्ति निर्माण प्रभावित हो सकता है।"

        rationale = (
            f"आपकी ईएमआई मासिक आय का {metrics.emi_to_income_ratio_pct}% हिस्सा लेती है, जबकि आप "
            f"{metrics.sip_to_income_ratio_pct}% चक्रवृद्धि एसआईपी (SIP) में निवेश करते हैं। ₹{int(metrics.annual_interest_burden_est):,} के "
            f"अनुमानित वार्षिक ऋण ब्याज बोझ के मुकाबले आपकी 5-वर्षीय अनुमानित संपत्ति ₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} लाख है।"
        )
    else:
        if score < 40:
            local_tier = "Critical Debt Stress"
            action1_title = "Debt Emergency Prepayment Rule"
            action1_body = f"Your EMI consumes {metrics.emi_to_income_ratio_pct}% of income. Pause non-essential outflows and channel any surplus to clear the {req.loan_interest_rate}% loan balance immediately."
            action2_title = "Defensive Budget Restructuring"
            action2_body = f"Cap living expenses strictly below 40% of your ₹{int(metrics.monthly_income):,} monthly pay until EMI ratio drops under 35%."
            action3_title = "Emergency Liquidity Stopgap"
            action3_body = "Maintain at least 3 months of basic living costs in liquid sweep-in bank deposits before aggressively scaling SIPs."
            vuln = f"Severe debt drag at {metrics.emi_to_income_ratio_pct}% EMI-to-income risks default in case of medical emergency or job disruption."
        elif score < 65:
            local_tier = "Vulnerable Leveraged"
            action1_title = "Accelerated Loan Principal Reduction"
            action1_body = f"Your {req.loan_interest_rate}% loan is significantly higher than post-tax debt benchmarks. Prepay an extra 1-2 EMIs per year to reduce tenure."
            action2_title = "Balanced 10% Step-Up SIP"
            action2_body = f"Keep your ₹{int(req.monthly_sip):,} SIP active, but enforce a 10% annual step-up to achieve your 5-year wealth goal of ₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} Lakhs."
            action3_title = "Emergency Buffer Ring-Fencing"
            action3_body = f"Park at least ₹{int(req.loan_emi * 6):,} (6 months of EMI commitments) in an accessible liquid mutual fund."
            vuln = f"A {req.loan_interest_rate}% loan interest rate continuously erodes wealth gains generated by your SIP."
        elif score < 80:
            local_tier = "Solid Wealth Builder"
            action1_title = "Bonus Allocation Policy (50:50 Split)"
            action1_body = f"Whenever annual bonuses or appraisal increments arrive, allocate 50% to prepaying the {req.loan_interest_rate}% debt and 50% to lump-sum equity mutual fund additions."
            action2_title = "10% Annual Step-Up Compounding"
            action2_body = f"Increase your ₹{int(req.monthly_sip):,} SIP by 10% every financial year, projecting your 5-year corpus past ₹{round((metrics.five_year_sip_projected_wealth * 1.25) / 100000, 2)} Lakhs."
            action3_title = "Pure Term & Comprehensive Health Cover"
            action3_body = "Ensure term life insurance equals 15x annual income (₹1.8 Cr) to shield your wealth creation against liabilities."
            vuln = "Sub-optimal debt prepayment pace keeps cash flow tied to bank obligations instead of maximizing equity compounding."
        else:
            local_tier = "Financially Resilient"
            action1_title = "Aggressive Equity Compounding Policy"
            action1_body = f"With a modest {metrics.emi_to_income_ratio_pct}% EMI load, channel 70% of incremental savings into diversified Nifty 50 and Midcap index funds."
            action2_title = "Tenure Compression Prepayment"
            action2_body = "Prepay 5% of your outstanding loan principal annually to compress total loan interest by over 40%."
            action3_title = "Goal-Based Portfolio Rebalancing"
            action3_body = f"Review your projected 5-year wealth of ₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} Lakhs annually and rebalance into arbitrage or debt funds as goal deadlines near."
            vuln = "Under-diversification or hoarding excess cash in low-yield savings accounts rather than compounding vehicles."

        rationale = (
            f"Your EMI takes up {metrics.emi_to_income_ratio_pct}% of monthly income while you invest "
            f"{metrics.sip_to_income_ratio_pct}% into compounding SIPs. Your 5-year projected wealth is "
            f"₹{round(metrics.five_year_sip_projected_wealth / 100000, 2)} Lakhs against an estimated annual debt interest drag of ₹{int(metrics.annual_interest_burden_est):,}."
        )

    ai_assessment = AIAssessment(
        financial_health_score=score,
        rating_tier=tier if tier is not None else local_tier,
        score_rationale=rationale,
        priority_action_plan=[
            ActionItem(bullet_number=1, title=action1_title, action=action1_body),
            ActionItem(bullet_number=2, title=action2_title, action=action2_body),
            ActionItem(bullet_number=3, title=action3_title, action=action3_body)
        ],
        key_vulnerability=vuln,
        source="fallback"
    )

    if health_score is not None:
        ai_assessment.financial_health_score = health_score["score"]
        if hasattr(ai_assessment, "rating_tier"):
            ai_assessment.rating_tier = health_score["tier"]

    ai_assessment.source = "fallback"
    return ai_assessment

def generate_ai_assessment(
    req: SimulationRequest,
    metrics: DeterministicMetrics,
    health_score: Optional[dict] = None
) -> AIAssessment:
    """
    Orchestrates LLM assessment via Groq's llama3-8b-8192 with structured JSON mode,
    falling back seamlessly to rule-based evaluation if API key is not configured or fails.
    Respects req.language ("en" or "hi").
    """
    api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else ""

    if not api_key:
        logger.info("GROQ_API_KEY not set. Using deterministic heuristic assessment.")
        return get_fallback_assessment(req, metrics, health_score=health_score)

    is_hindi = bool(req.language and req.language.lower().startswith("hi"))
    system_prompt = SYSTEM_PROMPT_HI if is_hindi else SYSTEM_PROMPT_EN

    try:
        client = Groq(api_key=api_key)

        if is_hindi:
            if health_score:
                pts = health_score.get("points", {})
                score_val = health_score.get("score")
                tier_val = health_score.get("tier")
                user_content = f"""उपयोगकर्ता वित्तीय प्रोफ़ाइल:
- वार्षिक घरेलू आय: ₹{req.annual_income:,.2f}
- मासिक आय: ₹{metrics.monthly_income:,.2f}
- मासिक एसआईपी (SIP) निवेश: ₹{req.monthly_sip:,.2f} (मासिक आय का {metrics.sip_to_income_ratio_pct}%)
- मासिक ऋण ईएमआई (EMI): ₹{req.loan_emi:,.2f} (मासिक आय का {metrics.emi_to_income_ratio_pct}%)
- ऋण ब्याज दर: {req.loan_interest_rate}%
- ऋण जोखिम वर्गीकरण: {metrics.debt_risk_category}

5-वर्षीय धन संचय अनुमान (12% CAGR):
- कुल 5-वर्षीय निवेशित मूलधन: ₹{metrics.five_year_sip_invested:,.2f}
- अनुमानित 5-वर्षीय कुल संपत्ति: ₹{metrics.five_year_sip_projected_wealth:,.2f}
- अनुमानित शुद्ध लाभ: ₹{metrics.five_year_sip_estimated_returns:,.2f}
- अनुमानित वार्षिक ऋण ब्याज बोझ: ₹{metrics.annual_interest_burden_est:,.2f}

परिकलित वित्तीय स्वास्थ्य स्कोर और विश्लेषण:
- समग्र स्वास्थ्य स्कोर: {score_val}
- टियर: {tier_val}
- घटक अंक:
  * sip: {pts.get('sip')}/25
  * loan: {pts.get('loan')}/20
  * ins: {pts.get('ins')}/20
  * tax: {pts.get('tax')}/20
  * emg: {pts.get('emg')}/15

स्वास्थ्य स्कोर की गणना पहले ही की जा चुकी है। इसकी गणना न करें, इसे न बदलें और न ही इसका खंडन करें। 2-3 वाक्यों में समझाएं कि कौन से घटक इसे नीचे या ऊपर खींचते हैं, फिर कार्य योजना दें। The health score is already computed. Do NOT calculate, change or contradict it. Explain in 2-3 sentences which components pull it down or up, then give the action plan.

कृपया दिए गए JSON प्रारूप में अपना भारतीय घरेलू वित्तीय स्वास्थ्य स्कोर ({score_val}) और 3-सूत्रीय प्राथमिकता कार्य योजना पूरी तरह से हिन्दी (देवनागरी लिपि) में प्रदान करें। संख्याएं और ₹ मान वैसे ही रखें।"""
            else:
                user_content = f"""उपयोगकर्ता वित्तीय प्रोफ़ाइल:
- वार्षिक घरेलू आय: ₹{req.annual_income:,.2f}
- मासिक आय: ₹{metrics.monthly_income:,.2f}
- मासिक एसआईपी (SIP) निवेश: ₹{req.monthly_sip:,.2f} (मासिक आय का {metrics.sip_to_income_ratio_pct}%)
- मासिक ऋण ईएमआई (EMI): ₹{req.loan_emi:,.2f} (मासिक आय का {metrics.emi_to_income_ratio_pct}%)
- ऋण ब्याज दर: {req.loan_interest_rate}%
- ऋण जोखिम वर्गीकरण: {metrics.debt_risk_category}

5-वर्षीय धन संचय अनुमान (12% CAGR):
- कुल 5-वर्षीय निवेशित मूलधन: ₹{metrics.five_year_sip_invested:,.2f}
- अनुमानित 5-वर्षीय कुल संपत्ति: ₹{metrics.five_year_sip_projected_wealth:,.2f}
- अनुमानित शुद्ध लाभ: ₹{metrics.five_year_sip_estimated_returns:,.2f}
- अनुमानित वार्षिक ऋण ब्याज बोझ: ₹{metrics.annual_interest_burden_est:,.2f}

कृपया दिए गए JSON प्रारूप में अपना भारतीय घरेलू वित्तीय स्वास्थ्य स्कोर (0-100) और 3-सूत्रीय प्राथमिकता कार्य योजना पूरी तरह से हिन्दी (देवनागरी लिपि) में प्रदान करें। संख्याएं और ₹ मान वैसे ही रखें।"""
        else:
            if health_score:
                pts = health_score.get("points", {})
                score_val = health_score.get("score")
                tier_val = health_score.get("tier")
                user_content = f"""USER FINANCIAL PROFILE:
- Annual Household Income: ₹{req.annual_income:,.2f}
- Monthly Income: ₹{metrics.monthly_income:,.2f}
- Monthly SIP Investment: ₹{req.monthly_sip:,.2f} ({metrics.sip_to_income_ratio_pct}% of income)
- Monthly Loan EMI: ₹{req.loan_emi:,.2f} ({metrics.emi_to_income_ratio_pct}% of income)
- Weighted Loan Interest Rate: {req.loan_interest_rate}%
- Debt Risk Classification: {metrics.debt_risk_category}

DETERMINISTIC 5-YEAR WEALTH PROJECTIONS (12% CAGR):
- Total 5-Year Principal Invested: ₹{metrics.five_year_sip_invested:,.2f}
- Projected 5-Year Corpus: ₹{metrics.five_year_sip_projected_wealth:,.2f}
- Estimated Wealth Gain: ₹{metrics.five_year_sip_estimated_returns:,.2f}
- Estimated Annual Loan Interest Drag: ₹{metrics.annual_interest_burden_est:,.2f}

COMPUTED FINANCIAL HEALTH SCORE & BREAKDOWN:
- Overall Health Score: {score_val}
- Health Tier: {tier_val}
- Component Points:
  * sip: {pts.get('sip')}/25
  * loan: {pts.get('loan')}/20
  * ins: {pts.get('ins')}/20
  * tax: {pts.get('tax')}/20
  * emg: {pts.get('emg')}/15

The health score is already computed. Do NOT calculate, change or contradict it. Explain in 2-3 sentences which components pull it down or up, then give the action plan. The tier rationale must explain the given tier, not choose a new one. Provide your response now in the specified JSON format."""
            else:
                user_content = f"""USER FINANCIAL PROFILE:
- Annual Household Income: ₹{req.annual_income:,.2f}
- Monthly Income: ₹{metrics.monthly_income:,.2f}
- Monthly SIP Investment: ₹{req.monthly_sip:,.2f} ({metrics.sip_to_income_ratio_pct}% of income)
- Monthly Loan EMI: ₹{req.loan_emi:,.2f} ({metrics.emi_to_income_ratio_pct}% of income)
- Weighted Loan Interest Rate: {req.loan_interest_rate}%
- Debt Risk Classification: {metrics.debt_risk_category}

DETERMINISTIC 5-YEAR WEALTH PROJECTIONS (12% CAGR):
- Total 5-Year Principal Invested: ₹{metrics.five_year_sip_invested:,.2f}
- Projected 5-Year Corpus: ₹{metrics.five_year_sip_projected_wealth:,.2f}
- Estimated Wealth Gain: ₹{metrics.five_year_sip_estimated_returns:,.2f}
- Estimated Annual Loan Interest Drag: ₹{metrics.annual_interest_burden_est:,.2f}

Provide your structured Indian household financial health score and 3-bullet priority action plan now in the specified JSON format."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1500
        )

        raw_json = chat_completion.choices[0].message.content
        data = json.loads(raw_json)

        # Validate with Pydantic
        action_plan = []
        for idx, item in enumerate(data.get("priority_action_plan", [])[:3], start=1):
            default_item_title = f"पॉलिसी अनुशंसा #{idx}" if is_hindi else f"Policy Recommendation #{idx}"
            action_plan.append(ActionItem(
                bullet_number=idx,
                title=item.get("title", default_item_title),
                action=item.get("action", "")
            ))

        # Pad if fewer than 3 items returned by LLM
        while len(action_plan) < 3:
            idx = len(action_plan) + 1
            if is_hindi:
                action_plan.append(ActionItem(
                    bullet_number=idx,
                    title=f"अनुशासन नियम #{idx}",
                    action="मासिक एसआईपी आवंटन बनाए रखने के लिए गैर-ज़रूरी खर्चों पर सख्त नियंत्रण रखें।"
                ))
            else:
                action_plan.append(ActionItem(
                    bullet_number=idx,
                    title=f"Discipline Rule #{idx}",
                    action="Maintain strict tracking of discretionary outflows to preserve your monthly SIP allocation."
                ))

        score = int(data.get("financial_health_score", 65))
        score = max(0, min(100, score))

        fallback_tier = "संतुलित बचतकर्ता" if is_hindi else "Balanced Builder"
        fallback_rationale = (
            "आपके ऋण-से-आय अनुपात और चक्रवृद्धि एसआईपी वृद्धि के आधार पर गणना की गई।"
            if is_hindi else
            "Calculated based on your debt-to-income ratio and compounding SIP growth."
        )
        fallback_vulnerability = (
            "दीर्घकालिक इक्विटी चक्रवृद्धि के साथ ऋण भार का संतुलन बनाए रखना।"
            if is_hindi else
            "Managing debt burden alongside long-term equity compounding."
        )

        ai_assessment = AIAssessment(
            financial_health_score=score,
            rating_tier=data.get("rating_tier", fallback_tier),
            score_rationale=data.get("score_rationale", fallback_rationale),
            priority_action_plan=action_plan,
            key_vulnerability=data.get("key_vulnerability", fallback_vulnerability),
            source="groq"
        )

        if health_score is not None:
            ai_assessment.financial_health_score = health_score["score"]
            if hasattr(ai_assessment, "rating_tier"):
                ai_assessment.rating_tier = health_score["tier"]

        ai_assessment.source = "groq"
        return ai_assessment

    except Exception as e:
        logger.error(f"Error calling Groq API: {e}. Falling back to deterministic assessment.")
        return get_fallback_assessment(req, metrics, health_score=health_score)

