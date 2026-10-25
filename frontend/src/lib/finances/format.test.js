import test from 'node:test';
import assert from 'node:assert/strict';
import { money, percent, number } from './format.js';

test('formats Indian rupee values and percentages', () => {
  assert.equal(money(410000), '₹4,10,000');
  assert.equal(number(2), '2');
  assert.equal(percent(13.9), '13.9%');
  assert.equal(money(null), '—');
});
