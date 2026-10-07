/**
 * usmcStandards.js — Marine Corps PFT and CFT scoring.
 *
 * SOURCE, STATED PLAINLY: these tables came from a secondary source citing the
 * MCO 6100.13A scoring tables, not from the order itself. Every other scored
 * test in this app was read from its governing document; this one was not, and
 * the UI says so on the card and on the result.
 *
 * Why that was the right call anyway: the order is from March 2019 and has been
 * amended twice since, by MARADMIN 613/25 (combat-arms Marines on the
 * male-normed table, 1 Jan 2026) and MARADMIN 066/26 (waist-to-height replaces
 * height/weight). The source used here reflects both. The 2019 PDF alone would
 * have been an older picture of policy, not a better one.
 *
 * Structure, which IS well attested:
 *   PFT  pull-ups or push-ups · plank · 3-mile run
 *   CFT  movement to contact · ammo can lifts · maneuver under fire
 * Each event is worth up to 100 points, each test totals 300, and the pass is
 * 40 points minimum in EVERY event plus 150 overall.
 */

const t = (mins, secs) => mins * 60 + secs;

export const USMC_BANDS = [
  "17-20", "21-25", "26-30", "31-35", "36-40", "41-45", "46-50", "51+",
];

export function usmcBand(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < 17) return null;
  if (a <= 20) return "17-20";
  if (a <= 25) return "21-25";
  if (a <= 30) return "26-30";
  if (a <= 35) return "31-35";
  if (a <= 40) return "36-40";
  if (a <= 45) return "41-45";
  if (a <= 50) return "46-50";
  return "51+";
}

// Each cell is [value at MAX points, value at MIN points], in band order.
//
// Note the two asymmetries, both real and both easy to flatten by accident:
//   - push-ups cap at 70 points, not 100, so choosing them caps the whole PFT
//     at 270. Pull-ups are strictly the better choice if you can do them.
//   - the female pull-up minimum is worth 60 points, not the 40 every other
//     event's minimum is worth.
export const USMC_PFT = {
  pullups: {
    name: "Pull-ups", unit: "reps", lowerIsBetter: false,
    maxPoints: 100,
    minPointsBySex: { male: 40, female: 60 },
    male:   [[20,4],[23,5],[23,5],[23,5],[21,5],[20,5],[19,4],[18,3]],
    female: [[7,1],[11,3],[12,4],[11,3],[10,3],[8,2],[6,2],[4,2]],
  },
  pushups: {
    name: "Push-ups", unit: "reps", lowerIsBetter: false,
    maxPoints: 70, minPoints: 40,
    male:   [[82,42],[87,40],[84,39],[80,36],[76,34],[72,30],[68,25],[64,20]],
    female: [[42,19],[48,18],[50,18],[46,16],[43,14],[41,12],[40,11],[38,10]],
  },
  run3: {
    name: "Three-Mile Run", unit: "secs", lowerIsBetter: true,
    maxPoints: 100, minPoints: 40,
    male: [
      [t(18, 0), t(27,40)], [t(18, 0), t(27,40)], [t(18, 0), t(28, 0)], [t(18, 0), t(28,20)],
      [t(18, 0), t(28,40)], [t(18,30), t(29,20)], [t(19, 0), t(30, 0)], [t(19,30), t(33, 0)],
    ],
    female: [
      [t(21, 0), t(30,50)], [t(21, 0), t(30,50)], [t(21, 0), t(31,10)], [t(21, 0), t(31,30)],
      [t(21, 0), t(31,50)], [t(21,30), t(32,30)], [t(22, 0), t(33,30)], [t(22,30), t(36, 0)],
    ],
  },
};

// The plank is the one event on a single table — age and sex don't change it.
USMC_PFT.plank = {
  name: "Plank", unit: "secs", lowerIsBetter: false,
  maxPoints: 100, minPoints: 40, singleTable: true,
  male:   new Array(8).fill([t(3,45), t(1,10)]),
  female: new Array(8).fill([t(3,45), t(1,10)]),
};

// ── Combat Fitness Test ──────────────────────────────────────────────────────
// Run in boots and utilities. Movement to contact is an 880-yard sprint; ammo
// can lifts are overhead presses of a 30-lb can in two minutes; maneuver under
// fire is a 300-yard shuttle stacking crawls, a buddy drag, a fireman carry, an
// ammo can carry, push-ups and a grenade throw. Three minutes between events.
export const USMC_CFT = {
  mtc: {
    name: "Movement to Contact", unit: "secs", lowerIsBetter: true,
    maxPoints: 100, minPoints: 40,
    male: [
      [t(2,40), t(3,45)], [t(2,38), t(3,45)], [t(2,39), t(3,48)], [t(2,42), t(3,51)],
      [t(2,45), t(3,58)], [t(2,52), t(4,11)], [t(3, 1), t(4,28)], [t(3, 5), t(5, 7)],
    ],
    female: [
      [t(3,19), t(4,36)], [t(3,13), t(4,41)], [t(3,10), t(4,45)], [t(3,12), t(4,46)],
      [t(3,18), t(4,55)], [t(3,25), t(4,58)], [t(3,39), t(5,26)], [t(3,55), t(5,52)],
    ],
  },
  ammocan: {
    name: "Ammo Can Lifts", unit: "reps", lowerIsBetter: false,
    maxPoints: 100, minPoints: 40,
    male:   [[106,62],[115,67],[116,67],[120,67],[110,67],[106,66],[100,65],[95,16]],
    female: [[66,30],[74,30],[75,30],[72,30],[70,30],[62,28],[53,26],[44,6]],
  },
  muf: {
    name: "Maneuver Under Fire", unit: "secs", lowerIsBetter: true,
    maxPoints: 100, minPoints: 40,
    male: [
      [t(2, 7), t(3,17)], [t(2, 4), t(3,18)], [t(2, 5), t(3,22)], [t(2,10), t(3,30)],
      [t(2,16), t(3,42)], [t(2,23), t(3,59)], [t(2,40), t(4,14)], [t(2,52), t(6, 9)],
    ],
    female: [
      [t(2,55), t(4,53)], [t(2,45), t(4,34)], [t(2,42), t(4,40)], [t(2,49), t(4,44)],
      [t(2,53), t(4,56)], [t(2,57), t(5, 1)], [t(3,35), t(5, 6)], [t(3,44), t(6,33)],
    ],
  },
};

