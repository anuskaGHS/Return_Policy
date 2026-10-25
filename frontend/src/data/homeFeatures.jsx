/**
 * Every feature Return Policy will offer, shown as cards in the Home page ring.
 *
 * To update the Home page as the product grows:
 *   - A feature ships      -> change its status from 'soon' to 'live' (the "Coming soon" tag disappears).
 *   - A new feature is planned -> add one entry to FEATURES (and pick or add a palette below).
 * Keep the number of cards a divisor of 30 (10, 6, 5 ...) or tell the ring a different ring size,
 * so the loop has no seam. Ten cards is what the design was tuned for.
 */

const ICONS = {
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  gauge: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h1M4 12h1M4 18h1" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  lang: <><path d="M4 6h9M8.5 4v2M6 6c0 4 3 7 6 8M12 6c-.5 3-3 6-7 8" /><path d="M13 20l3.5-8 3.5 8M14.3 17h4.4" /></>,
  scale: <><path d="M12 4v16M7 20h10M5 8h14" /><path d="M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8z" /></>,
  chat: <path d="M5 5h14v10h-9l-4 4v-4H5z" />,
  upload: <path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" />,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  doc: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 14l2 2 3-3" /></>,
};

export function Icon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>;
}

function Gauge({ score }) {
  const cx = 66, cy = 68, r = 52;
  const cols = ['#FF8A7A', '#F5A66B', '#E8C36A', '#9ED89A', '#6FD8A8'];
  const pt = (deg, rad) => {
    const a = (deg * Math.PI) / 180;
    return [(cx + rad * Math.cos(a)).toFixed(1), (cy - rad * Math.sin(a)).toFixed(1)];
  };
  const tip = pt(180 - (180 * score) / 100, 40);
  return (
    <svg viewBox="0 0 132 76" width="100%" style={{ maxWidth: '132px', alignSelf: 'center' }} aria-hidden="true">
      {cols.map((c, k) => {
        const p0 = pt(180 - 36 * k - 2, r);
        const p1 = pt(180 - 36 * (k + 1) + 2, r);
        return <path key={c} d={`M${p0.join(' ')} A${r} ${r} 0 0 1 ${p1.join(' ')}`} stroke={c} strokeWidth="9" fill="none" />;
      })}
      <line x1={cx} y1={cy} x2={tip[0]} y2={tip[1]} stroke="#F4F7FB" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4.5" fill="#F4F7FB" />
    </svg>
  );
}

/* One colourway per card. Each value feeds a CSS variable the card's contents read,
   so text, bars and chips adapt to the card colour. */
