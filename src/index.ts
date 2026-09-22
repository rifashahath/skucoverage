import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env, AuditRow, AuthenticatedUser } from './types';
import { fetchShopifyProducts, normalizeStoreHost } from './services/shopify';
import { runAuditEngine, runCatalogAudit, runWeeklyDiff } from './services/engine';
import { buildAuditCsv, signedCsvUrl, uploadAuditCsv, verifyDownloadSignature } from './services/storage';
import { sendAuditCompleteEmail } from './services/email';
import subscribeRoutes from './routes/subscribe';
import webhookRoutes from './routes/webhook';

/* ------------------------------------------------------------------ */
/* Zod request schemas — single source of truth for input validation   */
/* ------------------------------------------------------------------ */
const StoreUrlBody = z.object({
  storeUrl: z.string().min(1, 'storeUrl required').max(253, 'storeUrl too long'),
});

const EmailSubscribeBody = z.object({
  email: z.string().email('Invalid email address'),
  storeUrl: z.string().min(1, 'storeUrl required'),
});

const PatchMeBody = z.object({
  storeUrl: z.string().min(1, 'storeUrl required'),
});


const app = new Hono<{ Bindings: Env }>();
app.use('/api/*', async (c, next) => {
  const allowed = (c.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return cors({
    origin: (origin) => (origin && allowed.includes(origin) ? origin : ''),
    allowHeaders: ['authorization', 'content-type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  })(c, next);
});
/* ------------------------------------------------------------------ */
/* Entitlements                                                        */
/*                                                                     */
/* Single source of truth for what each plan may do. Previously the    */
/* scan limit was hardcoded to 100 everywhere, so paying customers     */
/* silently received the free-tier catalog cap.                        */
/* ------------------------------------------------------------------ */

const FREE_SCAN_LIMIT = 100;
/** Products an unauthenticated visitor may have scanned in one request. */
const ANONYMOUS_SCAN_LIMIT = 100;
/** Anonymous scans permitted per client IP per rolling hour. */
const ANONYMOUS_SCANS_PER_HOUR = 5;

const PLAN_SCAN_LIMITS: Record<string, number> = {
  free: FREE_SCAN_LIMIT,
  '19': 2000,
  '39': 10000,
};

const PLAN_DAILY_AUDITS: Record<string, number> = {
  free: 3,
  '19': 30,
  '39': 100,
};

function scanLimitForPlan(plan: string | null | undefined): number {
  return PLAN_SCAN_LIMITS[String(plan ?? 'free')] ?? FREE_SCAN_LIMIT;
}

function dailyAuditLimitForPlan(plan: string | null | undefined): number {
  return PLAN_DAILY_AUDITS[String(plan ?? 'free')] ?? PLAN_DAILY_AUDITS.free;
}

async function loadPlan(env: Env, userId: string): Promise<string> {
  const row = await env.DB.prepare('SELECT subscription_plan FROM users WHERE id = ?')
    .bind(userId)
    .first<{ subscription_plan: string }>();
  return row?.subscription_plan ?? 'free';
}

/**
 * Every audit-producing endpoint runs through this. Before, only
 * /api/audit/free was metered, so /api/audit/seo, /api/audit/ai-readiness and
 * /api/audit/weekly were unlimited free compute for any signed-in account.
 */
async function checkDailyQuota(env: Env, userId: string, plan: string): Promise<string | null> {
  const limit = dailyAuditLimitForPlan(plan);
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM audits WHERE user_id = ? AND created_at > datetime('now', '-24 hours')",
  )
    .bind(userId)
    .first<{ count: number }>();
  if (Number(recent?.count ?? 0) >= limit) {
    return plan === 'free'
      ? `Free plan allows ${limit} audits per day. Upgrade for a higher limit.`
      : `Your plan allows ${limit} audits per day. Contact support if you need more.`;
  }
  return null;
}

/**
 * Converts an internal error into something safe to send to a browser.
 * Validation failures carry their own user-facing message and HTTP status;
 * anything else is logged server-side and reported generically so that stack
 * traces, hostnames and SQL text never reach the client.
 */
function clientError(error: unknown, fallback = 'Something went wrong. Please try again.'): { message: string; status: ContentfulStatusCode } {
  const status = (error as { status?: number })?.status;
  const name = (error as { name?: string })?.name;
  if (name === 'ShopifyFetchError' && typeof status === 'number') {
    return { message: (error as Error).message, status: status as ContentfulStatusCode };
  }
  console.error('[skucoverage]', error);
  return { message: fallback, status: 500 };
}

app.get('/api/health', (c) => c.json({ status: 'ok' }));
app.route('/api/subscribe', subscribeRoutes);
app.route('/api/webhook', webhookRoutes);

app.post('/api/audit/free', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const parsed = StoreUrlBody.safeParse(await readJson(c));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'storeUrl required' }, 400);
  const { storeUrl } = parsed.data;
  let host: string;
  try {
    host = normalizeStoreHost(storeUrl);
  } catch (error) {
    const e = clientError(error, 'Invalid store URL.');
    return c.json({ error: e.message }, 400);
  }
  const now = new Date().toISOString();
  const plan = await loadPlan(c.env, user.id);
  const quotaError = await checkDailyQuota(c.env, user.id, plan);
  if (quotaError) return c.json({ error: quotaError }, 429);
  const auditId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users (id, email, store_url, subscription_plan, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, store_url = excluded.store_url').bind(user.id, user.email, host, 'free', now),
    c.env.DB.prepare('INSERT INTO audits (id, user_id, store_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(auditId, user.id, host, 'pending', now, now)
  ]);
  c.executionCtx.waitUntil(processAudit(c.env, auditId, user.id, host, scanLimitForPlan(plan)));
  return c.json({ auditId, status: 'pending', message: 'Audit started, check back shortly' }, 202);
});

