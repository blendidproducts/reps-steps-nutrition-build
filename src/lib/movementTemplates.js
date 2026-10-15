/**
 * movementTemplates.js — the Movement Trainer engine (doc 17 §1).
 *
 * The user records 2-3 demo reps of ANY movement; this learns which joints
 * ARE the movement and turns that into an exercise config the existing
 * RepCounter can count, glitch gates and all.
 *
 *   extractFeatures(lm, scale)   one frame -> body-relative feature vector
 *   learnMovement(frames)        demo recording -> template (or a refusal)
 *   makeCustomExerciseConfig(t)  template -> config for new RepCounter(config)
 *   MovementRecorder             wait-for-still -> GO -> record -> auto-stop
 *
 * Pure functions, no React, no camera — tested on synthetic 3D bodies in
 * _scratch/test-movement-trainer.cjs before any UI exists.
 *
 * Sourcing rule: a custom movement has NO external standard. It is counted
 * against the user's own demo and must never feed a fitness test or a
 * leaderboard (the config carries `custom: true` so callers can check).
 */
import { getAngle, getMid, getDist, median } from "./exerciseTracking";

const VIS = 0.5;
const vis = (p) => (p?.visibility ?? 0) >= VIS;

/**
 * Feature catalogue. `type` decides how the rest value is found live:
 *   angle - joint angle in degrees; camera-distance invariant, demo rest reused
 *   rel   - a height measured against another body point (wrist vs shoulder);
 *           invariant to where you stand, demo rest reused
 *   abs   - a height against the FRAME (hips, shoulders); depends on where you
 *           stand, so the rest value is re-learned at the start of every set
 * `side` pairs left/right so a two-sided movement averages both sides.
 */
export const FEATURES = [
  { key: "kneeL",     label: "left knee",       type: "angle", side: "L", pair: "kneeR",     pts: [23, 25, 27] },
  { key: "kneeR",     label: "right knee",      type: "angle", side: "R", pair: "kneeL",     pts: [24, 26, 28] },
  { key: "hipL",      label: "left hip",        type: "angle", side: "L", pair: "hipR",      pts: [11, 23, 25] },
  { key: "hipR",      label: "right hip",       type: "angle", side: "R", pair: "hipL",      pts: [12, 24, 26] },
  { key: "elbowL",    label: "left elbow",      type: "angle", side: "L", pair: "elbowR",    pts: [11, 13, 15] },
  { key: "elbowR",    label: "right elbow",     type: "angle", side: "R", pair: "elbowL",    pts: [12, 14, 16] },
  { key: "shoulderL", label: "left shoulder",   type: "angle", side: "L", pair: "shoulderR", pts: [13, 11, 23] },
  { key: "shoulderR", label: "right shoulder",  type: "angle", side: "R", pair: "shoulderL", pts: [14, 12, 24] },
  { key: "torso",     label: "torso lean",      type: "angle", side: null, pair: null,       pts: [11, 12, 23, 24] },
  { key: "wristL",    label: "left hand height",  type: "rel", side: "L", pair: "wristR",    pts: [11, 15] },
  { key: "wristR",    label: "right hand height", type: "rel", side: "R", pair: "wristL",    pts: [12, 16] },
  { key: "hipY",      label: "hip height",      type: "abs", side: null, pair: null,       pts: [23, 24] },
  { key: "shoulderY", label: "shoulder height", type: "abs", side: null, pair: null,       pts: [11, 12] },
];
const FEAT = Object.fromEntries(FEATURES.map((f) => [f.key, f]));

/** Smallest change that counts as a real movement, per feature type.
 *  Angles in degrees; heights in hundredths of a torso. */
const MIN_RANGE = { angle: 20, rel: 20, abs: 12 };
/** Joint angles are preferred when they're clean: distance-invariant, and a
 *  rep at half range reads half (heights move with the cosine). */
const TYPE_WEIGHT = { angle: 1.6, rel: 1.0, abs: 0.9 };

