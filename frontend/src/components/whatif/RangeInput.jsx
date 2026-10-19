// The page's range slider. `fill` sets the filled-track colour, `dark` is the variant for dark cards.
export default function RangeInput({ id, min, max, step, value, onChange, fill, dark = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  const style = { '--p': pct + '%' };
  if (fill) style['--fill'] = fill;
  return (
    <input
      className={'wi-range' + (dark ? ' dk' : '')}
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={style}
    />
  );
}
