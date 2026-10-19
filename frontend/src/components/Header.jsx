import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
// Single config object for the right-side primary action CTA button
const HEADER_PRIMARY_CTA = {
  label: 'Decision Engine',
  tab: 'calculator',
  subTab: 'simulator'
};

export default function Header({ 
  currentTab, 
  onNavigate, 
  language = 'en', 
  onLanguageChange,
  showLanguageToggle = false
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (tab, subTab = 'simulator') => {
    onNavigate(tab, subTab);
    setMobileMenuOpen(false);
  };

  const isHindi = language === 'hi';

  return (
    <header className={`site-header ${currentTab === 'home' ? 'site-header-home' : 'site-header-page'}`}>
      <div className="site-header-inner">
        {/* Brand: Left */}
        <button 
          type="button"
          className="site-header-brand" 
          onClick={() => handleNavClick('home')}
          aria-label="Return Policy Home"
        >
          <span className="site-brand-text">Return Policy</span>
        </button>

        {/* Nav Links: Center */}
        <nav className="site-header-nav" aria-label="Main Navigation">
          <button
            type="button"
            id="nav-home"
            className={`site-nav-link ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
            aria-current={currentTab === 'home' ? 'page' : undefined}
          >
            {currentTab === 'home' && <span className="site-nav-bullet" aria-hidden="true">·</span>}
            <span>Home</span>
          </button>

          <button
            type="button"
            id="nav-about"
            className={`site-nav-link ${currentTab === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
            aria-current={currentTab === 'about' ? 'page' : undefined}
          >
            {currentTab === 'about' && <span className="site-nav-bullet" aria-hidden="true">·</span>}
            <span>About Platform</span>
          </button>

          <button
            type="button"
            id="nav-calculator"
            className={`site-nav-link ${currentTab === 'calculator' ? 'active' : ''}`}
            onClick={() => handleNavClick('calculator', 'simulator')}
            aria-current={currentTab === 'calculator' ? 'page' : undefined}
          >
            {currentTab === 'calculator' && <span className="site-nav-bullet" aria-hidden="true">·</span>}
            <span>Decision Engine</span>
          </button>
        </nav>

        {/* Right Actions: Language Toggle + CTA Pill Button */}
        <div className="site-header-actions">
          {/* Language Toggle (Capsule Pill) - Shown only when showLanguageToggle is true */}
          {showLanguageToggle && (
            <div className="site-lang-toggle" role="group" aria-label="Language selection">
              <button
                type="button"
                id="lang-btn-en"
                className={`site-lang-btn ${!isHindi ? 'active' : ''}`}
                onClick={() => onLanguageChange && onLanguageChange('en')}
                aria-pressed={!isHindi}
                title="Switch to English"
              >
                EN
              </button>
              <span className="site-lang-divider" aria-hidden="true">|</span>
              <button
                type="button"
                id="lang-btn-hi"
                className={`site-lang-btn ${isHindi ? 'active' : ''}`}
                onClick={() => onLanguageChange && onLanguageChange('hi')}
                aria-pressed={isHindi}
                title="Switch to Hindi"
              >
                हिन्दी
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            id="header-cta-engine"
            className="site-cta-pill"
            onClick={() => handleNavClick(HEADER_PRIMARY_CTA.tab, HEADER_PRIMARY_CTA.subTab)}
          >
            <span>{HEADER_PRIMARY_CTA.label}</span>
            <ArrowRight size={14} className="site-cta-arrow" aria-hidden="true" />
          </button>

          {/* Mobile Hamburger Button */}
          <button 
            type="button"
            className="site-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="site-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          {showLanguageToggle && (
            <div className="site-mobile-lang-row">
              <span className="site-mobile-lang-label">Language:</span>
              <div className="site-lang-toggle" role="group" aria-label="Language selection">
                <button
                  type="button"
                  className={`site-lang-btn ${!isHindi ? 'active' : ''}`}
                  onClick={() => onLanguageChange && onLanguageChange('en')}
                  aria-pressed={!isHindi}
                >
                  EN
                </button>
                <span className="site-lang-divider" aria-hidden="true">|</span>
                <button
                  type="button"
                  className={`site-lang-btn ${isHindi ? 'active' : ''}`}
                  onClick={() => onLanguageChange && onLanguageChange('hi')}
                  aria-pressed={isHindi}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`site-mobile-link ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`site-mobile-link ${currentTab === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
          >
            About Platform
          </button>
          <button
            type="button"
            className={`site-mobile-link ${currentTab === 'calculator' ? 'active' : ''}`}
            onClick={() => handleNavClick('calculator', 'simulator')}
          >
            Decision Engine
          </button>

          {currentTab === 'home' && (
            <div className="site-mobile-cta-row">
              <button
                type="button"
                className="site-cta-pill site-mobile-cta-pill"
                onClick={() => handleNavClick(HEADER_PRIMARY_CTA.tab, HEADER_PRIMARY_CTA.subTab)}
              >
                <span>{HEADER_PRIMARY_CTA.label}</span>
                <ArrowRight size={14} className="site-cta-arrow" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
