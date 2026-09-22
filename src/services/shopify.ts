import type { ShopifyProduct } from '../types';

/**
 * Hard limits. Every one of these exists because the previous implementation
 * had an unbounded loop over an attacker-supplied host and could hang or
 * exhaust the Worker's CPU/memory budget.
 */
const PAGE_SIZE = 250;
const MAX_PAGES = 40; // 40 * 250 = 10,000 products
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024; // 8 MB per page
const MAX_REDIRECTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

export class ShopifyFetchError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = 'ShopifyFetchError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchShopifyProducts(storeUrl: string, limit = 10000): Promise<ShopifyProduct[]> {
  const host = normalizeStoreHost(storeUrl);
  const products: ShopifyProduct[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES && products.length < limit; page += 1) {
    const body = await fetchProductsPage(host, page);
    const batch = Array.isArray(body.products) ? body.products : [];

    for (const product of batch) {
      const mapped = mapProduct(product);
      // Shopify pagination can repeat products when the catalog mutates
      // mid-scan. Counting a product twice would distort every percentage in
      // the report, so de-duplicate on id.
      if (mapped.id && seenIds.has(mapped.id)) continue;
      if (mapped.id) seenIds.add(mapped.id);
      products.push(mapped);
      if (products.length >= limit) break;
    }

    if (batch.length < PAGE_SIZE) break;
  }

  if (products.length === 0) {
    throw new ShopifyFetchError(
      'empty_catalog',
      'No public products were returned by this storefront. The store may be password protected, unpublished, or have an empty catalog.',
      422,
    );
  }

  return products.slice(0, limit);
}

async function fetchProductsPage(host: string, page: number): Promise<{ products?: Array<Record<string, unknown>> }> {
  let lastError: ShopifyFetchError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchFollowingSafeRedirects(
        `https://${host}/products.json?limit=${PAGE_SIZE}&page=${page}`,
      );

      if (response.status === 404) {
        throw new ShopifyFetchError(
          'not_shopify',
          'This domain did not return a Shopify product feed. Check that it is a live Shopify storefront.',
          422,
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new ShopifyFetchError(
          'storefront_protected',
          'This storefront is password protected, so its catalog cannot be read publicly.',
          422,
        );
      }
      if (!response.ok) {
        throw new ShopifyFetchError(
          'upstream_error',
          `Shopify returned HTTP ${response.status}.`,
          RETRYABLE_STATUS.has(response.status) ? 502 : 422,
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json')) {
        throw new ShopifyFetchError(
          'not_shopify',
          'The storefront responded with HTML instead of a product feed, so it is not a readable Shopify catalog.',
          422,
        );
      }

      const text = await readCapped(response);
      try {
        const parsed = JSON.parse(text) as { products?: Array<Record<string, unknown>> };
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
          throw new Error('shape');
        }
        return parsed;
      } catch {
        throw new ShopifyFetchError(
          'malformed_feed',
          'The storefront returned a product feed that could not be parsed.',
          422,
        );
      }
    } catch (error) {
      const err =
        error instanceof ShopifyFetchError
          ? error
          : new ShopifyFetchError('network_error', 'Could not reach the storefront.', 502);

      // Only transient transport/upstream failures are worth retrying. A
      // password-protected store will stay password protected.
      const retryable = err.status === 502 && attempt < MAX_ATTEMPTS;
      lastError = err;
      if (!retryable) throw err;
      await sleep(250 * attempt);
    }
  }

  throw lastError ?? new ShopifyFetchError('network_error', 'Could not reach the storefront.', 502);
}

/**
 * Follows redirects manually so that every hop is re-validated against the
 * allowed-host rule. `fetch`'s automatic redirect following would let a
 * storefront bounce us to an internal or attacker-controlled host.
 */
async function fetchFollowingSafeRedirects(startUrl: string): Promise<Response> {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetchWithTimeout(url);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      const next = new URL(location, url);
      // Re-run the full hostname policy on the redirect target.
      assertAllowedShopifyUrl(next);
      url = next.toString();
      continue;
    }

    return response;
  }

  throw new ShopifyFetchError('too_many_redirects', 'The storefront redirected too many times.', 422);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'SKUcoverage-Catalog-Auditor/1.0 (+https://skucoverage.tech/bot)',
      },
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new ShopifyFetchError('timeout', 'The storefront did not respond in time.', 504);
    }
    throw new ShopifyFetchError('network_error', 'Could not reach the storefront.', 502);
  } finally {
    clearTimeout(timer);
  }
}

/** Streams the body and aborts if it exceeds the size cap. */
async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_RESPONSE_BYTES) {
    throw new ShopifyFetchError('response_too_large', 'The storefront catalog page was too large to process.', 413);
  }

  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ShopifyFetchError('response_too_large', 'The storefront catalog page was too large to process.', 413);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

const RESERVED_TLDS = new Set([
  'local',
  'localhost',
  'internal',
  'arpa',
  'invalid',
  'test',
  'example',
  'lan',
  'home',
  'corp',
  'onion',
]);

const RESERVED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

/**
 * Accepts the forms merchants actually paste: bare host, host with scheme,
 * host with a path, host with a trailing slash, and mixed case.
 * If user enters shorthand handle (e.g. "gymshark"), auto-appends .myshopify.com.
 */
