import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReadinessSignals, getReadinessSummary, getReadinessStatus, validateGtinFormat } from '../src/lib/channelReadiness.js';

const audit = {
  productsCount: 10,
  issues: [
    { id: 'missing-title', classification: 'eligibility_blocker', status: 'observed', category: 'sku', count: 2, affectedItems: [{ sku: 'A' }, { sku: 'B' }] },
    { id: 'missing-gtin', classification: 'data_warning', status: 'needs_verification', category: 'gtin', count: 3, affectedItems: [{ sku: 'B' }, { sku: 'C' }, { sku: 'D' }] },
    { id: 'short-title', classification: 'data_warning', status: 'heuristic', category: 'sku', count: 1, affectedItems: [{ sku: 'E' }] },
  ],
};

test('readiness status keeps GTIN verification out of both blocker and attention', () => {
  assert.equal(getReadinessStatus({ classification: 'data_warning', status: 'needs_verification' }), 'verification');
  assert.equal(getReadinessStatus({ classification: 'eligibility_blocker', status: 'needs_verification' }), 'verification');
  assert.equal(getReadinessStatus({ classification: 'eligibility_blocker', status: 'observed' }), 'blocker');
  assert.equal(getReadinessStatus({ classification: 'data_warning', status: 'observed' }), 'attention');
  assert.equal(getReadinessStatus({ classification: 'growth_opportunity', status: 'heuristic' }), 'attention');
});

test('signals carry readiness status, confidence and source labels without hiding the finding status', () => {
  const signals = buildReadinessSignals(audit);
  assert.equal(signals[0].readinessStatus, 'blocker');
  assert.equal(signals[1].readinessStatus, 'verification');
  assert.equal(signals[1].status, 'needs_verification');
  assert.equal(signals[2].readinessStatus, 'attention');
  assert.deepEqual(signals[1].channels, ['google', 'meta']);
  assert.equal(signals[0].confidenceLabel, 'Medium confidence');
  assert.equal(signals[0].sourceLabel, 'Public storefront');
});

test('fallback summary separates blocker, attention and verification with unique-product unions', () => {
  const summary = getReadinessSummary(audit);
  assert.equal(summary.exact, false);
  assert.deepEqual(summary.blocker, { findings: 2, products: 2 });
  assert.deepEqual(summary.verification, { findings: 3, products: 3 });
  assert.deepEqual(summary.attention, { findings: 1, products: 1 });
  assert.equal(summary.totalFindings, 6);
  assert.equal(summary.affectedProducts, 5);
  assert.equal(summary.ready, 5);
  assert.equal(summary.scanned, 10);
});

test('exact engine readiness numbers win over the estimate', () => {
  const withReadiness = {
    ...audit,
    readiness: {
      scannedProducts: 10,
      affectedProducts: 6,
      readyProducts: 4,
      totalFindings: 7,
      blocker: { findings: 2, products: 2 },
      attention: { findings: 2, products: 2 },
      verification: { findings: 3, products: 3 },
    },
  };
  const summary = getReadinessSummary(withReadiness);
  assert.equal(summary.exact, true);
  assert.equal(summary.affectedProducts, 6);
  assert.equal(summary.ready, 4);
  assert.equal(summary.totalFindings, 7);
  assert.deepEqual(summary.verification, { findings: 3, products: 3 });
});

test('fallback estimates capped id lists without exceeding the scanned count', () => {
  const capped = {
    productsCount: 242,
    issues: [
      { id: 'gtin', classification: 'data_warning', status: 'needs_verification', category: 'gtin', count: 242, affectedItems: Array.from({ length: 50 }, (_, i) => ({ sku: `P${i}` })) },
    ],
  };
  const summary = getReadinessSummary(capped);
  assert.equal(summary.exact, false);
  assert.equal(summary.verification.findings, 242);
  assert.equal(summary.affectedProducts, 242);
  assert.equal(summary.ready, 0);
});

test('GTIN check validates only supported length and modulo-10 format', () => {
  assert.equal(validateGtinFormat('036000291452'), true);
  assert.equal(validateGtinFormat('036000291453'), false);
  assert.equal(validateGtinFormat('abc'), false);
});

test('channel readiness view uses progressive disclosure and one recommended next action', () => {
  const source = readFileSync(new URL('../src/components/ChannelReadinessView.tsx', import.meta.url), 'utf8');
  // Plain-English outcome comes before detail and preserves the four trusted statuses.
  assert.match(source, /No potential blockers found/);
  assert.match(source, /All scanned products look ready/);
  assert.match(source, /Needs attention/);
  assert.match(source, /Needs verification/);
  assert.match(source, /Potential blockers/);
  // The recommended action opens the highest-priority evidence, not a decorative workflow.
  assert.match(source, /recommendedSignal/);
  assert.match(source, /handleRecommendedAction/);
  assert.match(source, /onInspectIssue\(recommendedSignal\)/);
  // Channel controls are named in merchant language.
  assert.match(source, /Both channels/);
  assert.match(source, /Google Shopping/);
  assert.match(source, /Meta catalogs/);
  // Technical units, evidence and utilities are progressively disclosed.
  assert.match(source, /What do these numbers mean\?/);
  assert.match(source, /findings across /);
  assert.match(source, /What needs your attention/);
  assert.match(source, /Open a result to see products, current values, evidence and recommended fixes/);
  assert.match(source, /How this channel check works/);
  // Detailed rule/source/guidance and product chips no longer crowd finding rows.
  assert.doesNotMatch(source, /<span className="font-bold">Rule:/);
  assert.doesNotMatch(source, /Source: \{signal\.sourceLabel\}/);
  assert.doesNotMatch(source, /Guidance: /);
  assert.doesNotMatch(source, /affectedProducts\.slice/);
  // Existing responsive safeguards and touch targets remain.
  assert.match(source, /overflow-x-clip/);
  assert.match(source, /min-h-11/);
});
