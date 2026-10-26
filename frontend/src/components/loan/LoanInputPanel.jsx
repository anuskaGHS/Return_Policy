import { useState } from 'react';
import { cleanNumber, duration, indianNumber, loanFieldsFromFinances, readFinances } from '../../lib/loan/format.js';

export default function LoanInputPanel({ values, onChange, onCompare, onFill, errors, message, t, busy }) {
  const [focused, setFocused] = useState(null);
  const fields = ['outstanding_principal', 'annual_interest_rate_pct', 'remaining_tenure_months', 'monthly_surplus', 'expected_equity_cagr_pct'];
  const blurValue = (key) => { if (focused === key) setFocused(null); };
  const displayValue = (key, value) => focused === key || !value ? value : (key === fields[0] || key === fields[3] ? indianNumber(cleanNumber(value)) : value);
  const fill = () => {
    const next = loanFieldsFromFinances(readFinances()?.loan);
    onFill(next, Object.keys(next).length > 0 ? t.filledFinances : t.noFinances);
  };
  return <section className="lv-card lv-input-card">
    <div className="lv-card-top"><div><h2>{t.panelTitle}</h2><p>{t.panelSub}</p></div><span className="lv-pill">{t.pill}</span></div>
    <div className="lv-fields">{fields.map((key, index) => {
      let help = t.fields[index].help;
      if (key === 'remaining_tenure_months') {
        const m = cleanNumber(values[key]);
        if (Number.isInteger(m) && m >= 1 && m <= 480) {
          help = `= ${duration(m, t)}`;
        } else {
          help = '';
        }
      }
      return (
        <div className="lv-field" key={key}>
          <label htmlFor={`loan-${key}`}>{t.fields[index].label}</label>
          <input
            id={`loan-${key}`}
            inputMode="decimal"
            value={displayValue(key, values[key])}
            onFocus={() => setFocused(key)}
            onBlur={() => blurValue(key)}
            onChange={(event) => onChange(key, event.target.value.replace(/,/g, ''))}
          />
          {help ? <small>{help}</small> : null}
          {errors[key] && <span className="lv-field-error">{errors[key]}</span>}
        </div>
      );
    })}</div>
    {message && <p className="lv-inline-message" role="status">{message}</p>}
    <div className="lv-actions"><button type="button" className="lv-primary" onClick={onCompare} disabled={busy}>{t.compare} <span aria-hidden="true">→</span></button><button type="button" className="lv-secondary" onClick={fill}>{t.fill}</button></div>
    <p className="lv-calc-note">{t.calcNote || 'All numbers come from our own calculation.'}</p>
  </section>;
}

