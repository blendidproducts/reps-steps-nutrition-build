/**
 * Exercise Tracking Library for MediaPipe Pose
 * Full calisthenics exercise library with joint configs and rep-counting logic
 */

// ── MediaPipe Pose landmark indices ──────────────────────────────────────────
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

/**
 * Calculate angle at vertex B formed by points A→B→C
 * Returns degrees (0–180)
 */
export function getAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** Return midpoint of two landmarks */
export function getMid(a, b) {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 };
}

/** Euclidean distance between two landmarks (normalized coords) */
export function getDist(a, b) {
  if (!a || !b) return 0;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Shared joint-angle helpers (visibility-aware) ─────────────────────────────
// Round 14: several variations (Diamond/Wide/Incline push-ups, Tricep Dip)
// averaged BOTH arms with no visibility fallback — if one arm was occluded
// (common on phone/tripod at an angle) the average was corrupted and reps
// never crossed the thresholds. These helpers pick the better-visible side.

/** Elbow angle — averages both arms when visible, falls back to the clearer one */
function elbowAngle(lm) {
  const lVis = (lm[11]?.visibility ?? 0) + (lm[13]?.visibility ?? 0) + (lm[15]?.visibility ?? 0);
  const rVis = (lm[12]?.visibility ?? 0) + (lm[14]?.visibility ?? 0) + (lm[16]?.visibility ?? 0);
  const L = getAngle(lm[11], lm[13], lm[15]);
  const R = getAngle(lm[12], lm[14], lm[16]);
  if (lVis < 1.0) return R;
  if (rVis < 1.0) return L;
  return (L + R) / 2;
}

/** Knee angle — averages both legs when visible, falls back to the clearer one */
function kneeAngle(lm) {
  const lVis = (lm[23]?.visibility ?? 0) + (lm[25]?.visibility ?? 0) + (lm[27]?.visibility ?? 0);
  const rVis = (lm[24]?.visibility ?? 0) + (lm[26]?.visibility ?? 0) + (lm[28]?.visibility ?? 0);
  const L = getAngle(lm[23], lm[25], lm[27]);
  const R = getAngle(lm[24], lm[26], lm[28]);
  if (lVis < 1.0) return R;
  if (rVis < 1.0) return L;
  return (L + R) / 2;
}

/** Single working knee — uses whichever leg the camera sees best (lunges, split
 *  squats, step-ups, pistols). The old configs hard-coded the LEFT leg only, so
 *  right-leg-forward reps were invisible to the tracker. */
function workingKneeAngle(lm) {
  const lVis = (lm[23]?.visibility ?? 0) + (lm[25]?.visibility ?? 0) + (lm[27]?.visibility ?? 0);
  const rVis = (lm[24]?.visibility ?? 0) + (lm[26]?.visibility ?? 0) + (lm[28]?.visibility ?? 0);
  return lVis >= rVis ? getAngle(lm[23], lm[25], lm[27]) : getAngle(lm[24], lm[26], lm[28]);
}

/** Push-up depth — vertical shoulder displacement relative to hip, normalized
 *  by torso length (shoulder-to-hip distance). PRIMARY signal for the push-up
 *  family as of 2026-08-20 (Finding 1). From a head-on/tripod camera the upper
 *  arm points toward/away from the lens, so the 2D elbow angle measures
 *  foreshortening, not flexion, and can rise again at full depth (confirmed
 *  from field data: Elbow 138 -> 102 -> 131 -> 140, INCREASING at the bottom
 *  of the rep). Shoulders moving down toward hip height is monotonic
 *  regardless of camera angle. Normalizing by torso length keeps the metric
 *  comparable whether the tripod is 2 ft or 5 ft away.
 *
 *  Needs BOTH shoulders and BOTH hips visible with reasonable confidence to
 *  normalize honestly. If not, we do NOT guess — we hold the metric at a
 *  fixed "neutral/up" value so a rep may go uncounted, but the counter is
 *  never fed a fabricated number.
 *
 *  ⚠️ UNCALIBRATED: up/downThreshold on the entries using this metric are a
 *  reasoned first pass, not measured from real capture data (we only have
 *  elbow-angle field data, a different signal). Needs one live test — read
 *  the on-screen "Torso Depth" number at the top and bottom of a rep — before
 *  trusting the exact numbers. Also worth watching: in a near-pure head-on
 *  view the 2D shoulder-hip distance itself can compress (most of the torso's
 *  real length runs along the depth axis, not the image plane), which could
 *  make the normalization denominator small and noisy. The floor below
 *  guards divide-by-zero, not jitter. */
function pushupDepthMetric(lm) {
  const lSh = lm[11], rSh = lm[12], lHip = lm[23], rHip = lm[24];
  const shVis  = ((lSh?.visibility ?? 0) + (rSh?.visibility ?? 0)) / 2;
  const hipVis = ((lHip?.visibility ?? 0) + (rHip?.visibility ?? 0)) / 2;
  if (shVis < 0.4 || hipVis < 0.4) return 100; // can't normalize honestly — hold at "up", never fabricate a rep
  const shoulderMid = getMid(lSh, rSh);
  const hipMid = getMid(lHip, rHip);
  const torsoLen = Math.max(getDist(shoulderMid, hipMid), 0.08);
  return ((hipMid.y - shoulderMid.y) / torsoLen) * 100;
}

// ── Exercise Library ──────────────────────────────────────────────────────────
// Each entry:
//   id           – unique string
//   name         – display name
//   keywords     – substrings to match exercise names (lowercase)
//   mode         – 'reps' | 'time'
//   category     – display category
//   color        – accent hex color
//   getAngle     – fn(landmarks[]) → tracking angle (degrees)
//   upThreshold  – angle that marks the "up / extended" position
//   downThreshold– angle that marks the "down / contracted" position
//   direction    – 'down_then_up'  rep counted when below down THEN above up
//               OR 'up_then_down'  rep counted when above up  THEN below down
//   primaryJoint – label shown on screen
//   formCues     – array of coaching tips

export const EXERCISE_LIBRARY = [

  // ──────────────────────────────────────────────────────────────
  // PUSH (upper body push)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'pushup',
    name: 'Push-Up',
    keywords: ['push up', 'push-up', 'pushup', 'push ups'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#ef4444',
    // Finding 1 (2026-08-20): elbow angle is non-monotonic from a head-on
    // camera (foreshortening, not flexion) — replaced with vertical shoulder
    // displacement normalized by torso length. See pushupDepthMetric() above.
    // Elbow angle is no longer read for counting; kept only as a form cue below.
    getAngle: (lm) => pushupDepthMetric(lm),
    upThreshold: 28,    // ⚠️ uncalibrated first pass — shoulders clearly above hip line (top)
    downThreshold: 6,   // ⚠️ uncalibrated first pass — shoulders near hip level (bottom)
    minRepIntervalMs: 450,  // Round 20: fast sets (15+) were dropping reps at 600ms
    direction: 'down_then_up',
    primaryJoint: 'Torso Depth',
    formCues: [
      'Camera can stay in front — keep hips to head in frame the whole rep',
      'Keep back straight — no sagging hips',
      'Lower until chest nearly touches floor',
      'Full lockout at the top counts the rep',
    ],
  },
  {
    id: 'diamond_pushup',
    name: 'Diamond Push-Up',
    keywords: ['diamond push', 'diamond push-up', 'tricep push'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#f97316',
    // Finding 1 (2026-08-20): Round 23's threshold tuning didn't fix the real
    // problem. Field data on this exact set showed elbow angle RISING again at
    // full depth (138 -> 102 -> 131 -> 140) from the head-on tripod — no
    // downThreshold value can work when the signal itself isn't monotonic.
    // Replaced with vertical shoulder displacement normalized by torso length
    // (see pushupDepthMetric() above); elbow angle kept only as a form cue.
    getAngle: (lm) => pushupDepthMetric(lm),
    upThreshold: 28,    // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    downThreshold: 6,   // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    direction: 'down_then_up',
    minRepIntervalMs: 450,
    primaryJoint: 'Torso Depth',
    formCues: ['Hands form a diamond', 'Elbows tight to body', 'Full tricep extension'],
  },
  {
    id: 'wide_pushup',
    name: 'Wide Push-Up',
    keywords: ['wide push', 'wide grip push'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#ef4444',
    // Finding 1 (2026-08-20): same head-on foreshortening problem as the base
    // Push-Up — see pushupDepthMetric() above.
    getAngle: (lm) => pushupDepthMetric(lm),
    upThreshold: 28,    // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    downThreshold: 6,   // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Torso Depth',
    formCues: ['Hands wider than shoulders', 'Chest to floor', 'Squeeze chest at top'],
  },
  {
    id: 'pike_pushup',
    name: 'Pike Push-Up',
    keywords: ['pike push', 'pike push-up'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Push',
    color: '#f97316',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 160,
    downThreshold: 80,
    direction: 'down_then_up',
    primaryJoint: 'Elbow',
    formCues: ['Hips high — inverted V', 'Head toward floor', 'Shoulder press pattern'],
  },
  {
    id: 'decline_pushup',
    name: 'Decline Push-Up',
    keywords: ['decline push', 'feet elevated push'],
    mode: 'reps',
    // Finding 3 (2026-08-20): removed from AI tracking — screenshots show a
    // collapsed/stacked skeleton (elbow readings of 38-48° are anatomically
    // impossible). MediaPipe is trained on upright bodies; an inverted decline
    // position is out of distribution. This is a bad skeleton, not a mistuned
    // threshold — no code fix recovers it. Still selectable/performable via
    // RepTracker's manual tap-to-count mode (trackable: false routes there).
    trackable: false,
    category: 'Push',
    color: '#ef4444',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 160,
    downThreshold: 90,
    direction: 'down_then_up',
    primaryJoint: 'Elbow',
    formCues: ['Feet on elevated surface', 'Upper chest focus', 'Straight body line'],
  },
  {
    id: 'incline_pushup',
    name: 'Incline Push-Up',
    keywords: ['incline push', 'hands elevated push'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#ef4444',
    // Finding 1 (2026-08-20): same head-on foreshortening problem as the base
    // Push-Up — see pushupDepthMetric() above.
    getAngle: (lm) => pushupDepthMetric(lm),
    upThreshold: 28,    // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    downThreshold: 6,   // ⚠️ uncalibrated first pass — see pushupDepthMetric() note
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Torso Depth',
    formCues: ['Hands on elevated surface', 'Great for beginners', 'Lower chest focus'],
  },
  {
    id: 'dip',
    name: 'Dip',
    keywords: ['dip', 'bar dip', 'parallel bar'],
    mode: 'reps',
    trackable: false,
    category: 'Push',
    color: '#f97316',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 160,
    downThreshold: 90,
    direction: 'down_then_up',
    primaryJoint: 'Elbow',
    formCues: ['Elbows to 90°', 'Keep body close to bars', 'Full lockout at top'],
  },
  {
    id: 'tricep_dip',
    name: 'Tricep Dip',
    keywords: ['tricep dip', 'chair dip', 'bench dip'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#f97316',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 150,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Elbow',
    formCues: ['Hips close to chair/bench', 'Lower until 90° elbow angle', 'Full extension at top'],
  },
  {
    id: 'tricep_extension',
    name: 'Tricep Extension',
    keywords: ['tricep extension', 'triceps extension', 'overhead tricep', 'skull crusher'],
    mode: 'reps',
    trackable: true,
    category: 'Push',
    color: '#f97316',
    getAngle: (lm) => {
      // Elbow flexion/extension — same joint chain as a push-up/dip.
      const lVis = (lm[11]?.visibility ?? 0) + (lm[13]?.visibility ?? 0) + (lm[15]?.visibility ?? 0);
      const rVis = (lm[12]?.visibility ?? 0) + (lm[14]?.visibility ?? 0) + (lm[16]?.visibility ?? 0);
      const L = getAngle(lm[11], lm[13], lm[15]);
      const R = getAngle(lm[12], lm[14], lm[16]);
      if (lVis < 1.0) return R;
      if (rVis < 1.0) return L;
      return (L + R) / 2;
    },
    upThreshold: 155,    // arms fully extended (locked out)
    downThreshold: 75,   // elbow bent — forearm lowered
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Elbow',
    formCues: ['Keep upper arms still', 'Bend only at the elbow', 'Full lockout at the top counts the rep', 'Side view tracks best'],
  },
  {
    id: 'handstand_pushup',
    name: 'Handstand Push-Up',
    keywords: ['handstand push', 'hspu'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Push',
    color: '#ef4444',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 160,
    downThreshold: 90,
    direction: 'down_then_up',
    primaryJoint: 'Elbow',
    formCues: ['Wall for support', 'Head toward floor', 'Full shoulder press range'],
  },

  // ──────────────────────────────────────────────────────────────
  // PULL (upper body pull)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'pullup',
    name: 'Pull-Up',
    keywords: ['pull up', 'pull-up', 'pullup', 'pull ups'],
    mode: 'reps',
    trackable: false,
    category: 'Pull',
    color: '#8b5cf6',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 75,
    downThreshold: 160,
    direction: 'up_then_down',
    primaryJoint: 'Elbow',
    formCues: ['Full extension at bottom', 'Chin over bar at top', 'Engage lats throughout'],
  },
  {
    id: 'chinup',
    name: 'Chin-Up',
    keywords: ['chin up', 'chin-up', 'chinup'],
    mode: 'reps',
    trackable: false,
    category: 'Pull',
    color: '#8b5cf6',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 75,
    downThreshold: 160,
    direction: 'up_then_down',
    primaryJoint: 'Elbow',
    formCues: ['Supinated grip (palms toward you)', 'Chin above bar', 'Bicep emphasis'],
  },
  {
    id: 'australian_row',
    name: 'Australian Row',
    keywords: ['australian row', 'inverted row', 'body row', 'horizontal pull'],
    mode: 'reps',
    trackable: false,
    category: 'Pull',
    color: '#7c3aed',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 80,
    downThreshold: 160,
    direction: 'up_then_down',
    primaryJoint: 'Elbow',
    formCues: ['Keep body rigid', 'Pull chest to bar', 'Squeeze shoulder blades'],
  },
  {
    id: 'muscle_up',
    name: 'Muscle-Up',
    keywords: ['muscle up', 'muscle-up'],
    mode: 'reps',
    trackable: false,
    category: 'Pull',
    color: '#8b5cf6',
    getAngle: (lm) => elbowAngle(lm),
    upThreshold: 160,
    downThreshold: 75,
    direction: 'up_then_down',
    primaryJoint: 'Elbow',
    formCues: ['Explosive pull', 'Transition above bar', 'Press out at top'],
  },

  // ──────────────────────────────────────────────────────────────
  // LEGS
  // ──────────────────────────────────────────────────────────────
  {
    id: 'squat',
    name: 'Squat',
    keywords: ['squat', 'air squat', 'bodyweight squat'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => kneeAngle(lm),
    // Round 14: loosened for tripod/angled cameras — 85° required a below-parallel
    // squat as READ BY THE CAMERA; off-axis views read shallower, so honest
    // squats weren't counted. minRepIntervalMs still blocks bounce double-counts.
    upThreshold: 155,    // legs extended at top
    downThreshold: 100,  // knees clearly bent ~parallel — counts honest depth at an angle
    minRepIntervalMs: 700, // 700ms min between reps prevents bounce double-counting
    direction: 'down_then_up',
    primaryJoint: 'Knee',
    formCues: [
      'Place phone to your SIDE at hip height for best tracking',
      'Break parallel — thighs below 90° for a full rep',
      'Knees track over toes — no caving inward',
      'Drive through heels to stand up',
    ],
  },
  {
    id: 'jump_squat',
    name: 'Jump Squat',
    keywords: ['jump squat', 'squat jump', 'explosive squat'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#16a34a',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 160,
    downThreshold: 100,
    direction: 'down_then_up',
    primaryJoint: 'Knee',
    formCues: ['Explode upward', 'Land softly with bent knees', 'Absorb impact through hips'],
  },
  {
    id: 'sumo_squat',
    name: 'Sumo Squat',
    keywords: ['sumo squat', 'wide squat', 'plie squat'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 155,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 700,
    primaryJoint: 'Knee',
    formCues: ['Wide stance', 'Toes pointed out 45°', 'Inner thigh emphasis'],
  },
  {
    id: 'lunge',
    name: 'Lunge',
    keywords: ['lunge', 'forward lunge', 'walking lunge'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#22c55e',
    // Round 20: use the SMALLER knee angle — symmetric, so crossed/swapped
    // landmarks at 3/4 camera views don't matter, and EACH leg's lunge (left
    // or right) dips the metric → alternating lunges count 1 rep per leg.
    getAngle: (lm) => Math.min(getAngle(lm[23], lm[25], lm[27]), getAngle(lm[24], lm[26], lm[28])),
    upThreshold: 155,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Front Knee',
    formCues: ['Front knee behind toes', 'Back knee near floor', 'Left = 1 rep, right = 1 rep', 'Upright torso'],
  },
  {
    id: 'reverse_lunge',
    name: 'Reverse Lunge',
    keywords: ['reverse lunge', 'step back lunge'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#22c55e',
    // Round 20: min-knee metric — see Lunge note (alternating-leg + crossed-landmark proof)
    getAngle: (lm) => Math.min(getAngle(lm[23], lm[25], lm[27]), getAngle(lm[24], lm[26], lm[28])),
    upThreshold: 155,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 600,
    primaryJoint: 'Front Knee',
    formCues: ['Step backward', 'Control the descent', 'Left = 1 rep, right = 1 rep', 'Push through front heel'],
  },
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgarian Split Squat',
    keywords: ['bulgarian', 'split squat', 'rear foot elevated'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#15803d',
    getAngle: (lm) => workingKneeAngle(lm),
    upThreshold: 155,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 700,
    primaryJoint: 'Front Knee',
    formCues: ['Rear foot elevated on bench', 'Torso upright', 'Deep range of motion'],
  },
  {
    id: 'step_up',
    name: 'Step Up',
    keywords: ['step up', 'box step'],
    mode: 'reps',
    trackable: true,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => workingKneeAngle(lm),
    upThreshold: 155,
    downThreshold: 100,
    direction: 'down_then_up',
    minRepIntervalMs: 700,
    primaryJoint: 'Knee',
    formCues: ['Step onto elevation', 'Drive through heel', 'Full hip extension at top'],
  },
  {
    id: 'glute_bridge',
    name: 'Glute Bridge',
    keywords: ['glute bridge', 'hip thrust', 'bridge'],
    mode: 'reps',
    trackable: false,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => {
      // Hip angle: shoulder → hip → knee
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 160,
    downThreshold: 100,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Squeeze glutes at top', 'Feet flat', 'Full hip extension'],
  },
  {
    id: 'donkey_kick',
    name: 'Donkey Kick',
    keywords: ['donkey kick'],
    mode: 'reps',
    trackable: false,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => {
      // Hip extension: shoulder → hip → knee
      return getAngle(lm[11], lm[23], lm[25]);
    },
    upThreshold: 160,
    downThreshold: 90,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Keep knee at 90°', 'Kick heel toward ceiling', 'Squeeze glute at top'],
  },
  {
    id: 'calf_raise',
    name: 'Calf Raise',
    keywords: ['calf raise', 'calf raises'],
    mode: 'reps',
    trackable: false,
    category: 'Legs',
    color: '#4ade80',
    getAngle: (lm) => {
      const L = getAngle(lm[25], lm[27], lm[31]);
      const R = getAngle(lm[26], lm[28], lm[32]);
      return (L + R) / 2;
    },
    upThreshold: 130,
    downThreshold: 90,
    direction: 'up_then_down',
    primaryJoint: 'Ankle',
    formCues: ['Full range at top', 'Controlled descent', 'Hold at peak contraction'],
  },
  {
    id: 'wall_sit',
    name: 'Wall Sit',
    keywords: ['wall sit'],
    mode: 'time',
    trackable: false,
    category: 'Legs',
    color: '#22c55e',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 110,
    downThreshold: 70,
    primaryJoint: 'Knee',
    formCues: ['Knees at 90°', 'Back flat on wall', 'Thighs parallel to floor'],
  },
  {
    id: 'pistol_squat',
    name: 'Pistol Squat',
    keywords: ['pistol squat', 'single leg squat'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Legs',
    color: '#16a34a',
    // Finding 2 (2026-08-20): workingKneeAngle() picks the more-VISIBLE leg,
    // which is right for Bulgarian Split Squat (rear leg occluded behind on a
    // bench) but wrong here — in a pistol squat BOTH legs are fully visible
    // (one straight forward, one bent under), so visibility scores are nearly
    // tied and the tie-break defaulted to the left/extended leg (confirmed by
    // field data: near-constant 180/173/174° = the straight leg, not the
    // working one). Use min(left, right) instead — the extended leg stays
    // ~155-180° throughout, so the smaller angle always isolates the bent,
    // weight-bearing leg regardless of which physical leg is forward.
    getAngle: (lm) => Math.min(getAngle(lm[23], lm[25], lm[27]), getAngle(lm[24], lm[26], lm[28])),
    upThreshold: 155,
    downThreshold: 90,
    direction: 'down_then_up',
    minRepIntervalMs: 900,
    primaryJoint: 'Working Knee',
    formCues: ['One leg extended forward', 'Full depth squat', 'Control the descent'],
  },

  // ──────────────────────────────────────────────────────────────
  // CORE
  // ──────────────────────────────────────────────────────────────
  {
    id: 'situp',
    name: 'Sit-Up',
    keywords: ['sit up', 'sit-up', 'situp'],
    mode: 'reps',
    trackable: true,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    // up_then_down: must reach SEATED position (small angle) THEN return to FLAT (large angle)
    // This prevents counting every small movement — requires a full sit-up cycle
    upThreshold: 70,      // fully seated/contracted (hip angle small)
    downThreshold: 140,   // lying flat again (hip angle large) — rep counted here
    direction: 'up_then_down',
    minRepIntervalMs: 1200,
    primaryJoint: 'Hip',
    formCues: ['Side view · feet flat', 'Touch elbows to knees at the top', 'Rep counts on the way BACK DOWN'],
  },
  {
    id: 'crunch',
    name: 'Crunch',
    keywords: ['crunch'],
    mode: 'reps',
    trackable: true,
    category: 'Core',
    color: '#ca8a04',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    // up_then_down: crunch UP (small angle) then back DOWN (large angle) = 1 rep
    upThreshold: 80,      // crunched position (contracted)
    downThreshold: 115,   // lowered back toward flat
    direction: 'up_then_down',
    minRepIntervalMs: 700,
    primaryJoint: 'Hip',
    formCues: ['Short range of motion', 'Contract abs hard', 'Chin slightly off chest'],
  },
  {
    id: 'leg_raise',
    name: 'Leg Raise',
    keywords: ['leg raise', 'leg lift', 'hanging leg raise'],
    mode: 'reps',
    trackable: true,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 75,      // legs raised (hip angle small)
    downThreshold: 155,   // legs fully lowered (hip angle large) — rep counted here
    direction: 'up_then_down',
    minRepIntervalMs: 1000,
    primaryJoint: 'Hip',
    formCues: ['Press lower back down', 'Keep legs straight', 'Rep counts when legs return to floor'],
  },
  {
    id: 'plank',
    name: 'Plank',
    keywords: ['plank'],
    mode: 'time',
    trackable: false,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[27]);
      const R = getAngle(lm[12], lm[24], lm[28]);
      return (L + R) / 2;
    },
    primaryJoint: 'Body Alignment',
    formCues: ['Straight line head to heels', 'Squeeze core + glutes', "Don't sag hips"],
  },
  {
    id: 'side_plank',
    name: 'Side Plank',
    keywords: ['side plank'],
    mode: 'time',
    trackable: false,
    category: 'Core',
    color: '#d97706',
    getAngle: (lm) => getAngle(lm[11], lm[23], lm[27]),
    primaryJoint: 'Body Alignment',
    formCues: ['Stack feet', 'Hips elevated', 'Straight line head to feet'],
  },
  {
    id: 'bicycle_crunch',
    name: 'Bicycle Crunch',
    keywords: ['bicycle crunch', 'bicycle'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => getAngle(lm[23], lm[25], lm[27]),
    upThreshold: 70,
    downThreshold: 140,
    direction: 'down_then_up',
    primaryJoint: 'Knee',
    formCues: ['Opposite elbow to knee', 'Fully extend other leg', 'Control the rotation'],
  },
  {
    id: 'mountain_climber',
    name: 'Mountain Climber',
    keywords: ['mountain climber', 'mountain climbers'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Core',
    color: '#ca8a04',
    // ── Why the old angle-based approach failed ──────────────────────────────
    // Mountain climbers are done in a horizontal plank position. MediaPipe is
    // trained mostly on upright humans, so shoulder→hip→knee angles become
    // unreliable when the body is nearly horizontal to the camera.
    //
    // New approach: track how HIGH each knee is relative to its own hip.
    // In MediaPipe, Y=0 is the TOP of the frame and Y=1 is the BOTTOM.
    // • Knee at rest (extended back):  kneeY > hipY  → hip.y - knee.y is NEGATIVE
    // • Knee driven toward chest:      kneeY < hipY  → hip.y - knee.y is POSITIVE
    // We take the MAX of left/right so either leg driving counts.
    // ────────────────────────────────────────────────────────────────────────
    getAngle: (lm) => {
      const L = ((lm[23]?.y ?? 0) - (lm[25]?.y ?? 0)) * 300; // left hip.y − left knee.y
      const R = ((lm[24]?.y ?? 0) - (lm[26]?.y ?? 0)) * 300; // right hip.y − right knee.y
      return Math.max(L, R); // whichever knee is more driven up
    },
    // up_then_down logic:
    //   stage='up'  when metric ≤ -18  → both knees extended, nobody driven yet
    //   rep counted when metric ≥  10  → a knee has risen clearly above hip level
    upThreshold: -12,    // more forgiving rest (both knees extended)
    downThreshold: 8,    // slightly lower trigger for knee drive
    direction: 'up_then_down',
    minRepIntervalMs: 300,
    primaryJoint: 'Knee Drive',
    formCues: [
      'Drive each knee toward your chest alternately',
      'Keep hips level — no bouncing',
      'Front-facing camera works best for this exercise',
      'Fast pace is fine — each knee drive counts as one rep',
    ],
  },
  {
    id: 'flutter_kick',
    name: 'Flutter Kick',
    keywords: ['flutter kick', 'flutter kicks'],
    mode: 'reps',
    trackable: false,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => getAngle(lm[23], lm[25], lm[27]),
    upThreshold: 155,
    downThreshold: 130,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Small rapid alternating kicks', 'Lower back pressed down', 'Core engaged'],
  },
  {
    id: 'dead_bug',
    name: 'Dead Bug',
    keywords: ['dead bug'],
    mode: 'reps',
    trackable: false,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 75,
    downThreshold: 160,
    direction: 'up_then_down',
    primaryJoint: 'Hip',
    formCues: ['Lower back flat on floor', 'Opposite arm + leg extend', 'Slow and controlled'],
  },
  {
    id: 'hollow_body_hold',
    name: 'Hollow Body Hold',
    keywords: ['hollow body', 'hollow hold'],
    mode: 'time',
    trackable: false,
    category: 'Core',
    color: '#ca8a04',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    primaryJoint: 'Hip',
    formCues: ['Lower back pressed to floor', 'Arms overhead', 'Feet elevated 6 inches'],
  },
  {
    id: 'v_up',
    name: 'V-Up',
    keywords: ['v up', 'v-up', 'jackknife'],
    mode: 'reps',
    trackable: false,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 60,
    downThreshold: 150,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Lift arms and legs simultaneously', 'Touch feet at top', 'Lower with control'],
  },
  {
    id: 'russian_twist',
    name: 'Russian Twist',
    keywords: ['russian twist'],
    mode: 'reps',
    trackable: false,
    category: 'Core',
    color: '#eab308',
    getAngle: (lm) => getAngle(lm[11], lm[23], lm[25]),
    upThreshold: 55,
    downThreshold: 95,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Lean back 45°', 'Rotate side to side', 'Feet off floor for difficulty'],
  },

  // ──────────────────────────────────────────────────────────────
  // FULL BODY / CARDIO
  // ──────────────────────────────────────────────────────────────
  {
    id: 'burpee',
    name: 'Burpee',
    keywords: ['burpee', 'burpees'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Full Body',
    color: '#06b6d4',
    // ── Burpee tracking design ────────────────────────────────────────────────
    // Burpees have 5 phases: stand → squat → plank → push-up → jump back up.
    // The rep is COMPLETE when the person returns to upright after the plank.
    //
    // Metric: normalized hip position as a fraction of body height.
    //   • bodyH = ankleY − shoulderY  (vertical span of the visible body)
    //   • metric = (hipY − shoulderY) / bodyH × 100
    //   • Standing upright: hips are ~50–70% down the body span → metric ≈ 50–70
    //   • In plank/horizontal: hips barely separate from shoulders → metric ≈ 0–20
    //   • Crouching: intermediate → metric ≈ 30–50
    //
    // We normalize by body height so the tracking is independent of how far the
    // phone is placed from the subject (camera distance doesn't affect the ratio).
    //
    // Count strategy (up_then_down):
    //   stage='up'  when metric ≤ 20   → person reached plank / horizontal position
    //   rep counted when metric ≥ 60   → person is fully upright again after plank
    // This counts 1 rep ONLY after a full down-and-back-up cycle.
    // ────────────────────────────────────────────────────────────────────────
    getAngle: (lm) => {
      const shdY = getMid(lm[11], lm[12])?.y ?? 0.35;
      const hipY = getMid(lm[23], lm[24])?.y ?? 0.60;
      const ankY = getMid(lm[27], lm[28])?.y ?? 0.90;
      const bodyH = Math.max(ankY - shdY, 0.15); // clamp to avoid divide-by-zero
      return Math.max((hipY - shdY) / bodyH, 0) * 100;
    },
    upThreshold: 20,    // plank/floor: hips near shoulder level
    downThreshold: 60,  // fully upright: hips 60%+ down from shoulders toward feet
    direction: 'up_then_down', // go to PLANK (low) → stand/jump (high) → rep counted at top
    minRepIntervalMs: 1800,    // burpees take at least 1.8 s — prevents partial-movement counting
    primaryJoint: 'Body Uprightness',
    formCues: [
      'SIDE VIEW gives the best tracking — place phone at hip height to your side',
      'Full rep = squat → plank → push-up → jump up',
      'Rep is counted when you return to fully upright after the plank',
      'Land softly with bent knees after the jump',
    ],
  },
  {
    id: 'jumping_jack',
    name: 'Jumping Jack',
    keywords: ['jumping jack', 'jumping jacks', 'star jump'],
    mode: 'reps',
    trackable: true,
    category: 'Full Body',
    color: '#0ea5e9',
    // Arm angle at shoulder: elbow → shoulder → hip
    //   • Arms at sides (closed): ~20–40°
    //   • Arms overhead (open):   ~150–170°
    // Use the better-visible arm so a partially-cropped frame still counts.
    // down_then_up: open arms first (stage='up' at 130°+) then close → rep counted.
    getAngle: (lm) => {
      const lVis = (lm[13]?.visibility ?? 0) + (lm[11]?.visibility ?? 0) + (lm[23]?.visibility ?? 0);
      const rVis = (lm[14]?.visibility ?? 0) + (lm[12]?.visibility ?? 0) + (lm[24]?.visibility ?? 0);
      const L = getAngle(lm[13], lm[11], lm[23]);
      const R = getAngle(lm[14], lm[12], lm[24]);
      if (lVis < 1.2) return R;
      if (rVis < 1.2) return L;
      return (L + R) / 2;
    },
    upThreshold: 120,   // Round 20: widened — fast jacks at reduced frame rates missed the extremes
    downThreshold: 55,
    direction: 'down_then_up',
    minRepIntervalMs: 250,
    primaryJoint: 'Shoulder',
    formCues: [
      'Front-facing camera is ideal for jumping jacks',
      'Raise arms until hands meet overhead for best detection',
      'Keep rhythm — each open+close = one rep',
      'Land with feet shoulder-width apart on the open',
    ],
  },
  {
    id: 'high_knee',
    name: 'High Knee',
    keywords: ['high knee', 'high knees'],
    mode: 'reps',
    trackable: true,
    category: 'Full Body',
    color: '#06b6d4',
    // Track BOTH knees — take the minimum (most-raised knee, smallest angle)
    // Standing: both angles ~160–170° → min ~160°
    // Left knee raised to 80°: L=80, R=160 → min=80 → count
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return Math.min(L, R);
    },
    upThreshold: 150,    // both knees down/extended (standing still)
    downThreshold: 90,   // one knee clearly driven to hip height
    direction: 'down_then_up',
    minRepIntervalMs: 400,
    primaryJoint: 'Hip',
    formCues: ['Drive knees to hip height', 'Pump arms', 'Stay on balls of feet', 'Front camera works best'],
  },
  {
    id: 'butt_kicker',
    name: 'Butt Kicker',
    keywords: ['butt kicker', 'butt kickers', 'heel kick'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Full Body',
    color: '#06b6d4',
    // Track BOTH knees — whichever heel is closest to glute (smallest angle)
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return Math.min(L, R);
    },
    upThreshold: 70,     // heel near glute (knee bent sharply = small angle)
    downThreshold: 145,  // leg extended back down
    direction: 'up_then_down',
    minRepIntervalMs: 350,
    primaryJoint: 'Knee',
    formCues: ['Kick heels to glutes', 'Keep knees down', 'Light on feet', 'Side view works best'],
  },
  {
    id: 'inchworm',
    name: 'Inchworm',
    keywords: ['inchworm'],
    mode: 'reps',
    trackable: false,
    category: 'Full Body',
    color: '#0284c7',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 60,
    downThreshold: 145,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Walk hands out to plank', 'Keep legs as straight as possible', 'Walk feet back to hands'],
  },
  {
    id: 'bear_crawl',
    name: 'Bear Crawl',
    keywords: ['bear crawl'],
    mode: 'reps',
    trackable: false,
    category: 'Full Body',
    color: '#06b6d4',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 100,
    downThreshold: 60,
    direction: 'down_then_up',
    primaryJoint: 'Knee',
    formCues: ['Knees hover 1 inch off floor', 'Opposite hand + foot move together', 'Keep back flat'],
  },
  {
    id: 'box_jump',
    name: 'Box Jump',
    keywords: ['box jump'],
    mode: 'reps',
    trackable: false,
    category: 'Full Body',
    color: '#06b6d4',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 160,
    downThreshold: 95,
    direction: 'down_then_up',
    primaryJoint: 'Knee',
    formCues: ['Load hips before jumping', 'Land softly with bent knees', 'Step down after each jump'],
  },

  // ──────────────────────────────────────────────────────────────
  // SHOULDER / UPPER BODY MOBILITY
  // ──────────────────────────────────────────────────────────────
  {
    id: 'shoulder_tap',
    name: 'Shoulder Tap',
    keywords: ['shoulder tap', 'shoulder taps'],
    mode: 'reps',
    trackable: false,
    category: 'Core',
    color: '#ec4899',
    getAngle: (lm) => {
      // Track wrist elevation relative to shoulder
      const wristY = lm[15]?.y ?? 0;
      const shdY = lm[11]?.y ?? 0;
      return Math.abs(wristY - shdY) * 250;
    },
    upThreshold: 30,
    downThreshold: 60,
    direction: 'up_then_down',
    primaryJoint: 'Wrist',
    formCues: ['Minimal hip rotation', 'Hold plank position', 'Controlled movement'],
  },
  {
    id: 'arm_circle',
    name: 'Arm Circle',
    keywords: ['arm circle', 'arm circles'],
    mode: 'reps',
    trackable: 'experimental',
    category: 'Mobility',
    color: '#ec4899',
    // ── Why the old elbow→shoulder→hip angle failed ──────────────────────────
    // The elbow→shoulder→hip angle only captures whether the arm is up or down.
    // For small wrist circles (forearm rotation) the angle barely moves at all.
    // Even for full shoulder circles the old thresholds (130/60) OVERLAPPED:
    // any angle between 60–130 satisfied both conditions every single frame →
    // hundreds of reps per second.
    //
    // New approach: track wrist POSITION relative to shoulder using simple Y-delta.
    // In MediaPipe Y=0 is the top of the frame, Y=1 is the bottom.
    // • Arm at rest/down: wrist is BELOW shoulder → shoulder.y − wrist.y is NEGATIVE
    // • Arm overhead:     wrist is ABOVE shoulder → shoulder.y − wrist.y is POSITIVE
    // We use whichever arm is more visible so one-arm circles also count.
    // ────────────────────────────────────────────────────────────────────────
    getAngle: (lm) => {
      const lVis = (lm[11]?.visibility ?? 0) + (lm[15]?.visibility ?? 0);
      const rVis = (lm[12]?.visibility ?? 0) + (lm[16]?.visibility ?? 0);
      const L = ((lm[11]?.y ?? 0) - (lm[15]?.y ?? 0)) * 200; // left:  shoulder.y − wrist.y
      const R = ((lm[12]?.y ?? 0) - (lm[16]?.y ?? 0)) * 200; // right: shoulder.y − wrist.y
      return lVis >= rVis ? L : R;
    },
    // up_then_down logic:
    //   stage='up'  when metric ≤ -15  → wrist well BELOW shoulder (arm at side/bottom)
    //   rep counted when metric ≥  18  → wrist clearly ABOVE shoulder (arm overhead = top of circle)
    // One rep counted per complete revolution through the top position.
    upThreshold: -15,
    downThreshold: 18,
    direction: 'up_then_down',
    minRepIntervalMs: 600,
    primaryJoint: 'Wrist vs Shoulder',
    formCues: [
      'Make large circles — raise arm fully overhead each revolution',
      'Front-facing camera works great for arm circles',
      'Wrist must pass ABOVE shoulder level to count a rep',
      'Do both directions — backward circles use the same count',
    ],
  },
  {
    id: 'pike_hold',
    name: 'L-Sit / Pike Hold',
    keywords: ['pike hold', 'l-sit', 'l sit', 'pike'],
    mode: 'time',
    trackable: false,
    category: 'Core',
    color: '#ec4899',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    primaryJoint: 'Hip',
    formCues: ['Legs parallel to ground', 'Arms fully straight', 'Compress hip flexors'],
  },

  // ──────────────────────────────────────────────────────────────
  // STRETCHES / WARMUP
  // ──────────────────────────────────────────────────────────────
  {
    id: 'hip_circle',
    name: 'Hip Circle',
    keywords: ['hip circle', 'hip circles', 'hip rotation'],
    mode: 'reps',
    trackable: false,
    category: 'Mobility',
    color: '#a855f7',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 130,
    downThreshold: 80,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Full circular motion', 'Keep feet planted', 'Rotate both directions'],
  },
  {
    id: 'cat_cow',
    name: 'Cat-Cow',
    keywords: ['cat cow', 'cat-cow'],
    mode: 'reps',
    trackable: false,
    category: 'Mobility',
    color: '#a855f7',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[27]);
      const R = getAngle(lm[12], lm[24], lm[28]);
      return (L + R) / 2;
    },
    upThreshold: 175,
    downThreshold: 155,
    direction: 'down_then_up',
    primaryJoint: 'Spine',
    formCues: ['Exhale arch (cat)', 'Inhale sag (cow)', 'Slow controlled movements'],
  },
  {
    id: 'quad_stretch',
    name: 'Quad Stretch',
    keywords: ['quad stretch', 'quadricep stretch'],
    mode: 'time',
    trackable: false,
    category: 'Mobility',
    color: '#a855f7',
    getAngle: (lm) => {
      const L = getAngle(lm[23], lm[25], lm[27]);
      const R = getAngle(lm[24], lm[26], lm[28]);
      return Math.min(L, R);
    },
    primaryJoint: 'Knee',
    formCues: ['Pull foot to glute', 'Keep knees together', 'Stand tall'],
  },
  {
    id: 'toe_touch',
    name: 'Toe Touch',
    keywords: ['toe touch', 'standing toe touch'],
    mode: 'reps',
    trackable: false,
    category: 'Mobility',
    color: '#a855f7',
    getAngle: (lm) => {
      const L = getAngle(lm[11], lm[23], lm[25]);
      const R = getAngle(lm[12], lm[24], lm[26]);
      return (L + R) / 2;
    },
    upThreshold: 160,
    downThreshold: 60,
    direction: 'down_then_up',
    primaryJoint: 'Hip',
    formCues: ['Straight legs', 'Reach for toes', 'Slow stretch'],
  },
];

// ── Lookup Helpers ────────────────────────────────────────────────────────────

/**
 * Match an exercise name string to the library config.
 * Falls back to Push-Up if no match found.
 */
export function matchExercise(exerciseName) {
  if (!exerciseName) return EXERCISE_LIBRARY[0];
  const lower = exerciseName.toLowerCase().trim();

  // Keyword match — pick the LONGEST matching keyword across the whole library
  // so more specific names (e.g. "jump squat") win over shorter substrings
  // that happen to be contained within them (e.g. "squat").
  let best = null;
  let bestLen = 0;
  for (const ex of EXERCISE_LIBRARY) {
    for (const kw of ex.keywords) {
      if (lower.includes(kw) && kw.length > bestLen) {
        best = ex;
        bestLen = kw.length;
      }
    }
  }
  if (best) return best;

  // Partial id match
  for (const ex of EXERCISE_LIBRARY) {
    if (lower.includes(ex.id.replace(/_/g, ' '))) return ex;
  }

  return EXERCISE_LIBRARY[0]; // default: push-up
}

/** Get all exercises grouped by category */
export function getExercisesByCategory() {
  const groups = {};
  for (const ex of EXERCISE_LIBRARY) {
    if (!groups[ex.category]) groups[ex.category] = [];
    groups[ex.category].push(ex);
  }
  return groups;
}

// ── Rep Counter ───────────────────────────────────────────────────────────────

/**
 * Stateful rep counter for a single exercise.
 *
 * direction: 'down_then_up'
 *   - stage resets to 'up'  when angle >= upThreshold
 *   - rep counted           when angle <= downThreshold AND stage was 'up'
 *
 * direction: 'up_then_down'
 *   - stage resets to 'up'  when angle <= upThreshold
 *   - rep counted           when angle >= downThreshold AND stage was 'up'
 */
export class RepCounter {
  constructor(exerciseConfig) {
    this.config = exerciseConfig;
    this.stage = null;   // 'up' | 'down' | null
    this.count = 0;
    this.lastRepTime = 0; // timestamp of last counted rep (ms) — prevents double-counting
  }

  /**
   * Feed in current landmarks, get back { count, angle, stage, repCounted }
   */
  update(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { count: this.count, angle: 0, stage: this.stage, repCounted: false };
    }

    const angle = this.config.getAngle(landmarks);
    const { upThreshold, downThreshold, direction } = this.config;
    // Minimum ms between reps: use per-exercise value or global default (350ms)
    const minInterval = this.config.minRepIntervalMs ?? 350;
    let repCounted = false;

    const now = performance.now();

    if (direction === 'down_then_up') {
      if (angle >= upThreshold) {
        this.stage = 'up';
      }
      if (angle <= downThreshold && this.stage === 'up') {
        this.stage = 'down';
        if (now - this.lastRepTime >= minInterval) {
          this.count++;
          repCounted = true;
          this.lastRepTime = now;
        }
      }
    } else if (direction === 'up_then_down') {
      if (angle <= upThreshold) {
        this.stage = 'up';
      }
      if (angle >= downThreshold && this.stage === 'up') {
        this.stage = 'down';
        if (now - this.lastRepTime >= minInterval) {
          this.count++;
          repCounted = true;
          this.lastRepTime = now;
        }
      }
    }

    return { count: this.count, angle, stage: this.stage, repCounted };
  }

  setCount(n) {
    this.count = n;
  }

  reset() {
    this.stage = null;
    this.count = 0;
    this.lastRepTime = 0;
  }
}