/**
 * Values in the 51+ band that look like errors in the source and are kept as
 * given rather than "corrected". They sit in the oldest band, where a single
 * wrong cell changes nobody's verdict except an over-51 Marine's — so they are
 * flagged rather than silently smoothed. If the order itself ever turns up,
 * these are the first cells to check.
 */
export const USMC_SUSPECT = [
  "Male ammo can minimum drops to 16 at 51+ (65 at 46-50) — implausibly low",
  "Female ammo can minimum drops to 6 at 51+ (26 at 46-50) — implausibly low",
  "Male maneuver-under-fire minimum jumps to 6:09 at 51+ (4:14 at 46-50)",
];

export const USMC_CLASSES = [
  { min: 235, label: "1st Class", color: "#4ade80" },
  { min: 200, label: "2nd Class", color: "#60a5fa" },
  { min: 150, label: "3rd Class", color: "#eab308" },
];
export const USMC_EVENT_MIN_POINTS = 40;
export const USMC_PASS_TOTAL = 150;
export const USMC_COMBAT_ARMS_TOTAL = 210;   // MARADMIN 613/25, from 1 Jan 2026
export const USMC_MAX_TOTAL = 300;

/** The class a total falls in, or null when it's a failure. */
export const usmcClassFor = (total) =>
  USMC_CLASSES.find((c) => total >= c.min) || null;

/**
 * Score one PFT or CFT event.
 *
 * `combatArms` scores on the male-normed column whatever the sex, which is how
 * MARADMIN 613/25 works from 1 Jan 2026.
 *
 * Below the event minimum this returns 0 rather than extrapolating. We only
 * hold the min and max anchors, so a sub-minimum number would be invented — and
 * it would change nothing, because any event under 40 fails the whole test
 * regardless of what the other two scored.
 */
export function scoreUsmcEvent(eventKey, value, sex, age, combatArms = false) {
  const ev = USMC_PFT[eventKey] || USMC_CFT[eventKey];
  const band = usmcBand(age);
  const col = combatArms ? "male" : sex;
  if (!ev || !band || !ev[col] || !Number.isFinite(Number(value))) return null;

  const [maxV, minV] = ev[col][USMC_BANDS.indexOf(band)];
  const v = Number(value);
  const { maxPoints, lowerIsBetter } = ev;
  // Pull-ups are the one event whose minimum is worth different points by sex.
  const minPoints = ev.minPointsBySex ? ev.minPointsBySex[col] : ev.minPoints;

  const atMax = lowerIsBetter ? v <= maxV : v >= maxV;
  const belowMin = lowerIsBetter ? v > minV : v < minV;

  let points;
  if (atMax) points = maxPoints;
  else if (belowMin) points = 0;
  else {
    const span = lowerIsBetter ? minV - maxV : maxV - minV;
    const over = lowerIsBetter ? minV - v : v - minV;
    points = span <= 0 ? minPoints : minPoints + (over / span) * (maxPoints - minPoints);
  }
  points = Math.round(points);

  return {
    points, maxPoints, minPoints, maxValue: maxV, minimum: minV,
    pass: points >= USMC_EVENT_MIN_POINTS,
    unit: ev.unit, lowerIsBetter, band,
  };
}

/**
 * Whole PFT or CFT verdict.
 *
 * Three rules, and the second is the one people forget:
 *   1. total >= 150 (or 210 for combat arms from 1 Jan 2026)
 *   2. at least 40 points in EVERY event — miss it on one and the test fails
 *      however strong the other two were
 *   3. the class (1st/2nd/3rd) follows from the total, and only applies to a
 *      test that actually passed
 */
export function scoreUsmcTest(events, sex, age, combatArms = false) {
  const scored = events.map((e) => ({
    key: e.key,
    result: scoreUsmcEvent(e.key, e.value, sex, age, combatArms),
  }));
  if (!scored.length || scored.some((s) => !s.result)) return { scored, overall: null };

  const total = scored.reduce((sum, s) => sum + s.result.points, 0);
  const everyEventPassed = scored.every((s) => s.result.pass);
  const failed = scored.filter((s) => !s.result.pass).map((s) => s.key);
  const needed = combatArms ? USMC_COMBAT_ARMS_TOTAL : USMC_PASS_TOTAL;
  const passed = everyEventPassed && total >= needed;
  const cls = passed ? usmcClassFor(total) : null;

  return {
    scored, total, needed, everyEventPassed, failedEvents: failed, passed,
    combatArms, cls,
    overall: {
      label: passed ? (cls ? cls.label : "PASS") : "FAIL",
      color: passed ? (cls ? cls.color : "#4ade80") : "#ef4444",
      detail: !everyEventPassed
        ? `Below ${USMC_EVENT_MIN_POINTS} points on ${failed.length} event${failed.length === 1 ? "" : "s"}`
        : total < needed
          ? `${total} of ${needed} needed`
          : `${total} of ${USMC_MAX_TOTAL}`,
    },
  };
}
