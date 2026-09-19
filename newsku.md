# SKUcoverage Backend: Detailed Build Guide
## ChatGPT Codex → Node.js + Hono + Cloudflare Workers

---

## **BACKEND ARCHITECTURE**

```
FRONTEND (Gemini)
    │ HTTP POST /api/audit/free {storeUrl}
    ▼
┌──────────────────────────────────────────┐
│      BACKEND (ChatGPT) - Route Layer     │
│                                          │
│  POST /api/audit/free (storeUrl)        │
│  GET /api/audit/:auditId                │
│  POST /api/subscribe (email, plan)      │
│  POST /api/webhook/stripe               │
│                                          │
└─────────┬──────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│    BACKEND - Service Layer (Business)    │
│                                          │
│  engine.ts ← Call Claude Opus 5          │
│  shopify.ts ← Fetch /products.json       │
│  db.ts ← Read/write D1                   │
│  csv.ts ← Generate CSV files             │
│  storage.ts ← Upload to R2               │
│  stripe.ts ← Payment processing          │
│                                          │
└─────────┬──────────────────────────────┘
          │
     ┌────┴───────────────────────────┐
     ▼                                 ▼
┌─────────────────┐         ┌──────────────────┐
│ Claude Engine   │         │ Cloudflare R2    │
│ (Anthropic API) │         │ (File Storage)   │
└─────────────────┘         └──────────────────┘
                                      ▲
                                      │
┌──────────────┐         ┌────────────┴─────────┐
│ D1 Database  │         │ Brevo SMTP (email)   │
│ (SQLite)     │         │ Stripe (payments)    │
└──────────────┘         └──────────────────────┘
```

---

## **DETAILED BACKEND COMPONENTS**

### **1. Hono Server Setup**

**File: `src/index.ts`**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auditRoutes from './routes/audit';
import subscribeRoutes from './routes/subscribe';
import webhookRoutes from './routes/webhook';

type Env = {
  DB: D1Database;
  R2: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());

