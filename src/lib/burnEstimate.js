/* Live burn estimate (2026-11-18, JT: "a live HR visualizer or active calorie
   burning visualization during the workout").

   SOURCES — do not change a number here without one:
   - MET values: Ainsworth BE et al., "2011 Compendium of Physical Activities",
     Med Sci Sports Exerc 43(8):1575-81. Codes quoted beside each value.
   - kcal/min = MET x 3.5 x kg / 200 (ACSM's Guidelines for Exercise Testing
     and Prescription). "Active" calories subtract the resting 1 MET, the same
     idea as Apple/Google "active energy", so standing still burns ~0.
   - HRmax = 208 - 0.7 x age (Tanaka, Monahan & Seals 2001, JACC 37(1):153-6).
   - Intensity bands by %HRmax: ACSM Guidelines (10th ed.), Table 6.1:
     very light <57, light 57-63, moderate 64-76, vigorous 77-95, near-max >=96.

   This is an ESTIMATE. It's labelled "est." everywhere it shows. */

import { base44 } from "@/api/base44Client";

export const MET = {
  vigorous: 8.0, // 02020 calisthenics (push ups, sit ups, pull-ups, jumping jacks), vigorous effort
  moderate: 3.8, // 02022 calisthenics (push ups, sit ups, pull-ups, lunges), moderate effort
  light: 2.8,    // 02024 calisthenics (situps, abdominal crunches), light effort
  squats: 5.0,   // 02052 resistance training, squats, slow or explosive effort
  stretch: 2.3,  // 02101 stretching, mild
  rope: 11.8,    // 15552 rope jumping, moderate pace, general
  walk: 3.5,     // 17190 walking, 2.8-3.2 mph, level, moderate pace
  jog: 7.0,      // 12020 jogging, general
  sprint: 11.8,  // 12070 running, 8 mph (7.5 min/mile)
  mtb: 8.5,       // 01009 bicycling, mountain, general
  road_bike: 8.0, // 01030 bicycling, 12-13.9 mph, leisure, moderate effort
  swim: 5.8,      // 18310 swimming laps, freestyle, front crawl, slow, light or moderate effort
  rest: 1.3,     // 07040 standing quietly
};

// First match wins, so the specific patterns sit above the general ones.
const RULES = [
  [/jump ?rope|skipping rope|double under/, "rope"],
  [/sprint/, "sprint"],
  [/\bjog|run(ning)? in place|\brun\b/, "jog"],
  [/walk|march/, "walk"],
  [/stretch|opener|mobility|circle|cat.?cow|child'?s pose|pigeon|thread the needle|toe touch|world'?s greatest/, "stretch"],
  [/burpee|jumping jack|star jump|mountain climber|high knee|jump squat|squat jump|tuck jump|plyo|skater|box jump|broad jump|butt kick|sprawl|bear crawl/, "vigorous"],
  [/plank|hollow|crunch|sit.?up|dead bug|bird dog|glute bridge|hip bridge|superman|flutter|leg raise|wall sit|hold|hang|l.?sit|v.?up|russian twist|bicycle/, "light"],
  [/squat|thruster/, "squats"],
];

export function metForExercise(name) {
  const n = String(name || "").toLowerCase();
  for (const [re, key] of RULES) if (re.test(n)) return MET[key];
  return MET.moderate; // push-ups, pull-ups, dips, lunges, rows… and anything unknown
}

export function metForCardio(type) {
  return MET[type] || MET.walk;
}

/** Active (net) kcal per minute for a MET at a body weight. */
export function activeKcalPerMin(met, weightKg) {
  return Math.max(0, met - 1) * 3.5 * weightKg / 200;
}

export const lbsToKg = (lbs) => lbs * 0.45359237;

export function hrMax(age) {
  return Math.round(208 - 0.7 * age);
}

export const HR_ZONES = [
  { key: "vlight", label: "Very light", min: 0, color: "#38bdf8" },
  { key: "light", label: "Light", min: 57, color: "#00e5ff" },
  { key: "moderate", label: "Moderate", min: 64, color: "#facc15" },
  { key: "vigorous", label: "Vigorous", min: 77, color: "#f97316" },
  { key: "max", label: "Near max", min: 96, color: "#ef4444" },
];

export function hrZone(bpm, age) {
  if (!bpm) return null;
  const pct = (bpm / hrMax(age)) * 100;
  let idx = 0;
  HR_ZONES.forEach((z, i) => { if (pct >= z.min) idx = i; });
  return { ...HR_ZONES[idx], index: idx, pct: Math.round(pct) };
}

/* Intensity from the MET when there's no heart rate (ACSM: light <3,
   moderate 3-5.9, vigorous >=6). Maps onto the same 5-band colour scale. */
export function metBand(met) {
  if (met < 1.6) return 0;
  if (met < 3) return 1;
  if (met < 6) return 2;
  if (met < 9) return 3;
  return 4;
}

export const DEFAULT_WEIGHT_LBS = 170;
export const DEFAULT_AGE = 40;

let statsPromise = null;
/** Weight + age for the estimate. Latest body measurement, then the nutrition
    goal weight, then a default (flagged so the UI can say so). Cached per load. */
export function getBodyStats() {
  if (statsPromise) return statsPromise;
  statsPromise = (async () => {
    const out = { weightLbs: DEFAULT_WEIGHT_LBS, age: DEFAULT_AGE, weightIsDefault: true };
    try {
      const me = await base44.auth.me();
      const age = parseInt(me?.age, 10);
      if (age >= 13 && age <= 100) out.age = age;
    } catch { /* not signed in */ }
    try {
      const m = await base44.entities.BodyMeasurement.list("-date");
      const w = parseFloat(m?.find((r) => r.weight_lbs)?.weight_lbs);
      if (w > 60 && w < 700) { out.weightLbs = w; out.weightIsDefault = false; return out; }
    } catch { /* entity missing or no rows */ }
    try {
      const g = await base44.entities.NutritionGoal.filter({ is_active: true });
      const w = parseFloat(g?.[0]?.current_weight_lbs);
      if (w > 60 && w < 700) { out.weightLbs = w; out.weightIsDefault = false; }
    } catch { /* ignore */ }
    return out;
  })();
  return statsPromise;
}
