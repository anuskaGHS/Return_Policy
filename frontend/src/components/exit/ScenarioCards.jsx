import { SCENARIOS } from '../../lib/exit/model.js';
import useExitText from '../../hooks/useExitText.js';
import { ArrowIcon } from './icons.jsx';

// Three ready-made examples: one click fills the whole form.
export default function ScenarioCards({ x }) {
  const { L } = useExitText();
  return (
    <div className="ex-scns" role="group" aria-label="Try a holding">
      {Object.keys(SCENARIOS).map((k) => {
        const c = SCENARIOS[k];
        return (
          <button key={k} type="button" className={`ex-scn${x.s.scn === k ? ' ex-on' : ''}`} aria-pressed={x.s.scn === k} onClick={() => x.pickScenario(k)}>
            <span><b>{L(c.name[0], c.name[1])}</b><small>{L(c.stats[0], c.stats[1])}</small></span>
            <ArrowIcon />
          </button>
        );
      })}
    </div>
  );
}
