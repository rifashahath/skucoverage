import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapEngineReportToStoreAudit, summarizeFindings } from '../src/lib/auditMapping.js';

const engineReport = {
  payload: {
    storeId: 'example.myshopify.com',
    audit: {
      totalProducts: 242,
      score: 79,
      scoreBreakdown: { titles: 79, descriptions: 98, gtins: null, categories: 65, images: 76, variants: 100 },
      assessmentBreakdown: {
        gtins: { status: 'not_assessed', assessedProducts: 0, unavailableProducts: 242, source: 'public_storefront' },
      },
      issues: [
        {
          type: 'gtin_status_unverified', classification: 'data_warning', priority: 'low',
          title: 'GTIN not verified from public storefront data', rule: 'No barcode is exposed on the public storefront variant.',
          count: 242, affectedProducts: ['gid://shopify/Product/1'], status: 'needs_verification', confidence: 'high',
          source: 'public_storefront', evidence: [{ productId: 'gid://shopify/Product/1', productName: 'Blue Shirt', productUrl: '/products/blue-shirt', variant: 'Blue / M', gtinFound: false, dataSourceChecked: 'Public Shopify storefront products.json', verificationStatus: 'Needs verification in Shopify Admin or Merchant Center', observed: 'No barcode', expected: 'Verify in Shopify Admin' }],
        },
        {
          type: 'incomplete_title', classification: 'growth_opportunity', priority: 'medium',
          title: 'Title may be missing useful detail', rule: 'Title is 20-39 characters; 40 or more score full credit.',
          count: 119, affectedProducts: ['gid://shopify/Product/2'], status: 'heuristic', confidence: 'medium',
          source: 'public_storefront', evidence: [{ productId: 'gid://shopify/Product/2', observed: 'Title length: 25 characters', expected: 'Titles of 40-150 characters score full credit' }],
        },
        {
          type: 'no_images', classification: 'eligibility_blocker', priority: 'high',
          title: 'No product images', rule: '0 images in the public storefront snapshot.',
          count: 3, affectedProducts: ['gid://shopify/Product/3'], status: 'observed', confidence: 'high',
          source: 'public_storefront', evidence: [{ productId: 'gid://shopify/Product/3', observed: '0 images', expected: 'At least one product image' }],
        },
      ],
      recommendations: [],
      nextSteps: [],
    },
  },
};

test('finding buckets reconcile with the visible issue list', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  const listTotal = data.issues.reduce((acc, i) => acc + i.count, 0);
  assert.equal(data.findingSummary.confirmedIssues, 3);
  assert.equal(data.findingSummary.verificationItems, 242);
  assert.equal(data.findingSummary.opportunities, 119);
  assert.equal(data.findingSummary.totalFindings, 364);
  assert.equal(data.findingSummary.totalFindings, listTotal);
  assert.equal(data.detectedIssuesCount, 364);
});

test('verification items are never counted as high-priority warnings', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  assert.equal(data.findingSummary.highPriorityConfirmed, 3);
  assert.equal(data.highPriorityCount, 3);
});

test('engine display labels and rules pass through instead of regenerated titles', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  const gtin = data.issues.find((i) => i.id === 'issue-gtin_status_unverified');
  assert.equal(gtin.title, 'GTIN not verified from public storefront data');
  assert.match(gtin.rule, /No barcode is exposed/);
});

test('unassessed dimensions stay null so the UI can show Not assessed', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  const gtin = data.attributeBreakdown.find((a) => a.name === 'GTIN / barcode format');
  assert.equal(gtin.score, null);
  assert.equal(gtin.status, 'not_assessed');
  assert.equal(gtin.unavailableProducts, 242);
});

