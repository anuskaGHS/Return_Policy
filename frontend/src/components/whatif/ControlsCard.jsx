import { forwardRef } from 'react';
import RangeInput from './RangeInput.jsx';
import { PRESETS, zone, insuranceShare } from '../../lib/whatif/healthScore.js';
import { inr, compact } from '../../lib/whatif/format.js';
import { useLang, useT } from '../../hooks/useLang.js';

const ICONS = {
  sip: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  emi: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
  rate: <><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  inc: <><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
};

// The four main sliders (the other four live inside the Score breakdown card).
const SLIDERS = [
  { icon: 'sip', field: 'monthly_sip', id: 'wi-sip', color: '#15805A', label: 'Monthly SIP investment', min: 1000, max: 50000, step: 500, limits: ['Min: ₹1,000', 'Max: ₹50,000 / mo'], show: (d) => inr(d.P) },
  { icon: 'emi', field: 'loan_emi', id: 'wi-emi', color: '#B4301F', label: 'Monthly loan EMI', min: 0, max: 100000, step: 1000, limits: ['Min: ₹0', 'Max: ₹1,00,000 / mo'], show: (d) => inr(d.emi) },
  { icon: 'rate', field: 'loan_interest_rate', id: 'wi-rate', color: '#B7791F', label: 'Weighted loan interest rate', min: 5, max: 15, step: 0.1, limits: ['5.0% (Subsidized)', '15.0% (Unsecured/High)'], show: (d) => d.rate.toFixed(1) + '%' },
  { icon: 'inc', field: 'annual_income', id: 'wi-inc', color: '#14151A', label: 'Annual household income', min: 300000, max: 5000000, step: 25000, limits: ['₹3.0 Lakhs', '₹50.0 Lakhs / yr'], show: (d, lang) => compact(d.inc, lang) },
];

function IncomeShares({ d }) {
  const t = useT();
  const zc = zone(d.ratio).color;
  const ins = insuranceShare(d.cover, d.inc);
  return (
    <div className="wi-share">
      <div>
        <div className="wi-sh-top"><span>{t('EMI share of income (limit 30%)')}</span><b style={{ '--bf': zc }}>{d.ratio.toFixed(1)}%</b></div>
        <div className="wi-bar" style={{ '--bf': zc, '--w': Math.min(100, (d.ratio / 60) * 100) + '%' }}><i /><u /></div>
      </div>
      <div>
        <div className="wi-sh-top"><span>{t('Term cover vs 10× income')}</span><b style={{ '--bf': ins.color }}>{(d.cover / d.inc).toFixed(1) + t('× income')}</b></div>
        <div className="wi-bar" style={{ '--bf': ins.color, '--w': ins.f * 100 + '%' }}><i /></div>
      </div>
      <div className="wi-sh-note">{t('More income lightens your EMI share but raises the cover you need. Both feed the score, so they can cancel out.')}</div>
    </div>
  );
}

const ControlsCard = forwardRef(function ControlsCard({ inputs, d, activePreset, onField, onPreset, onDismissPreset }, ref) {
  const lang = useLang();
  const t = useT();
  return (
    <section ref={ref} className="wi-card cream wi-controls" id="wi-controls" style={{ '--d': '.05s' }} aria-label={t('Financial parameters input')}>
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
        {t('Financial policy sliders')}
      </h2>

      <div className="wi-pre-l">{t('QUICK PERSONA PRESETS')}</div>
      <div className="wi-presets">
        {PRESETS.map((p) => {
          const on = activePreset === p.name;
          return (
            <button
              key={p.name}
              type="button"
              className="wi-preset"
              aria-pressed={on}
              onClick={(e) => {
                if (e.target.classList && e.target.classList.contains('wi-x')) onDismissPreset(p.name);
                else onPreset(p.name);
              }}
            >
              <span>{t(p.name)}</span>
              {on && <span className="wi-x" role="button" tabIndex={0} aria-label={t('Deselect ') + t(p.name)}>✕</span>}
            </button>
          );
        })}
      </div>

      {SLIDERS.map((s) => (
        <div className="wi-sl" key={s.id} style={{ '--c': s.color }}>
          <div className="wi-sl-top">
            <label className="wi-sl-name" htmlFor={s.id}>
              <span className="wi-ico"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[s.icon]}</svg></span>
              {t(s.label)}
            </label>
            <span className="wi-val" style={s.field === 'loan_emi' && d.emi > 30000 ? { color: '#B4301F' } : undefined}>{s.show(d, lang)}</span>
          </div>
          <RangeInput id={s.id} min={s.min} max={s.max} step={s.step} value={inputs[s.field]} onChange={(v) => onField(s.field, v)} fill={s.color} />
          <div className="wi-lim"><span>{t(s.limits[0])}</span><span>{t(s.limits[1])}</span></div>
          {s.field === 'annual_income' && <IncomeShares d={d} />}
        </div>
      ))}
    </section>
  );
});

export default ControlsCard;
