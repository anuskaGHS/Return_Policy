import { copy } from '../../lib/finances/i18n.js';

export default function FinancesHeader({ lang, onLangChange }) {
  const t = copy[lang];
  return <header className="mf-nav">
    <a className="mf-brand" href="#home">Return Policy</a>
    <nav className="mf-links" aria-label={t.primary}>
      <a href="#home">{t.home}</a><a href="#about">{t.about}</a><a href="#calculator">{t.engine}</a><a href="#finances" aria-current="page">{t.finances}</a>
    </nav>
    <div className="mf-actions"><div className="mf-lang" role="group" aria-label={t.language}>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => onLangChange('en')}>EN</button>
      <button type="button" aria-pressed={lang === 'hi'} lang="hi" onClick={() => onLangChange('hi')}>हिन्दी</button>
    </div></div>
  </header>;
}