app.get('/api/audit/:auditId/csv', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const auditId = c.req.param('auditId');
  // Ownership check BEFORE signature verification: if the requesting user
  // does not own this audit, a forged signature for someone else's auditId
  // is rejected at the DB layer before any crypto is performed.
  const row = await c.env.DB.prepare('SELECT csv_key, audit_data FROM audits WHERE id = ? AND user_id = ?').bind(auditId, user.id).first<{ csv_key: string | null; audit_data: string | null }>();
  if (!row) return c.json({ error: 'Audit not found' }, 404);
  const expires = Number(c.req.query('expires'));
  const signature = c.req.query('signature') ?? '';
  if (!Number.isSafeInteger(expires) || !(await verifyDownloadSignature(c.env.CSV_SIGNING_SECRET, auditId, expires, signature))) return c.json({ error: 'Invalid or expired download URL' }, 401);
  if (row.csv_key && c.env.R2) {
    try {
      const object = await c.env.R2.get(row.csv_key);
      if (object) {
        return new Response(object.body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${auditId}.csv"` } });
      }
    } catch {
      // Fall through to audit_data fallback
    }
  }
  if (row.audit_data) {
    const report = JSON.parse(row.audit_data);
    const csv = buildAuditCsv(report);
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${auditId}.csv"` } });
  }
  return c.json({ error: 'CSV not available' }, 404);
});

app.get('/api/audit/:auditId', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const row = await c.env.DB.prepare('SELECT * FROM audits WHERE id = ? AND user_id = ?').bind(c.req.param('auditId'), user.id).first<AuditRow>();
  if (!row) return c.json({ error: 'Audit not found' }, 404);
  if (row.status === 'pending') return c.json({ auditId: row.id, status: 'pending', message: 'Still auditing your store...' });
  if (row.status === 'error') return c.json({ auditId: row.id, status: 'error', error: row.error });
  const report = row.audit_data ? JSON.parse(row.audit_data) : null;
  return c.json({ auditId: row.id, status: 'completed', report, downloadUrl: (row.csv_key || row.audit_data) ? await signedCsvUrl(c.env, row.csv_key ?? row.id, row.id) : null });
});

app.get('/api/audits', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const { results } = await c.env.DB.prepare('SELECT id, store_url, score, status, error, created_at, updated_at FROM audits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
  return c.json({ audits: results });
});

