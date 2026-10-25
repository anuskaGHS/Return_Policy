import useExplainerText from '../../hooks/useExplainerText.js';
import { fmtPct, fmtPts, signOf } from '../../lib/explainer/format.js';

// The blue "The gap" card: the fund's return against its benchmark's, and the difference in points.
// The two bars start from a zero line, so a negative return grows to the left of zero.
export default function GapCard({ data }) {
  const { L, lang } = useExplainerText();
  const r = data.result;
  const g = signOf(r.gap_pts);

  const vals = [r.fund_return_pct, r.benchmark_return_pct];
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = Math.max(hi - lo, 0.1);
  const zero = (-lo / span) * 100;
  const bar = (v) => {
    const a = Math.min(0, v);
    const b = Math.max(0, v);
    return {
      left: `${((a - lo) / span) * 100}%`,
      width: `${Math.max(1.5, ((b - a) / span) * 100)}%`,
    };
  };

  // The gap is worked out from unrounded returns, so it can differ by 0.1 from subtracting the two rounded ones.
  const rounded = Math.round((r.fund_return_pct - r.benchmark_return_pct) * 10) / 10;
  const roundingShows = Math.abs(rounded - r.gap_pts) > 0.05;

  const verdict = g < 0
    ? L('Behind its benchmark by', 'बेंचमार्क से पीछे')
    : g > 0
      ? L('Ahead of its benchmark by', 'बेंचमार्क से आगे')
      : L('In line with its benchmark', 'बेंचमार्क के बराबर');

  return (
    <section className="rx-panel rx-gap" aria-labelledby="rx-gap">
      <div className="rx-kick">
        <span id="rx-gap">{L('The gap', 'अंतर')}</span>
        <span className="rx-pill">{L('calculated by code', 'कोड से निकाला गया')}</span>
      </div>
      <div className="rx-vlab">{data.fund.name} {L('against', 'बनाम')} {data.benchmark.name}</div>
      <div className={`rx-verdict${g > 0 ? ' rx-pos' : ''}`}>{verdict}</div>
      {g !== 0 && <span className={`rx-vnum${g > 0 ? ' rx-pos' : ''}`}>{fmtPts(r.gap_pts, true, lang)}</span>}
      <div className="rx-cmp">
        <div className="rx-crow">
          <span>{L('Your fund', 'आपका फ़ंड')}</span>
          <div className="rx-track rx-dtrack">
            <i style={{ ...bar(r.fund_return_pct), background: '#8FD1FF' }} />
            <u className="rx-zline" style={{ left: `${zero}%` }} />
          </div>
          <b>{fmtPct(r.fund_return_pct)}</b>
        </div>
        <div className="rx-crow">
          <span>{L('Benchmark', 'बेंचमार्क')}</span>
          <div className="rx-track rx-dtrack">
            <i style={{ ...bar(r.benchmark_return_pct), background: '#F4F7FB' }} />
            <u className="rx-zline" style={{ left: `${zero}%` }} />
          </div>
          <b>{fmtPct(r.benchmark_return_pct)}</b>
        </div>
        <div className="rx-crow rx-axis" aria-hidden="true">
          <span />
          <div className="rx-axtrack"><em style={{ left: `${zero}%` }}>0%</em></div>
          <b />
        </div>
      </div>
      {roundingShows && (
        <p className="rx-roundnote">
          {L(
            'Rounded to 1 decimal. The gap is worked out from the unrounded returns, so it can differ by 0.1 from subtracting the two figures above.',
            'आँकड़े 1 दशमलव तक पूर्णांकित हैं। अंतर बिना पूर्णांकित रिटर्न से निकलता है, इसलिए ऊपर के दोनों आँकड़ों को घटाने पर यह 0.1 अलग दिख सकता है।',
          )}
        </p>
      )}
    </section>
  );
}
