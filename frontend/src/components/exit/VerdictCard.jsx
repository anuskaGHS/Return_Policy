import { useCallback } from 'react';
import { inr } from '../../lib/exit/format.js';
import { dialCopy, emptyCopy, verdictCopy } from '../../lib/exit/copy.js';
import useExitText from '../../hooks/useExitText.js';
import { FitNum } from './FitNum.jsx';
import { ClockIcon } from './icons.jsx';

// 60 ticks round the dial, drawn once.
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = ((-90 + i * 6) * Math.PI) / 180;
  const r1 = 118;
  const r2 = i % 5 === 0 ? 98 : 106;
  return {
    x1: (130 + r1 * Math.cos(a)).toFixed(2),
    y1: (130 + r1 * Math.sin(a)).toFixed(2),
    x2: (130 + r2 * Math.cos(a)).toFixed(2),
    y2: (130 + r2 * Math.sin(a)).toFixed(2),
  };
});
const RING = <circle cx="130" cy="130" r="82" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" />;

// "Our call": Hold / Exit now / Can't sell yet, the number that matters, a dial and a ribbon.
// While an amount is blank it shows a calm "enter your amounts" card instead.
export default function VerdictCard({ x }) {
  const { t, L, lang } = useExitText();
  const { v, s } = x;

  const fmtDays = useCallback((n) => {
    const d = Math.round(n);
    return L(`${d}${d === 1 ? ' day' : ' days'}`, `${d} दिन`);
  }, [L]);

  if (v.empty) {
    const e = emptyCopy(v, lang);
    return (
      <section className="ex-panel ex-vempty" role="status">
        <span className="ex-kick"><ClockIcon />{t('Our call')}</span>
        <h2 className="ex-vword ex-s">{e.head}</h2>
        <p>{e.body}</p>
        <div className="ex-ghost" aria-hidden="true">
          <svg viewBox="0 0 260 260">
            {RING}
            {TICKS.map((k, i) => <line key={i} className="ex-tk" x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} />)}
          </svg>
        </div>
      </section>
    );
  }

  const c = verdictCopy(v, lang);
  const d = dialCopy(v, s.days, lang);
  return (
    <section ref={x.verdictRef} className="ex-panel ex-verdict" aria-live="polite" aria-labelledby="ex-vword">
      <div className="ex-vtop">
        <span className="ex-kick"><ClockIcon />{t('Our call')}</span>
        <span className="ex-pill">{c.pill}</span>
      </div>
      <div>
        <h2 className={`ex-vword${c.small ? ' ex-s' : ''}`} id="ex-vword">{c.word}</h2>
        <div className="ex-vlab">{c.label}</div>
        <FitNum className="ex-vnum" value={c.numValue} format={c.numKind === 'days' ? fmtDays : inr} animate={!x.dragging} />
        <p className="ex-vnote">{c.note}</p>
      </div>
      <div className="ex-dial" aria-hidden="true">
        <svg viewBox="0 0 260 260">
          {RING}
          {TICKS.map((k, i) => (
            <line
              key={i}
              className={`ex-tk${i < d.filled ? (d.past ? ' ex-m' : ' ex-f') : ''}${i === d.filled - 1 && !d.past ? ' ex-lead' : ''}`}
              x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2}
              style={{ transitionDelay: `${i * 9}ms` }}
            />
          ))}
        </svg>
        <div className="ex-mid"><small>{d.mid.small}</small><b>{d.mid.big}</b><span>{d.mid.span}</span></div>
      </div>
      <div className={`ex-rib${c.ribOk ? ' ex-ok' : ''}`}>{c.ribbon}</div>
    </section>
  );
}
