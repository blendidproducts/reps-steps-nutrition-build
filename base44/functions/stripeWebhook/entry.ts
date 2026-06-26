import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Stripe webhook — activates / revokes entitlements on the Base44 User entity.
 *
 * Handles: checkout.session.completed (purchase) and
 *          customer.subscription.deleted (cancellation).
 *
 * ── REQUIRED SETUP ─────────────────────────────────────────────────────────
 * STRIPE_WEBHOOK_SECRET  (required) — signing secret from the Stripe webhook.
 * STRIPE_SECRET_KEY      (optional) — enables reliable line-item/price lookup.
 *
 * ── HOW PRODUCT DETECTION WORKS (read this) ────────────────────────────────
 * The OLD version tried to match the buy.stripe.com URL suffix by string-
 * searching the event JSON. That suffix never appears in the webhook payload,
 * so every purchase fell through to a generic "pro" grant — add-on buyers got
 * full Pro and their add-on fields were never set. This version detects the
 * product in priority order:
 *
 *   1. session.metadata.product_key      ← RECOMMENDED. Set this on each
 *                                           Stripe Payment Link (one-time, in
 *                                           the dashboard). Most reliable.
 *   2. line item price ID                 ← used if STRIPE_SECRET_KEY is set
 *                                           and PRICE_TO_KEY is filled in.
 *   3. amount_total match                 ← optional fallback, AMOUNT_TO_KEY.
 *   4. legacy URL-suffix scan             ← best-effort, usually misses.
 *   5. FALLBACK_GRANT_PRO_ON_UNKNOWN      ← if still unknown.
 *
 * Once you've added product_key metadata to every link, detection is exact and
 * you can set FALLBACK_GRANT_PRO_ON_UNKNOWN = false for strictness.
 */

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY"); // optional

// If we can't identify the product, grant generic Pro (true) or grant nothing
// and log for manual follow-up (false). Now that every Payment Link has
// product_key metadata (subscriptions, add-ons, AND one-time programs), this is
// false: an unrecognized purchase logs an error instead of wrongly granting Pro.
const FALLBACK_GRANT_PRO_ON_UNKNOWN = false;

const TRIAL_DAYS = 7;
const SIGNATURE_TOLERANCE_SECONDS = 60 * 5; // reject events older than 5 min

/**
 * The catalog — keyed by a stable semantic product_key.
 * `updates` are the fields written to the User entity on purchase.
 */
const PRODUCT_CATALOG: Record<string, { updates: Record<string, any>; trial?: boolean; oneTime?: boolean }> = {
  // ── Subscriptions & add-ons (change in-app entitlements) ──
  pro_monthly:            { updates: { subscription_status: "pro" } },
  pro_annual:             { updates: { subscription_status: "pro" } },
  pro_lifetime:           { updates: { subscription_status: "pro_lifetime" } },
  pro_trial:              { updates: { subscription_status: "pro" }, trial: true },
  fitness_brain:          { updates: { fitness_brain_addon: true } },
  nutrition_ai:           { updates: { nutrition_plan: "ai_addon" } },
  brain_nutrition_bundle: { updates: { fitness_brain_addon: true, nutrition_plan: "ai_addon" } },
  all_access:             { updates: { subscription_status: "pro", fitness_brain_addon: true, nutrition_plan: "all_access" } },

  // ── One-time PDF programs & coaching (record-only) ──
  // Fulfilled by Stripe's instant PDF download after payment; they unlock
  // nothing in-app, so updates are empty. They're listed here ONLY so the
  // webhook recognizes them and does NOT fall through to a Pro grant. The
  // purchase is still recorded in active_products for your records.
  nutrition_guide:            { updates: {}, oneTime: true },
  womens_8week:               { updates: {}, oneTime: true },
  trimmerfit_300:             { updates: {}, oneTime: true },
  waist_goal:                 { updates: {}, oneTime: true },
  beginner_reset:             { updates: {}, oneTime: true },
  beginner_4week:             { updates: {}, oneTime: true },
  bundle_complete:            { updates: {}, oneTime: true },
  trimmerfit_advanced:        { updates: {}, oneTime: true }, // website-only $49 program
  vip_4week:                  { updates: {}, oneTime: true }, // website-only $500 coaching package
  coaching_custom_plan:       { updates: {}, oneTime: true },
  coaching_personal_training: { updates: {}, oneTime: true },
};

/**
 * When a product is cancelled, which fields it "owns" and should give back.
 * After removing the cancelled product we REBUILD entitlements from whatever
 * products remain active, so overlapping grants (e.g. all_access) are safe.
 */
const FIELD_DEFAULTS: Record<string, any> = {
  subscription_status: "free",
  fitness_brain_addon: false,
  nutrition_plan: "none",
};

