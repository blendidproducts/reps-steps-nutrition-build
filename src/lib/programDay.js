/**
 * programDay.js — start (or rest-skip) one day of a preset program.
 *
 * 2026-10-14, JT field report: "no way to continue the workout program in day
 * four". The workout for a program day was only ever BUILT in one place — the
 * once-a-day popup in Layout.jsx. Every other way in was broken:
 *
 *   - Home's ProgramStatusStrip "Start Day N" went to ProgramProgress.
 *   - ProgramProgress's own "Start Day N" did navigate("Exercises") — it never
 *     built the day at all, just dropped you in the exercise library.
 *   - That button only rendered when the day was exactly enrollment.current_day,
 *     so a day that fell out of sync with user.active_program had no button.
 *
 * Dismiss the popup once (it's remembered per calendar day) and the program
 * could not be continued. This module is the single builder all three use.
 */
import { base44 } from "@/api/base44Client";

/** Rest days come in two shapes: an explicit flag, or a plan with no exercises. */
export function isRestPlan(plan) {
  return !!plan && (plan.is_rest_day === true || !plan.exercises || plan.exercises.length === 0);
}

/** Warm-ups chosen from the categories in the day — unchanged from Layout.jsx. */
function buildWarmups(categories) {
  const w = [{ id: "warmup-1", name: "High Knees", metric: "time", target_time: 60 }];
  const has = (id) => w.some((x) => x.id === id);
  if (categories.has("upper_body")) {
    w.push({ id: "warmup-upper-1", name: "Arm Circles Forward", metric: "reps", target_reps: 20 });
    w.push({ id: "warmup-upper-2", name: "Arm Circles Backward", metric: "reps", target_reps: 20 });
    w.push({ id: "warmup-upper-3", name: "Chest Opener Stretch", metric: "time", target_time: 30 });
    w.push({ id: "warmup-lower-1", name: "Leg Swings", metric: "time", target_time: 30 });
    w.push({ id: "warmup-core-1", name: "Torso Twists", metric: "time", target_time: 30 });
  }
  if (categories.has("lower_body")) {
    w.push({ id: "warmup-lower-2", name: "Hip Circles", metric: "time", target_time: 30 });
    if (!has("warmup-lower-1")) w.push({ id: "warmup-lower-1", name: "Leg Swings", metric: "time", target_time: 30 });
    w.push({ id: "warmup-lower-3", name: "Toe Touches", metric: "time", target_time: 20 });
    w.push({ id: "warmup-full-1", name: "World's Greatest Stretch", metric: "reps", target_reps: 10 });
  }
  if (categories.has("core") || categories.has("full_body")) {
    if (!has("warmup-upper-1")) {
      w.push({ id: "warmup-upper-1", name: "Arm Circles Forward", metric: "reps", target_reps: 20 });
      w.push({ id: "warmup-upper-2", name: "Arm Circles Backward", metric: "reps", target_reps: 20 });
    }
    if (!has("warmup-lower-2")) w.push({ id: "warmup-lower-2", name: "Hip Circles", metric: "time", target_time: 30 });
    if (!has("warmup-core-1")) w.push({ id: "warmup-core-1", name: "Torso Twists", metric: "time", target_time: 30 });
  }
  return w.map((ex) => ({
    exercise_id: ex.id,
    exercise_name: ex.name,
    target_reps: ex.target_reps || 0,
    target_time: ex.target_time || 0,
    sets: 1,
    completed_reps: 0,
    completed_time: 0,
    metric: ex.metric,
    category: "warmup",
  }));
}

/**
 * Create the Workout record for `dayNumber` of `program`. Returns its id.
 * Throws with a readable message if the day has nothing to run.
 */
export async function createProgramDayWorkout(program, dayNumber) {
  const plan = program?.daily_plans?.[dayNumber - 1];
  if (!plan) throw new Error(`Day ${dayNumber} isn't in this program.`);
  if (isRestPlan(plan)) throw new Error(`Day ${dayNumber} is a rest day.`);

  let library = [];
  try { library = await base44.entities.Exercise.list(); } catch { /* names alone still run */ }
  const find = (name) => library.find((e) => (e.name || "").toLowerCase() === (name || "").toLowerCase());

  const exercises = plan.exercises.map((ex) => {
    const db = find(ex.exercise_name);
    return {
      exercise_id: db?.id || "custom",
      exercise_name: ex.exercise_name,
      target_reps: ex.target_reps,
      sets: ex.sets || 1,
      completed_reps: 0,
      completed_time: 0,
      metric: "reps",
      category: db?.category || "full_body",
      image_url: db?.image_url,
      instructions: db?.instructions,
    };
  });

  const workout = await base44.entities.Workout.create({
    name: `${program.name} - Day ${dayNumber}`,
    exercises: [...buildWarmups(new Set(exercises.map((e) => e.category))), ...exercises],
    workout_type: "rep_based",
    difficulty: program.difficulty,
    rest_time: plan.exercises[0]?.rest_after_circuit_seconds || 300,
    program_id: program.id,
    program_day: dayNumber,
  });
  return workout.id;
}

/**
 * Mark a rest day done and advance both records that track the current day.
 * Returns the new current day.
 */
export async function completeRestDay(program, dayNumber) {
  const total = program.duration_days || program.daily_plans?.length || dayNumber;
  const next = dayNumber < total ? dayNumber + 1 : dayNumber;

  const enrollments = await base44.entities.ProgramEnrollment.filter({ program_id: program.id, status: "active" });
  const enr = enrollments?.[0];
  if (enr) {
    const done = Array.isArray(enr.completed_days) ? [...enr.completed_days] : [];
    if (!done.includes(dayNumber)) done.push(dayNumber);
    await base44.entities.ProgramEnrollment.update(enr.id, {
      completed_days: done,
      current_day: next,
      days_completed_count: done.length,
    });
  }
  const user = await base44.auth.me();
  if (user?.active_program?.program_id === program.id) {
    await base44.auth.updateMe({ active_program: { ...user.active_program, current_day: next } });
  }
  return next;
}

/** Load a PresetProgram by id. */
export async function loadProgram(programId) {
  const programs = await base44.entities.PresetProgram.filter({ id: programId });
  return programs?.[0] || null;
}
