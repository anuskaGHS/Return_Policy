# Implementation Plan: "Return Policy" MVP

A personal finance advisory and wealth projection platform for Indian retail consumers. **"Return Policy"** plays on a double meaning: simulating **Personal Financial Returns** (SIP compounding, wealth growth) while establishing disciplined **Personal Financial Guidance Policies** (debt limits, savings benchmarks, interest mitigation).

The system integrates interactive Rupee-denominated sliders with deterministic financial calculations (5-year 12% CAGR SIP compounding, EMI-to-Income ratios) and Groq-powered AI advisory (`llama3-8b-8192`) acting as a seasoned Indian wealth manager.

---

## User Review Required

> [!NOTE]
> **API Key Setup**:
> The backend requires a `GROQ_API_KEY` in `backend/.env`. A deterministic heuristic fallback is built into the engine so the app remains fully functional and testable even if offline or before keys are entered.

---

## 1. Directory & File Structure

A clean monorepo separating the FastAPI backend (`backend/`) and React + Vite frontend (`frontend/`):

```text
Return Policy/
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── main.py                     # FastAPI app entrypoint & CORS setup
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py               # App configuration & Groq API key loading
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── policy.py           # Pydantic schemas (Request & Response contracts)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── calculator.py       # Deterministic SIP compounding & EMI-to-Income logic
│   │   │   └── groq_service.py     # Groq API client & Indian Wealth Advisor persona
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── policy.py           # API route handler (/api/simulate)
│   └── tests/
│       └── test_calculator.py      # Unit tests for 12% CAGR & debt ratio formulas
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                 # Central dashboard view & state coordinator
│   │   ├── index.css               # Design system: modern dark aesthetic, glow tokens
│   │   ├── components/
│   │   │   ├── Header.jsx          # App branding & badge indicator
│   │   │   ├── FinancialSliders.jsx# Rupee sliders (SIP, EMI, Interest, Income)
│   │   │   ├── ScoreGauge.jsx      # Visual Financial Health Score meter (0-100)
│   │   │   ├── WealthCard.jsx      # 5-Year 12% CAGR SIP wealth projection breakdown
│   │   │   ├── DebtRatioCard.jsx   # EMI-to-Income gauge & risk status
│   │   │   ├── ActionPlan.jsx      # 3-bullet personal policy action plan
│   │   │   └── ErrorBanner.jsx     # Graceful error & offline status banner
│   │   ├── services/
│   │   │   └── api.js              # Fetch client communicating with /api/simulate
│   │   └── utils/
│   │       └── formatters.js       # Indian Numbering System formatters (e.g. ₹1,50,000)
│   └── public/
└── README.md
```

---

## 2. Dependencies & Ecosystem

### Backend (`backend/requirements.txt`)
- **`fastapi`** (`>=0.110.0`): REST API framework with native async support and OpenAPI docs.
- **`uvicorn[standard]`** (`>=0.28.0`): High-speed ASGI server with hot-reload.
- **`groq`** (`>=0.5.0`): Groq Cloud SDK for ultra-low-latency Llama 3 inference.
- **`pydantic`** (`>=2.6.0`): Strict data typing, validation, and JSON schemas.
- **`pydantic-settings`** (`>=2.2.0`): Environment variable management.
- **`python-dotenv`** (`>=1.0.1`): Local `.env` credential loading.
- **`pytest`** (`>=8.0.0`): Automated test suite for financial equations.

### Frontend (`frontend/package.json`)
- **Core**: `react` (`^18.3.1`), `react-dom` (`^18.3.1`), `vite` (`^5.3.0`).
- **Icons & Visuals**: `lucide-react` (icons for Indian Rupee `IndianRupee`, `ShieldCheck`, `TrendingUp`, `AlertTriangle`).
- **Styling**: Vanilla CSS design system with CSS custom variables, glassmorphic cards (`backdrop-filter: blur`), dark obsidian theme, and custom accent slider thumbs.

---

## 3. Endpoints & Data Contracts

### Endpoint Overview
- **`GET /api/health`**: Health check and Groq API readiness probe.
- **`POST /api/simulate`**: Receives slider inputs, runs deterministic calculations, calls Groq LLM, and returns structured advice.

