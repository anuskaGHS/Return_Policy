import useExplainerText from '../../hooks/useExplainerText.js';
import { fmtDate } from '../../lib/explainer/format.js';

const TONES = ['rx-r1', 'rx-r2', 'rx-r3', 'rx-r1'];

// "Events from the same period": the source documents the backend found for the sectors that mattered most.
// The summaries are our own short wording; each card links to the original.
export default function SourceCards({ documents }) {
  const { L, lang } = useExplainerText();
  const docs = Array.isArray(documents) ? documents : [];
  return (
    <>
      <div className="rx-secthd">
        <h2>{L('Events from the same period', 'उसी अवधि की घटनाएँ')}</h2>
        <p>
          {L(
            'Our short summaries of sources we found. Open each original to read it in full.',
            'हमें मिले स्रोतों का हमारा छोटा सार। पूरा पढ़ने के लिए मूल स्रोत खोलें।',
          )}
          {lang === 'hi' && ' स्रोत अंग्रेज़ी में हैं।'}
        </p>
      </div>
      {docs.length === 0 ? (
        <p className="rx-empty" role="status">
          {L(
            'We have no source documents for these sectors in this period yet.',
            'इस अवधि के इन सेक्टरों के लिए हमारे पास अभी कोई स्रोत दस्तावेज़ नहीं है।',
          )}
        </p>
      ) : (
        <div className="rx-rules">
          {docs.map((d, i) => (
            <section className={`rx-panel rx-rule ${TONES[i % TONES.length]}`} key={d.id} aria-labelledby={`rx-d-${d.id}`}>
              <div className="rx-rk">
                <span>{L('Source', 'स्रोत')} {i + 1}</span>
                <span className="rx-rtag">
                  {d.source_type === 'official' ? L('official', 'आधिकारिक') : L('news', 'समाचार')}
                </span>
              </div>
              <h3 id={`rx-d-${d.id}`}>{d.title}</h3>
              <span className="rx-rmeta">{d.publisher} · {fmtDate(d.published_on, lang)}</span>
              <p>{d.summary}</p>
              <a className="rx-rlink" href={d.url} target="_blank" rel="noopener noreferrer">
                {L('Open the original', 'मूल स्रोत खोलें')} ↗
                <span className="rx-sr">{L(' (opens in a new tab)', ' (नए टैब में खुलता है)')}</span>
              </a>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
