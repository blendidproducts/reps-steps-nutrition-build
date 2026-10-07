/**
 * militaryStandards.js — scoring tables for the service fitness tests.
 *
 * Navy PRT lives in fitnessTests.js (it was first). Everything else lands here,
 * because a scoring table per branch is a lot of data and fitnessTests.js is
 * already carrying the batteries, The Line and the custom builder.
 *
 * ── The rule this file follows ──────────────────────────────────────────────
 * A number is only in here if it came from a document. Where a branch's table
 * could not be read, the branch is listed in PENDING with the reason and the
 * document to read, and it ships UNSCORED rather than estimated. An app that
 * tells someone they failed a standard that was never theirs is worse than an
 * app that says "not scored yet".
 */

/** Times are stored as seconds everywhere. mm:ss is a display concern. */
const t = (mins, secs) => mins * 60 + secs;

// ── Army Fitness Test (AFT) ──────────────────────────────────────────────────
// Source: "Army Fitness Test Score Tables", HQDA EXORD 218-25 Annex B.
// Approved 1 May 2025, effective 1 June 2025.
// The AFT replaced the ACFT on 1 June 2025; the standing power throw was dropped.
//
// VERIFIED 2026-10-06 against the primary document (Annex B, read page by page).
// All five events, 10 age bands, both columns, both anchors — every value below
// matches the published table exactly.
//
// The four cells previously flagged as suspect were ALL CORRECT, including the
// three that looked like transcription errors:
//   - male deadlift 100-pt really does drop to 250 lb at 57-61
//   - female push-up 100-pt really does drop to 24 reps at 57-61 and over 62
//   - female sprint-drag-carry 60-pt really is 4:03 and 4:48, past the 4:00 cap
//     the public AFT page states — the table is the authority here
// The one genuine disagreement was a SECONDARY table claiming 24:00 for the male
// 2-mile run at 52-56; the official annex says 22:50, which is what we use.
//
// Remaining approximation, by choice: the official table scores every point from
// 0 to 100 as its own row. We store the 60 and 100 anchors and interpolate, so a
// mid-range point total is close rather than exact. The pass/fail verdict is
// exact, and that is the thing anyone acts on.
export const AFT_BANDS = [
  "17-21", "22-26", "27-31", "32-36", "37-41",
  "42-46", "47-51", "52-56", "57-61", "62+",
];

export function aftBand(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < 17) return null;   // no table: refuse to guess
  if (a <= 21) return "17-21";
  if (a <= 26) return "22-26";
  if (a <= 31) return "27-31";
  if (a <= 36) return "32-36";
  if (a <= 41) return "37-41";
  if (a <= 46) return "42-46";
  if (a <= 51) return "47-51";
  if (a <= 56) return "52-56";
  if (a <= 61) return "57-61";
  return "62+";
}

// Each cell is [value for 60 points, value for 100 points], in band order.
// `lowerIsBetter` events (sdc, run2) have the SLOWEST passing time first.
export const AFT = {
  deadlift: {
    name: "3-Rep Max Deadlift", unit: "lbs", lowerIsBetter: false,
    male:   [[150,340],[150,350],[150,350],[140,350],[140,350],[140,350],[140,340],[140,330],[140,250],[140,230]],
    female: [[120,220],[120,230],[120,240],[120,230],[120,220],[120,210],[120,200],[120,190],[120,170],[120,170]],
  },
  hrp: {
    name: "Hand-Release Push-ups", unit: "reps", lowerIsBetter: false,
    male:   [[15,58],[14,61],[14,62],[13,60],[12,59],[11,57],[11,55],[10,51],[10,46],[10,43]],
    female: [[11,53],[11,50],[11,48],[11,47],[10,43],[10,40],[10,38],[10,36],[10,24],[10,24]],
  },
};

AFT.sdc = {
  name: "Sprint-Drag-Carry", unit: "secs", lowerIsBetter: true,
  male: [
    [t(2,28), t(1,29)], [t(2,31), t(1,30)], [t(2,32), t(1,30)], [t(2,36), t(1,33)],
    [t(2,41), t(1,36)], [t(2,45), t(1,40)], [t(2,53), t(1,45)], [t(3,0), t(1,52)],
    [t(3,12), t(1,58)], [t(3,16), t(2,9)],
  ],
  female: [
    [t(3,15), t(1,55)], [t(3,15), t(1,55)], [t(3,15), t(1,55)], [t(3,22), t(1,59)],
    [t(3,27), t(2,2)], [t(3,42), t(2,9)], [t(3,51), t(2,11)], [t(4,3), t(2,18)],
    [t(4,48), t(2,26)], [t(4,48), t(2,26)],
  ],
};

