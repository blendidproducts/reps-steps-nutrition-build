/**
 * trackingSession.js — things that must outlive ONE RepTracker mount.
 *
 * A workout mounts a fresh RepTracker for every set. Anything owned by the
 * component died with the set:
 *   - the camera stream          (fixed in Round 15: shared stream)
 *   - the pose model             (2026-10-29: was re-created EVERY set — a
 *                                 multi-second load, a timed set burning while
 *                                 it loaded, and a new GPU context each time,
 *                                 which iOS Safari caps)
 *   - a recording made that set  (2026-10-29: the clip was built in the
 *                                 recorder's onstop AFTER the tracker had
 *                                 unmounted, so it was silently thrown away
 *                                 whenever a set ended on its own)
 * All three now live here, at module scope, for the life of the workout.
 */

export const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
export const MODEL_URL     = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

// ── Shared camera stream (Round 15) ───────────────────────────────────────────
// Re-requesting getUserMedia for every exercise made iOS prompt for camera
// permission each time. Keep ONE stream alive across the whole workout; the
// workout page passes keepCameraAlive and calls releaseSharedCamera() at the end.
let sharedStream = null;
let sharedFacing = null;
// Set by the mounted tracker so the module can report a stream dying from
// OUTSIDE React — the 'ended' event fires on the track, not on a component.
let onCameraLost = null;
export function setCameraLostHandler(fn) { onCameraLost = fn; }

/** Stop the camera only (the pose model stays loaded) — used to re-acquire
 *  a camera the system took away. */
export function stopSharedStream() {
  try { sharedStream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  sharedStream = null;
  sharedFacing = null;
  acquiring = null;
}

/** End of a workout: camera off AND pose model freed. */
export function releaseSharedCamera() {
  stopSharedStream();
  releaseSharedLandmarker();
}

/** Is the shared stream actually usable right now? */
export function cameraIsLive() {
  return !!sharedStream?.getVideoTracks?.().some(
    (t) => t.readyState === "live" && !t.muted
  );
}

// Two callers can ask at once (Auto Track's preview hands over to the tracker),
// and two getUserMedia calls would fight — the second can kill the first on iOS.
let acquiring = null;
export function acquireCamera(mode) {
  if (acquiring && acquiring.mode === mode) return acquiring.p;
  const p = acquireCameraNow(mode).finally(() => { if (acquiring?.p === p) acquiring = null; });
  acquiring = { mode, p };
  return p;
}

async function acquireCameraNow(mode) {
  const live = cameraIsLive();
  if (sharedStream && live && sharedFacing === mode) return sharedStream;
  try { sharedStream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  sharedStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,   // the microphone is requested ONLY when recording with sound
  });
  sharedFacing = mode;

  // ── 2026-10-07: watch the track ─────────────────────────────────────────
  // JT's report: "the camera is not able to record video". On iOS Safari a
  // camera track is taken away by the system for ordinary reasons — the page
  // is backgrounded, another app or an incoming call claims the camera, or iOS
  // reclaims it on a long session. The track goes to readyState 'ended' (or
  // 'muted'), but <video> keeps its last frame and video.readyState stays >= 2,
  // so the detection loop carried on forever against a FROZEN image. No error,
  // no recovery, reps silently stop counting.
  //
  // One shared stream held for a whole workout — which is right, it stops iOS
  // re-prompting per exercise — makes this far more likely, because the window
  // for the system to take it is the entire session rather than one set.
  for (const t of sharedStream.getVideoTracks()) {
    t.addEventListener("ended", () => onCameraLost?.("ended"));
    // 2026-10-14: iOS mutes the track for TRANSIENT reasons too — the system
    // "Camera in use" banner in JT's screenshots, Control Center, a
    // notification — and unmutes it a moment later. Treating every mute as a
    // dead camera put up "Camera stopped" mid-set for nothing. Only a mute
    // that is still in place after 2.5s is a loss.
    let muteTimer = null;
    t.addEventListener("mute", () => {
      clearTimeout(muteTimer);
      muteTimer = setTimeout(() => { if (t.muted) onCameraLost?.("muted"); }, 2500);
    });
    t.addEventListener("unmute", () => clearTimeout(muteTimer));
  }
  return sharedStream;
}



/** The facing the person last chose ('user' = front), else the given default. */
export function preferredFacing(fallback = "user") {
  if (sharedFacing) return sharedFacing;
  try { return localStorage.getItem("rns_cam_facing") || fallback; } catch (_) { return fallback; }
}
export function rememberFacing(mode) {
  try { localStorage.setItem("rns_cam_facing", mode); } catch (_) {}
}

// ── Shared pose model ─────────────────────────────────────────────────────────
let landmarkerPromise = null;
let landmarkerInstance = null;
let lastTs = 0;

/** Load the pose model once; every later call gets the same instance. */
export function getSharedLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { FilesetResolver, PoseLandmarker } =
      await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);
    let lm;
    try {
      lm = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 2,
      });
    } catch (_gpuErr) {
      lm = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO", numPoses: 2,
      });
    }
    landmarkerInstance = lm;
    return lm;
  })();
  // A failed load must not be cached forever — let the next attempt retry.
  landmarkerPromise.catch(() => { landmarkerPromise = null; });
  return landmarkerPromise;
}

/** Strictly increasing timestamps across EVERY caller of the shared model
 *  (VIDEO mode throws on a repeated or older timestamp). */
export function nextVideoTs() {
  const now = performance.now();
  lastTs = now > lastTs ? now : lastTs + 0.01;
  return lastTs;
}

export function releaseSharedLandmarker() {
  const lm = landmarkerInstance;
  landmarkerInstance = null;
  landmarkerPromise = null;
  try { lm?.close(); } catch (_) {}
}

/** Load the model and open the camera ahead of time (Auto Track). */
export async function warmUpTracking(facing) {
  const [stream] = await Promise.all([acquireCamera(facing || preferredFacing()), getSharedLandmarker()]);
  return stream;
}

// ── Clips that outlived their set ─────────────────────────────────────────────
// { id, url, blob, name, size, at }
let clips = [];
const clipListeners = new Set();
const emitClips = () => clipListeners.forEach((fn) => { try { fn(clips); } catch (_) {} });

export function addPendingClip(clip) {
  if (!clip?.blob?.size) return;
  if (clips.some((c) => c.url === clip.url)) return;
  clips = [...clips, { ...clip, id: clip.url, at: Date.now() }];
  emitClips();
}
export function removePendingClip(id) {
  const c = clips.find((x) => x.id === id);
  if (c?.url) { try { URL.revokeObjectURL(c.url); } catch (_) {} }
  clips = clips.filter((x) => x.id !== id);
  emitClips();
}
export function getPendingClips() { return clips; }
export function subscribeClips(fn) { clipListeners.add(fn); return () => clipListeners.delete(fn); }

/** Share sheet on iOS (the only way into Photos), download elsewhere. */
export async function saveClipFile(clip) {
  const file = new File([clip.blob], clip.name, { type: clip.blob.type });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "RepsAndSteps workout" });
      return "shared";
    }
  } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  const a = document.createElement("a");
  a.href = clip.url; a.download = clip.name;
  document.body.appendChild(a); a.click(); a.remove();
  return "downloaded";
}
