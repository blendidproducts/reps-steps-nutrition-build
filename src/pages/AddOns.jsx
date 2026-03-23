import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Apple, Camera, Link2, Utensils, Users,
  Check, ExternalLink, Zap, Star, Lock, ArrowLeft, ChevronRight
} from "lucide-react";

const ADD_ONS = [
  {
    id: "fitness_brain",
    icon: Brain,
    gradient: "from-blue-600 to-purple-700",
    badge: "AI Powered",
    badgeColor: "bg-purple-600",
    title: "AI Fitness Brain",
    subtitle: "Your 24/7 personal AI coach",
    price: "$4.99",
    period: "/mo",
    stripeUrl: "https://buy.stripe.com/YOUR_STRIPE_LINK_FITNESS_BRAIN",
    features: [
      "Daily AI analysis & coaching message",
      "Smart calorie & macro adjustments",
      "Sleep, recovery & hormone tracking",
      "Transformation predictor",
      "Weekly AI performance reports",
      "Adaptive workout intensity suggestions",
    ],
  },
  {
    id: "nutrition_ai",
    icon: Camera,
    gradient: "from-orange-500 to-amber-600",
    badge: "AI Powered",
    badgeColor: "bg-orange-500",
    title: "AI Nutrition Add-On",
    subtitle: "Photo-based calorie tracking + meal builder",
    price: "$4.99",
    period: "/mo",
    stripeUrl: "https://buy.stripe.com/YOUR_STRIPE_LINK_NUTRITION_AI",
    features: [
      "AI Food Photo Analyzer",
      "Snap a meal — get instant macros",
      "Link Meal Builder (paste any recipe URL)",
      "Auto-build meal plans from websites",
    ],
  },
  {
    id: "brain_nutrition_bundle",
    icon: Zap,
    gradient: "from-violet-600 to-fuchsia-600",
    badge: "Save 20%",
    badgeColor: "bg-violet-500",
    title: "Brain + Nutrition Bundle",
    subtitle: "Both AI add-ons at a discount",
    price: "$7.99",
    period: "/mo",
    stripeUrl: "https://buy.stripe.com/YOUR_STRIPE_LINK_BUNDLE",
    features: [
      "Everything in AI Fitness Brain",
      "Everything in AI Nutrition Add-On",
      "Save $1.99/mo vs buying separately",
    ],
  },
];

const BUNDLES = [
  {
    id: "pro_monthly",
    icon: Star,
    gradient: "from-[#0066cc] to-blue-700",
    badge: "Most Popular",
    badgeColor: "bg-[#0066cc]",
    title: "Pro — AI Workouts",
    subtitle: "Core AI workout features unlocked",
    price: "$9.99",
    period: "/mo",
    stripeUrl: "https://buy.stripe.com/7sY8wP4lMg188m0bkVbQY01",
    features: [
      "WorkoutGenie AI (instant workout builder)",
      "AI Auto Mode workout generator",
      "Preset programs & advanced analytics",
      "Unlimited saved workouts",
      "Priority support",
    ],
  },
  {
    id: "all_access",
    icon: Zap,
    gradient: "from-emerald-500 to-teal-600",
    badge: "Best Value",
    badgeColor: "bg-emerald-500",
    title: "All-Access",
    subtitle: "Pro + AI Brain + AI Nutrition — everything",
    price: "$14.99",
    period: "/mo",
    stripeUrl: "https://buy.stripe.com/YOUR_STRIPE_LINK_ALL_ACCESS",
    features: [
      "Everything in Pro AI Workouts",
      "AI Fitness Brain coaching",
      "AI Nutrition photo analyzer & meal builder",
      "Save $5/mo vs buying separately",
      "All future features included",
    ],
  },
  {
    id: "pro_lifetime",
    icon: Lock,
    gradient: "from-yellow-500 to-orange-500",
    badge: "Best Deal",
    badgeColor: "bg-yellow-500",
    title: "Pro Lifetime",
    subtitle: "Pay once, keep Pro AI Workouts forever",
    price: "$149.99",
    period: " once",
    stripeUrl: "https://buy.stripe.com/9B68wPbOecOW8m0dt3bQY0h",
    features: [
      "Everything in Pro AI Workouts",
      "Lifetime access — zero recurring fees",
      "All future workout updates included",
    ],
  },
];

const COACHING = {
  gradient: "from-rose-600 to-pink-700",
  badge: "1-on-1",
  badgeColor: "bg-rose-600",
  title: "Custom Coaching",
  subtitle: "Real human coach, fully personalized to you",
  price: "$197",
  period: "/mo",
  stripeUrl: "https://buy.stripe.com/YOUR_STRIPE_LINK_COACHING",
  websiteUrl: "https://repsandsteps.com/coaching",
  price: "$149",
  period: "/mo",
  features: [
    "Dedicated personal coach assigned to you",
    "Weekly check-ins & program adjustments",
    "Custom workout & nutrition plan",
    "Unlimited messaging with your coach",
    "Accountability & motivation system",
    "Goal setting & progress reviews",
    "Access to exclusive coaching community",
  ],
};

function AddOnCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className={`bg-gradient-to-br ${item.gradient} p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className={`${item.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
            {item.badge}
          </span>
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">{item.title}</h3>
        <p className="text-white/75 text-xs mt-0.5">{item.subtitle}</p>
        <div className="mt-3">
          <span className="text-3xl font-black text-white">{item.price}</span>
          <span className="text-white/70 text-sm">{item.period}</span>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 space-y-2">
        {item.features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            <span className="text-gray-300 text-xs">{f}</span>
          </div>
        ))}
        <Button
          onClick={() => window.open(item.stripeUrl, "_blank")}
          className={`w-full mt-3 bg-gradient-to-r ${item.gradient} text-white font-bold rounded-xl gap-2 hover:opacity-90`}
        >
          <ExternalLink className="w-4 h-4" />
          Get {item.title}
        </Button>
      </div>
    </motion.div>
  );
}

export default function AddOns() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] border-b border-white/10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00a9ff] to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Add-Ons & Pricing</h1>
              <p className="text-gray-400 text-sm">Build your perfect plan — pay only for what you use</p>
            </div>
          </div>

          {/* Free base note */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3 mt-4">
            <Check className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">
              Core app is <strong>free forever</strong> — manual workouts, exercise library, history & progress tracking included at no cost.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-7 space-y-10">

        {/* ── Step 1: Pro Base ── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-[#0066cc] text-white text-xs font-black flex items-center justify-center">1</span>
            <h2 className="text-white font-bold text-lg">Start with Pro — AI Workouts</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">The base plan unlocks all AI workout features</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUNDLES.map((b, i) => <AddOnCard key={b.id} item={b} index={i} />)}
          </div>
        </section>

        {/* ── Step 2: Add-Ons ── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">2</span>
            <h2 className="text-white font-bold text-lg">Layer On AI Add-Ons</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">Customize your plan — add only what you need</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADD_ONS.map((a, i) => <AddOnCard key={a.id} item={a} index={i} />)}
          </div>
        </section>

        {/* ── Custom Coaching ── */}
        <section>
          <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-400" /> 1-on-1 Custom Coaching
          </h2>
          <p className="text-gray-500 text-sm mb-4">Human expertise, not just AI</p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-rose-900/30 to-pink-900/30 border-2 border-rose-500/40 rounded-2xl overflow-hidden"
          >
            <div className={`bg-gradient-to-br ${COACHING.gradient} p-6`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <span className={`${COACHING.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
                  {COACHING.badge}
                </span>
              </div>
              <h3 className="text-white font-black text-2xl">{COACHING.title}</h3>
              <p className="text-white/80 text-sm mt-0.5">{COACHING.subtitle}</p>
              <div className="mt-3">
                <span className="text-4xl font-black text-white">$149</span>
                <span className="text-white/70 text-base">/mo</span>
                <span className="ml-2 text-white/50 line-through text-xl">$199</span>
              </div>
            </div>

            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-2 mb-5">
                {COACHING.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-gray-300 text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                 onClick={() => window.open(COACHING.stripeUrl, "_blank")}
                 className="bg-gradient-to-r from-rose-600 to-pink-700 text-white font-bold rounded-xl gap-2 hover:opacity-90 py-3"
                >
                 <ExternalLink className="w-4 h-4" />
                 Enroll Now — $149/mo
                </Button>
                {COACHING.websiteUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(COACHING.websiteUrl, "_blank")}
                    className="border-rose-500/40 text-rose-300 hover:border-rose-400 hover:bg-rose-500/10 gap-2 py-3"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Learn More on Website
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Pricing Summary Table ── */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4">Quick Price Overview</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {[
              { label: "Core App", price: "Free", color: "text-green-400" },
              { label: "Pro — AI Workouts", price: "$9.99/mo", color: "text-[#00a9ff]" },
              { label: "Pro Lifetime", price: "$149.99 once", color: "text-yellow-400" },
              { label: "AI Fitness Brain Add-On", price: "+ $4.99/mo", color: "text-blue-400" },
              { label: "AI Nutrition Add-On", price: "+ $4.99/mo", color: "text-orange-400" },
              { label: "Brain + Nutrition Bundle", price: "+ $7.99/mo", color: "text-violet-400" },
              { label: "All-Access (Pro + Both AI Add-Ons)", price: "$14.99/mo", color: "text-emerald-400" },
              { label: "Custom Coaching (1-on-1 Human)", price: "$149/mo", color: "text-rose-400" },
            ].map((row, i, arr) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
                <span className="text-gray-300 text-sm">{row.label}</span>
                <span className={`font-bold text-sm ${row.color}`}>{row.price}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs text-center mt-3">
            All payments processed securely via Stripe. Cancel anytime.
          </p>
        </section>

      </div>
    </div>
  );
}