# SKUcoverage — Production Readiness Fix Pass

This file maps every change in this pass to the finding it resolves in the
audit. The original snapshot is unmodified; all work here is on a copy.

Tests: `45 passed, 0 failed` (existing suite) and `16 passed, 0 failed`
(new regression suite, `skucoverage-engine/test/run-regression-tests.ts`).

---

## P0 — product integrity

### P0-01 Fabricated GTIN export (most serious finding)
`skufrontend/app/src/components/FixExportCenterView.tsx`

The "Download Shopify CSV" button built an import file from four hardcoded
products with four invented barcodes (`084920198421`, `084920198422`,
`071239841249`, `5012345678900`) that had no relationship to the scanned
store. Importing it would have written fabricated GTINs, titles, alt text and
categories over real products.

A GTIN is licensed to a company by GS1. Passing the Modulo-10 check digit only
proves the number is well formed, not that it belongs to you. Publishing
someone else's GTIN to Google Merchant Center misrepresents the product and
can get the account suspended — the exact outcome this product sells itself as
preventing.

**Fix:** the generator is deleted. The button now downloads the real,
server-generated fix list from the actual audit. SKUcoverage never generates
identifier values anywhere in the codebase.

### P0-02 Fake score movement
`skufrontend/app/src/App.jsx`

`handleFixItem` added +2 to the health score, `handleFixAllInIssue` added +3
per item, and `handleBatchFixSelected` hardcoded the result to 92/100 with 14
issues remaining and announced "Health score is now 92/100". No request was
sent anywhere and Shopify was never touched, so the report stopped describing
the store the moment a user clicked anything.

**Fix:** these now build an export list only. The score changes when a re-scan
reads the real catalog, and never before. Copy states this plainly.

### P0-03 / P0-04 Mock data blended into real results
`App.jsx`, `data/mockData.ts` (deleted)

`mapEngineReportToStoreAudit` fell back to mock issues, mock flagged products
and a mock action plan whenever the engine returned none — so a clean catalog
was shown someone else's problems. The default UI state was a complete fake
audit (score 74, 248 products, 89 issues, 32 high priority) visible before any
scan. Hardcoded fallbacks `?? 74`, `?? 248`, `|| 89`, `|| 32`, the six
attribute scores and `'beststore.myshopify.com'` are all removed.

**Fix:** new `data/emptyAudit.js`. Empty means empty; a missing score renders
as nothing rather than a plausible number.

### P0-05 Failure presented as success
`App.jsx`

A failed anonymous scan was caught, discarded, and replaced with a three
second delay followed by "Audit completed! Health score: 74/100". A similar
path set the results stage after a failed status poll.

**Fix:** removed. Errors surface.

### P0-06 GTIN check digit never verified
`skucoverage-engine/src/engine.ts`

`checkGtin` only tested length, so any 12–13 character string passed,
including letters. The core claim of the product was unimplemented.

**Fix:** new exported `hasValidGtinCheckDigit()` implementing the GS1 mod-10
algorithm, restricted to GTIN-8/12/13/14. Nine regression tests cover valid
UPC-A and EAN-13, wrong check digits, transpositions, non-numeric input and
invalid lengths.

### P0-07 Category rule mis-fired on every catalog
`engine.ts`

The rule looked for a generic leaf in a `>`-delimited path, but Shopify's bare
`product_type` contains no `>`, so essentially every product in every real
store was flagged. This inflated issue counts across the board.

**Fix:** three states — generic leaf (25), shallow path under two levels (65),
full path (100).

### P0-08 Upgrade was impossible
`App.jsx`

`handleUpgradeStripe(priceTier)` called `api.subscribe()` without the tier, so
every upgrade reached the backend with no price and failed. Nobody could pay.

**Fix:** the tier is passed.

### P0-09 Unauthenticated store takeover
`src/index.ts`

`POST /api/email/subscribe` requires no authentication but ran
`UPDATE users SET store_url = ? WHERE id = ?` on any existing account matching
the submitted email. Anyone who knew a customer's address could repoint that
customer's store, which then drove their scheduled scans and report emails.

**Fix:** insert-only for new addresses; an existing account is never mutated.
The response is identical either way so the endpoint is not an
account-existence oracle.

### P0-10 Misleading claims
Corrected in UI copy and docs — see "Claims" below.

---

## Engine correctness

- **E-02 title scoring was inverted.** `too_short` scored 0 while `too_long`
  scored 50, so a 39-character title ranked below a 1000-character one. Scores
  are now monotonic: missing 0, too short 25, too long 50, incomplete 60,
  complete 100. Regression-tested.
- **E-05 flat averaging.** All six checks were averaged equally, so a missing
  GTIN cost exactly as much as a slightly short description. Replaced with a
  declared weight distribution (`WEIGHTS`, sums to 100): gtin 30, title 20,
  images 20, category 15, description 10, variants 5. This is a product
  judgement and is documented as one.
- **`identifierExists` was hardcoded to `'yes'`** for every product regardless
  of whether an identifier existed. Now `'unknown'` unless actually known; the
  type union was widened accordingly.
