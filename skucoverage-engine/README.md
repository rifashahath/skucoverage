# SKUcoverage Audit Engine

Pure-logic audit engine for your site. No HTTP calls, no database access, deterministic
(same input → same output), zero API cost, runs in ~200ms for 10,000 products.

```
src/types.ts       message + product types
src/taxonomy.ts    Shopify Standard Product Taxonomy keyword map + generic-category list
src/engine.ts      all analysis logic + runEngine() dispatcher
test/run-tests.ts  45 assertions (schema, rules, edge cases, determinism, 10k perf)
test/fixtures.json plan's test input
samples/           generated response for every message type
```

## Use it

```ts
import { runEngine } from "./src/engine"

const response = runEngine({
  messageType: "audit_full_catalog",
  requestId: "req_test_001",
  payload: { storeId: "fashion-nova", products: [/* ... */] },
})
// -> { messageType: "audit_result", requestId, payload: { audit: {...} } }
```

Helpers: `auditProducts`, `recommendCategories`, `auditSEO`, `diffAudits`,
`aiReadinessAudit`, and `issuesToCsv(response)` for the R2 CSV export step.

Drop-in replacement for `backend/services/engine.ts` — same function names, no
Anthropic SDK, no `ANTHROPIC_API_KEY`, no JSON-parse failures. Works in Node and
Cloudflare Workers (pure ES modules, no Node APIs in `src/`).

Run tests: `npx tsx test/run-tests.ts`
Run an audit from a file: `npx tsx cli.ts test/fixtures.json`

## Message types

| Input | Output | Payload |
|---|---|---|
| `audit_full_catalog` | `audit_result` | `audit` with `totalProducts`, `score`, `scoreBreakdown`, `issues[]`, `recommendations[]` (max 5), `nextSteps[]` |
| `category_recommend` | `category_recommendations` | `recommendations[]` with `recommendedCategory`, `confidence`, `reason` |
| `seo_audit` | `seo_audit_result` | `seoScore`, `issues[]`, `schemaData` |
| `weekly_diff` | `weekly_diff_result` | `weeklyReport` with `scoreChange`, `trend`, `improved`, `newIssues`, `topRecommendations` |
| `ai_readiness` | `ai_readiness_result` | `aiReadinessScore`, `findings[]`, `readinessLevel`, `recommendation` |

Unknown `messageType` → `{ messageType: "engine_error", requestId, payload: { error, received, supported } }`.

## Scoring (per plan)

Per-product score = average of title, description, GTIN, category, images, variants.
Catalog score = average of product scores. `scoreBreakdown` = per-dimension average.

| Field | 100 | 50 | 0 |
|---|---|---|---|
| Title | ≥40 chars + product type | >150 chars | missing, <20, <40 or no product type |
| Description | ≥100 chars + attribute keyword | — | missing / short / no attributes |
| GTIN | 8–14 digits (or `identifierExists: "no"`) | — | missing / non-numeric / wrong length |
| Category | full taxonomy path (≥2 levels, not generic) | generic or repeated levels | missing |
| Images | ≥3 | 1–2 | 0 |
| Variants | unique variant titles/SKUs | no variants | duplicates or `variantsAsProducts: true` |

Score bands: 90–100 excellent · 75–89 good · 60–74 OK · 40–59 needs work · 0–39 critical.

## Priorities

- **high** — `missing_title`, `missing_gtin`, `invalid_gtin`, `no_images`, `title_too_short` (<20)
- **medium** — `incomplete_title`, `missing_description`, `incomplete_description`, `variants_as_products`, `duplicate_variant_titles`, `missing_brand`
- **low** — `missing_category`, `generic_category`, `duplicate_category_levels`, `too_few_images`, `title_too_long`, `missing_sku`

Issues and recommendations are sorted high → low, then by count. `affectedProducts`
is capped at 200 ids per issue; `count` and `percentOfCatalog` are always exact.

## Optional product fields that unlock more checks

`brand`, `sku`, `price`, `availability`, `handle`, `imageAltText` (boolean),
`variantTitles` (string[]), `variantsAsProducts` (boolean),
`identifierExists` (`"yes"` | `"no"` — GTIN exemption for handmade).

## Edge cases handled

null/empty title · 1000-char title · non-numeric GTIN · `"Clothing > Clothing > Clothing"` ·
0 products (score 0) · 10,000 products · duplicate variant titles · handmade GTIN exemption ·
unknown message type · missing `requestId` (→ `req_unknown`).

## If you still want the LLM engine

Keep this module as the deterministic default and call the model only for judgment
calls (rewriting titles/descriptions, odd categories). You get stable scores, no
per-audit cost, and no JSON-parse retries.
