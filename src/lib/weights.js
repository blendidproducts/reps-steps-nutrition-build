/**
 * weights.js — added weight per set, and training volume (weight × reps).
 *
 * Volume is the standard way lifters track "how much work did I do":
 *   set volume      = weight × counted reps
 *   workout volume  = sum of its sets
 *   weekly volume   = sum of that week's workouts
 *
 * Rules:
 *  - A blank / 0 weight means BODYWEIGHT. Bodyweight sets add no volume; they
 *    still count reps everywhere they always did.
 *  - Only COUNTED reps make volume. Shallow reps (partials) never reach `reps`.
 *  - Each set stores its own weight AND unit, so a set logged in kg stays kg.
 *    Totals across sets are normalised to the viewer's display unit.
 *  - Distance-scored work (bear crawl, unit 'ft') never gets volume.
 *
 * Storage: the sets live on the WorkoutSession record in Base44
 * (`exercises_completed[].sets`, `total_volume_lbs`). localStorage only keeps
 * conveniences — the last weight used per exercise and the lb/kg choice.
 */

export const LB_PER_KG = 2.20462;
const UNIT_KEY = "rns_weight_unit";
const LAST_KEY = "rns_last_weight";

const safeGet = (k) => { try { return window.localStorage.getItem(k); } catch (_) { return null; } };
const safeSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (_) { /* private mode */ } };

/** 'lb' or 'kg' — the unit the person types and reads weights in. */
export function getWeightUnit() {
  return safeGet(UNIT_KEY) === "kg" ? "kg" : "lb";
}
export function setWeightUnit(u) { safeSet(UNIT_KEY, u === "kg" ? "kg" : "lb"); }

const keyFor = (name) => String(name || "").trim().toLowerCase();

function readLastMap() {
  try { return JSON.parse(safeGet(LAST_KEY) || "{}") || {}; } catch (_) { return {}; }
}

/** Last weight used for this exercise: { weight, unit } or null. */
export function getLastWeight(exerciseName) {
  const hit = readLastMap()[keyFor(exerciseName)];
  if (!hit || !(hit.weight > 0)) return null;
  return { weight: hit.weight, unit: hit.unit === "kg" ? "kg" : "lb" };
}

/** Remember the weight for next time. 0 / blank clears it (back to bodyweight). */
export function rememberWeight(exerciseName, weight, unit) {
  const k = keyFor(exerciseName);
  if (!k) return;
  const m = readLastMap();
  if (weight > 0) m[k] = { weight, unit: unit === "kg" ? "kg" : "lb", at: Date.now() };
  else delete m[k];
  safeSet(LAST_KEY, JSON.stringify(m));
}

