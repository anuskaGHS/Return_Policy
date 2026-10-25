import useExplainerText from '../../hooks/useExplainerText.js';

// The yellow "In plain words" card. Shows the AI's wording when the AI answered and passed our number check;
// otherwise it shows the same sentences written by code. The "AI" tag is only shown when the AI really wrote the text.
export default function ExplanationCard({ explanation, busy }) {
  const { L, hi } = useExplainerText();
  const text = explanation ? (hi ? explanation.hi : explanation.en) : '';
  const byAi = explanation && explanation.source === 'ai';
  return (
    <section className="rx-panel rx-ai" aria-labelledby="rx-exp" aria-busy={busy}>
      <div className="rx-aitop">
        <h2 className="rx-aihd" id="rx-exp">{L('In plain words', 'आसान शब्दों में')}</h2>
        <div className="rx-aitags">
          <span className="rx-aichip">{byAi ? 'AI' : L('Summary', 'सार')}</span>
          <span className="rx-aichip rx-aichip2">{hi ? 'हिन्दी' : 'EN'}</span>
        </div>
      </div>
      {busy ? (
        <div className="rx-aisk" aria-hidden="true"><i /><i /><i /></div>
      ) : (
        <p className="rx-aitext" lang={hi ? 'hi' : 'en'}>{text}</p>
      )}
      {!byAi && !busy && (
        <p className="rx-ainote">
          {L(
            'AI could not answer this time, so this text is written from the same numbers by our own code.',
            'इस बार AI जवाब नहीं दे सका, इसलिए यह पाठ उन्हीं आँकड़ों से हमारे अपने कोड ने लिखा है।',
          )}
        </p>
      )}
      <p className="rx-aifoot">{L('Every number in this text comes from the calculation above.', 'इस पाठ का हर आँकड़ा ऊपर की गणना से आता है।')}</p>
    </section>
  );
}