app.get('/api/me', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  let userRow = await c.env.DB.prepare('SELECT id, email, store_url, subscription_plan FROM users WHERE id = ?').bind(user.id).first<{ id: string; email: string | null; store_url: string | null; subscription_plan: string }>();
  if (!userRow && user.email) {
    userRow = await c.env.DB.prepare('SELECT id, email, store_url, subscription_plan FROM users WHERE LOWER(email) = LOWER(?)').bind(user.email).first<{ id: string; email: string | null; store_url: string | null; subscription_plan: string }>();
  }
  const rawPlan = userRow?.subscription_plan;
  const plan = rawPlan === '19' || rawPlan === '39' ? rawPlan : 'free';
  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM audits WHERE user_id = ? AND created_at > datetime('now', '-24 hours')").bind(user.id).first<{ count: number }>();
  const auditsToday = Number(recent?.count ?? 0);
  const isPaid = plan === '19' || plan === '39';
  return c.json({
    id: user.id,
    email: user.email ?? userRow?.email ?? null,
    plan,
    storeUrl: userRow?.store_url ?? '',
    auditsToday,
    limits: {
      auditsPerDay: isPaid ? dailyAuditLimitForPlan(plan) : 3,
      skuCap: scanLimitForPlan(plan),
    },
  });
});

app.patch('/api/me', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const parsed = PatchMeBody.safeParse(await readJson(c));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'storeUrl required' }, 400);
  const { storeUrl } = parsed.data;
  let host: string;
  try {
    host = normalizeStoreHost(storeUrl);
  } catch (error) {
    return c.json({ error: String(error).replace(/^Error: /, '') }, 400);
  }
  const now = new Date().toISOString();
  const existingById = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(user.id).first<{ id: string }>();
  if (existingById) {
    await c.env.DB.prepare('UPDATE users SET store_url = ?, email = COALESCE(?, email) WHERE id = ?').bind(host, user.email, user.id).run();
  } else {
    const existingByEmail = user.email ? await c.env.DB.prepare('SELECT id, subscription_plan FROM users WHERE LOWER(email) = LOWER(?)').bind(user.email).first<{ id: string; subscription_plan: string }>() : null;
    if (existingByEmail) {
      // Guard: never reassign the primary key of a paid subscriber.
      // A paid account can only be accessed through the Supabase UUID that
      // originally created it. Allowing the swap would let anyone who creates
      // a new Supabase account with a victim's email immediately inherit their
      // subscription plan and entire audit history.
      if (existingByEmail.subscription_plan !== 'free') {
        return c.json({ error: 'This email is associated with an existing paid account. Please sign in with your original credentials or contact support.' }, 409);
      }
      // Re-pointing the primary key used to orphan every audit row that
      // referenced the old id. Move the child rows in the same batch so the
      // two statements cannot half-apply.
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE users SET id = ?, store_url = ? WHERE id = ?').bind(user.id, host, existingByEmail.id),
        c.env.DB.prepare('UPDATE audits SET user_id = ? WHERE user_id = ?').bind(user.id, existingByEmail.id),
        c.env.DB.prepare('UPDATE subscriptions SET user_id = ? WHERE user_id = ?').bind(user.id, existingByEmail.id),
      ]);
    } else {
      await c.env.DB.prepare('INSERT INTO users (id, email, store_url, subscription_plan, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, user.email, host, 'free', now).run();
    }
  }
  return c.json({ ok: true, storeUrl: host });
});

app.post('/api/audit/weekly', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const input = await readJson(c);
  const profile = await c.env.DB.prepare('SELECT store_url FROM users WHERE id = ?').bind(user.id).first<{ store_url: string }>();
  if (!profile?.store_url) return c.json({ error: 'No store associated with this account' }, 400);
  const weeklyPlan = await loadPlan(c.env, user.id);
  if (weeklyPlan === 'free') return c.json({ error: 'Weekly tracking is a paid feature.' }, 403);
  const weeklyQuotaError = await checkDailyQuota(c.env, user.id, weeklyPlan);
  if (weeklyQuotaError) return c.json({ error: weeklyQuotaError }, 429);
  const auditId = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO audits (id, user_id, store_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(auditId, user.id, profile.store_url, 'pending', now, now).run();
  c.executionCtx.waitUntil(processWeeklyAudit(c.env, auditId, user.id, profile.store_url, scanLimitForPlan(weeklyPlan)));
  return c.json({ auditId, status: 'pending' }, 202);
});