test('summarizeFindings handles empty and missing statuses', () => {
  assert.deepEqual(summarizeFindings([]), {
    confirmedIssues: 0,
    verificationItems: 0,
    opportunities: 0,
    totalFindings: 0,
    highPriorityConfirmed: 0,
  });
  const mixed = summarizeFindings([
    { count: 2, severity: 'HIGH', confidence: 'high' },
    { count: 5, status: 'heuristic', severity: 'LOW', confidence: 'medium' },
  ]);
  assert.equal(mixed.confirmedIssues, 2);
  assert.equal(mixed.opportunities, 5);
  assert.equal(mixed.totalFindings, 7);
  assert.equal(mixed.highPriorityConfirmed, 2);
});

test('mapping returns null for empty payloads instead of a fabricated report', () => {
  assert.equal(mapEngineReportToStoreAudit(null, 'x', 'a'), null);
  assert.equal(mapEngineReportToStoreAudit({ payload: {} }, 'x', 'a'), null);
});


test('product evidence maps names, URLs, variants, source and verification status', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  const item = data.issues.find((i) => i.id === 'issue-gtin_status_unverified').affectedItems[0];
  assert.equal(item.productTitle, 'Blue Shirt');
  assert.equal(item.productUrl, 'https://example.myshopify.com/products/blue-shirt');
  assert.equal(item.variant, 'Blue / M');
  assert.equal(item.gtinFound, false);
  assert.match(item.dataSourceChecked, /products\.json/);
  assert.match(item.verificationStatus, /Needs verification/);
});

test('merchant report keeps advanced detail behind clear progressive disclosure', () => {
  const source = readFileSync(new URL('../src/components/CatalogHealthView.tsx', import.meta.url), 'utf8');

  assert.match(source, /Your audit summary/);
  assert.match(source, /No confirmed storefront errors found/);
  assert.match(source, /Suggested improvements/);
  assert.match(source, /How this score is calculated/);
  assert.match(source, /Unverified fields don&apos;t lower your score/);
  assert.match(source, /Filter findings/);
  assert.match(source, /Review GTINs/);
  assert.match(source, /Review suggestions/);
  assert.doesNotMatch(source.slice(source.indexOf('Merchant-facing findings'), source.indexOf('Flagged Product Samples')), />Inspect</);
});

test('readiness unions pass through and older audits get a null fallback', () => {
  const withReadiness = JSON.parse(JSON.stringify(engineReport));
  withReadiness.payload.audit.readiness = {
    scannedProducts: 242,
    affectedProducts: 200,
    readyProducts: 42,
    totalFindings: 364,
    blocker: { findings: 3, products: 3 },
    attention: { findings: 119, products: 110 },
    verification: { findings: 242, products: 242 },
  };
  const mapped = mapEngineReportToStoreAudit(withReadiness, 'example.myshopify.com', 'a2');
  assert.equal(mapped.readiness.affectedProducts, 200);
  assert.equal(mapped.readiness.verification.findings, 242);

  const legacy = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  assert.equal(legacy.readiness, null);
});

test('evidence truncation is explicit instead of silently capped', () => {
  const data = mapEngineReportToStoreAudit(engineReport, 'example.myshopify.com', 'a1');
  const gtin = data.issues.find((i) => i.id === 'issue-gtin_status_unverified');
  assert.equal(gtin.count, 242);
  assert.equal(gtin.affectedItems.length, 1);
  assert.equal(gtin.evidenceTruncated, true);
  const untruncated = JSON.parse(JSON.stringify(engineReport));
  untruncated.payload.audit.issues = [{
    type: 'no_images', classification: 'eligibility_blocker', priority: 'high',
    title: 'No product images', rule: '0 images.', count: 1,
    affectedProducts: ['gid://shopify/Product/3'], status: 'observed', confidence: 'high',
    source: 'public_storefront', evidence: [{ productId: 'gid://shopify/Product/3', observed: '0 images', expected: 'At least one image' }],
  }];
  const clean = mapEngineReportToStoreAudit(untruncated, 'example.myshopify.com', 'a3');
  assert.equal(clean.issues[0].evidenceTruncated, false);
});