/** Body scale that survives both camera placements (same rule as
 *  exerciseTracking's bodyScale): torso length or 1.35 x shoulder width,
 *  whichever is larger. Null when the shoulders aren't seen. */
export function bodyScale(lm) {
  if (!vis(lm[11]) || !vis(lm[12])) return null;
  const shW = getDist(lm[11], lm[12]) * 1.35;
  const torso = vis(lm[23]) && vis(lm[24]) ? getDist(getMid(lm[11], lm[12]), getMid(lm[23], lm[24])) : 0;
  const s = Math.max(shW, torso);
  return s > 0.03 ? s : null;
}

function featureValue(f, lm, scale) {
  if (!f.pts.every((i) => vis(lm[i]))) return NaN;
  const p = f.pts.map((i) => lm[i]);
  switch (f.key) {
    case "torso": {
      const sh = getMid(p[0], p[1]), hip = getMid(p[2], p[3]);
      // Angle of hip->shoulder from vertical, in degrees. 0 = upright.
      return Math.atan2(Math.abs(sh.x - hip.x), Math.max(1e-6, hip.y - sh.y)) * 180 / Math.PI;
    }
    case "wristL": case "wristR":
      return scale ? ((p[0].y - p[1].y) / scale) * 100 : NaN;       // up = positive
    case "hipY": case "shoulderY":
      return scale ? (-getMid(p[0], p[1]).y / scale) * 100 : NaN;   // up = positive
    default:
      return getAngle(p[0], p[1], p[2]);
  }
}

/** One frame -> { key: value } (NaN where the landmarks aren't seen). */
export function extractFeatures(lm, scale) {
  const out = {};
  for (const f of FEATURES) out[f.key] = featureValue(f, lm, scale);
  return out;
}

// ── small numeric helpers ────────────────────────────────────────────────────
const finite = (a) => a.filter((v) => Number.isFinite(v));
const mean = (a) => { const f = finite(a); return f.length ? f.reduce((s, v) => s + v, 0) / f.length : NaN; };
function smooth3(a) {          // median of 3, NaN-tolerant
  return a.map((_, i) => {
    const w = finite([a[i - 1], a[i], a[i + 1]]);
    return w.length ? median(w) : NaN;
  });
}
function fillGaps(a) {         // hold-last over short dropouts so segmentation isn't broken
  const out = a.slice(); let last = NaN;
  for (let i = 0; i < out.length; i++) { if (Number.isFinite(out[i])) last = out[i]; else out[i] = last; }
  return out;
}
function corr(a, b) {
  const n = Math.min(a.length, b.length); const xs = [], ys = [];
  for (let i = 0; i < n; i++) if (Number.isFinite(a[i]) && Number.isFinite(b[i])) { xs.push(a[i]); ys.push(b[i]); }
  if (xs.length < 5) return 0;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/**
 * Split a 0..1 excursion trace into reps: up past `hi`, back below `lo`.
 * Hysteresis, not a single line, so wobble at the threshold can't double-count.
 * Returns [{ start, peak, end, peakValue }] in frame indices.
 */
export function segmentReps(x, hi = 0.5, lo = 0.2) {
  const reps = []; let inRep = false, start = 0, peak = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]; if (!Number.isFinite(v)) continue;
    if (!inRep && v >= hi) {
      inRep = true; peak = i;
      start = i; while (start > 0 && Number.isFinite(x[start - 1]) && x[start - 1] > lo) start--;
    } else if (inRep) {
      if (v > x[peak]) peak = i;
      if (v <= lo) { reps.push({ start, peak, end: i, peakValue: x[peak] }); inRep = false; }
    }
  }
  return reps;
}

/**
 * Learn a movement from a demo.
 *   frames: [{ t: ms, lm: landmarks[33] }], starting in the still start pose
 *   (MovementRecorder guarantees that: it only says GO once you're still).
 * Returns { ok: true, template } or { ok: false, reason, message }.
 */
