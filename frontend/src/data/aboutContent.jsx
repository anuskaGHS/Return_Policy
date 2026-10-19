/**
 * All About page copy lives here, so editing a line never means touching layout code.
 * Palette names are keys of PALETTES in data/homeFeatures.jsx.
 * The copy is written as if the whole product exists, so it never needs updating when a feature ships.
 * Live / "Coming soon" status lives only on the Home ring (data/homeFeatures.jsx).
 */

// Halo colour behind a selected card (r g b), one per palette used on this page.
export const GLOW = {
  cream: '196 60 40', navy: '143 209 255', pink: '248 130 180', purple: '214 120 255', yellow: '255 214 64',
  emerald: '140 242 192', ice: '90 170 240', vermilion: '255 120 90', wine: '255 120 175',
};

// stat: [value, isRisk?]. Real figures, each with its source in GAP_SOURCES below.
export const GAP_CARDS = [
  { palette: 'yellow', num: '01', stat: [['74%', true]], label: 'Large-cap funds behind benchmark, 10 yrs', title: 'Most funds lag, and no one says so', text: 'Your SIP may be in one of them, and nothing tells you.', delay: '.05s' },
  { palette: 'vermilion', num: '02', stat: [['7.25%', true], ['6.45%']], label: 'SBI home loan from vs FD up to', title: 'An EMI that costs more than your FD earns', text: 'At SBI, home loans start above the best FD rate. Approximate, and it keeps changing with RBI rate decisions.', delay: '.12s' },
  { palette: 'ice', num: '03', stat: [['83%', true]], label: 'Of life cover needed is missing', title: 'Cover that looks fine until it is needed', text: 'Swiss Re puts the gap in Indian households at 83% of the cover they need.', delay: '.19s' },
];

// Shown under the three cards.
export const GAP_SOURCES = 'Sources: S&P SPIVA India Mid-Year 2026 (active large-cap funds vs benchmark, 10 years). SBI published rates, Oct 2026: approximate, they keep changing with the RBI repo rate. Swiss Re Institute, Closing Asia’s mortality protection gap (2020, data for 2019).';

export const NAME_CARDS = [
  { palette: 'cream', num: '01', word: 'Returns', text: 'How well your SIPs, loans and insurance are really performing.', delay: '.05s' },
  { palette: 'wine', num: '02', word: 'Policy', text: 'Your own rule for when to exit, hold, switch or reinvest.', delay: '.12s' },
];

// icon = a key of ICONS in data/homeFeatures.jsx
export const HOW_CARDS = [
  { palette: 'navy', num: '01', icon: 'sliders', title: 'Share your household', text: 'Add your SIP, loan and cover, or upload your statements.', delay: '.04s' },
  { palette: 'emerald', num: '02', icon: 'gauge', title: 'Numbers come first', text: 'Returns, tax and exit load are worked out as maths, in rupees.', delay: '.1s' },
  { palette: 'pink', num: '03', icon: 'chat', title: 'AI explains why', text: 'A plain reason for every number, in English or Hindi.', delay: '.16s' },
  { palette: 'purple', num: '04', icon: 'list', title: 'You get a ranked plan', text: 'Three moves, in order, with the rupees at stake.', delay: '.22s' },
];

// Example answers (figures come from the project abstract).
export const ASK_ROWS = [
  { palette: 'ice', num: '01', q: 'Should I exit this fund now or wait?', a: <>Exit today and you pay <b>₹5,000</b> in tax and exit load. Wait 47 more days and you save all of it.</>, verdict: 'Hold' },
  { palette: 'pink', num: '02', q: 'Am I losing money by not prepaying my loan?', a: <>Your loan costs <b>8.5%</b> a year and your fund has earned <b>12.3%</b>. Investing wins for now.</>, verdict: "Don't prepay yet" },
  { palette: 'emerald', num: '03', q: 'Is my insurance covering my real risk?', a: <>Your cover is <b>3x</b> your income against the recommended <b>10x</b>. That is your biggest gap.</>, verdict: 'Raise cover' },
];