// The plank table is identical for both sexes in the published scales.
AFT.plank = {
  name: "Plank", unit: "secs", lowerIsBetter: false,
  male: [
    [t(1,30), t(3,40)], [t(1,25), t(3,35)], [t(1,20), t(3,30)], [t(1,15), t(3,25)],
    [t(1,10), t(3,20)], [t(1,10), t(3,20)], [t(1,10), t(3,20)], [t(1,10), t(3,20)],
    [t(1,10), t(3,20)], [t(1,10), t(3,20)],
  ],
};
AFT.plank.female = AFT.plank.male;

AFT.run2 = {
  name: "Two-Mile Run", unit: "secs", lowerIsBetter: true,
  male: [
    [t(19,57), t(13,22)], [t(19,45), t(13,25)], [t(19,45), t(13,25)], [t(20,44), t(13,42)],
    [t(20,44), t(13,42)], [t(22,4), t(14,5)], [t(22,4), t(14,30)], [t(22,50), t(15,9)],
    [t(23,36), t(15,28)], [t(23,36), t(15,28)],
  ],
  female: [
    [t(22,55), t(16,0)], [t(22,45), t(15,30)], [t(22,45), t(15,30)], [t(22,50), t(15,48)],
    [t(22,59), t(15,51)], [t(23,15), t(16,0)], [t(23,30), t(16,30)], [t(24,0), t(16,59)],
    [t(24,48), t(17,18)], [t(25,0), t(17,18)],
  ],
};

/**
 * Cells that LOOK like transcription errors but are what the official table
 * says. Kept as a list because the next person to read this file will have the
 * same doubt, and re-checking a verified number costs more than a comment does.
 */
export const AFT_CONFIRMED_ODD = [
  "Male deadlift 100-pt drops to 250 lb at 57-61 (350 at 42-46) — correct",
  "Female push-up 100-pt drops to 24 reps at 57-61 and over 62 (36 at 52-56) — correct",
  "Female sprint-drag-carry 60-pt is 4:03 and 4:48, past the 4:00 cap the public page states — the table wins",
];

/**
 * Score one AFT event. 60 points is the pass mark, 100 the ceiling.
 *
 * Between 60 and 100 this interpolates linearly, which the real table does NOT
 * do — the Army publishes every point from 0 to 100 as its own row. So a middle
 * score here is an approximation and the pass/fail verdict is exact. That's the
 * right way round: the verdict is what matters and the points are colour.
 *
 * `combat` scores on the male-normed column whatever the sex, which is how the
 * sex-neutral combat-arms standard works.
 */
export function scoreAftEvent(eventKey, value, sex, age, combat = false) {
  const ev = AFT[eventKey];
  const band = aftBand(age);
  const col = combat ? "male" : sex;
  if (!ev || !band || !ev[col] || !Number.isFinite(Number(value))) return null;

  const [pass, max] = ev[col][AFT_BANDS.indexOf(band)];
  const v = Number(value);
  const lower = ev.lowerIsBetter;

  // Normalise so bigger is always better, then map pass->60, max->100.
  const span = lower ? pass - max : max - pass;
  const over = lower ? pass - v : v - pass;
  let points;
  if (span <= 0) points = v === pass ? 60 : 0;
  else points = 60 + (over / span) * 40;

  points = Math.max(0, Math.min(100, Math.round(points)));
  return { points, pass: points >= 60, passValue: pass, maxValue: max, unit: ev.unit, band, lowerIsBetter: lower };
}

/**
 * Whole-AFT verdict.
 *
 * Two standards, and which one applies is the soldier's job to say, not ours:
 *   general (combat-enabling) — 60 points minimum on every event
 *   combat arms              — 60 minimum on every event AND 350 total,
 *                              scored on the male-normed column
 * The combat standard took effect 1 Jan 2026 for the Regular Army and AGR, and
 * 1 Jun 2026 for the Reserve and National Guard.
 */
