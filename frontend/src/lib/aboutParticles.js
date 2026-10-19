/**
 * Particle scenes behind the About page.
 * Scene 0: a rising spiral that straightens into an upward arrow, with a rupee sign inside (hero).
 * Scene 1: four separate blobs ("every product works alone").
 * Scene 2: one sphere with an orbit ring ("one household").
 * The cloud morphs between scenes as the page scrolls. It needs the section ids to find where each scene sits.
 *
 * createParticleScenes(canvas, sectionIds) returns a destroy() function (call it when the page unmounts).
 */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitv = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

export function createParticleScenes(cv, sectionIds) {
  const ctx = cv.getContext('2d');
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const R = rng(11);
  const gauss = () => (R() + R() + R() - 1.5) / 1.5;

  let W = 0, H = 0, DPR = 1, mobile = false, N = 0;
  let S = [[], [], []], DL = [], SC = [], GN = 0;
  let A = sectionIds.map((_, i) => i);
  let sCur = 0, raf = 0, dead = false;
  const t0ms = performance.now();

  // dot-matrix rupee sign, drawn from strokes so it never depends on a font
  function rupeePoints(count) {
    const c = document.createElement('canvas'); c.width = 200; c.height = 280;
    const g = c.getContext('2d');
    g.scale(2, 2); g.strokeStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(20, 20); g.lineTo(85, 20);
    g.moveTo(20, 43); g.lineTo(85, 43);
    g.moveTo(20, 20); g.lineTo(50, 20); g.bezierCurveTo(82, 20, 82, 64, 50, 64); g.lineTo(20, 64);
    g.moveTo(26, 64); g.lineTo(74, 124);
    g.stroke();
    const d = g.getImageData(0, 0, 200, 280).data, lit = [], out = [], k = 0.0043;
    for (let y = 0; y < 280; y += 2) for (let x = 0; x < 200; x += 2) if (d[(y * 200 + x) * 4 + 3] > 128) lit.push([x, y]);
    for (let i = 0; i < count; i++) {
      const q = lit[Math.floor(R() * lit.length)];
      out.push([(q[0] - 104) * k + gauss() * 0.01, -0.28 - (q[1] - 144) * k + gauss() * 0.01, gauss() * 0.02]);
    }
    return out;
  }

  function build() {
    N = mobile ? 2400 : 5000;
    S = [[], [], []]; DL = []; SC = [];
    // 0: rising spiral that straightens into an upward arrow (returns that keep growing)
    const glyphN = Math.floor(N * 0.15), headN = Math.floor(N * 0.12), coilN = N - headN - glyphN;
    const M = 600, TURNS = 3.6 * Math.PI, TH0 = 0.35 * Math.PI, TH = [TH0];
    for (let m = 0; m < M; m++) { const tw = m / M, wgt = 1 - smooth((tw - 0.68) / 0.32); TH.push(TH[m] + (TURNS * wgt) / M); }
    const path = (t) => {
      const f = clamp(t, 0, 1) * M, mi = Math.min(Math.floor(f), M - 1), fr = f - mi;
      const th = TH[mi] + (TH[mi + 1] - TH[mi]) * fr, rad = 0.74 + 0.3 * t;
      return [rad * Math.cos(th), -1 + 1.5 * t, rad * Math.sin(th)];
    };
    for (let i = 0; i < coilN; i++) {
      const p = path(i / coilN);
      S[0].push([p[0] + gauss() * 0.04, p[1] + gauss() * 0.04, p[2] + gauss() * 0.04]);
    }
    const E = path(1), Eb = path(0.985);
    let d = [E[0] - Eb[0], E[1] - Eb[1], E[2] - Eb[2]];
    const dl = Math.hypot(d[0], d[1], d[2]);
    d = [d[0] / dl, d[1] / dl, d[2] / dl];
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const n1 = unitv(cross(d, ref)), n2 = cross(d, n1);
    for (let i = 0; i < headN; i++) {
      const hh = R(), rr0 = 0.22 * (1 - hh) * Math.sqrt(R()), ph0 = R() * Math.PI * 2;
      const c1 = Math.cos(ph0) * rr0, c2 = Math.sin(ph0) * rr0;
      S[0].push([
        E[0] + d[0] * 0.6 * hh + n1[0] * c1 + n2[0] * c2,
        E[1] + d[1] * 0.6 * hh + n1[1] * c1 + n2[1] * c2,
        E[2] + d[2] * 0.6 * hh + n1[2] * c1 + n2[2] * c2,
      ]);
    }
    GN = glyphN;
    rupeePoints(glyphN).forEach((q) => S[0].push(q));
    // 1: four separate silos
    const C = [[-0.95, 0.5], [0.95, 0.5], [-0.95, -0.55], [0.95, -0.55]];
    for (let i = 0; i < N; i++) {
      const c = C[i % 4], a = R() * Math.PI * 2, b = Math.acos(2 * R() - 1), r = 0.3 * Math.cbrt(R());
      S[1].push([c[0] + r * Math.sin(b) * Math.cos(a), c[1] + r * Math.sin(b) * Math.sin(a), r * Math.cos(b)]);
    }
    // 2: one household (sphere + orbit ring)
    const sphN = Math.floor(N * 0.7), ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      if (i < sphN) {
        const y = 1 - (i / (sphN - 1)) * 2, rr = Math.sqrt(1 - y * y), ph = i * ga;
        S[2].push([Math.cos(ph) * rr * 0.8 + gauss() * 0.012, y * 0.8, Math.sin(ph) * rr * 0.8]);
      } else {
        const th = R() * Math.PI * 2;
        const rx = Math.cos(th) * 1.18 + gauss() * 0.02, ry0 = gauss() * 0.02, rz = Math.sin(th) * 1.18, tl = 0.5;
        S[2].push([rx, ry0 * Math.cos(tl) - rz * Math.sin(tl), ry0 * Math.sin(tl) + rz * Math.cos(tl)]);
      }
    }
    for (let i = 0; i < N; i++) { DL.push(R()); SC.push([gauss() * 1.2, gauss() * 1.2, gauss() * 1.2]); }
  }

  function anchors() {
    A = sectionIds.map((id, i) => {
      const el = document.getElementById(id);
      if (!el) return A[i];
      const r = el.getBoundingClientRect();
      return r.top + window.scrollY + r.height * 0.5;
    });
  }
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    const m = W < 700;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (m !== mobile || !N) { mobile = m; build(); }
    anchors();
  }
  function stageAt() {
    const y = window.scrollY + H * 0.5;
    if (y <= A[0]) return 0;
    for (let k = 0; k < 4; k++) if (y <= A[k + 1]) return k + (y - A[k]) / (A[k + 1] - A[k]);
    return 4;
  }
  function pick(arr, s) { const k = Math.min(Math.floor(s), arr.length - 2), f = s - k; return arr[k] + (arr[k + 1] - arr[k]) * f; }

  function frame(now) {
    if (dead) return;
    const s = stageAt();
    sCur += (s - sCur) * (reduce ? 1 : 0.07);
    const m = mobile, tt = reduce ? 0 : Math.max(0, now - t0ms);
    let cx = W * pick(m ? [.5, .5, .5, .5, .5] : [.5, .82, .82, .82, .82], sCur);
    let cy = H * pick(m ? [.25, .5, .5, .5, .5] : [.38, .3, .3, .3, .3], sCur);
    const sd = Math.min(W * .13, H * .2), sg = Math.min(W * .12, H * .2);
    const scale = pick(m ? [W * .22, W * .15, W * .16, W * .16, W * .16] : [Math.min(W * .15, H * .22), sg, sd, sd, sd], sCur) * DPR;
    const alpha = m
      ? 0.9 * (1 - 0.74 * clamp(sCur, 0, 1)) * (1 - 0.6 * clamp(sCur - 3, 0, 1))
      : 1 - 0.22 * clamp(sCur, 0, 1) - 0.42 * clamp(sCur - 2, 0, 1) - 0.25 * clamp(sCur - 3, 0, 1);
    cx *= DPR; cy *= DPR;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);

    // ripples (hero only)
    const heroK = 1 - smooth(sCur / 0.7);
    if (heroK > 0.01) {
      ctx.lineWidth = 1.2 * DPR; ctx.strokeStyle = '#C9CED8';
      for (let j = 0; j < 6; j++) {
        const ph = (tt * 0.00014 + j / 6) % 1, rx = ph * W * 0.7 * DPR, ry = rx * 0.15;
        ctx.globalAlpha = (1 - ph) * 0.2 * heroK * (ph < 0.06 ? ph / 0.06 : 1);
        ctx.beginPath(); ctx.ellipse(W * 0.5 * DPR, H * (m ? 0.6 : 0.72) * DPR, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    const k = Math.min(Math.floor(sCur), 2), f = sCur - k;
    const SA = S[Math.min(k, 2)], SB = S[Math.min(k + 1, 2)];
    const ang = (reduce ? 0.35 : tt * 0.00024) + sCur * 0.4, ca = Math.cos(ang), sa = Math.sin(ang);
    const tilt = 0.28, ct = Math.cos(tilt), st = Math.sin(tilt);
    ctx.fillStyle = '#DCE2EE';
    const gStart = N - GN, sway = reduce ? 0.1 : Math.sin(tt * 0.0006) * 0.35;
    for (let i = 0; i < N; i++) {
      const a = SA[i], b = SB[i], u = smooth((f - DL[i] * 0.45) / 0.55), mid = u * (1 - u) * 3.2;
      let x = a[0] + (b[0] - a[0]) * u + SC[i][0] * mid, y = a[1] + (b[1] - a[1]) * u + SC[i][1] * mid;
      const z = a[2] + (b[2] - a[2]) * u + SC[i][2] * mid;
      if (!reduce) { const w = tt * 0.001 + i; x += Math.sin(w * 1.3) * 0.006; y += Math.cos(w * 1.1) * 0.006; }
      let cA = ca, sA = sa, gw = 0;
      if (i >= gStart && k === 0) { gw = 1 - u; const aG = sway * gw + ang * (1 - gw); cA = Math.cos(aG); sA = Math.sin(aG); }
      const x1 = x * cA + z * sA, z1 = -x * sA + z * cA;
      const y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const pf = 3.4 / (3.4 - z2 * 0.9), sx = cx + x1 * pf * scale, sy = cy - y1 * pf * scale;
      const dep = clamp((z2 + 1.3) / 2.6, 0, 1), al = Math.min(1, (0.18 + 0.82 * dep) * alpha * (1 + 0.7 * gw));
      if (al < 0.02) continue;
      const sz = (0.9 + 1.0 * dep) * DPR * (mobile ? 0.95 : 1) * (1 + 0.3 * gw);
      ctx.globalAlpha = al;
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  const onResize = () => { size(); if (reduce) frame(0); };
  const onScroll = () => frame(0);
  size();
  window.addEventListener('resize', onResize);
  window.addEventListener('load', anchors);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead) anchors(); });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => anchors()) : null;
  if (ro) ro.observe(document.body);
  if (reduce) { window.addEventListener('scroll', onScroll, { passive: true }); frame(0); }
  else raf = requestAnimationFrame(frame);

  return function destroy() {
    dead = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('load', anchors);
    window.removeEventListener('scroll', onScroll);
    if (ro) ro.disconnect();
  };
}