// OPTIONAL: map Stripe Price IDs → product_key (needs STRIPE_SECRET_KEY).
// Fill these from your Stripe dashboard (Products → each price's price_xxx id).
const PRICE_TO_KEY: Record<string, string> = {
  // "price_123abc": "pro_monthly",
};

// OPTIONAL: map exact amount_total (in cents) → product_key. Brittle if you
// change prices, but a useful last-resort. Leave empty to skip.
const AMOUNT_TO_KEY: Record<string, string> = {
  "999":   "pro_monthly",   // $9.99/mo
  "1999":  "all_access",    // $19.99/mo (Pro + both AI add-ons)
  "19999": "pro_lifetime",  // $199.99 once
  "399":   "pro_trial",     // $3.99 7-day trial
  // NOTE: annual ($99 = 9900) starts with a 14-day trial, so amount_total is 0
  // at signup — it is matched by product_key metadata, not by amount.
};

// LEGACY/REFERENCE: buy.stripe.com URL suffix → product_key. Detection is
// metadata-first; this map is a documented reference + best-effort fallback.
const LINK_SUFFIX_TO_KEY: Record<string, string> = {
  // Subscriptions & add-ons
  "cNi4gzdWmdT09q460BbQY0q": "pro_monthly",
  "7sY6oH7xYg18dGkgFfbQY0s": "pro_annual",            // PRO Product Annual ($99/yr, 60-day trial)          // Reps and Steps PRO ($9.99/mo) — CURRENT canonical link
  "7sY8wP4lMg188m0bkVbQY01": "pro_monthly",          // Reps & Steps PRO ($9.99/mo) — CANONICAL
  "28EcN56tUbKSgSw9cNbQY0g": "pro_monthly",          // legacy WorkoutGENIE ($19.99/mo) — retired; keeps existing subs on Pro
  "aFa7sL4lM5muau82OpbQY0i": "pro_trial",            // $3.99 one-time
  "9B68wPbOecOW8m0dt3bQY0h": "pro_lifetime",
  "3cI4gz3hI4iq45KbkVbQY0m": "all_access",
  "cNi3cvcSi6qy45Kex7bQY0j": "fitness_brain",
  "8x28wP2dE9CKcCggFfbQY0p": "nutrition_ai",          // website canonical
  "28EbJ16tUcOW59OcoZbQY0k": "nutrition_ai",          // app legacy alias — verify which is the live $4.99 link
  "14A9ATf0qcOW31G9cNbQY0l": "brain_nutrition_bundle",
  // One-time programs
  "28E7sL7xY4iq31G88JbQY08": "trimmerfit_300",
  "8x2cN519AbKS59OgFfbQY05": "waist_goal",
  "7sYcN5bOe8yGcCgbkVbQY0e": "nutrition_guide",
  "7sYbJ1aKa3em9q4fBbbQY0d": "womens_8week",
  "dRmdR99G66qy9q43StbQY0f": "trimmerfit_advanced",
  "14A7sLcSidT059OgFfbQY03": "beginner_reset",
  "bJe9AT2dE2aiau8gFfbQY02": "beginner_4week",
  "8x29ATdWm5mu0Ty4WxbQY0a": "bundle_complete",
  // Coaching
  "fZucN5f0q9CKau8coZbQY0n": "coaching_custom_plan",
  "28E28rf0q8yG45K4WxbQY0o": "coaching_personal_training",
  "aEUcNVaXy5VvaXu288": "vip_4week",
};

