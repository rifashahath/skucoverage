# SKUcoverage deployment

## Architecture

- Deploy `cloudflare-pages/` as the frontend static directory. The dashboard is served from `/app/`.
- Deploy the Worker in this repository as the API, ideally on `api.skucoverage.com`.
- Set `VITE_API_BASE_URL=https://api.skucoverage.com` when building the dashboard.
- Use Supabase for authentication and run `supabase/migrations/20260912140000_create_users_rls.sql` in that project.

## Production checklist (done)

- [x] **D1 Database verified & schema applied** (2026-09-13):
  - Database: `skucoverage-prod` (UUID: `25c19793-a518-4f1b-8c56-69ca9ef60417`)
  - Schema executed remotely (`schema.sql`): `users`, `subscriptions`, `audits`, `scan_rate_limits` created with unique index `users_email_lower_idx`.
- [x] **Base Worker Secrets configured** (2026-09-13):
  - `SUPABASE_URL` -> configured
  - `SUPABASE_ANON_KEY` -> configured
  - `CSV_SIGNING_SECRET` -> generated 32-byte secret and uploaded
- [x] **Frontend App Built & Pages Deployed** (2026-09-13):
  - Built with Vite 8 + React 19 to `cloudflare-pages/app/`.
  - Bundle verified to reference `https://api.skucoverage.com`.
  - Deployed to Cloudflare Pages: `https://skucoverage.pages.dev` / `https://skucoverage.pages.dev/app/`.
- [x] **Engine Unit Tests verified** (2026-09-13):
  - All 45 tests passing in `skucoverage-engine`.
- [x] **TypeScript compilation verified** (2026-09-13):
  - `npx tsc --noEmit` passes with 0 errors.

## Manual Steps Remaining

### 1. Cloudflare R2 Activation & Bucket Creation
Cloudflare requires enabling R2 once in the dashboard:
1. Visit: [Cloudflare R2 Dashboard](https://dash.cloudflare.com/6476cf669b35b8ba61d2ab5d25089ce4/r2/overview)
2. Click **Enable R2** (confirm account setup / payment details if required by Cloudflare).
3. Run in terminal:
   ```sh
   npx wrangler r2 bucket create skucoverage-files
   npx wrangler deploy
   ```

### 2. Stripe Configuration & Secrets
1. In the Stripe Dashboard:
   - Create Product 1: **SKUcoverage Pro** at `$19.00 / month` (recurring). Copy price ID (e.g. `price_...`).
   - Create Product 2: **SKUcoverage Scale** at `$39.00 / month` (recurring). Copy price ID (e.g. `price_...`).
   - Add Webhook Endpoint: `https://api.skucoverage.com/api/webhook/stripe` (or `https://skucoverage-backend.jass-products.workers.dev/api/webhook/stripe` until custom domain is routed).
     - Events to select:
       - `checkout.session.completed`
       - `customer.subscription.updated`
       - `customer.subscription.deleted`
     - Copy the Signing Secret (`whsec_...`).
2. Run in terminal:
   ```sh
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put STRIPE_PRICE_19
   npx wrangler secret put STRIPE_PRICE_39
   npx wrangler secret put BREVO_API_KEY
   ```

### 3. Supabase Setup
1. Open your Supabase SQL Editor:
   - Run `supabase/migrations/20260912140000_create_users_rls.sql`.
2. Under **Authentication -> Providers**:
   - Enable **Email**.
   - Disable **Confirm email** for instant self-serve onboarding.
3. Under **Authentication -> URL Configuration**:
   - **Site URL**: `https://app.skucoverage.com`
   - **Redirect URLs**:
     - `https://app.skucoverage.com/**`
     - `https://app.skucoverage.com/login`
     - `https://skucoverage.pages.dev/**`
     - `https://skucoverage.pages.dev/app/**`
     - `http://localhost:5173/**`

### 4. Custom Domains (DNS & Cloudflare Routing)
1. **API Worker**: Under Cloudflare Dashboard -> Workers & Pages -> `skucoverage-backend` -> Settings -> Domains & Routes -> Add Custom Domain `api.skucoverage.com`.
2. **Frontend Pages**: Under Cloudflare Dashboard -> Workers & Pages -> `skucoverage` -> Custom Domains -> Add `app.skucoverage.com` and `skucoverage.com`.

### 5. Verification & Live Smoke Tests
Once deployed:
```sh
# 1. Health check
curl -s https://api.skucoverage.com/api/health

# 2. Anonymous scan
curl -s -X POST https://api.skucoverage.com/api/audit/anonymous \
  -H "Content-Type: application/json" \
  -d '{"storeUrl":"bulletproof.myshopify.com"}'

# 3. Check audits in D1
npx wrangler d1 execute skucoverage-prod --command="SELECT count(*) FROM audits;" --remote

# 4. Email subscription
curl -s -X POST https://api.skucoverage.com/api/email/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","storeUrl":"bulletproof.myshopify.com"}'

# 5. Check users in D1
npx wrangler d1 execute skucoverage-prod --command="SELECT * FROM users WHERE email='test@example.com';" --remote
```
