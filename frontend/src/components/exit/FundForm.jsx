import { useRef } from 'react';
import { AMOUNTS, DB, EQ, SLABS } from '../../lib/exit/model.js';
import { emptyCopy } from '../../lib/exit/copy.js';
import { inr } from '../../lib/exit/format.js';
import useExitText from '../../hooks/useExitText.js';
import { useFitInput } from './FitNum.jsx';
import HoldControl from './HoldControl.jsx';
import { ArrowIcon, ChevronIcon, ShieldIcon, TrendIcon } from './icons.jsx';

// The lavender input card: fund, amounts, how long held, custom settings, and the "Get my exit advice" button.
export default function FundForm({ x }) {
  const { t, L, cat, lang } = useExitText();
  const { s, v } = x;
  const invRef = useRef(null);
  const curRef = useRef(null);
  useFitInput(invRef, s.inv);
  useFitInput(curRef, s.cur);

  // the little gain chip under the amounts
  const invN = parseFloat(s.inv) || 0;
  const raw = (parseFloat(s.cur) || 0) - invN;
  let gainCls = raw >= 0 ? 'ex-pos' : 'ex-neg';
  let gainTxt = `${raw >= 0 ? '+' : '-'}${inr(raw)} · ${raw >= 0 ? '+' : '-'}${invN > 0 ? Math.abs((raw / invN) * 100).toFixed(1) : '0.0'}%`;
  if (v.empty) {
    gainCls = 'ex-none';
    gainTxt = emptyCopy(v, lang).chip;
  }

  const ldSet = s.load !== '' && !Number.isNaN(parseFloat(s.load));
  const using = L('Using the load you entered.', 'आपके डाले हुए लोड का इस्तेमाल हो रहा है।');
  const loadHint = v.eq
    ? (ldSet ? using : L('Leave empty and we assume 1% on a sale within a year.', 'खाली छोड़ें तो हम 1 वर्ष के भीतर बेचने पर 1% मान लेंगे।'))
    : (ldSet ? using : L('Leave empty and we assume no exit load.', 'खाली छोड़ें तो हम मान लेंगे कि कोई एग्ज़िट लोड नहीं है।'));

  return (
    <form className="ex-panel ex-lav" autoComplete="off" onSubmit={(e) => { e.preventDefault(); x.submit(); }}>
      <div>
        <h2>{t('Your fund')}</h2>
        <p className="ex-sub">{t('Results update as you type.')}</p>
      </div>

      <div>
        <span className="ex-lbl">{t('Fund type')}</span>
        <div className="ex-seg">
          <button type="button" className={v.eq ? 'ex-on' : ''} aria-pressed={v.eq} onClick={() => x.setType('Equity Fund')}><TrendIcon />{t('Equity fund')}</button>
          <button type="button" className={!v.eq ? 'ex-on' : ''} aria-pressed={!v.eq} onClick={() => x.setType('Debt Fund')}><ShieldIcon />{t('Debt fund')}</button>
        </div>
      </div>

      <div>
        <label className="ex-lbl" htmlFor="ex-cat">{t('Fund category')}</label>
        <select className="ex-field" id="ex-cat" value={s.cat} onChange={(e) => x.edit({ cat: e.target.value })}>
          {(v.eq ? EQ : DB).map((c) => <option key={c} value={c}>{cat(c)}</option>)}
        </select>
        {v.lock && <p className="ex-hint ex-warn">{t('ELSS units are locked in for 3 years and cannot be sold before then. Count from the allotment date on your statement.')}</p>}
      </div>

      <div>
        <div className="ex-money">
          <div>
            <label className="ex-lbl" htmlFor="ex-inv">{t('Invested')}</label>
            <div className="ex-bigin"><span>₹</span><input ref={invRef} id="ex-inv" type="number" min="1" step="any" inputMode="decimal" required value={s.inv} onChange={(e) => x.edit({ inv: e.target.value })} /></div>
          </div>
          <div>
            <label className="ex-lbl" htmlFor="ex-cur">{t('Worth today')}</label>
            <div className="ex-bigin"><span>₹</span><input ref={curRef} id="ex-cur" type="number" min="0" step="any" inputMode="decimal" required value={s.cur} onChange={(e) => x.edit({ cur: e.target.value })} /></div>
          </div>
        </div>
        <span className={`ex-gain ${gainCls}`}>{gainTxt}</span>
      </div>

      <div>
        <span className="ex-lbl">{t('Quick invested amount')}</span>
        <div className="ex-chips">
          {AMOUNTS.map((a) => (
            <button key={a} type="button" className={Number(s.inv) === a ? 'ex-on' : ''} onClick={() => x.edit({ inv: String(a) })}>
              ₹{a >= 100000 ? `${a / 100000}L` : `${a / 1000}K`}
            </button>
          ))}
        </div>
      </div>

      <HoldControl x={x} />

      <div className="ex-adv">
        <button type="button" className="ex-advbtn" aria-expanded={s.adv} aria-controls="ex-advbox" onClick={x.toggleAdv}>
          <span>{v.eq ? L('Custom exit load and interest rate', 'अपना एग्ज़िट लोड और ब्याज दर') : L('Custom exit load, tax slab and interest rate', 'अपना एग्ज़िट लोड, टैक्स स्लैब और ब्याज दर')}</span>
          <ChevronIcon />
        </button>
        <div className="ex-advbox" id="ex-advbox" hidden={!s.adv}>
          <div>
            <label className="ex-lbl" htmlFor="ex-load">{t('Exit load (%)')}</label>
            <div className="ex-bigin" style={{ padding: '8px 14px' }}>
              <input id="ex-load" type="number" step="any" min="0" max="10" placeholder="1.0" inputMode="decimal" style={{ fontSize: '1.1rem' }} value={s.load} onChange={(e) => x.edit({ load: e.target.value })} />
              <span style={{ fontSize: '1rem' }}>%</span>
            </div>
            <p className="ex-hint">{loadHint}</p>
          </div>
          <div>
            <label className="ex-lbl" htmlFor="ex-rate">{t('Money elsewhere would earn (% a year)')}</label>
            <div className="ex-bigin" style={{ padding: '8px 14px' }}>
              <input id="ex-rate" type="number" step="any" min="0" max="30" inputMode="decimal" style={{ fontSize: '1.1rem' }} value={s.rate} onChange={(e) => x.edit({ rate: e.target.value })} />
              <span style={{ fontSize: '1rem' }}>%</span>
            </div>
            <p className="ex-hint">{t("Starts at SBI's 6.25% a year (deposits of 1 to under 2 years, since 15 Dec 2025). Use your own bank's current rate. Enter 0 to ignore it.")}</p>
          </div>
          {!v.eq && (
            <div>
              <label className="ex-lbl" htmlFor="ex-slab">{t('Income tax slab')}</label>
              <select className="ex-field" id="ex-slab" value={s.slab} onChange={(e) => x.edit({ slab: e.target.value })}>
                {SLABS.map((p) => <option key={p} value={p}>{t(`${p}% slab`)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <button className="ex-go" type="submit" disabled={x.ai.mode === 'loading'}>{t('Get my exit advice')} <ArrowIcon /></button>
      <p className="ex-gonote">
        {s.checked
          ? L('Checked just now. Fund value is assumed to stay flat.', 'अभी जाँचा गया। मान लिया गया है कि फ़ंड का मूल्य स्थिर रहेगा।')
          : L('Fund value is assumed to stay flat.', 'मान लिया गया है कि फ़ंड का मूल्य स्थिर रहेगा।')}
      </p>
    </form>
  );
}
