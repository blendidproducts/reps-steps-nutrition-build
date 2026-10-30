/**
 * publicSafetyStandards.js — police, federal agent, firefighter, wildland,
 * lifeguard and SWAT tests. Added 2026-10-14.
 *
 * Same rule as every other standard in this app: only score against a number
 * someone official published, and say exactly where it came from. Every entry
 * below names its source and the date it was read.
 *
 * Unlike the military tables these are PASS / FAIL against minimums. Each test
 * here publishes its own pass rule ("meet the standard in each event", "45
 * minutes or less", "10 minutes 20 seconds"), so — unlike MARSOC, which
 * publishes prerequisites and withholds the pass mark — clearing every gate IS
 * a pass. `passMark: true` on a test is what allows the scorer to say so.
 *
 * The one exception is SWAT. There is no national SWAT fitness standard: each
 * team sets its own. The SWAT entry is ONE agency's published tryout, read from
 * a second-hand news report, and is labelled as exactly that.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   POLICE ACADEMY — Pennsylvania MPOETC, Cooper 30th percentile
   Source: Pennsylvania Municipal Police Officers' Education & Training
   Commission, "Physical Fitness" (Basic Training for Police Officers),
   pa.gov, read 2026-10-14. The page states the standard is the 30th percentile
   of the Cooper norms by sex and age, required in EACH event.
   ═══════════════════════════════════════════════════════════════════════════ */
export const PA_BANDS = ["18-29", "30-39", "40-49", "50-59", "60+"];

export function paBand(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < 18) return null;   // the published table starts at 18
  if (a <= 29) return "18-29";
  if (a <= 39) return "30-39";
  if (a <= 49) return "40-49";
  if (a <= 59) return "50-59";
  return "60+";
}

// Transcribed as published. Two oddities are real, not typos, and are kept:
// the female 300 m standard is 106.7 s for all three bands from 40 up, and the
// male one is 87 s for both 50-59 and 60+.
export const PA_MPOETC = {
  male: {
    situps1:   { "18-29": 35,   "30-39": 32,   "40-49": 27,   "50-59": 21,   "60+": 17 },
    sprint300: { "18-29": 62.1, "30-39": 63,   "40-49": 77,   "50-59": 87,   "60+": 87 },
    pushups1:  { "18-29": 26,   "30-39": 20,   "40-49": 15,   "50-59": 10,   "60+": 8 },
    run15:     { "18-29": 796,  "30-39": 826,  "40-49": 874,  "50-59": 958,  "60+": 1058 },
  },
  female: {
    situps1:   { "18-29": 30,   "30-39": 22,   "40-49": 17,   "50-59": 12,   "60+": 4 },
    sprint300: { "18-29": 75,   "30-39": 82,   "40-49": 106.7, "50-59": 106.7, "60+": 106.7 },
    pushups1:  { "18-29": 13,   "30-39": 9,    "40-49": 7,    "50-59": 7,    "60+": 7 },
    run15:     { "18-29": 952,  "30-39": 998,  "40-49": 1042, "50-59": 1139, "60+": 1280 },
  },
};
// run15 in seconds: 13:16=796 13:46=826 14:34=874 15:58=958 17:38=1058 /
//                   15:52=952 16:38=998 17:22=1042 18:59=1139 21:20=1280

/* ═══════════════════════════════════════════════════════════════════════════
   U.S. COAST GUARD (added 2026-10-29)
   Military, but scored here: both are published pass/fail minimums, which is
   exactly what the gate scorer does. They render under MILITARY → COAST GUARD.

   1) New member standard — GoCoastGuard.com "Eligibility Requirements", read
      2026-10-29: "All new Coast Guard members (officer and enlisted) are
      expected to perform" push-ups in one minute 29 M / 15 F, timed forearm
      plank 1:18 M / 1:09 F, timed 1.5-mile run 12:29 M / 15:05 F. By sex, no
      age bands. Swim training happens at boot camp/OCS; no number published.

   2) Boat Crew fitness test — Boat Crew Manual, Part 4 Ch. 3 Sec. D, Table 4-5
      "Physical Fitness Standards" (dcms.uscg.mil Boat_Crew_Fitness_Test.pdf),
      read 2026-10-29. Push-ups and sit-ups in one minute each, then EITHER a
      1.5-mile run/walk OR a 12-minute swim (the swim chart is from Cooper).
      Events in sequence, no more than 30 minutes apart; fail one, retake all.
   ═══════════════════════════════════════════════════════════════════════════ */