export function scoreAftTest(events, sex, age, combat = false) {
  const scored = events.map((e) => ({
    key: e.key,
    result: scoreAftEvent(e.key, e.value, sex, age, combat),
  }));
  if (scored.some((s) => !s.result)) return { scored, overall: null };

  const total = scored.reduce((sum, s) => sum + s.result.points, 0);
  const everyEventPassed = scored.every((s) => s.result.pass);
  const totalNeeded = combat ? 350 : 300;
  const passed = everyEventPassed && total >= totalNeeded;

  return {
    scored,
    total,
    totalNeeded,
    everyEventPassed,
    passed,
    combat,
    overall: {
      label: passed ? "PASS" : "FAIL",
      color: passed ? "#4ade80" : "#ef4444",
      detail: !everyEventPassed
        ? "Below 60 points on at least one event"
        : total < totalNeeded
          ? `${total} of ${totalNeeded} points required`
          : `${total} points`,
    },
  };
}

// ── Still not buildable ──────────────────────────────────────────────────────
// Empty, and worth keeping empty rather than deleting: this is where a branch
// goes when we can't even state its event list, and the UI already knows how to
// render that case honestly. Nothing is in it today.
//
// MARSOC was the last entry. It came out when the A&S page and MARSOC's own
// preparation program gave us the event list — not a scoring table, which
// MARSOC does not publish, but the published prerequisite GATES, which is a
// different thing and is modelled as one in marsocStandards.js.
export const PENDING = [];

// ── Navy Physical Screening Test (PST) ───────────────────────────────────────
// Source: MILPERSMAN 1220-410, read 2026-10-06.
//
// The PST is structurally unlike every other test in this file. There are NO
// age bands and NO sex norming: one set of minimums per PROGRAM, and the whole
// test is run as a single continuous event with fixed rests. So the question
// the app has to ask is "which pipeline", not "how old are you".
//
// These are MINIMUMS — the floor to receive a contract and stay eligible. They
// are not competitive scores, and MILPERSMAN doesn't publish those, so the app
// must not imply that clearing a minimum makes anyone competitive.
export const PST_PROGRAMS = [
  { key: "seal",       label: "SEAL",                  sub: "Sea, Air and Land" },
  { key: "swcc",       label: "SWCC",                  sub: "Special Warfare Combatant-craft Crewmen" },
  { key: "eod",        label: "EOD",                   sub: "Explosive Ordnance Disposal" },
  { key: "diver_m2dv", label: "Navy Diver (M2DV)",     sub: "Second Class Diver" },
  { key: "diver_m1dv", label: "Navy Diver (M1DV)",     sub: "First Class Diver" },
  { key: "airr",       label: "Rescue Swimmer (AIRR)", sub: "Aviation Rescue Swimmer" },
];

export const PST_MINIMUMS = {
  seal:       { swim500: t(12,30), pushups: 50, curlups: 50, pullups: 10, run15: t(10,30) },
  swcc:       { swim500: t(13,0),  pushups: 50, curlups: 50, pullups: 6,  run15: t(12,0) },
  // EOD is scored differently and the rule is in the combined-time note below.
  eod:        { swim500: t(12,30), pushups: 50, curlups: 50, pullups: 6,  run15: t(12,30) },
  diver_m2dv: { swim500: t(12,0),  pushups: 50, curlups: 50, pullups: 6,  run15: t(11,30) },
  diver_m1dv: { swim500: t(12,30), pushups: 50, curlups: 50, pullups: 6,  run15: t(12,30) },
  airr:       { swim500: t(12,0),  pushups: 42, curlups: 50, pullups: 4,  run15: t(12,0) },
};

/**
 * EOD's cardio rule is not "beat each minimum". MILPERSMAN sets a COMBINED
 * ceiling: the 500-yard swim and the 1.5-mile run must total under 21:00, and
 * neither one on its own may exceed 12:30. So an EOD candidate can swim slower
 * than a SEAL candidate and still qualify, provided the run makes it up — and
 * can fail having cleared both individual times, if the total is 21:00 or more.
 * Scoring the two events independently would get this wrong in both directions.
 */
export const EOD_COMBINED_MAX = t(21, 0);
export const EOD_SINGLE_MAX = t(12, 30);

/** The two PST events where a smaller number is the better result. */
const LOWER_IS_BETTER_PST = new Set(["swim500", "run15"]);

