/**
 * quickWorkouts.js — one-tap workouts + stretch routines by level, and the
 * preset programs built from them (2026-11-13).
 *
 * JT: "make it super easy … I'm a beginner, I'm intermediate, I'm advanced …
 * they just click a button to start the workout", plus "3 stretching programs:
 * beginner, intermediate, advanced" and more workout programs at every level.
 *
 * One source of truth:
 *   - Home's START NOW card picks today's routine for a level and opens it.
 *   - ProgramSeed seeds the 4-week workout programs and the stretch programs
 *     from the same routines, so a Home quick-start and a program day match.
 *
 * Exercise names are the canonical Exercise records (ExerciseSeed), so images,
 * instructions and AiRTP tracking resolve. Holds and stretches are timed
 * (target_reps 0, target_time > 0); everything else is reps.
 */

const r = (name, sets, reps) => ({ exercise_name: name, sets, target_reps: reps, target_time: 0 });
const t = (name, sets, secs) => ({ exercise_name: name, sets, target_reps: 0, target_time: secs });

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

// ── Workouts (about 15 / 25 / 35 minutes) ───────────────────────────────────
export const WORKOUTS = {
  beginner: [
    // The standard beginner full-body plan: squat, lunge, glute bridge,
    // push-up, back extension (superman), plank — 2–3 sets of 8–15.
    { name: "Full-Body Starter", focus: "Full body", exercises: [
      r("Squat", 3, 12), r("Incline Push-Up", 3, 8), r("Reverse Lunge", 2, 8), r("Glute Bridge", 3, 12), r("Superman", 2, 10), t("Plank", 2, 20) ] },
    { name: "Legs & Core Basics", focus: "Lower body", exercises: [
      r("Squat", 3, 12), r("Reverse Lunge", 2, 8), r("Calf Raise", 3, 15), r("Dead Bug", 2, 10), t("Wall Sit", 2, 20) ] },
    { name: "Upper Body Basics", focus: "Upper body", exercises: [
      r("Incline Push-Up", 3, 8), r("Australian Row", 3, 8), r("Shoulder Tap", 2, 16), r("Arm Circle", 2, 20), t("Plank", 2, 20) ] },
    { name: "Easy Cardio Burn", focus: "Cardio", exercises: [
      r("Jumping Jack", 3, 20), r("High Knee", 3, 20), r("Butt Kicker", 3, 20), r("Squat", 2, 10), r("Mountain Climber", 2, 12) ] },
  ],
  intermediate: [
    { name: "Bodyweight Strength", focus: "Full body", exercises: [
      r("Push-Up", 4, 12), r("Squat", 4, 20), r("Australian Row", 4, 10), r("Lunge", 3, 12), t("Plank", 3, 45) ] },
    { name: "Leg Day Builder", focus: "Lower body", exercises: [
      r("Jump Squat", 4, 12), r("Bulgarian Split Squat", 3, 10), r("Step Up", 3, 12), r("Glute Bridge", 3, 20), t("Wall Sit", 3, 45) ] },
    { name: "Push & Pull", focus: "Upper body", exercises: [
      r("Push-Up", 4, 15), r("Pull-Up", 4, 6), r("Wide Push-Up", 3, 12), r("Tricep Dip", 3, 12), r("Pike Push-Up", 3, 8) ] },
    { name: "Conditioning Circuit", focus: "Cardio", exercises: [
      r("Burpee", 4, 10), r("Mountain Climber", 4, 20), r("Jump Squat", 3, 15), r("High Knee", 3, 30), r("V-Up", 3, 12) ] },
  ],
  advanced: [
    { name: "Calisthenics Power", focus: "Full body", exercises: [
      r("Muscle-Up", 3, 3), r("Pull-Up", 5, 10), r("Diamond Push-Up", 5, 15), r("Pistol Squat", 4, 6), r("Toes to Bar", 4, 10), t("Hollow Body Hold", 3, 45) ] },
    { name: "Explosive Legs", focus: "Lower body", exercises: [
      r("Jump Squat", 5, 20), r("Bulgarian Split Squat", 4, 15), r("Box Jump", 4, 10), r("Pistol Squat", 3, 8), t("Wall Sit", 3, 90) ] },
    { name: "Upper Body Engine", focus: "Upper body", exercises: [
      r("Decline Push-Up", 5, 15), r("Chin-Up", 5, 10), r("Handstand Push-Up", 4, 5), r("Tricep Dip", 4, 20), t("L-Sit / Pike Hold", 3, 20) ] },
    { name: "HIIT Engine", focus: "Cardio", exercises: [
      r("Burpee", 5, 15), r("Jump Squat", 5, 20), r("Mountain Climber", 5, 30), r("Plank to Push-Up", 4, 12), r("V-Up", 4, 15) ] },
  ],
};