export const USCG_BANDS = ["<30", "30-39", "40-49", "50-59", "60+"];
export function uscgBand(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < 17) return null;
  if (a < 30) return "<30";
  if (a <= 39) return "30-39";
  if (a <= 49) return "40-49";
  if (a <= 59) return "50-59";
  return "60+";
}
// run15 in seconds; swim12 in yards covered in 12 minutes.
export const USCG_BOAT = {
  male: {
    pushups1: { "<30": 29,  "30-39": 24,  "40-49": 18,  "50-59": 13,  "60+": 10 },
    situps1:  { "<30": 38,  "30-39": 35,  "40-49": 29,  "50-59": 25,  "60+": 22 },
    run15:    { "<30": 771, "30-39": 816, "40-49": 869, "50-59": 926, "60+": 1003 },
    swim12:   { "<30": 500, "30-39": 450, "40-49": 400, "50-59": 350, "60+": 300 },
  },
  female: {
    pushups1: { "<30": 15,  "30-39": 11,  "40-49": 9,   "50-59": 9,    "60+": 9 },
    situps1:  { "<30": 32,  "30-39": 25,  "40-49": 20,  "50-59": 16,   "60+": 15 },
    run15:    { "<30": 926, "30-39": 957, "40-49": 1018, "50-59": 1075, "60+": 1124 },
    swim12:   { "<30": 400, "30-39": 350, "40-49": 300, "50-59": 250,  "60+": 200 },
  },
};
// run15: 12:51=771 13:36=816 14:29=869 15:26=926 16:43=1003 /
//        15:26=926 15:57=957 16:58=1018 17:55=1075 18:44=1124

