import { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal. Adds `ab-in` when the element enters the viewport and `ab-done` ~1.3s later
 * (ab-done switches the transition to a quick one, so hover and click are not delayed by the reveal stagger).
 * With reduced motion (or no IntersectionObserver) everything is shown straight away.
 */
export function useReveal() {
  const ref = useRef(null);
  const [cls, setCls] = useState('');
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      setCls('ab-in ab-done');
      return undefined;
    }
    let timer;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCls('ab-in');
          timer = setTimeout(() => setCls('ab-in ab-done'), 1300);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);
  return [ref, cls];
}

export default function Reveal({ as: Tag = 'div', delay, className = '', style, children, ...rest }) {
  const [ref, cls] = useReveal();
  const st = delay ? { ...style, '--d': delay } : style;
  return (
    <Tag ref={ref} className={`${className} ab-rv ${cls}`.trim()} style={st} {...rest}>
      {children}
    </Tag>
  );
}
