/**
 * useNutritionPlan — Nutrition subscription entitlement hook.
 *
 * Plans:
 *   "none"       – no paid nutrition plan (free tier)
 *   "ai_addon"   – AI Nutrition Add-On ($3.99/mo)
 *                  Grants: photo analyzer, calorie scan, link meal builder
 *   "all_access" – Nutrition All-Access ($29.99/mo)
 *                  Grants: everything in ai_addon + all current & future nutrition features
 *
 * The plan is stored on the user object as `nutrition_plan`:
 *   null / undefined  → "none"
 *   "ai_addon"        → "ai_addon"
 *   "all_access"      → "all_access"
 *
 * Admins always get all_access (for testing / internal use).
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useNutritionPlan() {
  const [plan, setPlan] = useState(null); // null = still loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        if (user.role === "admin") {
          setPlan("all_access");
        } else {
          setPlan(user.nutrition_plan || "none");
        }
      })
      .catch(() => setPlan("none"))
      .finally(() => setLoading(false));
  }, []);

  const hasAiAddon    = plan === "ai_addon" || plan === "all_access";
  const hasAllAccess  = plan === "all_access";

  return { plan, loading, hasAiAddon, hasAllAccess };
}