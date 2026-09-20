import type { Env } from '../types';

export interface IssueFixMapping {
  currentState: string;
  suggestedFix: string;
}

export const ISSUE_FIX_MAP: Record<string, IssueFixMapping> = {
  missing_title: {
    currentState: 'Missing product title',
    suggestedFix: 'Add a clear product title (Brand + Product Type + Key attributes, 40-150 chars)',
  },
  missing_gtin: {
    currentState: 'No barcode',
    suggestedFix: 'Add the genuine manufacturer GTIN in Shopify when one exists; otherwise review identifier_exists rules in the destination channel',
  },
  invalid_gtin: {
    currentState: 'Invalid GTIN format',
    suggestedFix: 'Verify the value against packaging, supplier data, or your GS1 record. Length and checksum confirm format only',
  },
  no_images: {
    currentState: 'No images',
    suggestedFix: 'Upload at least 1 high-resolution product image',
  },
  missing_images: {
    currentState: 'No images',
    suggestedFix: 'Upload at least 1 high-resolution product image',
  },
  too_few_images: {
    currentState: 'Insufficient images (only 1-2 photos)',
    suggestedFix: 'Add 2-3 more images showing different angles, scale, or details',
  },
  insufficient_images: {
    currentState: 'Insufficient images (only 1-2 photos)',
    suggestedFix: 'Add 2-3 more images showing different angles, scale, or details',
  },
  title_too_short: {
    currentState: 'Title too short (<20 characters)',
    suggestedFix: 'Rewrite: Brand + Product Type + Key attribute, 40-150 chars',
  },
  incomplete_title: {
    currentState: 'Title too short or missing product type',
    suggestedFix: 'Rewrite: Brand + Product Type + Key attribute, 40-150 chars',
  },
  title_incomplete: {
    currentState: 'Title too short or missing product type',
    suggestedFix: 'Rewrite: Brand + Product Type + Key attribute, 40-150 chars',
  },
  title_too_long: {
    currentState: 'Title too long (>150 characters)',
    suggestedFix: 'Shorten title to under 150 chars to avoid search and feed truncation',
  },
  missing_description: {
    currentState: 'Missing description',
    suggestedFix: 'Add detailed description (100+ chars) covering material, features, and specs',
  },
  incomplete_description: {
    currentState: 'Thin description',
    suggestedFix: 'Add 100+ chars incl. material, size, color, use case',
  },
  description_incomplete: {
    currentState: 'Thin description',
    suggestedFix: 'Add 100+ chars incl. material, size, color, use case',
  },
  variants_as_products: {
    currentState: 'Variants split as separate products',
    suggestedFix: 'Merge duplicate color/size listings into variant options under one parent product',
  },
  duplicate_variant_titles: {
    currentState: 'Duplicate variant options or titles',
    suggestedFix: 'Give unique titles and distinct SKUs to variants',
  },
  missing_brand: {
    currentState: 'Missing brand/vendor',
    suggestedFix: 'Set vendor/brand field in Shopify for AI search and Google Shopping eligibility',
  },
  missing_sku: {
    currentState: 'Missing SKU',
    suggestedFix: 'Assign unique SKU to each product/variant for inventory tracking',
  },
  missing_category: {
    currentState: 'Missing category',
    suggestedFix: 'Assign Shopify Standard Product Taxonomy category',
  },
  generic_category: {
    currentState: 'Generic category',
    suggestedFix: 'Replace broad category with deep taxonomy path',
  },
  duplicate_category_levels: {
    currentState: 'Duplicate category levels',
    suggestedFix: 'Clean up repeated category levels into standard Shopify taxonomy path',
  },
};

/**
 * Neutralises spreadsheet formula injection.
 *
 * Excel, Sheets and LibreOffice evaluate any cell whose first character is
 * one of = + - @ or a leading tab / carriage return, even inside a quoted CSV
 * field. Product titles and vendor names come straight from a merchant's
 * storefront, so they are untrusted input. Prefixing with an apostrophe keeps
 * the text readable while forcing the cell to be treated as literal.
 */
