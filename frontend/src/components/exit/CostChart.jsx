import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCurve } from '../../lib/exit/model.js';
import { fmtDate, inr } from '../../lib/exit/format.js';
import useExitText from '../../hooks/useExitText.js';

const FF = 'Plus Jakarta Sans,Noto Sans Devanagari,sans-serif';

// Width and height of an element, kept up to date.
function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    read();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// The pink "Day 200" pill above the marker line.
function DayPill({ x, W, pr, pl, text }) {
  const pw2 = text.length * 7.2 + 24;
  const px = Math.min(W - pr - pw2 / 2, Math.max(pl + pw2 / 2, x));
  return (
    <>
      <rect x={(px - pw2 / 2).toFixed(1)} y="4" width={pw2.toFixed(1)} height="26" rx="13" fill="#FF2D8A" />
      <text x={px.toFixed(1)} y="21.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily={FF}>{text}</text>
    </>
  );
}

// ELSS: how far through the 3-year lock-in you are.
function LockChart({ x, W, H }) {
  const { L } = useExitText();
  const { s, v } = x;
  const pl = 14;
  const pr = 14;
  const pw = W - pl - pr;
  const daysNum = Math.max(0, Number(s.days) || 0);
  const remNum = Math.max(0, Number(v?.rem) || 0);
  const total = daysNum + remNum || 1095;
  const totalFmt = total.toLocaleString('en-US');
  const frac = Math.min(1, daysNum / total);
  const bt = Math.max(100, Math.round(H * 0.34));
  const bh = 40;
  const bb = bt + bh;
  const mx = +(pl + frac * pw).toFixed(1);
  const free = L(`Free to sell from ${fmtDate(v.unlockD, false)}`, `बेचने की छूट ${fmtDate(v.unlockD, true)} से`);
  const ticks = [[0, L('Day 0', 'दिन 0')], [1, L('1 yr', '1 वर्ष')], [2, L('2 yr', '2 वर्ष')], [3, L('3 yr', '3 वर्ष')]];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={L(`ELSS lock-in progress: day ${s.days} of ${totalFmt}. ${v.rem} ${v.rem === 1 ? 'day' : 'days'} to go.`, `ELSS लॉक-इन की प्रगति: दिन ${s.days} / ${totalFmt}। ${v.rem} दिन बाकी।`)}>
      <defs>
        <linearGradient id="ex-grad-lock" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFB3A5" stopOpacity=".45" />
          <stop offset="1" stopColor="#FFB3A5" stopOpacity=".95" />
        </linearGradient>
      </defs>
      <rect x={pl} y={bt} width={pw} height={bh} rx="20" fill="rgba(255,255,255,.1)" />
      {mx - pl > 1 && <rect x={pl} y={bt} width={(mx - pl).toFixed(1)} height={bh} rx="20" fill="url(#ex-grad-lock)" />}
      {[1, 2].map((i) => {
        const lx = (pl + (i / 3) * pw).toFixed(1);
        return <line key={i} x1={lx} y1={bt} x2={lx} y2={bb} stroke="rgba(255,255,255,.35)" strokeDasharray="3 4" />;
      })}
      <circle cx={W - pr - 20} cy={bt + bh / 2} r="7" fill="#8CF2C0" />
      <line x1={mx} y1="30" x2={mx} y2={bb + 8} stroke="#fff" strokeWidth="2" />
      <circle cx={mx} cy={bt + bh / 2} r="6.5" fill="#fff" stroke="#FF2D8A" strokeWidth="3" />
      <DayPill x={mx} W={W} pl={pl} pr={pr} text={L(`Day ${s.days}`, `दिन ${s.days}`)} />
      {ticks.map(([i, label]) => {
        const tx = pl + (i / 3) * pw;
        const last = i === 3;
        return (
          <g key={i}>
            {i > 0 && i < 3 && <line x1={tx.toFixed(1)} y1={bb} x2={tx.toFixed(1)} y2={bb + 5} stroke="rgba(255,255,255,.5)" />}
            <text x={tx.toFixed(1)} y={bb + 24} textAnchor={i === 0 ? 'start' : last ? 'end' : 'middle'} fontSize="11" fontWeight={last ? 800 : 500} fill={last ? '#fff' : '#CDB6EE'} fontFamily={FF}>{label}</text>
          </g>
        );
      })}
      <text x={W - pr} y={bb + 72} textAnchor="end" fontSize="15" fontWeight="800" fill="#8CF2C0" fontFamily={FF}>{free}</text>
    </svg>
  );
}

