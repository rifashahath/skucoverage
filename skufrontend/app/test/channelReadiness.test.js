import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessSignals, getReadinessSummary, validateGtinFormat } from '../src/lib/channelReadiness.js';

const audit = {
  productsCount: 10,
  issues: [
    { id: 'missing-title', classification: 'eligibility_blocker', category: 'sku', count: 2, affectedItems: [{ sku: 'A' }, { sku: 'B' }] },
    { id: 'missing-gtin', classification: 'data_warning', category: 'gtin', count: 3, affectedItems: [{ sku: 'B' }, { sku: 'C' }, { sku: 'D' }] },
  ],
};

test('groups engine issues as channel readiness signals without treating GTIN warnings as blockers', () => {
  const signals = buildReadinessSignals(audit);
  assert.equal(signals[0].status, 'blocker');
  assert.equal(signals[1].status, 'attention');
  assert.deepEqual(signals[1].channels, ['google', 'meta']);
});

test('summary avoids double counting known affected products', () => {
  assert.deepEqual(getReadinessSummary(audit), { ready: 6, attention: 3, blocker: 2 });
});

test('GTIN check validates only supported length and modulo-10 format', () => {
  assert.equal(validateGtinFormat('036000291452'), true);
  assert.equal(validateGtinFormat('036000291453'), false);
  assert.equal(validateGtinFormat('abc'), false);
});
