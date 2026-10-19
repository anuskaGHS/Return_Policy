import Rich from './Rich.jsx';
import useTween from '../../hooks/useTween.js';
import { band } from '../../lib/whatif/healthScore.js';
import { why } from '../../lib/whatif/copy.js';
import { useLang, useT } from '../../hooks/useLang.js';

const GAUGE_COLORS = ['#B4301F', '#D9772E', '#D9A62E', '#7BB661', '#15805A'];

function gaugeArcs() {
  const cx = 110;
  const cy = 110;
  const r = 86;
  const pt = (deg) => {
    const a = (deg * Math.PI) / 180;
    return [(cx + r * Math.cos(a)).toFixed(1), (cy - r * Math.sin(a)).toFixed(1)];
  };
  return GAUGE_COLORS.map((c, k) => {
    const p0 = pt(180 - 36 * k - 2);
    const p1 = pt(180 - 36 * (k + 1) + 2);
    return { c, d: 'M' + p0.join(' ') + ' A' + r + ' ' + r + ' 0 0 1 ' + p1.join(' ') };
  });
}
const ARCS = gaugeArcs();

// Cream card: gauge, number, tier chip and a one-line reason.
// `explanation` (optional string) replaces the built-in sentence, for example text written by the AI later.
export default function HealthScoreCard({ d, explanation, aiStatus }) {
  const lang = useLang();
  const t = useT();
  const shown = Math.round(useTween(d.score));
  const b = band(d.score);
  return (
    <article className="wi-card cream wi-hv" style={{ '--d': '.2s' }} aria-label={t('Financial health score')}>
      <div className="wi-top">
        <span className="wi-label">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /></svg>
          {t('Health score')}
        </span>
      </div>
      <div className="wi-gauge">
        <svg viewBox="0 0 220 124" aria-hidden="true">
          {ARCS.map((a) => (
            <path key={a.c} d={a.d} stroke={a.c} strokeWidth="14" fill="none" strokeLinecap="round" />
          ))}
          <g className="wi-needle" style={{ transform: 'rotate(' + d.score * 1.8 + 'deg)' }}>
            <line x1="110" y1="110" x2="38" y2="110" stroke="#14151A" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <circle cx="110" cy="110" r="7" fill="#14151A" />
          <circle cx="110" cy="110" r="2.5" fill="#F6F3EC" />
        </svg>
        <div className="wi-gauge-n"><b>{shown}</b><span>{t('OUT OF 100')}</span></div>
      </div>
      <div className="wi-band"><span className="wi-chip" style={{ '--bc': b.color }}>{t(b.name)}</span></div>
      {aiStatus === 'loading' ? (
        <div className="wi-why-load" role="status" aria-busy="true">
          <span className="txt">{t('AI is writing a note…')}</span>
          <span className="wi-skel-line w2" style={{ marginTop: 0 }} />
          <span className="wi-skel-line w3" style={{ marginTop: 0 }} />
        </div>
      ) : (
        <p className="wi-why">{explanation ? explanation : <Rich parts={why(d, lang)} />}</p>
      )}
    </article>
  );
}