// Cost of selling by day: coral before the gate, mint after it. Drag to try another day.
function CurveChart({ x, W, H, ghost }) {
  const { L } = useExitText();
  const { s, v, now } = x;
  const { T, xmax, eq: eqc } = v;
  const pl = 10;
  const pr = 10;
  const pt = 78;
  const pb = 36;
  const pw = W - pl - pr;
  const ph = H - pt - pb;
  const base = pt + ph;

  // the curve does not depend on the days held, so it is only redrawn when the amounts or settings change
  const k = v.inp;
  const curve = useMemo(
    () => buildCurve(v.inp, v, now, ghost),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k.investment_type, k.fund_category, k.amount_invested, k.current_value, k.exit_load_pct, k.applicable_slab_rate_pct, ghost, now],
  );
  const { pts, nS, ymax, cost } = curve;

  const X = (val) => +(pl + (val / xmax) * pw).toFixed(1);
  const Y = (val) => +(pt + ph - (val / ymax) * ph).toFixed(1);
  const coralV = cost(Math.min(s.days, T - 1));
  const mintV = cost(T + 1);
  const dotV = s.days <= T ? cost(Math.min(s.days, T - 1)) : cost(s.days);
  const left = pts.slice(0, nS);
  const right = pts.slice(nS);
  const area = (arr, x0, x1) => {
    let d = `M ${X(x0)} ${base}`;
    arr.forEach((p) => { d += ` L ${X(p[0])} ${Y(p[1])}`; });
    return `${d} L ${X(x1)} ${base} Z`;
  };
  let line = '';
  pts.forEach((p, i) => { line += `${i ? ' L ' : 'M '}${X(p[0])} ${Y(p[1])}`; });
  const gx = X(T);
  const mx = X(Math.min(s.days, xmax));
  const fs = W < 520 ? 18 : 22;

  const span = (val, sub) => Math.max(String(inr(val)).length * fs * 0.62, String(sub).length * 6.2) + 8;
  const cSub = eqc ? L('Sell before the gate', 'सीमा से पहले बेचें') : L('Bought after Apr 2023', 'अप्रैल 2023 के बाद ख़रीदा');
  const mSub = eqc ? L('Sell after', 'सीमा के बाद बेचें') : L('Bought before Apr 2023', 'अप्रैल 2023 से पहले ख़रीदा');
  const cw = span(coralV, cSub);
  let cx = pl + 2;
  let ca = 'start';
  // keep the two labels clear of the white day marker
  if (mx > cx - 6 && mx < cx + cw) {
    const rx = gx - 8;
    if (!(mx > rx - cw && mx < rx + 6)) { cx = rx; ca = 'end'; }
  }
  const mw = span(mintV, mSub);
  let mX = gx + 8;
  let ma = 'start';
  if (mx > mX - 6 && mx < mX + mw) {
    if (!(mx > W - pr - mw && mx < W - pr + 6)) { mX = W - pr; ma = 'end'; }
  }

  const label = (lx, val, sub, col, anchor0) => {
    let anchor = anchor0;
    let px = lx;
    const y = Y(val) - 10;
    const w = Math.max(String(inr(val)).length * fs * 0.62, String(sub).length * 6.2);
    if (anchor === 'start' && px + w > W - pr) { anchor = 'end'; px = W - pr; }
    const common = { paintOrder: 'stroke', stroke: '#2A0A52', strokeWidth: 4, strokeLinejoin: 'round', textAnchor: anchor, fontFamily: FF };
    return (
      <>
        <text x={px} y={y - fs - 6 + (fs === 18 ? 2 : 0)} fontSize="11" fontWeight="600" fill="#E6D3FA" {...common}>{sub}</text>
        <text x={px} y={y} fontSize={fs} fontWeight="800" fill={col} {...common} style={{ fontVariantNumeric: 'tabular-nums' }}>{inr(val)}</text>
      </>
    );
  };

  const ticks = [];
  if (!eqc) {
    ticks.push([365, L('1 yr', '1 वर्ष')], [730, L('2 yr', '2 वर्ष')], [T, L('1 Apr 2023', '1 अप्रैल 2023')]);
  } else {
    [['3m', '3 माह'], ['6m', '6 माह'], ['9m', '9 माह'], ['1 yr', '1 वर्ष']].forEach((tk, j) => ticks.push([(T / 4) * (j + 1), L(tk[0], tk[1])]));
  }
  const mh = base - Y(mintV);
  const aria = eqc
    ? L(`Cost of selling by day. Before day ${T} it is ${inr(coralV)}. After it is ${inr(mintV)}.`, `दिन के हिसाब से बेचने की लागत। दिन ${T} से पहले ${inr(coralV)}। उसके बाद ${inr(mintV)}।`)
    : L(`Cost of selling by days held. Bought on or after 1 April 2023: ${inr(coralV)}. Bought before: ${inr(mintV)}.`, `रखे गए दिनों के हिसाब से बेचने की लागत। 1 अप्रैल 2023 या उसके बाद ख़रीदा: ${inr(coralV)}। उससे पहले: ${inr(mintV)}।`);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
      <defs>
        <linearGradient id="ex-grad-cost" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB3A5" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFB3A5" stopOpacity=".28" />
        </linearGradient>
        <linearGradient id="ex-grad-mint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8CF2C0" stopOpacity=".95" />
          <stop offset="1" stopColor="#8CF2C0" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <path d={area(left, 0, T)} fill="url(#ex-grad-cost)" />
      {mh < 4
        ? <rect x={gx} y={base - 4} width={X(xmax) - gx} height="4" fill="#8CF2C0" />
        : <path d={area(right, T, xmax)} fill="url(#ex-grad-mint)" />}
      <line x1={pl} y1={base} x2={W - pr} y2={base} stroke="rgba(255,255,255,.35)" />
      <line x1={gx} y1={pt - 14} x2={gx} y2={base} stroke="#fff" strokeOpacity=".7" strokeDasharray="4 4" />
      <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {!ghost && (
        <>
          <line x1={mx} y1="30" x2={mx} y2={base} stroke="#fff" strokeWidth="2" />
          <circle cx={mx} cy={Y(dotV)} r="6.5" fill="#fff" stroke="#FF2D8A" strokeWidth="3" />
          {label(cx, coralV, cSub, '#FFB3A5', ca)}
          {label(mX, mintV, mSub, '#8CF2C0', ma)}
          <DayPill x={mx} W={W} pl={pl} pr={pr} text={L(`Day ${s.days}`, `दिन ${s.days}`)} />
        </>
      )}
      <text x={pl} y={base + 22} fontSize="11" fill="#CDB6EE" fontFamily={FF}>{W < 520 ? '0' : L('Day 0', 'दिन 0')}</text>
      {ticks.map((tk, j) => {
        const last = j === ticks.length - 1;
        const tx = X(tk[0]);
        return (
          <g key={tk[0]}>
            <line x1={tx} y1={base} x2={tx} y2={base + 5} stroke="rgba(255,255,255,.5)" />
            <text x={tx} y={base + 22} textAnchor="middle" fontSize="11" fontWeight={last ? 800 : 500} fill={last ? '#fff' : '#CDB6EE'} fontFamily={FF}>
              {tk[1]}{last && eqc ? L(' gate', ' सीमा') : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// The deep purple panel: "What selling costs, by day" (or the ELSS lock-in progress), with a draggable day marker.
export default function CostChart({ x }) {
  const { t, L } = useExitText();
  const { s, v } = x;
  const boxRef = useRef(null);
  const dragging = useRef(false);
  const { w, h } = useSize(boxRef);
  const W = Math.max(200, w);
  const H = Math.max(262, h);
  const ghost = v.empty; // blank amounts: a dimmed sample shape
  const locked = v.lockUI;
  const still = ghost || locked; // no dragging

  const dayAt = (e) => {
    const rc = boxRef.current.getBoundingClientRect();
    const d = Math.round(((e.clientX - rc.left - 10) / (rc.width - 20)) * v.xmax);
    return Math.max(0, Math.min(v.xmax, d));
  };
  const onDown = (e) => {
    if (still) return;
    dragging.current = true;
    x.setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* not needed on every browser */ }
    x.setDays(dayAt(e));
  };
  const onMove = (e) => { if (dragging.current) x.setDays(dayAt(e)); };
  const onEnd = () => {
    if (dragging.current) {
      dragging.current = false;
      x.setDragging(false);
    }
  };
  const onKey = (e) => {
    if (still) return;
    const st = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') x.setDays(Math.max(0, s.days - st));
    else if (e.key === 'ArrowRight') x.setDays(Math.min(v.xmax, s.days + st));
    else return;
    e.preventDefault();
  };

  const cls = `ex-panel ex-deep ex-chart${ghost ? ' ex-sample' : ''}${locked ? ' ex-locked' : ''}`;
  return (
    <section className={cls} aria-labelledby="ex-chh">
      <div>
        <h3 id="ex-chh">{locked ? t('Lock-in progress') : t('What selling costs, by day')}</h3>
        <p className="ex-sub">{locked ? t('ELSS units cannot be sold until the 3 years are over.') : t("Tax plus exit load, if your fund's value stays flat.")}</p>
      </div>
      <div
        ref={boxRef}
        className="ex-chart-box"
        role="slider"
        tabIndex={still ? -1 : 0}
        aria-hidden={still ? 'true' : undefined}
        aria-label={L('Days held', 'रखे गए दिन')}
        aria-valuemin={0}
        aria-valuemax={v.xmax}
        aria-valuenow={s.days}
        aria-valuetext={L(`Day ${s.days}`, `दिन ${s.days}`)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onKeyDown={onKey}
      >
        {w > 0 && (locked ? <LockChart x={x} W={W} H={H} /> : <CurveChart x={x} W={W} H={H} ghost={ghost} />)}
      </div>
      {!ghost && !locked && <p className="ex-chint">{t('Drag across the chart to try another day.')}</p>}
      {ghost && <p className="ex-chint">{t('Sample shape only. Your own amounts will draw the real chart.')}</p>}
    </section>
  );
}
