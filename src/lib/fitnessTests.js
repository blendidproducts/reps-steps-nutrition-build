/**
 * fitnessTests.js — assessment batteries and their scoring.
 *
 * Four batteries, two different kinds of scoring:
 *
 *   military       Navy PRT — scored against the real published age- and
 *                  sex-banded standards. A pass is a pass.
 *   repsandsteps   Scored with The Line, this app's own output formula
 *                  (see claude/02-gamification-spec.md §2).
 *   strength       Scored against YOUR last test, not a population norm.
 *   conditioning   Same — personal baseline.
 *
 * Why strength and conditioning have no absolute standards: there is no
 * sourceable "good number of air squats for a 34-year-old" the way there is for
 * a service PT test. Inventing one and presenting it as a standard would be
 * worse than having none, so those batteries report your delta instead.
 *
 * EVERY event here is something the app can actually measure. The Army AFT is
 * deliberately absent: three of its five events (3RM deadlift, sprint-drag-carry)
 * need a hex bar, a sled and a 25m lane, so the app cannot run it and must not
 * claim to. The Navy PRT is the only official battery that is fully bodyweight.
 */

// ── Navy PRT standards ───────────────────────────────────────────────────────
//
// SOURCE: Navy Physical Readiness Test Guide 5A, DEC 2025 (approved W.R. Bynum,
// N171 Branch Head), Section 4-1, Table 4-1.
//
// VERIFIED 2026-10-06 against the primary document, page by page: all 11 age
// bands x 2 sexes x 3 events, both anchors each — 132 values, zero mismatches.
// These began life transcribed from secondary sources; the secondary sources
// turned out to be right. No verification debt remains on this table.
//
// Values are [100-point (Outstanding High), 45-point (Probationary)]. The real
// table has THIRTEEN discrete rows — 100/95/90/85/80/75/70/65/60/55/50/45, each
// a named category — and we interpolate between the two anchors, so a mid-range
// point total lands within a few points of the official row. The pass/fail
// verdict, which is the thing anyone acts on, is exact.
//
// Standards are for altitudes below 5,000 ft; the Navy publishes a separate set
// above that (Guide 5A Section 4-2) which this app does not yet carry.
// Plank and run times are in SECONDS.
const M = (mmss) => {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
};

export const NAVY_PRT = {
  source: "Navy PRT Guide 5A (Dec 2025), Table 4-1 — verified against the primary document 2026-10-06",
  altitudeNote: "Below 5,000 ft. Separate standards apply above that.",
  male: {
    "17-19": { pushups: [92, 42], plank: [M("3:24"), M("1:11")], run15: [M("8:15"), M("12:45")] },
    "20-24": { pushups: [87, 37], plank: [M("3:20"), M("1:10")], run15: [M("8:30"), M("13:30")] },
    "25-29": { pushups: [84, 34], plank: [M("3:16"), M("1:09")], run15: [M("8:55"), M("14:00")] },
    "30-34": { pushups: [80, 31], plank: [M("3:12"), M("1:07")], run15: [M("9:20"), M("14:30")] },
    "35-39": { pushups: [76, 27], plank: [M("3:08"), M("1:06")], run15: [M("9:25"), M("15:00")] },
    "40-44": { pushups: [72, 24], plank: [M("3:04"), M("1:05")], run15: [M("9:30"), M("15:30")] },
    "45-49": { pushups: [68, 21], plank: [M("3:01"), M("1:03")], run15: [M("9:33"), M("16:08")] },
    "50-54": { pushups: [64, 19], plank: [M("2:57"), M("1:02")], run15: [M("9:35"), M("16:45")] },
    "55-59": { pushups: [60, 10], plank: [M("2:54"), M("1:01")], run15: [M("10:42"), M("17:09")] },
    "60-64": { pushups: [57, 8],  plank: [M("2:50"), M("1:00")], run15: [M("11:21"), M("18:52")] },
    "65+":   { pushups: [48, 4],  plank: [M("2:47"), M("0:58")], run15: [M("11:41"), M("20:35")] },
  },
  female: {
    "17-19": { pushups: [51, 19], plank: [M("3:14"), M("1:01")], run15: [M("9:29"),  M("15:00")] },
    "20-24": { pushups: [48, 16], plank: [M("3:10"), M("1:00")], run15: [M("9:47"),  M("15:30")] },
    "25-29": { pushups: [46, 13], plank: [M("3:06"), M("0:59")], run15: [M("10:17"), M("16:08")] },
    "30-34": { pushups: [44, 11], plank: [M("3:02"), M("0:58")], run15: [M("10:46"), M("16:45")] },
    "35-39": { pushups: [43, 9],  plank: [M("2:59"), M("0:56")], run15: [M("10:51"), M("17:00")] },
    "40-44": { pushups: [41, 7],  plank: [M("2:55"), M("0:55")], run15: [M("10:56"), M("17:15")] },
    "45-49": { pushups: [40, 5],  plank: [M("2:52"), M("0:54")], run15: [M("10:58"), M("17:23")] },
    "50-54": { pushups: [38, 2],  plank: [M("2:48"), M("0:53")], run15: [M("11:00"), M("17:30")] },
    "55-59": { pushups: [30, 2],  plank: [M("2:45"), M("0:52")], run15: [M("12:23"), M("18:34")] },
    "60-64": { pushups: [26, 2],  plank: [M("2:42"), M("0:51")], run15: [M("13:34"), M("19:43")] },
    "65+":   { pushups: [22, 1],  plank: [M("2:38"), M("0:50")], run15: [M("14:45"), M("20:52")] },
  },
};

