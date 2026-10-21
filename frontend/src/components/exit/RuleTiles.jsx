import { ruleTiles } from '../../lib/exit/copy.js';
import useExitText from '../../hooks/useExitText.js';

// The three rules behind the numbers. Drawn even while the amounts are blank, so the language toggle always reaches them.
export default function RuleTiles({ x }) {
  const { lang } = useExitText();
  const { exit_load_pct: load } = x.v.inp;
  const tiles = ruleTiles(x.v, load === null ? null : String(load), lang);
  return (
    <section className="ex-rules" aria-label="Rules used">
      {tiles.map((k) => (
        <article key={k.cls} className={`ex-panel ex-rule ex-${k.cls}`}>
          <div className="ex-rk"><span>{k.kick}</span>{k.tag && <span className={`ex-rtag${k.tag.warn ? ' ex-warn' : ''}`}>{k.tag.text}</span>}</div>
          <div className="ex-rbig">{k.big}</div>
          <p>{k.p}</p>
          <div className="ex-rfoot">{k.foot}</div>
        </article>
      ))}
    </section>
  );
}
