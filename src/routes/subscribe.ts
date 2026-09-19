import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

router.post('/', async (c) => {
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: 'Payments are not configured' }, 503);
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
  const userResponse = await fetch(`${c.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: c.env.SUPABASE_ANON_KEY, authorization } });
  if (!userResponse.ok) return c.json({ error: 'Authentication required' }, 401);
  const user = await userResponse.json() as { email?: string };
  if (!user.email) return c.json({ error: 'Authenticated email required' }, 400);
  const body = await c.req.json<{ priceId?: string }>().catch(() => ({ priceId: undefined }));
  const priceId = body.priceId;
  const allowedPrices = [c.env.STRIPE_PRICE_19, c.env.STRIPE_PRICE_39].filter(Boolean);
  if (!priceId || !priceId.startsWith('price_') || (allowedPrices.length > 0 && !allowedPrices.includes(priceId))) return c.json({ error: 'Invalid priceId' }, 400);
  const origin = new URL(c.req.url).origin;
  const form = new URLSearchParams({ mode: 'subscription', success_url: 'https://skucoverage.tech/app/?upgraded=true', cancel_url: 'https://skucoverage.tech/app/', customer_email: user.email, 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1' });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: form });
  const result = await response.json() as { url?: string; error?: { message?: string } };
  if (!response.ok || !result.url) return c.json({ error: result.error?.message ?? 'Unable to create checkout session' }, 502);
  void origin;
  return c.json({ checkoutUrl: result.url });
});

export default router;
