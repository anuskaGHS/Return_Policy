import { NAV_LINKS } from '../../data/whatIfNav.js';
import { useT } from '../../hooks/useLang.js';

// Page header: brand, primary nav, language toggle.
// `lang` / `onLangChange` are optional; without them the toggle keeps its own state in the parent page.
export default function WhatIfHeader({ lang = 'en', onLangChange }) {
  const t = useT();
  return (
    <header className="wi-nav">
      <a className="wi-brand" href="#home">Return Policy</a>
      <nav className="wi-links" aria-label={t('Primary')}>
        {NAV_LINKS.map((l) => (
          <a key={l.label} href={l.href} aria-current={l.current ? 'page' : undefined}>{t(l.label)}</a>
        ))}
      </nav>
      <div className="wi-actions">
        <div className="wi-lang" role="group" aria-label={t('Language')}>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => onLangChange && onLangChange('en')}>EN</button>
          <button type="button" aria-pressed={lang === 'hi'} lang="hi" onClick={() => onLangChange && onLangChange('hi')}>हिन्दी</button>
        </div>
      </div>
    </header>
  );
}