---

### Request Data Contract (`POST /api/simulate`)
```json
{
  "monthly_sip": 15000.0,
  "loan_emi": 25000.0,
  "loan_interest_rate": 9.5,
  "annual_income": 1200000.0
}
```

#### Field Specifications:
| Field | Type | Min | Max | Default | Unit | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `monthly_sip` | Float | 1,000 | 50,000 | 10,000 | ₹ / month | Monthly Systematic Investment Plan amount |
| `loan_emi` | Float | 0 | 100,000 | 15,000 | ₹ / month | Total monthly debt EMIs (home, car, personal) |
| `loan_interest_rate` | Float | 5.0 | 15.0 | 8.5 | % / year | Weighted average interest rate on current debt |
| `annual_income` | Float | 300,000 | 5,000,000 | 1,200,000 | ₹ / year | Gross annual household income |

---

### Response Data Contract (`POST /api/simulate`)
```json
{
  "deterministic_metrics": {
    "monthly_income": 100000.0,
    "emi_to_income_ratio_pct": 25.0,
    "sip_to_income_ratio_pct": 15.0,
    "five_year_sip_invested": 900000.0,
    "five_year_sip_projected_wealth": 1237397.0,
    "five_year_sip_estimated_returns": 337397.0,
    "annual_interest_burden_est": 23750.0,
    "debt_risk_category": "Healthy"
  },
  "ai_assessment": {
    "financial_health_score": 78,
    "rating_tier": "Solid Wealth Builder",
    "score_rationale": "Your EMI-to-income ratio is in the safe zone at 25%, and your 15% SIP commitment builds strong compounding momentum. However, a 9.5% loan rate suggests high-cost debt that should be strategically prepaid.",
    "priority_action_plan": [
      {
        "bullet_number": 1,
        "title": "Adopt the '50% Prepayment Policy'",
        "action": "Allocate 50% of annual bonuses or incremental raises directly toward prepaying your 9.5% loan principal to save substantial compounding interest."
      },
      {
        "bullet_number": 2,
        "title": "Implement a 10% Annual SIP Step-Up",
        "action": "Increase your ₹15,000 SIP by 10% each year as your income grows, boosting your 5-year projected wealth from ₹12.37L to over ₹15.8L."
      },
      {
        "bullet_number": 3,
        "title": "Ring-fence 6 Months of Fixed Obligations",
        "action": "Ensure ₹1.5L - ₹2.5L is parked in liquid funds or high-interest sweep-in FDs to protect EMI and SIP continuity against unexpected income disruptions."
      }
    ],
    "key_vulnerability": "Carrying debt at 9.5% while investing at an expected 12% yields an effective net spread of only 2.5% after capital gains tax."
  }
}
```

---

## 4. Deterministic Calculation Layer (`calculator.py`)

1. **Monthly Income**:
   $$\text{Monthly Income} = \frac{\text{annual\_income}}{12}$$

2. **EMI-to-Income (Debt Burden Ratio)**:
   $$\text{EMI Ratio (\%)} = \left(\frac{\text{loan\_emi}}{\text{Monthly Income}}\right) \times 100$$
   - Categorization: $< 30\%$ = Healthy, $30\% - 45\%$ = Moderate, $> 45\%$ = High Risk / Overleveraged.

3. **SIP-to-Income (Savings Rate)**:
   $$\text{SIP Ratio (\%)} = \left(\frac{\text{monthly\_sip}}{\text{Monthly Income}}\right) \times 100$$

4. **Projected 5-Year SIP Wealth Growth (12% Flat CAGR)**:
   - Monthly compounding rate: $r = \frac{0.12}{12} = 0.01$
   - Number of monthly installments: $n = 5 \times 12 = 60$
   - Future Value formula:
     $$\text{Projected Wealth} = P \times \left( \frac{(1 + r)^n - 1}{r} \right) \times (1 + r)$$
   - Total Invested Amount: $\text{Invested} = P \times 60$
   - Wealth Gain (Capital Growth): $\text{Estimated Returns} = \text{Projected Wealth} - \text{Invested}$

5. **Estimated Annual Interest Drag**:
   $$\text{Annual Interest Drag} \approx (\text{loan\_emi} \times 12) \times \left(\frac{\text{loan\_interest\_rate}}{100}\right)$$

