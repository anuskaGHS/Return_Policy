import { duration, rupees, template } from '../../lib/loan/format.js';

export default function LoanOptionCard({ kind, strategy, winner, t }) {
  const isPrepay = kind === 'Prepay'; const rows = [template(t.closesRow, { duration: duration(strategy.loan_closure_month, t), n: strategy.loan_closure_month }), rupees(strategy.total_interest_paid), rupees(strategy.final_sip_corpus), rupees(strategy.ltcg_tax), rupees(strategy.net_wealth)];
  return <section className={`lv-card lv-option ${isPrepay ? 'lv-cream' : 'lv-emerald'}`}><div className="lv-option-head"><div><span className="lv-overline">{isPrepay ? 'Option A' : 'Option B'}</span><h2>{isPrepay ? t.prepay : t.invest}</h2></div>{winner && <span className="lv-ahead">{t.ahead}</span>}</div><p>{isPrepay ? t.prepayText : t.investText}</p><dl>{rows.map((value, i) => <div key={t.rowLabels[i]} className={i === rows.length - 1 ? 'lv-final-row' : ''}><dt>{t.rowLabels[i]}</dt><dd>{value}</dd></div>)}</dl></section>;
}

