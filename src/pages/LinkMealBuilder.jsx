import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { NutritionProgram } from "@/entities/NutritionProgram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Link2, Loader2, CheckCircle, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplets, ArrowLeft, Save, Utensils
} from "lucide-react";

export default function LinkMealBuilder() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mealPlan, setMealPlan] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleParse = async () => {
    if (!url.trim()) return;
    setError("");
    setMealPlan(null);
    setSaved(false);
    setLoading(true);
    try {
      const resp = await base44.functions.invoke("parseMealPlanFromUrl", { url: url.trim() });
      if (resp.data.error) {
        setError(resp.data.error);
      } else {
        setMealPlan(resp.data.mealPlan);
        setExpandedDay(0);
      }
    } catch (e) {
      setError("Failed to parse the URL. Please try a different link.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!mealPlan) return;
    setSaving(true);
    try {
      await NutritionProgram.create({
        name: mealPlan.plan_name || "Imported Meal Plan",
        description: mealPlan.description || "",
        program_type: mealPlan.goal_type || "maintenance",
        duration_days: mealPlan.days?.length || 1,
        daily_calories_target: Math.round(mealPlan.avg_daily_calories || 0),
        daily_protein_grams: Math.round(mealPlan.avg_daily_protein || 0),
        daily_carbs_grams: Math.round(mealPlan.avg_daily_carbs || 0),
        daily_fat_grams: Math.round(mealPlan.avg_daily_fat || 0),
        daily_meal_plans: mealPlan.days?.map(day => ({
          day_number: day.day_number,
          day_name: day.day_name,
          meals: day.meals?.map(m => ({
            meal_type: m.meal_type,
            meal_name: m.meal_name,
            ingredients: m.ingredients || [],
            calories: m.calories || 0,
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fat: m.fat || 0,
            instructions: m.instructions || ""
          })) || [],
          total_calories: day.total_calories || 0,
          notes: day.notes || ""
        })) || [],
        is_preset: false,
        tips: mealPlan.tips || []
      });
      setSaved(true);
    } catch (e) {
      setError("Failed to save meal plan. Please try again.");
    }
    setSaving(false);
  };

  const MEAL_COLORS = {
    breakfast: "#f59e0b",
    lunch: "#10b981",
    dinner: "#3b82f6",
    snack: "#8b5cf6"
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Nutrition"))} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5" /> Link Meal Builder
            </h1>
            <p className="text-white/80 text-xs mt-0.5">Paste any recipe or meal plan URL to auto-generate a nutrition plan</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* URL Input */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 space-y-3">
            <label className="text-sm text-gray-300 font-medium">Paste a meal plan or recipe URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleParse()}
                placeholder="https://example.com/meal-plan..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <Button
                onClick={handleParse}
                disabled={loading || !url.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Build"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">Works with food blogs, recipe sites, nutrition guides, and diet websites</p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-300 font-medium">Reading and analyzing the page...</p>
            <p className="text-gray-500 text-sm mt-1">This may take 10–20 seconds</p>
          </div>
        )}

        {/* Results */}
        {mealPlan && !loading && (
          <>
            {/* Plan Summary */}
            <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-white font-bold text-lg">{mealPlan.plan_name}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">{mealPlan.description}</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white capitalize shrink-0 ml-3">
                    {(mealPlan.goal_type || "").replace("_", " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { icon: Flame, label: "Calories", value: Math.round(mealPlan.avg_daily_calories || 0), unit: "kcal", color: "#f97316" },
                    { icon: Beef, label: "Protein", value: Math.round(mealPlan.avg_daily_protein || 0), unit: "g", color: "#ef4444" },
                    { icon: Wheat, label: "Carbs", value: Math.round(mealPlan.avg_daily_carbs || 0), unit: "g", color: "#eab308" },
                    { icon: Droplets, label: "Fat", value: Math.round(mealPlan.avg_daily_fat || 0), unit: "g", color: "#3b82f6" },
                  ].map(({ icon: Icon, label, value, unit, color }) => (
                    <div key={label} className="bg-black/20 rounded-xl p-2.5 text-center">
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                      <div className="text-white font-bold text-sm">{value}<span className="text-gray-400 text-xs ml-0.5">{unit}</span></div>
                      <div className="text-gray-500 text-[10px]">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Days */}
            <div className="space-y-3">
              {(mealPlan.days || []).map((day, idx) => (
                <Card key={idx} className="bg-white/5 border-white/10 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold text-sm flex items-center justify-center">
                        {day.day_number}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">{day.day_name || `Day ${day.day_number}`}</div>
                        <div className="text-gray-500 text-xs">{day.meals?.length || 0} meals · {Math.round(day.total_calories || 0)} kcal</div>
                      </div>
                    </div>
                    {expandedDay === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {expandedDay === idx && (
                    <div className="px-4 pb-4 space-y-2 border-t border-white/5">
                      {(day.meals || []).map((meal, mi) => (
                        <div key={mi} className="bg-black/20 rounded-xl p-3 mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                                style={{ backgroundColor: (MEAL_COLORS[meal.meal_type] || "#6b7280") + "33", color: MEAL_COLORS[meal.meal_type] || "#9ca3af" }}>
                                {meal.meal_type}
                              </span>
                              <span className="text-white font-medium text-sm">{meal.meal_name}</span>
                            </div>
                            <span className="text-gray-400 text-xs">{meal.calories} kcal</span>
                          </div>
                          {meal.ingredients?.length > 0 && (
                            <p className="text-gray-500 text-xs mt-1">{meal.ingredients.join(", ")}</p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-gray-400">
                            <span className="text-red-400">{meal.protein}g P</span>
                            <span className="text-yellow-400">{meal.carbs}g C</span>
                            <span className="text-blue-400">{meal.fat}g F</span>
                          </div>
                          {meal.instructions && (
                            <p className="text-gray-500 text-xs mt-2 italic">{meal.instructions}</p>
                          )}
                        </div>
                      ))}
                      {day.notes && <p className="text-gray-500 text-xs mt-2 italic">💡 {day.notes}</p>}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Tips */}
            {mealPlan.tips?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">💡 Tips</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {mealPlan.tips.map((tip, i) => (
                      <li key={i} className="text-gray-400 text-xs flex gap-2">
                        <span className="text-emerald-400 shrink-0">•</span>{tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="sticky bottom-20 md:bottom-4 pt-2">
              {saved ? (
                <div className="bg-emerald-600 text-white rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 font-bold">
                  <CheckCircle className="w-5 h-5" /> Saved to Nutrition Programs!
                </div>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-base gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Saving..." : "Save to My Nutrition Programs"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}