export function neutralizeFormula(value: string): string {
  if (value === '') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function buildAuditCsv(report: Record<string, unknown>): string {
  const audit = (report.payload as Record<string, unknown> | undefined)?.audit as Record<string, unknown> | undefined;
  const issues = Array.isArray(audit?.issues) ? audit.issues as Array<Record<string, unknown>> : [];

  const escape = (value: unknown) => `"${neutralizeFormula(String(value ?? '')).replaceAll('"', '""')}"`;

  // Section 1: Summary
  const summaryHeader = ['IssueType', 'Count', 'Priority', 'PercentOfCatalog', 'Impact'];
  const summaryRows = issues.map((issue) => [
    issue.type,
    issue.count,
    issue.priority,
    issue.percentOfCatalog !== undefined && issue.percentOfCatalog !== null ? `${issue.percentOfCatalog}%` : '',
    issue.impact,
  ]);

  // Section 2: Fix list. Product URLs come from the engine evidence (paths
  // on the scanned storefront); they are absolutized against the scanned
  // store host so a merchant can open the exact product from the CSV.
  const storeId = (report.payload as Record<string, unknown> | undefined)?.storeId;
  const storeHost = typeof storeId === 'string' && storeId.includes('.') ? `https://${storeId.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}` : '';
  const toAbsoluteUrl = (value: unknown): string => {
    const url = String(value ?? '');
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (!storeHost) return url;
    try {
      return new URL(url, storeHost).toString();
    } catch {
      return url;
    }
  };
  const fixListHeader = ['ProductId', 'ProductUrl', 'Variant', 'Issue', 'Priority', 'CurrentState', 'SuggestedFix'];
  const fixRows: Array<unknown[]> = [];

  for (const issue of issues) {
    const issueType = String(issue.type ?? '');
    const priority = issue.priority;
    const mapping = ISSUE_FIX_MAP[issueType] ?? {
      currentState: `${issueType.replace(/_/g, ' ')} detected`,
      suggestedFix: typeof issue.impact === 'string' && issue.impact ? `Fix issue to improve ${issue.impact}` : 'Review and update product details in Shopify',
    };

    const evidenceById = new Map<string, Record<string, unknown>>();
    const evidence = Array.isArray(issue.evidence) ? issue.evidence as Array<Record<string, unknown>> : [];
    for (const item of evidence) {
      const evidenceId = String(item?.productId ?? '');
      if (evidenceId) evidenceById.set(evidenceId, item);
    }

    const affected = Array.isArray(issue.affectedProducts) ? issue.affectedProducts : [];
    for (const productId of affected) {
      const itemEvidence = evidenceById.get(String(productId));
      fixRows.push([
        productId,
        toAbsoluteUrl(itemEvidence?.productUrl),
        itemEvidence?.variant ?? '',
        issueType,
        priority,
        mapping.currentState,
        mapping.suggestedFix,
      ]);
    }
  }

  const lines = [
    summaryHeader.map(escape).join(','),
    ...summaryRows.map((row) => row.map(escape).join(',')),
    '',
    fixListHeader.map(escape).join(','),
    ...fixRows.map((row) => row.map(escape).join(',')),
  ];

  return lines.join('\n') + '\n';
}

export async function uploadAuditCsv(env: Env, auditId: string, report: Record<string, unknown>): Promise<string> {
  if (!env.R2) throw new Error('R2 storage is not configured');
  const csv = buildAuditCsv(report);
  const key = `audits/${auditId}.csv`;
  await env.R2.put(key, csv, { httpMetadata: { contentType: 'text/csv; charset=utf-8' } });
  return key;
}

export async function signedCsvUrl(env: Env, key: string, auditId: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + Number(env.CSV_URL_TTL_SECONDS ?? 604800);
  const token = await sign(`${auditId}:${expires}`, env.CSV_SIGNING_SECRET);
  return `/api/audit/${encodeURIComponent(auditId)}/csv?expires=${expires}&signature=${encodeURIComponent(token)}`;
}

export async function verifyDownloadSignature(secret: string, auditId: string, expires: number, signature: string): Promise<boolean> {
  if (expires < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`${auditId}:${expires}`, secret);
  return timingSafeEqual(expected, signature);
}

/**
 * Compares two strings in time proportional to their length rather than to
 * the length of their common prefix. A plain === leaks, byte by byte, how much
 * of a guessed signature was correct.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
