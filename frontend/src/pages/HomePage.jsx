import React from 'react';
import HomeHero from '../components/home/HomeHero';
import HomeSections from '../components/home/HomeSections';

const PERSONA_PRESETS = {
  'early-career': { monthly_sip: 5000, loan_emi: 12000, loan_interest_rate: 9.5, annual_income: 600000 },
  'balanced-builder': { monthly_sip: 15000, loan_emi: 22000, loan_interest_rate: 8.5, annual_income: 1400000 },
  'aggressive-saver': { monthly_sip: 35000, loan_emi: 15000, loan_interest_rate: 7.8, annual_income: 2400000 },
  'high-debt-stress': { monthly_sip: 3000, loan_emi: 45000, loan_interest_rate: 11.5, annual_income: 900000 }
};

export default function HomePage({ onNavigate, onSelectPreset }) {
  const handleSimulatePersona = (id) => {
    const preset = PERSONA_PRESETS[id];
    if (preset && onSelectPreset) {
      onSelectPreset(preset);
    } else if (onNavigate) {
      onNavigate('calculator', 'simulator');
    }
  };

  const handleOpenEngine = () => {
    if (onNavigate) {
      onNavigate('calculator', 'simulator');
    }
  };

  const handleOpenFinances = () => {
    if (onNavigate) {
      onNavigate('finances');
    }
  };

  return (
    <div className="home-page-container resq-theme">
      {/* 1. HERO SECTION */}
      <HomeHero
        onEngineClick={(e) => {
          e.preventDefault();
          onNavigate('calculator', 'simulator');
        }}
        onAboutClick={(e) => {
          e.preventDefault();
          onNavigate('about');
        }}
      />

      {/* 2. HOME SECTIONS (Feature Ring, Household Presets & Closing CTA) */}
      <HomeSections
        onSimulatePersona={handleSimulatePersona}
        onOpenEngine={handleOpenEngine}
        onOpenFinances={handleOpenFinances}
      />
    </div>
  );
}
