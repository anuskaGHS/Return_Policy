import { useEffect, useRef } from 'react';
import { FEATURES, PALETTES, paletteStyle, Icon } from '../../data/homeFeatures.jsx';

/*
 * 3D ring of cards, drifting in one direction. The viewer sits at the centre of a cylinder,
 * so cards at the sides are nearer and larger; they fade out toward the edges.
 *   R = 960 (also the CSS perspective), N = 30 cards, one every 12 degrees, drift 2.4 deg/s.
 * The ring is authored on a 1172px-wide canvas and scaled up (never down) on wide screens.
 */
const N = 30;
const STEP = 360 / N;
const CULL = 48;       // cards further than this angle from the centre are hidden
const SPEED = 2.4;     // degrees per second
const DESIGN_W = 1172;
const R = 960;
const D2R = Math.PI / 180;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Palette styles never change, so build them once.
const CARD_STYLES = FEATURES.map((f) => paletteStyle(PALETTES[f.palette]));

export default function FeatureRing() {
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cards = cardRefs.current;
    if (!wrap) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let phase = 0;
    let last = 0;
    let running = true;
    let rafId = 0;
    let io = null;
    let reveal = null;

    function place() {
      for (let i = 0; i < N; i += 1) {
        const el = cards[i];
        if (!el) continue;
        const a = ((((i * STEP + phase) % 360) + 540) % 360) - 180;
        if (Math.abs(a) > CULL) { el.style.visibility = 'hidden'; continue; }
        el.style.visibility = 'visible';
        const r = a * D2R;
        const cs = Math.cos(r);
        el.style.transform = `translate3d(${(R * Math.sin(r)).toFixed(2)}px,0,${(R * (1 - cs)).toFixed(2)}px) rotateY(${(-a).toFixed(3)}deg)`;
        el.style.opacity = (1 - smooth(0.55 * CULL, CULL, Math.abs(a))).toFixed(3);
      }
    }
    function fit() {
      wrap.style.setProperty('--k', Math.min(1.45, Math.max(1, wrap.clientWidth / DESIGN_W)).toFixed(4));
    }
    function tick(t) {
      rafId = 0;
      if (!running) { last = 0; return; }
      if (!last) last = t;
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      phase -= SPEED * dt;
      place();
      rafId = requestAnimationFrame(tick);
    }
    function setRunning(v) {
      if (v === running) return;
      running = v;
      if (v && !reduce && !rafId) { last = 0; rafId = requestAnimationFrame(tick); }
    }
    function onVisibility() { setRunning(!document.hidden); }

    // Fade the ring in the first time it scrolls into view.
    if (reduce || !window.IntersectionObserver) {
      wrap.classList.add('hs-in');
    } else {
      reveal = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { wrap.classList.add('hs-in'); reveal.disconnect(); }
      }, { threshold: 0.12 });
      reveal.observe(wrap);
    }

    fit();
    place();
    window.addEventListener('resize', fit);
    if (!reduce) {
      rafId = requestAnimationFrame(tick);
      if (window.IntersectionObserver) {
        io = new IntersectionObserver((e) => setRunning(e[0].isIntersecting && !document.hidden));
        io.observe(wrap);
      }
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      window.removeEventListener('resize', fit);
      document.removeEventListener('visibilitychange', onVisibility);
      if (io) io.disconnect();
      if (reveal) reveal.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="hs-ring-wrap hs-rv" ref={wrapRef} role="group" aria-label="Everything Return Policy does, live and coming soon, scrolling slowly">
      <div className="hs-ring">
        {Array.from({ length: N }, (_, i) => {
          const idx = i % FEATURES.length;
          const f = FEATURES[idx];
          return (
            <div
              key={i}
              className="hs-fcard"
              ref={(el) => { cardRefs.current[i] = el; }}
              style={CARD_STYLES[idx]}
              aria-hidden={i < FEATURES.length ? 'false' : 'true'}
            >
              {f.status === 'soon' ? <span className="hs-fp">Coming soon</span> : null}
              <div className="hs-fk"><Icon name={f.icon} />{f.kick}</div>
              {f.heading}
              <div className="hs-fv">{f.viz}</div>
              <div className="hs-ft">{f.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