export const AGE_BANDS = Object.keys(NAVY_PRT.male);

/** The band a given age falls in, or null if it's below the youngest band. */
export function ageBand(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 17) return null;
  if (n >= 65) return "65+";
  return AGE_BANDS.find((b) => {
    const [lo, hi] = b.split("-").map(Number);
    return n >= lo && n <= hi;
  }) || null;
}

/** Navy performance categories, best first. */
export const PRT_CATEGORIES = [
  { key: "outstanding",  label: "Outstanding",  min: 90, color: "#22c55e" },
  { key: "excellent",    label: "Excellent",    min: 75, color: "#4ade80" },
  { key: "good",         label: "Good",         min: 60, color: "#00a9ff" },
  { key: "satisfactory", label: "Satisfactory", min: 50, color: "#fbbf24" },
  { key: "probationary", label: "Probationary", min: 45, color: "#fb923c" },
  { key: "failure",      label: "Failure",      min: 0,  color: "#ef4444" },
];

const categoryFor = (points) =>
  PRT_CATEGORIES.find((c) => points >= c.min) || PRT_CATEGORIES[PRT_CATEGORIES.length - 1];

/**
 * Score one Navy PRT event.
 *
 * The Navy's real tables are per-point lookups; this interpolates linearly
 * between the published minimum (45 points, Probationary) and maximum (100,
 * Outstanding), which tracks the published curve closely enough to train
 * against and is honest about being an approximation. `lowerIsBetter` covers
 * the run, where a smaller number is a better result.
 *
 * @returns {{points:number, category:object, min:number, max:number}|null}
 *          null when no standards exist for that band — better to say "not
 *          loaded" than to score someone against the wrong table.
 */
export function scorePrtEvent(eventKey, value, sex, age) {
  const band = ageBand(age);
  const table = NAVY_PRT[sex]?.[band]?.[eventKey];
  if (!table || !Number.isFinite(Number(value))) return null;

  const [max, min] = table;
  const v = Number(value);
  const lowerIsBetter = eventKey === "run15";

  let frac;
  if (lowerIsBetter) frac = (min - v) / (min - max);
  else               frac = (v - min) / (max - min);

  // 45 points is the passing floor, 100 the ceiling. Below the minimum the
  // score falls away toward 0 at roughly the same rate it climbs above it.
  const points = frac >= 0
    ? Math.min(100, Math.round(45 + frac * 55))
    : Math.max(0, Math.round(45 + frac * 45));

  return { points, category: categoryFor(points), min, max, band };
}

/** Overall PRT result. Failing ANY event fails the test — that's the real rule. */
export function scorePrtTest(events, sex, age) {
  const scored = events.map((e) => ({ ...e, result: scorePrtEvent(e.key, e.value, sex, age) }));
  const usable = scored.filter((e) => e.result);
  if (!usable.length) return { scored, overall: null, passed: null, average: null };

  const average = Math.round(usable.reduce((s, e) => s + e.result.points, 0) / usable.length);
  const anyFailed = usable.some((e) => e.result.points < 45);
  return {
    scored,
    average,
    passed: !anyFailed,
    overall: anyFailed ? PRT_CATEGORIES[PRT_CATEGORIES.length - 1] : categoryFor(average),
  };
}

// ── The Line — this app's own output number ──────────────────────────────────
// From claude/02-gamification-spec.md §2. The RepsAndSteps battery exists to
// produce this number, which is why that battery mixes reps, steps and time
// rather than being a list of max-effort events: all three terms have to be fed.
export function lineScore({ cleanReps = 0, steps = 0, activeMinutes = 0 }) {
  return Math.round(cleanReps * 1.0 + steps / 100 + activeMinutes * 2.0);
}