- The `invalid_gtin` recommendation no longer implies a number can be created;
  it states the value must come from the supplier or the merchant's own GS1
  registration.

---

## Security

- **SSRF (S-01).** The scanner accepted arbitrary hostnames. Rewritten
  `src/services/shopify.ts` enforces HTTPS only, rejects credentials in URLs,
  custom ports, IP literals and IPv6, and allow-lists `*.myshopify.com` with a
  strict handle pattern. Redirects use `redirect: 'manual'` and every hop is
  re-validated, capped at 3.
- **Resource exhaustion.** Added a 10s request timeout via `AbortController`,
  an 8 MB streamed response cap, a 40-page pagination ceiling, and bounded
  retries with backoff on 429/5xx only.
- **CSV injection (S-07).** `src/services/storage.ts` and the client exports
  now neutralise leading `= + - @ tab CR`, which spreadsheets execute even
  inside quoted fields. Product titles are merchant-controlled input.
- **Timing attack (S-09).** `verifyDownloadSignature` compared HMACs with
  `===`, leaking how much of a guessed signature was correct. Replaced with a
  constant-time comparison.
- **Error disclosure.** Raw exception text (hostnames, SQL, stack detail) was
  returned to clients on six endpoints. A `clientError()` helper now logs
  server-side and returns generic messages, preserving intentional validation
  messages and their status codes.
- **Rate-limit race (S-11).** The anonymous limiter read then wrote, so
  parallel requests all observed the same count and passed. Replaced with a
  single atomic upsert using `RETURNING`, deciding from the stored value.
  Requests with no trusted client IP are refused rather than pooled into a
  shared `unknown` bucket that any one caller could exhaust for everyone.

---

## Data integrity

- **Primary key mutation orphaned rows.** `PATCH /api/me` ran
  `UPDATE users SET id = ?` with no corresponding update to `audits.user_id`,
  silently detaching a user's entire history. Now a `DB.batch` moves the child
  rows in the same transaction.
- **Missing indexes.** Added `audits(user_id, created_at DESC)` — the quota
  check and history query both used it and scanned full history —
  plus `audits(status)`, `subscriptions(user_id)` and
  `scan_rate_limits(window_start)`.

---

## Entitlements

- **Paying customers were capped at the free limit.** `fetchShopifyProducts`
  was called with a hardcoded `100` on every path, so a $39 subscriber scanned
  the same 100 SKUs as a free user. Plan limits are now declared once
  (`PLAN_SCAN_LIMITS`) and threaded through every audit entry point including
  the weekly cron.
- **Three endpoints were unmetered.** `/api/audit/seo`,
  `/api/audit/ai-readiness` and `/api/audit/weekly` enforced no quota at all —
  unlimited free compute for any signed-in account. All now run through
  `checkDailyQuota`, and weekly tracking is correctly gated to paid plans.

---

## Claims

Wording corrected to match what the system can actually demonstrate:

- "Valid GS1 checksum. Accepted by Google Shopping" → states that a valid
  check digit means the number is well formed, **not** that it is registered
  to the product.
- "Auto-Assign All Barcodes" / "Assign Barcode" → "Add to fix list". Nothing
  is assigned, because nothing can honestly be assigned.
- "all barcodes… will update automatically" → explains that GTINs must come
  from the supplier or the merchant's GS1 registration.
- Invented uplift figures on the action plan (`+22% Traffic`, `+11% SEO CTR`,
  `-14% CPC Spend`) removed. No model behind them existed.

---

## Hygiene

- Deleted `archive/` (31 dead `.cjs` files), the duplicate `innerpages/` tree,
  21 stale prebuilt bundles in `cloudflare-pages/app/assets/`,
  `skufrontend/server.js`, `skufrontend/card1_raw.js`, and `data/mockData.ts`.
- Dropped the unused `cheerio` dependency.
- `.dev.vars`, `.env*` and `.wrangler/` added to `.gitignore`.

---

## Corrected test fixture

`test/fixtures.json` asserted that product `prod_2` was clean while giving it
the GTIN `1234567890123`, whose correct check digit is 8. The fixture value
was wrong, not the rule; it now reads `1234567890128`. This is worth noting
because the previous "60 tests passed" included assertions that a fabricated
barcode was valid.

---

## Not done, deliberately

- **Payment integration untouched**, per instruction. Analysis only.
- **No write path to Shopify was added.** The product currently cannot modify
  a merchant's catalog, and the remediation flow is now honest about that.
  Whether "fix" should ever mean writing to Shopify is the single biggest open
  product decision and needs a human answer before it is built.
- **`npx tsc --noEmit` could not be run** — `node_modules` was excluded from
  the uploaded archive, so `@cloudflare/workers-types` is unresolvable in this
  sandbox. Run `npm install && npx tsc --noEmit` locally to confirm. All
  changes are type-consistent by inspection; the engine suite executes cleanly
  under `tsx`, which type-strips rather than type-checks.
