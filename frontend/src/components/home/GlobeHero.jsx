import { useEffect, useRef } from 'react';
import { createGlobe } from '../../lib/globeRender.js';

/**
 * Dot-matrix globe turned toward India. Plain Canvas 2D, no extra packages.
 * Mount it inside a positioned container that fills the hero.
 * `textRef` (optional) points at the hero text block so dots fade slightly behind it.
 */
export default function GlobeHero({ textRef, theme = 'violet' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const host = canvas.parentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    let rafId = 0;
    let globe = null;
    let ro = null;
    let io = null;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let textRect = null;
    let start = 0;
    let inView = true;
    let ema = 8;

    function measure() {
      const r = host.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      const el = textRef && textRef.current;
      if (el) {
        const tr = el.getBoundingClientRect();
        textRect = { cx: tr.left - r.left + tr.width / 2, cy: tr.top - r.top + tr.height / 2, w: tr.width, h: tr.height };
      } else {
        textRect = null;
      }
    }

    function paint(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      globe.draw(ctx, W, H, t, theme, textRect);
    }

    function frame(ts) {
      rafId = 0;
      if (!start) start = ts;
      const t0 = performance.now();
      paint((ts - start) / 1000 + 2);
      ema = ema * 0.9 + (performance.now() - t0) * 0.1;
      if (ema > 14 && dpr > 1) {
        dpr = 1;
        canvas.width = Math.round(W);
        canvas.height = Math.round(H);
        ema = 8;
      }
      schedule();
    }

    function schedule() {
      if (!rafId && !reduce && inView && !document.hidden && globe) rafId = requestAnimationFrame(frame);
    }

    function redraw() {
      if (!globe) return;
      if (reduce) paint(3);
      else schedule();
    }

    // Land points are loaded on demand so they stay out of the main bundle.
    import('../../assets/globe-land-points.json')
      .then((mod) => {
        if (cancelled) return;
        globe = createGlobe(mod.default, (w, h) => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return c;
        });
        measure();
        redraw();
        if (window.ResizeObserver) {
          ro = new ResizeObserver(() => { measure(); redraw(); });
          ro.observe(host);
        }
        if (window.IntersectionObserver) {
          io = new IntersectionObserver((e) => {
            inView = e[0].isIntersecting;
            if (inView) {
              schedule();
            } else if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
          });
          io.observe(host);
        }
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => { if (!cancelled) { measure(); redraw(); } });
        }
      })
      .catch(() => { /* if the data fails to load, the hero simply stays plain */ });

    document.addEventListener('visibilitychange', schedule);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [theme, textRef]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