/** Plate tiers from the gamification spec — a ladder lifters already read. */
export const PLATE_TIERS = [
  { min: 0,   name: "White",  color: "#e5e7eb" },
  { min: 150, name: "Green",  color: "#22c55e" },
  { min: 300, name: "Yellow", color: "#eab308" },
  { min: 500, name: "Blue",   color: "#3b82f6" },
  { min: 750, name: "Red",    color: "#ef4444" },
  { min: 1100, name: "Black", color: "#111827" },
];

export const tierFor = (score) =>
  [...PLATE_TIERS].reverse().find((t) => score >= t.min) || PLATE_TIERS[0];

// ── The batteries ────────────────────────────────────────────────────────────
//
// `how` tells the runner which tracker to hand the event to:
//   reps   -> ARTP camera tracker, capped by `seconds` when present
//   hold   -> a timer counting UP; the user taps when they drop
//   run    -> a stopwatch; the user runs a route they measured and taps at the end
//   steps  -> the native step counter over a fixed window
//
// The run is a stopwatch rather than a measured distance on purpose. The app
// converts steps to miles with steps/2100, which is a WALKING stride — running
// is nearer 1500-1700 steps/mile, so a step-measured run reads 25-35% long.
// "Run your measured 1.5 miles and tap when you're back" is exact and needs no
// new technology.

