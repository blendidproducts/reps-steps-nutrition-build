import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Check, Camera, Link2, Zap, Star, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const AI_ADDON_FEATURES = [
  { icon: Camera, text: "AI food photo nutrition analysis" },
  { icon: Camera, text: "AI calorie photo scan of meals" },
  { icon: Link2,  text: "Import nutrition from any food website URL" },
];

const ALL_ACCESS_FEATURES = [
  { text: "Everything in AI Nutrition Add-On" },
  { text: "All current nutrition features" },
  { text: "All future nutrition features — forever" },
  { text: "Nutrition programs & meal plans" },
  { text: "Priority support for nutrition questions" },
];

export default function NutritionPricing() {
  const navigate = useNavigate();

  const handleBuyAddon = () => {
    // Link to the $3.99/mo AI Add-On Stripe product
    window.open("https://buy.stripe.com/nutrition_ai_addon", "_blank");
  };

  const handleBuyAllAccess = () => {
    // Link to the $29.99/mo All-Access Stripe product
    window.open("https://buy.stripe.com/nutrition_all_access", "_blank");
  };

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Nutrition"))} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Nutrition Plans</h1>
            <p className="text-white/80 text-xs mt-0.5">Upgrade to unlock AI-powered nutrition tools</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Free tier reminder */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                <span className="text-lg">🆓</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Free Nutrition</div>
                <p className="text-gray-400 text-xs">Log meals, track calories, food database, meal plans</p>
              </div>
              <div className="ml-auto text-gray-400 font-bold">$0</div>
            </div>
          </CardContent>
        </Card>

        {/* AI Add-On */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-900/20 to-amber-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <CardTitle className="text-white text-lg">AI Nutrition Add-On</CardTitle>
                  </div>
                  <p className="text-gray-400 text-sm">AI-powered food analysis tools</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-400">$3.99</div>
                  <div className="text-gray-500 text-xs">/month</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2.5">
                {AI_ADDON_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-200">{f.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                onClick={handleBuyAddon}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get AI Add-On — $3.99/mo
              </Button>
              <p className="text-xs text-gray-500 text-center">After payment, your plan will be activated automatically.</p>
            </CardFooter>
          </Card>
        </motion.div>

        {/* All Access */}
        <motion.div whileHover={{ scale: 1.01 }}>
          <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-black text-xs px-4 py-1.5 rounded-bl-xl">
              BEST VALUE
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-5 h-5 text-emerald-400" />
                    <CardTitle className="text-white text-lg">Nutrition All-Access</CardTitle>
                  </div>
                  <p className="text-gray-400 text-sm">Everything, now and forever</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">$29.99</div>
                  <div className="text-gray-500 text-xs">/month</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-2.5">
                {ALL_ACCESS_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className={i === 0 ? "text-emerald-300 font-semibold" : "text-gray-200"}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                onClick={handleBuyAllAccess}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get All-Access — $29.99/mo
              </Button>
              <p className="text-xs text-gray-500 text-center">After payment, your plan will be activated automatically.</p>
            </CardFooter>
          </Card>
        </motion.div>

        <p className="text-center text-gray-600 text-xs">
          Nutrition plans are separate from workout subscriptions. Questions? Contact support.
        </p>
      </div>
    </div>
  );
}