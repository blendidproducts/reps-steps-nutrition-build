// ── Shared exercise-name resolution ──────────────────────────────────────────
// Extracted from ActiveWorkout.jsx (Round 18) so every place that needs to
// match a free-text or saved exercise name against the Exercise table uses
// the SAME normalize → alias → singularize → substring pipeline, instead of
// each caller inventing its own matching logic.

export const EX_ALIASES = {
  "walk in place": "running in place",
  "walking in place": "running in place",
  "walking": "running in place",
  "march in place": "running in place",
  "marching in place": "running in place",
  "arm circles forward": "arm circle",
  "arm circles backward": "arm circle",
  "chest opener": "chest opener stretch",
};

export const normName = (s) => (s || "").toLowerCase().trim().replace(/-/g, " ").replace(/[^a-z0-9\s\/]/g, "").replace(/\s+/g, " ");
export const singularWord = (w) => (/(ch|sh|ss|x)es$/.test(w) ? w.slice(0, -2) : (/[a-z]s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w));
export const singular = (s) => s.split(" ").map(singularWord).join(" ");

// Resolves ONE saved workout-exercise entry (we.exercise_id / we.exercise_name)
// against the Exercise table.
export function findExerciseRecord(exList, we) {
  let d = exList.find(ex => ex.id === we.exercise_id || ex.name === we.exercise_name);
  if (d) return d;
  const raw = normName(we.exercise_name);
  const target = EX_ALIASES[raw] || raw;
  d = exList.find(ex => normName(ex.name) === target);
  if (d) return d;
  const st = singular(target);
  d = exList.find(ex => singular(normName(ex.name)) === st);
  if (d) return d;
  // last resort: longest DB name contained in the workout name (or vice versa)
  let best = null, bestLen = 0;
  for (const ex of exList) {
    const n = normName(ex.name);
    if (n.length > 3 && (target.includes(n) || n.includes(target)) && n.length > bestLen) { best = ex; bestLen = n.length; }
  }
  return best;
}

// Scans free text (e.g. a WorkoutGenie prompt) for exercise names that appear
// in the Exercise table, using the same normalize/alias/singularize pipeline
// as findExerciseRecord. Used to treat explicitly named exercises as a hard
// constraint rather than a suggestion the generator can ignore.
export function findNamedExercisesInText(text, exList) {
  const norm = singular(normName(text));
  const found = [];
  const seen = new Set();
  for (const ex of exList) {
    const rawTarget = normName(ex.name);
    const target = singular(EX_ALIASES[rawTarget] || rawTarget);
    if (target.length < 3) continue;
    if (norm.includes(target) && !seen.has(ex.id)) { seen.add(ex.id); found.push(ex); }
  }
  return found;
}
