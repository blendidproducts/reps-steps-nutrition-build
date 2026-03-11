import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { NutritionProgram } from "@/entities/NutritionProgram";
import { MealLog } from "@/entities/MealLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  Link2, Loader2, CheckCircle, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplets, ArrowLeft, Save, Plus,
  CalendarPlus, BookmarkPlus, X
} from "lucide-react";

const MEAL_META = {
  breakfast: { emoji: "🌅", color: "#f59e0b", label: "Breakfast" },
  lunch:     { emoji: "☀️", color: "#10b981", label: "Lunch" },
  dinner:    { emoji: "🌙", color: "#3b82f6", label: "Dinner" },
  snack:     { emoji: "🍎", color: "#8b5cf6", label: "Snack" },
};

const DAYS_OF_WEEK = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const MEAL_TYPES = ["breakfast","lunch","dinner","snack"];

// Modal for choosing where to add a meal
function AddMealModal({ meal, programs, onClose, onAdded }) {
  const [mode, setMode] = useState("log"); // "log" or "program"
  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectedMealType, setSelectedMealType] = useState(meal.meal_type || "breakfast");
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id || "");
  const [targetDayNum, setTargetDayNum] = useState(1);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const selectedProgramObj = programs.find(p => p.id === selectedProgram);
  const maxDay = selectedProgramObj?.duration_days || selectedProgramObj?.daily_meal_plans?.length || 7;

  const handleAdd = async () => {
    setSaving(true);
    if (mode === "log") {
      // Add to today's meal log (or chosen date)
      await MealLog.create({
        date: logDate,
        meal_type: selectedMealType,
        food_name: meal.meal_name,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        servings: 1,
      });
    } else if (mode === "program" && selectedProgramObj) {
      // Inject meal into the chosen day of the nutrition program
      const plans = selectedProgramObj.daily_meal_plans ? [...selectedProgramObj.daily_meal_plans] : [];
      const dayIdx = plans.findIndex(d => d.day_number === targetDayNum);
      const newMealEntry = {
        meal_type: selectedMealType,
        meal_name: meal.meal_name,
        ingredients: meal.ingredients || [],
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        instructions: meal.instructions || ""
      };
      if (dayIdx >= 0) {
        plans[dayIdx] = {
          ...plans[dayIdx],
          meals: [...(plans[dayIdx].meals || []), newMealEntry],
          total_calories: (plans[dayIdx].total_calories || 0) + (meal.calories || 0)
        };
      } else {
        plans.push({
          day_number: targetDayNum,
          day_name: `Day ${targetDayNum}`,
          meals: [newMealEntry],
          total_calories: meal.calories || 0,
          notes: ""
        });
      }
      await NutritionProgram.update(selectedProgram, { daily_meal_plans: plans });
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => { onAdded(); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1b2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <div>
            <div className="text-white font-bold">{MEAL_META[meal.meal_type]?.emoji} {meal.meal_name}</div>
            <div className="text-gray-500 text-xs mt-0.5">{meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("log")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${mode === "log" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
            >
              <CalendarPlus className="w-4 h-4" /> Log to Day
            </button>
            <button
              onClick={() => setMode("program")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${mode === "program" ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
            >
              <BookmarkPlus className="w-4 h-4" /> Add to Program
            </button>
          </div>

          {/* Meal type picker (shared) */}
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Meal Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(t => (
                <button key={t} onClick={() => setSelectedMealType(t)}
                  className={`py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${selectedMealType === t ? "border-white/30 text-white" : "border-white/10 text-gray-500 hover:border-white/20"}`}
                  style={selectedMealType === t ? { backgroundColor: (MEAL_META[t]?.color || "#6b7280") + "33", borderColor: MEAL_META[t]?.color } : {}}>
                  {MEAL_META[t]?.emoji} {t}
                </button>
              ))}
            </div>
          </div>

          {mode === "log" && (
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Date</label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          )}

          {mode === "program" && (
            <>
              {programs.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No nutrition programs yet. Save this plan first.</div>
              ) : (
                <>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Program</label>
                    <select value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setTargetDayNum(1); }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400">
                      {programs.map(p => <option key={p.id} value={p.id} style={{ background: "#0d1b2e" }}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Day <span className="text-gray-600">(1–{maxDay})</span></label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={1} max={maxDay} value={targetDayNum} onChange={e => setTargetDayNum(Number(e.target.value))}
                        className="flex-1 accent-blue-500" />
                      <span className="text-white font-bold text-sm w-6 text-center">{targetDayNum}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {done ? (
            <div className="bg-emerald-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold">
              <CheckCircle className="w-5 h-5" /> Added!
            </div>
          ) : (
            <Button onClick={handleAdd} disabled={saving || (mode === "program" && programs.length === 0)}
              className={`w-full font-bold py-3 rounded-xl gap-2 ${mode === "log" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Adding..." : mode === "log" ? "Log this meal" : "Add to Program"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkMealBuilder() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mealPlan, setMealPlan] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [activeMeal, setActiveMeal] = useState(null); // meal being added

  useEffect(() => {
    NutritionProgram.list().then(setPrograms).catch(() => {});
  }, []);

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

  const handleSaveAll = async () => {
    if (!mealPlan) return;
    setSaving(true);
    try {
      const created = await NutritionProgram.create({
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
      // Refresh programs list so modal can target the new program
      const updated = await NutritionProgram.list();
      setPrograms(updated);
    } catch (e) {
      setError("Failed to save meal plan. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
      {/* Add Meal Modal */}
      {activeMeal && (
        <AddMealModal
          meal={activeMeal}
          programs={programs}
          onClose={() => setActiveMeal(null)}
          onAdded={() => NutritionProgram.list().then(setPrograms)}
        />
      )}

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
              <Button onClick={handleParse} disabled={loading || !url.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Build"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">Works with food blogs, recipe sites, nutrition guides, and diet websites</p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {/* Loading */}
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
                    { icon: Beef,  label: "Protein",  value: Math.round(mealPlan.avg_daily_protein || 0),  unit: "g",    color: "#ef4444" },
                    { icon: Wheat, label: "Carbs",    value: Math.round(mealPlan.avg_daily_carbs || 0),    unit: "g",    color: "#eab308" },
                    { icon: Droplets, label: "Fat",   value: Math.round(mealPlan.avg_daily_fat || 0),      unit: "g",    color: "#3b82f6" },
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
                        <div className="text-gray-500 text-xs">
                          {day.meals?.length || 0} meals · {Math.round(day.total_calories || 0)} kcal
                          {/* Meal type summary chips */}
                          {day.meals && (
                            <span className="ml-2">
                              {["breakfast","lunch","dinner","snack"].filter(t => day.meals.some(m => m.meal_type === t)).map(t => (
                                <span key={t} className="mr-1">{MEAL_META[t]?.emoji}</span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedDay === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {expandedDay === idx && (
                    <div className="px-4 pb-4 space-y-2 border-t border-white/5">
                      {(day.meals || []).map((meal, mi) => {
                        const meta = MEAL_META[meal.meal_type] || { emoji: "🍽️", color: "#6b7280", label: meal.meal_type };
                        return (
                          <div key={mi} className="bg-black/20 rounded-xl p-3 mt-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {/* Meal type badge */}
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex items-center gap-1"
                                    style={{ backgroundColor: meta.color + "33", color: meta.color }}>
                                    {meta.emoji} {meta.label}
                                  </span>
                                  <span className="text-white font-medium text-sm">{meal.meal_name}</span>
                                </div>
                                {meal.ingredients?.length > 0 && (
                                  <p className="text-gray-500 text-xs mt-1 truncate">{meal.ingredients.join(", ")}</p>
                                )}
                                <div className="flex gap-3 mt-2 text-xs">
                                  <span className="text-orange-400">{meal.calories} kcal</span>
                                  <span className="text-red-400">{meal.protein}g P</span>
                                  <span className="text-yellow-400">{meal.carbs}g C</span>
                                  <span className="text-blue-400">{meal.fat}g F</span>
                                </div>
                                {meal.instructions && (
                                  <p className="text-gray-500 text-xs mt-1.5 italic">{meal.instructions}</p>
                                )}
                              </div>
                              {/* Add button */}
                              <button
                                onClick={() => setActiveMeal(meal)}
                                className="shrink-0 mt-0.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-all whitespace-nowrap"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                          </div>
                        );
                      })}
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

            {/* Save All Button */}
            <div className="sticky bottom-20 md:bottom-4 pt-2">
              {saved ? (
                <div className="bg-emerald-600 text-white rounded-xl px-5 py-3.5 flex items-center justify-center gap-2 font-bold">
                  <CheckCircle className="w-5 h-5" /> Saved to Nutrition Programs!
                </div>
              ) : (
                <Button onClick={handleSaveAll} disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-base gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Saving..." : "Save Full Plan to Nutrition Programs"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}