import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ScoreGauge({ score, tier, rationale, isLoading }) {
  // Clamp score between 0 and 100
  const validScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  
  // Radial circumference calculation
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  // Determine tier styling
  let tierClass = "tier-emerald";
  let strokeColor = "#10b981";
  let TierIcon = ShieldCheck;

  if (validScore < 45) {
    tierClass = "tier-rose";
    strokeColor = "#f43f5e";
    TierIcon = ShieldAlert;
  } else if (validScore < 75) {
    tierClass = "tier-amber";
    strokeColor = "#f59e0b";
    TierIcon = AlertTriangle;
  }

  return (
    <div className={`glass-panel score-hero-card ${isLoading ? 'loading-pulse' : ''}`} aria-label="Financial Health Score Card">
      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 120 120">
          {/* Background Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="10"
          />
          {/* Animated Value Arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease"
            }}
          />
        </svg>

        <div className="gauge-center-text">
          <span className="gauge-number" style={{ color: strokeColor }}>
            {validScore}
          </span>
          <span className="gauge-caption">Health</span>
        </div>
      </div>

      <div className="score-details">
        <div className={`score-tier-badge ${tierClass}`}>
          <TierIcon size={16} />
          <span>{tier || "Analyzing Profile..."}</span>
        </div>
        <p className="score-rationale-text">
          {rationale || "Calculating your financial health score based on debt load and SIP compounding pace..."}
        </p>
      </div>
    </div>
  );
}
