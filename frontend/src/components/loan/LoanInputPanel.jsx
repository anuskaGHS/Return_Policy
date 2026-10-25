import { useState } from 'react';
import { cleanNumber, indianNumber, readFinances } from '../../lib/loan/format.js';

export default function LoanInputPanel({ values, onChange, onCompare, onFill, errors, message, t, busy }) {
  const [focused, setFocused] = useState(null);
  const fields = ['outstanding_principal', 'annual_interest_rate_pct', 'remaining_tenure_months', 'monthly_surplus', 'expected_equity_cagr_pct'];
  const blurValue = (key) => { if (focused === key) setFocused(null); };
  const displayValue = (key, value) => focused === key || !value ? value : (key === fields[0] || key === fields[3] ? indianNumber(cleanNumber(value)) : value);
  const fill = () => {
    const loan = readFinances()?.loan || {};
    const next = {};
    if (loan.outstanding_principal != null) next.outstanding_principal = loan.outstanding_principal;
    if (loan.interest_rate_pct != null) next.annual_interest_rate_pct = loan.interest_rate_pct;
    if (loan.remaining_months != null) next.remaining_tenure_months = loan.remaining_months;
    onFill(next, Object.keys(next).length > 0 ? t.filledFinances : t.noFinances);
  };
  return <section className="lv-card lv-input-card">
    <div className="lv-card-top"><div><h2>{t.panelTitle}</h2><p>{t.panelSub}</p></div><span className="lv-pill">{t.pill}</span></div>
    <div className="lv-fields">{fields.map((key, index) => <div className="lv-field" key={key}>
      <label htmlFor={`loan-${key}`}>{t.fields[index].label}</label>
      <input id={`loan-${key}`} inputMode="decimal" value={displayValue(key, values[key])} onFocus={() => setFocused(key)} onBlur={() => blurValue(key)} onChange={(event) => onChange(key, event.target.value.replace(/,/g, ''))} />
      {t.fields[index].help && <small>{t.fields[index].help}</small>}
      {errors[key] && <span className="lv-field-error">{errors[key]}</span>}
    </div>)}</div>
    {message && <p className="lv-inline-message" role="status">{message}</p>}
    <div className="lv-actions"><button type="button" className="lv-primary" onClick={onCompare} disabled={busy}>{t.compare} <span aria-hidden="true">→</span></button><button type="button" className="lv-secondary" onClick={fill}>{t.fill}</button></div>
    <p className="lv-calc-note">{t.calcNote || 'All numbers come from our own calculation.'}</p>
  </section>;
}