export const PALETTES = {
  cream: { bg: 'linear-gradient(165deg,#F6F3EC,#E9E4DA)', ink: '#14151A', soft: '#2B2D35', muted: '#555864', accent: '#B4301F', gain: '#15805A', risk: '#B4301F', surface: '#FFFFFF', track: 'rgba(20,21,26,.16)', chip: 'rgba(180,48,31,.14)', line: 'rgba(20,21,26,.4)', edge: 'rgba(255,255,255,.55)', qbg: '#fff', abg: '#14151A', atx: '#fff', tagbg: '#14151A', tagtx: '#fff' },
  navy: { bg: 'linear-gradient(170deg,#0F4378 0%,#0A2A4D 55%,#071B33 100%)', ink: '#F4F7FB', soft: '#D6E2F1', muted: '#A3BAD4', accent: '#8FD1FF', gain: '#6FE3B0', risk: '#FF9A88', surface: '#0A2A4D', track: 'rgba(255,255,255,.2)', chip: 'rgba(143,209,255,.2)', line: 'rgba(214,226,241,.5)', edge: 'rgba(143,209,255,.3)', qbg: 'rgba(255,255,255,.12)', abg: '#8FD1FF', atx: '#071B33', tagbg: '#8FD1FF', tagtx: '#071B33' },
  pink: { bg: 'linear-gradient(165deg,#F8CFDD,#EDA6C1)', ink: '#4A1330', soft: '#5E1F3F', muted: '#6F2E4D', accent: '#7E1A4D', gain: '#0F6B47', risk: '#A3192F', surface: '#FFF3F8', track: 'rgba(74,19,48,.2)', chip: 'rgba(126,26,77,.16)', line: 'rgba(74,19,48,.4)', edge: 'rgba(255,255,255,.5)', qbg: '#FFF3F8', abg: '#4A1330', atx: '#FFE6F0', tagbg: '#4A1330', tagtx: '#FFE6F0' },
  purple: { bg: 'linear-gradient(160deg,#8A1BB8 0%,#6A17B0 50%,#4B0F86 100%)', ink: '#FFFFFF', soft: '#F1E6FD', muted: '#E6D3FA', accent: '#FFC2E4', gain: '#8CF2C0', risk: '#FFB3A5', surface: '#4B0F86', track: 'rgba(255,255,255,.25)', chip: 'rgba(255,194,228,.22)', line: 'rgba(241,230,253,.5)', edge: 'rgba(255,194,228,.35)', qbg: 'rgba(255,255,255,.14)', abg: '#FFC2E4', atx: '#3A0B6A', tagbg: '#FFC2E4', tagtx: '#3A0B6A' },
  yellow: { bg: 'linear-gradient(165deg,#FFE066,#FFC91F)', ink: '#17130A', soft: '#2E2810', muted: '#4F4515', accent: '#17130A', gain: '#0F6B47', risk: '#A3192F', surface: '#FFF7CC', track: 'rgba(23,19,10,.2)', chip: 'rgba(23,19,10,.12)', line: 'rgba(23,19,10,.45)', edge: 'rgba(255,255,255,.55)', qbg: '#FFF7CC', abg: '#17130A', atx: '#FFE066', tagbg: '#17130A', tagtx: '#FFE066' },
  emerald: { bg: 'linear-gradient(165deg,#0B6A55,#074C3E 55%,#053429)', ink: '#F2FFF9', soft: '#E2F7EE', muted: '#BDE8D6', accent: '#8CF2C0', gain: '#8CF2C0', risk: '#FFB09A', surface: '#053429', track: 'rgba(255,255,255,.22)', chip: 'rgba(140,242,192,.2)', line: 'rgba(226,247,238,.5)', edge: 'rgba(140,242,192,.3)', qbg: 'rgba(255,255,255,.12)', abg: '#8CF2C0', atx: '#053429', tagbg: '#8CF2C0', tagtx: '#053429' },
  ice: { bg: 'linear-gradient(165deg,#DDEEFA,#BFDCF1)', ink: '#0D2B4A', soft: '#1F3F61', muted: '#3B5877', accent: '#0D5FA8', gain: '#0E6B49', risk: '#B3261E', surface: '#F2F9FE', track: 'rgba(13,43,74,.2)', chip: 'rgba(13,95,168,.14)', line: 'rgba(13,43,74,.4)', edge: 'rgba(255,255,255,.55)', qbg: '#F2F9FE', abg: '#0D2B4A', atx: '#E8F4FD', tagbg: '#0D2B4A', tagtx: '#E8F4FD' },
  charcoal: { bg: 'radial-gradient(90% 60% at 85% 105%,rgba(255,170,70,.38),rgba(255,170,70,0) 70%),linear-gradient(165deg,#1E1E22,#0E0E10)', ink: '#F6F3EE', soft: '#D9D4CB', muted: '#A59F94', accent: '#F2B36B', gain: '#7FE0B0', risk: '#FF9A88', surface: '#0E0E10', track: 'rgba(255,255,255,.2)', chip: 'rgba(242,179,107,.2)', line: 'rgba(242,179,107,.55)', edge: 'rgba(242,179,107,.28)', qbg: 'rgba(255,255,255,.1)', abg: '#F2B36B', atx: '#1A1209', tagbg: '#F2B36B', tagtx: '#1A1209' },
  vermilion: { bg: 'linear-gradient(165deg,#B8321C,#9A2614 55%,#7A1B0C)', ink: '#FFF6F3', soft: '#FFE9E3', muted: '#FFD9CF', accent: '#FFE3B0', gain: '#C9F7DF', risk: '#FFE3B0', surface: '#7A1B0C', track: 'rgba(255,255,255,.25)', chip: 'rgba(255,227,176,.22)', line: 'rgba(255,233,227,.55)', edge: 'rgba(255,227,176,.3)', qbg: 'rgba(255,255,255,.14)', abg: '#FFE3B0', atx: '#5A1307', tagbg: '#FFF6F3', tagtx: '#8A1F0E' },
  wine: { bg: 'linear-gradient(165deg,#7A1747,#4E0D2D 55%,#2E0719)', ink: '#FFF1F6', soft: '#F7CFE0', muted: '#E0A9C0', accent: '#FFB3D1', gain: '#8CF2C0', risk: '#FFB3A5', surface: '#2E0719', track: 'rgba(255,255,255,.22)', chip: 'rgba(255,179,209,.22)', line: 'rgba(247,207,224,.5)', edge: 'rgba(255,179,209,.3)', qbg: 'rgba(255,255,255,.12)', abg: '#FFB3D1', atx: '#3A0B22', tagbg: '#FFB3D1', tagtx: '#3A0B22' },
};

