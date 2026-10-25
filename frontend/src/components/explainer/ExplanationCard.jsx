import useExplainerText from '../../hooks/useExplainerText.js';

// The yellow "In plain words" card. The "AI" tag is shown only when the AI really changed the wording;
// otherwise the text is the sentences written by our own code from the calculated numbers.
export default function ExplanationCard({ explanation, busy }) {
  const { L, hi } = useExplainerText();
  const text = explanation ? (hi ? explanation.hi : explanation.en) : '';
  const byAi = explanation && explanation.source === 'ai';
  return (
    <section className="rx-panel rx-ai" aria-labelledby="rx-exp" aria-busy={busy}>
      <div className="rx-aitop">
        <h2 className="rx-aihd" id="rx-exp">{L('In plain words', 'आसान शब्दों में')}</h2>
        <span className="rx-aichip">{byAi ? 'AI' : L('Summary', 'सार')}</span>
      </div>
      {busy ? (
        <div className="rx-aisk" aria-hidden="true"><i /><i /><i /></div>
      ) : (
        <p className="rx-aitext" lang={hi ? 'hi' : 'en'}>{text}</p>
      )}
      {!byAi && !busy && (
        <p className="rx-ainote">
          {L(
            'This summary is written by our own code from the calculated numbers above.',
            'यह सार ऊपर की गणना के आँकड़ों से हमारे अपने कोड ने लिखा है।',
          )}
        </p>
      )}
      <p className="rx-aifoot">{L('Every number in this text comes from the calculation above.', 'इस पाठ का हर आँकड़ा ऊपर की गणना से आता है।')}</p>
    </section>
  );
}
