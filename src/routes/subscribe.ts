import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

router.post('/', async (c) => {
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
  const userResponse = await fetch(`${c.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: c.env.SUPABASE_ANON_KEY, authorization } });
  if (!userResponse.ok) return c.json({ error: 'Authentication required' }, 401);
  const user = await userResponse.json() as { email?: string };
  if (!user.email) return c.json({ error: 'Authenticated email required' }, 400);

  const body = await c.req.json<{ priceId?: string }>().catch(() => ({ priceId: undefined }));
  const tier = body.priceId;

  // 1. Check Dodo Payments (Primary)
  if (c.env.DODO_PAYMENTS_API_KEY) {
    const isScale = tier === '39' || tier === c.env.DODO_PRODUCT_ID_SCALE;
    const productId = isScale
      ? (c.env.DODO_PRODUCT_ID_SCALE || c.env.DODO_PRODUCT_ID_PRO || 'pdt_0No5JUeRC00WONAKUhmx7')
      : (c.env.DODO_PRODUCT_ID_PRO || 'pdt_0No5JUeRC00WONAKUhmx7');

    try {
      const response = await fetch('https://live.dodopayments.com/checkouts', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${c.env.DODO_PAYMENTS_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          product_cart: [
            {
              product_id: productId,
              quantity: 1,
            },
          ],
          customer: {
            email: user.email,
          },
          return_url: 'https://skucoverage.tech/app/?upgraded=true',
        }),
      });

      const result = await response.json() as { checkout_url?: string; error?: string; message?: string };
      if (!response.ok || !result.checkout_url) {
        console.error('Dodo checkout creation error:', result);
        return c.json({ error: result.message || result.error || 'Unable to create Dodo checkout session' }, 502);
      }

      return c.json({ checkoutUrl: result.checkout_url });
    } catch (err: any) {
      console.error('Dodo request exception:', err);
      return c.json({ error: 'Failed to contact payment provider' }, 502);
    }
  }

  // 2. Fallback to Stripe if configured
  if (c.env.STRIPE_SECRET_KEY) {
    const allowedPrices = [c.env.STRIPE_PRICE_19, c.env.STRIPE_PRICE_39].filter(Boolean);
    const stripePriceId = tier === '39' ? c.env.STRIPE_PRICE_39 : (tier === '19' ? c.env.STRIPE_PRICE_19 : tier);
    if (!stripePriceId || !stripePriceId.startsWith('price_') || (allowedPrices.length > 0 && !allowedPrices.includes(stripePriceId))) {
      return c.json({ error: 'Invalid priceId' }, 400);
    }
    const form = new URLSearchParams({
      mode: 'subscription',
      success_url: 'https://skucoverage.tech/app/?upgraded=true',
      cancel_url: 'https://skucoverage.tech/app/',
      customer_email: user.email,
      'line_items[0][price]': stripePriceId,
      'line_items[0][quantity]': '1'
    });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const result = await response.json() as { url?: string; error?: { message?: string } };
    if (!response.ok || !result.url) return c.json({ error: result.error?.message ?? 'Unable to create checkout session' }, 502);
    return c.json({ checkoutUrl: result.url });
  }

  return c.json({ error: 'Payments are not configured' }, 503);
});

export default router;