export const BATTERIES = {
  military: {
    key: "military",
    name: "Navy PRT",
    group: "military",
    branch: "navy",
    blurb: "The real Navy Physical Readiness Test, scored against the published standards for your age and sex.",
    icon: "shield",
    accent: "#4ade80",
    scoring: "standards",
    needsProfile: true,          // age + sex required before it can score
    disclaimer:
      "Standards verified against Navy PRT Guide 5A (Dec 2025), Table 4-1, for altitudes below " +
      "5,000 ft. Accurate enough to train against — not a substitute for an official screening, " +
      "which must be run by a qualified Command Fitness Leader.",
    // Guide 5A §1.3: push-ups, forearm plank, then cardio, all on the same day,
    // with AT LEAST 5 and no more than 15 minutes between modalities. The rests
    // below are the official floor — they were 2 minutes before I read the guide,
    // which would have made this a harder test than the real one.
    events: [
      { key: "pushups", name: "Push-ups", exercise: "Push-Up", how: "reps", seconds: 120,
        unit: "reps", cue: "As many as you can in 2 minutes. Full lockout at the top.", restAfter: 300 },
      { key: "plank", name: "Forearm Plank", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold as long as you can. Tap STOP the moment your hips drop.", restAfter: 300 },
      { key: "run15", name: "1.5-Mile Run", how: "run", distanceLabel: "1.5 miles",
        unit: "secs", cue: "Run your measured 1.5-mile route. Tap STOP when you finish.", restAfter: 0 },
    ],
  },

  // The AFT needs a hex bar, a 90-lb sled, two 40-lb kettlebells and a 25m lane.
  // The app can't see any of that, so the deadlift and the sprint-drag-carry are
  // entered by hand after you do them. That was the explicit call: keep the real
  // Army standard rather than substitute a camera-friendly event and call it AFT.
  army_aft: {
    key: "army_aft",
    name: "Army AFT",
    group: "military",
    branch: "army",
    blurb: "The Army Fitness Test as it stands today — five events, scored against the published tables for your age and sex.",
    icon: "shield",
    accent: "#84cc16",
    scoring: "aft",
    needsProfile: true,
    hasCombatStandard: true,
    disclaimer:
      "Tables verified against HQDA EXORD 218-25 Annex B, the official AFT score tables " +
      "(effective 1 June 2025). Mid-range point totals are interpolated and land within a few " +
      "points of the published row; the pass/fail verdict is exact. Two events need a hex bar " +
      "and a sled, so you enter those results yourself.",
    events: [
      { key: "deadlift", name: "3-Rep Max Deadlift", how: "entry", entryKind: "weight",
        unit: "lbs", cue: "Three reps at the heaviest weight you can hold form on. Enter the weight.",
        equipment: "60-lb hex bar + plates", restAfter: 120 },
      { key: "hrp", name: "Hand-Release Push-ups", exercise: "Push-Up", how: "reps", seconds: 120,
        unit: "reps", cue: "2 minutes. Chest to the deck, hands off the ground, then press.",
        note: "The camera counts the press. It can't see the hand release, so keep yourself honest.",
        restAfter: 120 },
      { key: "sdc", name: "Sprint-Drag-Carry", how: "entry", entryKind: "time",
        unit: "secs", cue: "Five 50m shuttles: sprint, drag, lateral, carry, sprint. Enter your time.",
        equipment: "90-lb sled + two 40-lb kettlebells + 25m lane", restAfter: 120 },
      { key: "plank", name: "Plank", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold. Tap STOP the moment your hips drop or rise.", restAfter: 120 },
      { key: "run2", name: "Two-Mile Run", how: "run", distanceLabel: "2 miles",
        unit: "secs", cue: "Run your measured two-mile route. Tap STOP when you finish.", restAfter: 0 },
    ],
  },

  // Air Force Special Warfare Tier 2 Operational Fitness Test — the gate for
  // CCT, PJ, SR, TACP, STO, CRO and TACPO, used at several points in the
  // pipeline. It replaces the Tier 1 Air Force test for operators.
  //
  // Nine scores from eight events (pro agility is run and scored both
  // directions). None of them can be camera-tracked: this test is a rucksack, a
  // pull-up bar, kettlebells, a measured lane and a pool. So every event is
  // hand-entered, and the app's job here is to be an accurate scoresheet and a
  // history, not a tracker.
  //
  // UNSCORED on purpose: the official scoring chart is an image on the source
  // page and its numbers are not in hand. The composite pass mark is 77 and any
  // event below its own minimum is a failure regardless of composite — both
  // facts are in the disclaimer, neither can be checked without the chart. So
  // this scores against your own last attempt until the chart arrives.
  afspecwar: {
    key: "afspecwar",
    name: "AF Special Warfare — Tier 2 OFT",
    group: "military",
    branch: "specops",
    standardsPending: true,
    blurb: "The Tier 2 Operational Fitness Test. Nine scores, run in order, in combat uniform and boots.",
    icon: "shield",
    accent: "#a78bfa",
    scoring: "baseline",
    needsProfile: false,
    disclaimer:
      "Events, order, rest periods and equipment are the published Tier 2 OFT. The official " +
      "scoring chart is not loaded yet, so this records your numbers and compares them to your " +
      "last attempt — it does not tell you whether you passed. For reference, the minimum " +
      "passing composite is 77, and any event below its own minimum fails that event outright.",
    uniform: "Combat top and bottom with boots. Swim is combat uniform with booties, fins and mask; snorkel optional.",
    events: [
      { key: "ruck3", name: "3-Mile Ruck March", how: "entry", entryKind: "time",
        unit: "secs", cue: "Level course, ruck over 60 lb dry weight. Running is not permitted.",
        equipment: "Ruck, >60 lb dry", restAfter: 1200 },
      { key: "longjump", name: "Standing Long Jump", how: "entry", entryKind: "distance",
        unit: "in", cue: "Toes behind the line. Three trials — enter your best. Measured to the heel nearest the line.",
        restAfter: 180 },
      // unit "sec10" = seconds to a tenth. A pro-agility run is ~4-5 seconds and
      // the tenth is the whole result, so these must not be stored as mm:ss.
      { key: "agility_r", name: "Pro Agility — Right First", how: "entry", entryKind: "seconds",
        unit: "sec10", cue: "5-10-5 from a 3-point stance, breaking right. Two trials allowed; enter the best.",
        equipment: "3 cones at 5-yard intervals", restAfter: 180 },
      { key: "agility_l", name: "Pro Agility — Left First", how: "entry", entryKind: "seconds",
        unit: "sec10", cue: "Same course, breaking left. Scored separately from the right-first run.",
        restAfter: 180 },
      { key: "trapbar", name: "Trap Bar Deadlift 3RM", how: "entry", entryKind: "weight",
        unit: "lbs", cue: "Hex bar, grip at mid-shin, slight pause at the top, bar touches the floor between reps.",
        equipment: "Hex/trap bar + plates", restAfter: 180 },
      { key: "pullups", name: "Pull-ups", how: "entry", entryKind: "reps",
        unit: "reps", cue: "Dead hang, palms away, chin over the bar. Letting go ends the event.",
        equipment: "Pull-up bar", restAfter: 180 },
      { key: "farmers", name: "Farmer's Carry — 100 yd", how: "entry", entryKind: "seconds",
        unit: "sec10", cue: "Two 53-lb kettlebells by the handle, not cradled. Sprint the 100 yards.",
        equipment: "Two 53-lb kettlebells", restAfter: 180 },
      { key: "shuttle300", name: "300-yd Shuttle Run", how: "entry", entryKind: "seconds",
        unit: "sec10", cue: "Six round trips on a 25-yard course. Run it twice with 5 minutes between — enter the average.",
        restAfter: 1200 },
      { key: "finswim", name: "1500m Fin Swim", how: "entry", entryKind: "time",
        unit: "secs", cue: "Side stroke, combat side stroke or lead-arm trail-arm. 30 laps in a 25m pool.",
        equipment: "Fins, mask, booties; snorkel optional", restAfter: 0 },
    ],
  },

  // ── Unlocked for training and benchmarking, scored only against yourself ──
  // The three below have event lists we can state with confidence but scoring
  // tables we have NOT read from the governing document. They run, they record,
  // they show your delta since last time. They do not say pass or fail, and
  // `standardsPending` makes the UI say so on the card and on the result.
  //
  // That is the whole difference between these and the Navy/Army tests. It is a
  // gap in what we hold, not a restriction on who can run them.

  seal_pst: {
    key: "seal_pst",
    name: "Navy SEAL / SWCC PST",
    group: "military",
    branch: "specops",
    blurb: "The Physical Screening Test for SEAL, SWCC, EOD, diver and rescue swimmer. One continuous event, scored against the published minimums.",
    icon: "shield",
    accent: "#f59e0b",
    scoring: "pst",
    needsProfile: false,
    needsProgram: true,      // which pipeline — there are no age or sex bands
    disclaimer:
      "Minimums from MILPERSMAN 1220-410. The PST has no age bands and no sex norming — one " +
      "standard per pipeline. These are the MINIMUMS to receive a contract and stay eligible, " +
      "not competitive scores: clearing them is the floor, not the bar. The rest periods below " +
      "are part of the test, and the whole thing is run as a single event.",
    events: [
      { key: "swim500", name: "500-Yard Swim", how: "entry", entryKind: "time",
        unit: "secs", cue: "Side stroke or breaststroke. Enter your time.",
        equipment: "Pool", restAfter: 600 },
      { key: "pushups", name: "Push-ups", exercise: "Push-Up", how: "reps", seconds: 120,
        unit: "reps", cue: "Maximum in 2 minutes. Full lockout at the top.", restAfter: 120 },
      // MILPERSMAN calls these curl-ups, not sit-ups. Using the document's word
      // matters when someone is comparing the app against the real scoresheet.
      // Tap-counted: the pose model was never reliable on this movement.
      { key: "curlups", name: "Curl-ups", how: "manual", seconds: 120,
        unit: "reps", cue: "Maximum in 2 minutes. Tap for each rep — the camera can't count these.", restAfter: 120 },
      { key: "pullups", name: "Pull-ups", how: "entry", entryKind: "reps",
        unit: "reps", cue: "Maximum, no time limit. Dead hang. Enter your total.",
        equipment: "Pull-up bar", restAfter: 600 },
      { key: "run15", name: "1.5-Mile Run", how: "run", distanceLabel: "1.5 miles",
        unit: "secs", cue: "Run your measured 1.5-mile route. Tap STOP when you finish.", restAfter: 0 },
    ],
  },

  af_pfra: {
    key: "af_pfra",
    name: "Air Force PFRA",
    group: "military",
    branch: "airforce",
    standardsPending: true,
    blurb: "The Physical Fitness Readiness Assessment — the Air Force test as restructured for 2026.",
    icon: "shield",
    accent: "#60a5fa",
    scoring: "baseline",
    needsProfile: false,
    // Component weights confirmed from the Air Force's own September 2025
    // release: cardio 50, waist-to-height 20, strength 15, core 15, out of 100.
    // Nine age bands (<25 through 60+). The weights are known; the per-band
    // numbers behind them are not, which is why this is still record-only.
    disclaimer:
      "The Air Force renamed and rebuilt this test: it is no longer the PFA, and the 1.5-mile " +
      "run is gone. The official score is out of 100 — cardio 50, waist-to-height 20, strength " +
      "15, core 15 — across nine age bands. Approved alternates exist (HAMR shuttle, 2km walk, " +
      "standard push-ups, sit-ups, cross-leg reverse crunches) and are not yet offered. " +
      "Waist-to-height is a tape measurement rather than a fitness event, so it is not measured " +
      "here. The per-band scoring charts are not loaded, so results are recorded and compared to " +
      "your last attempt only.",
    events: [
      { key: "hrp", name: "Hand-Release Push-ups", exercise: "Push-Up", how: "reps", seconds: 120,
        unit: "reps", cue: "2 minutes. Chest down, hands off the deck, then press.", restAfter: 180 },
      { key: "plank", name: "Forearm Plank", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold. Tap STOP the moment your hips drop.", restAfter: 180 },
      { key: "run2", name: "Two-Mile Run", how: "run", distanceLabel: "2 miles",
        unit: "secs", cue: "Run your measured two-mile route. Tap STOP when you finish.", restAfter: 0 },
    ],
  },

  usmc_pft: {
    key: "usmc_pft",
    name: "Marine Corps PFT",
    group: "military",
    branch: "marines",
    standardsPending: true,
    blurb: "The Marine Corps Physical Fitness Test — pull-ups, plank, three-mile run.",
    icon: "shield",
    accent: "#dc2626",
    scoring: "baseline",
    needsProfile: false,
    disclaimer:
      "Events are the PFT as set by MCO 6100.13A. Push-ups may be substituted for pull-ups but " +
      "cap your score, so pull-ups are what's offered here. Scoring tables and the 1st/2nd/3rd " +
      "class breakpoints are not loaded, so this records your numbers rather than classing you. " +
      "Note that from 1 Jan 2026 combat-arms Marines are scored on the male-normed table " +
      "regardless of sex, minimum 210 of 300.",
    events: [
      { key: "pullups", name: "Pull-ups", how: "entry", entryKind: "reps",
        unit: "reps", cue: "Dead hang, chin over the bar. Enter your total.",
        equipment: "Pull-up bar", restAfter: 300 },
      { key: "plank", name: "Plank", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold. Tap STOP the moment your form breaks.", restAfter: 300 },
      { key: "run3", name: "Three-Mile Run", how: "run", distanceLabel: "3 miles",
        unit: "secs", cue: "Run your measured three-mile route. Tap STOP when you finish.", restAfter: 0 },
    ],
  },

  repsandsteps: {
    key: "repsandsteps",
    name: "RepsAndSteps Output",
    group: "repsandsteps",
    blurb: "Our own test. Not a pass/fail — it produces one number, your output score, from reps, steps and time under load.",
    icon: "zap",
    accent: "#00a9ff",
    scoring: "line",
    needsProfile: false,
    disclaimer: null,
    // Deliberately mixes the three terms The Line is built from — reps, steps
    // and active minutes — because the score is meaningless if a battery only
    // feeds one of them.
    events: [
      { key: "pushups", name: "Push-ups", exercise: "Push-Up", how: "reps", seconds: 90,
        unit: "reps", cue: "90 seconds. Quality counts — shallow reps are tracked separately.", restAfter: 60 },
      { key: "squats", name: "Air Squats", exercise: "Squat", how: "reps", seconds: 90,
        unit: "reps", cue: "90 seconds. Hip crease below the knee for the rep to count.", restAfter: 60 },
      { key: "lunges", name: "Reverse Lunges", exercise: "Reverse Lunge", how: "reps", seconds: 60,
        unit: "reps", cue: "60 seconds, alternating. Left and right each count.", restAfter: 60 },
      { key: "plank", name: "Plank Hold", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold as long as you can — this is your time under load.", restAfter: 60 },
      { key: "steps", name: "Step Burst", how: "steps", seconds: 180,
        unit: "steps", cue: "3 minutes. Walk, jog or run — every step counts toward your score.", restAfter: 0 },
    ],
  },

  strength: {
    key: "strength",
    name: "Strength Endurance",
    group: "custom",
    blurb: "Bodyweight max-effort. Scored against your own last test, not a population average.",
    icon: "dumbbell",
    accent: "#f97316",
    scoring: "baseline",
    needsProfile: false,
    // Named "strength endurance", not "strength": with no load this measures how
    // long you can keep going, not how much you can move. A lifter will notice.
    disclaimer: "Bodyweight only, so this measures strength ENDURANCE rather than maximal strength.",
    events: [
      { key: "pushups", name: "Push-ups to failure", exercise: "Push-Up", how: "reps",
        unit: "reps", cue: "No time limit. Go until you cannot complete another rep.", restAfter: 120 },
      { key: "squats", name: "Air Squats", exercise: "Squat", how: "reps", seconds: 120,
        unit: "reps", cue: "2 minutes, full depth.", restAfter: 120 },
      { key: "lunges", name: "Reverse Lunges", exercise: "Reverse Lunge", how: "reps", seconds: 90,
        unit: "reps", cue: "90 seconds, alternating legs.", restAfter: 120 },
      { key: "wallsit", name: "Wall Sit", exercise: "Wall Sit", how: "hold",
        unit: "secs", cue: "Thighs parallel, back flat. Hold.", restAfter: 120 },
      { key: "plank", name: "Plank", exercise: "Plank", how: "hold",
        unit: "secs", cue: "Hold as long as you can.", restAfter: 0 },
    ],
  },

  conditioning: {
    key: "conditioning",
    name: "Conditioning",
    group: "custom",
    blurb: "Work capacity under fatigue. Scored against your own last test.",
    icon: "flame",
    accent: "#ef4444",
    scoring: "baseline",
    needsProfile: false,
    disclaimer: null,
    events: [
      { key: "jumpsquats", name: "Jump Squats", exercise: "Jump Squat", how: "reps", seconds: 120,
        unit: "reps", cue: "2 minutes. Land soft.", restAfter: 120 },
      { key: "highknees", name: "High Knees", exercise: "High Knee", how: "reps", seconds: 60,
        unit: "reps", cue: "60 seconds. Knees to hip height.", restAfter: 120 },
      // Burpees can't be pose-counted — the model was never reliable on them, so
      // this one is tapped. Kept anyway: without it the battery has no full-body
      // event at all.
      { key: "burpees", name: "Burpees", how: "manual", seconds: 120,
        unit: "reps", cue: "2 minutes. Tap the screen for each rep — the camera can't count these.", restAfter: 180 },
      // unit "mi100" = hundredths of a mile. The Cooper run is the one event
      // whose VALUE is a distance even though the event is timed — the clock is
      // fixed at 12 minutes and the result is how far you got. It was labelled
      // "secs", which made it a time-that-isn't: the results row needed a
      // special case to render it, and anything summing seconds would have
      // counted 1.42 miles as 142 seconds of work.
      { key: "cooper", name: "Cooper Run", how: "run", distanceLabel: "12 minutes",
        unit: "mi100", cue: "Run as far as you can in 12 minutes, then enter the distance.",
        fixedSeconds: 720, restAfter: 0 },
    ],
  },
};

export const BATTERY_LIST = Object.values(BATTERIES);

/** Total wall-clock estimate for a battery, in minutes. */
export function batteryMinutes(battery) {
  const secs = battery.events.reduce((t, e) => {
    const work = e.fixedSeconds ?? e.seconds ?? 90;   // 90s assumed for untimed holds
    return t + work + (e.restAfter || 0);
  }, 0);
  return Math.max(1, Math.round(secs / 60));
}

/**
 * Events measured in seconds where FASTER is better. A hold measured in seconds
 * is the opposite, so this can't be inferred from the unit — it has to be a
 * list, and anything timed added later has to be added here too.
 */
export const LOWER_IS_BETTER = new Set([
  "run15", "run2", "run3", "sdc",                          // Navy, Army, Air Force, Marines
  "swim500",                                               // SEAL PST
  "ruck3", "agility_r", "agility_l", "farmers", "shuttle300", "finswim", // AFSPECWAR
]);

/** Per-event delta against the previous test of the same battery. */
export function compareToPrevious(events, previous) {
  if (!previous?.events?.length) return null;
  const prev = Object.fromEntries(previous.events.map((e) => [e.key, e.value]));
  return events.map((e) => {
    const before = prev[e.key];
    if (before == null) return { ...e, delta: null };
    // Timed events where a smaller number is a better result. Everything else
    // (reps, held seconds, steps, pounds) improves upward.
    const lowerIsBetter = LOWER_IS_BETTER.has(e.key);
    const diff = e.value - before;
    return {
      ...e,
      delta: diff,
      improved: lowerIsBetter ? diff < 0 : diff > 0,
      before,
    };
  });
}

// ── The three kinds of test ──────────────────────────────────────────────────
// These are the groups the Home card and the sidebar page are organised by.
// The split is by WHAT YOU ARE SCORED AGAINST, which is the only difference
// that changes how you should read a result:
//   military     -> an external, published standard (someone else's bar)
//   repsandsteps -> our own output number (no pass/fail, a score that moves)
//   custom       -> yourself, last time (every event is a personal delta)
export const TEST_GROUPS = [
  {
    key: "military",
    label: "MILITARY",
    sub: "Every branch, plus spec ops screening",
    detail: "The services' own tests. Scored against published standards where we hold the tables, recorded as a scoresheet where we don't.",
    accent: "#4ade80",
    icon: "shield",
  },
  {
    // Was "PRIVATE" for one build. That was a placeholder word that never
    // explained itself — this is the RepsAndSteps test, so it says so.
    key: "repsandsteps",
    label: "REPS AND STEPS",
    sub: "Our own test",
    detail: "No pass/fail - it produces one output number you can chase.",
    accent: "#00a9ff",
    icon: "zap",
  },
  {
    key: "custom",
    label: "CUSTOM",
    sub: "Your events, your baseline",
    detail: "Preset or hand-picked events, scored against your own last result rather than a population average.",
    accent: "#f97316",
    icon: "sliders",
  },
];

export const batteriesInGroup = (group) =>
  BATTERY_LIST.filter((b) => b.group === group);

// MILITARY opens into branches, and each branch opens into its tests. Two taps
// to a specific service test, and the list stays short at every level.
//
// Spec ops is its own branch rather than living under Navy and Air Force,
// because a selection screening test answers a different question from a test
// of record: "would I be competitive" rather than "am I within standard".
export const MILITARY_BRANCHES = [
  { key: "navy",     label: "NAVY",            sub: "Physical Readiness Test",      accent: "#4ade80" },
  { key: "army",     label: "ARMY",            sub: "Army Fitness Test",            accent: "#84cc16" },
  { key: "airforce", label: "AIR FORCE",       sub: "Physical Fitness Readiness Assessment", accent: "#60a5fa" },
  { key: "marines",  label: "MARINE CORPS",    sub: "Physical Fitness Test",        accent: "#dc2626" },
  { key: "specops",  label: "SPECIAL OPERATIONS", sub: "Selection and qualification", accent: "#f59e0b" },
];

export const batteriesInBranch = (branch) =>
  BATTERY_LIST.filter((b) => b.group === "military" && b.branch === branch);

// ── Build-your-own ───────────────────────────────────────────────────────────
// Every event any preset battery uses, de-duplicated, offered as a pool. The
// definitions are copied rather than referenced so a custom pick can carry its
// own time cap without mutating the preset it came from.
export const CUSTOM_EVENT_POOL = [
  { key: "pushups", name: "Push-ups", exercise: "Push-Up", how: "reps", seconds: 120,
    unit: "reps", cue: "Full lockout at the top.", restAfter: 120 },
  { key: "squats", name: "Air Squats", exercise: "Squat", how: "reps", seconds: 120,
    unit: "reps", cue: "Hip crease below the knee for the rep to count.", restAfter: 120 },
  { key: "lunges", name: "Reverse Lunges", exercise: "Reverse Lunge", how: "reps", seconds: 90,
    unit: "reps", cue: "Alternating. Left and right each count.", restAfter: 120 },
  { key: "jumpsquats", name: "Jump Squats", exercise: "Jump Squat", how: "reps", seconds: 90,
    unit: "reps", cue: "Land soft.", restAfter: 120 },
  { key: "highknees", name: "High Knees", exercise: "High Knee", how: "reps", seconds: 60,
    unit: "reps", cue: "Knees to hip height.", restAfter: 120 },
  { key: "plank", name: "Plank Hold", exercise: "Plank", how: "hold",
    unit: "secs", cue: "Hold as long as you can. Tap STOP when your hips drop.", restAfter: 120 },
  { key: "wallsit", name: "Wall Sit", exercise: "Wall Sit", how: "hold",
    unit: "secs", cue: "Thighs parallel, back flat. Hold.", restAfter: 120 },
  { key: "burpees", name: "Burpees", how: "manual", seconds: 120,
    unit: "reps", cue: "Tap the screen for each rep - the camera can't count these.", restAfter: 120 },
  { key: "steps", name: "Step Burst", how: "steps", seconds: 180,
    unit: "steps", cue: "Walk, jog or run - every step counts.", restAfter: 120 },
  { key: "run15", name: "1.5-Mile Run", how: "run", distanceLabel: "1.5 miles",
    unit: "secs", cue: "Run your measured 1.5-mile route. Tap STOP when you finish.", restAfter: 0 },
  { key: "cooper", name: "Cooper Run (12 min)", how: "run", distanceLabel: "12 minutes",
    unit: "secs", cue: "Run as far as you can in 12 minutes, then enter the distance.",
    fixedSeconds: 720, restAfter: 0 },
];

/**
 * A battery assembled from the pool.
 *
 * The key is the constant string "custom" on purpose. Baseline scoring looks up
 * your previous test BY BATTERY KEY and then matches events individually, so a
 * fixed key means "last time I did a custom test" still finds a comparison even
 * if the event list changed; events you didn't do last time simply show no
 * delta instead of hiding the whole history.
 *
 * The last event's rest is zeroed - resting after the final effort of a test is
 * just a timer running on a finished test.
 */
export function buildCustomBattery(eventKeys) {
  const picked = CUSTOM_EVENT_POOL
    .filter((e) => eventKeys.includes(e.key))
    .map((e, i, arr) => ({ ...e, restAfter: i === arr.length - 1 ? 0 : e.restAfter }));
  return {
    key: "custom",
    name: "Custom Test",
    group: "custom",
    blurb: `${picked.length} event${picked.length === 1 ? "" : "s"} you picked. Scored against your own last custom test.`,
    icon: "sliders",
    accent: "#f97316",
    scoring: "baseline",
    needsProfile: false,
    disclaimer: null,
    custom: true,
    events: picked,
  };
}
