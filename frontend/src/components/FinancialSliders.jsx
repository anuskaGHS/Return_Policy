import React, { useState } from 'react';
import { Sliders, TrendingUp, CreditCard, Percent, Wallet, Sparkles, Info } from 'lucide-react';
import { formatINR, formatCompactINR, formatPct } from '../utils/formatters';

const PRESETS = [
  {
    name: "Early Career",
    values: { monthly_sip: 5000, loan_emi: 12000, loan_interest_rate: 9.5, annual_income: 600000 }
  },
  {
    name: "Balanced Builder",
    values: { monthly_sip: 15000, loan_emi: 22000, loan_interest_rate: 8.5, annual_income: 1400000 }
  },
  {
    name: "Aggressive Saver",
    values: { monthly_sip: 35000, loan_emi: 15000, loan_interest_rate: 7.8, annual_income: 2400000 }
  },
  {
    name: "High Debt Stress",
    values: { monthly_sip: 3000, loan_emi: 45000, loan_interest_rate: 11.5, annual_income: 900000 }
  }
];

export default function FinancialSliders({ values, onChange }) {
  const [showSampleInfo, setShowSampleInfo] = useState(false);

  const handleSliderChange = (field, val) => {
    onChange({
      ...values,
      [field]: parseFloat(val)
    });
  };

  const applyPreset = (preset) => {
    onChange(preset.values);
  };

  const handleLoadSample = () => {
    onChange({
      monthly_sip: 15000,
      loan_emi: 28000,
      loan_interest_rate: 9.2,
      annual_income: 1800000
    });
    setShowSampleInfo(true);
  };

  return (
    <section className="glass-panel sliders-panel" aria-label="Financial Parameters Input">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sliders size={20} className="text-primary" />
          Financial Policy Sliders
        </h2>
      </div>

      {/* Sample Portfolio Action & Info */}
      <div className="sample-portfolio-container">
        <button
          type="button"
          className="load-sample-btn"
          onClick={handleLoadSample}
          id="load-sample-portfolio-btn"
        >
          <Sparkles size={16} />
          Load Sample Portfolio
        </button>

        {showSampleInfo && (
          <div className="sample-info-card" role="status">
            <div className="sample-info-content">
              <Info size={16} className="sample-info-icon" />
              <span>Sample: Sharma Family, Pune | Axis Bluechip SIP + Home Loan</span>
            </div>
            <button
              type="button"
              className="sample-info-close"
              onClick={() => setShowSampleInfo(false)}
              aria-label="Dismiss info"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Preset Quick Actions */}
      <div>
        <div className="slider-limits" style={{ marginBottom: '0.4rem' }}>
          <span>QUICK PERSONA PRESETS</span>
        </div>
        <div className="presets-row">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Monthly SIP Slider */}
      <div className="slider-group">
        <div className="slider-label-row">
          <label htmlFor="sip-slider" className="slider-label">
            <TrendingUp size={16} color="#10b981" />
            Monthly SIP Investment
          </label>
          <span className="slider-val-badge" style={{ color: '#34d399' }}>
            {formatINR(values.monthly_sip)}
          </span>
        </div>
        <input
          id="sip-slider"
          type="range"
          min="1000"
          max="50000"
          step="500"
          value={values.monthly_sip}
          onChange={(e) => handleSliderChange('monthly_sip', e.target.value)}
        />
        <div className="slider-limits">
          <span>Min: ₹1,000</span>
          <span>Max: ₹50,000 / mo</span>
        </div>
      </div>

      {/* 2. Monthly Loan EMI Slider */}
      <div className="slider-group">
        <div className="slider-label-row">
          <label htmlFor="emi-slider" className="slider-label">
            <CreditCard size={16} color="#f43f5e" />
            Monthly Loan EMI
          </label>
          <span className="slider-val-badge" style={{ color: values.loan_emi > 30000 ? '#fb7185' : '#e2e8f0' }}>
            {formatINR(values.loan_emi)}
          </span>
        </div>
        <input
          id="emi-slider"
          type="range"
          min="0"
          max="100000"
          step="1000"
          value={values.loan_emi}
          onChange={(e) => handleSliderChange('loan_emi', e.target.value)}
        />
        <div className="slider-limits">
          <span>Min: ₹0</span>
          <span>Max: ₹1,00,000 / mo</span>
        </div>
      </div>

      {/* 3. Loan Interest Rate Slider */}
      <div className="slider-group">
        <div className="slider-label-row">
          <label htmlFor="rate-slider" className="slider-label">
            <Percent size={16} color="#f59e0b" />
            Weighted Loan Interest Rate
          </label>
          <span className="slider-val-badge" style={{ color: '#fbbf24' }}>
            {formatPct(values.loan_interest_rate, 1)}
          </span>
        </div>
        <input
          id="rate-slider"
          type="range"
          min="5.0"
          max="15.0"
          step="0.1"
          value={values.loan_interest_rate}
          onChange={(e) => handleSliderChange('loan_interest_rate', e.target.value)}
        />
        <div className="slider-limits">
          <span>5.0% (Subsidized)</span>
          <span>15.0% (Unsecured/High)</span>
        </div>
      </div>

      {/* 4. Annual Gross Income Slider */}
      <div className="slider-group">
        <div className="slider-label-row">
          <label htmlFor="income-slider" className="slider-label">
            <Wallet size={16} color="#6366f1" />
            Annual Household Income
          </label>
          <span className="slider-val-badge" style={{ color: '#818cf8' }}>
            {formatCompactINR(values.annual_income)}
          </span>
        </div>
        <input
          id="income-slider"
          type="range"
          min="300000"
          max="5000000"
          step="25000"
          value={values.annual_income}
          onChange={(e) => handleSliderChange('annual_income', e.target.value)}
        />
        <div className="slider-limits">
          <span>₹3.0 Lakhs</span>
          <span>₹50.0 Lakhs / yr</span>
        </div>
      </div>
    </section>
  );
}