export function learnMovement(frames, { restMs = 400 } = {}) {
  if (!Array.isArray(frames) || frames.length < 10) {
    return { ok: false, reason: "too_short", message: "That recording was too short. Do 2-3 full reps." };
  }
  const t0 = frames[0].t;
  // Freeze the scale from the start pose so leaning can't change the ruler.
  const restIdx = frames.map((f, i) => (f.t - t0 <= restMs ? i : -1)).filter((i) => i >= 0);
  const scales = finite(restIdx.map((i) => bodyScale(frames[i].lm) ?? NaN));
  const scale = scales.length ? median(scales) : bodyScale(frames[0].lm);
  if (!scale) return { ok: false, reason: "not_visible", message: "Couldn't see your shoulders. Step back so your whole upper body is in frame." };

  const series = {};
  for (const f of FEATURES) series[f.key] = smooth3(frames.map((fr) => featureValue(f, fr.lm, scale)));

  const candidates = [];
  for (const f of FEATURES) {
    const raw = series[f.key];
    const seen = finite(raw).length / raw.length;
    if (seen < 0.8) continue;                                     // mostly hidden: can't trust it
    const s = fillGaps(raw);
    const restVals = finite(restIdx.map((i) => s[i]));
    if (!restVals.length) continue;
    const rest = median(restVals);
    // Which way does it move? The bigger excursion from rest wins.
    const up = Math.max(...finite(s)) - rest, down = rest - Math.min(...finite(s));
    const dir = up >= down ? 1 : -1;
    const amp = Math.max(up, down);
    if (amp < MIN_RANGE[f.type]) continue;
    const x = s.map((v) => (v - rest) * dir / amp);              // 0 at rest, 1 at the biggest excursion
    const reps = segmentReps(x);
    if (reps.length < 1) continue;
    const peaks = reps.map((r) => r.peakValue * amp);
    const peakMed = median(peaks);
    const cv = peaks.length > 1 ? Math.sqrt(mean(peaks.map((p) => (p - peakMed) ** 2))) / peakMed : 1;
    // Range normalised by what counts as "real" for this kind of feature, so a
    // 60 degree knee bend and a 0.6-torso hip drop compete fairly.
    const norm = peakMed / MIN_RANGE[f.type];
    // Jumpy signals lose. Front-on, a curl swings the forearm straight at the
    // lens and the 2D elbow angle leaps 170 -> 18 deg between two frames; the
    // live counter would (rightly) reject that as a teleport every rep. A real
    // joint moving at 8+ fps never covers 45% of its range in one frame.
    let maxStep = 0;
    for (let i = 1; i < x.length; i++) if (Number.isFinite(x[i]) && Number.isFinite(x[i - 1])) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]));
    const smooth = maxStep > 0.45 ? 0.15 : 1;
    candidates.push({ f, rest, dir, amp, delta: peakMed * dir, reps, cv, x, maxStep,
      score: norm * TYPE_WEIGHT[f.type] * smooth * Math.max(0.1, 1 - cv) * Math.min(reps.length, 3) });
  }
  if (!candidates.length) {
    return { ok: false, reason: "too_small", message: "No joint moved enough to track. Use a bigger range of motion, or move the phone so the moving joints are clearly in view." };
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Rep count comes from the winning signal.
  if (best.reps.length < 2) {
    return { ok: false, reason: "one_rep", message: "I only saw 1 rep. Do at least 2 so I can tell the movement from the wobble." };
  }

  // A two-sided movement: average both sides when the partner moved the same
  // way (strongly correlated, similar size). One-sided movements keep one side.
  const chosen = [best];
  if (best.f.pair) {
    const partner = candidates.find((c) => c.f.key === best.f.pair);
    if (partner && Math.abs(partner.delta) >= 0.6 * Math.abs(best.delta) && corr(best.x, partner.x) > 0.8) chosen.push(partner);
  }

  // Averaged, time-normalised rep on the combined trace (stored for the
  // "matches your demo" score in phase 2).
  // Each trace is already 0..1 on its own scale, so a plain average combines them.
  const combined = best.x.map((_, i) => mean(chosen.map((c) => c.x[i])));
  const N = 40;
  const shape = Array.from({ length: N }, (_, k) => mean(best.reps.map((r) => {
    const idx = r.start + (r.end - r.start) * k / (N - 1);
    const a = Math.floor(idx), b = Math.min(a + 1, combined.length - 1);
    return combined[a] + (combined[b] - combined[a]) * (idx - a);
  })));
  const repMs = median(best.reps.map((r) => frames[r.end].t - frames[r.start].t));

  // What did NOT move. A lateral raise keeps the elbows straight; a curl bends
  // them. Both raise the hands, so without this, curls counted as lateral
  // raises (caught by test-movement-trainer). Live, any of these drifting well
  // past what the demo showed means "not this movement" and the frame gets no
  // reading. Frame-position heights (abs) are excluded: they move with where
  // you stand.
  const chosenKeys = new Set(chosen.map((c) => c.f.key));
  const still = [];
  for (const f of FEATURES) {
    if (f.type === "abs" || chosenKeys.has(f.key)) continue;
    const raw = series[f.key];
    if (finite(raw).length / raw.length < 0.9) continue;
    const s = fillGaps(raw);
    const restVals = finite(restIdx.map((i) => s[i]));
    if (!restVals.length) continue;
    const rest = median(restVals);
    const amp = Math.max(...finite(s).map((v) => Math.abs(v - rest)));
    if (amp >= MIN_RANGE[f.type]) continue;                       // it moved: not a "still" joint
    still.push({ key: f.key, type: f.type, rest, tol: Math.max(1.6 * MIN_RANGE[f.type], 3 * amp) });
  }

  const sideSet = new Set(chosen.map((c) => c.f.side).filter(Boolean));
  return {
    ok: true,
    template: {
      version: 1,
      signal: chosen.map((c) => ({ key: c.f.key, type: c.f.type, rest: c.rest, delta: c.delta })),
      still,
      side: sideSet.size === 2 ? "both" : sideSet.has("L") ? "left" : sideSet.has("R") ? "right" : "both",
      describe: chosen.map((c) => c.f.label).join(" + "),
      demoReps: best.reps.length,
      consistency: Math.max(0, 1 - best.cv),
      repMs,
      shape,
      restScale: scale,
      cameraAspect: shoulderTorsoRatio(frames[0].lm),
    },
    warning: best.cv > 0.2 ? "Your demo reps varied a lot in depth. Counting will use the middle of them — re-record if it feels off." : null,
  };
}

