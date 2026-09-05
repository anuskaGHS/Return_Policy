import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { formatINR, formatCompactINR } from '../utils/formatters';

export default function WealthCard({ metrics }) {
  const projectedWealth = metrics?.five_year_sip_projected_wealth || 0;
  const invested = metrics?.five_year_sip_invested || 0;
  const returns = metrics?.five_year_sip_estimated_returns || 0;

  return (
    <div className="glass-panel metric-stat-card" aria-label="5-Year SIP Wealth Projection">
      <div className="metric-card-top">
        <span className="metric-card-label">
          <TrendingUp size={16} color="#10b981" />
          5-Year Projected Wealth (12% CAGR)
        </span>
        <span className="badge" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
          <Sparkles size={12} /> Compounding
        </span>
      </div>

      <div className="metric-highlight-value" style={{ color: '#34d399' }}>
        {formatCompactINR(projectedWealth)}
        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#94a3b8', marginLeft: '6px' }}>
          ({formatINR(projectedWealth)})
        </span>
      </div>

      <div className="metric-sub-rows">
        <div className="sub-row">
          <span>Total Principal Invested (60 mo):</span>
          <strong>{formatINR(invested)}</strong>
        </div>
        <div className="sub-row">
          <span>Estimated Wealth Gain:</span>
          <strong style={{ color: '#10b981' }}>+ {formatINR(returns)}</strong>
        </div>
      </div>
    </div>
  );
}
