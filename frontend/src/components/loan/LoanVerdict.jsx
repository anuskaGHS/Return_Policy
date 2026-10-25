import { duration, percent, rupees, template } from '../../lib/loan/format.js';

export default function LoanVerdict({ data, input, t }) {
  const invest = data.strategy_b?.net_wealth || 0; const prepay = data.strategy_a?.net_wealth || 0; const winner = data.recommendation;
  const years = duration(input.remaining_tenure_months, t); const difference = Number(data.net_wealth_difference);
  const label = winner === 'Invest' ? t.vlabelInvest : t.vlabelPrepay; const after = winner === 'Invest' ? t.vafterInvest : t.vafterPrepay;
  const max = Math.max(invest, prepay, 1);
  const scale = [Number(input.annual_interest_rate_pct), Number(data.break_even_cagr), Number(input.expected_equity_cagr_pct)]; const lo = Math.floor(Math.min(...scale)); const hi = Math.ceil(Math.max(...scale)) + 1;
  const pos = (value) => Math.max(2, Math.min(98, ((value - lo) / (hi - lo || 1)) * 100));
  return <section className="lv-card lv-verdict" id="lv-verdict" aria-live="polite"><div className="lv-card-top"><span className="lv-overline">{t.kick}</span><span className="lv-winner">{winner === 'Invest' ? t.winnerInvest : winner === 'Prepay' ? t.winnerPrepay : t.winnerTie}</span></div>
    <p className="lv-verdict-label">{template(label, { years })}</p><div className="lv-difference">{difference >= 0 ? '' : '−'}{rupees(Math.abs(difference))}</div><p className="lv-verdict-after">{after}</p>
    <div className="lv-bars"><div><span>{t.prepay}</span><i style={{ width: `${(prepay / max) * 100}%` }} /></div><div><span>{t.invest}</span><i className="lv-gold-bar" style={{ width: `${(invest / max) * 100}%` }} /></div></div>
    <div className="lv-break"><h3>{t.beTitle}</h3><div className="lv-track"><i style={{ left: `${pos(Number(data.break_even_cagr))}%` }} /><b style={{ left: `${pos(Number(input.annual_interest_rate_pct))}%` }} /><b style={{ left: `${pos(Number(input.expected_equity_cagr_pct))}%` }} /></div><div className="lv-break-labels"><span>{template(t.loanMarkT, { rate: percent(input.annual_interest_rate_pct, 1) })}</span><strong style={{ left: `${pos(Number(data.break_even_cagr))}%` }}>{template(t.beMarkT, { be: percent(data.break_even_cagr, 2) })}</strong><span>{template(t.youMarkT, { cagr: percent(input.expected_equity_cagr_pct, 1) })}</span></div></div></section>;
}