/** One PST event against its program minimum. Times: lower passes. */
export function scorePstEvent(eventKey, value, program) {
  const mins = PST_MINIMUMS[program];
  if (!mins || !(eventKey in mins) || !Number.isFinite(Number(value))) return null;
  const min = mins[eventKey];
  const lower = LOWER_IS_BETTER_PST.has(eventKey);
  const v = Number(value);
  return { pass: lower ? v <= min : v >= min, minimum: min, lowerIsBetter: lower };
}

/** Whole PST verdict for one program. */
export function scorePstTest(events, program) {
  if (!PST_MINIMUMS[program]) return { scored: [], overall: null };

  const scored = events.map((e) => ({
    key: e.key,
    result: scorePstEvent(e.key, e.value, program),
  }));
  if (scored.some((s) => !s.result)) return { scored, overall: null };

  const val = (k) => Number(events.find((e) => e.key === k)?.value ?? NaN);
  let cardioPass;
  let cardioNote = null;

  if (program === "eod") {
    const combined = val("swim500") + val("run15");
    const neitherOver = val("swim500") <= EOD_SINGLE_MAX && val("run15") <= EOD_SINGLE_MAX;
    cardioPass = combined < EOD_COMBINED_MAX && neitherOver;
    cardioNote = `Swim + run combined ${Math.floor(combined / 60)}:${String(Math.round(combined % 60)).padStart(2, "0")} — must be under 21:00, neither over 12:30`;
  } else {
    cardioPass = scored
      .filter((s) => LOWER_IS_BETTER_PST.has(s.key))
      .every((s) => s.result.pass);
  }

  const strengthPass = scored
    .filter((s) => !LOWER_IS_BETTER_PST.has(s.key))
    .every((s) => s.result.pass);
  const passed = cardioPass && strengthPass;

  return {
    scored, passed, program, cardioNote,
    overall: {
      label: passed ? "MEETS MINIMUMS" : "BELOW MINIMUMS",
      color: passed ? "#4ade80" : "#ef4444",
      detail: passed
        ? "Every event at or above the published minimum"
        : "At least one event below the published minimum",
    },
  };
}

// ── AFSPECWAR Tier 2 Operational Fitness Test ────────────────────────────────
// Source: the official "AFSPECWAR OFT SCORES" chart, read 2026-10-06.
//
// Scored out of 100 across nine components, minimum composite 78. Each table is
// [points, threshold] ordered best-first, and your score is the first row you
// meet. Miss the lowest row and the component scores zero.
//
// HOW THE MINIMUMS WERE READ: the chart marks each component's minimum with a
// blue cell, and the blue runs from the top of a column down to that minimum.
// The lowest blue row per column is therefore the minimum. That reading is
// self-checking — the nine minimums sum to exactly 78, the composite the chart
// states — and the nine maxima sum to exactly 100. Both totals landing on the
// nose is why these are trusted.
//
// Note the chart says 78; the instructions page accompanying it says 77. The
// chart wins: its own arithmetic agrees with 78 and not with 77.
export const OFT_COMPOSITE_MIN = 78;
export const OFT_COMPOSITE_MAX = 100;

const oft = (unit, lowerIsBetter, minPoints, table) =>
  ({ unit, lowerIsBetter, minPoints, table });

export const OFT = {
  // The ruck is pass/fail and carries a fifth of the whole test on its own.
  ruck3:      oft("secs",  true,  20, [[20, t(49, 0)]]),
  longjump:   oft("in",    false,  8, [[10,94],[9,85],[8,76],[7,69],[6,62],[5,50],[4,42],[3,34],[2,25],[1,17]]),
  agility_r:  oft("sec10", true,   3, [[5,4.99],[4,5.24],[3,5.50],[2,5.78],[1,6.07]]),
  agility_l:  oft("sec10", true,   3, [[5,4.99],[4,5.24],[3,5.50],[2,5.78],[1,6.07]]),
  trapbar:    oft("lbs",   false,  7, [[10,360],[9,325],[8,305],[7,270],[6,240],[5,205],[4,170],[3,135],[2,105],[1,70]]),
  pullups:    oft("reps",  false,  6, [[10,16],[9,15],[8,14],[7,12],[6,10],[5,9],[4,8],[3,7],[2,5],[1,3]]),
  farmers:    oft("sec10", true,   7, [[10,21],[9,24],[8,27],[7,29],[6,33],[5,36],[4,39],[3,43],[2,48],[1,52]]),
  shuttle300: oft("sec10", true,   8, [[10,67.7],[9,71.1],[8,80.5],[7,84.5],[6,86.1],[5,90.3],[4,94.5],[3,99.8],[2,105.0],[1,110.3]]),
};