// ── Stretch routines (about 10 / 15 / 25 minutes) ───────────────────────────
// Built from the most-recommended stretches (NASM, physical-therapist and
// "best full-body stretch" round-ups, Nov 2026): every routine opens with
// dynamic moves (arm/hip circles, toe touches, walking lunges, world's
// greatest stretch) and then holds the static stretches people need most —
// hip flexors, hamstrings, quads, calves, inner thigh, chest, triceps/lats,
// neck, a spinal twist — 15–60 s per hold, longer as the level goes up.
// JT's own example routine (toe touches, hip flexors, lunges, world's
// greatest stretch, hips, legs, chest, lower body) is the "Full-Body Stretch".
export const STRETCHES = {
  beginner: [
    { name: "Full-Body Stretch", focus: "Full body", exercises: [
      t("Toe Touch", 1, 30), r("Lunge", 1, 10), t("World's Greatest Stretch", 1, 40), t("Hip Flexor Lunge Stretch", 1, 40),
      t("Hip Circle", 1, 30), t("Standing Hamstring Stretch", 1, 30), t("Standing Quadriceps Stretch", 1, 30),
      t("Chest Opener Stretch", 1, 30), t("Seated Butterfly Stretch", 1, 30), t("Toe Touch", 1, 30) ] },
    { name: "Lower Body & Hips", focus: "Hips & legs", exercises: [
      t("Hip Circle", 1, 30), t("Toe Touch", 1, 30), t("Hip Flexor Lunge Stretch", 1, 40), t("Figure-4 Glute Stretch", 1, 30),
      t("Seated Butterfly Stretch", 1, 40), t("Quad Stretch", 1, 30), t("Calf Stretch (wall)", 1, 30),
      t("Knees to Chest", 1, 40), t("Supine Spinal Twist", 1, 30) ] },
    { name: "Upper Body & Back", focus: "Upper body", exercises: [
      t("Arm Circle", 1, 30), t("Neck Side Stretch", 1, 30), t("Doorway Chest Stretch", 1, 40), t("Shoulder Cross-Body Stretch", 1, 30),
      t("Overhead Tricep Stretch", 1, 30), t("Cat-Cow", 1, 40), t("Thread the Needle", 1, 30), t("Child's Pose", 1, 45) ] },
  ],
  intermediate: [
    { name: "Full-Body Mobility Flow", focus: "Full body", exercises: [
      t("Arm Circle", 1, 30), t("Hip Circle", 1, 30), t("Toe Touch", 2, 30), r("Lunge", 2, 12), t("World's Greatest Stretch", 2, 45),
      t("Hip Flexor Lunge Stretch", 2, 45), t("Standing Hamstring Stretch", 2, 45), t("Standing Quadriceps Stretch", 2, 30),
      t("Doorway Chest Stretch", 2, 45), t("Downward Dog", 2, 45), t("Seated Spinal Twist", 2, 30), t("Child's Pose", 1, 60) ] },
    { name: "Hips, Hamstrings & Legs", focus: "Hips & legs", exercises: [
      t("Hip Circle", 1, 45), r("Lunge", 2, 12), t("World's Greatest Stretch", 2, 45), t("Hip Flexor Lunge Stretch", 2, 45),
      t("Figure-4 Glute Stretch", 2, 45), t("Seated Butterfly Stretch", 2, 45), t("IT Band Stretch", 2, 30),
      t("Seated Forward Fold", 2, 45), t("Calf Stretch (wall)", 2, 30), t("Toe Touch", 1, 45) ] },
    { name: "Chest, Shoulders & Spine", focus: "Upper body", exercises: [
      t("Arm Circle", 1, 45), t("Chest Opener Stretch", 2, 45), t("Doorway Chest Stretch", 2, 45), t("Overhead Lat Stretch", 2, 45),
      t("Thread the Needle", 2, 45), t("Cobra Stretch", 2, 30), t("Cat-Cow", 2, 45), t("Seated Spinal Twist", 2, 30),
      t("Neck Side Stretch", 2, 30), t("Child's Pose", 1, 60) ] },
  ],
  advanced: [
    { name: "Deep Full-Body Flexibility", focus: "Full body", exercises: [
      t("Toe Touch", 2, 45), r("Lunge", 2, 16), t("World's Greatest Stretch", 3, 60), t("Hip Flexor Lunge Stretch", 2, 60),
      t("Pigeon Pose", 2, 90), t("Seated Forward Fold", 2, 90), t("Seated Butterfly Stretch", 2, 60), t("Downward Dog", 2, 60),
      t("Doorway Chest Stretch", 2, 60), t("Cobra Stretch", 2, 45), t("Supine Spinal Twist", 2, 60) ] },
    { name: "Splits & Hips Prep", focus: "Hips & legs", exercises: [
      t("Hip Circle", 1, 60), r("Lunge", 2, 16), t("Hip Flexor Lunge Stretch", 3, 60), t("Pigeon Pose", 3, 90),
      t("Standing Hamstring Stretch", 2, 60), t("Figure-4 Glute Stretch", 2, 60), t("IT Band Stretch", 2, 60),
      t("Seated Butterfly Stretch", 2, 90), t("Seated Forward Fold", 2, 90), t("Toe Touch", 1, 60) ] },
    { name: "Shoulder, Chest & Hang Mobility", focus: "Upper body", exercises: [
      t("Arm Circle", 1, 60), t("Bar Hang / Dead Hang", 3, 30), t("Overhead Lat Stretch", 2, 60), t("Doorway Chest Stretch", 2, 60),
      t("Chest Opener Stretch", 2, 60), t("Thread the Needle", 2, 60), t("Overhead Tricep Stretch", 2, 45),
      t("Forearm Stretch", 2, 45), t("Cobra Stretch", 2, 60), t("Child's Pose", 1, 90) ] },
  ],
};

