import { useLayoutEffect, useRef, useState } from 'react';
import { fvAt } from '../../lib/whatif/healthScore.js';
import { compact } from '../../lib/whatif/format.js';
import { useLang, useT } from '../../hooks/useLang.js';

const PAD = { l: 6, r: 6, t: 26, b: 26 };

// 5-year chart: SIP corpus, amount invested, cumulative loan interest. Hover or touch shows a tooltip.
export default function WealthChart({ d }) {
  const lang = useLang();
  const t = useT();
  const boxRef = useRef(null);
  const svgRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState({ m: 0, on: false });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(el.clientWidth || 640);
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const w = width;
  const h = w < 500 ? 210 : 250;
  const maxY = Math.max(d.fv, d.inv, d.drag * 5) * 1.1 || 1;
  const iw = w - PAD.l - PAD.r;
  const ih = h - PAD.t - PAD.b;
  const X = (m) => PAD.l + (iw * m) / 60;
  const Y = (v) => PAD.t + ih * (1 - v / maxY);

  const pts = [];
  for (let m = 0; m <= 60; m += 1) pts.push([X(m), Y(fvAt(d.P, m))]);
  const corpus = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = corpus + ' L' + X(60).toFixed(1) + ' ' + Y(0).toFixed(1) + ' L' + X(0).toFixed(1) + ' ' + Y(0).toFixed(1) + ' Z';
  const invPath = 'M' + X(0) + ' ' + Y(0) + ' L' + X(60).toFixed(1) + ' ' + Y(d.inv).toFixed(1);
  const dragPath = 'M' + X(0) + ' ' + Y(0) + ' L' + X(60).toFixed(1) + ' ' + Y(d.drag * 5).toFixed(1);

  const onMove = (ev) => {
    const r = svgRef.current.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const rel = ((cx - r.left) / r.width) * w;
    const m = Math.max(0, Math.min(60, Math.round(((rel - PAD.l) / iw) * 60)));
    setHover({ m, on: true });
  };
  const onLeave = () => setHover((s) => ({ ...s, on: false }));

  const m = hover.m;
  const hx = X(m);
  const corpusAt = fvAt(d.P, m);
  const investedAt = d.P * m;
  const interestAt = (d.drag * m) / 12;
  const tw = 170;
  const px = hx;
  const tipLeft = Math.max(0, Math.min(w - tw, px + 14 > w - tw ? px - tw - 14 : px + 14));

  return (
    <>
      <div className="wi-chart" ref={boxRef}>
        <svg
          ref={svgRef}
          viewBox={'0 0 ' + w + ' ' + h}
          role="img"
          aria-label={t('Chart of SIP corpus, amount invested and cumulative loan interest over 5 years')}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wi-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F6F3EC" stopOpacity=".34" />
              <stop offset="1" stopColor="#F6F3EC" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => {
            const y = Y((maxY * g) / 1.1);
            return <line key={g} x1={PAD.l} x2={w - PAD.r} y1={y.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(255,255,255,.07)" />;
          })}
          <path d={area} fill="url(#wi-area-grad)" />
          <path d={invPath} fill="none" stroke="#8E95A3" strokeWidth="2" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
          <path d={dragPath} fill="none" stroke="#FF8A7A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d={corpus} fill="none" stroke="#F6F3EC" strokeWidth="3.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={X(60).toFixed(1)} cy={Y(d.fv).toFixed(1)} r="6" fill="#F6F3EC" stroke="#10131A" strokeWidth="3" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <text key={i} x={X(i * 12).toFixed(1)} y={h - 6} fill="#8E95A3" fontSize="11" textAnchor={i === 0 ? 'start' : i === 5 ? 'end' : 'middle'}>
              {i === 0 ? t('Now') : t('Year ') + i}
            </text>
          ))}
          <g style={{ display: hover.on ? '' : 'none' }}>
            <line x1={hx} x2={hx} y1={PAD.t} y2={h - PAD.b} stroke="rgba(255,255,255,.35)" />
            <circle cx={hx} cy={Y(corpusAt)} r="5" fill="#F6F3EC" />
            <circle cx={hx} cy={Y(investedAt)} r="4" fill="#8E95A3" />
            <circle cx={hx} cy={Y(interestAt)} r="4" fill="#FF8A7A" />
          </g>
          <rect x="0" y="0" width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} />
        </svg>
        <div className={'wi-tip' + (hover.on ? ' on' : '')} style={{ left: tipLeft + 'px' }} aria-hidden="true">
          <div className="t">{m === 0 ? t('Today') : t('Month ') + m}</div>
          {t('SIP corpus')} <b>{compact(corpusAt, lang)}</b>
          <br />
          {t('Invested')} <b>{compact(investedAt, lang)}</b>
          <br />
          {t('Loan interest')} <b style={{ color: '#FF8A7A' }}>{compact(interestAt, lang)}</b>
        </div>
      </div>
      <div className="wi-leg">
        <span style={{ '--c': '#F6F3EC' }}><i />{t('SIP corpus')}</span>
        <span style={{ '--c': '#8E95A3' }}><i className="dash" />{t('Amount invested')}</span>
        <span style={{ '--c': '#FF8A7A' }}><i />{t('Loan interest paid')}</span>
      </div>
    </>
  );
}
