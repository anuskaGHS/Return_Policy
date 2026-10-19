import { compact } from '../../lib/whatif/format.js';
import { useLang, useT } from '../../hooks/useLang.js';

// Mobile only (CSS hides it on desktop): a floating result bar shown while sliders are on screen.
export default function MiniBar({ d, visible }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className={'wi-mini' + (visible ? ' on' : '')} aria-hidden="true">
      <div>{t('5-yr wealth')}<b>{compact(d.fv, lang)}</b></div>
      <div style={{ textAlign: 'right' }}>{t('Health')}<b>{d.score}/100</b></div>
    </div>
  );
}
