/**
 * MARSOC Assessment & Selection — screening gates.
 *
 * Sources, both read 2026-10-06:
 *   1. marsoc.marines.mil → Units → Marine Raider Training Center →
 *      Assessment Screening → "Assessment and Selection Program (A&S)"
 *   2. "Assessment & Selection Preparation Program" (MARSOC's own 11-week
 *      guide, linked from that page)
 *
 * ── WHY THIS FILE LOOKS NOTHING LIKE THE OTHERS ────────────────────────────
 *
 * Every other standard in this app is a SCORING TABLE: a value goes in, points
 * come out, the points add up to a verdict. MARSOC publishes no such table, and
 * the page says why in as many words:
 *
 *     "During Phase I, candidates will be given the standards for each
 *      fitness screening event."
 *
 * The standards exist. They are handed out at Camp Lejeune, not on the web. So
 * there is nothing here to interpolate and no total to compute.
 *
 * What IS published is a short list of hard numbers you must bring with you —
 * prerequisites, not scores. That is what this file holds, and the scorer below
 * answers one question per event: did you clear the published gate, yes or no.
 * Events with no published gate are recorded and explicitly left unjudged.
 *
 * The one thing this file must never do is add up gates and call the result a
 * pass. Clearing every gate here means you are eligible to be assessed. It says
 * nothing about whether you would be selected, and the app must not imply it
 * does — that would be inventing the very standards the page declines to give.
 */

/** Seconds per mile at the published 4 mph / 15-minute-mile standard. */
export const MARSOC_PACE_SEC_PER_MILE = 900;

/** Ruck weight the pace standard is set against, excluding MRE and water. */
export const MARSOC_RUCK_LBS = 45;

/** PFT score required to attend Phase I, and the score A&S actually asks for. */
export const MARSOC_PFT_MIN = 235;
export const MARSOC_PFT_RECOMMENDED = 260;

/**
 * One entry per event the app can run.
 *
 * `min` / `max` are the published gate in the event's own unit. `null` for both
 * means the event is recorded but not judged — there is no published number.
 *
 *   dir "higher"   → value must be >= min
 *   dir "lower"    → value must be <= max
 *   dir "complete" → any recorded value clears it; the standard is finishing
 */
export const MARSOC_GATES = {
  // The only published numeric fitness gate. 235 gets you in the door; the page
  // asks for 260 and says plainly that the minimum "will not guarantee success".
  pft: {
    dir: "higher", min: MARSOC_PFT_MIN, max: null,
    recommended: MARSOC_PFT_RECOMMENDED, unit: "pts",
    gate: "235 to attend Phase I",
    note: "260 or higher is what A&S recommends. The page is explicit that meeting only the minimum does not guarantee success.",
  },

  // "the aquatic skill to safely, confidently and continuously swim 300 meters
  // using the prescribed strokes (side or breast) while wearing the MCCU
  // uniform (no boots)". A capability, stated without a time — so completion is
  // the gate, and the time is recorded for your own trend only.
  swim300: {
    dir: "complete", min: null, max: null, recommended: null, unit: "secs",
    gate: "Complete, continuous, in uniform",
    note: "No time is published for this — the standard is swimming it continuously in the MCCU uniform with a side or breast stroke. Your time is recorded so you can watch it come down.",
  },

  // "an underwater swim of 25 meters in PT gear". The distance IS the gate.
  uwswim25: {
    dir: "higher", min: 25, max: null, recommended: null, unit: "m",
    gate: "25 metres underwater",
    note: "In PT gear. Phase I pairs this with retrieving a rifle from the bottom of the pool, which the app can't time.",
  },

  // "a 10-minute water tread in full utility uniform (no boots)".
  tread: {
    dir: "higher", min: 600, max: null, recommended: null, unit: "secs",
    gate: "10 minutes",
    note: "Full utility uniform, no boots. Phase I follows it with blouse or trouser flotation.",
  },

  // "multiple movements under load of 45 LBS (weight excluding MRE and water)
  // within a prescribed standard of (4 MPH) 15 minutes per mile". The gate is a
  // PACE, so every distance below derives its cutoff from the same number
  // rather than from a table — which is why these are computed, not transcribed.
  ...Object.fromEntries(
    [
      [4,  "Prep-program ruck assessment distance"],
      [8,  "Graded Phase I hike"],
      [10, "Graded Phase I hike"],
      [13, "Prep-program ruck assessment distance"],
    ].map(([miles, what]) => [
      `ruck${miles}`,
      {
        dir: "lower", min: null, max: miles * MARSOC_PACE_SEC_PER_MILE,
        recommended: null, unit: "secs", miles,
        gate: `${miles} miles at 15:00/mile`,
        note: `${what}. ${MARSOC_RUCK_LBS} lb excluding MRE and water, at 4 mph — ${miles} miles inside ${miles * 15}:00.`,
      },
    ])
  ),
};