export function paletteStyle(p) {
  return {
    background: p.bg,
    '--text': p.ink, '--soft': p.soft, '--muted': p.muted, '--accent': p.accent, '--gain': p.gain, '--risk': p.risk,
    '--surface': p.surface, '--track': p.track, '--chip-a': p.chip, '--pill-line': p.line, '--card-edge': p.edge,
    '--qbg': p.qbg, '--abg': p.abg, '--atx': p.atx, '--tagbg': p.tagbg, '--tagtx': p.tagtx,
  };
}

const gain = { color: 'var(--gain)' };
const risk = { color: 'var(--risk)' };

export const FEATURES = [
  {
    id: 'what-if', status: 'live', palette: 'cream', kick: 'What-if', icon: 'sliders',
    heading: <h4 className="hs-hd hs-h-heavy">Move a<br />slider</h4>,
    text: 'Watch the rupees move.',
    viz: (<>
      <div className="hs-sl"><div className="hs-r"><span>Monthly SIP</span><b style={gain}>₹15,000</b></div><div className="hs-tr"><i style={{ left: '28%' }} /></div></div>
      <div className="hs-sl"><div className="hs-r"><span>Loan EMI</span><b style={risk}>₹22,000</b></div><div className="hs-tr"><i style={{ left: '40%' }} /></div></div>
      <div><span className="hs-big">₹12.37L</span><div className="hs-sm">SIP value in 5 years at 12%</div></div>
    </>),
  },
  {
    id: 'health-score', status: 'live', palette: 'navy', kick: 'Health score', icon: 'gauge',
    heading: <h4 className="hs-hd hs-h-heavy">Know your<br />score</h4>,
    text: 'A 0 to 100 score that says why.',
    viz: (<>
      <Gauge score={68} />
      <div style={{ textAlign: 'center' }}><span className="hs-big" style={{ fontSize: '34px' }}>68</span><div className="hs-sm">Balanced Saver</div></div>
    </>),
  },
  {
    id: 'action-plan', status: 'live', palette: 'pink', kick: 'Action plan', icon: 'list',
    heading: <h4 className="hs-hd hs-h-serif">Three moves,<br />ranked.</h4>,
    text: 'In rupees, not in jargon.',
    viz: (<>
      <div className="hs-step"><span>1</span>Prepay with 50% of any bonus</div>
      <div className="hs-step"><span>2</span>Step up your SIP 10% a year</div>
      <div className="hs-step"><span>3</span>Keep a 6-month emergency fund</div>
    </>),
  },
  {
    id: 'exit-advisor', status: 'live', palette: 'purple', kick: 'Exit advisor', icon: 'clock',
    heading: <h4 className="hs-hd hs-h-heavy" style={{ fontSize: '26px' }}>Save<br />₹5,200</h4>,
    text: 'Tax and exit load on ₹1L grown to ₹1.2L, held 200 days.',
    viz: (<>
      <div className="hs-rib">Hold 165 more days</div>
      <div className="hs-bar"><span>Exit today</span><b>₹5,200</b></div><div className="hs-bb" style={{ background: 'var(--risk)', width: '100%' }} />
      <div className="hs-bar"><span>Wait 165 days</span><b>₹0</b></div><div className="hs-bb" style={{ background: 'var(--gain)', width: '6%' }} />
    </>),
  },
  {
    id: 'hindi', status: 'live', palette: 'yellow', kick: 'In Hindi too', icon: 'lang',
    heading: null,
    text: 'Your score and plan, explained in Hindi.',
    viz: (<>
      <div className="hs-hi">संतुलित<br />बचतकर्ता</div>
      <div className="hs-sm" style={{ fontWeight: 600 }}>Balanced Saver</div>
    </>),
  },
  {
    id: 'loan-vs-sip', status: 'soon', palette: 'emerald', kick: 'Loan vs SIP', icon: 'scale',
    heading: <h4 className="hs-hd hs-h-heavy">Prepay<br />or invest?</h4>,
    text: 'See who wins, in rupees.',
    viz: (<>
      <div className="hs-bar"><span>Prepay the loan</span><b>₹1.93Cr</b></div><div className="hs-bb" style={{ background: 'var(--muted)', width: '85%' }} />
      <div className="hs-bar"><span>Invest the surplus</span><b>₹2.26Cr</b></div><div className="hs-bb" style={{ background: 'var(--gain)', width: '100%' }} />
      <div className="hs-sm">Net wealth after 20 years.</div>
    </>),
  },
  {
    id: 'why-it-moved', status: 'live', palette: 'ice', kick: 'Return explainer', icon: 'chat',
    heading: <h4 className="hs-hd hs-h-serif">Why did my<br />fund lag?</h4>,
    text: 'A fund vs its benchmark, the sectors behind the gap, and sources.',
    viz: (<>
      <div className="hs-bar"><span>Kotak Large Cap Fund</span><b>−5.4%</b></div><div className="hs-bb" style={{ background: 'var(--risk)', width: '100%' }} />
      <div className="hs-bar"><span>Nifty 100 TRI</span><b>−5.2%</b></div><div className="hs-bb" style={{ background: 'var(--muted)', width: '96%' }} />
      <div className="hs-sm">1-year return as on 30 Sep 2026.</div>
    </>),
  },
  {
    id: 'dashboard', status: 'soon', palette: 'charcoal', kick: 'One dashboard', icon: 'upload',
    heading: <h4 className="hs-hd hs-h-heavy" style={{ fontSize: '19px' }}>Everything<br />in one view</h4>,
    text: 'Every product you own.',
    viz: (<>
      <div className="hs-file"><Icon name="upload" />CAS statement.pdf</div>
      <div className="hs-chips"><span>SIPs</span><span>Loans</span><span>Insurance</span><span>FDs</span></div>
    </>),
  },
  {
    id: 'insurance-gap', status: 'soon', palette: 'vermilion', kick: 'Insurance gap', icon: 'shield',
    heading: <h4 className="hs-hd hs-h-heavy" style={{ fontSize: '19px' }}>Is your<br />cover<br />enough?</h4>,
    text: 'Checked against 10× your income.',
    viz: (<>
      <div className="hs-bar"><span>Your cover</span><b>₹50L</b></div><div className="hs-bb" style={{ background: 'var(--gain)', width: '36%' }} />
      <div className="hs-bar"><span>Suggested</span><b>₹1.4Cr</b></div><div className="hs-bb" style={{ border: '1px dashed var(--muted)', width: '100%' }} />
      <div><span className="hs-tag">Gap ₹90L</span></div>
    </>),
  },
  {
    id: 'document-check', status: 'soon', palette: 'wine', kick: 'Document check', icon: 'doc',
    heading: <h4 className="hs-hd hs-h-serif">Spot what<br />papers miss.</h4>,
    text: 'Your documents, read together.',
    viz: (<>
      <div className="hs-bar"><span>Home loan ends</span><b>2046</b></div><div className="hs-bb" style={{ background: 'var(--muted)', width: '100%' }} />
      <div className="hs-bar"><span>Term cover ends</span><b>2040</b></div><div className="hs-bb" style={{ background: 'var(--accent)', width: '78%' }} />
      <div><span className="hs-tag">6-year gap</span></div>
    </>),
  },
];
