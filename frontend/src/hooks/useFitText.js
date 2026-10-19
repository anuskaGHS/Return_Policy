import { useLayoutEffect } from 'react';

// Keeps a one-line heading on one line: shrinks the font only when the text is wider than its box.
export default function useFitText(ref, deps) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.fontSize = '';
      const avail = el.clientWidth;
      const need = el.scrollWidth;
      if (avail > 0 && need > avail) {
        const px = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = Math.max(16, Math.floor(px * (avail / need) * 0.985 * 10) / 10) + 'px';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
