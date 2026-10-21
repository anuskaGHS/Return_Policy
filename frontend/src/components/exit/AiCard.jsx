import { emptyCopy } from '../../lib/exit/copy.js';
import useExitText from '../../hooks/useExitText.js';

// The yellow "Explained in plain words" card. It has five states:
//   quick     the free summary made from the numbers, live as you type
//   loading   waiting for the AI (shimmering lines)
//   ai        the AI's explanation, written for exactly the numbers on screen
//   stale     the numbers changed after the AI wrote it, so the card says so
//   fallback  the AI could not answer (or its numbers did not match), so the quick summary is shown with a note
export default function AiCard({ x }) {
  const { t, L, lang, hi } = useExitText();
  const { v, quick, ai } = x;

  let text;
  let mode = ai.mode;
  if (v.empty) {
    text = emptyCopy(v, lang).ai;
    mode = 'quick';
  } else if (mode === 'ai' || mode === 'stale') {
    text = hi ? ai.hi : ai.en;
  } else {
    text = hi ? quick.hi : quick.en;
  }

  const showAiChip = mode === 'ai' || mode === 'stale' || mode === 'loading';
  let note = null;
  if (!v.empty) {
    if (mode === 'stale') note = L('Your numbers changed. Press “Get my exit advice” to refresh this explanation.', 'आपके आँकड़े बदल गए हैं। इस व्याख्या को ताज़ा करने के लिए “मेरी एग्ज़िट सलाह पाएँ” दबाएँ।');
    else if (mode === 'quick') note = L('This is a quick summary. Press “Get my exit advice” and AI will explain it in plain words.', 'यह एक त्वरित सार है। “मेरी एग्ज़िट सलाह पाएँ” दबाएँ और AI इसे आसान शब्दों में समझाएगा।');
    else if (mode === 'fallback') note = t('AI could not answer this time. This is a quick summary worked out from your numbers.');
    else if (mode === 'loading') note = t('AI is writing your explanation…');
  }

  return (
    <section ref={x.aiCardRef} className="ex-panel ex-ai" tabIndex={-1} aria-labelledby="ex-aih" aria-busy={mode === 'loading'}>
      <div className="ex-aitop">
        <h3 className="ex-aihd" id="ex-aih">{t('Explained in plain words')}</h3>
        <span className="ex-aitags">
          <span className="ex-aichip">{showAiChip ? L('AI Advisor', 'AI सलाहकार') : L('Quick summary', 'त्वरित सार')}</span>
          {mode === 'stale' && <span className="ex-aichip ex-aichip2">{L('Out of date', 'पुराना')}</span>}
        </span>
      </div>
      {mode === 'loading' ? (
        <div className="ex-aisk" aria-hidden="true"><i /><i /><i /></div>
      ) : (
        <p className={`ex-aitext${mode === 'stale' ? ' ex-stale' : ''}`} lang={hi ? 'hi' : 'en'}>{text}</p>
      )}
      {note && <p className="ex-ainote" role={mode === 'loading' ? 'status' : undefined}>{note}</p>}
      <p className="ex-aifoot">{t('Based only on the numbers above.')}</p>
    </section>
  );
}
