// Page data and the view model for the Smart Exit page.
// There are NO tax rules in this file. Every number comes from calculateLocalExitAnalysis() in services/api.js,
// the same rules the backend and the shared test cases (reference/exit_cases.json) follow.
import {
  calculateLocalExitAnalysis,
  validateExitInputs,
  elssLockStatus,
  daysSinceDebtRuleStart,
} from '../../services/api.js';
import { parseISO } from './format.js';

export const EQ = [
  'Equity: Flexi Cap / Large Cap',
  'Equity: Mid Cap / Small Cap',
  'Equity: Index / ETF',
  'Equity: ELSS (Tax Saver - 3yr lock)',
  'Equity: Sectoral / Thematic',
  'Equity: General',
];
export const DB = [
  'Debt: Liquid / Ultra Short Duration',
  'Debt: Money Market / Low Duration',
  'Debt: Corporate Bond Fund',
  'Debt: Banking & PSU Fund',
  'Debt: General',
];
export const SLABS = ['5', '10', '15', '20', '25', '30'];
export const AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

// [days, English label, Hindi label]
const PRESETS_EQ = [
  [180, '180d · 6M', '180 दिन · 6 माह'],
  [200, '200d', '200 दिन'],
  [335, '335d · 11M', '335 दिन · 11 माह'],
  [365, '365d · 1 yr', '365 दिन · 1 वर्ष'],
  [400, '400d · LTCG', '400 दिन · LTCG'],
];
const PRESETS_ELSS = [
  [365, '365d · 1 yr', '365 दिन · 1 वर्ष'],
  [730, '730d · 2 yrs', '730 दिन · 2 वर्ष'],
  [900, '900d · 2.5 yrs', '900 दिन · 2.5 वर्ष'],
  [1100, '1,100d · 3 yrs+', '1,100 दिन · 3 वर्ष+'],
];
export function presetsFor(v) {
  if (v.elss) return PRESETS_ELSS;
  if (v.eq) return PRESETS_EQ;
  return [
    [90, '90d · 3M', '90 दिन · 3 माह'],
    [365, '365d · 1 yr', '365 दिन · 1 वर्ष'],
    [730, '730d · 2 yrs', '730 दिन · 2 वर्ष'],
    [1095, '1,095d · 3 yrs', '1,095 दिन · 3 वर्ष'],
    [v.D0 + 60, 'Before Apr 2023', 'अप्रैल 2023 से पहले'],
  ];
}

export const SCENARIOS = {
  short: { name: ['Short-term equity', 'छोटी अवधि का इक्विटी'], stats: ['Equity · ₹1L to ₹1.2L · 200 days', 'इक्विटी · ₹1L से ₹1.2L · 200 दिन'], type: 'Equity Fund', cat: EQ[0], inv: '100000', cur: '120000', days: 200, load: '' },
  long: { name: ['Long-term equity', 'लंबी अवधि का इक्विटी'], stats: ['Equity · ₹1L to ₹3L · 400 days', 'इक्विटी · ₹1L से ₹3L · 400 दिन'], type: 'Equity Fund', cat: EQ[0], inv: '100000', cur: '300000', days: 400, load: '' },
  debt: { name: ['Debt fund', 'डेट फ़ंड'], stats: ['Debt · ₹2L to ₹2.25L · 450 days', 'डेट · ₹2L से ₹2.25L · 450 दिन'], type: 'Debt Fund', cat: DB[2], inv: '200000', cur: '225000', days: 450, load: '', slab: '30' },
};

export const INITIAL_STATE = {
  type: 'Equity Fund',
  cat: EQ[0],
  inv: '100000',
  cur: '120000',
  days: 200,
  load: '',
  slab: '30',
  rate: '6.25',
  adv: false,
  scn: 'short',
  checked: false,
};

/** What changes the numbers. When this changes, an AI explanation written earlier is out of date. */
export const signature = (s) => [s.type, s.cat, s.inv, s.cur, s.days, s.load, s.slab, s.rate].join('|');

const num = (x) => {
  const n = parseFloat(x);
  return Number.isNaN(n) ? null : n;
};

/** The page state as the input of calculateLocalExitAnalysis (and, with numbers, of the backend). */
export function toInputs(s) {
  const eq = s.type === 'Equity Fund';
  const load = num(s.load);
  let rate = num(s.rate);
  if (rate === null || rate < 0) rate = 0; // blank = ignore the interest, as on the approved page
  return {
    investment_type: s.type,
    fund_category: s.cat,
    amount_invested: s.inv,
    current_value: s.cur,
    holding_period_days: s.days,
    exit_load_pct: load === null ? null : Math.max(0, load),
    applicable_slab_rate_pct: eq ? 30 : num(s.slab) || 30,
    interest_rate_pct: rate,
  };
}

