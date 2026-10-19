import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  Sliders, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  RefreshCw,
  ChevronDown,
  Layers,
  Award,
  Zap
} from 'lucide-react';
import TiltCard from './TiltCard';
import Exit3DVisualizer from './Exit3DVisualizer';
import { analyzeExitTax, calculateLocalExitAnalysis } from '../services/api';

const EQUITY_CATEGORIES = [
  "Equity: Flexi Cap / Large Cap",
  "Equity: Mid Cap / Small Cap",
  "Equity: Index / ETF",
  "Equity: ELSS (Tax Saver - 3yr lock)",
  "Equity: Sectoral / Thematic",
  "Equity: General"
];

const DEBT_CATEGORIES = [
  "Debt: Liquid / Ultra Short Duration",
  "Debt: Money Market / Low Duration",
  "Debt: Corporate Bond Fund",
  "Debt: Banking & PSU Fund",
  "Debt: General"
];

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

export default function ExitAdvisor() {
  // Form input state
  const [investmentType, setInvestmentType] = useState("Equity Fund");
  const [fundCategory, setFundCategory] = useState("Equity: Flexi Cap / Large Cap");
  const [amountInvested, setAmountInvested] = useState(100000);
  const [currentValue, setCurrentValue] = useState(120000);
  const [holdingPeriodDays, setHoldingPeriodDays] = useState(200);
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 200);
    return d.toISOString().split('T')[0];
  });
  const [customExitLoad, setCustomExitLoad] = useState("");
  const [debtSlabRate, setDebtSlabRate] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Result state
  const [analysisResult, setAnalysisResult] = useState(() => {
    return calculateLocalExitAnalysis({
      investment_type: "Equity Fund",
      amount_invested: 100000,
      current_value: 120000,
      holding_period_days: 200,
      fund_category: "Equity: Flexi Cap / Large Cap"
    });
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Automatic real-time local calculation when inputs change
  useEffect(() => {
    const local = calculateLocalExitAnalysis({
      investment_type: investmentType,
      fund_category: fundCategory,
      amount_invested: parseFloat(amountInvested) || 0,
      current_value: parseFloat(currentValue) || 0,
      holding_period_days: parseInt(holdingPeriodDays, 10) || 0,
      exit_load_pct: customExitLoad !== "" ? parseFloat(customExitLoad) : null,
      applicable_slab_rate_pct: investmentType === "Debt Fund" ? parseFloat(debtSlabRate) : 30.0
    });
    setAnalysisResult(local);
  }, [investmentType, fundCategory, amountInvested, currentValue, holdingPeriodDays, customExitLoad, debtSlabRate]);

  // Sync purchase date to holding period days
  const handleDateChange = (e) => {
    const selectedDateStr = e.target.value;
    setPurchaseDate(selectedDateStr);
    if (!selectedDateStr) return;
    const selected = new Date(selectedDateStr);
    const now = new Date();
    const diffTime = now.getTime() - selected.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    setHoldingPeriodDays(diffDays);
  };

  // Sync holding period days to purchase date
  const handleDaysChange = (val) => {
    const days = parseInt(val, 10);
    const safeDays = isNaN(days) ? 0 : Math.max(0, days);
    setHoldingPeriodDays(safeDays);
    const d = new Date();
    d.setDate(d.getDate() - safeDays);
    setPurchaseDate(d.toISOString().split('T')[0]);
  };

  const handleInvestmentTypeChange = (type) => {
    setInvestmentType(type);
    if (type === "Equity Fund") {
      setFundCategory("Equity: Flexi Cap / Large Cap");
    } else {
      setFundCategory("Debt: Corporate Bond Fund");
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      investment_type: investmentType,
      fund_category: fundCategory,
      amount_invested: parseFloat(amountInvested) || 0,
      current_value: parseFloat(currentValue) || 0,
      holding_period_days: parseInt(holdingPeriodDays, 10) || 0,
      exit_load_pct: customExitLoad !== "" ? parseFloat(customExitLoad) : null,
      applicable_slab_rate_pct: investmentType === "Debt Fund" ? parseFloat(debtSlabRate) : 30.0
    };

    try {
      const result = await analyzeExitTax(payload);
      setAnalysisResult(result);
    } catch (err) {
      console.warn("Backend /api/exit-analysis call fallback:", err.message);
      const localResult = calculateLocalExitAnalysis(payload);
      setAnalysisResult(localResult);
      setServerError("Local deterministic calculation active (backend sync)");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadExample = (mode) => {
    if (mode === "short-term") {
      setInvestmentType("Equity Fund");
      setFundCategory("Equity: Flexi Cap / Large Cap");
      setAmountInvested(100000);
      setCurrentValue(120000);
      handleDaysChange(200);
      setCustomExitLoad("");
    } else if (mode === "long-term") {
      setInvestmentType("Equity Fund");
      setFundCategory("Equity: Large Cap");
      setAmountInvested(100000);
      setCurrentValue(300000);
      handleDaysChange(400);
      setCustomExitLoad("");
    } else if (mode === "debt-fund") {
      setInvestmentType("Debt Fund");
      setFundCategory("Debt: Corporate Bond Fund");
      setAmountInvested(200000);
      setCurrentValue(225000);
      handleDaysChange(450);
      setDebtSlabRate(30);
      setCustomExitLoad("");
    }
  };

  const isShortTerm = analysisResult.holding_status === "Short-Term";
  const isHold = analysisResult.recommendation === "Hold";
  const isEquity = analysisResult.investment_type === "Equity Fund";
  const thresholdDays = isEquity ? 365 : 1095;
  const rawGain = (parseFloat(currentValue) || 0) - (parseFloat(amountInvested) || 0);
  const rawGainPct = amountInvested > 0 ? (rawGain / amountInvested * 100).toFixed(1) : "0.0";

  return (
    <div className="exit-advisor-container" id="exit-advisor-section">
      {/* 3D Horizon Visualizer Hero Header */}
      <TiltCard maxTilt={4} perspective={1400} scale={1.005} className="exit-hero-card-3d glass-panel">
        <div className="exit-advisor-header-inner">
          <div className="exit-header-left">
            <div className="exit-header-badge">
              <span className="pulse-dot pulse-purple"></span>
              <span>Deterministic 3D Tax Optimizer</span>
              <span className="badge-chip-3d">Budget 2024 Active</span>
            </div>
            <h2 className="exit-title">Smart Exit & Hold Tax Advisor</h2>
            <p className="exit-subtitle">
              Interactive financial physics engine evaluating your mutual fund exit timing.
              Identify whether selling today triggers punitive 20% STCG and AMC exit load penalties, or if holding unlocks ₹1,25,000 tax-free LTCG gains.
            </p>

            <div className="exit-quick-scenarios-row">
              <span className="quick-label">Instant Scenarios:</span>
              <button 
                type="button" 
                className="chip-scenario-btn"
                onClick={() => loadExample("short-term")}
              >
                <Zap size={13} className="chip-icon" />
                Short-Term Equity (200d)
              </button>
              <button 
                type="button" 
                className="chip-scenario-btn"
                onClick={() => loadExample("long-term")}
              >
                <Award size={13} className="chip-icon" />
                Long-Term Holding (400d)
              </button>
              <button 
                type="button" 
                className="chip-scenario-btn"
                onClick={() => loadExample("debt-fund")}
              >
                <Layers size={13} className="chip-icon" />
                Debt Fund (Slab Rate)
              </button>
            </div>
          </div>

          {/* Real-time 3D Horizon Visualizer */}
          <div className="exit-header-3d-stage">
            <Exit3DVisualizer
              holdingDays={holdingPeriodDays}
              thresholdDays={thresholdDays}
              isHold={isHold}
              savings={analysisResult.potential_savings}
            />
          </div>
        </div>
      </TiltCard>

      {/* Main Two-Column 3D Layout */}
      <div className="exit-advisor-grid">
        {/* Left Column: Input Form wrapped in 3D TiltCard */}
        <TiltCard maxTilt={5} perspective={1200} scale={1.01} className="exit-form-tilt-wrap">
          <div className="exit-form-card glass-panel-3d">
            <div className="card-header-row-3d">
              <div className="header-title-group">
                <Sliders size={20} className="icon-purple-glow" />
                <h3 className="section-title-3d">Investment Details</h3>
              </div>
              <span className="badge-3d-pill">Single Asset Evaluation</span>
            </div>

            <form onSubmit={handleSubmit} className="exit-form-3d">
              {/* 3D Segmented Control: Investment Type */}
              <div className="form-group-3d">
                <label className="form-label-3d">Investment Type</label>
                <div className="segmented-control-3d">
                  <button
                    type="button"
                    id="investment-type-equity-btn"
                    className={`segment-btn-3d ${investmentType === "Equity Fund" ? "active" : ""}`}
                    onClick={() => handleInvestmentTypeChange("Equity Fund")}
                  >
                    <span className="segment-indicator"></span>
                    <TrendingUp size={15} />
                    <span>Equity Mutual Fund</span>
                  </button>
                  <button
                    type="button"
                    id="investment-type-debt-btn"
                    className={`segment-btn-3d ${investmentType === "Debt Fund" ? "active" : ""}`}
                    onClick={() => handleInvestmentTypeChange("Debt Fund")}
                  >
                    <span className="segment-indicator"></span>
                    <ShieldCheck size={15} />
                    <span>Debt Mutual Fund</span>
                  </button>
                </div>
              </div>

              {/* Fund Category with Custom 3D Select */}
              <div className="form-group-3d">
                <label className="form-label-3d" htmlFor="fund-category-select">
                  Fund Category
                </label>
                <div className="custom-select-wrapper-3d">
                  <select
                    id="fund-category-select"
                    className="custom-select-3d"
                    value={fundCategory}
                    onChange={(e) => setFundCategory(e.target.value)}
                  >
                    {(investmentType === "Equity Fund" ? EQUITY_CATEGORIES : DEBT_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="select-chevron-icon" />
                </div>
              </div>

              {/* Amount Invested & Current Value Dual Grid */}
              <div className="form-row-dual-3d">
                <div className="form-group-3d">
                  <div className="label-with-meta">
                    <label className="form-label-3d" htmlFor="amount-invested-input">
                      Amount Invested
                    </label>
                  </div>
                  <div className="input-box-3d">
                    <span className="currency-prefix-3d">₹</span>
                    <input
                      id="amount-invested-input"
                      type="number"
                      min="1000"
                      step="5000"
                      className="clean-number-input"
                      value={amountInvested}
                      onChange={(e) => setAmountInvested(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-3d">
                  <div className="label-with-meta">
                    <label className="form-label-3d" htmlFor="current-value-input">
                      Current Value
                    </label>
                    <span className={`gain-chip-mini ${rawGain >= 0 ? 'gain-pos' : 'gain-neg'}`}>
                      {rawGain >= 0 ? `+₹${Math.round(rawGain).toLocaleString('en-IN')}` : `-₹${Math.round(Math.abs(rawGain)).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="input-box-3d">
                    <span className="currency-prefix-3d">₹</span>
                    <input
                      id="current-value-input"
                      type="number"
                      min="0"
                      step="5000"
                      className="clean-number-input"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="quick-amount-chips">
                <span className="chips-title">Quick Invested:</span>
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`amt-chip ${Number(amountInvested) === amt ? 'active' : ''}`}
                    onClick={() => setAmountInvested(amt)}
                  >
                    ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                  </button>
                ))}
              </div>

              {/* Holding Period Interactive Slider & Date Picker */}
              <div className="form-group-3d holding-period-group">
                <div className="holding-header-row">
                  <label className="form-label-3d" htmlFor="holding-days-slider">
                    Holding Period Duration
                  </label>
                  <div className="holding-badge-readout">
                    <Clock size={13} />
                    <strong>{holdingPeriodDays} Days</strong>
                    <span className="threshold-subtext">
                      ({holdingPeriodDays >= thresholdDays ? "LTCG Window Reached" : `${thresholdDays - holdingPeriodDays}d until LTCG`})
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="slider-range-wrap-3d">
                  <input
                    id="holding-days-slider"
                    type="range"
                    min="0"
                    max={thresholdDays + 150}
                    step="1"
                    className="custom-range-slider-3d"
                    value={holdingPeriodDays}
                    onChange={(e) => handleDaysChange(e.target.value)}
                  />
                  <div className="slider-milestone-marker" style={{ left: `${(thresholdDays / (thresholdDays + 150)) * 100}%` }}>
                    <span className="milestone-line"></span>
                    <span className="milestone-text">{thresholdDays}d LTCG Gateway</span>
                  </div>
                </div>

                {/* Dual Days Input + Date Picker Row */}
                <div className="holding-controls-row-3d">
                  <div className="days-direct-input-box">
                    <span className="days-prefix">Days</span>
                    <input
                      id="holding-days-input"
                      type="number"
                      min="0"
                      max="5000"
                      className="days-number-field"
                      value={holdingPeriodDays}
                      onChange={(e) => handleDaysChange(e.target.value)}
                    />
                  </div>

                  <span className="or-text-divider">or purchase date</span>

                  <div className="date-picker-box-3d">
                    <Calendar size={14} className="calendar-field-icon" />
                    <input
                      id="purchase-date-input"
                      type="date"
                      className="clean-date-field"
                      value={purchaseDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={handleDateChange}
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="days-preset-chips-3d">
                  {[
                    { label: "180d (~6M)", days: 180 },
                    { label: "200d", days: 200 },
                    { label: "335d (~11M)", days: 335 },
                    { label: "365d (1 Yr)", days: 365 },
                    { label: "400d (LTCG)", days: 400 }
                  ].map((chip) => (
                    <button
                      key={chip.days}
                      type="button"
                      className={`chip-pill-3d ${holdingPeriodDays === chip.days ? 'active' : ''}`}
                      onClick={() => handleDaysChange(chip.days)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Parameters Accordion (Custom Exit Load & Slab Rate) */}
              <div className="advanced-accordion-3d">
                <button
                  type="button"
                  className="advanced-toggle-btn-3d"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span className="toggle-left">
                    <Sliders size={14} />
                    <span>{showAdvanced ? "Hide Advanced Exit Parameters" : "Customize Exit Load & Tax Slab"}</span>
                  </span>
                  <span className={`toggle-chevron ${showAdvanced ? 'rotate-open' : ''}`}>▼</span>
                </button>

                {showAdvanced && (
                  <div className="advanced-drawer-3d">
                    <div className="form-group-3d">
                      <div className="label-with-meta">
                        <label className="form-label-3d" htmlFor="custom-exit-load-input">
                          Custom AMC Exit Load (%)
                        </label>
                        <span className="meta-sub">Default: 1.0% (&lt;365d)</span>
                      </div>
                      <div className="input-box-3d">
                        <input
                          id="custom-exit-load-input"
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          placeholder="1.0"
                          className="clean-number-input"
                          value={customExitLoad}
                          onChange={(e) => setCustomExitLoad(e.target.value)}
                        />
                        <span className="suffix-tag-3d">%</span>
                      </div>
                    </div>

                    {investmentType === "Debt Fund" && (
                      <div className="form-group-3d">
                        <label className="form-label-3d" htmlFor="debt-slab-rate-select">
                          Income Tax Slab Rate (%)
                        </label>
                        <div className="custom-select-wrapper-3d">
                          <select
                            id="debt-slab-rate-select"
                            className="custom-select-3d"
                            value={debtSlabRate}
                            onChange={(e) => setDebtSlabRate(e.target.value)}
                          >
                            <option value="10">10% Slab</option>
                            <option value="20">20% Slab</option>
                            <option value="30">30% Slab (Standard)</option>
                            <option value="39">39% Slab (Highest Surcharge)</option>
                          </select>
                          <ChevronDown size={16} className="select-chevron-icon" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3D Action Submit Button */}
              <button
                id="btn-calculate-exit"
                type="submit"
                className="btn-action-3d"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={17} className="spin-icon" />
                    <span>Analyzing Statutory Tax Rules...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Calculate Exit & Hold Advice</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </TiltCard>

        {/* Right Column: 3D Holographic Results & Breakdown */}
        <div className="exit-results-column-3d">
          {/* 3D Holographic Recommendation Banner */}
          <TiltCard maxTilt={6} perspective={1400} scale={1.01} className="rec-tilt-wrap">
            <div className={`recommendation-banner-3d ${isHold ? 'banner-glow-hold' : 'banner-glow-exit'}`}>
              <div className="banner-header-row-3d">
                <div className="badge-recommendation-pill">
                  {isHold ? (
                    <span className="rec-chip chip-hold">
                      <ShieldCheck size={16} />
                      RECOMMENDED: HOLD
                    </span>
                  ) : (
                    <span className="rec-chip chip-exit">
                      <CheckCircle2 size={16} />
                      RECOMMENDED: EXIT NOW
                    </span>
                  )}
                </div>
                <div className="tax-regime-pill-3d">
                  <span className="regime-dot"></span>
                  <span>{analysisResult.tax_type} Regime ({analysisResult.tax_rate_applied_pct}% rate)</span>
                </div>
              </div>

              <h3 className="banner-headline-3d">
                {analysisResult.recommendation_summary}
              </h3>

              {isHold && analysisResult.days_to_ltcg_window !== null && (
                <div className="milestone-tracker-3d">
                  <div className="tracker-labels-row">
                    <span>Held: <strong>{analysisResult.holding_period_days} Days</strong></span>
                    <span className="countdown-highlight">
                      <Clock size={14} />
                      {analysisResult.days_to_ltcg_window} Days Remaining
                    </span>
                    <span>Target: <strong>{thresholdDays} Days</strong></span>
                  </div>
                  <div className="tracker-bar-track">
                    <div 
                      className="tracker-bar-progress" 
                      style={{ width: `${Math.min(100, Math.round((holdingPeriodDays / thresholdDays) * 100))}%` }}
                    >
                      <div className="progress-glow-head"></div>
                    </div>
                  </div>
                </div>
              )}

              {isHold && analysisResult.potential_savings > 0 && (
                <div className="savings-highlight-callout-3d">
                  <div className="savings-num-col">
                    <span className="callout-tag">Quantifiable Net Savings</span>
                    <span className="callout-val">
                      ₹{Math.round(analysisResult.potential_savings).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="savings-rationale-text">
                    <p>
                      Exiting today triggers ₹{Math.round(analysisResult.current_tax).toLocaleString('en-IN')} in short-term tax plus ₹{Math.round(analysisResult.exit_load_amount).toLocaleString('en-IN')} in exit loads. Holding for {analysisResult.days_to_ltcg_window} days unlocks the ₹1.25L exemption and 0% penalty.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TiltCard>

          {/* 3D Comparison Cards: Option A vs Option B */}
          <div className="comparison-cards-dual-3d">
            {/* Card 1: Exiting Today */}
            <TiltCard maxTilt={8} perspective={1200} scale={1.01} className="comparison-tilt-card">
              <div className="cost-card-3d card-now-friction">
                <div className="card-friction-header">
                  <span className="option-letter option-now">Option A</span>
                  <span className="option-title">Exit Today ({analysisResult.holding_period_days}d)</span>
                </div>

                <div className="friction-metric-center">
                  <span className="friction-caption">Total Exit Friction Today</span>
                  <span className="friction-number text-rose">
                    ₹{Math.round(analysisResult.total_cost_now).toLocaleString('en-IN')}
                  </span>
                  <span className="net-inhand-tag">
                    Net in-hand: ₹{Math.round(analysisResult.net_inhand_now).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="friction-breakdown-box">
                  <div className="friction-line">
                    <span>{analysisResult.tax_type} Tax ({analysisResult.tax_rate_applied_pct}%)</span>
                    <strong>₹{Math.round(analysisResult.current_tax).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="friction-line">
                    <span>Exit Load Penalty ({analysisResult.exit_load_pct}%)</span>
                    <strong>₹{Math.round(analysisResult.exit_load_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="friction-line friction-total-row">
                    <span>Total Deductions</span>
                    <span className="text-rose">₹{Math.round(analysisResult.total_cost_now).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Card 2: Hold Until Window */}
            <TiltCard maxTilt={8} perspective={1200} scale={1.01} className="comparison-tilt-card">
              <div className="cost-card-3d card-wait-friction">
                <div className="card-friction-header">
                  <span className="option-letter option-wait">Option B</span>
                  <span className="option-title">Hold Until Window ({thresholdDays}+d)</span>
                </div>

                <div className="friction-metric-center">
                  <span className="friction-caption">Projected Friction (LTCG)</span>
                  <span className="friction-number text-emerald">
                    ₹{Math.round(analysisResult.total_cost_if_wait).toLocaleString('en-IN')}
                  </span>
                  <span className="net-inhand-tag">
                    Net in-hand: ₹{Math.round(analysisResult.net_inhand_if_wait).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="friction-breakdown-box">
                  <div className="friction-line">
                    <span>Projected LTCG (12.5% rate)</span>
                    <strong>₹{Math.round(analysisResult.projected_tax_if_wait).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="friction-line">
                    <span>Exit Load Post-Window</span>
                    <strong className="text-emerald">₹0 (0.0%)</strong>
                  </div>
                  <div className="friction-line friction-total-row">
                    <span>Total Deductions</span>
                    <span className="text-emerald">₹{Math.round(analysisResult.total_cost_if_wait).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flat-market-assumption-pill">
                  <Info size={13} />
                  <span>assuming value stays flat (real returns fluctuate)</span>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Statutory Mechanics & Regulatory Citations */}
          <TiltCard maxTilt={4} perspective={1400} scale={1.005} className="notes-tilt-card">
            <div className="statutory-panel-3d glass-panel-3d">
              <h4 className="statutory-panel-title">
                <Info size={16} className="info-icon-purple" />
                <span>Statutory Tax Rules & Verification Flags</span>
              </h4>

              <div className="statutory-content-grid">
                <div className="statutory-bullet">
                  <span className="bullet-dot-purple"></span>
                  <div>
                    <strong>Total Capital Gain:</strong> ₹{Math.round(analysisResult.gain).toLocaleString('en-IN')} ({analysisResult.gain_pct}% on ₹{Math.round(analysisResult.amount_invested).toLocaleString('en-IN')} principal).
                  </div>
                </div>

                {isEquity && (
                  <div className="statutory-bullet">
                    <span className="bullet-dot-purple"></span>
                    <div>
                      <strong>Finance Act 2024 (Budget 2024):</strong> Equity STCG is levied at 20% under Section 111A. Equity LTCG is levied at 12.5% under Section 112A with an annual exemption of ₹1,25,000 per financial year.
                    </div>
                  </div>
                )}

                {analysisResult.ltcg_exemption_applied > 0 && (
                  <div className="statutory-bullet">
                    <span className="bullet-dot-purple"></span>
                    <div>
                      <strong>Section 112A Exemption Applied:</strong> ₹{Math.round(analysisResult.ltcg_exemption_applied).toLocaleString('en-IN')} is completely tax-exempt under the ₹1.25 Lakh annual ceiling.
                    </div>
                  </div>
                )}

                {!isEquity && (
                  <div className="statutory-alert-box-3d">
                    <AlertTriangle size={15} className="alert-amber-icon" />
                    <div>
                      <strong>Rule Verification Flag (Section 50AA):</strong> Under Finance Act 2023, mutual funds with domestic equity &le;35% acquired on or after April 1, 2023 are classified as STCG and taxed at your marginal slab rate regardless of holding period. The 3-year threshold applies only to legacy units acquired prior to April 1, 2023.
                    </div>
                  </div>
                )}
              </div>

              {/* MANDATORY DISCLAIMER LINE (Requirement 4) */}
              <div className="mandatory-sebi-disclaimer-3d">
                <AlertTriangle size={15} className="disclaimer-icon" />
                <p>
                  Exit load and tax rules are illustrative and may not reflect current fund-specific or Budget rules — verify with your fund's SID/KIM before acting.
                </p>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
