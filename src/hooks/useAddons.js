/**
 * useAddons — Single source of truth for all add-on entitlements.
 *
 * Add-ons stored on user object:
 *   user.nutrition_plan    – "none" | "ai_addon" | "all_access"
 *   user.fitness_brain_addon – boolean
 *
 * Admins always have all add-ons enabled (for testing).
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useAddons() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";

  const hasFitnessBrain = isAdmin || !!user?.fitness_brain_addon;
  const hasNutritionAi  = isAdmin || user?.nutrition_plan === "ai_addon" || user?.nutrition_plan === "all_access";
  const hasNutritionAll = isAdmin || user?.nutrition_plan === "all_access";

  return { user, loading, isAdmin, hasFitnessBrain, hasNutritionAi, hasNutritionAll };
}