// The last component is a CHOICE, not two events: Combat Fin 1500M *or*
// Combat Run 1.5mi. Both are worth up to 20 points and both have their minimum
// at 16. Running both would double-count a fifth of the test.
OFT.finswim = oft("secs", true, 16, [
  [20, t(34,37)], [19, t(36,21)], [18, t(38,10)], [17, t(40, 4)], [16, t(42,50)],
  [15, t(44,11)], [14, t(46,23)], [13, t(48,43)], [12, t(51, 9)], [11, t(53,42)],
  [10, t(56,23)], [9, t(59,12)], [8, t(62,10)], [7, t(65,16)], [6, t(68,32)],
  [5, t(71,58)], [4, t(75,34)], [3, t(79,21)], [2, t(83,19)], [1, t(87,28)],
]);

// The run table stops at 14 points — there is no published row below 12:59, so
// a slower run scores zero rather than being extrapolated.
OFT.combatrun = oft("secs", true, 16, [
  [20, t(10,10)], [19, t(10,33)], [18, t(10,59)], [17, t(11,31)], [16, t(12,17)],
  [15, t(12,42)], [14, t(12,59)],
]);

export const OFT_CARDIO_OPTIONS = [
  { key: "finswim",   label: "Combat Fin 1500M", sub: "Fins, mask, booties — 30 laps in a 25m pool" },
  { key: "combatrun", label: "Combat Run 1.5mi", sub: "In boots and combat uniform" },
];

/** The threshold value at a component's minimum score, for display. */
export function oftMinimumValue(key) {
  const ev = OFT[key];
  if (!ev) return null;
  const row = ev.table.find(([pts]) => pts === ev.minPoints);
  return row ? row[1] : null;
}

/** Score one OFT component. Miss the lowest row and it's zero. */
export function scoreOftEvent(key, value) {
  const ev = OFT[key];
  if (!ev || !Number.isFinite(Number(value))) return null;
  const v = Number(value);
  let points = 0;
  for (const [pts, threshold] of ev.table) {
    if (ev.lowerIsBetter ? v <= threshold : v >= threshold) { points = pts; break; }
  }
  return {
    points,
    maxPoints: ev.table[0][0],
    minPoints: ev.minPoints,
    minimum: oftMinimumValue(key),
    pass: points >= ev.minPoints,
    unit: ev.unit,
    lowerIsBetter: ev.lowerIsBetter,
  };
}

/**
 * Whole OFT verdict.
 *
 * Two rules, both of which must hold, and they are not redundant:
 *   1. composite >= 78
 *   2. every component at or above its own minimum
 * Because the nine minimums sum to exactly 78, rule 1 alone would pass someone
 * who banked points on the deadlift to cover a failed swim. The chart's own
 * note — "any score below the event minimum is a failure for the event" — is
 * what rule 2 encodes.
 */
export function scoreOftTest(events) {
  const scored = events.map((e) => ({ key: e.key, result: scoreOftEvent(e.key, e.value) }));
  if (!scored.length || scored.some((s) => !s.result)) return { scored, overall: null };

  const composite = scored.reduce((sum, s) => sum + s.result.points, 0);
  const everyComponentPassed = scored.every((s) => s.result.pass);
  const failed = scored.filter((s) => !s.result.pass).map((s) => s.key);
  const passed = composite >= OFT_COMPOSITE_MIN && everyComponentPassed;

  return {
    scored,
    composite,
    everyComponentPassed,
    failedComponents: failed,
    passed,
    overall: {
      label: passed ? "PASS" : "FAIL",
      color: passed ? "#4ade80" : "#ef4444",
      detail: !everyComponentPassed
        ? `${failed.length} component${failed.length === 1 ? "" : "s"} below minimum`
        : composite < OFT_COMPOSITE_MIN
          ? `${composite} of ${OFT_COMPOSITE_MIN} needed`
          : `${composite} points`,
    },
  };
}
