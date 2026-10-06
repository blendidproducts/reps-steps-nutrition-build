/**
 * airForceStandards.js — USAF Physical Fitness Readiness Assessment (PFRA).
 *
 * Source: "Final USAF Physical Fitness Readiness Assessment Scoring
 * (Effective 1 Mar 26)", AFPC PFRA Scoring Charts. Read from the primary
 * document 2026-10-06.
 *
 * This is NOT the old PFA. The test was renamed and rebuilt: the 1.5-mile run
 * is gone, body composition became a waist-to-height ratio, and the weighting
 * changed. Any chart showing a 1.5-mile run or a 60/20/20 split is superseded.
 *
 *   Cardiorespiratory   50 pts   2-mile run OR 20m HAMR (OR 2km walk, go/no-go)
 *   Waist-to-height     20 pts   tape measurement, not a fitness event
 *   Muscular strength   15 pts   push-ups OR hand-release push-ups
 *   Core endurance      15 pts   sit-ups OR cross-leg reverse crunch OR plank
 *                      ───────
 *                      100 pts
 *
 * The app runs the three components it can actually measure — hand-release
 * push-ups, forearm plank and the 2-mile run — which is 80 of the 100 points.
 * The missing 20 is the tape measurement.
 */

const t = (mins, secs) => mins * 60 + secs;

export const PFRA_BANDS = [
  "<25", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60+",
];

export function pfraBand(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < 17) return null;
  if (a < 25) return "<25";
  if (a <= 29) return "25-29";
  if (a <= 34) return "30-34";
  if (a <= 39) return "35-39";
  if (a <= 44) return "40-44";
  if (a <= 49) return "45-49";
  if (a <= 54) return "50-54";
  if (a <= 59) return "55-59";
  return "60+";
}

// Each cell is [value earning MAX points, value earning MIN points], in band
// order. The chart's bottom row is marked with an asterisk — that is the
// component minimum, and falling below it scores zero rather than being
// extrapolated downward.
export const PFRA = {
  hrp: {
    name: "Hand-Release Push-ups", unit: "reps", lowerIsBetter: false,
    maxPoints: 15, minPoints: 2.5, component: "strength",
    male:   [[52,27],[50,25],[48,23],[46,21],[44,19],[42,17],[40,15],[38,13],[36,11]],
    female: [[42,17],[40,15],[38,13],[36,11],[34, 9],[32, 7],[30, 5],[28, 3],[26, 1]],
  },
  plank: {
    name: "Forearm Plank", unit: "secs", lowerIsBetter: false,
    maxPoints: 15, minPoints: 2.5, component: "core",
    male: [
      [t(3,40), t(1,35)], [t(3,35), t(1,30)], [t(3,30), t(1,25)],
      [t(3,25), t(1,20)], [t(3,20), t(1,15)], [t(3,15), t(1,10)],
      [t(3,10), t(1, 5)], [t(3, 5), t(1, 0)], [t(3, 0), t(0,55)],
    ],
    female: [
      [t(3,35), t(1,30)], [t(3,30), t(1,25)], [t(3,25), t(1,20)],
      [t(3,20), t(1,15)], [t(3,15), t(1,10)], [t(3,10), t(1, 5)],
      [t(3, 5), t(1, 0)], [t(3, 0), t(0,55)], [t(2,55), t(0,50)],
    ],
  },
  run2: {
    name: "Two-Mile Run", unit: "secs", lowerIsBetter: true,
    maxPoints: 50, minPoints: 35, component: "cardio",
    male: [
      [t(13,25), t(19,45)], [t(13,35), t(19,55)], [t(13,42), t(20,44)],
      [t(13,56), t(21,16)], [t(14, 5), t(22, 4)], [t(14,30), t(22,27)],
      [t(15, 9), t(22,50)], [t(15,28), t(23,36)], [t(16,58), t(24, 0)],
    ],
    female: [
      [t(15,30), t(25,23)], [t(15,55), t(25,40)], [t(16,10), t(26,15)],
      [t(16,12), t(26,30)], [t(16,45), t(26,52)], [t(16,55), t(27,15)],
      [t(17,10), t(28, 5)], [t(17,43), t(28,40)], [t(18,20), t(29,40)],
    ],
  },
};

/** Points available from the three components the app measures. */
export const PFRA_MEASURED_MAX = 80;   // 50 cardio + 15 strength + 15 core
export const PFRA_TOTAL_MAX = 100;     // the missing 20 is waist-to-height

/**
 * Score one PFRA component.
 *
 * The published table steps in half-points, so this interpolates between the
 * two anchors rather than reproducing every row. Below the component minimum
 * it returns zero, which is the chart's own behaviour — there is no row under
 * the asterisked value, so a worse performance is not worth fractional points.
 */
export function scorePfraEvent(eventKey, value, sex, age) {
  const ev = PFRA[eventKey];
  const band = pfraBand(age);
  if (!ev || !band || !ev[sex] || !Number.isFinite(Number(value))) return null;

  const [maxV, minV] = ev[sex][PFRA_BANDS.indexOf(band)];
  const v = Number(value);
  const { maxPoints, minPoints, lowerIsBetter } = ev;

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

  points = Math.round(points * 2) / 2;   // the chart scores in half-points
  return {
    points, maxPoints, minPoints,
    maxValue: maxV, minimum: minV,
    pass: points >= minPoints,
    unit: ev.unit, lowerIsBetter, band, component: ev.component,
  };
}

/**
 * Whole-PFRA result.
 *
 * NOTE ON THE VERDICT: the scoring charts publish the tables but NOT the
 * composite pass mark, and the old PFA's 75 was set against a different
 * weighting (60/20/20), so carrying it over would be a guess. This returns the
 * composite and flags any component below its own minimum — both facts come
 * straight from the chart — and deliberately does not declare an overall
 * pass or fail.
 */
export function scorePfraTest(events, sex, age) {
  const scored = events.map((e) => ({
    key: e.key,
    result: scorePfraEvent(e.key, e.value, sex, age),
  }));
  if (!scored.length || scored.some((s) => !s.result)) return { scored, overall: null };

  const measured = scored.reduce((sum, s) => sum + s.result.points, 0);
  const below = scored.filter((s) => !s.result.pass).map((s) => s.key);

  return {
    scored,
    measured: Math.round(measured * 2) / 2,
    measuredMax: PFRA_MEASURED_MAX,
    belowMinimum: below,
    overall: {
      label: below.length ? "BELOW A COMPONENT MINIMUM" : "ALL COMPONENTS MET",
      color: below.length ? "#ef4444" : "#4ade80",
      detail: below.length
        ? `${below.length} component${below.length === 1 ? "" : "s"} under the published minimum`
        : "Every component at or above its minimum",
    },
  };
}
