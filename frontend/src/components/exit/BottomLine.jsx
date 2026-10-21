import { worthCopy } from '../../lib/exit/copy.js';
import useExitText from '../../hooks/useExitText.js';

// "The bottom line": who wins once the interest the money could earn elsewhere is counted.
export default function BottomLine({ x }) {
  const { t, lang } = useExitText();
  const w = worthCopy(x.v, lang);
  return (
    <section className="ex-panel ex-worth" aria-labelledby="ex-wh">
      <div>
        <span className="ex-wk">{t('The bottom line')}</span>
        <h3 className="ex-whd" id="ex-wh">{w.head}</h3>
      </div>
      <div className="ex-wside">{w.note && <p className="ex-wnote">{w.note}</p>}</div>
      <p className="ex-wfoot">{w.foot}</p>
    </section>
  );
}
