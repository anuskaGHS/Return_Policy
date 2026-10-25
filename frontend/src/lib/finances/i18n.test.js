import test from 'node:test';
import assert from 'node:assert/strict';
import { copy, t } from './i18n.js';

test('English and Hindi dictionaries cover the core page copy', () => {
  for (const key of ['dashboard', 'chat', 'add', 'confirm', 'clear', 'privacy']) {
    assert.ok(copy.en[key]);
    assert.ok(copy.hi[key]);
    assert.equal(t('en', key), copy.en[key]);
  }
});
