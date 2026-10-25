import { copy } from '../../lib/finances/i18n.js';

export default function FinancesFooter({ lang }) {
  const t = copy[lang];
  return <footer className="mf-foot"><hr /><nav><a href="#home">{t.home}</a><a href="#about">{t.about}</a><a href="#calculator">{t.engine}</a><a href="#finances">{t.finances}</a></nav><div>© 2026 Return Policy — AI-Powered Household Finance Decision Engine.</div><div>{t.footerDisclaimer}</div></footer>;
}
