// Run with: node --test src/lib/whatif/exit-cases.test.mjs
// Checks frontend Smart Exit rules against reference/exit_cases.json
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  calculateLocalExitAnalysis,
  daysSinceDebtRuleStart,
  elssLockStatus,
  validateExitInputs,
  analyzeExitTax
} from '../../services/api.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../../../../reference/exit_cases.json'), 'utf8'));

test(`all ${fixture.cases.length} reference cases match expected results`, () => {
  const now = new Date(2026, 9, 21, 12); // LOCAL noon
  for (const c of fixture.cases) {
    const result = calculateLocalExitAnalysis(c.input, now);
    if (!c.expected.valid) {
      assert.deepStrictEqual(
        { valid: result.valid, missing: result.missing, message: result.message },
        c.expected,
        c.name
      );
    } else {
      for (const [key, expectedVal] of Object.entries(c.expected)) {
        assert.deepStrictEqual(result[key], expectedVal, `${c.name}: ${key}`);
      }
    }
  }
});

test('daysSinceDebtRuleStart is 1299 across 21 Oct 2026 regardless of clock time', () => {
  assert.equal(daysSinceDebtRuleStart(new Date(2026, 9, 21, 1)), 1299);
  assert.equal(daysSinceDebtRuleStart(new Date(2026, 9, 21, 12)), 1299);
  assert.equal(daysSinceDebtRuleStart(new Date(2026, 9, 21, 23, 30)), 1299);
});

test('elssLockStatus leap year purchase rolls over to March 1', () => {
  const status = elssLockStatus(965, new Date(2026, 9, 21, 12));
  assert.equal(status.unlock_date, '2027-03-01');
});

test('validateExitInputs rejects strings "NaN" and "Infinity" for both amounts', () => {
  const rNan = validateExitInputs({ amount_invested: 'NaN', current_value: 'NaN' });
  assert.equal(rNan.valid, false);
  assert.deepStrictEqual(rNan.missing, ['amount_invested', 'current_value']);

  const rInf = validateExitInputs({ amount_invested: 'Infinity', current_value: 'Infinity' });
  assert.equal(rInf.valid, false);
  assert.deepStrictEqual(rInf.missing, ['amount_invested', 'current_value']);
});

test('analyzeExitTax with a blank amount_invested rejects with message and never calls fetch', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('fetch should not be called');
  };
  try {
    await assert.rejects(
      async () => {
        await analyzeExitTax({
          investment_type: 'Equity Fund',
          amount_invested: '',
          current_value: 120000,
          holding_period_days: 200
        });
      },
      {
        name: 'Error',
        message: 'Enter what you invested.'
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});
