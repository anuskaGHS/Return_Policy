import { useEffect, useLayoutEffect, useRef } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shrink a big number so it never runs into the card next to it.
function fitNum(el, txt) {
  el.style.fontSize = '';
  el.textContent = txt;
  const w = el.clientWidth;
  const sw = el.scrollWidth;
  if (w && sw > w) el.style.fontSize = `${Math.max(16, Math.floor(parseFloat(getComputedStyle(el).fontSize) * (w / sw) * 0.96))}px`;
}

// Shrink a typed amount so every digit stays visible.
export function fitIn(el) {
  if (!el) return;
  el.style.fontSize = '';
  const w = el.clientWidth;
  const sw = el.scrollWidth;
  if (w && sw > w) el.style.fontSize = `${Math.max(12, Math.floor(parseFloat(getComputedStyle(el).fontSize) * (w / sw) * 0.97))}px`;
}

/**
 * A big number that counts up to its value and shrinks to fit its box.
 * `format(n)` turns a number into text. `animate={false}` (while dragging the chart) jumps straight to the value.
 * The visible text is drawn by hand each frame, so a hidden copy of the final value is kept for screen readers.
 */
export function FitNum({ value, format, animate = true, className }) {
  const ref = useRef(null);
  const mem = useRef({ v: null, raf: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    const m = mem.current;
    cancelAnimationFrame(m.raf);
    fitNum(el, format(value));
    const from = m.v == null ? 0 : m.v;
    m.v = value;
    if (!animate || reduced() || from === value) {
      el.textContent = format(value);
      return undefined;
    }
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / 520);
      const e = 1 - (1 - p) ** 3;
      el.textContent = format(from + (value - from) * e);
      if (p < 1) m.raf = requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(m.raf);
  }, [value, animate, format]);

  // refit when the box changes width (window resize, layout change)
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let last = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== last) {
        last = el.clientWidth;
        fitNum(el, el.textContent);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div ref={ref} className={className} aria-hidden="true" />
      <span className="ex-sr">{format(value)}</span>
    </>
  );
}

/** Keep a typed number inside its input box: call with the input element and its current text. */
export function useFitInput(ref, text) {
  useLayoutEffect(() => {
    fitIn(ref.current);
  }, [ref, text]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let last = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== last) {
        last = el.clientWidth;
        fitIn(el);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}
