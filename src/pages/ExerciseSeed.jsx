/**
 * ExerciseSeed.jsx — Admin tool to restore all 51 exercises to the database.
 * Uses base44.entities.Exercise directly (same as Upload3DModels.jsx) with a
 * hard per-call timeout so a hung request never stalls the whole restore.
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronLeft,
  Dumbbell, StopCircle
} from "lucide-react";

// ── Timeout helper ────────────────────────────────────────────────────────────
// Wraps any promise with a hard timeout so a hung API call doesn't freeze the UI.
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ── Full exercise seed data ───────────────────────────────────────────────────
// Only sends the 4 fields every Exercise entity definitely has:
//   name · category · difficulty · description
// (muscle_groups / instructions are added to description as plain text)
const SEED_EXERCISES = [
  // PUSH
  { name: "Push-Up",           category: "upper_body", difficulty: "beginner",     description: "Classic bodyweight push. Muscles: Chest, Triceps, Shoulders. Cues: Keep body straight, lower chest to floor, full lockout at top." },
  { name: "Diamond Push-Up",   category: "upper_body", difficulty: "intermediate", description: "Hands form a diamond beneath the chest. Muscles: Triceps, Inner Chest. Cues: Elbows tight to body, full tricep extension." },
  { name: "Wide Push-Up",      category: "upper_body", difficulty: "beginner",     description: "Hands wider than shoulders. Muscles: Outer Chest, Shoulders. Cues: Fingers slightly outward, squeeze chest at top." },
  { name: "Pike Push-Up",      category: "upper_body", difficulty: "intermediate", description: "Hips raised in inverted-V, shoulder press pattern. Muscles: Shoulders, Triceps. Cues: Head toward floor, press through shoulders." },
  { name: "Decline Push-Up",   category: "upper_body", difficulty: "intermediate", description: "Feet elevated to target upper chest. Muscles: Upper Chest, Shoulders. Cues: Straight body line, lower chest toward floor." },
  { name: "Incline Push-Up",   category: "upper_body", difficulty: "beginner",     description: "Hands elevated — reduced load for beginners. Muscles: Lower Chest, Triceps. Cues: Keep body straight throughout." },
  { name: "Dip",               category: "upper_body", difficulty: "intermediate", description: "Parallel bar push. Muscles: Chest, Triceps, Shoulders. Cues: Elbows to 90 degrees, full lockout at top." },
  { name: "Tricep Dip",        category: "upper_body", difficulty: "beginner",     description: "Chair or bench dip. Muscles: Triceps, Shoulders. Cues: Hips close to bench, lower until 90 degree elbow angle." },
  { name: "Handstand Push-Up", category: "upper_body", difficulty: "advanced",     description: "Inverted push against wall. Muscles: Shoulders, Triceps, Core. Cues: Wall for support, head toward floor, full shoulder press range." },
  // PULL
  { name: "Pull-Up",           category: "upper_body", difficulty: "intermediate", description: "Overhand grip pull. Muscles: Lats, Biceps, Rear Deltoids. Cues: Full hang at bottom, chin over bar at top." },
  { name: "Chin-Up",           category: "upper_body", difficulty: "intermediate", description: "Underhand grip pull. Muscles: Biceps, Lats. Cues: Supinated grip, chin above bar, full hang at bottom." },
  { name: "Australian Row",    category: "upper_body", difficulty: "beginner",     description: "Horizontal bodyweight row. Muscles: Upper Back, Biceps. Cues: Keep body rigid, pull chest to bar, squeeze shoulder blades." },
  { name: "Muscle-Up",         category: "upper_body", difficulty: "advanced",     description: "Explosive pull transitioning into a dip. Muscles: Lats, Chest, Triceps. Cues: Explosive pull, transition above bar, press out at top." },
  // LEGS
  { name: "Squat",                 category: "lower_body", difficulty: "beginner",     description: "Fundamental lower-body squat. Muscles: Quadriceps, Glutes, Hamstrings. Cues: Break parallel, drive through heels, knees track over toes." },
  { name: "Jump Squat",            category: "lower_body", difficulty: "intermediate", description: "Explosive squat for power. Muscles: Quads, Glutes, Calves. Cues: Explode upward, land softly with bent knees." },
  { name: "Sumo Squat",            category: "lower_body", difficulty: "beginner",     description: "Wide-stance squat. Muscles: Inner Thighs, Glutes, Quads. Cues: Feet wide, toes at 45 degrees, thighs to parallel." },
  { name: "Lunge",                 category: "lower_body", difficulty: "beginner",     description: "Forward step lunge. Muscles: Quads, Glutes, Hamstrings. Cues: Front knee behind toes, back knee near floor, upright torso." },
  { name: "Reverse Lunge",         category: "lower_body", difficulty: "beginner",     description: "Step backward into lunge. Muscles: Quads, Glutes, Hamstrings. Cues: Step backward, control the descent, push through front heel." },
  { name: "Bulgarian Split Squat", category: "lower_body", difficulty: "advanced",     description: "Rear-foot elevated split squat. Muscles: Quads, Glutes, Hip Flexors. Cues: Rear foot on bench, torso upright, deep range of motion." },
  { name: "Step Up",               category: "lower_body", difficulty: "beginner",     description: "Step onto elevated surface. Muscles: Quads, Glutes, Hamstrings. Cues: Drive through heel, full hip extension at top." },
  { name: "Glute Bridge",          category: "lower_body", difficulty: "beginner",     description: "Floor hip extension. Muscles: Glutes, Hamstrings. Cues: Squeeze glutes at top, feet flat, full hip extension." },
  { name: "Donkey Kick",           category: "lower_body", difficulty: "beginner",     description: "Quadruped glute kick. Muscles: Glutes, Hip Extensors. Cues: Keep knee at 90 degrees, kick heel toward ceiling." },
  { name: "Calf Raise",            category: "lower_body", difficulty: "beginner",     description: "Rise onto toes. Muscles: Calves, Soleus. Cues: Full range at top, controlled descent, hold at peak contraction." },
  { name: "Wall Sit",              category: "lower_body", difficulty: "intermediate", description: "Isometric quad hold. Muscles: Quadriceps, Glutes. Cues: Knees at 90 degrees, back flat on wall, thighs parallel to floor." },
  { name: "Pistol Squat",          category: "lower_body", difficulty: "advanced",     description: "Single-leg squat to full depth. Muscles: Quads, Glutes, Core. Cues: One leg extended forward, full depth, control the descent." },
  // CORE
  { name: "Sit-Up",           category: "core", difficulty: "beginner",     description: "Full range sit-up. Muscles: Abs, Hip Flexors. Cues: Feet flat, hands behind head, full range touching knees." },
  { name: "Crunch",           category: "core", difficulty: "beginner",     description: "Short-range ab crunch. Muscles: Abs. Cues: Short range of motion, contract abs hard, chin slightly off chest." },
  { name: "Leg Raise",        category: "core", difficulty: "intermediate", description: "Leg raise for lower abs. Muscles: Lower Abs, Hip Flexors. Cues: Press lower back down, keep legs straight, controlled descent." },
  { name: "Plank",            category: "core", difficulty: "beginner",     description: "Isometric full-body hold. Muscles: Core, Shoulders, Glutes. Cues: Straight line head to heels, squeeze core and glutes." },
  { name: "Side Plank",       category: "core", difficulty: "intermediate", description: "Lateral isometric hold. Muscles: Obliques, Core. Cues: Stack feet, hips elevated, straight line head to feet." },
  { name: "Bicycle Crunch",   category: "core", difficulty: "intermediate", description: "Alternating elbow to knee. Muscles: Obliques, Abs. Cues: Opposite elbow to knee, fully extend other leg, control the rotation." },
  { name: "Mountain Climber", category: "core", difficulty: "intermediate", description: "Alternating knee drives in plank. Muscles: Core, Shoulders, Hip Flexors. Cues: Keep hips level, drive each knee toward chest." },
  { name: "Flutter Kick",     category: "core", difficulty: "intermediate", description: "Rapid alternating leg kicks. Muscles: Lower Abs, Hip Flexors. Cues: Small rapid alternating kicks, lower back pressed down." },
  { name: "Dead Bug",         category: "core", difficulty: "intermediate", description: "Anti-extension core move. Muscles: Deep Core, Hip Flexors. Cues: Lower back flat on floor, opposite arm and leg extend." },
  { name: "Hollow Body Hold", category: "core", difficulty: "advanced",     description: "Gymnastics tension hold. Muscles: Core, Hip Flexors, Lats. Cues: Lower back pressed to floor, arms overhead, feet 6 inches up." },
  { name: "V-Up",             category: "core", difficulty: "advanced",     description: "Explosive simultaneous arm and leg raise. Muscles: Abs, Hip Flexors. Cues: Lift arms and legs simultaneously, touch feet at top." },
  { name: "Russian Twist",    category: "core", difficulty: "intermediate", description: "Seated rotation. Muscles: Obliques. Cues: Lean back 45 degrees, rotate side to side, feet off floor for difficulty." },
  { name: "Shoulder Tap",     category: "core", difficulty: "intermediate", description: "Alternating shoulder taps in plank. Muscles: Core, Shoulders. Cues: Minimal hip rotation, hold plank position." },
  { name: "L-Sit / Pike Hold",category: "core", difficulty: "advanced",     description: "Gymnastics hold legs parallel. Muscles: Hip Flexors, Core, Triceps. Cues: Legs parallel to ground, arms fully straight." },
  // FULL BODY
  { name: "Burpee",       category: "full_body", difficulty: "intermediate", description: "Full-body conditioning exercise. Muscles: Full Body, Cardio. Cues: Squat, plank, push-up, jump. Land softly." },
  { name: "Jumping Jack", category: "full_body", difficulty: "beginner",     description: "Classic cardio movement. Muscles: Cardio, Shoulders, Legs. Cues: Arms overhead, feet wide on open, back together on close." },
  { name: "High Knee",    category: "full_body", difficulty: "beginner",     description: "Running in place, knees to hip height. Muscles: Cardio, Hip Flexors, Core. Cues: Drive knees to hip height, pump arms." },
  { name: "Butt Kicker",  category: "full_body", difficulty: "beginner",     description: "Jog in place kicking heels to glutes. Muscles: Cardio, Hamstrings. Cues: Kick heels to glutes, keep knees down." },
  { name: "Inchworm",     category: "full_body", difficulty: "intermediate", description: "Walk hands to plank and back. Muscles: Hamstrings, Core, Shoulders. Cues: Walk hands out to plank, keep legs straight, walk back." },
  { name: "Bear Crawl",   category: "full_body", difficulty: "intermediate", description: "Quadruped crawl with knees hovering. Muscles: Core, Shoulders, Quads. Cues: Knees 1 inch off floor, opposite hand and foot move together." },
  { name: "Box Jump",     category: "full_body", difficulty: "intermediate", description: "Explosive jump onto elevated surface. Muscles: Quads, Glutes, Calves. Cues: Load hips, explode up, land softly with bent knees." },
  // MOBILITY
  { name: "Arm Circle",   category: "mobility", difficulty: "beginner", description: "Full shoulder rotation warm-up. Muscles: Shoulders, Rotator Cuff. Cues: Make large circles, raise arm fully overhead each revolution." },
  { name: "Hip Circle",   category: "mobility", difficulty: "beginner", description: "Standing hip rotation. Muscles: Hip Flexors, Glutes. Cues: Full circular motion, keep feet planted, rotate both directions." },
  { name: "Cat-Cow",      category: "mobility", difficulty: "beginner", description: "Spinal flexion and extension on all fours. Muscles: Spine, Core. Cues: Exhale arch (cat), inhale sag (cow), slow and controlled." },
  { name: "Quad Stretch", category: "mobility", difficulty: "beginner", description: "Standing quad and hip flexor stretch. Muscles: Quadriceps, Hip Flexors. Cues: Pull foot to glute, keep knees together, stand tall." },
  { name: "Toe Touch",    category: "mobility", difficulty: "beginner", description: "Standing hamstring stretch. Muscles: Hamstrings, Lower Back. Cues: Straight legs, reach for toes, slow stretch." },
];

const DIFF_COLOUR = {
  beginner:     "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced:     "bg-red-500/20 text-red-400 border-red-500/30",
};
const CAT_LABEL = {
  upper_body: "Upper Body", lower_body: "Lower Body",
  core: "Core", full_body: "Full Body", mobility: "Mobility",
};

export default function ExerciseSeed() {
  const navigate       = useNavigate();
  const abortRef       = useRef(false);   // lets the user cancel mid-run

  const [dbNames,      setDbNames]      = useState([]);   // lowercased names in DB
  const [checking,     setChecking]     = useState(true);
  const [checkError,   setCheckError]   = useState(null);
  const [seeding,      setSeeding]      = useState(false);
  const [currentName,  setCurrentName]  = useState("");
  const [log,          setLog]          = useState([]);
  const [done,         setDone]         = useState(false);

  useEffect(() => { checkDatabase(); }, []);

  // ── Check which exercises already exist ──────────────────────────────────
  const checkDatabase = async () => {
    setChecking(true);
    setCheckError(null);
    setLog([]);
    setDone(false);
    try {
      const data = await withTimeout(base44.entities.Exercise.list(), 15000);
      const names = (data || [])
        .filter(e => !e.is_deleted)
        .map(e => (e.name || "").toLowerCase().trim());
      setDbNames(names);
    } catch (err) {
      setCheckError(err.message || "Could not reach database.");
    }
    setChecking(false);
  };

  const missing = SEED_EXERCISES.filter(
    ex => !dbNames.includes(ex.name.toLowerCase().trim())
  );

  // ── Create a single exercise with a hard timeout ─────────────────────────
  const createOne = async (ex) => {
    try {
      await withTimeout(
        base44.entities.Exercise.create({
          name:        ex.name,
          category:    ex.category,
          difficulty:  ex.difficulty,
          description: ex.description,
        }),
        10000   // 10-second hard timeout per exercise
      );
      setDbNames(prev => [...prev, ex.name.toLowerCase().trim()]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Unknown error" };
    }
  };

  // ── Seed all missing exercises ───────────────────────────────────────────
  const seedAll = async () => {
    if (missing.length === 0) return;
    abortRef.current = false;
    setSeeding(true);
    setLog([]);
    setDone(false);

    const newLog = [];

    for (const ex of missing) {
      if (abortRef.current) {
        newLog.push("⛔ Stopped by user.");
        setLog([...newLog]);
        break;
      }

      setCurrentName(ex.name);
      const result = await createOne(ex);

      newLog.push(
        result.ok
          ? `✅ ${ex.name}`
          : `❌ ${ex.name} — ${result.error}`
      );
      setLog([...newLog]);

      // Pause between calls — avoids hammering the API
      await new Promise(r => setTimeout(r, 350));
    }

    setCurrentName("");
    setSeeding(false);
    setDone(true);

    // Clear Exercises page cache so it reloads fresh
    try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
  };

  const stopSeed = () => { abortRef.current = true; };

  // ── Render ────────────────────────────────────────────────────────────────
  const successCount = log.filter(l => l.startsWith("✅")).length;
  const failCount    = log.filter(l => l.startsWith("❌")).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">

      {/* Header */}
      <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(createPageUrl("Exercises"))} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Dumbbell className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-base font-bold">Exercise Database Restore</h1>
          <p className="text-xs text-gray-500">Admin tool — restores missing exercise records</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Status / action card */}
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
              {/* Score */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {SEED_EXERCISES.length - missing.length} / {SEED_EXERCISES.length} exercises in database
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {missing.length === 0
                      ? "All exercises are present — nothing to restore."
                      : `${missing.length} exercise${missing.length !== 1 ? "s" : ""} missing.`}
                  </p>
                </div>
                <button onClick={checkDatabase} className="text-gray-600 hover:text-white ml-3">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((SEED_EXERCISES.length - missing.length) / SEED_EXERCISES.length) * 100}%` }}
                />
              </div>

              {/* Restore button */}
              {missing.length > 0 && !seeding && !done && (
                <Button onClick={seedAll} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base">
                  Restore All {missing.length} Missing Exercises
                </Button>
              )}

              {/* Active seeding progress */}
              {seeding && (
                <div className="space-y-3">
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      <p className="text-blue-300 text-sm font-semibold truncate">Adding: {currentName}</p>
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

              {/* Done */}
              {done && (
                <div className="bg-green-950/40 border border-green-500/30 rounded-lg p-4 space-y-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
                  <p className="text-green-400 font-semibold">
                    Done — {successCount} added{failCount > 0 ? `, ${failCount} failed` : ""}
                  </p>
                  {failCount > 0 && (
                    <p className="text-yellow-400/80 text-xs">
                      {failCount} exercise{failCount !== 1 ? "s" : ""} failed. Scroll down to see which ones, then tap "Add" next to each one to retry individually.
                    </p>
                  )}
                  <Button
                    onClick={() => navigate(createPageUrl("Exercises"))}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Go to Exercises →
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

        {/* Full exercise list */}
        {!checking && !checkError && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">
              All 51 Exercises
            </p>
            {SEED_EXERCISES.map((ex) => {
              const inDb = dbNames.includes(ex.name.toLowerCase().trim());
              return (
                <div
                  key={ex.name}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    inDb
                      ? "bg-[#111] border-green-900/40"
                      : "bg-red-950/10 border-red-900/40"
                  }`}
                >
                  {inDb
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle    className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                    <p className="text-[11px] text-gray-500">{CAT_LABEL[ex.category] ?? ex.category}</p>
                  </div>
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 font-semibold capitalize shrink-0 ${DIFF_COLOUR[ex.difficulty]}`}>
                    {ex.difficulty}
                  </span>
                  {!inDb && !seeding && (
                    <button
                      onClick={async () => {
                        setLog(prev => [...prev, `⏳ Adding ${ex.name}…`]);
                        const r = await createOne(ex);
                        setLog(prev => [
                          ...prev.filter(l => !l.includes(`Adding ${ex.name}`)),
                          r.ok ? `✅ ${ex.name}` : `❌ ${ex.name} — ${r.error}`
                        ]);
                        try { sessionStorage.removeItem("rns_exercises_cache"); } catch (_) {}
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
            Safe to run multiple times — skips exercises that already exist. Will never overwrite or delete existing records.
          </p>
        </div>

      </div>
    </div>
  );
}
