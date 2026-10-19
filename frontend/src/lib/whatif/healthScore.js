// The What-if page's maths. Pure functions, no React, no DOM.
//
// THE SCORE: 5 parts, weights from the project abstract, section 4.7 (25 / 20 / 20 / 20 / 15).
// Each part = weight x how close you are to its target, capped at the weight, rounded to a whole point.
// Score = the five rounded points added up. Rounding is half-up: Math.floor(x + 0.5).
// (Python's round() is banker's rounding, so the backend must use math.floor(x + 0.5) to match.)
//
//   SIP return vs benchmark  25 x min(return, 12) / 12                      (12% = benchmark)
//   Loan-to-income           20 x (60 - min(EMI%, 60)) / 60                 (EMI% = EMI / monthly income; 0 points at 60%)
//   Insurance adequacy       20 x min(cover, 10 x income) / (10 x income)   (10x income = recommended cover)
//   Tax efficiency           20 x long_term% / 100                          (share of investments held 1+ year)
//   Emergency fund           15 x min(months, 6) / 6                        (6 months = full marks)

export const BENCHMARK_PCT = 12; // SIP benchmark and the flat projection rate
export const EMI_SAFE_LIMIT_PCT = 30;
export const COVER_MULTIPLE = 10; // recommended term cover = 10x annual income
export const EMERGENCY_TARGET_MONTHS = 6;

// Field names are the ones the backend request will carry.
export const FIELDS = [
  'monthly_sip',
  'loan_emi',
  'loan_interest_rate',
  'annual_income',
  'sip_return_pct',
  'term_cover',
  'emergency_months',
  'long_term_pct',
];

export const DEFAULT_INPUTS = {
  monthly_sip: 15000,
  loan_emi: 22000,
  loan_interest_rate: 8.5,
  annual_income: 1400000,
  sip_return_pct: 11,
  term_cover: 5000000,
  emergency_months: 3,
  long_term_pct: 60,
};

export const PRESETS = [
  { name: 'Early Career', values: { monthly_sip: 5000, loan_emi: 12000, loan_interest_rate: 9.5, annual_income: 600000, sip_return_pct: 9, term_cover: 2500000, emergency_months: 1, long_term_pct: 30 } },
  { name: 'Balanced Builder', values: { monthly_sip: 15000, loan_emi: 22000, loan_interest_rate: 8.5, annual_income: 1400000, sip_return_pct: 11, term_cover: 5000000, emergency_months: 3, long_term_pct: 60 } },
  { name: 'Aggressive Saver', values: { monthly_sip: 35000, loan_emi: 15000, loan_interest_rate: 7.8, annual_income: 2400000, sip_return_pct: 14, term_cover: 15000000, emergency_months: 6, long_term_pct: 85 } },
  { name: 'High Debt Stress', values: { monthly_sip: 3000, loan_emi: 45000, loan_interest_rate: 11.5, annual_income: 900000, sip_return_pct: 6, term_cover: 1000000, emergency_months: 0, long_term_pct: 20 } },
];

// The five score parts. `control` is the slider that lives inside that part's row
// (the loan part has none: it is set by the EMI and income sliders).
export const COMPS = [
  { key: 'sip', name: 'SIP return vs benchmark', max: 25, control: { field: 'sip_return_pct', id: 'wi-sret', label: 'SIP return so far', min: 0, max: 25, step: 0.5, limits: ['0%', '25% / yr'] } },
  { key: 'loan', name: 'Loan-to-income ratio', max: 20, control: null },
  { key: 'ins', name: 'Insurance adequacy', max: 20, control: { field: 'term_cover', id: 'wi-cover', label: 'Term insurance cover', min: 0, max: 50000000, step: 500000, limits: ['₹0', '₹5Cr'] } },
  { key: 'tax', name: 'Tax efficiency', max: 20, control: { field: 'long_term_pct', id: 'wi-lt', label: 'Investments held 1+ year', min: 0, max: 100, step: 5, limits: ['0%', '100%'] } },
  { key: 'emg', name: 'Emergency fund', max: 15, control: { field: 'emergency_months', id: 'wi-emg', label: 'Emergency fund', min: 0, max: 12, step: 1, limits: ['0', '12 months'] } },
];

