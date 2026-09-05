import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import FinancialSliders from './components/FinancialSliders';
import ScoreGauge from './components/ScoreGauge';
import WealthCard from './components/WealthCard';
import DebtRatioCard from './components/DebtRatioCard';
import ActionPlan from './components/ActionPlan';
import ErrorBanner from './components/ErrorBanner';
import { simulatePolicy, calculateInstantPreview, checkBackendHealth } from './services/api';

const INITIAL_INPUTS = {
  monthly_sip: 15000,
  loan_emi: 22000,
  loan_interest_rate: 8.5,
  annual_income: 1400000
};

export default function App() {
  const [inputs, setInputs] = useState(INITIAL_INPUTS);
  const [deterministicMetrics, setDeterministicMetrics] = useState(() => calculateInstantPreview(INITIAL_INPUTS));
  const [aiAssessment, setAiAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isGroqConfigured, setIsGroqConfigured] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  const debounceTimerRef = useRef(null);

  // Check health on mount with automatic retry for cold-start latency
  useEffect(() => {
    let isMounted = true;
    async function verifyBackend(retries = 2) {
      const health = await checkBackendHealth();
      if (!isMounted) return;
      if (health.status === "healthy") {
        setBackendStatus("healthy");
        setIsGroqConfigured(health.groq_configured);
        setBannerNotice(null);
        if (!health.groq_configured) {
          setBannerNotice({
            message: "Running in Smart Heuristic Mode. Add GROQ_API_KEY to backend environment to activate live Groq AI inference.",
            type: "info"
          });
        }
      } else {
        if (retries > 0) {
          setTimeout(() => {
            if (isMounted) verifyBackend(retries - 1);
          }, 2500);
        } else {
          setBackendStatus("offline");
          setBannerNotice({
            message: "FastAPI server connecting... Using client-side deterministic models.",
            type: "warning"
          });
        }
      }
    }
    verifyBackend();
    return () => { isMounted = false; };
  }, []);

  // Update deterministic preview immediately on slider change, then debounce Groq call
  useEffect(() => {
    // 1. Instant 0-latency calculation for immediate UI response
    const preview = calculateInstantPreview(inputs);
    setDeterministicMetrics(preview);

    // 2. Debounce the full backend simulation call by 400ms
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await simulatePolicy(inputs);
        if (response.deterministic_metrics) {
          setDeterministicMetrics(response.deterministic_metrics);
        }
        if (response.ai_assessment) {
          setAiAssessment(response.ai_assessment);
          setBackendStatus("healthy");
          setBannerNotice(null);
        }
      } catch (err) {
        console.warn("Backend simulate call failed, using client-side fallback:", err.message);
        // Synthesize fallback AI assessment locally if backend is unavailable
        const sipRatio = preview.sip_to_income_ratio_pct;
        const emiRatio = preview.emi_to_income_ratio_pct;
        let score = Math.round(50 + (sipRatio * 1.5) - (emiRatio * 0.9) - ((inputs.loan_interest_rate - 7) * 1.2));
        score = Math.max(15, Math.min(95, score));

        let tier = "Balanced Builder";
        if (score < 45) tier = "Critical Debt Stress";
        else if (score < 70) tier = "Vulnerable Leveraged";
        else if (score >= 80) tier = "Solid Wealth Builder";

        setAiAssessment({
          financial_health_score: score,
          rating_tier: tier,
          score_rationale: `Your EMI commitment consumes ${emiRatio.toFixed(1)}% of income while your SIP compounds at ${sipRatio.toFixed(1)}%. Projected 5-year wealth reaches ₹${(preview.five_year_sip_projected_wealth / 100000).toFixed(2)} Lakhs.`,
          priority_action_plan: [
            {
              bullet_number: 1,
              title: "Adopt a 50% Bonus Prepayment Rule",
              action: `Allocate half of annual bonuses to prepay the ${inputs.loan_interest_rate}% debt principal, saving compounded interest.`
            },
            {
              bullet_number: 2,
              title: "Enforce 10% Annual SIP Step-Up",
              action: `Step up your ₹${inputs.monthly_sip.toLocaleString('en-IN')} SIP by 10% each year as income expands.`
            },
            {
              bullet_number: 3,
              title: "Protect Fixed Commitments with 6-Month Liquid Reserve",
              action: `Maintain ₹${Math.round(inputs.loan_emi * 6).toLocaleString('en-IN')} in high-interest sweep deposits for emergency continuity.`
            }
          ],
          key_vulnerability: `Carrying debt at ${inputs.loan_interest_rate}% interest diminishes net gains from equity mutual fund compounding.`
        });
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputs]);

  return (
    <div className="app-wrapper">
      <Header backendStatus={backendStatus} isGroqConfigured={isGroqConfigured} />

      {bannerNotice && (
        <ErrorBanner
          message={bannerNotice.message}
          type={bannerNotice.type}
          onClose={() => setBannerNotice(null)}
        />
      )}

      <main className="dashboard-grid">
        {/* Left Column: Sliders Input Panel */}
        <div>
          <FinancialSliders values={inputs} onChange={setInputs} />
        </div>

        {/* Right Column: AI Score, Compounding Metrics & Policy Plan */}
        <div className="results-column">
          <ScoreGauge
            score={aiAssessment?.financial_health_score ?? 68}
            tier={aiAssessment?.rating_tier}
            rationale={aiAssessment?.score_rationale}
            isLoading={isLoading}
          />

          <div className="metrics-two-row">
            <WealthCard metrics={deterministicMetrics} />
            <DebtRatioCard metrics={deterministicMetrics} />
          </div>

          <ActionPlan
            plan={aiAssessment?.priority_action_plan}
            vulnerability={aiAssessment?.key_vulnerability}
            isLoading={isLoading}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p className="footer-copyright">© 2026 Return Policy. All rights reserved.</p>
        <p className="footer-disclaimer">
          Return Policy is an informational tool only. AI-generated outputs are educational and do not constitute SEBI-registered financial advice. Always consult a qualified financial advisor before making major financial decisions.
        </p>
      </footer>
    </div>
  );
}
