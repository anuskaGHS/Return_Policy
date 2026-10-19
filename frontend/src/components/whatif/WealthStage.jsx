import WealthChart from './WealthChart.jsx';
import useTween from '../../hooks/useTween.js';
import { inr, compact } from '../../lib/whatif/format.js';
import { useLang, useT } from '../../hooks/useLang.js';

// Dark card: 5-year projected wealth, principal, gain, chart.
export default function WealthStage({ d, base }) {
  const lang = useLang();
  const t = useT();
  const fv = useTween(d.fv);
  const inv = useTween(d.inv);
  const gain = useTween(d.gain);
  const diff = d.fv - base.fv;
  const flat = Math.abs(diff) < 1;

  return (
    <article className="wi-card dark wi-stage wi-hv" style={{ '--d': '.12s' }} aria-label={t('5-year SIP wealth projection')}>
      <div className="wi-top">
        <span className="wi-label" style={{ color: '#F6F3EC' }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
          {t('5-year projected wealth')}
        </span>
        <span className="wi-chip" style={{ background: 'rgba(246,243,236,.1)', color: '#F6F3EC' }}>{t('12% CAGR · compounding')}</span>
      </div>
      <div className="wi-big">
        <span className="wi-bignum">{compact(fv, lang)}</span>
        <span className={'wi-delta' + (flat ? '' : diff > 0 ? ' up' : ' down')}>
          {flat ? t('default plan') : (diff > 0 ? '▲ +' : '▼ −') + compact(Math.abs(diff), lang) + t(' vs default')}
        </span>
      </div>
      <p className="wi-full">{inr(d.fv)}</p>
      <div className="wi-rows">
        <div className="wi-row"><span>{t('Total principal invested (60 mo)')}</span><strong>{inr(inv)}</strong></div>
        <div className="wi-row"><span>{t('Estimated wealth gain')}</span><strong className="g">{'+ ' + inr(gain)}</strong></div>
      </div>
      <WealthChart d={d} />
    </article>
  );
}