// Future value of a monthly SIP at 1% a month (12% a year), annuity-due.
export function fvAt(monthlySip, months) {
  const r = 0.01;
  return monthlySip * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

export function half(x) {
  return Math.floor(x + 0.5);
}

export function sameAs(a, b) {
  return FIELDS.every((k) => Math.abs(a[k] - b[k]) < 0.05);
}

// Everything the page shows, from the eight inputs.
export function derive(v) {
  const P = v.monthly_sip;
  const emi = v.loan_emi;
  const rate = v.loan_interest_rate;
  const inc = v.annual_income;
  const sret = v.sip_return_pct;
  const cover = v.term_cover;
  const em = v.emergency_months;
  const lt = v.long_term_pct;

  const monthlyIncome = inc / 12;
  const raw = (emi / monthlyIncome) * 100; // unrounded, used by the score
  const ratio = Math.round(raw * 100) / 100; // shown on screen
  const fv = fvAt(P, 60);
  const inv = P * 60;
  const gain = fv - inv;
  const drag = (emi * 12 * rate) / 100; // approximation: EMI x 12 x rate

  const pts = {
    sip: half((25 * Math.min(sret, BENCHMARK_PCT)) / BENCHMARK_PCT),
    loan: half((20 * (60 - Math.min(raw, 60))) / 60),
    ins: half((20 * Math.min(cover, COVER_MULTIPLE * inc)) / (COVER_MULTIPLE * inc)),
    tax: half((20 * lt) / 100),
    emg: half((15 * Math.min(em, EMERGENCY_TARGET_MONTHS)) / EMERGENCY_TARGET_MONTHS),
  };
  const comps = COMPS.map((c) => ({ key: c.key, name: c.name, max: c.max, pts: pts[c.key] }));
  const score = comps.reduce((a, c) => a + c.pts, 0);

  const none = { key: null, name: '', lost: 0, max: 0, pts: 0 };
  const weak = comps.reduce(
    (a, c) => (c.max - c.pts > a.lost ? { key: c.key, name: c.name, lost: c.max - c.pts, max: c.max, pts: c.pts } : a),
    none,
  );
  const strong = comps.reduce(
    (a, c) => (c.pts / c.max > a.f ? { name: c.name, pts: c.pts, max: c.max, f: c.pts / c.max } : a),
    { name: '', pts: 0, max: 1, f: -1 },
  );

  return { P, emi, rate, inc, monthlyIncome, sret, cover, em, lt, fv, inv, gain, ratio, drag, comps, score, weak, strong };
}

// Tier names come from the app's existing tiers; cut-offs (40 / 60 / 75 / 90) are this page's choice.
export function band(score) {
  if (score < 40) return { name: 'Critical Debt Stress', color: '#B4301F' };
  if (score < 60) return { name: 'Vulnerable Leveraged', color: '#C2692B' };
  if (score < 75) return { name: 'Balanced Saver', color: '#B7791F' };
  if (score < 90) return { name: 'Solid Wealth Builder', color: '#4C8F3A' };
  return { name: 'Financially Resilient', color: '#15805A' };
}

export function zone(ratio) {
  if (ratio < 30) return { name: 'Healthy', color: '#15805A' };
  if (ratio <= 45) return { name: 'Caution', color: '#B7791F' };
  return { name: 'High risk', color: '#B4301F' };
}

// Colour of a score part on the dark breakdown card.
export function partColor(pts, max) {
  const f = pts / max;
  return f >= 0.75 ? '#6FD8A8' : f >= 0.4 ? '#E8C36A' : '#FF8A7A';
}

// Insurance share used by the bar under the income slider (0..1) and its colour.
export function insuranceShare(cover, inc) {
  const f = Math.min(cover / (COVER_MULTIPLE * inc), 1);
  const color = f >= 0.75 ? '#15805A' : f >= 0.4 ? '#B7791F' : '#B4301F';
  return { f, color };
}

// Room under the 30% safe limit, in rupees a month (negative = over the limit).
export function emiRoom(d) {
  return (EMI_SAFE_LIMIT_PCT / 100) * d.monthlyIncome - d.emi;
}
