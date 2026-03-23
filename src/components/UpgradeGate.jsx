/**
 * UpgradeGate — generic feature gate component.
 *
 * Props:
 *   locked      – boolean: true = show upsell, false = show children
 *   loading     – boolean
 *   title       – feature name shown in lock card
 *   description – short description
 *   price       – e.g. "$1.99/mo"
 *   gradient    – tailwind gradient classes e.g. "from-purple-600 to-blue-600"
 *   addonPage   – page name to navigate to (default "AddOns")
 *   children
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UpgradeGate({
  locked,
  loading,
  title = "This Feature",
  description = "Upgrade to unlock this feature.",
  price,
  gradient = "from-blue-600 to-purple-600",
  addonPage = "AddOns",
  children,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!locked) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-xl`}>
        <Lock className="w-9 h-9 text-white" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">{title} is a Premium Add-On</h2>
      <p className="text-gray-400 text-sm mb-1">{description}</p>
      {price && <p className="text-gray-500 text-xs mb-6">Only {price}</p>}
      <Button
        onClick={() => navigate(createPageUrl(addonPage))}
        className={`bg-gradient-to-r ${gradient} text-white font-bold px-8 py-3 rounded-xl gap-2`}
      >
        <Zap className="w-4 h-4" />
        View Add-Ons &amp; Pricing
      </Button>
    </div>
  );
}