import { optionsCopy } from '../../lib/exit/copy.js';
import useExitText from '../../hooks/useExitText.js';
import { FitNum } from './FitNum.jsx';
import { inr } from '../../lib/exit/format.js';
import { InfoIcon } from './icons.jsx';

function Lines({ lines }) {
  return (
    <dl className="ex-olines">
      {lines.map((l) => (
        <div key={l.k} className={l.tot ? 'ex-tot' : undefined}><dt>{l.label}</dt><dd>{l.value}</dd></div>
      ))}
    </dl>
  );
}

// Option A (sell today) against Option B (wait), side by side. The better pick glows.
export default function OptionCards({ x }) {
  const { t, lang } = useExitText();
  const o = optionsCopy(x.v, x.s.days, lang);
  return (
    <section className="ex-opts" aria-label="Sell today or wait">
      <div className={`ex-panel ex-opt ex-optA${o.a.best ? ' ex-glow' : ''}`}>
        <div className="ex-okick"><span>{t('Option A')}</span>{o.a.best && <span className="ex-best">{t('Better pick')}</span>}</div>
        <h3 className="ex-otitle">{t('Sell today')}</h3>
        <div className="ex-osub">{o.a.sub}</div>
        <div className="ex-olab">{t('What it costs you')}</div>
        <FitNum className="ex-obig" value={o.a.big} format={inr} animate={!x.dragging} />
        <div className="ex-okeep">{t('You keep')} <b>{o.a.keep}</b></div>
        <Lines lines={o.a.lines} />
        <div className="ex-onote"><InfoIcon /><span>{o.a.note}</span></div>
      </div>
      <span className="ex-vs" aria-hidden="true">VS</span>
      <div className={`ex-panel ex-opt ex-optB${o.b.best ? ' ex-glow' : ''}`}>
        <div className="ex-okick"><span>{t('Option B')}</span>{o.b.best && <span className="ex-best">{t('Better pick')}</span>}</div>
        <h3 className="ex-otitle">{o.b.title}</h3>
        <div className="ex-osub">{o.b.sub}</div>
        <div className="ex-olab">{t('What it costs you')}</div>
        <FitNum className="ex-obig" value={o.b.big} format={inr} animate={!x.dragging} />
        <div className="ex-okeep">{t('You keep')} <b>{o.b.keep}</b></div>
        <Lines lines={o.b.lines} />
        <div className="ex-onote"><InfoIcon /><span>{o.b.note}</span></div>
      </div>
    </section>
  );
}
