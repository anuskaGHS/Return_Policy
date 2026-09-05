import React from 'react';
import { IndianRupee } from 'lucide-react';

export default function Header({ backendStatus, isGroqConfigured }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <IndianRupee size={24} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="brand-title">Return Policy</h1>
          <p className="brand-subtitle">
            Personal Wealth Compounding & Financial Health Advisor
          </p>
        </div>
      </div>

      <div className="header-badges">
        <div className="badge badge-status">
          <span className="pulse-dot"></span>
          <span>{backendStatus === "healthy" ? "Engine Active" : "Local Heuristic Mode"}</span>
        </div>
      </div>
    </header>
  );
}
