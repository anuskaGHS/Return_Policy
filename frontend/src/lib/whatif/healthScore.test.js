// Run with:  node --test src/lib/whatif/healthScore.test.js
// Checks the page's score maths against reference/score_cases.json (made by an independent Python implementation).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { derive, band, half, DEFAULT_INPUTS } from './healthScore.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../../../../reference/score_cases.json'), 'utf8'));

test('half-up rounding, not banker rounding', () => {
  assert.equal(half(0.5), 1);
  assert.equal(half(1.5), 2);
  assert.equal(half(2.5), 3);
  assert.equal(half(2.4999), 2);
});

test('default inputs give 23 + 14 + 7 + 12 + 8 = 64, Balanced Saver', () => {
  const d = derive(DEFAULT_INPUTS);
  assert.deepEqual(d.comps.map((c) => c.pts), [23, 14, 7, 12, 8]);
  assert.equal(d.score, 64);
  assert.equal(band(d.score).name, 'Balanced Saver');
});

test(`all ${fixture.cases.length} reference cases match (points, score, tier)`, () => {
  for (const c of fixture.cases) {
    const d = derive(c.input);
    const got = Object.fromEntries(d.comps.map((p) => [p.key, p.pts]));
    assert.deepEqual(got, c.points, c.name);
    assert.equal(d.score, c.score, c.name);
    assert.equal(band(d.score).name, c.tier, c.name);
  }
});

test('every part stays within 0..max and the score within 0..100', () => {
  for (const c of fixture.cases) {
    const d = derive(c.input);
    d.comps.forEach((p) => assert.ok(p.pts >= 0 && p.pts <= p.max, c.name + ' ' + p.key));
    assert.ok(d.score >= 0 && d.score <= 100, c.name);
  }
});
