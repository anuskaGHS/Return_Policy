# Return Policy — AI-Powered Household Finance Decision Engine

> **"Your AI-Powered Household Finance Decision Engine"**  
> *Built for the **Razorpay AI Buildathon 2026** (Open Track)*

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq Cloud](https://img.shields.io/badge/Groq-Cloud_AI-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 📌 Overview

**Return Policy** delivers high-conviction household financial intelligence tailored specifically for Indian middle-class families in Tier 1, Tier 2, and Tier 3 cities.

The name carries a deliberate **double meaning**:
1. **Financial Returns:** Optimizing SIP compounding, asset growth, and interest drag reduction.
2. **Policy on Returns:** Instituting clear, non-negotiable household rules (when to hold, exit, prepay debt, or step up investments).

Most Indian families juggle multiple fragmented financial commitments—mutual fund SIPs, home loans, car loans, insurance premiums, and fixed deposits—without a unified analytical system that assesses whether their net capital allocation is compounding wealth or quietly bleeding under debt interest. **Return Policy** bridges this gap with deterministic actuarial math combined with low-latency LLM synthesis.

---

## 🚨 Problem Statement

Middle-class Indian households face three structural challenges when managing their money:

1. **Fragmented Products, Zero Synthesis:** Families hold 3–5 SIPs across different apps and platforms alongside substantial home or personal loan EMIs. No accessible, free platform answers the simple question: *"Is my overall money engine actually working?"*
2. **Jargon-Heavy or Biased Advisory:** Retail investors either navigate commission-driven agent sales pitches or complex spreadsheets filled with financial jargon.
3. **The Prepayment vs. Compounding Dilemma:** Households rarely know whether surplus funds should prepay an 8.5%–9.5% loan principal or compound in equity index funds.

**Return Policy** solves this with a zero-cost, privacy-first, and explainable decision engine that translates raw numbers into plain-language household policies.

---

## ✨ Features (Current MVP)

### 1. Financial What-If Simulator
- **4 Rupee-Denominated Interactive Sliders:**
  - **Monthly SIP Investment:** Range ₹1,000 to ₹50,000/mo (with instant 5-year compounding preview).
  - **Monthly Loan EMI:** Range ₹0 to ₹1,00,000/mo (with active debt stress indicators).
  - **Weighted Loan Interest Rate:** Range 5.0% to 15.0% (calibrated across subsidized to high-interest debt).
  - **Annual Household Income:** Range ₹3.0 Lakhs to ₹50.0 Lakhs/year.
- **Quick Persona Presets:** Instant single-click scenarios on a unified row:
  - `Early Career` (₹5K SIP, ₹12K EMI, 9.5% rate, ₹6L income)
  - `Balanced Builder` (₹15K SIP, ₹22K EMI, 8.5% rate, ₹14L income)
  - `Aggressive Saver` (₹35K SIP, ₹15K EMI, 7.8% rate, ₹24L income)
  - `High Debt Stress` (₹3K SIP, ₹45K EMI, 11.5% rate, ₹9L income)
- **"Load Sample Portfolio" Feature:** One-tap realistic case study (`Ghosh Family, Siliguri | Axis Bluechip SIP + Home Loan`) displaying ₹15K SIP, ₹28K EMI, 9.2% rate, and ₹18L income with dedicated info metadata.

### 2. Explainable Financial Health Score
- **Dynamic Radial SVG Gauge (0–100):** Real-time animated score with color-coded sentiment tiers:
  - `Critical Debt Stress` (Score < 45)
  - `Vulnerable Leveraged` (Score 45–59)
  - `Balanced Saver` (Score 60–74)
  - `Solid Wealth Builder` (Score 75–89)
  - `Financially Resilient` (Score 90–100)
- **Hybrid Deterministic Math + AI Explanation:** 
  - **Deterministic Layer:** Strict mathematical formulas compute exact 5-year future wealth at 12% CAGR ($FV = P \times \frac{(1+r)^n - 1}{r} \times (1+r)$), EMI-to-income ratios, SIP-to-income ratios, and annual interest drag.
  - **AI Rationale:** Low-latency contextual breakdown explaining *why* the household received that specific score.

### 3. AI-Powered Priority Action Plan
- **3 Ranked, Rupee-Specific Actionable Policies:** Tailored recommendations generated via structured JSON schemas, such as:
  - *50% Bonus Prepayment Rule* calibrated to save compounded interest.
  - *10% Annual SIP Step-Up Target* pegged to income progression.
  - *Liquid Emergency Buffer Target* calculating exact 6-month fixed obligations.
- **Key Vulnerability Callout:** Direct, high-visibility warning highlighting the single biggest leak in the household's balance sheet (e.g., high-interest loan drag, insufficient emergency cushion, or excessive debt-to-income ratio).

---

## 🛠 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Lightning-fast component hydration and Hot Module Replacement (HMR) |
| **Styling** | Vanilla CSS | Custom glassmorphism, obsidian dark theme (`#0a0e17`), HSL color tokens, micro-animations |
| **Icons** | Lucide React | High-clarity financial and navigation iconography |
| **Backend API** | FastAPI (Python 3.10+) | High-performance asynchronous REST API with Pydantic v2 data validation |
| **Server** | Uvicorn | ASGI production server |
| **AI Engine** | Groq Cloud API | Ultra-low-latency inference using `openai/gpt-oss-20b` / `llama3-8b-8192` with enforced JSON schemas (`temperature: 0.2`) |
| **Fallback Engine** | Client & Server Heuristics | Pure mathematical offline fallback; the application remains fully functional even without a Groq API key |
| **Deployment** | Netlify + Render | Static frontend deployed on Netlify; Python FastAPI backend deployed on Render |

---

## 🚀 Local Setup Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- (Optional) **Groq Cloud API Key** from [console.groq.com](https://console.groq.com/)

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# (Optional) Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
# Copy example environment file
cp .env.example .env
```

Open `backend/.env` and add your Groq API key (optional; heuristic mode runs automatically if omitted):
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
PORT=8000
HOST=0.0.0.0
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```
- **Backend API:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Frontend Application:** `http://127.0.0.1:5173`

---

## 🗺 Product Roadmap

The following capabilities are in active development:

1. **📄 Real PDF Upload & Statement Parsing**  
   Direct ingestion of Consolidated Account Statements (CAS) from CAMS and KFintech using `pdfplumber` to extract live portfolio holdings, XIRR, and folio numbers.

2. **🧠 Causal Return Explainer (RAG-Powered)**  
   Retrieval-augmented macroeconomic context that explains *why* a particular mutual fund or category underperformed (e.g., RBI rate cycles, tech valuation corrections, banking sector NPA trends).

3. **⚖️ Smart Exit & Hold Advisor**  
   Tax-aware recommendations factoring in current Union Budget capital gains rules (Short-Term Capital Gains vs. Long-Term Capital Gains ₹1.25L exemption threshold) to minimize tax liability upon rebalancing.

4. **🔄 Loan Prepayment vs. Investment Optimizer**  
   Comparative mathematical simulation: *"Should I prepay my ₹30L home loan at 8.75% or maintain an active equity SIP at 12%?"* with risk-adjusted net-worth projections.

5. **🛡️ Insurance Coverage Gap Analyzer**  
   Upload term life and health insurance policy schedules; the AI cross-references family liabilities and income to detect underinsurance or missing critical illness riders.

6. **🔍 Advanced Cross-Document Intelligence**  
   Unified anomaly detection across loan sanction letters, credit card statements, and MF folios to flag hidden fees and interest rate hikes.

7. **🇮🇳 Vernacular & Hindi Language Support**  
   Full Hindi and regional language user interface, localized voice synthesis, and native-language policy generation.

8. **💾 MongoDB Atlas Cloud Persistence**  
   Secure, anonymized session storage for tracking financial health score trajectories over time without requiring personal identity documents.

---

## ⚖️ Disclaimer

> **Return Policy is an informational tool only. All AI outputs are educational and do not constitute SEBI-registered financial advice.**  
> Calculations and compounding projections are based on standard mathematical models (assuming illustrative 12% CAGR equity compounding). Actual investment returns depend on market fluctuations, fund allocations, and macroeconomic factors. Users should consult a SEBI-registered Investment Advisor (RIA) before making major financial commitments.