/** Shoulder width / torso length: ~1 facing the camera, ~0 side-on. Used to
 *  notice a different camera angle from the demo. */
export function shoulderTorsoRatio(lm) {
  if (![11, 12, 23, 24].every((i) => vis(lm[i]))) return null;
  const t = getDist(getMid(lm[11], lm[12]), getMid(lm[23], lm[24]));
  return t > 0 ? getDist(lm[11], lm[12]) / t : null;
}

/**
 * Template -> a stateful metric for RepCounter. Reads 100 at the start pose
 * and 0 at the demo's typical peak, the same scale the depth-judged library
 * exercises use, so relativeDepth works unchanged.
 *
 * `abs` features re-learn their rest from the first frames of the set (you
 * won't stand on the same spot twice); angles and `rel` heights reuse the demo.
 */
export function makeTemplateMetric(template) {
  return () => {
    let scale = null; const scaleBuf = [];
    const liveRest = {}; const restBuf = {};
    const recent = [];
    return (lm) => {
      const s = bodyScale(lm);
      if (scale === null) {
        if (s) scaleBuf.push(s);
        if (scaleBuf.length >= 5) scale = median(scaleBuf);
      }
      const useScale = scale ?? s ?? template.restScale;
      // Joints that stayed still in the demo must stay roughly still now.
      for (const st of template.still || []) {
        const v = featureValue(FEAT[st.key], lm, useScale);
        if (Number.isFinite(v) && Math.abs(v - st.rest) > st.tol) { recent.length = 0; return null; }
      }
      const parts = [];
      for (const sig of template.signal) {
        const v = featureValue(FEAT[sig.key], lm, useScale);
        if (!Number.isFinite(v)) continue;
        let rest = sig.rest;
        if (sig.type === "abs") {
          if (liveRest[sig.key] === undefined) {
            (restBuf[sig.key] ||= []).push(v);
            if (restBuf[sig.key].length >= 5) liveRest[sig.key] = median(restBuf[sig.key]);
            rest = median(restBuf[sig.key]);
          } else rest = liveRest[sig.key];
        }
        parts.push((v - rest) / sig.delta);                      // 0 at rest, 1 at demo peak
      }
      if (!parts.length) return null;                             // nothing seen: no reading, never a guess
      recent.push(mean(parts));
      if (recent.length > 3) recent.shift();
      return 100 * (1 - median(recent));
    };
  };
}

