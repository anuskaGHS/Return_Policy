import { useEffect, useRef } from 'react';
import { presetsFor } from '../../lib/exit/model.js';
import { dateFor, plural } from '../../lib/exit/format.js';
import useExitText from '../../hooks/useExitText.js';
import { useFitInput } from './FitNum.jsx';

// "How long you have held it": slider with the gate marker, days box, purchase date, presets.
export default function HoldControl({ x }) {
  const { t, L } = useExitText();
  const { s, v, now } = x;
  const { T, eq, debt, elss, lock, rem, sMax } = v;
  const daysRef = useRef(null);
  const dateRef = useRef(null);

  // The days and date boxes are not controlled: while you are typing in one, it is left alone.
  useEffect(() => {
    if (daysRef.current && document.activeElement !== daysRef.current) daysRef.current.value = s.days;
    if (dateRef.current) {
      dateRef.current.max = dateFor(0, now);
      if (document.activeElement !== dateRef.current) dateRef.current.value = dateFor(s.days, now);
    }
  });
  useFitInput(daysRef, String(s.days));

  const gateLbl = elss ? L('Lock-in ends', 'लॉक-इन ख़त्म') : debt ? L('1 Apr 2023', '1 अप्रैल 2023') : L(`Day ${T + 1}`, `दिन ${T + 1}`);
  let status;
  if (elss) status = lock ? L(`${plural(rem, 'day')} of lock-in left`, `${rem} दिन का लॉक-इन बाकी`) : L('Lock-in is over', 'लॉक-इन ख़त्म');
  else if (debt) status = s.days > T ? L('Bought before 1 Apr 2023', 'ख़रीद 1 अप्रैल 2023 से पहले') : L('Bought on or after 1 Apr 2023', 'ख़रीद 1 अप्रैल 2023 या उसके बाद');
  else status = s.days > T ? L('Past the gate', 'सीमा पार') : L(`${plural(T + 1 - s.days, 'day')} to go`, `${T + 1 - s.days} दिन बाकी`);

  return (
    <div>
      <div className="ex-hold-head">
        <label className="ex-lbl" htmlFor="ex-sl" style={{ margin: 0 }}>{t('How long you have held it')}</label>
        <span className="ex-rs">{status}</span>
      </div>
      <div className="ex-hold-head" style={{ marginTop: 8 }}>
        <span className="ex-rd"><span>{s.days}</span><small>{t('days')}</small></span>
      </div>
      <div className="ex-slw" style={{ '--ex-f': Math.min(1, s.days / sMax).toFixed(4), '--ex-g': ((elss ? 1095 : T) / sMax).toFixed(4) }}>
        <input id="ex-sl" type="range" min="0" max={sMax} step="1" value={s.days} onChange={(e) => x.setDays(e.target.value)} />
        <div className="ex-gate" aria-hidden="true"><i /><span>{gateLbl}</span></div>
      </div>
      <div className="ex-ctrl">
        <div className="ex-mini">
          <b>{t('Days')}</b>
          <input ref={daysRef} type="number" min="0" max="5000" inputMode="numeric" aria-label={L('Days held', 'रखे गए दिन')} defaultValue={s.days} onChange={(e) => x.setDays(e.target.value)} />
        </div>
        <span className="ex-or">{t('or bought on')}</span>
        <div className="ex-mini">
          <input ref={dateRef} type="date" aria-label={L('Purchase date', 'ख़रीद की तारीख़')} onChange={(e) => x.setDaysFromDate(e.target.value)} />
        </div>
      </div>
      <div className="ex-chips" style={{ marginTop: 12 }}>
        {presetsFor(v).map((p) => (
          <button key={p[0] + p[1]} type="button" className={s.days === p[0] ? 'ex-on' : ''} onClick={() => x.setDays(p[0])}>{L(p[1], p[2])}</button>
        ))}
      </div>
    </div>
  );
}