// ── Ab / core routines (2026-11-15) ─────────────────────────────────────────
// JT: "do some research as a fitness expert, calisthenics mindset for ab
// workouts ... 3 levels: beginner, intermediate, advanced. Those are
// individual programs." Research (Nov 2026) the routines are built on:
//  - Calisthenics core = 3 jobs, trained every session:
//      compression / hip flexion  -> the leg-raise ladder, L-sit
//      straight-body tension      -> hollow hold, plank, dead bug
//      side / anti-lateral        -> side plank, twists
//  - Leg-raise ladder: lying leg raise -> hanging knees to chest -> hanging
//    leg raise -> toes to bar. Earn the next rung with ~3x10 strict reps of
//    the current one (3x5 strict hanging leg raises before toes to bar).
//  - Strict reps: dead hang start, posterior pelvic tilt, no swing, 2-3 s
//    lowering. Toes to bar is 3-8 strict reps; quality drops fast after that.
//  - Dose: ~10-20 hard sets/week, 6-15 reps or 15-45 s holds, 2-4 sessions
//    with 48 h between hard days. 1-3 sessions/week gave similar endurance
//    gains in an RCT of 118 untrained subjects, so 3 short days is plenty.
//  - Low on high-rep sit-ups/crunches (McGill: ~3,300 N disc compression per
//    rep). Dead bug / plank / side plank carry the beginner level instead.
// Every exercise is 3 sets (JT: "Set 3"). Each level = 3 sessions (A/B/C),
// ~12 sets each -> ~36 sets/week; holds keep the hard-set count honest.
export const ABS = {
  beginner: [
    { name: "Core Foundations A", focus: "Leg lifts + bracing", exercises: [
      r("Dead Bug", 3, 10), r("Leg Raise", 3, 10), t("Plank", 3, 20), t("Side Plank", 3, 15) ] },
    { name: "Core Foundations B", focus: "First bar work", exercises: [
      r("Hanging Knees to Chest", 3, 8), r("Lying Knees to Chest", 3, 12), t("Hollow Body Hold", 3, 15), r("Bicycle Crunch", 3, 12) ] },
    { name: "Core Foundations C", focus: "Control + obliques", exercises: [
      r("Leg Raise", 3, 12), r("Dead Bug", 3, 12), t("Side Plank", 3, 20), r("Mountain Climber", 3, 16) ] },
  ],
  intermediate: [
    { name: "Bar Core A", focus: "Hanging strength", exercises: [
      r("Hanging Leg Raise", 3, 8), r("Hanging Knees to Chest", 3, 12), t("Hollow Body Hold", 3, 30), t("Side Plank", 3, 30) ] },
    { name: "Bar Core B", focus: "Floor compression", exercises: [
      r("Leg Raise", 3, 15), r("V-Up", 3, 10), r("Russian Twist", 3, 16), t("Plank", 3, 45) ] },
    { name: "Bar Core C", focus: "L-sit + tension", exercises: [
      r("Hanging Leg Raise", 3, 10), t("L-Sit / Pike Hold", 3, 10), r("Dead Bug", 3, 12), r("Flutter Kick", 3, 20) ] },
  ],
  advanced: [
    { name: "Toes to Bar A", focus: "Max compression", exercises: [
      r("Toes to Bar", 3, 6), r("Hanging Leg Raise", 3, 10), t("L-Sit / Pike Hold", 3, 20), t("Side Plank", 3, 45) ] },
    { name: "Toes to Bar B", focus: "Volume + tension", exercises: [
      r("Hanging Leg Raise", 3, 12), r("V-Up", 3, 15), t("Hollow Body Hold", 3, 45), r("Russian Twist", 3, 20) ] },
    { name: "Toes to Bar C", focus: "Strict reps + burnout", exercises: [
      r("Toes to Bar", 3, 8), r("Hanging Knees to Chest", 3, 15), t("L-Sit / Pike Hold", 3, 20), r("Plank to Push-Up", 3, 10) ] },
  ],
};

