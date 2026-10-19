import { NAV_LINKS, FOOTER_LINES } from '../../data/whatIfNav.js';
import { useT } from '../../hooks/useLang.js';

export default function WhatIfFooter() {
  const t = useT();
  return (
    <footer className="wi-foot">
      <hr />
      <nav>
        {NAV_LINKS.map((l) => (
          <a key={l.label} href={l.href}>{t(l.label)}</a>
        ))}
      </nav>
      <div>{t(FOOTER_LINES[0])}</div>
      <div>
        {t(FOOTER_LINES[1])}
        <br />
        {t(FOOTER_LINES[2])}
      </div>
    </footer>
  );
}
