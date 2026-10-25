export function LoanPlainWords({ data, t, lang, glow }) {
  const points = lang === 'hi' ? (data.key_points_hi || data.key_points) : data.key_points;
  return (
    <section className={`lv-plain${glow ? ' lv-glow' : ''}`} id="lv-plain">
      <div className="lv-plain-top">
        <span className="lv-chip">{t.chip}</span>
        <h2>{t.pwTitle}</h2>
      </div>
      {points?.map((point) => <p key={point}>{point}</p>)}
      <small>{t.pwNote}</small>
    </section>
  );
}

export default function LoanNotes({ data, t, lang }) {
  const notes = lang === 'hi' ? (data.notes_hi || data.notes) : data.notes;
  return (
    <>
      <section className="lv-notes">
        <h2>{t.notesTitle}</h2>
        <ul>
          {notes?.map((note) => {
            const [bold, ...rest] = String(note).split(':');
            return (
              <li key={note}>
                <b>{bold}{rest.length ? ':' : ''}</b>
                {rest.length ? ` ${rest.join(':').trim()}` : ''}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="lv-disclaimer">{t.disclaimer}</p>
    </>
  );
}