/** Constant-time string compare to avoid timing leaks on the signature. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify the Stripe-Signature header (HMAC-SHA256 + timestamp tolerance). */
async function verifySignature(signature: string | null, body: string): Promise<boolean> {
  if (!signature || !STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((kv) => kv.split("=").map((s) => s.trim())) as [string, string][],
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  // Replay protection.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return safeEqualHex(v1, expected);
}

/** Fetch line items for a session to read its price IDs (needs secret key). */
async function fetchPriceKeys(sessionId: string): Promise<string | null> {
  if (!STRIPE_SECRET_KEY || Object.keys(PRICE_TO_KEY).length === 0) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=10`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of data.data || []) {
      const priceId = item?.price?.id;
      if (priceId && PRICE_TO_KEY[priceId]) return PRICE_TO_KEY[priceId];
    }
  } catch (e) {
    console.error("Price lookup failed:", e?.message);
  }
  return null;
}

/** Resolve the product_key for a completed checkout session. */
async function detectProductKey(session: any): Promise<string | null> {
  // 1. Explicit metadata (recommended).
  const metaKey = session.metadata?.product_key;
  if (metaKey && PRODUCT_CATALOG[metaKey]) return metaKey;

  // 2. Price ID via Stripe API.
  const byPrice = await fetchPriceKeys(session.id);
  if (byPrice && PRODUCT_CATALOG[byPrice]) return byPrice;

  // 3. Exact amount match.
  const amt = String(session.amount_total ?? "");
  if (AMOUNT_TO_KEY[amt] && PRODUCT_CATALOG[AMOUNT_TO_KEY[amt]]) return AMOUNT_TO_KEY[amt];

  // 4. Legacy URL-suffix scan (best effort).
  const blob = JSON.stringify(session);
  for (const [suffix, key] of Object.entries(LINK_SUFFIX_TO_KEY)) {
    if (blob.includes(suffix)) return key;
  }

  return null;
}

/** Build the User-entity updates for a given product key. */
function buildUpdates(key: string) {
  const entry = PRODUCT_CATALOG[key];
  const updates: Record<string, any> = { ...entry.updates };
  if (entry.trial) {
    updates.trial_expires_date = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  }
  return updates;
}

/** Find the target user by client_reference_id (preferred) then email. */
async function findUser(base44: any, opts: { refId?: string | null; email?: string | null }) {
  if (opts.refId) {
    try {
      const byId = await base44.asServiceRole.entities.User.filter({ id: opts.refId });
      if (byId.length > 0) return byId[0];
    } catch (_) { /* fall through to email */ }
  }
  if (opts.email) {
    const byEmail = await base44.asServiceRole.entities.User.filter({ email: opts.email });
    if (byEmail.length > 0) return byEmail[0];
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!(await verifySignature(signature, body))) {
      return Response.json({ error: "Invalid or missing signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    // ── PURCHASE ────────────────────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email || null;
      const refId = session.client_reference_id || null;

      const user = await findUser(base44, { refId, email });
      if (!user) {
        console.error(`No user for purchase. refId=${refId} email=${email} session=${session.id}`);
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      const key = await detectProductKey(session);
      const currentProducts = Array.isArray(user.active_products) ? user.active_products : [];

      if (!key) {
        if (!FALLBACK_GRANT_PRO_ON_UNKNOWN) {
          console.error(`UNKNOWN product, no grant. session=${session.id}. Add product_key metadata to this link.`);
          return Response.json({ received: true, warning: "unknown product, not granted" });
        }
        console.warn(`UNKNOWN product, falling back to pro. session=${session.id}`);
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: "pro",
          stripe_customer_id: session.customer,
          subscription_start_date: user.subscription_start_date || new Date().toISOString(),
        });
        return Response.json({ success: true, message: "Fallback: pro granted" });
      }

      const newProducts = [...new Set([...currentProducts, key])];
      await base44.asServiceRole.entities.User.update(user.id, {
        ...buildUpdates(key),
        stripe_customer_id: session.customer,
        subscription_start_date: user.subscription_start_date || new Date().toISOString(),
        active_products: newProducts,
      });

      console.log(`Activated [${key}] for ${user.email}. Active: ${newProducts.join(", ")}`);
      return Response.json({ success: true, message: `Activated: ${key}` });
    }

    // ── CANCELLATION ──────────────────────────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });
      if (users.length === 0) {
        console.error(`No user for cancellation. customer=${customerId}`);
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      const user = users[0];

      // Identify the cancelled product: metadata first, then price, then suffix.
      let cancelledKey: string | null = subscription.metadata?.product_key || null;
      if (!cancelledKey || !PRODUCT_CATALOG[cancelledKey]) {
        const blob = JSON.stringify(subscription);
        cancelledKey = null;
        for (const [suffix, key] of Object.entries(LINK_SUFFIX_TO_KEY)) {
          if (blob.includes(suffix)) { cancelledKey = key; break; }
        }
        for (const [priceId, key] of Object.entries(PRICE_TO_KEY)) {
          if (blob.includes(priceId)) { cancelledKey = key; break; }
        }
      }

      const currentProducts = Array.isArray(user.active_products) ? user.active_products : [];
      const remaining = cancelledKey
        ? currentProducts.filter((p: string) => p !== cancelledKey)
        : currentProducts;

      // Reset owned fields to defaults, then re-apply everything still active.
      const rebuilt: Record<string, any> = { ...FIELD_DEFAULTS, active_products: remaining };
      for (const key of remaining) {
        const entry = PRODUCT_CATALOG[key];
        if (entry) Object.assign(rebuilt, entry.updates);
      }
      // A surviving trial keeps its expiry; a cancelled/ended one is cleared.
      rebuilt.trial_expires_date = remaining.includes("pro_trial") ? user.trial_expires_date : null;

      await base44.asServiceRole.entities.User.update(user.id, rebuilt);
      console.log(`Cancelled [${cancelledKey || "unknown"}] for ${user.email}. Remaining: ${remaining.join(", ")}`);
      return Response.json({ success: true, message: `Cancelled: ${cancelledKey || "unknown"}` });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error?.message, error?.stack);
    return Response.json({ error: error?.message || "Webhook failure" }, { status: 500 });
  }
});