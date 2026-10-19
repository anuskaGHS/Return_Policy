import { useEffect, useRef, useState } from 'react';

// Eases a number toward `target` (420 ms). Jumps straight there when the user prefers reduced motion.
export default function useTween(target, ms = 420) {
  const [value, setValue] = useState(target);
  const cur = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || cur.current === target) {
      cur.current = target;
      setValue(target);
      return undefined;
    }
    const from = cur.current;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      cur.current = from + (target - from) * e;
      setValue(cur.current);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else {
        cur.current = target;
        setValue(target);
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);

  return value;
}