async function runSynchronousAudit(c: { env: Env; req: { json: <T>() => Promise<T>; header: (name: string) => string | undefined }; json: (body: unknown, init?: ResponseInit) => Response }, messageType: 'seo_audit' | 'ai_readiness'): Promise<Response> {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, { status: 401 });
  const input = await readJson(c);
  const storeUrl = typeof input?.storeUrl === 'string' ? input.storeUrl : '';
  if (!storeUrl) return c.json({ error: 'storeUrl required' }, { status: 400 });
  let host: string;
  try {
    host = normalizeStoreHost(storeUrl);
  } catch (error) {
    return c.json({ error: clientError(error, 'Invalid store URL.').message }, { status: 400 });
  }
  const plan = await loadPlan(c.env, user.id);
  const quotaError = await checkDailyQuota(c.env, user.id, plan);
  if (quotaError) return c.json({ error: quotaError }, { status: 429 });
  try {
    const products = await fetchShopifyProducts(host, scanLimitForPlan(plan));
    const report = runAuditEngine({ messageType, requestId: crypto.randomUUID(), payload: { storeId: host, products } });
    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO users (id, email, store_url, subscription_plan, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, store_url = excluded.store_url').bind(user.id, user.email, host, 'free', now),
      c.env.DB.prepare('INSERT INTO audits (id, user_id, store_url, audit_data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(auditId, user.id, host, JSON.stringify(report), 'completed', now, now),
    ]);
    return c.json({ auditId, status: 'completed', report });
  } catch (error) {
    const e = clientError(error, 'The audit could not be completed.');
    return c.json({ error: e.message }, { status: e.status });
  }
}


app.post('/api/audit/anonymous', async (c) => {
  const input = await readJson(c);
  const storeUrl = typeof input?.storeUrl === 'string' ? input.storeUrl : '';
  if (!storeUrl) return c.json({ error: 'storeUrl required' }, { status: 400 });

  let host: string;
  try {
    host = normalizeStoreHost(storeUrl);
  } catch (error) {
    return c.json({ error: clientError(error, 'Invalid store URL.').message }, { status: 400 });
  }

  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('CF-Connecting-IP') ?? '';
  // Without a trusted client IP we cannot meter the request at all, so we
  // refuse instead of bucketing every such caller into a shared 'unknown'
  // row that any one of them can exhaust for everyone else.
  if (!ip) return c.json({ error: 'Anonymous scans are unavailable right now. Please sign in.' }, { status: 429 });
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  try {
    // Read-then-write let parallel requests each observe count=4 and all
    // proceed. A single upsert that both resets an expired window and
    // increments a live one is atomic, and we decide from the value the
    // database actually stored.
    const updated = await c.env.DB.prepare(
      `INSERT INTO scan_rate_limits (ip, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(ip) DO UPDATE SET
         window_start = CASE WHEN scan_rate_limits.window_start < ? THEN excluded.window_start ELSE scan_rate_limits.window_start END,
         count = CASE WHEN scan_rate_limits.window_start < ? THEN 1 ELSE scan_rate_limits.count + 1 END
       RETURNING count`,
    ).bind(ip, nowIso, oneHourAgo, oneHourAgo).first<{ count: number }>();

    if (Number(updated?.count ?? 0) > ANONYMOUS_SCANS_PER_HOUR) {
      return c.json({ error: 'Too many scans from this network. Try again in an hour or sign in.' }, 429);
    }

    // Housekeeping only; never gates the decision above.
    c.executionCtx.waitUntil(
      c.env.DB.prepare('DELETE FROM scan_rate_limits WHERE window_start < ?').bind(oneHourAgo).run().then(() => undefined),
    );
  } catch (error) {
    const e = clientError(error, 'Could not start the scan. Please try again.');
    return c.json({ error: e.message }, e.status);
  }

  try {
    const products = await fetchShopifyProducts(host, ANONYMOUS_SCAN_LIMIT);
    const auditId = crypto.randomUUID();
    const report = runCatalogAudit(auditId, host, products);

    // Intentionally not persisted: anonymous callers have no account to own
    // the row. The response is the whole deliverable.
    return c.json({
      auditId,
      status: 'completed',
      report,
      scanned: products.length,
      limited: products.length >= ANONYMOUS_SCAN_LIMIT,
      scanLimit: ANONYMOUS_SCAN_LIMIT,
    });
  } catch (error) {
    const e = clientError(error, 'The scan could not be completed.');
    return c.json({ error: e.message }, e.status);
  }
});

