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

// ── Not yet scorable ─────────────────────────────────────────────────────────
// Researched 2026-10-06. Every one of these branches' official scoring
// documents refused an automated read (.mil hosts return 403 to anything that
// isn't a real browser). They are listed in the app so the roadmap is visible,
// and they are NOT runnable, because a test with no standard behind it is a
// stopwatch with a service badge on it.
export const PENDING = [
  {
    key: "air_force", subgroup: "service", name: "Air Force PFRA", accent: "#60a5fa",
    // Worth knowing: the Air Force test is no longer the "PFA". It was renamed
    // the Physical Fitness Readiness Assessment and restructured — the
    // 1.5-mile run is gone, replaced by a 2-mile run or the HAMR shuttle.
    why: "Renamed and restructured in 2026 — new scoring charts not yet read.",
    events: "2-mile run or HAMR · hand-release or standard push-ups · sit-ups, reverse crunches or plank · waist-to-height",
    doc: "AFPC PFRA Scoring Charts + SAF/MR memo signed 26 Feb 2026",
  },
  {
    key: "marines", subgroup: "service", name: "Marine Corps PFT / CFT", accent: "#dc2626",
    why: "MCO 6100.13A tables unread. Combat-arms Marines moved to the male-normed table on 1 Jan 2026 (MARADMIN 613/25).",
    events: "Pull-ups or push-ups · plank · 3-mile run — plus the CFT",
    doc: "MCO 6100.13A w/ Ch 1",
  },
  {
    key: "seal_pst", subgroup: "specops", name: "Navy SEAL / SWCC PST", accent: "#f59e0b",
    // The one the request named directly. The governing document is known and
    // names the events; its minimum-score table is what's missing.
    why: "MILPERSMAN 1220-410 holds the official minimums and would not open. It covers SEAL, SWCC, EOD, diver and rescue swimmer.",
    events: "500-yard swim · push-ups · sit-ups · pull-ups · 1.5-mile run, run as one continuous event",
    doc: "MILPERSMAN 1220-410",
  },
  {
    key: "marsoc", subgroup: "specops", name: "MARSOC A&S", accent: "#fb7185",
    why: "No published standard read yet; MARSOC's candidate letter is the likely source.",
    events: "Assessment & Selection screening",
    doc: "MARSOC Letter to the Candidate",
  },
];
