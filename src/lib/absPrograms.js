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
];

export const AB_PROGRAMS = [
  {
    id: "abs-starter",
    name: "Ab Starter",
    description: "Floor only. Build the base: lifts, tucks and crunches.",
    difficulty: "beginner",
    color: "from-green-600 to-emerald-700",
    sets: 3,
    mode: "goal",
    repGoal: 10,
    exercises: ["Leg Raise", "Lying Knees to Chest", "Crunch", "Flutter Kick"],
  },
  {
    id: "abs-hanging",
    name: "Bar Abs",
    description: "Hanging from a bar. Knees to chest, leg raises, then a floor finisher.",
    difficulty: "intermediate",
    color: "from-blue-600 to-indigo-700",
    sets: 3,
    mode: "goal",
    repGoal: 12,
    exercises: ["Hanging Knees to Chest", "Hanging Leg Raise", "Leg Raise", "Bicycle Crunch"],
  },
  {
    id: "abs-core-burner",
    name: "Core Burner",
    description: "Timed circuit, 45 seconds a move. Log your reps on the tap moves.",
    difficulty: "intermediate",
    color: "from-orange-600 to-red-700",
    sets: 3,
    mode: "time",
    timePerEx: 45,
    exercises: ["Leg Raise", "Mountain Climber", "Russian Twist", "Lying Knees to Chest", "Sit-Up"],
  },
  {
    id: "abs-advanced-bar",
    name: "Advanced Bar Abs",
    description: "Toes to bar and straight-leg raises. Strict, no kipping.",
    difficulty: "advanced",
    color: "from-red-600 to-rose-800",
    sets: 3,
    mode: "goal",
    repGoal: 10,
    exercises: ["Toes to Bar", "Hanging Leg Raise", "Hanging Knees to Chest", "V-Up"],
  },
];

export function findAbProgram(id) {
  return AB_PROGRAMS.find(p => p.id === id) || null;
}