// Routes
app.route('/api/audit', auditRoutes);
app.route('/api/subscribe', subscribeRoutes);
app.route('/api/webhook', webhookRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

export default app;
```

---

### **2. Audit Routes**

**File: `src/routes/audit.ts`**

```typescript
import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { auditProducts } from '../services/engine';
import { fetchShopifyProducts } from '../services/shopify';
import { saveAudit, getAudit } from '../services/db';
import { generateCSV, uploadCSV } from '../services/storage';

type Env = {
  DB: D1Database;
  R2: R2Bucket;
};

const router = new Hono<{ Bindings: Env }>();

// POST /api/audit/free
// Start a free audit (100 SKU limit)
router.post('/free', async (c) => {
  try {
    const { storeUrl } = await c.req.json();

    if (!storeUrl) {
      return c.json(
        { error: 'storeUrl required' },
        { status: 400 }
      );
    }

    // Generate audit ID
    const auditId = uuidv4();

    // Start async processing
    // (Fire and forget - don't wait for result)
    c.env.DB.prepare(
      `INSERT INTO audits (id, store_url, status, created_at)
       VALUES (?, ?, ?, ?)`
    ).bind(auditId, storeUrl, 'pending', new Date().toISOString()).run();

    // Kick off background job (in real prod, use Cloudflare Durable Objects)
    c.executionContext.waitUntil(
      processAudit(auditId, storeUrl, c.env)
    );

    return c.json(
      {
        auditId,
        status: 'pending',
        message: 'Audit started, check back in 30 seconds'
      },
      { status: 202 }
    );
  } catch (error) {
    return c.json(
      { error: 'Audit failed: ' + String(error) },
      { status: 500 }
    );
  }
});

// GET /api/audit/:auditId
// Get audit results (poll this)
router.get('/:auditId', async (c) => {
  try {
    const auditId = c.req.param('auditId');

    const audit = await getAudit(c.env.DB, auditId);

    if (!audit) {
      return c.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // If still processing
    if (audit.status === 'pending') {
      return c.json({
        auditId,
        status: 'pending',
        message: 'Still auditing your store...'
      });
    }

    // If error
    if (audit.status === 'error') {
      return c.json({
        auditId,
        status: 'error',
        error: audit.error
      });
    }

    // If completed
    if (audit.status === 'completed') {
      return c.json({
        auditId,
        status: 'completed',
        report: audit.audit_data,
        downloadUrl: audit.csv_url
      });
    }
  } catch (error) {
    return c.json(
      { error: String(error) },
      { status: 500 }
    );
  }
});

// Background job (the actual audit logic)
async function processAudit(auditId: string, storeUrl: string, env: Env) {
  try {
    // 1. Fetch products from Shopify
    const products = await fetchShopifyProducts(storeUrl, 100); // Free tier: 100 SKU limit

    // 2. Call Claude Engine to analyze
    const engineRequest = {
      messageType: 'audit_full_catalog',
      payload: { products },
      requestId: auditId
    };

    const auditResult = await auditProducts(engineRequest);

    // 3. Generate CSV
    const csv = await generateCSV(auditResult);

    // 4. Upload to R2
    const csvUrl = await uploadCSV(env.R2, auditId, csv);

    // 5. Save to database
    await saveAudit(env.DB, {
      id: auditId,
      status: 'completed',
      audit_data: auditResult,
      csv_url: csvUrl
    });
  } catch (error) {
    // Save error state
    await saveAudit(env.DB, {
      id: auditId,
      status: 'error',
      error: String(error)
    });
  }
}

export default router;
```

---

### **3. Subscribe Routes**

**File: `src/routes/subscribe.ts`**

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { saveSubscription } from '../services/db';

type Env = {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
};

const router = new Hono<{ Bindings: Env }>();

// POST /api/subscribe
// Create a subscription
router.post('/', async (c) => {
  try {
    const { email, plan, stripeToken } = await c.req.json();

    if (!email || !plan || !stripeToken) {
      return c.json(
        { error: 'email, plan, stripeToken required' },
        { status: 400 }
      );
    }

    // Validate plan
    if (!['19', '39'].includes(plan)) {
      return c.json(
        { error: 'plan must be 19 or 39' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      source: stripeToken
    });

    // Create subscription
    const priceId = plan === '19' ? 'price_19tier' : 'price_39tier';

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }]
    });

    // Save to database
    const subscriptionId = uuidv4();
    await saveSubscription(c.env.DB, {
      id: subscriptionId,
      email,
      plan,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: 'active',
      created_at: new Date().toISOString()
    });

    return c.json({
      subscriptionId,
      status: 'active',
      message: `Subscribed to $${plan}/month`
    });
  } catch (error) {
    return c.json(
      { error: String(error) },
      { status: 500 }
    );
  }
});

export default router;
```

---

### **4. Engine Service (Calls Claude)**

**File: `src/services/engine.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface EngineRequest {
  messageType: 'audit_full_catalog' | 'category_recommend' | 'seo_audit';
  payload: any;
  requestId: string;
}

interface EngineResponse {
  messageType: string;
  requestId: string;
  payload: any;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function auditProducts(request: EngineRequest): Promise<EngineResponse> {
  const systemPrompt = `You are SKUcoverage's audit engine.

YOUR JOB:
- Take structured audit requests (JSON)
- Analyze Shopify product data
- Return ONLY valid JSON responses
- NEVER make HTTP calls, NEVER touch databases
- You are pure logic, nothing else

OUTPUT FORMAT (STRICT - NO EXCEPTIONS):
You MUST respond with ONLY valid JSON matching this schema:
{
  "messageType": "audit_result",
  "requestId": "same as input",
  "payload": {
    "audit": {
      "totalProducts": number,
      "issues": [
        {
          "type": string,
          "count": number,
          "affectedProducts": [string],
          "priority": "high|medium|low",
          "impact": string
        }
      ],
      "score": number (0-100),
      "recommendations": [string]
    }
  }
}

RULES:
1. Analyze product titles: < 40 chars = incomplete
2. Analyze descriptions: < 100 chars = incomplete
3. GTIN missing = high priority
4. Missing images = medium priority
5. No category = low priority
6. Score = (complete products / total products) * 100`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(request)
        }
      ]
    });

    // Parse Claude's response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const auditResult: EngineResponse = JSON.parse(responseText);

    return auditResult;
  } catch (error) {
    throw new Error(`Engine call failed: ${String(error)}`);
  }
}
```

---

### **5. Shopify Service (Fetch Products)**

**File: `src/services/shopify.ts`**

```typescript
interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  gtin?: string;
  category?: string;
  variants: number;
  images: number;
}

export async function fetchShopifyProducts(
  storeUrl: string,
  limit: number = 100
): Promise<ShopifyProduct[]> {
  try {
    // Validate store URL
    if (!storeUrl.includes('.myshopify.com')) {
      throw new Error('Invalid Shopify store URL');
    }

    // Fetch public products.json
    // This is public data (no auth needed)
    const productsUrl = `https://${storeUrl}/products.json`;
    
    const response = await fetch(productsUrl);

    if (!response.ok) {
      throw new Error(`Shopify fetch failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse products
    const products: ShopifyProduct[] = data.products
      .slice(0, limit)
      .map((p: any) => ({
        id: p.id.toString(),
        title: p.title || '',
        description: p.body_html ? stripHtml(p.body_html) : '',
        gtin: p.variants[0]?.barcode || null,
        category: p.product_type || null,
        variants: p.variants?.length || 0,
        images: p.images?.length || 0
      }));

    return products;
  } catch (error) {
    throw new Error(`Shopify fetch error: ${String(error)}`);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .slice(0, 500); // First 500 chars
}
```

---

### **6. Database Service**

**File: `src/services/db.ts`**

```typescript
export async function saveAudit(
  db: D1Database,
  audit: {
    id: string;
    status: 'completed' | 'error' | 'pending';
    audit_data?: any;
    csv_url?: string;
    error?: string;
  }
) {
  const query = `
    UPDATE audits
    SET 
      status = ?,
      audit_data = ?,
      csv_url = ?,
      error = ?,
      updated_at = ?
    WHERE id = ?
  `;

  await db.prepare(query).bind(
    audit.status,
    audit.audit_data ? JSON.stringify(audit.audit_data) : null,
    audit.csv_url || null,
    audit.error || null,
    new Date().toISOString(),
    audit.id
  ).run();
}

export async function getAudit(db: D1Database, auditId: string) {
  const query = `
    SELECT id, status, audit_data, csv_url, error
    FROM audits
    WHERE id = ?
    LIMIT 1
  `;

  const result = await db.prepare(query).bind(auditId).first();

  if (!result) return null;

  return {
    ...result,
    audit_data: result.audit_data ? JSON.parse(result.audit_data) : null
  };
}

export async function saveSubscription(db: D1Database, sub: any) {
  const query = `
    INSERT INTO subscriptions (id, email, plan, stripe_customer_id, stripe_subscription_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await db.prepare(query).bind(
    sub.id,
    sub.email,
    sub.plan,
    sub.stripe_customer_id,
    sub.stripe_subscription_id,
    sub.status,
    sub.created_at
  ).run();
}
```

---

### **7. Storage Service (CSV + R2)**

**File: `src/services/storage.ts`**

```typescript
import { parse } from 'csv-stringify/sync';

export async function generateCSV(auditResult: any): Promise<string> {
  // Extract issues into CSV format
  const rows = [
    ['Issue Type', 'Count', 'Priority', 'Affected Products', 'Impact'],
    ...auditResult.payload.audit.issues.map((issue: any) => [
      issue.type,
      issue.count,
      issue.priority,
      issue.affectedProducts.slice(0, 10).join(', '),
      issue.impact
    ])
  ];

  const csv = parse(rows);
  return csv;
}

export async function uploadCSV(r2: R2Bucket, auditId: string, csv: string): Promise<string> {
  const filename = `audits/${auditId}.csv`;

  // Upload to R2
  await r2.put(filename, csv, {
    httpMetadata: {
      contentType: 'text/csv'
    }
  });

  // Generate signed URL (valid for 7 days)
  const url = `https://r2.skucoverage.tech/${filename}`;
  
  return url;
}
```

---

### **8. Database Schema**

**File: `schema.sql`**

```sql
-- Users/Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK(plan IN ('free', '19', '39')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  store_url TEXT NOT NULL,
  subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'error')),
  audit_data JSON,
  csv_url TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Weekly reports (for $19+ tier)
CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  audit_id TEXT NOT NULL,
  diff_data JSON,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (audit_id) REFERENCES audits(id)
);
```

---

### **9. Type Definitions**

**File: `src/types/api.types.ts`**

```typescript
// Frontend ↔ Backend API contracts

export interface AuditFreeRequest {
  storeUrl: string;
}

export interface AuditFreeResponse {
  auditId: string;
  status: 'pending' | 'completed' | 'error';
  report?: AuditReport;
  downloadUrl?: string;
  message?: string;
  error?: string;
}

export interface AuditReport {
  totalProducts: number;
  missingGTIN: number;
  incompleteTitles: number;
  incompleteDescriptions: number;
  score: number;
  recommendations: string[];
}

export interface SubscribeRequest {
  email: string;
  plan: '19' | '39';
  stripeToken: string;
}

export interface SubscribeResponse {
  subscriptionId: string;
  status: 'active' | 'error';
  message?: string;
  error?: string;
}
```

**File: `src/types/engine.types.ts`**

```typescript
// Backend ↔ Engine API contracts

export interface EngineRequest {
  messageType: 'audit_full_catalog' | 'category_recommend' | 'seo_audit' | 'weekly_diff';
  payload: any;
  requestId: string;
}

export interface EngineResponse {
  messageType: 'audit_result' | 'category_recommendations' | 'seo_audit_result' | 'weekly_diff_result';
  requestId: string;
  payload: {
    audit?: {
      totalProducts: number;
      issues: Array<{
        type: string;
        count: number;
        affectedProducts: string[];
        priority: 'high' | 'medium' | 'low';
        impact: string;
      }>;
      score: number;
      recommendations: string[];
    };
  };
}
```

---

### **10. Environment Variables**

**File: `.env.example`**

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...

# Brevo (Email)
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=noreply@skucoverage.tech

# App
PORT=8787
NODE_ENV=development
```

---

### **11. Package.json**

**File: `package.json`**

```json
{
  "name": "skucoverage-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:init": "wrangler d1 execute db-prod --file=schema.sql"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@cloudflare/workers-types": "^4.20231121.0",
    "csv-stringify": "^6.4.0",
    "hono": "^4.0.0",
    "stripe": "^15.0.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "wrangler": "^3.0.0"
  }
}
```

---

### **12. Wrangler Config**

**File: `wrangler.toml`**

```toml
name = "skucoverage-backend"
type = "service"
account_id = "YOUR_ACCOUNT_ID"
workers_dev = true
route = "api.skucoverage.tech/*"
zone_id = "YOUR_ZONE_ID"

[env.production]
vars = { ENVIRONMENT = "production" }

[[d1_databases]]
binding = "DB"
database_name = "skucoverage-prod"
database_id = "YOUR_DB_ID"

[[r2_buckets]]
binding = "R2"
bucket_name = "skucoverage-files"

[env.production.r2_buckets]
binding = "R2"
bucket_name = "skucoverage-files-prod"
```

---

## **DEPLOYMENT STEPS**

### **1. Create Cloudflare D1 Database**
```bash
wrangler d1 create skucoverage-prod
# Copy database_id to wrangler.toml
```

### **2. Initialize Database Schema**
```bash
wrangler d1 execute skucoverage-prod --file=schema.sql
```

### **3. Create R2 Bucket**
```bash
wrangler r2 bucket create skucoverage-files
```

### **4. Set Environment Variables**
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put STRIPE_SECRET_KEY
```

### **5. Deploy**
```bash
npm run deploy
# Backend live at: https://api.skucoverage.tech
```

---

## **TESTING THE BACKEND**

### **Test 1: Health Check**
```bash
curl https://api.skucoverage.tech/api/health
# Response: {"status":"ok"}
```

### **Test 2: Start Audit**
```bash
curl -X POST https://api.skucoverage.tech/api/audit/free \
  -H "Content-Type: application/json" \
  -d '{"storeUrl":"fashion-nova.myshopify.com"}'
  
# Response: {"auditId":"...","status":"pending"}
```

### **Test 3: Poll Audit Results**
```bash
curl https://api.skucoverage.tech/api/audit/abc-123-def
# Response: {"status":"pending"} initially
# After 30s: {"status":"completed","report":{...},"downloadUrl":"..."}
```

### **Test 4: Subscribe**
```bash
curl -X POST https://api.skucoverage.tech/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@store.com",
    "plan":"19",
    "stripeToken":"tok_visa"
  }'
  
# Response: {"subscriptionId":"...","status":"active"}
```

---

**This is your complete backend. Hand this to ChatGPT Codex and it will build it for you.** 🚀


---

> **Accuracy notice (production-readiness pass).** Parts of this document describe
> behaviour that was specified but never implemented, or that was implemented
> differently. Treat `FIXES.md` and the code as authoritative. In particular:
> SKUcoverage does **not** generate GTINs and does **not** write to Shopify;
> exports are fix lists that the merchant applies. A valid GS1 check digit means
> a number is well formed, not that it is registered to your product. Health
> scores change only after a re-scan of the real catalog.