/**
 * Template -> exercise config for `new RepCounter(config)`.
 * A rep = back near the start pose, then 70% of the demo's typical range.
 */
export function makeCustomExerciseConfig(template, { id, name } = {}) {
  return {
    id: id || "custom_movement",
    name: name || "Custom movement",
    keywords: [],
    mode: "reps",
    trackable: true,
    custom: true,                  // no external standard: never a test or leaderboard
    category: "Custom",
    color: "#a855f7",
    makeMetric: makeTemplateMetric(template),
    getAngle: () => null,
    relativeDepth: { arm: 0.85, rep: 0.30, partial: 0.70 },
    upThreshold: 85,
    downThreshold: -200,           // no absolute floor: only your own range counts
    partialThreshold: 70,
    // Same two glitch gates as the library (doc 15): observed in transit AND
    // longer than a reflex. The interval scales with your demo's pace.
    minRepDurationMs: 80,
    minRepIntervalMs: Math.max(300, Math.round((template.repMs || 1200) * 0.45)),
    direction: "down_then_up",
    primaryJoint: "Range",
    unit: "",
    depthMeter: { top: 100, target: 30 },
    formCues: [
      `Tracking your ${template.describe}`,
      "Same phone position as your demo",
      "Return to your start position between reps",
    ],
  };
}