// When to move up a level — shown on the Abs page.
export const AB_LEVEL_UP = {
  beginner: "Move up when you can do 3 × 12 strict hanging knees to chest and hold a 30 s hollow body.",
  intermediate: "Move up when you can do 3 × 10 strict hanging leg raises (no swing, 2 s lowering).",
  advanced: "Own 3 × 8 strict toes to bar? Next goals: a 20 s full L-sit, then dragon flag negatives.",
};

/** Today's routine for a level — rotates daily so the one-tap button varies. */
export function todaysRoutine(kind, level, date = new Date()) {
  const list = (kind === "stretch" ? STRETCHES : kind === "abs" ? ABS : WORKOUTS)[level] || [];
  const day = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  return list[day % list.length];
}

// ── Preset programs built from the routines ─────────────────────────────────
const scale = (exs, f) => exs.map((e) => ({
  ...e,
  target_reps: e.target_reps ? Math.max(1, Math.round(e.target_reps * f)) : 0,
  target_time: e.target_time ? Math.round(e.target_time * f / 5) * 5 : 0,
}));
const asPlanExercises = (exs, rest) => exs.map((e, i) => ({ ...e, circuit_number: i + 1, rest_after_circuit_seconds: rest }));
const dayOf = (n, name, exs) => ({
  day_number: n, day_name: `Day ${n}`, workout_name: name, is_rest_day: !exs.length,
  total_reps: exs.reduce((s, e) => s + e.sets * (e.target_reps || 0), 0), exercises: exs,
});
const REST_S = { beginner: 75, intermediate: 60, advanced: 45 };
const DIFF = { beginner: "beginner", intermediate: "intermediate", advanced: "advanced" };

/**
 * 4-week workout program. `pattern` is the 7-day week: "W<i>" = workout i,
 * "S" = stretch day, "R" = rest. Reps/holds grow 10% a week; week 4 eases off.
 */
function workoutProgram({ name, level, category, description, pattern }) {
  const plans = [];
  const growth = [1, 1.1, 1.2, 1.05];
  for (let w = 0; w < 4; w++) {
    pattern.forEach((p, d) => {
      const n = w * 7 + d + 1;
      if (p === "R") { plans.push(dayOf(n, "Rest & Recovery", [])); return; }
      if (p === "S") {
        const s = STRETCHES[level][(w + d) % STRETCHES[level].length];
        plans.push(dayOf(n, `Week ${w + 1} · Stretch — ${s.name}`, asPlanExercises(s.exercises, 15)));
        return;
      }
      const wk = WORKOUTS[level][Number(p.slice(1))];
      plans.push(dayOf(n, `Week ${w + 1} · ${wk.name}`, asPlanExercises(scale(wk.exercises, growth[w]), REST_S[level])));
    });
  }
  return { name, description, category, difficulty: DIFF[level], duration_days: 28, is_preset: true,
    program_type: "workout", thumbnail_url: "", daily_plans: plans };
}

/** Stretch program: a routine every day, rotating, holds lengthening weekly. */
function stretchProgram({ name, level, days, description }) {
  const plans = [];
  for (let n = 1; n <= days; n++) {
    const w = Math.floor((n - 1) / 7);
    const s = STRETCHES[level][(n - 1) % STRETCHES[level].length];
    plans.push(dayOf(n, `Week ${w + 1} · ${s.name}`, asPlanExercises(scale(s.exercises, 1 + 0.1 * w), 10)));
  }
  return { name, description, category: "mixed", difficulty: DIFF[level], duration_days: days, is_preset: true,
    program_type: "workout", thumbnail_url: "", daily_plans: plans };
}

