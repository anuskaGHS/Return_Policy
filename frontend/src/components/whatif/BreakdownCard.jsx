import { forwardRef, useState } from 'react';
import RangeInput from './RangeInput.jsx';
import Rich from './Rich.jsx';
import { COMPS, partColor } from '../../lib/whatif/healthScore.js';
import { noteFor } from '../../lib/whatif/copy.js';
import { short } from '../../lib/whatif/format.js';
import { useLang, useT } from '../../hooks/useLang.js';

// What each control shows as its current value.
function controlValue(field, d, lang, t) {
  if (field === 'sip_return_pct') return d.sret.toFixed(1) + '%';
  if (field === 'term_cover') return short(d.cover, lang);
  if (field === 'emergency_months') return d.em + t(d.em === 1 ? ' month' : ' months');
  return d.lt + '%';
}

// Dark card: the five parts of the score, each with its own points, bar, note and (mostly) a slider.
const BreakdownCard = forwardRef(function BreakdownCard({ inputs, d, onField }, ref) {
  const [notesOpen, setNotesOpen] = useState(false);
  const lang = useLang();
  const t = useT();
  return (
    <article ref={ref} className="wi-card dark wi-bd" id="wi-bd" style={{ '--d': '.34s' }} aria-label={t('Score breakdown')}>
      <div className="wi-top">
        <span className="wi-label" style={{ color: '#F6F3EC' }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
          {t('Score breakdown')}
        </span>
        <span className="wi-bd-r">
          <span className="wi-chip" style={{ background: 'rgba(246,243,236,.1)', color: '#F6F3EC' }}>{t('5 parts · 100 points')}</span>
          <button type="button" className="wi-tog" aria-expanded={notesOpen} aria-controls="wi-comps" onClick={() => setNotesOpen((v) => !v)}>
            {notesOpen ? t('Hide the details') : t('How each part is scored')}
          </button>
        </span>
      </div>
      <p className="wi-bd-sum">
        {d.comps.map((c) => c.pts).join(' + ')} = <b>{d.score}</b> {t('out of 100')}
      </p>
      <p className="wi-bd-hint">{t('Move a slider to see which part pulls your score up or down.')}</p>

      <div className={'wi-comps' + (notesOpen ? ' notes' : '')} id="wi-comps">
        {COMPS.map((meta) => {
          const c = d.comps.find((x) => x.key === meta.key);
          const f = c.pts / c.max;
          const col = partColor(c.pts, c.max);
          const isWeak = d.weak.key === c.key;
          const ctl = meta.control;
          return (
            <div key={c.key} className={'wi-comp' + (isWeak ? ' drag' : '')} style={{ '--sc': col }}>
              <div className="wi-c-l">
                <div className="wi-c-name"><span>{t(c.name)}</span><span className="wi-c-w">{c.max} {t('pts')}</span></div>
                <span className="wi-c-tag" hidden={!isWeak}>{t('Biggest drag')}</span>
              </div>
              <div className="wi-c-m">
                <div className="wi-c-pts"><b>{c.pts}</b><small>/ {c.max}</small></div>
                <div className="wi-pbar" style={{ '--w': f * 100 + '%' }}><i /></div>
              </div>
              <div className="wi-c-r">
                {ctl ? (
                  <>
                    <div className="wi-c-ctl"><label htmlFor={ctl.id}>{t(ctl.label)}</label><span className="wi-c-v">{controlValue(ctl.field, d, lang, t)}</span></div>
                    <RangeInput id={ctl.id} min={ctl.min} max={ctl.max} step={ctl.step} value={inputs[ctl.field]} onChange={(v) => onField(ctl.field, v)} fill={col} dark />
                    <div className="wi-c-lim"><span>{t(ctl.limits[0])}</span><span>{t(ctl.limits[1])}</span></div>
                  </>
                ) : (
                  <>
                    <div className="wi-c-ctl"><span>{t('EMI share of income')}</span><span className="wi-c-v">{d.ratio.toFixed(1)}%</span></div>
                    <p className="wi-c-auto">{t('Set by the EMI and income sliders.')}</p>
                  </>
                )}
              </div>
              <p className="wi-c-note"><Rich parts={noteFor(c.key, d, lang)} /></p>
            </div>
          );
        })}
      </div>
    </article>
  );
});

export default BreakdownCard;
