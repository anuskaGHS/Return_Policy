// Dot-matrix globe renderer (plain Canvas 2D, no dependencies).
// Ported from the approved hero design. Tuning values live in TUNING below.
var DEG = Math.PI / 180, TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function rgba(c, a) { a = a < 0 ? 0 : a > 1 ? 1 : a; return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normv(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function unit(lon, lat) { var lo = lon * DEG, la = lat * DEG; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; }
function slerp(a, b, u) {
  var w = Math.acos(clamp(dot(a, b), -1, 1));
  if (w < 1e-6) return a.slice();
  var s = Math.sin(w), k1 = Math.sin((1 - u) * w) / s, k2 = Math.sin(u * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

var TUNING = {
  RADIUS_W: 0.46, RADIUS_H: 0.42, CENTER_Y: 0.90,
  INDIA_LON: 79, INDIA_LAT: 22, TILT_DEG: 12.5,
  SWING_DEG: 24, SWING_SECONDS: 44,
  INDIA_RADIUS_DEG: 15, RIPPLE_SPEED: 2.4,
  DIM_MIN: 0.55,
  ORBIT_R: 1.17, ORBIT_TILT_DEG: 3, ORBIT_ROLL_DEG: -7, ORBIT_SECONDS: 16,
  RIM_BREATH_SECONDS: 6
};

var THEMES = {
  violet: {
    bg: '#000000', bgRGB: [0, 0, 0],
    dot: [168, 150, 255], dotHot: [236, 230, 255],
    glow: [96, 64, 235], rim: [124, 96, 255], rimBright: [200, 184, 255],
    line: [176, 158, 255], node: [226, 218, 255],
    star: [255, 255, 255], arc: [255, 206, 120], india: [255, 210, 124]
  },
  gold: {
    bg: '#14110F', bgRGB: [20, 17, 15],
    dot: [217, 164, 65], dotHot: [248, 226, 160],
    glow: [185, 130, 42], rim: [229, 178, 82], rimBright: [250, 220, 150],
    line: [217, 164, 65], node: [251, 226, 157],
    star: [255, 248, 238], arc: [242, 207, 126], india: [255, 244, 208]
  }
};

function buildIco(level) {
  var t = (1 + Math.sqrt(5)) / 2;
  var V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(normv);
  var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (var l = 0; l < level; l++) {
    var cache = {};
    var mid = function (a, b) {
      var k = a < b ? a + '_' + b : b + '_' + a;
      if (cache[k] !== undefined) return cache[k];
      V.push(normv([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2]));
      cache[k] = V.length - 1; return cache[k];
    };
    var NF = [];
    for (var i = 0; i < F.length; i++) {
      var a = F[i][0], b = F[i][1], c = F[i][2];
      var ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    F = NF;
  }
  var seen = {}, edges = [];
  for (var f = 0; f < F.length; f++) for (var k = 0; k < 3; k++) {
    var p = F[f][k], q = F[f][(k + 1) % 3], key = p < q ? p + '_' + q : q + '_' + p;
    if (!seen[key]) { seen[key] = 1; edges.push([p, q]); }
  }
  return { V: V, F: F, edges: edges };
}

var CITIES = {
  delhi: [77.21, 28.61], mumbai: [72.88, 19.08], kolkata: [88.36, 22.57], chennai: [80.27, 13.08],
  bengaluru: [77.59, 12.97], hyderabad: [78.49, 17.39], siliguri: [88.43, 26.72]
};
var LINKS = [['delhi', 'mumbai'], ['delhi', 'kolkata'], ['delhi', 'hyderabad'], ['mumbai', 'bengaluru'],
  ['hyderabad', 'chennai'], ['bengaluru', 'chennai'], ['kolkata', 'chennai'], ['kolkata', 'siliguri']];

function createGlobe(data, makeCanvas, overrides) {
  var landFlat = Array.isArray(data) ? data : data.points;
  var indiaIdx = Array.isArray(data) ? null : data.india;
  var T = {}; for (var k0 in TUNING) T[k0] = TUNING[k0];
  if (overrides) for (var k1 in overrides) T[k1] = overrides[k1];
  var n = landFlat.length / 2;
  var bx = new Float32Array(n), by = new Float32Array(n), bz = new Float32Array(n);
  var ph = new Float32Array(n), hot = new Uint8Array(n), idist = new Float32Array(n);
  var rnd = rng(11), IND = unit(T.INDIA_LON, T.INDIA_LAT), isInd = new Uint8Array(n);
  if (indiaIdx) for (var q0 = 0; q0 < indiaIdx.length; q0++) isInd[indiaIdx[q0]] = 1;
  for (var i = 0; i < n; i++) {
    var v = unit(landFlat[2 * i], landFlat[2 * i + 1]);
    bx[i] = v[0]; by[i] = v[1]; bz[i] = v[2]; ph[i] = rnd(); hot[i] = rnd() < 0.09 ? 1 : 0;
    idist[i] = Math.acos(clamp(dot(v, IND), -1, 1)) / DEG;
    if (!indiaIdx && idist[i] < T.INDIA_RADIUS_DEG) isInd[i] = 1;
  }
  var sr = rng(5), stars = [];
  for (var s = 0; s < 260; s++) stars.push({ x: sr(), y: sr() * 0.85, r: 0.4 + sr() * 1.1, ph: sr() * TAU, sp: 0.6 + sr() * 1.6, g: sr() < 0.09 });

  var ico = buildIco(1), NV = ico.V.length;
  var vX = new Float32Array(NV), vY = new Float32Array(NV), vZ = new Float32Array(NV), vSX = new Float32Array(NV), vSY = new Float32Array(NV);
  var EDGE_SEG = 12, edgePts = ico.edges.map(function (e) {
    var a = ico.V[e[0]], b = ico.V[e[1]], arr = [];
    for (var j = 0; j <= EDGE_SEG; j++) { var p = slerp(a, b, j / EDGE_SEG); arr.push([p[0] * 1.004, p[1] * 1.004, p[2] * 1.004]); }
    return arr;
  });
  var glintIdx = [3, 9, 14, 20, 27, 33, 38];

  var cityU = {}; for (var c in CITIES) cityU[c] = unit(CITIES[c][0], CITIES[c][1]);
  var arcs = LINKS.map(function (l, idx) {
    var a = cityU[l[0]], b = cityU[l[1]], w = Math.acos(clamp(dot(a, b), -1, 1)), lift = 0.2 * w, pts = [];
    for (var j = 0; j <= 28; j++) { var u = j / 28, p = slerp(a, b, u), r = 1.003 + lift * Math.sin(Math.PI * u); pts.push([p[0] * r, p[1] * r, p[2] * r]); }
    return { pts: pts, off: idx * 0.37 };
  });
  var e1 = normv([IND[2], 0, -IND[0]]), e2 = [IND[1] * e1[2] - IND[2] * e1[1], IND[2] * e1[0] - IND[0] * e1[2], IND[0] * e1[1] - IND[1] * e1[0]];

  var L = 12, NB = 3 * L, bufs = []; for (var bi = 0; bi < NB; bi++) bufs.push(new Float32Array(n * 3));
  var counts = new Int32Array(NB);
  var spriteCache = {};
  function sprite(key, col) {
    if (spriteCache[key]) return spriteCache[key];
    var cv = makeCanvas(64, 64), g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.22, rgba(col, 0.55)); gr.addColorStop(0.55, rgba(col, 0.14)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); spriteCache[key] = cv; return cv;
  }

  var cL, sL, cP, sP, RX, RY, RZ;
  function rot(x, y, z) {
    var xp = x * cL - z * sL, zp = x * sL + z * cL;
    RX = xp; RY = y * cP - zp * sP; RZ = y * sP + zp * cP;
  }

  function draw(ctx, W, H, t, themeName, text) {
    var th = THEMES[themeName] || THEMES.violet;
    var R = Math.max(W * T.RADIUS_W, H * T.RADIUS_H), cx = W / 2, cy = H * T.CENTER_Y, rs = clamp(R / 560, 0.65, 1.25);
    var lam = (T.INDIA_LON + T.SWING_DEG * clamp(W / 900, 0.3, 1) * Math.sin(TAU * t / T.SWING_SECONDS)) * DEG, phi = T.TILT_DEG * DEG;
    cL = Math.cos(lam); sL = Math.sin(lam); cP = Math.cos(phi); sP = Math.sin(phi);
    var breath = 0.84 + 0.16 * Math.sin(TAU * t / T.RIM_BREATH_SECONDS);

    function dimAt(x, y) {
      if (!text) return 1;
      var dx = (x - text.cx) / (text.w * 0.5), dy = (y - text.cy) / (text.h * 0.5);
      return T.DIM_MIN + (1 - T.DIM_MIN) * smooth(0.75, 1.35, Math.sqrt(dx * dx + dy * dy));
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);

    var si, st;
    for (si = 0; si < stars.length; si++) {
      st = stars[si];
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph)), sx0 = st.x * W, sy0 = st.y * H;
      ctx.fillStyle = rgba(th.star, tw * 0.9);
      ctx.beginPath(); ctx.arc(sx0, sy0, st.r * (st.g ? 1.3 : 1), 0, TAU); ctx.fill();
      if (st.g) {
        var gl = (2.5 + 3.5 * tw) * rs; ctx.strokeStyle = rgba(th.star, tw * 0.55); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sx0 - gl, sy0); ctx.lineTo(sx0 + gl, sy0); ctx.moveTo(sx0, sy0 - gl); ctx.lineTo(sx0, sy0 + gl); ctx.stroke();
      }
    }

    var g1 = ctx.createRadialGradient(cx, cy, R * 0.985, cx, cy, R * 1.17);
    g1.addColorStop(0, rgba(th.rim, 0.7 * breath)); g1.addColorStop(0.16, rgba(th.rim, 0.3 * breath)); g1.addColorStop(1, rgba(th.rim, 0));
    ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx, cy, R * 1.17, 0, TAU); ctx.arc(cx, cy, R * 0.985, 0, TAU, true); ctx.fill();

    ctx.fillStyle = th.bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    var g2 = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    g2.addColorStop(0, rgba(th.glow, 0)); g2.addColorStop(0.7, rgba(th.glow, 0.12)); g2.addColorStop(1, rgba(th.glow, 0.55));
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    var g3 = ctx.createRadialGradient(cx, cy - R * 0.86, 0, cx, cy - R * 0.86, R * 0.62);
    g3.addColorStop(0, rgba(th.rimBright, 0.2)); g3.addColorStop(1, rgba(th.rimBright, 0));
    ctx.fillStyle = g3; ctx.fillRect(cx - R, cy - R, 2 * R, 1.3 * R);

    var v;
    for (v = 0; v < NV; v++) {
      rot(ico.V[v][0], ico.V[v][1], ico.V[v][2]);
      vX[v] = RX; vY[v] = RY; vZ[v] = RZ; vSX[v] = cx + R * RX; vSY[v] = cy - R * RY;
    }
    var fi, F;
    for (fi = 0; fi < ico.F.length; fi++) {
      F = ico.F[fi];
      var zm = (vZ[F[0]] + vZ[F[1]] + vZ[F[2]]) / 3;
      if (zm < 0.12) continue;
      var fa = (0.012 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.7 + fi * 2.3))) * Math.min(1, zm * 1.4);
      ctx.fillStyle = rgba(th.glow, fa);
      ctx.beginPath(); ctx.moveTo(vSX[F[0]], vSY[F[0]]); ctx.lineTo(vSX[F[1]], vSY[F[1]]); ctx.lineTo(vSX[F[2]], vSY[F[2]]); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    ctx.lineWidth = Math.max(0.8, rs * 1.05);
    var ei, ep, j, pa, pb;
    for (ei = 0; ei < edgePts.length; ei++) {
      ep = edgePts[ei];
      var prevOK = false, px0 = 0, py0 = 0, pz0 = 0;
      for (j = 0; j <= EDGE_SEG; j++) {
        rot(ep[j][0], ep[j][1], ep[j][2]);
        var ok = RZ > 0.02, sx1 = cx + R * RX, sy1 = cy - R * RY;
        if (ok && prevOK) {
          var zz = (RZ + pz0) / 2, aa = (0.2 + 0.28 * Math.pow(1 - zz, 0.8)) * dimAt(sx1, sy1) * Math.min(1, zz * 3);
          ctx.strokeStyle = rgba(th.line, aa);
          ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(sx1, sy1); ctx.stroke();
        }
        prevOK = ok; px0 = sx1; py0 = sy1; pz0 = RZ;
      }
    }

    var b;
    for (b = 0; b < NB; b++) counts[b] = 0;
    var dotC = 0.62 * rs, dotK = 0.85 * rs, ripR = T.INDIA_RADIUS_DEG;
    for (i = 0; i < n; i++) {
      rot(bx[i], by[i], bz[i]);
      if (RZ <= 0.03) continue;
      var sx = cx + R * RX, sy = cy - R * RY;
      if (sx < -6 || sx > W + 6 || sy < -6 || sy > H + 6) continue;
      var z = RZ, ci = 0, a = (0.5 + 0.5 * Math.pow(z, 0.5)) * (0.8 + 0.2 * Math.sin(t * 1.4 + ph[i] * TAU)), rad = dotC + dotK * z;
      if (hot[i]) { ci = 1; a = Math.min(1, a * 1.3); }
      var d = idist[i];
      if (isInd[i]) {
        ci = 2; var rip = 0.5 + 0.5 * Math.sin(d * 0.5 - t * T.RIPPLE_SPEED);
        a = 0.74 + 0.26 * rip; rad *= 1.25 + 0.22 * rip;
      }
      var dm = dimAt(sx, sy); if (ci === 2) dm = 0.5 + 0.5 * dm;
      a *= dm * Math.min(1, z / 0.16 + 0.1);
      var lvl = Math.min(L - 1, (a * L) | 0), bk = ci * L + lvl, o = counts[bk] * 3;
      var buf = bufs[bk]; buf[o] = sx; buf[o + 1] = sy; buf[o + 2] = rad; counts[bk]++;
    }
    var cols = [th.dot, th.dotHot, th.india];
    for (b = 0; b < NB; b++) {
      var cnt = counts[b]; if (!cnt) continue;
      var cc = (b / L) | 0, lv = b % L, bb = bufs[b];
      ctx.fillStyle = rgba(cols[cc], (lv + 1) / L);
      ctx.beginPath();
      for (j = 0; j < cnt; j++) { var q = j * 3; ctx.moveTo(bb[q] + bb[q + 2], bb[q + 1]); ctx.arc(bb[q], bb[q + 1], bb[q + 2], 0, TAU); }
      ctx.fill();
    }

    var nodeS = sprite(themeName + 'n', th.node), gi;
    for (v = 0; v < NV; v++) {
      if (vZ[v] < 0.06) continue;
      var nd = dimAt(vSX[v], vSY[v]), pulse = 0.55 + 0.45 * Math.sin(t * 1.1 + v * 1.9);
      ctx.globalAlpha = Math.min(1, 0.85 * nd * pulse * Math.min(1, vZ[v] * 3));
      var ns = 17 * rs; ctx.drawImage(nodeS, vSX[v] - ns, vSY[v] - ns, ns * 2, ns * 2);
    }
    ctx.globalAlpha = 1;
    for (gi = 0; gi < glintIdx.length; gi++) {
      v = glintIdx[gi]; if (v >= NV || vZ[v] < 0.1) continue;
      var gp = 0.5 + 0.5 * Math.sin(t * 1.6 + gi * 2.1), gl2 = (3 + 8 * gp) * rs, ga = (0.25 + 0.6 * gp) * dimAt(vSX[v], vSY[v]);
      ctx.strokeStyle = rgba(th.node, ga); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(vSX[v] - gl2, vSY[v]); ctx.lineTo(vSX[v] + gl2, vSY[v]); ctx.moveTo(vSX[v], vSY[v] - gl2); ctx.lineTo(vSX[v], vSY[v] + gl2); ctx.stroke();
    }

    var indS = sprite(themeName + 'i', th.india), arcCol = th.arc, ai, ar, hp;
    ctx.lineCap = 'round';
    for (ai = 0; ai < arcs.length; ai++) {
      ar = arcs[ai].pts;
      var head = ((t * 0.2 + arcs[ai].off) % 1.35), segsX = [], segsY = [], segsZ = [];
      for (j = 0; j < ar.length; j++) { rot(ar[j][0], ar[j][1], ar[j][2]); segsX.push(cx + R * RX); segsY.push(cy - R * RY); segsZ.push(RZ); }
      ctx.strokeStyle = rgba(arcCol, 0.5); ctx.lineWidth = 1.3 * rs;
      ctx.beginPath();
      for (j = 1; j < ar.length; j++) if (segsZ[j] > 0.05 && segsZ[j - 1] > 0.05) { ctx.moveTo(segsX[j - 1], segsY[j - 1]); ctx.lineTo(segsX[j], segsY[j]); }
      ctx.stroke();
      for (j = 1; j < ar.length; j++) {
        var u = j / (ar.length - 1), dh = head - u;
        if (dh < 0 || dh > 0.24 || segsZ[j] < 0.05 || segsZ[j - 1] < 0.05) continue;
        ctx.strokeStyle = rgba(arcCol, 0.95 * (1 - dh / 0.24)); ctx.lineWidth = 2.1 * rs;
        ctx.beginPath(); ctx.moveTo(segsX[j - 1], segsY[j - 1]); ctx.lineTo(segsX[j], segsY[j]); ctx.stroke();
      }
      hp = Math.min(ar.length - 1, Math.max(0, Math.round(head * (ar.length - 1))));
      if (head <= 1 && segsZ[hp] > 0.05) { var hs = 12 * rs; ctx.globalAlpha = 0.95; ctx.drawImage(indS, segsX[hp] - hs, segsY[hp] - hs, hs * 2, hs * 2); ctx.globalAlpha = 1; }
    }
    var cname;
    for (cname in CITIES) {
      var cu = cityU[cname]; rot(cu[0] * 1.004, cu[1] * 1.004, cu[2] * 1.004);
      if (RZ < 0.05) continue;
      var csx = cx + R * RX, csy = cy - R * RY, big = cname === 'siliguri', cp = 0.7 + 0.3 * Math.sin(t * 2.2 + CITIES[cname][0]);
      var cs = (big ? 22 : 14) * rs * cp; ctx.globalAlpha = 0.9; ctx.drawImage(indS, csx - cs, csy - cs, cs * 2, cs * 2); ctx.globalAlpha = 1;
      ctx.fillStyle = rgba([255, 255, 255], 1); ctx.beginPath(); ctx.arc(csx, csy, (big ? 2.8 : 2.1) * rs, 0, TAU); ctx.fill();
    }
    var ringI, rp, ra, k2, th2, prevR = false, rx0 = 0, ry0 = 0;
    for (ringI = 0; ringI < 2; ringI++) {
      rp = ((t / 3.4) + ringI * 0.5) % 1; ra = (2 + 7 * rp) * DEG;
      ctx.strokeStyle = rgba(th.india, 0.85 * (1 - rp) * (1 - rp)); ctx.lineWidth = 1.6 * rs;
      ctx.beginPath(); prevR = false;
      for (k2 = 0; k2 <= 64; k2++) {
        th2 = k2 / 64 * TAU; var cr = Math.cos(ra), sr2 = Math.sin(ra);
        var qx = IND[0] * cr + (e1[0] * Math.cos(th2) + e2[0] * Math.sin(th2)) * sr2, qy = IND[1] * cr + (e1[1] * Math.cos(th2) + e2[1] * Math.sin(th2)) * sr2, qz = IND[2] * cr + (e1[2] * Math.cos(th2) + e2[2] * Math.sin(th2)) * sr2;
        rot(qx, qy, qz);
        var rx = cx + R * RX, ry = cy - R * RY, rok = RZ > 0.03;
        if (rok && prevR) { ctx.moveTo(rx0, ry0); ctx.lineTo(rx, ry); }
        prevR = rok; rx0 = rx; ry0 = ry;
      }
      ctx.stroke();
    }

    var lg = ctx.createLinearGradient(0, cy - R, 0, cy + R * 0.25);
    lg.addColorStop(0, rgba(th.rimBright, 1)); lg.addColorStop(0.5, rgba(th.rim, 0.65)); lg.addColorStop(1, rgba(th.rim, 0.3));
    var rw = [[26, 0.08], [13, 0.15], [5.5, 0.38], [2.2, 1]], rwi;
    ctx.strokeStyle = lg;
    for (rwi = 0; rwi < rw.length; rwi++) {
      ctx.lineWidth = rw[rwi][0] * rs; ctx.globalAlpha = rw[rwi][1] * breath;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var OR = R * T.ORBIT_R, oT = T.ORBIT_TILT_DEG * DEG, oRo = T.ORBIT_ROLL_DEG * DEG, cRo = Math.cos(oRo), sRo = Math.sin(oRo), sT = Math.sin(oT), cT = Math.cos(oT);
    function orbitPt(ang) {
      var x = OR * Math.cos(ang), y = OR * Math.sin(ang) * sT, z = OR * Math.sin(ang) * cT;
      return [cx + x * cRo - y * sRo, cy - (x * sRo + y * cRo), z, Math.hypot(x * cRo - y * sRo, x * sRo + y * cRo)];
    }
    function visible(p) { return p[2] > 0 || p[3] > R; }
    var front = [], back = [], as, p0 = orbitPt(0), p1, aStep = 2 * DEG;
    ctx.beginPath();
    var seg = [];
    for (as = aStep; as <= TAU + 0.0001; as += aStep) {
      p1 = orbitPt(as);
      if (visible(p0) && visible(p1)) seg.push([p0, p1]);
      p0 = p1;
    }
    var orbitLayers = [[6, 0.05], [3, 0.1], [1.2, 0.5]], ol, sg;
    for (ol = 0; ol < orbitLayers.length; ol++) {
      ctx.lineWidth = orbitLayers[ol][0] * rs; ctx.strokeStyle = rgba(th.rimBright, orbitLayers[ol][1]);
      ctx.beginPath();
      for (sg = 0; sg < seg.length; sg++) { ctx.moveTo(seg[sg][0][0], seg[sg][0][1]); ctx.lineTo(seg[sg][1][0], seg[sg][1][1]); }
      ctx.stroke();
    }
    var sat = TAU * ((t / T.ORBIT_SECONDS) % 1) + 3.5, tail, tp, tq = orbitPt(sat);
    for (tail = 1; tail <= 22; tail++) {
      tp = orbitPt(sat - tail * 1.6 * DEG);
      if (visible(tp) && visible(tq)) {
        ctx.strokeStyle = rgba(th.rimBright, 0.9 * (1 - tail / 23)); ctx.lineWidth = (3.2 - tail * 0.12) * rs;
        ctx.beginPath(); ctx.moveTo(tq[0], tq[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
      }
      tq = tp;
    }
    var sp = orbitPt(sat);
    if (visible(sp)) {
      var ss = 30 * rs, satS = sprite(themeName + 's', th.rimBright);
      ctx.globalAlpha = 0.95; ctx.drawImage(satS, sp[0] - ss, sp[1] - ss, ss * 2, ss * 2); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(sp[0], sp[1], 3.4 * rs, 0, TAU); ctx.fill();
    }
  }

  return { draw: draw, themes: THEMES, tuning: T };
}

export { createGlobe, THEMES, TUNING };