/* ═══════════════════════════════════════════════════════════════════════════
   The gate definitions, per test.
     dir "higher"   value must be >= min
     dir "lower"    value must be <= max
     dir "complete" any recorded value clears it (the standard is finishing)
   `banded: true` means min/max come from PA_MPOETC for the person's age/sex.
   ═══════════════════════════════════════════════════════════════════════════ */
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export const PUBLIC_SAFETY = {
  uscg_member: {
    passMark: true,
    cardTitle: "Coast Guard new-member standard",
    passNote: "What every new Coast Guard member — officer or enlisted — is expected to perform. Set by sex, no age bands.",
    gates: {
      pushups1: { dir: "higher", unit: "reps", bySex: { male: 29, female: 15 } },
      plank:    { dir: "higher", unit: "secs", bySex: { male: 78, female: 69 } },
      run15:    { dir: "lower",  unit: "secs", bySex: { male: 749, female: 905 } },
    },
  },

  uscg_boatcrew: {
    passMark: true,
    banded: "uscg",
    cardTitle: "Coast Guard Boat Crew standard",
    passNote: "Table 4-5 of the Boat Crew Manual, by age and sex. Fail any section and the whole test is retaken.",
    gates: {
      pushups1: { dir: "higher", unit: "reps" },
      situps1:  { dir: "higher", unit: "reps" },
      run15:    { dir: "lower",  unit: "secs" },
    },
  },

  // Same test with the manual's other endurance option: a 12-minute swim
  // (distance covered) instead of the 1.5-mile run. Kept as its own battery
  // because the app runs events in order and has no "skip one" — you pick
  // which version you're doing up front, as you would on the day.
  uscg_boatcrew_swim: {
    passMark: true,
    banded: "uscg",
    cardTitle: "Coast Guard Boat Crew standard (swim option)",
    passNote: "Table 4-5 of the Boat Crew Manual, by age and sex, with the 12-minute swim as the endurance event.",
    gates: {
      pushups1: { dir: "higher", unit: "reps" },
      situps1:  { dir: "higher", unit: "reps" },
      swim12:   { dir: "higher", unit: "yards" },
    },
  },

  police_pa: {
    passMark: true,
    banded: "pa",
    cardTitle: "Pennsylvania academy standard",
    passNote: "The 30th percentile in every event is the entry standard. Academies hold you to it throughout training too.",
    gates: {
      situps1:   { dir: "higher", unit: "reps" },
      sprint300: { dir: "lower",  unit: "sec10" },
      pushups1:  { dir: "higher", unit: "reps" },
      run15:     { dir: "lower",  unit: "secs" },
    },
  },

  // Source: ICE Policy 6006.1, "Physical Fitness Testing for Law Enforcement
  // Applicants and Trainees", attachment quoting the HSI Handbook (July 19,
  // 2022) §4.3(B) and §5.3(A). Read 2026-10-14 from ice.gov. No age or sex bands.
  hsi_agent: {
    passMark: true,
    cardTitle: "HSI Special Agent minimums",
    passNote: "Minimums to qualify. One standard for every applicant — no age or sex bands.",
    gates: {
      situps1:    { dir: "higher", min: 32,    unit: "reps",  gate: "32 in 1 minute" },
      sprint220y: { dir: "lower",  max: 47.73, unit: "sec10", gate: "47.73 seconds" },
      pushups1:   { dir: "higher", min: 22,    unit: "reps",  gate: "22 in 1 minute" },
      run15:      { dir: "lower",  max: 865,   unit: "secs",  gate: "14:25" },
    },
  },

  // Source: NWCG "Work Capacity Test (WCT)", nwcg.gov (status Approved,
  // steward: Risk Management Committee), read 2026-10-14. Level terrain,
  // walked. Full procedure: Work Capacity Test Administrator's Guide, PMS 307.
  wildland_wct: {
    passMark: true,
    cardTitle: "Work Capacity Test",
    passNote: "Pass/fail at the duty level you tested for. Walked on level terrain — it's a walking test.",
    gates: {
      wct_pack:  { dir: "lower", max: 2700, unit: "secs", gate: "3 mi, 45 lb, 45:00", note: "Arduous duty." },
      wct_field: { dir: "lower", max: 1800, unit: "secs", gate: "2 mi, 25 lb, 30:00", note: "Moderate duty." },
      wct_walk:  { dir: "lower", max: 960,  unit: "secs", gate: "1 mi, no load, 16:00", note: "Light duty." },
    },
  },

  // Source: CPAT Orientation Guide (Fire Service Joint Labor Management
  // Wellness-Fitness Initiative), as published by Seattle Fire,
  // seattle.gov/documents/departments/firejobs/cpatorientationguide.pdf,
  // read 2026-10-14. Pass/fail: all 8 events in 10:20 or less.
  cpat: {
    passMark: true,
    cardTitle: "CPAT",
    passNote: "All eight events, in sequence, in 10:20 or less. Any disqualifying infraction fails the test regardless of time.",
    gates: {
      cpat_time: { dir: "lower", max: 620, unit: "secs", gate: "10:20 total",
        note: "Eight events in sequence in a 50-lb vest. Only an official or practice CPAT course counts." },
    },
  },

  // Source: United States Lifesaving Association, "Sample Policy Language"
  // (Lifeguard Agency Certification Program), usla.org/page/samplepolicy,
  // read 2026-10-14: "swim 500 meters (550 yards) ... over a measured course
  // in ten minutes or less", no buoyancy or propulsion aids.
  lifeguard_usla: {
    passMark: true,
    cardTitle: "USLA open water standard",
    passNote: "The national minimum for open water lifeguards. Agencies add their own run-swim-run and rescue events on top.",
    gates: {
      swim500m: { dir: "lower", max: 600, unit: "secs", gate: "500 m in 10:00",
        note: "Measured course, no fins or buoyancy aids." },
    },
  },

  // SECOND-HAND, ONE AGENCY. Source: "SWAT Standards and Performance", Police
  // and Security News, 24 Jan 2018, reporting the Pasco County (FL) Sheriff's
  // Office SWAT tryout. Not a national standard — none exists — and not read
  // from the agency's own document.
  swat_pasco: {
    passMark: true,
    secondHand: true,
    cardTitle: "Pasco County SO SWAT tryout (as reported, 2018)",
    passNote: "One agency's tryout, not a national standard — there isn't one. Your team's own standard is the one that counts.",
    gates: {
      pushups1:   { dir: "higher", min: 40, unit: "reps", gate: "40 in 1 minute" },
      situps1:    { dir: "higher", min: 45, unit: "reps", gate: "45 in 1 minute" },
      swim200bdu: { dir: "complete", unit: "secs", gate: "200 m in BDUs",
        note: "The report gives the distance and uniform, not a time — completing it is the standard." },
      tread15:    { dir: "higher", min: 900, unit: "secs", gate: "15:00 in BDUs" },
    },
  },
};

