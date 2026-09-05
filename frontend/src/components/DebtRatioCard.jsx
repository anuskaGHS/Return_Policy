import React from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { formatPct, formatINR } from '../utils/formatters';

export default function DebtRatioCard({ metrics }) {
  const emiRatio = metrics?.emi_to_income_ratio_pct || 0;
  const interestDrag = metrics?.annual_interest_burden_est || 0;
  const category = metrics?.debt_risk_category || "Healthy";

  // Determine bar fill color
  let barColor = "#10b981";
  if (emiRatio > 45) {
    barColor = "#f43f5e";
  } else if (emiRatio >= 30) {
    barColor = "#f59e0b";
  }

  // Visual bar clamped up to 100%
  const fillWidth = Math.min(100, Math.max(0, emiRatio));

  return (
    <div className="glass-panel metric-stat-card" aria-label="Debt Burden and EMI-to-Income Ratio">
      <div className="metric-card-top">
        <span className="metric-card-label">
          <CreditCard size={16} color="#f43f5e" />
          EMI-to-Income Ratio
        </span>
        <span
          className="badge"
          style={{
            color: barColor,
            borderColor: `${barColor}55`,
            background: `${barColor}15`
          }}
        >
          {category}
        </span>
      </div>

      <div className="metric-highlight-value" style={{ color: barColor }}>
        {formatPct(emiRatio, 1)}
      </div>

      <div>
        <div className="ratio-progress-bar-bg">
          <div
            className="ratio-progress-bar-fill"
            style={{
              width: `${fillWidth}%`,
              backgroundColor: barColor
            }}
          />
        </div>
        <div className="slider-limits" style={{ marginTop: '0.35rem' }}>
          <span>Safe (&lt;30%)</span>
          <span>Caution (30-45%)</span>
          <span>High Risk (&gt;45%)</span>
        </div>
      </div>

      <div className="metric-sub-rows">
        <div className="sub-row">
          <span>Est. Annual Interest Drag:</span>
          <strong style={{ color: emiRatio > 35 ? '#fb7185' : '#e2e8f0' }}>
            {formatINR(interestDrag)}
          </strong>
        </div>
      </div>
    </div>
  );
}
