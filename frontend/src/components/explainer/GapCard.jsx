import useExplainerText from '../../hooks/useExplainerText.js';
import { fmtPct, fmtPts, signOf } from '../../lib/explainer/format.js';

// The blue "The gap" card: the fund's return against its benchmark's, and the difference in points.
export default function GapCard({ data }) {
  const { L, lang } = useExplainerText();
  const r = data.result;
  const g = signOf(r.gap_pts);
  const maxAbs = Math.max(Math.abs(r.fund_return_pct), Math.abs(r.benchmark_return_pct), 0.1);
  const w = (v) => `${Math.max(4, Math.round((Math.abs(v) / maxAbs) * 100))}%`;
  return (
    <section className="rx-panel rx-gap" aria-labelledby="rx-gap">
      <div className="rx-kick">
        <span id="rx-gap">{L('The gap', 'अंतर')}</span>
        <span className="rx-pill">{L('calculated by code', 'कोड से निकाला गया')}</span>
      </div>
      <div className="rx-vlab">{data.fund.name} {L('against', 'बनाम')} {data.benchmark.name}</div>
      <span className={`rx-vnum${g > 0 ? ' rx-pos' : ''}`}>{fmtPts(r.gap_pts, true, lang)}</span>
      <div className="rx-cmp">
        <div className="rx-crow">
          <span>{L('Your fund', 'आपका फ़ंड')}</span>
          <div className="rx-track"><i style={{ width: w(r.fund_return_pct), background: '#8FD1FF' }} /></div>
          <b>{fmtPct(r.fund_return_pct)}</b>
        </div>
        <div className="rx-crow">
          <span>{L('Benchmark', 'बेंचमार्क')}</span>
          <div className="rx-track"><i style={{ width: w(r.benchmark_return_pct), background: '#F4F7FB' }} /></div>
          <b>{fmtPct(r.benchmark_return_pct)}</b>
        </div>
      </div>
    </section>
  );
}
