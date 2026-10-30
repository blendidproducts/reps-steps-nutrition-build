/**
 * savedWorkouts.js — one place to save a workout as a reusable template and to
 * start one again (2026-10-29).
 *
 * JT: "I completed a workout and clicked save… gave it a name but I cannot
 * find it anywhere." AiRTP's save went to ONE localStorage slot on this phone
 * (visible only on the AiRTP setup screen), and the weekly-program page it
 * could be scheduled on wasn't in the menu at all. Every save path now writes a
 * SavedWorkout record in Base44, which shows up in My Workouts, can be put on
 * a day in My Programs, and starts with one tap.
 *
 * SavedWorkout.source: 'artp' (camera workout — restarts in AiRTP with its
 * settings) | 'program' (regular/program workout) | 'history' (rebuilt from a
 * logged session).
 */
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

/** 'monday'…'sunday' for a Date (local time). */
export function dayKey(d = new Date()) {
  return DAYS[(d.getDay() + 6) % 7];
}

function cleanExercises(list) {
  return (list || [])
    .filter((ex) => ex && (ex.exercise_name || ex.name))
    .map((ex) => ({
      exercise_id: ex.exercise_id && ex.exercise_id !== "custom" ? ex.exercise_id : undefined,
      exercise_name: ex.exercise_name || ex.name,
      target_reps: Math.max(0, Math.round(Number(ex.target_reps) || 0)),
      target_time: Math.max(0, Math.round(Number(ex.target_time) || 0)),
      sets: Math.max(1, Math.round(Number(ex.sets) || 1)),
      superset_with_next: !!ex.superset_with_next,
    }));
}

/** Create a SavedWorkout. Returns the created record. */
export async function saveWorkoutTemplate({ name, exercises, source = "program", artpSettings, description, difficulty }) {
  const ex = cleanExercises(exercises);
  if (!ex.length) throw new Error("This workout has no exercises to save.");
  const rec = {
    name: (name || "").trim() || "My Workout",
    exercises: ex,
    workout_type: ex.every((e) => e.target_time > 0 && !e.target_reps) ? "time_based" : "rep_based",
    source,
  };
  if (description) rec.description = description;
  if (difficulty) rec.difficulty = difficulty;
  if (artpSettings) rec.artp_settings = artpSettings;
  return base44.entities.SavedWorkout.create(rec);
}

/** A logged WorkoutSession → exercise list for a template (reps per set averaged). */
export function exercisesFromSession(session) {
  return (session?.exercises_completed || [])
    .filter((e) => e.exercise_name)
    .map((e) => {
      const sets = Array.isArray(e.sets) && e.sets.length ? e.sets.length : 1;
      const reps = e.reps_completed > 0 ? Math.round(e.reps_completed / sets) : 0;
      return {
        exercise_name: e.exercise_name,
        sets,
        target_reps: reps,
        target_time: !reps && e.time_spent > 0 ? Math.round(e.time_spent / sets) : 0,
      };
    });
}

/** Was this session an AiRTP (camera) workout? Those have no workout_id. */
export function isArtpSession(session) {
  return !session?.workout_id;
}

/**
 * Start a saved workout.
 *  - AiRTP template → the AiRTP screen, pre-loaded (?saved=id)
 *  - anything else  → a fresh Workout record → ActiveWorkout
 */
export async function startSavedWorkout(saved, navigate) {
  if (!saved) return;
  if (saved.source === "artp") {
    navigate(`${createPageUrl("ARTPWorkout")}?saved=${encodeURIComponent(saved.id)}`);
    return;
  }
  let library = [];
  try { library = await base44.entities.Exercise.list(); } catch (_) { /* names alone still run */ }
  const byId = (id) => id && library.find((e) => e.id === id);
  const byName = (n) => library.find((e) => (e.name || "").toLowerCase() === (n || "").toLowerCase());
  const exercises = (saved.exercises || []).map((ex) => {
    const db = byId(ex.exercise_id) || byName(ex.exercise_name);
    const timed = ex.target_time > 0 && !ex.target_reps;
    return {
      exercise_id: db?.id || "custom",
      exercise_name: ex.exercise_name,
      target_reps: ex.target_reps || 0,
      target_time: ex.target_time || 0,
      sets: ex.sets || 1,
      superset_with_next: !!ex.superset_with_next,
      completed_reps: 0,
      completed_time: 0,
      metric: timed ? "time" : "reps",
      category: db?.category || "full_body",
      image_url: db?.image_url,
      instructions: db?.instructions,
    };
  });
  const workout = await base44.entities.Workout.create({
    name: saved.name,
    exercises,
    workout_type: saved.workout_type || "rep_based",
    difficulty: saved.difficulty || "intermediate",
    rest_time: 60,
  });
  navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
}

/** Put a saved workout on a day of an existing weekly program. */
export async function addToProgramDay(program, day, savedId) {
  const schedule = { ...(program?.schedule || {}), [day]: savedId };
  return base44.entities.WeeklyProgram.update(program.id, { schedule });
}

/** New weekly program with this workout on one day. */
export async function createProgramWithDay(name, day, savedId) {
  return base44.entities.WeeklyProgram.create({
    name: (name || "").trim() || "My Program",
    schedule: { [day]: savedId },
    start_date: new Date().toISOString().split("T")[0],
    is_active: false,
  });
}