/** Branches inside the PUBLIC SAFETY group. */
export const PUBLIC_SAFETY_BRANCHES = [
  { key: "police",    label: "POLICE",            sub: "Academy entrance standards",      accent: "#3b82f6" },
  { key: "federal",   label: "FEDERAL AGENTS",    sub: "Special agent minimums",          accent: "#6366f1" },
  { key: "fire",      label: "FIREFIGHTER",       sub: "Structural and wildland",         accent: "#ef4444" },
  { key: "swat",      label: "SWAT / TACTICAL",   sub: "No national standard — team tryouts", accent: "#64748b" },
  { key: "lifeguard", label: "OCEAN LIFEGUARD",   sub: "Open water rescue",               accent: "#06b6d4" },
];

/**
 * Named, deliberately not runnable: the event list is known but the scoring
 * standard hasn't been read from an official document yet. Same shape as the
 * military PENDING list, so the page renders both the same way.
 */
export const PUBLIC_SAFETY_PENDING = [
  {
    key: "fbi_pft", branch: "federal", name: "FBI Special Agent PFT",
    events: "Sit-ups (1 min) · 300 m sprint · push-ups (untimed) · 1.5-mile run — points per event, scored by sex.",
    why: "Needs the FBI's own PFT guide. fbijobs.gov redirects and fbi.gov refused the fetch, and third-party copies don't count. Upload the official PFT guide PDF to unlock it.",
  },
  {
    key: "ca_post_wstb", branch: "police", name: "California POST Work Sample Test Battery",
    events: "99-yd obstacle course · 165-lb body drag 32 ft · 6-ft chain-link fence · 6-ft solid fence · 500-yd run.",
    why: "Scored by a POST points table that the department pages describe but don't publish. Needs the POST scoring table to unlock — and three of the five events need a course.",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Scoring
   ═══════════════════════════════════════════════════════════════════════════ */

/** The gate for one event, resolved for this person where the test is banded. */
function gateText(g, v) {
  if (g.dir === "lower") return g.unit === "sec10" ? `${v} seconds` : fmt(v);
  if (g.unit === "secs") return `${fmt(v)} hold`;
  if (g.unit === "yards") return `${v} yd in 12 min`;
  return `${v} in 1 minute`;
}

function resolveGate(testKey, eventKey, { sex, age } = {}) {
  const t = PUBLIC_SAFETY[testKey];
  const g = t?.gates?.[eventKey];
  if (!g) return null;
  let v = null, band;
  if (g.bySex) {
    v = g.bySex[sex] ?? null;
  } else if (t.banded === "uscg") {
    band = uscgBand(age);
    v = band ? USCG_BOAT[sex]?.[eventKey]?.[band] ?? null : null;
  } else if (t.banded) {
    band = paBand(age);
    const row = PA_MPOETC[sex]?.[eventKey];
    v = band && row ? row[band] : null;
  } else {
    return g;
  }
  if (v == null) return { ...g, unresolved: true };
  return { ...g, [g.dir === "lower" ? "max" : "min"]: v, gate: gateText(g, v), band };
}

export function scorePublicSafetyEvent(testKey, eventKey, value, who) {
  const g = resolveGate(testKey, eventKey, who);
  if (!g) return null;
  const v = Number(value) || 0;
  const recorded = v > 0;
  if (g.unresolved) {
    return { kind: "gate", dir: g.dir, pass: null, minimum: null, unit: g.unit,
      gate: "needs age and sex", note: g.note ?? null, unresolved: true };
  }
  if (g.dir === "complete") {
    return { kind: "gate", dir: "complete", pass: recorded ? true : null, minimum: null,
      unit: g.unit, gate: g.gate, note: g.note ?? null, lowerIsBetter: g.unit !== "reps" };
  }
  const threshold = g.dir === "lower" ? g.max : g.min;
  const pass = !recorded ? null : g.dir === "lower" ? v <= threshold : v >= threshold;
  return {
    kind: "gate", dir: g.dir, pass, minimum: threshold, unit: g.unit,
    gate: g.gate, note: g.note ?? null, lowerIsBetter: g.dir === "lower",
    recommended: null, meetsRecommended: null,
  };
}

/**
 * Score a whole public-safety test. Same shape as scoreMarsocTest, so the
 * results page renders both the same way — plus `passed`, because these tests
 * publish a pass rule and MARSOC doesn't.
 *
 * A skipped event stays in the denominator (the MARSOC lesson: three gates
 * with one skipped must never read "2 of 2"). An unrecorded or unresolvable
 * event means NOT a pass — never a quiet pass on what was done.
 */
export function scorePublicSafetyTest(testKey, events, who = {}) {
  const t = PUBLIC_SAFETY[testKey];
  let scored = (events || []).map((e) => ({ key: e.key, result: scorePublicSafetyEvent(testKey, e.key, e.value, who) }));
  // "Either/or" events (Boat Crew: run OR swim): the one you did is judged;
  // the unrecorded alternative drops out instead of counting as missing.
  for (const group of t?.either || []) {
    const inGroup = scored.filter((s) => group.includes(s.key) && s.result);
    const done = inGroup.filter((s) => s.result.pass !== null);
    const drop = new Set((done.length ? inGroup.filter((s) => s.result.pass === null) : inGroup.slice(1)).map((s) => s.key));
    scored = scored.filter((s) => !drop.has(s.key));
  }
  const judged = scored.filter((s) => s.result);
  const unresolved = judged.some((s) => s.result.unresolved);
  const total = judged.length;
  const met = judged.filter((s) => s.result.pass === true).length;
  const skipped = judged.filter((s) => s.result.pass === null).length;
  const short = total - met - skipped;
  const passed = !!t?.passMark && !unresolved && total > 0 && met === total;

  if (unresolved) {
    return {
      scored, met, total, skipped, passed: false,
      cardTitle: t.cardTitle, cardNote: t.passNote,
      overall: { label: "NOT SCORED", color: "#f59e0b",
        detail: "This standard is set by age and sex. Add both on the setup screen and retest." },
    };
  }
  const color = passed ? "#4ade80" : met === 0 ? "#ef4444" : "#f59e0b";
  return {
    scored, met, total, skipped, passed,
    cardTitle: t?.cardTitle, cardNote: t?.passNote,
    overall: {
      label: passed ? "PASS" : total === 1 ? (skipped ? "NOT RECORDED" : "FAIL") : `FAIL · ${met} OF ${total}`,
      color,
      detail: passed
        ? (total === 1 ? "Standard met." : `Every published minimum met.`)
        : [
            short > 0 && `${short} below standard`,
            skipped > 0 && `${skipped} not recorded`,
          ].filter(Boolean).join(" · "),
    },
  };
}