/** The request body for POST /exit-analysis (same values the page used for its own numbers). */
export function toPayload(inp) {
  return {
    investment_type: inp.investment_type,
    fund_category: inp.fund_category,
    amount_invested: Number(inp.amount_invested),
    current_value: Number(inp.current_value),
    holding_period_days: inp.holding_period_days,
    exit_load_pct: inp.exit_load_pct,
    applicable_slab_rate_pct: inp.applicable_slab_rate_pct,
    interest_rate_pct: inp.interest_rate_pct,
  };
}

/** Everything the page shows, worked out from the state. `now` is a Date. */
export function buildView(s, now) {
  const eq = s.type === 'Equity Fund';
  const debt = !eq;
  const elss = eq && s.cat.includes('ELSS');
  const D0 = daysSinceDebtRuleStart(now);
  const T = eq ? 365 : D0; // the "gate": day 365 for equity, 1 April 2023 for debt
  const xmax = T + 150;
  const sMax = elss ? 1245 : xmax;

  const lockSt = elss ? elssLockStatus(s.days, now) : null;
  const lock = !!(lockSt && lockSt.locked);
  const rem = lock ? lockSt.days_left : 0;
  const unlockD = lockSt ? parseISO(lockSt.unlock_date) : null;

  const inp = toInputs(s);
  const check = validateExitInputs(inp);
  const invMiss = check.missing.includes('amount_invested');
  const curMiss = check.missing.includes('current_value');
  const empty = !check.valid;
  const missingCase = invMiss && curMiss ? 0 : invMiss ? 1 : 2;

  const v = {
    eq, debt, elss, D0, T, xmax, sMax, lock, rem, unlockD, inp, empty, invMiss, curMiss, missingCase,
    lockUI: lock && !empty,
    rate: inp.interest_rate_pct,
    r: null, after: null,
    // what the three rule tiles need; drawn even while the amounts are blank
    rules: { short: eq ? s.days <= 365 : false, free: 0, pre: debt && s.days > D0 },
  };
  if (empty) return v;

  const r = calculateLocalExitAnalysis(inp, now);
  v.r = r;
  v.taxHold = r.tax_only_recommendation === 'Hold';
  v.dd = Math.max(1, r.days_to_ltcg_window || 0);
  v.oc = r.interest_elsewhere;
  v.netWait = r.potential_savings - r.interest_elsewhere;
  v.hold = r.recommendation === 'Hold';
  v.flip = v.taxHold && !v.hold && !lock;
  v.short = r.holding_status === 'Short-Term';
  v.gate = eq && v.short;
  // While locked, the rule tiles show the rule that applies once the lock ends.
  v.after = lock ? calculateLocalExitAnalysis({ ...inp, holding_period_days: 1095 }, now) : null;
  const ruleSrc = lock ? v.after : r;
  v.rules = { short: lock ? false : v.short, free: ruleSrc.ltcg_exemption_applied, pre: ruleSrc.bought_before_apr_2023 };
  return v;
}

/**
 * The cost-by-day curve for the chart: tax plus exit load if sold on day d (after the gate on equity: tax only,
 * because the load is gone). `ghost` draws a sample (₹1L → ₹1.2L) while the amounts are blank.
 */
export function buildCurve(inp, v, now, ghost) {
  const base = ghost ? { ...inp, amount_invested: 100000, current_value: 120000 } : inp;
  const { T, xmax, eq } = v;
  const cost = (d) => {
    const q = calculateLocalExitAnalysis({ ...base, holding_period_days: d }, now);
    return d <= T || !eq ? q.total_cost_now : q.current_tax;
  };
  const step = Math.max(1, Math.round(xmax / 150));
  const pts = [];
  for (let d = 0; d < T; d += step) pts.push([d, cost(d)]);
  pts.push([T, cost(T - 1)]);
  const nS = pts.length;
  pts.push([T, cost(T + 1)]);
  for (let d = T + step; d < xmax; d += step) pts.push([d, cost(d)]);
  pts.push([xmax, cost(xmax)]);
  let ymax = 0;
  pts.forEach((p) => { if (p[1] > ymax) ymax = p[1]; });
  if (ymax <= 0) ymax = 1;
  return { pts, nS, ymax, cost };
}