// ── Saved movements ──────────────────────────────────────────────────────────
// localStorage until a CustomMovement entity exists in Base44 (doc 17 §4) —
// same caveat as FitnessTest history: they stay on this device.
const STORE_KEY = "rns_custom_movements";
export function loadCustomMovements() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(list) ? list.filter((m) => m?.template?.signal?.length) : [];
  } catch (_) { return []; }
}
export function saveCustomMovement({ name, template }) {
  const list = loadCustomMovements();
  const item = {
    id: `cm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: (name || "My movement").trim().slice(0, 40) || "My movement",
    template,
    created_at: new Date().toISOString(),
  };
  list.unshift(item);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (_) { return null; }
  return item;
}
export function deleteCustomMovement(id) {
  const list = loadCustomMovements().filter((m) => m.id !== id);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (_) {}
  return list;
}

/**
 * The record flow, as a state machine fed one frame at a time.
 *
 *   'waiting'   -> get into your start pose and hold still
 *   'go'        -> still for `stillMs`: the UI beeps and says GO
 *   'recording' -> collecting frames; counts rough reps live for the UI
 *   'done'      -> stopped (auto: >= minReps and still back at the start pose
 *                  for `endStillMs`; or stop() pressed; or `maxMs` reached)
 *
 * Rough live reps use whole-body distance from the start pose, because the
 * real signal isn't known until learnMovement() runs on the recording.
 */
export class MovementRecorder {
  constructor({ stillMs = 600, endStillMs = 1000, minReps = 2, maxMs = 20000 } = {}) {
    Object.assign(this, { stillMs, endStillMs, minReps, maxMs });
    this.phase = "waiting";
    this.frames = [];
    this.stillFor = 0;
    this.lastFeat = null; this.lastT = 0;
    this.startFeat = null; this.startT = 0;
    this.roughReps = 0; this.away = false; this.maxDist = 0;
    this.stopReason = null;
  }

  /** Normalised whole-body distance between two feature vectors. */
  static distance(a, b) {
    const d = [];
    for (const f of FEATURES) {
      const x = a[f.key], y = b[f.key];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      d.push(Math.abs(x - y) / (f.type === "angle" ? 90 : 100));
    }
    if (!d.length) return NaN;
    d.sort((p, q) => q - p);
    return mean(d.slice(0, 3));                                   // the 3 joints that moved most
  }

  /** Body speed in torso-lengths per second, from SMOOTHED landmark positions
   *  compared over ~250ms. Frame-to-frame joint angles were tried first and
   *  failed: ordinary landmark jitter alone read as movement, so the recorder
   *  never saw anyone as still. The 2nd-fastest landmark is used so one
   *  glitching point can't hold it up. */
  _speed(t, lm, scale) {
    const A = 0.35, IDX = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    this.ema ||= {};
    for (const i of IDX) {
      const p = lm[i]; if (!vis(p)) continue;
      const e = this.ema[i];
      this.ema[i] = e ? { x: e.x + A * (p.x - e.x), y: e.y + A * (p.y - e.y) } : { x: p.x, y: p.y };
    }
    this.hist ||= [];
    this.hist.push({ t, pos: { ...this.ema } });
    while (this.hist.length > 2 && t - this.hist[1].t >= 250) this.hist.shift();
    const old = this.hist[0];
    if (!scale || t - old.t < 150) return null;
    const v = [];
    for (const i of IDX) {
      const a = this.ema[i], b = old.pos[i];
      if (a && b) v.push(Math.hypot(a.x - b.x, a.y - b.y) / scale / ((t - old.t) / 1000));
    }
    if (v.length < 4) return null;
    v.sort((p, q) => q - p);
    return v[1];
  }

  push(t, lm) {
    if (this.phase === "done") return this.state();
    const scale = bodyScale(lm);
    // Smoothed features. Raw ones jitter enough while standing still (up to
    // 0.18 on this distance) to fake a rough rep against the 0.22 line.
    const raw = extractFeatures(lm, scale ?? this.startScale ?? 0.2);
    const feat = {};
    for (const k of Object.keys(raw)) {
      const prev = this.featEma?.[k], v = raw[k];
      feat[k] = !Number.isFinite(v) ? prev ?? NaN : Number.isFinite(prev) ? prev + 0.4 * (v - prev) : v;
    }
    this.featEma = feat;
    const dt = this.lastT ? t - this.lastT : 0;
    const speed = this._speed(t, lm, scale);
    this.lastFeat = feat; this.lastT = t;
    const still = speed !== null && speed < 0.3;
    this.stillFor = still ? this.stillFor + dt : 0;

    if (this.phase === "waiting" && this.stillFor >= this.stillMs) {
      this.phase = "go"; this.startFeat = feat; this.startT = t; this.startScale = scale;
    }
    if (this.phase === "go" || this.phase === "recording") {
      this.frames.push({ t, lm });
      const dist = MovementRecorder.distance(feat, this.startFeat);
      if (Number.isFinite(dist)) {
        this.maxDist = Math.max(this.maxDist, dist);
        if (!this.away && dist > 0.3) { this.away = true; this.phase = "recording"; }
        if (this.away && dist < 0.1) { this.away = false; this.roughReps++; }
      }
      const backAtStart = Number.isFinite(dist) && dist < 0.1;
      if (this.roughReps >= this.minReps && backAtStart && this.stillFor >= this.endStillMs) this.finish("auto");
      else if (t - this.startT >= this.maxMs) this.finish("timeout");
    }
    return this.state();
  }

  stop() { if (this.phase !== "done") this.finish("manual"); return this.state(); }
  finish(reason) { this.phase = "done"; this.stopReason = reason; }
  state() { return { phase: this.phase, roughReps: this.roughReps, frames: this.frames.length, stopReason: this.stopReason }; }
  /** Learn from what was recorded. */
  result() { return learnMovement(this.frames); }
}
