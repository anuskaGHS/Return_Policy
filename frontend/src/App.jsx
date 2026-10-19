import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import WhatIfPage from './pages/WhatIfPage';
import { derive } from './lib/whatif/healthScore.js';
import FinancialSliders from './components/FinancialSliders';
import ScoreGauge from './components/ScoreGauge';
import WealthCard from './components/WealthCard';
import DebtRatioCard from './components/DebtRatioCard';
import ActionPlan from './components/ActionPlan';
import ErrorBanner from './components/ErrorBanner';
import TiltCard from './components/TiltCard';
import ExitAdvisor from './components/ExitAdvisor';
import { simulatePolicy, checkBackendHealth } from './services/api';
import { RefreshCw, Sliders, Clock } from 'lucide-react';

const INITIAL_INPUTS = {
  monthly_sip: 15000,
  loan_emi: 22000,
  loan_interest_rate: 8.5,
  annual_income: 1400000
};

export default function App() {
  // Navigation tab: 'home' | 'about' | 'calculator'
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'exit-advisor') return 'calculator';
    if (['home', 'about', 'calculator'].includes(hash)) {
      return hash;
    }
    return 'home';
  });

  // Decision Engine sub-tab: 'simulator' | 'exitAdvisor'
  const [calculatorSubTab, setCalculatorSubTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'exit-advisor') return 'exitAdvisor';
    return 'simulator';
  });

  const [inputs, setInputs] = useState(INITIAL_INPUTS);
  const [language, setLanguage] = useState('en');
  const [whatIfInputs, setWhatIfInputs] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiStatus, setAiStatus] = useState('loading');   // 'loading' | 'ai' | 'fallback'
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isGroqConfigured, setIsGroqConfigured] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Sync state with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'exit-advisor') {
        setActiveTab('calculator');
        setCalculatorSubTab('exitAdvisor');
      } else if (['home', 'about', 'calculator'].includes(hash)) {
        setActiveTab(hash);
        if (hash === 'calculator') {
          setCalculatorSubTab('simulator');
        }
      }
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab, subTab = 'simulator') => {
    setActiveTab(tab);
    if (tab === 'calculator') {
      setCalculatorSubTab(subTab);
      window.location.hash = subTab === 'exitAdvisor' ? '#exit-advisor' : '#calculator';
    } else {
      window.location.hash = `#${tab}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPreset = (newInputs) => {
    setInputs(newInputs);
    navigateTo('calculator', 'simulator');
  };


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

  useEffect(() => {
    const onWhatIf = activeTab === 'calculator' && calculatorSubTab === 'simulator';
    if (!onWhatIf || !whatIfInputs) return undefined;
    let cancelled = false;
    setExplanation(null);
    setAiPlan(null);
    setAiStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const response = await simulatePolicy({ ...whatIfInputs, language });
        if (cancelled) return;
        setBackendStatus('healthy');
        const ai = response?.ai_assessment;
        if (ai && ai.source === 'groq') {
          const rules = Array.isArray(ai.priority_action_plan)
            ? ai.priority_action_plan
                .filter((r) => r && r.title && r.action)
                .map((r) => ({ title: r.title, action: r.action }))
            : [];
          if (rules.length) {
            setExplanation(ai.score_rationale || null);
            setAiPlan({ rules, vulnerability: ai.key_vulnerability || null });
            setAiStatus('ai');
          } else {
            setExplanation(null);
            setAiPlan(null);
            setAiStatus('fallback');
          }
        } else {
          setExplanation(null);
          setAiPlan(null);
          setAiStatus('fallback');
        }
        const local = derive(whatIfInputs).score;
        if (response?.health_score && response.health_score.score !== local) {
          console.warn('Health score mismatch (browser vs backend):', local, response.health_score.score);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Simulate call failed; the page keeps its built-in explanation:', err.message);
          setAiStatus('fallback');
        }
      }
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [whatIfInputs, language, activeTab, calculatorSubTab]);

  const showLanguageToggle = activeTab === 'calculator' && calculatorSubTab === 'simulator';

  if (activeTab === 'calculator' && calculatorSubTab === 'simulator') {
    return (
      <WhatIfPage
        initialProfile={inputs}
        explanation={explanation}
        aiPlan={aiPlan}
        aiStatus={aiStatus}
        lang={language}
        onLangChange={setLanguage}
        onInputsChange={setWhatIfInputs}
        activeTool="whatif"
        onToolChange={(id) => { if (id === 'smartexit') navigateTo('calculator', 'exitAdvisor'); }}
      />
    );
  }

  return (
    <div className={`app-wrapper ${activeTab === 'home' ? 'app-wrapper-home' : ''}`}>
      <Header
        currentTab={activeTab}
        onNavigate={navigateTo}
        backendStatus={backendStatus}
        isGroqConfigured={isGroqConfigured}
        language={language}
        onLanguageChange={setLanguage}
        showLanguageToggle={showLanguageToggle}
      />

      {bannerNotice && (
        <ErrorBanner
          message={bannerNotice.message}
          type={bannerNotice.type}
          onClose={() => setBannerNotice(null)}
        />
      )}

      {/* Main Content Pages */}
      <div className="page-transition-wrapper">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onSelectPreset={handleSelectPreset}
          />
        )}

        {activeTab === 'about' && (
          <AboutPage
            tryHref="#calculator"
            homeHref="#home"
          />
        )}

        {activeTab === 'calculator' && (
          <div className="calculator-view">
            {/* Decision Engine Sub-Navigation Bar */}
            <div className="engine-subtabs-bar glass-panel" role="tablist" aria-label="Decision Engine Tools">
              <button
                id="subtab-simulator-btn"
                role="tab"
                aria-selected={calculatorSubTab === 'simulator'}
                className={`engine-subtab-btn ${calculatorSubTab === 'simulator' ? 'active' : ''}`}
                onClick={() => navigateTo('calculator', 'simulator')}
              >
                <Sliders size={16} />
                <span>What-If Policy Simulator</span>
              </button>
              <button
                id="subtab-exit-advisor-btn"
                role="tab"
                aria-selected={calculatorSubTab === 'exitAdvisor'}
                className={`engine-subtab-btn ${calculatorSubTab === 'exitAdvisor' ? 'active' : ''}`}
                onClick={() => navigateTo('calculator', 'exitAdvisor')}
              >
                <Clock size={16} />
                <span>Smart Exit & Hold Tax Advisor</span>
                <span className="subtab-new-badge">NEW</span>
              </button>
            </div>

            {calculatorSubTab === 'exitAdvisor' && (
              <ExitAdvisor />
            )}
          </div>
        )}
      </div>

      {/* Global Footer */}
      <footer className="app-footer">
        <div className="footer-links-row">
          <button className="footer-link" onClick={() => navigateTo('home')}>Home</button>
          <span className="footer-dot">•</span>
          <button className="footer-link" onClick={() => navigateTo('about')}>About Platform</button>
          <span className="footer-dot">•</span>
          <button className="footer-link" onClick={() => navigateTo('calculator', 'simulator')}>Decision Engine</button>
          <span className="footer-dot">•</span>
          <button className="footer-link" onClick={() => navigateTo('calculator', 'exitAdvisor')}>Smart Exit Advisor</button>
        </div>
        <p className="footer-copyright">© 2026 Return Policy — AI-Powered Household Finance Decision Engine.</p>
        <p className="footer-disclaimer">
          {activeTab === 'home'
            ? 'Return Policy is an informational tool, not SEBI-registered financial advice. AI-generated outputs are educational, and the 12% annual return used in projections is illustrative. Consult a qualified financial advisor before major financial decisions.'
            : 'Return Policy is an informational tool only. AI-generated outputs are educational and do not constitute SEBI-registered financial advice. Standard 12% CAGR equity compounding is illustrative. Always consult a qualified financial advisor before major financial commitments.'}
        </p>
      </footer>
    </div>
  );
}
