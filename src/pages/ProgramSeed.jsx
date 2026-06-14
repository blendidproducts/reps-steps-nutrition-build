/**
 * ProgramSeed.jsx — Admin tool to seed starter PresetProgram / NutritionProgram
 * records. Mirrors ExerciseSeed.jsx: checks what already exists by name,
 * only creates what's missing, safe to re-run, never overwrites or deletes.
 *
 * Scope (v1): one 7-day "Start Here" workout program + one 7-day
 * "Foundations Nutrition Plan" — enough to make the Preset Programs / Nutrition
 * Programs tabs populated and fully functional. Additional programs from
 * programHierarchy.jsx (Beginner Strength Foundation, Intermediate Build
 * Phase, Trimmer Fit 300, Advanced Endurance, Advanced Strength Program) can
 * be added the same way later.
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronLeft,
  Calendar, StopCircle
} from "lucide-react";

// ── Timeout helper ────────────────────────────────────────────────────────────
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ── Workout program seed: "Start Here" (7 days) ────────────────────────────────
const START_HERE_PROGRAM = {
  name: "Start Here",
  description: "Perfect for absolute beginners — learn the basics, build the habit, and get comfortable with foundational bodyweight movements over your first week.",
  category: "full_body",
  difficulty: "beginner",
  duration_days: 7,
  is_preset: true,
  program_type: "workout",
  thumbnail_url: "",
  daily_plans: [
    {
      day_number: 1, day_name: "Day 1", workout_name: "Full-Body Foundations", is_rest_day: false, total_reps: 96,
      exercises: [
        { exercise_name: "Jumping Jack",    sets: 2, target_reps: 0,  target_time: 30, circuit_number: 1, rest_after_circuit_seconds: 60 },
        { exercise_name: "Incline Push-Up", sets: 3, target_reps: 8,  target_time: 0,  circuit_number: 2, rest_after_circuit_seconds: 60 },
        { exercise_name: "Squat",           sets: 3, target_reps: 12, target_time: 0,  circuit_number: 3, rest_after_circuit_seconds: 60 },
        { exercise_name: "Glute Bridge",    sets: 3, target_reps: 12, target_time: 0,  circuit_number: 4, rest_after_circuit_seconds: 60 },
        { exercise_name: "Plank",           sets: 2, target_reps: 0,  target_time: 20, circuit_number: 5, rest_after_circuit_seconds: 60 },
      ],
    },
    {
      day_number: 2, day_name: "Day 2", workout_name: "Rest & Recovery", is_rest_day: true, total_reps: 0,
      exercises: [],
    },
    {
      day_number: 3, day_name: "Day 3", workout_name: "Lower Body Basics", is_rest_day: false, total_reps: 137,
      exercises: [
        { exercise_name: "Squat",        sets: 3, target_reps: 12, target_time: 0,  circuit_number: 1, rest_after_circuit_seconds: 60 },
        { exercise_name: "Lunge",        sets: 2, target_reps: 10, target_time: 0,  circuit_number: 2, rest_after_circuit_seconds: 60 },
        { exercise_name: "Glute Bridge", sets: 3, target_reps: 12, target_time: 0,  circuit_number: 3, rest_after_circuit_seconds: 60 },
        { exercise_name: "Calf Raise",   sets: 3, target_reps: 15, target_time: 0,  circuit_number: 4, rest_after_circuit_seconds: 45 },
        { exercise_name: "Wall Sit",     sets: 2, target_reps: 0,  target_time: 20, circuit_number: 5, rest_after_circuit_seconds: 60 },
      ],
    },
    {
      day_number: 4, day_name: "Day 4", workout_name: "Core & Mobility", is_rest_day: false, total_reps: 88,
      exercises: [
        { exercise_name: "Crunch",         sets: 3, target_reps: 12, target_time: 0,  circuit_number: 1, rest_after_circuit_seconds: 45 },
        { exercise_name: "Dead Bug",       sets: 2, target_reps: 10, target_time: 0,  circuit_number: 2, rest_after_circuit_seconds: 45 },
        { exercise_name: "Bicycle Crunch", sets: 2, target_reps: 16, target_time: 0,  circuit_number: 3, rest_after_circuit_seconds: 45 },
        { exercise_name: "Cat-Cow",        sets: 2, target_reps: 0,  target_time: 30, circuit_number: 4, rest_after_circuit_seconds: 30 },
        { exercise_name: "Plank",          sets: 2, target_reps: 0,  target_time: 20, circuit_number: 5, rest_after_circuit_seconds: 60 },
      ],
    },
    {
      day_number: 5, day_name: "Day 5", workout_name: "Rest & Recovery", is_rest_day: true, total_reps: 0,
      exercises: [],
    },
    {
      day_number: 6, day_name: "Day 6", workout_name: "Upper Body Basics", is_rest_day: false, total_reps: 72,
      exercises: [
        { exercise_name: "Incline Push-Up", sets: 3, target_reps: 8, target_time: 0,  circuit_number: 1, rest_after_circuit_seconds: 60 },
        { exercise_name: "Australian Row",  sets: 3, target_reps: 8, target_time: 0,  circuit_number: 2, rest_after_circuit_seconds: 60 },
        { exercise_name: "Tricep Dip",      sets: 3, target_reps: 8, target_time: 0,  circuit_number: 3, rest_after_circuit_seconds: 60 },
        { exercise_name: "Arm Circle",      sets: 2, target_reps: 0, target_time: 30, circuit_number: 4, rest_after_circuit_seconds: 30 },
        { exercise_name: "Plank",           sets: 2, target_reps: 0, target_time: 20, circuit_number: 5, rest_after_circuit_seconds: 60 },
      ],
    },
    {
      day_number: 7, day_name: "Day 7", workout_name: "Full-Body Cardio Finisher", is_rest_day: false, total_reps: 24,
      exercises: [
        { exercise_name: "High Knee",       sets: 3, target_reps: 0, target_time: 20, circuit_number: 1, rest_after_circuit_seconds: 45 },
        { exercise_name: "Jumping Jack",    sets: 3, target_reps: 0, target_time: 30, circuit_number: 2, rest_after_circuit_seconds: 45 },
        { exercise_name: "Mountain Climber",sets: 3, target_reps: 0, target_time: 20, circuit_number: 3, rest_after_circuit_seconds: 45 },
        { exercise_name: "Inchworm",        sets: 2, target_reps: 6, target_time: 0,  circuit_number: 4, rest_after_circuit_seconds: 60 },
        { exercise_name: "Burpee",          sets: 2, target_reps: 6, target_time: 0,  circuit_number: 5, rest_after_circuit_seconds: 60 },
      ],
    },
  ],
};

// ── Nutrition program seed: "Foundations Nutrition Plan" (7 days) ──────────────
const FOUNDATIONS_NUTRITION_PROGRAM = {
  name: "Foundations Nutrition Plan",
  description: "A balanced 7-day eating template to support your first week of training — simple meals, steady energy, and enough protein to recover well.",
  program_type: "maintenance",
  duration_days: 7,
  daily_calories_target: 2000,
  daily_protein_grams: 120,
  tips: [
    "Drink at least 8 cups of water daily, more on training days.",
    "Prep proteins (chicken, eggs, Greek yogurt) in batches to save time.",
    "Swap any meal for a similar-calorie option you enjoy more — consistency beats perfection.",
    "Eat a meal or snack with protein within 1-2 hours after training.",
  ],
  daily_meal_plans: [
    {
      day_number: 1, total_calories: 1850, nutrition_notes: "Light first day to ease into the plan — focus on hydration and steady protein intake.",
      meals: [
        { meal_name: "Oatmeal with Berries & Almond Butter", meal_type: "breakfast", calories: 380, protein: 14, carbs: 52, fat: 12 },
        { meal_name: "Grilled Chicken Salad with Quinoa",    meal_type: "lunch",     calories: 480, protein: 42, carbs: 35, fat: 18 },
        { meal_name: "Greek Yogurt with Walnuts",            meal_type: "snack",     calories: 220, protein: 16, carbs: 10, fat: 12 },
        { meal_name: "Protein Shake with Banana",            meal_type: "snack",     calories: 250, protein: 25, carbs: 30, fat: 3  },
        { meal_name: "Baked Salmon, Brown Rice & Broccoli",  meal_type: "dinner",    calories: 520, protein: 38, carbs: 45, fat: 20 },
      ],
    },
    {
      day_number: 2, total_calories: 1820, nutrition_notes: "Balanced macros across the day — pair the afternoon snack with your workout if training today.",
      meals: [
        { meal_name: "Veggie Scramble with Whole Grain Toast", meal_type: "breakfast", calories: 400, protein: 24, carbs: 35, fat: 16 },
        { meal_name: "Turkey Wrap with Side Salad",            meal_type: "lunch",     calories: 470, protein: 35, carbs: 45, fat: 14 },
        { meal_name: "Apple with Peanut Butter",               meal_type: "snack",     calories: 230, protein: 7,  carbs: 24, fat: 13 },
        { meal_name: "Cottage Cheese with Pineapple",          meal_type: "snack",     calories: 180, protein: 18, carbs: 16, fat: 4  },
        { meal_name: "Lean Beef Stir-Fry with Rice",           meal_type: "dinner",    calories: 540, protein: 40, carbs: 50, fat: 16 },
      ],
    },
    {
      day_number: 3, total_calories: 1770, nutrition_notes: "Slightly lighter day — great timing for a rest day or lower-intensity training.",
      meals: [
        { meal_name: "Greek Yogurt Parfait with Granola",        meal_type: "breakfast", calories: 350, protein: 20, carbs: 45, fat: 8  },
        { meal_name: "Tuna Salad on Whole Grain Bread",          meal_type: "lunch",     calories: 430, protein: 35, carbs: 40, fat: 14 },
        { meal_name: "Mixed Nuts",                               meal_type: "snack",     calories: 200, protein: 6,  carbs: 8,  fat: 17 },
        { meal_name: "Protein Smoothie",                         meal_type: "snack",     calories: 260, protein: 24, carbs: 28, fat: 5  },
        { meal_name: "Grilled Chicken, Sweet Potato & Asparagus",meal_type: "dinner",    calories: 530, protein: 45, carbs: 45, fat: 15 },
      ],
    },
    {
      day_number: 4, total_calories: 1720, nutrition_notes: "Lower-protein day balanced by extra carbs for energy — add an extra snack if you're hungry.",
      meals: [
        { meal_name: "Whole Grain Pancakes with Fruit",        meal_type: "breakfast", calories: 400, protein: 15, carbs: 60, fat: 10 },
        { meal_name: "Chickpea & Veggie Bowl",                 meal_type: "lunch",     calories: 460, protein: 20, carbs: 55, fat: 16 },
        { meal_name: "Hard-Boiled Eggs (2)",                   meal_type: "snack",     calories: 150, protein: 12, carbs: 1,  fat: 10 },
        { meal_name: "Greek Yogurt with Berries",              meal_type: "snack",     calories: 200, protein: 16, carbs: 20, fat: 4  },
        { meal_name: "Baked Cod with Quinoa & Green Beans",    meal_type: "dinner",    calories: 510, protein: 40, carbs: 45, fat: 15 },
      ],
    },
    {
      day_number: 5, total_calories: 1900, nutrition_notes: "Higher-calorie day — good for your hardest training session of the week.",
      meals: [
        { meal_name: "Avocado Toast with Eggs",               meal_type: "breakfast", calories: 420, protein: 18, carbs: 35, fat: 22 },
        { meal_name: "Grilled Chicken Caesar Salad",          meal_type: "lunch",     calories: 470, protein: 40, carbs: 20, fat: 24 },
        { meal_name: "Protein Bar",                           meal_type: "snack",     calories: 220, protein: 20, carbs: 22, fat: 7  },
        { meal_name: "Banana with Almond Butter",             meal_type: "snack",     calories: 230, protein: 6,  carbs: 26, fat: 12 },
        { meal_name: "Turkey Meatballs with Whole Wheat Pasta",meal_type: "dinner",   calories: 560, protein: 38, carbs: 55, fat: 18 },
      ],
    },
    {
      day_number: 6, total_calories: 1800, nutrition_notes: "Balanced day with a heartier dinner — great for a weekend training session.",
      meals: [
        { meal_name: "Smoothie Bowl with Protein Powder",      meal_type: "breakfast", calories: 380, protein: 26, carbs: 45, fat: 8  },
        { meal_name: "Lentil Soup with Whole Grain Roll",      meal_type: "lunch",     calories: 440, protein: 22, carbs: 55, fat: 12 },
        { meal_name: "Trail Mix",                              meal_type: "snack",     calories: 210, protein: 7,  carbs: 20, fat: 12 },
        { meal_name: "Cottage Cheese with Peaches",            meal_type: "snack",     calories: 190, protein: 18, carbs: 18, fat: 4  },
        { meal_name: "Grilled Steak, Roasted Potatoes & Salad",meal_type: "dinner",    calories: 580, protein: 42, carbs: 45, fat: 22 },
      ],
    },
    {
      day_number: 7, total_calories: 1810, nutrition_notes: "Wrap up the week — review how you felt and adjust portions next week if needed.",
      meals: [
        { meal_name: "Veggie Omelette with Toast",                meal_type: "breakfast", calories: 390, protein: 26, carbs: 30, fat: 16 },
        { meal_name: "Grilled Shrimp Tacos with Slaw",            meal_type: "lunch",     calories: 460, protein: 32, carbs: 45, fat: 14 },
        { meal_name: "Greek Yogurt with Honey & Almonds",         meal_type: "snack",     calories: 230, protein: 16, carbs: 20, fat: 10 },
        { meal_name: "Apple with Cheese",                         meal_type: "snack",     calories: 200, protein: 10, carbs: 22, fat: 9  },
        { meal_name: "Roast Chicken, Quinoa & Brussels Sprouts",  meal_type: "dinner",    calories: 530, protein: 45, carbs: 40, fat: 16 },
      ],
    },
  ],
};

const SEED_ITEMS = [
  { kind: "workout",   label: "Start Here (7-Day Workout Program)", data: START_HERE_PROGRAM },
  { kind: "nutrition", label: "Foundations Nutrition Plan (7-Day)",  data: FOUNDATIONS_NUTRITION_PROGRAM },
];

export default function ProgramSeed() {
  const navigate     = useNavigate();
  const abortRef     = useRef(false);

  const [existingNames, setExistingNames] = useState([]);
  const [checking,  setChecking]  = useState(true);
  const [checkError,setCheckError]= useState(null);
  const [seeding,   setSeeding]   = useState(false);
  const [log,       setLog]       = useState([]);
  const [done,      setDone]      = useState(false);

  useEffect(() => { checkDatabase(); }, []);

  // ── Check which programs already exist (by name) ─────────────────────────
  const checkDatabase = async () => {
    setChecking(true);
    setCheckError(null);
    setLog([]);
    setDone(false);
    try {
      const [workoutPrograms, nutritionPrograms] = await Promise.all([
        withTimeout(base44.entities.PresetProgram.list(), 15000),
        withTimeout(base44.entities.NutritionProgram.list(), 15000),
      ]);
      const names = [
        ...(workoutPrograms || []).map(p => (p.name || "").toLowerCase().trim()),
        ...(nutritionPrograms || []).map(p => (p.name || "").toLowerCase().trim()),
      ];
      setExistingNames(names);
    } catch (err) {
      setCheckError(err.message || "Could not reach database.");
    }
    setChecking(false);
  };

  const missing = SEED_ITEMS.filter(
    item => !existingNames.includes(item.data.name.toLowerCase().trim())
  );

  // ── Create a single program with a hard timeout ──────────────────────────
  const createOne = async (item) => {
    try {
      if (item.kind === "workout") {
        await withTimeout(base44.entities.PresetProgram.create(item.data), 15000);
      } else {
        await withTimeout(base44.entities.NutritionProgram.create(item.data), 15000);
      }
      setExistingNames(prev => [...prev, item.data.name.toLowerCase().trim()]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Unknown error" };
    }
  };

  // ── Seed all missing programs ─────────────────────────────────────────────
  const seedAll = async () => {
    if (missing.length === 0) return;
    abortRef.current = false;
    setSeeding(true);
    setLog([]);
    setDone(false);

    const newLog = [];
    for (const item of missing) {
      if (abortRef.current) {
        newLog.push("⛔ Stopped by user.");
        setLog([...newLog]);
        break;
      }
      const result = await createOne(item);
      newLog.push(result.ok ? `✅ ${item.label}` : `❌ ${item.label} — ${result.error}`);
      setLog([...newLog]);
      await new Promise(r => setTimeout(r, 350));
    }

    setSeeding(false);
    setDone(true);
  };

  const stopSeed = () => { abortRef.current = true; };

  const successCount = log.filter(l => l.startsWith("✅")).length;
  const failCount    = log.filter(l => l.startsWith("❌")).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">

      {/* Header */}
      <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(createPageUrl("PresetPrograms"))} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Calendar className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-base font-bold">Program Database Seed</h1>
          <p className="text-xs text-gray-500">Admin tool — creates starter workout &amp; nutrition programs</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        <div className="bg-[#111] border border-gray-700 rounded-xl p-5 space-y-4">

          {checking && (
            <div className="flex items-center gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-sm">Checking database…</span>
            </div>
          )}

          {checkError && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Could not reach database</p>
                <p className="text-red-400/70 text-xs mt-0.5">{checkError}</p>
                <button onClick={checkDatabase} className="text-blue-400 text-xs underline mt-2">Try again</button>
              </div>
            </div>
          )}

          {!checking && !checkError && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {SEED_ITEMS.length - missing.length} / {SEED_ITEMS.length} programs in database
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {missing.length === 0
                      ? "All starter programs are present — nothing to seed."
                      : `${missing.length} program${missing.length !== 1 ? "s" : ""} missing.`}
                  </p>
                </div>
                <button onClick={checkDatabase} className="text-gray-600 hover:text-white ml-3">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {missing.length > 0 && !seeding && !done && (
                <Button onClick={seedAll} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base">
                  Seed {missing.length} Missing Program{missing.length !== 1 ? "s" : ""}
                </Button>
              )}

              {seeding && (
                <div className="space-y-3">
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      <p className="text-blue-300 text-sm font-semibold">Seeding programs…</p>
                    </div>
                    <p className="text-blue-400/60 text-xs">{log.length} of {missing.length} processed</p>
                  </div>
                  <button
                    onClick={stopSeed}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-950/30"
                  >
                    <StopCircle className="w-4 h-4" /> Stop
                  </button>
                </div>
              )}

              {done && (
                <div className="bg-green-950/40 border border-green-500/30 rounded-lg p-4 space-y-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
                  <p className="text-green-400 font-semibold">
                    Done — {successCount} added{failCount > 0 ? `, ${failCount} failed` : ""}
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("PresetPrograms"))}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Go to Programs →
                  </Button>
                  <button onClick={checkDatabase} className="text-gray-500 text-xs underline">Re-check database</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live log */}
        {log.length > 0 && (
          <div className="bg-[#0d0d0d] border border-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto space-y-0.5">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Log</p>
            {log.map((line, i) => (
              <p key={i} className={`text-xs font-mono leading-5 ${
                line.startsWith("✅") ? "text-green-400" :
                line.startsWith("⛔") ? "text-yellow-400" : "text-red-400"
              }`}>{line}</p>
            ))}
          </div>
        )}

        {/* Program list */}
        {!checking && !checkError && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">Starter Programs</p>
            {SEED_ITEMS.map((item) => {
              const inDb = existingNames.includes(item.data.name.toLowerCase().trim());
              return (
                <div
                  key={item.data.name}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    inDb ? "bg-[#111] border-green-900/40" : "bg-red-950/10 border-red-900/40"
                  }`}
                >
                  {inDb
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle    className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.label}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{item.kind} program · {item.data.duration_days} days</p>
                  </div>
                  {!inDb && !seeding && (
                    <button
                      onClick={async () => {
                        setLog(prev => [...prev, `⏳ Adding ${item.label}…`]);
                        const r = await createOne(item);
                        setLog(prev => [
                          ...prev.filter(l => !l.includes(`Adding ${item.label}`)),
                          r.ok ? `✅ ${item.label}` : `❌ ${item.label} — ${r.error}`
                        ]);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0 ml-1 font-semibold"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Safety notice */}
        <div className="flex gap-3 bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            Safe to run multiple times — skips programs that already exist by name. Will never overwrite or delete existing records.
          </p>
        </div>

      </div>
    </div>
  );
}
