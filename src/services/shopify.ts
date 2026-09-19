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

/**
 * Accepts the forms merchants actually paste: bare host, host with scheme,
 * host with a path, host with a trailing slash, and mixed case.
 */
export function normalizeStoreHost(value: string): string {
  const input = String(value ?? '').trim();
  if (input === '') throw new ShopifyFetchError('invalid_store_url', 'Store URL is required.', 400);
  if (input.length > 253) throw new ShopifyFetchError('invalid_store_url', 'Store URL is too long.', 400);

  let url: URL;
  try {
    url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
  } catch {
    throw new ShopifyFetchError('invalid_store_url', 'Store URL is not a valid domain.', 400);
  }

  assertAllowedShopifyUrl(url);
  return url.hostname.toLowerCase();
}

/**
 * Single choke point for the SSRF policy.
 *
 * The allow-list is the real control: only `*.myshopify.com` over HTTPS can
 * ever be requested, which structurally excludes localhost, private ranges,
 * link-local addresses and cloud metadata endpoints. The explicit denies below
 * are defence in depth and produce clearer errors.
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

  if (host.startsWith('[') || host.includes(':')) {
    throw new ShopifyFetchError('invalid_store_url', 'IP literals cannot be scanned.', 400);
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new ShopifyFetchError('invalid_store_url', 'IP addresses cannot be scanned.', 400);
  }

  // The allow-list. `*.myshopify.com` only, and the subdomain label must be a
  // single valid shop handle so that `evil.com#.myshopify.com` style inputs and
  // nested hosts are rejected.
  const suffix = '.myshopify.com';
  if (!host.endsWith(suffix)) {
    throw new ShopifyFetchError(
      'unsupported_domain',
      'Only myshopify.com storefronts can be scanned. Enter your store as your-store.myshopify.com.',
      400,
    );
  }
  const handle = host.slice(0, -suffix.length);
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(handle)) {
    throw new ShopifyFetchError(
      'unsupported_domain',
      'That does not look like a valid myshopify.com store handle.',
      400,
    );
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
