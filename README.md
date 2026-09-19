# SKUcoverage 🚀

> **The Precision Catalog Health & Compliance Engine for Shopify DTC Brands**  
> Automated Google Merchant Center (GMC) compliance, GS1 Modulo-10 barcode auditing, Google 2025 Taxonomy mapping, and 1-click Shopify remediation.

---

## 🌟 Highlights

- **Zero-Friction Store Audits**: Audits public Shopify storefront catalogs (`/products.json`) in seconds without requiring apps, API keys, or OAuth permissions.
- **GS1 Modulo-10 Verification**: Validates GTIN-8, UPC-A (GTIN-12), EAN-13, and GTIN-14 barcodes with mathematical check-digit verification.
- **Google Taxonomy Breadcrumbs**: Maps generic and unassigned store collections to official Google Merchant Center taxonomies.
- **Export & Remediation Matrix**: Generates Shopify-compatible CSV matrices to instantly resolve feed deficiencies.
- **Serverless & Edge-Native**: Powered by Cloudflare Workers (Hono), Cloudflare D1 (SQLite), and Cloudflare R2 object storage.

---

## 🏗️ Architecture

SKUcoverage is structured as a modular monorepo:

```
├── src/                  # Cloudflare Worker API backend (Hono + TypeScript)
│   ├── index.ts          # Edge entry point & route definitions
│   ├── routes/           # API routes (audits, subscriptions, webhooks)
│   └── services/         # Shopify crawler, D1 data layer, storage, email
├── skucoverage-engine/   # Pure TypeScript deterministic diagnostic engine
│   ├── src/              # GS1 checksums, rule evaluators, scoring models
│   └── test/             # Comprehensive 57+ unit and regression test suite
├── skufrontend/          # Frontend applications & UI suite
│   └── app/              # React 19 + Vite + Tailwind CSS dashboard SPA
├── cloudflare-pages/     # Static marketing landing page & built SPA deployment
├── supabase/             # Authentication & user database migration scripts
├── schema.sql            # Cloudflare D1 database schema
└── wrangler.toml         # Cloudflare Workers configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler` or `npx wrangler`)

### 2. Installation

Install all required dependencies:

```bash
npm install
npm --prefix skucoverage-engine install
npm --prefix skufrontend/app install
```

### 3. Environment Setup

Copy example environment variables:

```bash
cp .env.example .dev.vars
cp skufrontend/app/.env.example skufrontend/app/.env.local
```

### 4. Initialize Local Database

Set up local Cloudflare D1 SQLite database tables:

```bash
npx wrangler d1 execute skucoverage-prod --local --file=schema.sql
```

### 5. Running in Development

Start the backend API worker:
```bash
npm run dev
# Running on http://127.0.0.1:8787
```

In a separate terminal, start the frontend Vite development server:
```bash
npm --prefix skufrontend/app run dev
# Running on http://127.0.0.1:5173/app/
```

Or serve the complete production landing page and SPA preview:
```bash
python3 -m http.server 3000 --directory cloudflare-pages
# Running on http://127.0.0.1:3000
```

---

## 🧪 Testing

Run the full diagnostic engine verification and regression test suite:

```bash
npm --prefix skucoverage-engine test
```

Typecheck the codebase:

```bash
npx tsc --noEmit
```

---

## 📦 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment instructions covering Cloudflare Workers, Cloudflare Pages, Supabase Auth, and Stripe webhooks.

---

## 📄 License

Private / Proprietary. All rights reserved.
