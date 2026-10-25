import useExplainerText from '../../hooks/useExplainerText.js';
import { PERIOD_ORDER, fmtPct, fmtPts, signOf } from '../../lib/explainer/format.js';
import { ArrowIcon } from './icons.jsx';

const PERIOD_LABEL = {
  '6M': ['6M', '6 महीने'],
  '1Y': ['1Y', '1 साल'],
  '3Y': ['3Y', '3 साल'],
};

// The pale-blue "Your fund" panel: pick a fund and a period, then press Explain.
export default function FundForm({ x }) {
  const { L, lang } = useExplainerText();
  const { funds, fund, fundId, period, busy, data } = x;
  const available = fund ? fund.periods : [];
  const r = data && data.period === period && data.fund.id === fundId ? data.result : null;
  const g = r ? signOf(r.gap_pts) : 0;

  return (
    <section className="rx-panel rx-ice" aria-labelledby="rx-yf">
      <div>
        <h2 id="rx-yf">{L('Your fund', 'आपका फ़ंड')}</h2>
        <p className="rx-sub">{L('Pick a fund and a period.', 'फ़ंड और अवधि चुनें।')}</p>
      </div>

      <div>
        <label className="rx-lbl" htmlFor="rx-fund">{L('Fund', 'फ़ंड')}</label>
        {funds.length > 1 ? (
          <select className="rx-field" id="rx-fund" value={fundId} onChange={(e) => x.selectFund(e.target.value)}>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.plan})</option>
            ))}
          </select>
        ) : (
          <div className="rx-fieldro" id="rx-fund">{fund ? `${fund.name} (${fund.plan})` : '…'}</div>
        )}
      </div>

      <div>
        <span className="rx-lbl" id="rx-pl">{L('Period', 'अवधि')}</span>
        <div className="rx-seg" role="group" aria-labelledby="rx-pl">
          {PERIOD_ORDER.map((p) => {
            const ok = available.includes(p);
            return (
              <button
                key={p}
                type="button"
                className={period === p ? 'rx-on' : ''}
                aria-pressed={period === p}
                disabled={!ok}
                title={ok ? undefined : L('Not available yet', 'अभी उपलब्ध नहीं')}
                onClick={() => ok && x.setPeriod(p)}
              >
                {L(PERIOD_LABEL[p][0], PERIOD_LABEL[p][1])}
              </button>
            );
          })}
        </div>
      </div>

      {r && (
        <span className={`rx-chipnote${g < 0 ? ' rx-neg' : g > 0 ? ' rx-pos' : ''}`}>
          {L('Benchmark', 'बेंचमार्क')} {fmtPct(r.benchmark_return_pct)} · {L('gap', 'अंतर')} {fmtPts(r.gap_pts, false, lang)}
        </span>
      )}

      <button type="button" className="rx-go" onClick={x.explain} disabled={busy || !fund}>
        {busy ? L('Working…', 'काम हो रहा है…') : L('Explain', 'समझाएँ')} <ArrowIcon />
      </button>
      <p className="rx-gonote">{L('The numbers come from our calculation. The AI only explains them.', 'आँकड़े हमारी गणना से आते हैं। AI सिर्फ़ उन्हें समझाता है।')}</p>
    </section>
  );
}
