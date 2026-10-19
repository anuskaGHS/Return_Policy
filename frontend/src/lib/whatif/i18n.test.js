// Run: node --test src/lib/whatif/i18n.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HI_STRINGS, tr } from './i18n.js';
import { PRESETS, COMPS } from './healthScore.js';
import { NAV_LINKS, FOOTER_LINES } from '../../data/whatIfNav.js';
import { compact, short } from './format.js';
import { rules, why, dragLine, noteFor } from './copy.js';
import { derive } from './healthScore.js';

const TIERS = ['Critical Debt Stress', 'Vulnerable Leveraged', 'Balanced Saver', 'Solid Wealth Builder', 'Financially Resilient'];
const ZONES = ['Healthy', 'Caution', 'High risk'];

test('every data-driven name has a Hindi entry', () => {
  const names = [
    ...PRESETS.map((p) => p.name), ...COMPS.map((c) => c.name),
    ...COMPS.filter((c) => c.control).map((c) => c.control.label),
    ...TIERS, ...ZONES, ...NAV_LINKS.map((l) => l.label), ...FOOTER_LINES,
  ];
  const missing = names.filter((n) => !(n in HI_STRINGS));
  assert.deepEqual(missing, []);
});

test('the AI loading and failure messages have Hindi text', () => {
  for (const k of ['AI is preparing your plan…', 'AI is writing a note…', "AI couldn't answer this time. This plan is calculated from your score breakdown, using standard thresholds (EMI under 30% of income, cover of 10× income, 6 months of emergency savings)."]) {
    assert.ok(k in HI_STRINGS, k);
  }
});

test('tr falls back to English for unknown keys and for lang en', () => {
  assert.equal(tr('en', 'Reset default'), 'Reset default');
  assert.equal(tr('hi', 'no such key'), 'no such key');
  assert.notEqual(tr('hi', 'Reset default'), 'Reset default');
});

test('units are lang-aware', () => {
  assert.equal(compact(1237295, 'en'), '₹12.37L');
  assert.equal(compact(1237295, 'hi'), '₹12.37 लाख');
  assert.equal(short(14000000, 'hi'), '₹1.4 करोड़');
});

test('Hindi copy has no leftover English sentence words', () => {
  const d = derive({ monthly_sip: 5000, loan_emi: 45000, loan_interest_rate: 11.5, annual_income: 900000, sip_return_pct: 6, term_cover: 1000000, emergency_months: 0, long_term_pct: 20 });
  const flat = (parts) => parts.map((p) => (typeof p === 'string' ? p : p.b)).join('');
  const texts = [flat(why(d, 'hi')), flat(dragLine(d, 'hi')), ...COMPS.map((c) => flat(noteFor(c.key, d, 'hi'))), ...rules(d, 'hi').flatMap((r) => [r[0], flat(r[1])])];
  const english = /\b(your|the|against|income|month|months|points|Cover|Biggest|drag)\b/;
  for (const t of texts) assert.doesNotMatch(t, english, t);
});