/**
 * 4-week ab program (2026-11-15): sessions A/B/C on Mon/Wed/Fri — 48 h between
 * hard core days — the other days free for the user's main training. Reps and
 * holds grow 10%/week, week 4 eases off (same curve as the workout programs).
 */
function abProgram({ name, level, description }) {
  const plans = [];
  const growth = [1, 1.1, 1.2, 1.05];
  const pattern = [0, "R", 1, "R", 2, "R", "R"];
  for (let w = 0; w < 4; w++) {
    pattern.forEach((p, d) => {
      const n = w * 7 + d + 1;
      if (p === "R") { plans.push(dayOf(n, "Rest / Main Training", [])); return; }
      const s = ABS[level][p];
      plans.push(dayOf(n, `Week ${w + 1} · ${s.name}`, asPlanExercises(scale(s.exercises, growth[w]), REST_S[level])));
    });
  }
  return { name, description, category: "strength", difficulty: DIFF[level], duration_days: 28, is_preset: true,
    program_type: "workout", thumbnail_url: "", daily_plans: plans };
}

export const AB_PROGRAMS_4WK = [
  abProgram({ name: "Beginner Abs — 4 Weeks", level: "beginner",
    description: "Core foundations: leg lifts, dead bugs, planks and your first hanging knees to chest. Three 12-minute sessions a week, 3 sets each." }),
  abProgram({ name: "Intermediate Abs — 4 Weeks", level: "intermediate",
    description: "Bar core: hanging leg raises, hollow holds, L-sit work and V-ups. Three sessions a week, 3 sets each. Pull-up bar needed." }),
  abProgram({ name: "Advanced Abs — 4 Weeks", level: "advanced",
    description: "Strict toes to bar, L-sits and long hollow holds for real calisthenics compression. Three sessions a week, 3 sets each." }),
];

export const NEW_PROGRAMS = [
  workoutProgram({ name: "Beginner Bodyweight — 4 Weeks", level: "beginner", category: "mixed",
    description: "Never trained before? Start here. Three short full-body workouts a week, a stretch day and plenty of rest. No equipment.",
    pattern: ["W0", "R", "W2", "S", "W1", "R", "R"] }),
  workoutProgram({ name: "Beginner Fat Burn — 4 Weeks", level: "beginner", category: "weight_loss",
    description: "Easy cardio and simple strength moves four days a week to build the habit and burn calories. No equipment.",
    pattern: ["W3", "W0", "R", "W3", "S", "W1", "R"] }),
  workoutProgram({ name: "Intermediate Bodyweight Strength — 4 Weeks", level: "intermediate", category: "strength",
    description: "Push, pull and legs with a pull-up bar. Four strength days a week plus a mobility day; reps climb each week.",
    pattern: ["W0", "W2", "R", "W1", "S", "W0", "R"] }),
  workoutProgram({ name: "Intermediate Conditioning — 4 Weeks", level: "intermediate", category: "cardio",
    description: "Burpees, jump squats and circuits for your engine, balanced with strength and a stretch day.",
    pattern: ["W3", "W0", "R", "W3", "W1", "S", "R"] }),
  workoutProgram({ name: "Advanced Calisthenics — 4 Weeks", level: "advanced", category: "muscle_gain",
    description: "Pull-ups, pistols, handstand push-ups and toes-to-bar. Five hard days a week with built-in mobility.",
    pattern: ["W0", "W2", "W1", "S", "W0", "W2", "R"] }),
  workoutProgram({ name: "Advanced HIIT Engine — 4 Weeks", level: "advanced", category: "cardio",
    description: "High-volume burpees, jump squats and explosive leg work for elite conditioning. Not for day one.",
    pattern: ["W3", "W1", "W3", "S", "W0", "W3", "R"] }),
  stretchProgram({ name: "Beginner Stretch — 14 Days", level: "beginner", days: 14,
    description: "Ten gentle minutes a day. Loosen your neck, shoulders, back, hips and legs — no experience needed." }),
  stretchProgram({ name: "Intermediate Mobility — 21 Days", level: "intermediate", days: 21,
    description: "Daily 15-minute mobility flows for hips, hamstrings, shoulders and spine. Holds lengthen each week." }),
  stretchProgram({ name: "Advanced Flexibility — 28 Days", level: "advanced", days: 28,
    description: "25-minute deep-flexibility sessions: pigeon, long forward folds, splits prep and hang work." }),
  ...AB_PROGRAMS_4WK,
];
