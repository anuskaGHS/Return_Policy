import useTween from '../../hooks/useTween.js';
import { zone, emiRoom } from '../../lib/whatif/healthScore.js';
import { inr } from '../../lib/whatif/format.js';
import { useT } from '../../hooks/useLang.js';

// Cream card: EMI-to-income ratio, zones bar, room under the 30% limit, interest drag.
export default function RatioCard({ d }) {
  const t = useT();
  const ratio = useTween(d.ratio);
  const z = zone(d.ratio);
  const room = emiRoom(d);
  const over = room < 0;
  return (
    <article className="wi-card cream wi-hv" style={{ '--d': '.26s' }} aria-label={t('EMI to income ratio')}>
      <div className="wi-top">
        <span className="wi-label">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          {t('EMI-to-income')}
        </span>
        <span className="wi-chip" style={{ '--rc': z.color, background: 'var(--rc,#15805A)', color: '#fff' }}>{t(z.name)}</span>
      </div>
      <p className="wi-ratio-n" style={{ '--rc': z.color }}>{ratio.toFixed(1)}%</p>
      <div className="wi-zones">
        <i /><i /><i />
        <span className="wi-pin" style={{ left: Math.max(0, Math.min(100, (d.ratio / 60) * 100)) + '%' }} />
      </div>
      <div className="wi-zl"><span>{t('Safe <30%')}</span><span>{t('Caution 30–45%')}</span><span>{t('High risk >45%')}</span></div>
      <div className="wi-room" style={{ '--rm': over ? '#B4301F' : '#15805A' }}>
        <span>{over ? t('Over the 30% safe limit by') : t('Room under the 30% safe limit')}</span>
        <b>{inr(Math.abs(room)) + t(' / mo')}</b>
        <small>{over ? t('Bringing EMI down by this much puts you back in the safe zone.') : t('You could add this much EMI and still stay in the safe zone.')}</small>
      </div>
      <div className="wi-drag"><span>{t('Est. annual interest drag')}</span><strong>{inr(d.drag)}</strong></div>
    </article>
  );
}