app.post('/api/email/subscribe', async (c) => {
  // IP-based rate limit: max 3 subscribe calls per IP per hour.
  // Prevents bulk pre-registration squatting and DB spam attacks.
  const subscribeIp = c.req.header('cf-connecting-ip') ?? c.req.header('CF-Connecting-IP') ?? '';
  if (subscribeIp) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const EMAIL_SUBSCRIBE_LIMIT_PER_HOUR = 3;
    try {
      const updated = await c.env.DB.prepare(
        `INSERT INTO scan_rate_limits (ip, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(ip) DO UPDATE SET
           window_start = CASE WHEN scan_rate_limits.window_start < ? THEN excluded.window_start ELSE scan_rate_limits.window_start END,
           count = CASE WHEN scan_rate_limits.window_start < ? THEN 1 ELSE scan_rate_limits.count + 1 END
         RETURNING count`,
      ).bind(`sub:${subscribeIp}`, now.toISOString(), oneHourAgo, oneHourAgo).first<{ count: number }>();
      if (Number(updated?.count ?? 0) > EMAIL_SUBSCRIBE_LIMIT_PER_HOUR) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }
    } catch {
      // Rate-limit table unavailable — log but allow through to avoid
      // blocking legitimate signups due to an infrastructure issue.
      console.warn('[skucoverage] email/subscribe: rate limit check failed');
    }
  }

  const bodyParsed = EmailSubscribeBody.safeParse(await readJson(c));
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.issues[0]?.message ?? 'email and storeUrl required' }, 400);
  const email = bodyParsed.data.email.toLowerCase().trim();
  const { storeUrl } = bodyParsed.data;

  let host: string;
  try {
    host = normalizeStoreHost(storeUrl);
  } catch (error) {
    return c.json({ error: String(error).replace(/^Error: /, '') }, 400);
  }

  try {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').bind(email).first<{ id: string }>();
    if (!existing) {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare('INSERT INTO users (id, email, store_url, subscription_plan, created_at) VALUES (?, ?, ?, ?, ?)').bind(userId, email, host, 'free', now).run();
    }
    // If the address already belongs to an account we deliberately do NOT
    // touch it. This endpoint is unauthenticated, so writing store_url here
    // let anyone who knew a customer's email repoint that customer's store,
    // which then drove their scheduled scans and weekly report emails.

    // Always the same response either way: a differing reply would turn this
    // endpoint into an account-existence oracle.
    return c.json({ success: true });
  } catch (error) {
    const e = clientError(error, 'Could not complete the request.');
    return c.json({ error: e.message }, e.status);
  }
});

app.post('/api/audit/seo', (c) => runSynchronousAudit(c, 'seo_audit'));
app.post('/api/audit/ai-readiness', (c) => runSynchronousAudit(c, 'ai_readiness'));

