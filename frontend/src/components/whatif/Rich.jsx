// Renders "parts" from lib/whatif/copy.js: plain strings stay text, { b } becomes <b>.
export default function Rich({ parts }) {
  return (
    <>
      {parts.map((p, i) => (typeof p === 'string' ? p : <b key={i}>{p.b}</b>))}
    </>
  );
}
