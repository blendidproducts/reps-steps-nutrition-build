import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

/**
 * Maps Stripe Payment Link URLs → what fields to set on the user.
 * Multiple products can grant the same fields (e.g. all_access grants everything).
 *
 * Fields used on the User entity:
 *   subscription_status    – "free" | "pro" | "pro_lifetime"
 *   fitness_brain_addon    – boolean (true = AI Fitness Brain active)
 *   nutrition_plan         – "none" | "ai_addon" | "all_access"
 *   stripe_customer_id     – Stripe customer ID
 *   subscription_start_date – ISO date string
 *   active_products        – array of product keys for cancellation tracking
 */
const PRODUCT_MAP = {
  // Pro Monthly
  "7sY8wP4lMg188m0bkVbQY01": {
    key: "pro_monthly",
    updates: { subscription_status: "pro" }
  },
  // Pro Lifetime
  "9B68wPbOecOW8m0dt3bQY0h": {
    key: "pro_lifetime",
    updates: { subscription_status: "pro_lifetime" }
  },
  // 7-Day Trial
  "aFa7sL4lM5muau82OpbQY0i": {
    key: "pro_trial",
    updates: { subscription_status: "pro" }
  },
  // AI Fitness Brain Add-On
  "cNi3cvcSi6qy45Kex7bQY0j": {
    key: "fitness_brain",
    updates: { fitness_brain_addon: true }
  },
  // AI Nutrition Add-On
  "28EbJ16tUcOW59OcoZbQY0k": {
    key: "nutrition_ai",
    updates: { nutrition_plan: "ai_addon" }
  },
  // Brain + Nutrition Bundle
  "14A9ATf0qcOW31G9cNbQY0l": {
    key: "brain_nutrition_bundle",
    updates: { fitness_brain_addon: true, nutrition_plan: "ai_addon" }
  },
  // All-Access
  "3cI4gz3hI4iq45KbkVbQY0m": {
    key: "all_access",
    updates: { subscription_status: "pro", fitness_brain_addon: true, nutrition_plan: "all_access" }
  },
};

/**
 * When a specific product subscription is cancelled, revert only its fields.
 * We do NOT revert fields that might be granted by another active product.
 */
const CANCELLATION_REVERTS = {
  "pro_monthly":            { subscription_status: "free" },
  "pro_trial":              { subscription_status: "free" },
  "fitness_brain":          { fitness_brain_addon: false },
  "nutrition_ai":           { nutrition_plan: "none" },
  "brain_nutrition_bundle": { fitness_brain_addon: false, nutrition_plan: "none" },
  "all_access":             { subscription_status: "free", fitness_brain_addon: false, nutrition_plan: "none" },
};

/**
 * Extract the payment link suffix (last segment) from session metadata or payment_link field.
 * Stripe stores the payment link ID like "plink_XXXX" but the readable part we use
 * is the last segment of the buy.stripe.com URL — which Stripe puts in
 * session.payment_link or line_item price metadata.
 * We match against our PRODUCT_MAP keys which are the URL suffixes.
 */
function detectProduct(session) {
  // Stripe attaches the payment link ID to the session
  const paymentLink = session.payment_link; // e.g. "plink_abc123"
  
  // Also check metadata if manually set
  const metaKey = session.metadata?.product_key;
  if (metaKey && PRODUCT_MAP[metaKey]) return PRODUCT_MAP[metaKey];

  // The most reliable: check the success_url or the payment link itself
  // Stripe payment links have a client_reference_id we can use, or we match
  // the payment_link field against a lookup we build from known link suffixes.
  // Since our PRODUCT_MAP keys ARE the URL suffixes (the part after buy.stripe.com/),
  // we check if any key appears in the payment_link string or any session URL.
  const searchStr = JSON.stringify(session);
  for (const [key, product] of Object.entries(PRODUCT_MAP)) {
    if (searchStr.includes(key)) {
      return product;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Verify webhook signature
    const crypto = await import('node:crypto');
    const timestamp = signature.split(',').find(s => s.startsWith('t=')).split('=')[1];
    const signatureHash = signature.split(',').find(s => s.startsWith('v1=')).split('=')[1];

    const signedPayload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(signedPayload, 'utf8')
      .digest('hex');

    if (signatureHash !== expectedSignature) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    // ── PURCHASE ──────────────────────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_email || session.customer_details?.email;

      if (!customerEmail) {
        return Response.json({ error: 'No customer email found' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];
      const product = detectProduct(session);

      if (!product) {
        // Unknown product — fall back to generic pro upgrade so nothing breaks
        console.warn('Unknown product for session:', session.id, 'falling back to pro');
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'pro',
          stripe_customer_id: session.customer,
          subscription_start_date: new Date().toISOString(),
        });
        return Response.json({ success: true, message: 'Fallback: user upgraded to pro' });
      }

      // Build the update: product fields + bookkeeping
      const currentProducts = Array.isArray(user.active_products) ? user.active_products : [];
      const newProducts = [...new Set([...currentProducts, product.key])];

      await base44.asServiceRole.entities.User.update(user.id, {
        ...product.updates,
        stripe_customer_id: session.customer,
        subscription_start_date: user.subscription_start_date || new Date().toISOString(),
        active_products: newProducts,
      });

      console.log(`Activated [${product.key}] for ${customerEmail}. Active: ${newProducts.join(', ')}`);
      return Response.json({ success: true, message: `Activated: ${product.key}` });
    }

    // ── CANCELLATION ──────────────────────────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];

      // Detect which product this subscription belongs to via metadata or description
      const subStr = JSON.stringify(subscription);
      let cancelledKey = null;
      for (const key of Object.keys(PRODUCT_MAP)) {
        if (subStr.includes(key)) { cancelledKey = PRODUCT_MAP[key].key; break; }
      }

      // Remove from active_products
      const currentProducts = Array.isArray(user.active_products) ? user.active_products : [];
      const remainingProducts = currentProducts.filter(p => p !== cancelledKey);

      // Rebuild entitlements from remaining active products
      let rebuiltUpdates = {
        subscription_status: 'free',
        fitness_brain_addon: false,
        nutrition_plan: 'none',
        active_products: remainingProducts,
      };

      for (const key of remainingProducts) {
        // Find the product entry by key
        const entry = Object.values(PRODUCT_MAP).find(p => p.key === key);
        if (entry) {
          Object.assign(rebuiltUpdates, entry.updates);
        }
      }

      await base44.asServiceRole.entities.User.update(user.id, rebuiltUpdates);

      console.log(`Cancelled [${cancelledKey}] for user ${user.email}. Remaining: ${remainingProducts.join(', ')}`);
      return Response.json({ success: true, message: `Cancelled: ${cancelledKey}` });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});