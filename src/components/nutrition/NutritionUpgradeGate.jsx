/**
 * NutritionUpgradeGate
 *
 * Wrap any nutrition premium feature with this component.
 * If the user doesn't have the required plan it shows an upsell card instead.
 *
 * Props:
 *   requiredPlan  – "ai_addon" | "all_access"
 *   loading       – boolean (from useNutritionPlan)
 *   plan          – current plan string (from useNutritionPlan)
 *   children      – content to show when access is granted
 *   featureName   – short label for the locked feature (shown in card)
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAN_LABELS = {
  ai_addon:   { name: "AI Nutrition Add-On", price: "$4.99/mo",  color: "from-orange-600 to-amber-600",  badge: "bg-orange-500" },
  all_access: { name: "Nutrition All-Access", price: "$19.99/mo", color: "from-emerald-600 to-teal-600", badge: "bg-emerald-500" },
};

const PLAN_ORDER = ["none", "ai_addon", "all_access"];

function planSatisfies(userPlan, required) {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(required);
}

export default function NutritionUpgradeGate({ requiredPlan = "ai_addon", loading, plan, featureName = "this feature", children }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-white/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (planSatisfies(plan, requiredPlan)) {
    return <>{children}</>;
  }

  const info = PLAN_LABELS[requiredPlan];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-4 shadow-lg`}>
        <Lock className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">{featureName} is a Premium Feature</h2>
      <p className="text-gray-400 text-sm mb-1">
        Requires the <span className="text-white font-semibold">{info.name}</span> plan
      </p>
      <p className="text-gray-500 text-xs mb-6">Starting at {info.price}</p>
      <Button
        onClick={() => navigate(createPageUrl("NutritionPricing"))}
        className={`bg-gradient-to-r ${info.color} text-white font-bold px-8 py-3 rounded-xl`}
      >
        <Zap className="w-4 h-4 mr-2" />
        View Nutrition Plans
      </Button>
    </div>
  );
}