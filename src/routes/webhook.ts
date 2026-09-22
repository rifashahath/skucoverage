import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/* ------------------------------------------------------------------ */
/* Dodo Payments Webhook Handler (/api/webhook/dodo)                   */
/* ------------------------------------------------------------------ */
router.post('/dodo', async (c) => {
  const payload = await c.req.text();
  const webhookId = c.req.header('webhook-id') ?? '';
  const webhookTimestamp = c.req.header('webhook-timestamp') ?? '';
  const webhookSignature = c.req.header('webhook-signature') ?? '';

  if (
    !c.env.DODO_WEBHOOK_SECRET ||
    !(await verifyDodoSignature(payload, webhookId, webhookTimestamp, webhookSignature, c.env.DODO_WEBHOOK_SECRET))
  ) {
    return c.json({ error: 'Invalid webhook signature' }, 400);
  }

  try {
    const event = JSON.parse(payload) as {
      type?: string;
      data?: {
        customer?: { email?: string };
        customer_email?: string;
        email?: string;
        product_id?: string;
        plan_id?: string;
      };
    };

    const eventType = event.type ?? '';
    const data = event.data ?? {};
    const email = data.customer?.email || data.customer_email || data.email;

    if (email) {
      if (eventType === 'subscription.active' || eventType === 'payment.succeeded') {
        const productId = data.product_id || data.plan_id;
        const plan = (c.env.DODO_PRODUCT_ID_SCALE && productId === c.env.DODO_PRODUCT_ID_SCALE) ? '39' : '19';
        await c.env.DB.prepare(
          'UPDATE users SET subscription_plan = ? WHERE lower(email) = lower(?)'
        ).bind(plan, email).run();
        console.log(`[Dodo Payments] Upgraded user ${email} to plan ${plan}`);
      } else if (
        eventType === 'subscription.cancelled' ||
        eventType === 'subscription.expired' ||
        eventType === 'subscription.failed'
      ) {
        await c.env.DB.prepare(
          "UPDATE users SET subscription_plan = 'free' WHERE lower(email) = lower(?)"
        ).bind(email).run();
        console.log(`[Dodo Payments] Downgraded user ${email} to free`);
      }
    }
  } catch (error) {
    console.error('Dodo webhook processing failed:', error);
  }

  return c.json({ received: true });
});

/* ------------------------------------------------------------------ */
/* Stripe Webhook Handler (/api/webhook/stripe)                        */
/* ------------------------------------------------------------------ */
router.post('/stripe', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature') ?? '';
  if (!c.env.STRIPE_WEBHOOK_SECRET || !(await verifyStripeSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET))) return c.json({ error: 'Invalid signature' }, 400);
  try {
    const event = JSON.parse(payload) as { type?: string; data?: { object?: Record<string, unknown> } };
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const object = event.data?.object ?? {};
      const customerId = typeof object.customer === 'string' ? object.customer : null;
      const customer = customerId && c.env.STRIPE_SECRET_KEY ? await fetchStripeCustomer(c.env.STRIPE_SECRET_KEY, customerId) : null;
      const email = customer?.email ?? (typeof object.customer_email === 'string' ? object.customer_email : null);
      if (email) {
        const priceId = ((object.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data?.[0]?.price?.id) ?? '';
        const plan = priceId === c.env.STRIPE_PRICE_39 ? '39' : '19';
        await c.env.DB.prepare("UPDATE users SET subscription_plan = ? WHERE lower(email) = lower(?)").bind(plan, email).run();
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const object = event.data?.object ?? {};
      const customerId = typeof object.customer === 'string' ? object.customer : null;
      const customer = customerId && c.env.STRIPE_SECRET_KEY ? await fetchStripeCustomer(c.env.STRIPE_SECRET_KEY, customerId) : null;
      const email = customer?.email ?? (typeof object.customer_email === 'string' ? object.customer_email : null);
      if (email) await c.env.DB.prepare("UPDATE users SET subscription_plan = 'free' WHERE lower(email) = lower(?)").bind(email).run();
    }
  } catch (error) { console.error('Stripe webhook handling failed', error); }
  return c.json({ received: true });
});

/* ------------------------------------------------------------------ */
/* Standard Webhooks Verification for Dodo Payments                   */
/* ------------------------------------------------------------------ */
async function verifyDodoSignature(
  payload: string,
  msgId: string,
  timestamp: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!msgId || !timestamp || !signatureHeader || !secret) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(nowSec - ts) > 300) return false;

  try {
    const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const binarySecret = atob(rawSecret);
    const keyBytes = new Uint8Array(binarySecret.length);
    for (let i = 0; i < binarySecret.length; i++) {
      keyBytes[i] = binarySecret.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const toSign = `${msgId}.${timestamp}.${payload}`;
    const digest = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(toSign)
    );

    const digestBase64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    const expectedSig = `v1,${digestBase64}`;

    const signatures = signatureHeader.split(' ');
    for (const sig of signatures) {
      if (timingSafeEqual(sig, expectedSig)) return true;
    }
    return false;
  } catch (e) {
    console.error('Dodo signature verification error:', e);
    return false;
  }
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const timestamp = header.match(/(?:^|,)t=(\d+)/)?.[1];
  const provided = header.match(/(?:^|,)v1=([^,]+)/)?.[1];
  if (!timestamp || !provided || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, provided);
}

async function fetchStripeCustomer(secret: string, customerId: string): Promise<{ email?: string } | null> {
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, { headers: { authorization: `Bearer ${secret}` } });
  if (!response.ok) return null;
  return await response.json() as { email?: string };
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

export default router;