/** Parse what was typed. Returns a weight >= 0 rounded to 0.5, or 0 for blank/invalid. */
export function parseWeight(text) {
  const n = parseFloat(String(text ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(2000, Math.round(n * 2) / 2);
}

export function toLbs(weight, unit) {
  return unit === "kg" ? weight * LB_PER_KG : weight;
}
export function convert(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  return toUnit === "kg" ? weight / LB_PER_KG : weight * LB_PER_KG;
}

/** Volume of one set in its OWN unit. Bodyweight / distance sets are 0. */
export function setVolume(s) {
  if (!s || (s.scoreUnit ?? "reps") !== "reps") return 0;
  const w = Number(s.weight) || 0;
  const r = Number(s.reps) || 0;
  return w > 0 && r > 0 ? w * r : 0;
}

/** Pretty number: 4250 → "4,250", 12.5 → "12.5". */
export function fmtNum(n) {
  const v = Math.round((Number(n) || 0) * 10) / 10;
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * ARTP `scores` ([{name, reps, set, unit, weight, weightUnit}]) → what we save.
 *   exercises_completed: [{ exercise_name, reps_completed, time_spent,
 *                           sets: [{reps, weight, unit}], volume_lbs }]
 *   total_volume_lbs: number
 * Exercises keep first-seen order; sets keep their order.
 */
export function buildExercisesWithSets(scores) {
  const order = [];
  const by = {};
  (scores || []).forEach((s) => {
    if (!by[s.name]) { by[s.name] = []; order.push(s.name); }
    by[s.name].push(s);
  });
  let totalLbs = 0;
  const exercises = order.map((name) => {
    const list = by[name];
    let reps = 0;
    let volLbs = 0;
    const sets = list.map((s) => {
      reps += s.reps || 0;
      const w = Number(s.weight) || 0;
      const u = s.weightUnit === "kg" ? "kg" : "lb";
      const v = setVolume({ reps: s.reps, weight: w, scoreUnit: s.unit ?? "reps" });
      volLbs += toLbs(v, u);
      return { reps: s.reps || 0, weight: w, unit: u };
    });
    totalLbs += volLbs;
    const row = { exercise_name: name, reps_completed: reps, time_spent: 0, sets };
    if (volLbs > 0) row.volume_lbs = Math.round(volLbs);
    return row;
  });
  return { exercises, totalVolumeLbs: Math.round(totalLbs) };
}

/** Total volume of a saved WorkoutSession, in lbs (0 when nothing was weighted). */
export function sessionVolumeLbs(session) {
  if (!session) return 0;
  if (Number(session.total_volume_lbs) > 0) return Number(session.total_volume_lbs);
  let t = 0;
  (session.exercises_completed || []).forEach((ex) => { t += exerciseVolumeLbs(ex); });
  return Math.round(t);
}

export function exerciseVolumeLbs(ex) {
  if (!ex) return 0;
  if (Number(ex.volume_lbs) > 0) return Number(ex.volume_lbs);
  return (ex.sets || []).reduce((a, s) => a + toLbs((Number(s.weight) || 0) * (Number(s.reps) || 0), s.unit), 0);
}

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  return x;
}

/** Last `weeks` weeks of volume, oldest first: [{ start: Date, lbs }]. */
export function weeklyVolume(sessions, weeks = 8, now = new Date()) {
  const thisWeek = weekStart(now).getTime();
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(thisWeek);
    s.setDate(s.getDate() - i * 7);
    out.push({ start: s, lbs: 0 });
  }
  (sessions || []).forEach((sess) => {
    const t = sess.start_time || sess.created_date;
    if (!t) return;
    const ws = weekStart(t).getTime();
    const bucket = out.find((b) => b.start.getTime() === ws);
    if (bucket) bucket.lbs += sessionVolumeLbs(sess);
  });
  return out;
}

/**
 * Per-exercise history. For each weight ever used: the best set (most reps)
 * and when it happened. Weights are compared in lbs, shown in `displayUnit`.
 * Returns { sessions: [{date, lbs, topWeightLbs}], bestByWeight: [{weightLbs, reps, date}] }
 */
export function exerciseHistory(sessions, exerciseName) {
  const points = [];
  const best = new Map(); // weight lbs (rounded 0.1) → { weightLbs, reps, date }
  (sessions || []).forEach((sess) => {
    const ex = (sess.exercises_completed || []).find((e) => e.exercise_name === exerciseName);
    if (!ex || !ex.sets || !ex.sets.length) return;
    const date = sess.start_time || sess.created_date;
    let top = 0;
    ex.sets.forEach((s) => {
      const wl = toLbs(Number(s.weight) || 0, s.unit);
      if (!(wl > 0) || !(s.reps > 0)) return;
      top = Math.max(top, wl);
      const k = Math.round(wl * 10) / 10;
      const cur = best.get(k);
      if (!cur || s.reps > cur.reps) best.set(k, { weightLbs: wl, reps: s.reps, date });
    });
    const lbs = exerciseVolumeLbs(ex);
    if (lbs > 0) points.push({ date, lbs, topWeightLbs: top });
  });
  points.sort((a, b) => new Date(a.date) - new Date(b.date));
  const bestByWeight = [...best.values()].sort((a, b) => b.weightLbs - a.weightLbs);
  return { sessions: points, bestByWeight };
}
