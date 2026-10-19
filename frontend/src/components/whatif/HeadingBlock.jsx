import { useRef } from 'react';
import Rich from './Rich.jsx';
import useFitText from '../../hooks/useFitText.js';
import { turnLine, sentence } from '../../lib/whatif/copy.js';
import { useLang, useT } from '../../hooks/useLang.js';

// "What if your money… / turned ₹X into ₹Y?" + the context line + Reset and jump buttons.
export default function HeadingBlock({ d, onReset }) {
  const turnRef = useRef(null);
  const lang = useLang();
  const t = useT();
  const text = turnLine(d, lang);
  useFitText(turnRef, [text]);

  const jump = (e) => {
    const el = document.getElementById('wi-plan');
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="wi-head" aria-label={t('Simulator heading')}>
      <div className="wi-head-top">
        <span className="wi-live"><i />{t('Live simulation engine')}</span>
        <h1 className="wi-h1" aria-live="polite">
          {t('What if your money…')}<em ref={turnRef}>{text}</em>
        </h1>
      </div>
      <div className="wi-head-row">
        <div>
          <p className="wi-sentence"><Rich parts={sentence(d, lang)} /></p>
          <p className="wi-sub">{t('Household balance sheet & policy simulator')}</p>
        </div>
        <div className="wi-head-act">
          <a className="wi-jump" href="#wi-plan" onClick={jump}>
            {t('See your 3 actions')}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </a>
          <button className="wi-reset" type="button" onClick={onReset}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
            {t('Reset default')}
          </button>
        </div>
      </div>
    </section>
  );
}
