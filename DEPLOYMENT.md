# SKUcoverage deployment

Production uses two Cloudflare projects for `skucoverage.tech`:

1. **Worker API**: the existing `skucoverage121` Worker, built from the repository root and routed to `api.skucoverage.tech`.
2. **Pages frontend**: a separate Pages project that publishes `cloudflare-pages/` at `skucoverage.tech`. The landing page is `/` and the Vite dashboard is `/app/`.

Do not attach either production domain until both projects deploy successfully on their Cloudflare preview URLs.

## GitHub Actions deployment (recommended)

`.github/workflows/cloudflare-deploy.yml` deploys both projects on every push to `main` (or manually via Actions -> Deploy to Cloudflare -> Run workflow):

- **worker** job: typechecks and runs `npx wrangler deploy` for `skucoverage121`.
- **pages** job: rebuilds the dashboard with the production environment variables, creates the Pages project `skucoverage-web` if missing, and publishes `cloudflare-pages/` to it.

One-time setup:

1. Delete any Worker-style project named `skucoverage-web` in the Cloudflare dashboard (Workers & Pages list). The Git-connected `skucoverage-web` project created earlier builds the API Worker with `npx wrangler deploy`; it is not the static frontend and must not stay connected. The workflow recreates `skucoverage-web` as a real Pages project on the first run.
2. In GitHub: repository Settings -> Secrets and variables -> Actions -> New repository secret:
   - `CLOUDFLARE_API_TOKEN`: a custom Cloudflare token with Account: Workers Scripts Edit, Cloudflare Pages Edit, and Account Settings Read on this one account (the existing `SKUcoverage deploy` token already covers this).
   - `CLOUDFLARE_ACCOUNT_ID`: the account ID shown on the Workers & Pages overview sidebar.
3. Push to `main` or run the workflow manually. Both jobs should go green; the Pages job output prints the `skucoverage-web.pages.dev` preview URL.

Worker secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CSV_SIGNING_SECRET`, ...) stay in Cloudflare; `wrangler deploy` does not remove them. The dashboard Git build on `skucoverage121` can be disconnected once the Actions workflow is green, so only one system deploys on push.

The dashboard build bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` into the bundle. Without them the committed dashboard renders but auth stays disabled (`supabase = null`), so never deploy a bundle built without them.

## Build the committed frontend

The dashboard source lives in `skufrontend/app/`. Its production API default is `https://api.skucoverage.tech` and the built files are committed under `cloudflare-pages/app/`.

```sh
npm ci
npm --prefix skufrontend/app ci
VITE_API_BASE_URL=https://api.skucoverage.tech npm run build:app
```

`build:app` copies the Vite output into `cloudflare-pages/app/`. Before committing, confirm no production asset references the dev API or the old `.com` domain (the Supabase client library legitimately contains generic `localhost` strings):

```sh
rg -n '127\.0\.0\.1:8787|api\.skucoverage\.com' cloudflare-pages/app
```

For local dashboard development only, explicitly set `VITE_API_BASE_URL=http://127.0.0.1:8787` in an uncommitted `.env.local`.

## Project 1: Worker API (`skucoverage121`)

Connect `rifashahath/skucoverage` to the existing Cloudflare Worker project and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm ci && npm run typecheck --if-present` |
| Deploy command | `npx wrangler deploy` |
| Wrangler file | `wrangler.toml` |

`wrangler.toml` intentionally uses `name = "skucoverage121"` so Git deployments update this project instead of creating or targeting another Worker.

Required bindings:

- D1 binding `DB` -> database `skucoverage-prod` (`25c19793-a518-4f1b-8c56-69ca9ef60417`)
- Cron trigger `0 8 * * 1`

The initial Worker deploy intentionally has no R2 binding, so it succeeds without enabling R2 or adding payment details. CSV export still works: reports are stored in D1 and the Worker generates the signed CSV response on demand. What is disabled is only R2-backed storage and retrieval of pre-generated CSV objects; no dashboard export control needs to be hidden.

To add optional R2 storage later, enable R2, create `skucoverage-files`, then restore this block to `wrangler.toml` and redeploy:

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "skucoverage-files"
```

The Worker code treats `R2` as optional and automatically starts writing new audit CSV objects after the binding exists. Existing D1-backed reports keep exporting through the fallback path.

Required Worker secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CSV_SIGNING_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_19`
- `STRIPE_PRICE_39`
- `BREVO_API_KEY`

The non-secret production values in `wrangler.toml` allow `https://skucoverage.tech`, send from `noreply@skucoverage.tech`, and use the existing seven-day CSV URL lifetime.

After the preview Worker succeeds, add the Worker custom domain `api.skucoverage.tech`. Configure Stripe's webhook endpoint as:

`https://api.skucoverage.tech/api/webhook/stripe`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Apply the existing D1 schema only when needed:

```sh
npx wrangler d1 execute skucoverage-prod --remote --file=schema.sql
```

## Project 2: Pages frontend

Create a separate Cloudflare Pages project connected to the same repository. Do not reuse the Worker project.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm ci && npm --prefix skufrontend/app ci && VITE_API_BASE_URL=https://api.skucoverage.tech npm run build:app` |
| Build output directory | `cloudflare-pages` |
| Deploy command | Pages default (leave blank) |
| Framework preset | `None` |
| Node version | `20` or newer |

The checked-in `cloudflare-pages/_redirects` supplies the dashboard SPA fallback under `/app/`.

After the Pages preview works, attach `skucoverage.tech` to this Pages project. Do not attach `api.skucoverage.tech` to Pages.

## Supabase URLs

Under Authentication -> URL Configuration:

- Site URL: `https://skucoverage.tech/app/`
- Redirect URLs:
  - `https://skucoverage.tech/app/**`
  - the Pages preview URL under `/app/**`
  - `http://localhost:5173/**` for local development only

## Verification before changing DNS

```sh
# Typecheck Worker
npx tsc --noEmit

# Engine tests
npm --prefix skucoverage-engine ci
npm --prefix skucoverage-engine test

# Frontend lint and production build
npm --prefix skufrontend/app run lint
VITE_API_BASE_URL=https://api.skucoverage.tech npm run build:app

# Confirm production assets have no local or old-domain API URL
! rg -n '127\.0\.0\.1:8787|api\.skucoverage\.com' cloudflare-pages/app
```

Once preview deployments pass, smoke-test the preview endpoints. Only then connect `api.skucoverage.tech` to the Worker and `skucoverage.tech` to Pages.