export function normalizeStoreHost(value: string): string {
  let input = String(value ?? '').trim().toLowerCase();
  if (input === '') throw new ShopifyFetchError('invalid_store_url', 'Store URL is required.', 400);
  if (input.length > 253) throw new ShopifyFetchError('invalid_store_url', 'Store URL is too long.', 400);

  // Strip protocol prefix if present
  input = input.replace(/^https?:\/\//, '');
  // Strip trailing path/query/fragment if present
  input = input.replace(/[\/?#].*$/, '');
  // Strip trailing dots
  input = input.replace(/\.+$/, '').trim();

  // If input is purely numeric or hexadecimal IP representation, reject immediately
  if (/^0x[0-9a-f]+$/i.test(input) || /^\d+$/.test(input)) {
    throw new ShopifyFetchError('invalid_store_url', 'IP addresses cannot be scanned.', 400);
  }

  // If user entered just a handle without dots (e.g. "allbirds"), auto-append .myshopify.com
  if (!input.includes('.')) {
    input = `${input}.myshopify.com`;
  }

  let url: URL;
  try {
    url = new URL(`https://${input}`);
  } catch {
    throw new ShopifyFetchError('invalid_store_url', 'Store URL is not a valid domain.', 400);
  }

  assertAllowedShopifyUrl(url);
  return url.hostname.toLowerCase();
}

/**
 * Single choke point for the SSRF policy.
 *
 * Enforces HTTPS over standard port 443 with no credentials.
 * Structurally excludes localhost, private IP ranges (IPv4 & IPv6),
 * integer/hex IPs, link-local addresses, internal cloud metadata endpoints,
 * and reserved internal TLDs while allowing any valid public FQDN (custom domains or myshopify.com).
 */
export function assertAllowedShopifyUrl(url: URL): void {
  if (url.protocol !== 'https:') {
    throw new ShopifyFetchError('insecure_scheme', 'Only HTTPS storefronts can be scanned.', 400);
  }
  if (url.username || url.password) {
    throw new ShopifyFetchError('invalid_store_url', 'Store URL must not contain credentials.', 400);
  }
  if (url.port && url.port !== '443') {
    throw new ShopifyFetchError('invalid_store_url', 'Store URL must not specify a custom port.', 400);
  }

  const host = url.hostname.toLowerCase();

  // Block IPv6, IP literals, brackets, colons
  if (host.startsWith('[') || host.includes(':')) {
    throw new ShopifyFetchError('invalid_store_url', 'IP literals cannot be scanned.', 400);
  }

  // Block standard IPv4 decimal (e.g. 127.0.0.1, 169.254.169.254)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new ShopifyFetchError('invalid_store_url', 'IP addresses cannot be scanned.', 400);
  }

  // Block integer/hex/octal encoded IP formats (e.g. 2130706433, 0x7f000001, 127.1)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host) || (/^(\d+|0x[0-9a-f]+)(\.(\d+|0x[0-9a-f]+))*$/i.test(host) && !/[a-z]/i.test(host))) {
    throw new ShopifyFetchError('invalid_store_url', 'IP addresses cannot be scanned.', 400);
  }

  // Block known cloud metadata and reserved local hostnames
  if (RESERVED_HOSTNAMES.has(host)) {
    throw new ShopifyFetchError('invalid_store_url', 'Internal hostnames cannot be scanned.', 400);
  }

  // Must be a valid Fully Qualified Domain Name with at least one dot
  if (!host.includes('.')) {
    throw new ShopifyFetchError('invalid_store_url', 'Please enter a valid domain (e.g. store.com or store.myshopify.com).', 400);
  }

  const parts = host.split('.');
  const tld = parts[parts.length - 1];

  // Block reserved / internal TLDs
  if (RESERVED_TLDS.has(tld)) {
    throw new ShopifyFetchError('invalid_store_url', 'Internal domains cannot be scanned.', 400);
  }

  // Validate TLD structure (must be at least 2 alpha characters or internationalized xn--)
  if (!/^[a-z]{2,}$|^xn--[a-z0-9]+$/i.test(tld)) {
    throw new ShopifyFetchError('invalid_store_url', 'Invalid domain top-level extension.', 400);
  }

  // Validate each domain label
  for (const part of parts) {
    if (!part || part.length > 63) {
      throw new ShopifyFetchError('invalid_store_url', 'Invalid domain name structure.', 400);
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(part)) {
      throw new ShopifyFetchError('invalid_store_url', 'Domain contains invalid characters.', 400);
    }
  }
}

function mapProduct(product: Record<string, unknown>): ShopifyProduct {
  const variants = Array.isArray(product.variants) ? (product.variants as Array<Record<string, unknown>>) : [];
  const images = Array.isArray(product.images) ? (product.images as Array<Record<string, unknown>>) : [];

  const firstVariant = variants[0] ?? {};
  const barcode = firstVariant.barcode ? String(firstVariant.barcode).trim() : '';

  return {
    id: String(product.id ?? ''),
    title: String(product.title ?? ''),
    description: stripHtml(String(product.body_html ?? '')).slice(0, 2000),
    gtin: barcode !== '' ? barcode : null,
    category: product.product_type ? String(product.product_type) : null,
    variants: variants.length,
    variantTitles: variants.map((v) => String(v.title ?? '')),
    images: images.length,
    imageAltText: images.length > 0 ? images.every((image) => Boolean(image.alt)) : false,
    brand: product.vendor ? String(product.vendor) : null,
    sku: firstVariant.sku ? String(firstVariant.sku) : null,
    price: firstVariant.price ? String(firstVariant.price) : null,
    availability: product.published_at ? 'in_stock' : 'unknown',
    handle: product.handle ? String(product.handle) : null,
    // The public products.json feed does NOT expose Shopify's
    // "This product has no barcode" flag. Previously this was hardcoded to
    // "yes", which silently asserted that every product is claimed to have a
    // manufacturer identifier. We cannot know that, so report it as unknown and
    // let the engine treat it as undetermined rather than as a fact.
    identifierExists: 'unknown' as const,
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
