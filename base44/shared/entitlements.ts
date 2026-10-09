/**
 * entitlements.ts — server-side entitlement checks for paywalled AI features.
 *
 * These mirror the client-side gates exactly so the UI stays cosmetic and the
 * real enforcement happens here:
 *   - isPro            → src/lib/proCheck.js (Pro subscription)
 *   - hasFitnessBrain  → src/hooks/useAddons.js (fitness_brain_addon)
 *   - hasNutritionAi   → src/hooks/useNutritionPlan.js (nutrition_plan AI add-on)
 *
 * Admin always passes, matching the client hooks. The entitlement fields are
 * written by stripeWebhook (see PRODUCT_CATALOG).
 */

export function isPro(user) {
  if (!user) return false;
  return (
    user.is_pro === true ||
    user.subscription_status === "pro" ||
    user.subscription_status === "pro_lifetime" ||
    user.role === "admin"
  );
}

export function hasFitnessBrain(user) {
  if (!user) return false;
  return user.role === "admin" || user.fitness_brain_addon === true;
}

export function hasNutritionAi(user) {
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.nutrition_plan === "ai_addon" ||
    user.nutrition_plan === "all_access"
  );
}