---

## 5. Groq API Integration Layer (`groq_service.py`)

### Model & Configuration
- **Model**: `llama3-8b-8192` (Groq free tier, sub-second latency).
- **Format**: `response_format={"type": "json_object"}`.
- **Temperature**: `0.2` (for consistent, mathematically grounded financial advisory).

### System Persona & Prompting
- **Persona**:
  > *"You are an elite, CFP-grade Personal Wealth Advisor and Financial Policy Strategist specializing in Indian Middle & Upper-Middle-Class Household Finance. You analyze cash flows, debt sustainability, and compounding growth under Indian economic realities (inflation, tax, debt traps, mutual fund investing)."*
- **Inputs Provided in User Prompt**:
  - Exact user slider parameters: `monthly_sip`, `loan_emi`, `loan_interest_rate`, `annual_income`.
  - Exact deterministic Python outputs: `monthly_income`, `emi_to_income_ratio_pct`, `five_year_sip_projected_wealth`, `five_year_sip_estimated_returns`.
- **Output Requirements**:
  - `financial_health_score`: Integer (0–100) reflecting debt safety, savings aggressiveness, and interest risk.
  - `rating_tier`: Short descriptor (e.g., "Debt Heavy", "Cautious Saver", "Balanced Builder", "Wealth Accelerator").
  - `score_rationale`: 2-sentence crisp evaluation linking the debt ratio to the 5-year compounding potential.
  - `priority_action_plan`: Exactly 3 actionable, numbered policies tailored to Indian retail investors (covering prepayments, SIP step-ups, emergency funds, or tax efficiency).
  - `key_vulnerability`: 1 sentence highlighting their biggest single financial risk.

### Fallback Heuristic
If the Groq API key is not yet set or hits a rate limit:
- Deterministic heuristic calculates:
  $$\text{Baseline Score} = \text{round}(50 + (\text{SIP Ratio} \times 1.5) - (\text{EMI Ratio} \times 0.8) - (\text{Interest Rate} - 7.0))$$
  Clamped between 15 and 95.
- Provides fallback standard CFP action rules so the UI remains 100% functional.

---

## 6. Frontend Architecture & Interaction Design

### Visual Layout
- **Left Panel (Inputs)**: Four sleek sliders with live Rupee badge formatting, min/max guides, and preset chips (e.g., "Conservative", "Aggressive Saver", "Debt Prepayment Mode").
- **Right Panel (Outputs)**:
  - **Financial Health Gauge**: Radial gauge with dynamic color spectrum (Green > 75, Yellow 50-74, Red < 50) and tier badge.
  - **Compounding Wealth Card**: Highlighting 5-year invested (e.g. ₹9.00 L) vs projected wealth (e.g. ₹12.37 L) with returns badge.
  - **Debt Burden Meter**: Visual bar showing EMI as a % of monthly salary against safe (<30%) and danger (>45%) thresholds.
  - **Personal Policy Plan**: 3 clean glassmorphic cards detailing the priority actions from Groq.

### Real-Time Responsiveness
- Slider drags update local numbers instantly (0ms lag).
- Deterministic wealth projection is computed on the frontend immediately as an instant preview.
- Groq API calls are debounced by 400ms after slider release to fetch deep AI analysis without spamming the backend.

---

## Verification Plan

### Automated Tests
```powershell
# In backend directory
pytest tests/test_calculator.py
```
- Test cases:
  - Zero EMI scenario ($\text{Ratio} = 0\%$).
  - Max ₹50k SIP at 12% CAGR over 60 months matches standard compound interest table ($FV \approx ₹41,24,319$).
  - Overleveraged scenario ($\text{EMI} > 50\%$ income).

### Manual Verification
1. Start backend: `uvicorn main:app --reload --port 8000`
2. Test `POST /api/simulate` with curl or Swagger (`http://localhost:8000/docs`).
3. Start frontend: `npm run dev` in `frontend/`.
4. Verify dynamic slider updates with Indian Rupee formatting (`₹10,000`, `₹12,00,000`).
5. Verify Groq Llama-3 response parses cleanly and updates the 3-bullet action plan within ~1 second.