/**
 * Events where a smaller number is the better one: the pace-gated rucks, and
 * the 300m swim, which has no gate but is still a time you want coming down.
 * The 10-minute tread is seconds too and is deliberately NOT in here — holding
 * on longer is the better result.
 */
export const MARSOC_LOWER_IS_BETTER = new Set(
  Object.entries(MARSOC_GATES)
    .filter(([, g]) => g.dir === "lower" || (g.dir === "complete" && g.unit === "secs"))
    .map(([k]) => k)
);

/**
 * Score one event against its published gate.
 *
 * Returns null for an event this file has never heard of, so a battery that
 * grows an event before the gate is known records it rather than crashing.
 */
export function scoreMarsocEvent(eventKey, value) {
  const g = MARSOC_GATES[eventKey];
  if (!g) return null;

  const v = Number(value) || 0;
  const recorded = v > 0;

  // No gate to clear, so there is no verdict to give. `pass: null` is the whole
  // point: the UI reads it as "recorded" and says so, instead of defaulting to
  // a green tick nobody earned.
  if (g.dir === "complete") {
    return {
      kind: "gate", dir: g.dir, pass: recorded ? true : null,
      minimum: null, recommended: null, unit: g.unit,
      gate: g.gate, note: g.note, lowerIsBetter: g.unit === "secs",
    };
  }

  const threshold = g.dir === "lower" ? g.max : g.min;
  const pass = !recorded ? null
    : g.dir === "lower" ? v <= threshold
    : v >= threshold;

  return {
    kind: "gate", dir: g.dir, pass,
    minimum: threshold,
    recommended: g.recommended ?? null,
    meetsRecommended: g.recommended != null && recorded ? v >= g.recommended : null,
    unit: g.unit, gate: g.gate, note: g.note,
    lowerIsBetter: g.dir === "lower",
  };
}

/**
 * Score a whole MARSOC battery.
 *
 * Note what this deliberately does NOT return: `passed`. Every other scorer in
 * this app ends with a pass/fail because its service publishes the mark that
 * decides it. MARSOC does not, so the honest summary is a count — how many of
 * the published gates you cleared — and nothing more.
 */
export function scoreMarsocTest(events) {
  const scored = (events || []).map((e) => ({
    key: e.key,
    result: scoreMarsocEvent(e.key, e.value),
  }));

  // Events that carry a numeric gate, whether or not they were actually done.
  // The denominator has to count ALL of them: if a skipped event quietly left
  // the total, three gates with one missed would read "2 of 2 met", which is a
  // worse lie than any of the ones this file exists to avoid.
  const gated = scored.filter((s) => s.result && s.result.dir !== "complete");
  const total = gated.length;
  const met = gated.filter((s) => s.result.pass === true).length;
  const skipped = gated.filter((s) => s.result.pass === null).length;

  // Completion gates are counted separately — "completed 1" is a fact, but it
  // isn't a threshold cleared, so it must not inflate the gate count.
  const completable = scored.filter((s) => s.result?.dir === "complete");
  const completed = completable.filter((s) => s.result.pass).length;

  if (!total && !completable.length) {
    return { scored, met: 0, total: 0, skipped: 0, completed: 0, allMet: false, overall: null };
  }

  const allMet = total > 0 && met === total;
  const colour = allMet ? "#4ade80" : met === 0 ? "#ef4444" : "#f59e0b";
  const short = total - met - skipped;

  return {
    scored,
    met, total, skipped, completed, allMet,
    overall: {
      label: total === 0 ? "RECORDED"
        : allMet ? "ALL GATES MET"
        : `${met} OF ${total} GATES MET`,
      color: colour,
      detail: allMet
        ? "Every published prerequisite cleared — Phase I sets the rest on arrival."
        : [
            short > 0 && `${short} gate${short === 1 ? "" : "s"} short`,
            skipped > 0 && `${skipped} not recorded`,
          ].filter(Boolean).join(" · ") || "Nothing recorded yet.",
    },
  };
}
