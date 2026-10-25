import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WhatIfHeader from '../components/whatif/WhatIfHeader.jsx';
import WhatIfFooter from '../components/whatif/WhatIfFooter.jsx';
import ToolTabs from '../components/whatif/ToolTabs.jsx';
import { LangContext } from '../hooks/useLang.js';
import { compareLoan } from '../services/loanApi.js';
import { cleanNumber } from '../lib/loan/format.js';
import { getCopy } from '../lib/loan/copy.js';
import LoanInputPanel from '../components/loan/LoanInputPanel.jsx';
import LoanVerdict from '../components/loan/LoanVerdict.jsx';
import LoanOptionCard from '../components/loan/LoanOptionCard.jsx';
import LoanNotes, { LoanPlainWords } from '../components/loan/LoanNotes.jsx';
import '../styles/whatif.css';
import '../styles/loan.css';

const DEFAULTS = { outstanding_principal: '4800000', annual_interest_rate_pct: '8.5', remaining_tenure_months: '180', monthly_surplus: '20000', expected_equity_cagr_pct: '12' };
const FIELDS = Object.keys(DEFAULTS);
const validate = (values, t) => { const errors = {}; const checks = [[FIELDS[0], 0, Infinity, t.errPrincipal], [FIELDS[1], 0, 100, t.errRate], [FIELDS[2], 1, 480, t.errMonths], [FIELDS[3], 0, Infinity, t.errSurplus], [FIELDS[4], 0, 100, t.errReturn]]; checks.forEach(([key, min, max, message]) => { const n = cleanNumber(values[key]); const strictlyPositive = key === FIELDS[0] || key === FIELDS[3]; if (!Number.isFinite(n) || (strictlyPositive ? n <= min : n < min) || n > max || (key === FIELDS[2] && !Number.isInteger(n))) errors[key] = message; }); return errors; };
const payload = (values) => Object.fromEntries(FIELDS.map((key) => [key, cleanNumber(values[key])]));

export default function LoanPage({ lang, onLangChange, onToolChange }) {
  const [ownLang, setOwnLang] = useState('en'); const language = lang === 'hi' || ownLang === 'hi' ? 'hi' : 'en'; const t = useMemo(() => getCopy(language), [language]);
  const [values, setValues] = useState(DEFAULTS); const [data, setData] = useState(null); const [status, setStatus] = useState('loading'); const [error, setError] = useState(null); const [slow, setSlow] = useState(false); const [message, setMessage] = useState(''); const [stale, setStale] = useState(false); const slowTimer = useRef(null); const verdictRef = useRef(null);
  const [glow, setGlow] = useState({ verdict: false, a: false, b: false, plain: false }); const glowTimer = useRef(null);
  const run = useCallback(async (nextValues, shouldScroll = true) => {
    const errors = validate(nextValues, t);
    if (Object.keys(errors).length) { setError({ kind: 'invalid', fields: errors }); return; }
    setStatus('loading'); setError(null); setMessage(''); clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), 6000);
    try {
      const result = await compareLoan(payload(nextValues));
      if (data) {
        const changed = {
          verdict: data.net_wealth_difference !== result.net_wealth_difference || data.recommendation !== result.recommendation || data.break_even_cagr !== result.break_even_cagr,
          a: JSON.stringify(data.strategy_a) !== JSON.stringify(result.strategy_a),
          b: JSON.stringify(data.strategy_b) !== JSON.stringify(result.strategy_b),
          plain: JSON.stringify([data.key_points, data.key_points_hi]) !== JSON.stringify([result.key_points, result.key_points_hi]),
        };
        clearTimeout(glowTimer.current);
        if (changed.verdict || changed.a || changed.b || changed.plain) {
          setGlow(changed);
          glowTimer.current = setTimeout(() => {
            setGlow({ verdict: false, a: false, b: false, plain: false });
          }, 2400);
        } else {
          setGlow({ verdict: false, a: false, b: false, plain: false });
        }
      }
      setData(result); setStatus('ready'); setStale(false);
      if (shouldScroll) requestAnimationFrame(() => verdictRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    } catch (err) {
      setStatus(data ? 'ready' : 'error');
      setError({ kind: err.status === 422 ? 'invalid' : err.status ? 'failed' : 'offline' });
    } finally {
      clearTimeout(slowTimer.current); setSlow(false);
    }
  }, [data, t]);
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { run(DEFAULTS, false); return () => { clearTimeout(slowTimer.current); clearTimeout(glowTimer.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setStale(true); };
  const errors = error?.fields || {}; const errorKind = error?.kind; const errorText = errorKind ? t[errorKind] : '';
  return <LangContext.Provider value={language}><div className="wi lv" lang={language}><WhatIfHeader lang={language} onLangChange={onLangChange || setOwnLang} /><main className="wi-main lv-main"><ToolTabs active="loan" onSelect={onToolChange} /><header className="lv-heading"><span className="lv-eyebrow">{t.eyebrow}</span><h1>{t.h1a}<em>{t.h1b}</em></h1><p>{t.lede}</p></header>{status === 'loading' && !data && <div className="lv-loading" aria-busy="true"><div /><div />{slow && <p role="status">{t.slow}</p>}</div>}{errorKind && !data && <div className="lv-error" role="alert"><b>{t.errTitle}</b><p>{errorText}</p><button type="button" onClick={() => run(values)}>{t.retry}</button></div>}{(status === 'ready' || data) && <><div className="lv-grid"><LoanInputPanel values={values} onChange={onChange} onCompare={() => run(values)} onFill={(next, notice) => { setValues((current) => ({ ...current, ...next })); setMessage(notice); setStale(true); }} errors={errors} message={message || (errorKind ? errorText : stale && data ? t.stale : '')} t={t} busy={status === 'loading'} />{data && <div ref={verdictRef} className="lv-side"><LoanVerdict data={data} input={payload(values)} t={t} glow={glow.verdict} /><LoanPlainWords data={data} t={t} lang={language} glow={glow.plain} /></div>}</div>{data && <><div className="lv-options"><LoanOptionCard kind="Prepay" strategy={data.strategy_a} winner={data.recommendation === 'Prepay'} t={t} glow={glow.a} /><LoanOptionCard kind="Invest" strategy={data.strategy_b} winner={data.recommendation === 'Invest'} t={t} glow={glow.b} /></div><LoanNotes data={data} t={t} lang={language} /></>}</>}</main><WhatIfFooter /></div></LangContext.Provider>;
}