async function processWeeklyAudit(env: Env, auditId: string, userId: string, storeUrl: string, productLimit: number = FREE_SCAN_LIMIT): Promise<void> {
  try {
    // Re-validate the subscription at execution time. A user may cancel between
    // the moment the job was queued and when it actually runs. Capping to the
    // current plan also prevents a stale productLimit from granting extra compute.
    const currentPlan = await loadPlan(env, userId);
    if (currentPlan === 'free') {
      await env.DB.prepare("UPDATE audits SET status = 'error', error = 'Subscription cancelled before audit ran.', updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(new Date().toISOString(), auditId, userId).run();
      return;
    }
    const effectiveLimit = Math.min(productLimit, scanLimitForPlan(currentPlan));
    const previous = await env.DB.prepare("SELECT audit_data FROM audits WHERE user_id = ? AND status = ? AND id != ? ORDER BY created_at DESC LIMIT 1").bind(userId, "completed", auditId).first<{ audit_data: string | null }>();
    const products = await fetchShopifyProducts(storeUrl, effectiveLimit);
    const current = runCatalogAudit(`${auditId}:current`, storeUrl, products);
    const auditObj = (current.payload as Record<string, unknown> | undefined)?.audit as Record<string, unknown> | undefined;
    if (auditObj) {
      auditObj.scanned = products.length;
      auditObj.limited = products.length >= effectiveLimit;
      auditObj.scanLimit = effectiveLimit;
    }
    const report = previous?.audit_data ? runWeeklyDiff(auditId, current, JSON.parse(previous.audit_data)) : current;
    let csvKey: string | null = null;
    try {
      if (env.R2) {
        csvKey = await uploadAuditCsv(env, auditId, current as unknown as Record<string, unknown>);
      }
    } catch (r2Error) {
      console.warn('[skucoverage] R2 upload failed in weekly audit, continuing with audit_data:', r2Error);
    }
    const audit = (current.payload as Record<string, unknown> | undefined)?.audit as Record<string, unknown> | undefined;
    await env.DB.prepare("UPDATE audits SET audit_data = ?, score = ?, status = ?, csv_key = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(JSON.stringify(report), typeof audit?.score === "number" ? audit.score : null, "completed", csvKey, new Date().toISOString(), auditId, userId).run();
  } catch (error) {
    await env.DB.prepare("UPDATE audits SET status = ?, error = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind("error", error instanceof Error ? error.message : String(error), new Date().toISOString(), auditId, userId).run();
  }
}

async function processAudit(env: Env, auditId: string, userId: string, storeUrl: string, productLimit: number = FREE_SCAN_LIMIT): Promise<void> {
  try {
    const products = await fetchShopifyProducts(storeUrl, productLimit);
    const report = runCatalogAudit(auditId, storeUrl, products);
    const audit = (report.payload as Record<string, unknown> | undefined)?.audit as Record<string, unknown> | undefined;
    if (audit) {
      audit.scanned = products.length;
      audit.limited = products.length >= productLimit;
      audit.scanLimit = productLimit;
    }
    let csvKey: string | null = null;
    try {
      if (env.R2) {
        csvKey = await uploadAuditCsv(env, auditId, report as unknown as Record<string, unknown>);
      }
    } catch (r2Error) {
      console.warn('[skucoverage] R2 upload failed in processAudit, continuing with audit_data:', r2Error);
    }
    await env.DB.prepare('UPDATE audits SET audit_data = ?, score = ?, status = ?, csv_key = ?, updated_at = ? WHERE id = ? AND user_id = ?').bind(JSON.stringify(report), typeof audit?.score === 'number' ? audit.score : null, 'completed', csvKey, new Date().toISOString(), auditId, userId).run();
    const userRow = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string | null }>();
    const issues = Array.isArray(audit?.issues) ? audit.issues as Array<Record<string, unknown>> : [];
    if (userRow?.email) await sendAuditCompleteEmail(env.BREVO_API_KEY, env.BREVO_SENDER_EMAIL, userRow.email, auditId, typeof audit?.score === 'number' ? audit.score : 0, issues.reduce((total, issue) => total + (typeof issue.count === 'number' ? issue.count : 0), 0));
  } catch (error) {
    await env.DB.prepare('UPDATE audits SET status = ?, error = ?, updated_at = ? WHERE id = ? AND user_id = ?').bind('error', error instanceof Error ? error.message : String(error), new Date().toISOString(), auditId, userId).run();
  }
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown> | null> {
  try { const value = await c.req.json(); return value && typeof value === 'object' ? value as Record<string, unknown> : null; } catch { return null; }
}

export async function requireUser(c: { req: { header: (name: string) => string | undefined }; env: Env }): Promise<AuthenticatedUser | null> {
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  // Fail closed: if the Supabase configuration is missing the server is
  // misconfigured. Return null (unauthenticated) and log — do NOT fall back
  // to hardcoded credentials that may be committed to the repository.
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) {
    console.error('[skucoverage] requireUser: SUPABASE_URL or SUPABASE_ANON_KEY is not configured');
    return null;
  }
  const url = String(c.env.SUPABASE_URL).trim().replace(/\/+$/, '');
  const key = String(c.env.SUPABASE_ANON_KEY).trim();
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, authorization }
    });
    if (!response.ok) return null;
    const payload = await response.json() as { id?: string; email?: string | null };
    return typeof payload.id === 'string' ? { id: payload.id, email: payload.email ?? null } : null;
  } catch (error) {
    console.error('[skucoverage] requireUser auth error:', error);
    return null;
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const { results } = await env.DB.prepare("SELECT id, store_url, subscription_plan FROM users WHERE subscription_plan IN ('19', '39') AND store_url IS NOT NULL").all();
    for (const user of results as Array<{ id: string; store_url: string; subscription_plan: string }>) {
      const auditId = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare('INSERT INTO audits (id, user_id, store_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(auditId, user.id, user.store_url, 'pending', now, now).run();
      ctx.waitUntil(processWeeklyAudit(env, auditId, user.id, user.store_url, scanLimitForPlan(user.subscription_plan)));
    }
  },
};
