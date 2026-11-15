/**
 * absPrograms.js — Ab programs (2026-11-15)
 *
 * JT: "We should have a whole ab section... have programs for the stretches,
 * and we have programs for the abs." Used by:
 *   - pages/Abs.jsx           (library + program cards)
 *   - pages/ARTPWorkout.jsx   (/ARTPWorkout?abs=<id> loads a program;
 *                              /ARTPWorkout?ex=<name> loads one move)
 *
 * Every exercise name here MUST match an ARTPWorkout ALL_EXERCISES name, or the
 * loader drops it. All programs run 3 sets (JT: "Set 3").
 *
 * mode: "goal" = hit the rep target, then auto-advance to rest
 *       "time" = fixed seconds per move; manual moves stop for rep entry
 */
import { ABS, LEVELS } from "@/lib/quickWorkouts";

export const AB_MOVES = [
  // Camera-tracked
  { name: "Hanging Knees to Chest", tracking: "ai",     equipment: "Pull-up bar", level: "beginner",     emoji: "🧗", cue: "Dead hang, pull knees to chest, lower with control. No swinging." },
  { name: "Leg Raise",              tracking: "ai",     equipment: "Floor",       level: "beginner",     emoji: "📐", cue: "Leg lifts. Lower back pressed down, straight legs up, slow on the way down.", alias: "Leg Lifts" },
  { name: "Hanging Leg Raise",      tracking: "ai",     equipment: "Pull-up bar", level: "intermediate", emoji: "🧗", cue: "Dead hang, straight legs up to hip height, no kipping." },
  { name: "Toes to Bar",            tracking: "beta",   equipment: "Pull-up bar", level: "advanced",     emoji: "🦶", cue: "Lats tight, pike your toes all the way to the bar." },
  { name: "Lying Knees to Chest",   tracking: "beta",   equipment: "Floor",       level: "beginner",     emoji: "🌀", cue: "On your back. Extend legs out, then tuck knees to chest." },
  // Tap / type your number
  { name: "Crunch",                 tracking: "manual", equipment: "Floor",       level: "beginner",     emoji: "🎯", cue: "Knees bent, shoulder blades off the floor, squeeze." },
  { name: "Sit-Up",                 tracking: "manual", equipment: "Floor",       level: "beginner",     emoji: "🧘", cue: "Knees bent, chest to knees, control the descent." },
  { name: "Bicycle Crunch",         tracking: "manual", equipment: "Floor",       level: "intermediate", emoji: "🚲", cue: "Elbow to opposite knee, extend the other leg." },
  { name: "Flutter Kick",           tracking: "manual", equipment: "Floor",       level: "beginner",     emoji: "🦵", cue: "Small fast kicks, lower back stays down." },
  { name: "Mountain Climber",       tracking: "manual", equipment: "Floor",       level: "intermediate", emoji: "⛰️", cue: "Plank, drive knees to chest, hips level." },
  { name: "Russian Twist",          tracking: "manual", equipment: "Floor",       level: "intermediate", emoji: "🔄", cue: "Lean back 45°, rotate side to side. Feet up is harder." },
  { name: "V-Up",                   tracking: "manual", equipment: "Floor",       level: "advanced",     emoji: "✌️", cue: "Arms and legs up together, touch your toes." },
  { name: "Dead Bug",               tracking: "manual", equipment: "Floor",       level: "beginner",     emoji: "🐞", cue: "Lower back flat, reach the opposite arm and leg out slowly, switch sides." },
  { name: "Plank to Push-Up",       tracking: "manual", equipment: "Floor",       level: "advanced",     emoji: "🧱", cue: "Forearm plank up to high plank one arm at a time, hips still." },
];

// 2026-11-15 (second pass): the four quick-pick programs from the first pass
// were replaced by three researched levels — Beginner / Intermediate /
// Advanced — defined ONCE in lib/quickWorkouts.js (ABS), which also seeds
// them as 4-week preset programs. This file only adapts a level session for
// AiRTP: AiRTP counts reps, so the session's timed holds are left out there
// and run in the guided session instead.

/** AiRTP id for a session: "<level>-<index>", e.g. "beginner-0". */
export const abSessionId = (level, i) => `${level}-${i}`;

export function findAbProgram(id) {
  const [level, idx] = String(id || "").split("-");
  if (!LEVELS.includes(level)) return null;
  const s = ABS[level]?.[Number(idx)];
  if (!s) return null;
  const reps = s.exercises.filter(e => e.target_reps > 0);
  return {
    id, name: s.name, sets: 3, mode: "goal",
    // One rep goal per AiRTP session: the lowest target in it, so the hardest
    // move (e.g. toes to bar at 6) isn't asked for the leg-raise number.
    repGoal: Math.min(...reps.map(e => e.target_reps)),
    exercises: reps.map(e => e.exercise_name),
  };
}
