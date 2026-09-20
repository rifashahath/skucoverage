/**
 * Channel-readiness presentation model.
 *
 * The status mapping mirrors getReadinessStatus in
 * skucoverage-engine/src/engine.ts (the engine ships exact readiness unions
 * in `audit.readiness`; this file mirrors the labels and provides a fallback
 * for audits cached before that field existed). Needs verification always
 * wins over the issue class: a signal the public source cannot confirm (for
 * example no GTIN visible on the storefront) is never a blocker and never a
 * confirmed problem.
 */

const FIELD_META = {
  gtin: { label: 'Product identifiers', icon: 'qr_code_2', channels: ['google', 'meta'] },
  'alt-text': { label: 'Images and alt text', icon: 'image', channels: ['google', 'meta'] },
  description: { label: 'Descriptions', icon: 'subject', channels: ['google', 'meta'] },
  category: { label: 'Product categories', icon: 'account_tree', channels: ['google', 'meta'] },
  sku: { label: 'Titles, variants and SKUs', icon: 'inventory_2', channels: ['google', 'meta'] },
};

export const CHANNEL_LABELS = { google: 'Google Shopping', meta: 'Meta catalogs' };

export function getChannelMeta(category) {
  return FIELD_META[category] || FIELD_META.sku;
}

export function getReadinessStatus(issue) {
  if (issue.status === 'needs_verification') return 'verification';
  if (issue.classification === 'eligibility_blocker') return 'blocker';
  return 'attention';
}

export const READINESS_STATUS_META = {
  blocker: {
    label: 'Potential blocker',
    note: 'May prevent listing, syncing or eligibility',
    classes: 'bg-[#ffdad6] text-[#93000a]',
    icon: 'error',
    tone: 'text-[#ba1a1a]',
    bg: 'bg-[#fff0ee]',
  },
  attention: {
    label: 'Needs attention',
    note: 'Improvement recommended; the product may still be usable',
    classes: 'bg-[#ffddb8] text-[#653e00]',
    icon: 'warning',
    tone: 'text-[#825100]',
    bg: 'bg-[#fff4e5]',
  },
  verification: {
    label: 'Needs verification',
    note: 'Cannot be confirmed from public storefront data',
    classes: 'bg-[#d8e2ff] text-[#004395]',
    icon: 'fact_check',
    tone: 'text-[#004395]',
    bg: 'bg-[#eef2ff]',
  },
};

export function getConfidenceLabel(issue) {
  const confidence = issue.confidence || 'medium';
  return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`;
}

export function getSourceLabel(source) {
  if (source === 'public_storefront') return 'Public storefront';
  if (source === 'merchant_center') return 'Merchant Center';
  if (source === 'shopify_admin') return 'Shopify Admin';
  return source || 'Public storefront';
}

export function buildReadinessSignals(auditData) {
  return (auditData.issues || []).map((issue) => {
    const meta = getChannelMeta(issue.category);
    const readinessStatus = getReadinessStatus(issue);
    return {
      ...issue,
      fieldLabel: meta.label,
      icon: meta.icon,
      channels: meta.channels,
      readinessStatus,
      readinessStatusLabel: READINESS_STATUS_META[readinessStatus].label,
      confidenceLabel: getConfidenceLabel(issue),
      sourceLabel: getSourceLabel(issue.source),
      // Within one issue the engine records one finding per affected product,
      // so `count` is both the finding total and the affected-product total
      // for this signal.
      products: issue.count || 0,
      affectedProducts: issue.affectedItems || [],
    };
  });
}

/**
 * Readiness totals for the summary cards.
 *
 * Units are deliberate: `findings` counts finding instances (one flagged
 * field check on one product); `products` counts unique products. One product
 * can carry several findings, so findings outnumber products.
 *
 * Exact unions come from `auditData.readiness`, computed engine-side where
 * every affected id is still visible. The fallback estimates the union from
 * the id lists in the payload (capped per issue) as known unique products
 * plus each issue's unlisted remainder, capped at the scanned count, and marks
 * itself inexact so the UI can say so.
 */
export function getReadinessSummary(auditData) {
  const scanned = auditData.scanned || auditData.productsCount || 0;
  const exact = auditData.readiness;
  if (exact && typeof exact.affectedProducts === 'number') {
    return {
      exact: true,
      scanned: typeof exact.scannedProducts === 'number' ? exact.scannedProducts : scanned,
      totalFindings: exact.totalFindings,
      affectedProducts: exact.affectedProducts,
      ready: exact.readyProducts,
      blocker: exact.blocker,
      attention: exact.attention,
      verification: exact.verification,
    };
  }

  const signals = buildReadinessSignals(auditData);
  const productKey = (item) => item.productUrl || item.sku;
  const bucket = (list) => {
    const known = new Set(list.flatMap((signal) => signal.affectedProducts.map(productKey).filter(Boolean)));
    const unlisted = list.reduce((sum, signal) => sum + Math.max(0, (signal.count || 0) - signal.affectedProducts.length), 0);
    return {
      findings: list.reduce((sum, signal) => sum + (signal.count || 0), 0),
      products: Math.min(scanned, known.size + unlisted),
    };
  };
  const blocker = bucket(signals.filter((signal) => signal.readinessStatus === 'blocker'));
  const attention = bucket(signals.filter((signal) => signal.readinessStatus === 'attention'));
  const verification = bucket(signals.filter((signal) => signal.readinessStatus === 'verification'));
  const knownAll = new Set(signals.flatMap((signal) => signal.affectedProducts.map(productKey).filter(Boolean)));
  const unlistedAll = signals.reduce((sum, signal) => sum + Math.max(0, (signal.count || 0) - signal.affectedProducts.length), 0);
  const affectedProducts = Math.min(scanned, knownAll.size + unlistedAll);
  return {
    exact: false,
    scanned,
    totalFindings: blocker.findings + attention.findings + verification.findings,
    affectedProducts,
    ready: Math.max(0, scanned - affectedProducts),
    blocker,
    attention,
    verification,
  };
}

export function validateGtinFormat(value) {
  const code = String(value || '').trim();
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}
