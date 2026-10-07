/**
 * RepTracker.jsx
 * Full-screen rep counter for REPSANDSTEPS.
 *
 * Three modes based on exerciseConfig.trackable:
 *   true           → MediaPipe pose tracking + skeleton overlay (full auto)
 *   'experimental' → MediaPipe pose tracking + yellow "Beta" badge
 *   false          → Manual tap-to-count (no camera, no MediaPipe)
 *
 * Usage:
 *   <RepTracker
 *     exerciseName="Push-Up"
 *     targetReps={20}
 *     onComplete={(count) => { ... }}
 *     onClose={() => { ... }}
 *   />
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { matchExercise, RepCounter, DistanceTracker, getExercisesByCategory } from "@/lib/exerciseTracking";
import {
  X, Camera, Activity, CheckCircle,
  ChevronUp, ChevronDown, AlertTriangle, RotateCcw, Hand, FlaskConical,
  Pause, Play as PlayIcon, Users, Route, Crosshair,
  Video, VideoOff, Circle, Square, Download, Mic, MicOff, CameraOff,
} from "lucide-react";

// ─── MediaPipe CDN ────────────────────────────────────────────────────────────
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL     = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

const CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],
  [23,25],[24,26],[25,27],[26,28],
  [27,29],[28,30],[29,31],[30,32],[27,31],[28,32],
];

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

export function releaseSharedCamera() {
  try { sharedStream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  sharedStream = null;
  sharedFacing = null;
}

/** Is the shared stream actually usable right now? */
export function cameraIsLive() {
  return !!sharedStream?.getVideoTracks?.().some(
    (t) => t.readyState === "live" && !t.muted
  );
}

async function acquireCamera(mode) {
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
    t.addEventListener("mute",  () => onCameraLost?.("muted"));
  }
  return sharedStream;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RepTracker({ exerciseName, targetReps, onComplete, onClose, defaultFacingMode = "user", exerciseEmoji = "", setLabel = "", paused = false, onPause, autoAdvance = false, onCountChange, keepCameraAlive = false, secondsLeft = null, timedMode = false }) {
  const initialConfig = matchExercise(exerciseName);

  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const landmarkerRef  = useRef(null);
  const streamRef      = useRef(null);
  const animFrameRef   = useRef(null);
  const repCounterRef  = useRef(null);
  const lastVideoTime  = useRef(-1);
  const frameSkipRef   = useRef(0); // Finding 4a: throttles angle/stage UI updates, not rep counting

  const [isLoading,      setIsLoading]      = useState(initialConfig.trackable !== false);
  const [loadError,      setLoadError]      = useState(null);
  const [showCamTip,     setShowCamTip]     = useState(false);
  const [repCount,       setRepCount]       = useState(0);
  const [stage,          setStage]          = useState(null);
  const [currentAngle,   setCurrentAngle]   = useState(0);
  const [showSkeleton,   setShowSkeleton]   = useState(true);
  const [facingMode,     setFacingMode]     = useState(() => {
    try { return sharedFacing || localStorage.getItem("rns_cam_facing") || defaultFacingMode; } catch (_) { return defaultFacingMode; }
  });
  const [repFlash,       setRepFlash]       = useState(false);
  // ── Camera health (2026-10-07) ────────────────────────────────
  // `cameraLost` is the reason string when the stream dies, null when healthy.
  const [cameraLost,     setCameraLost]     = useState(null);
  const [reacquiring,    setReacquiring]    = useState(false);
  const lastFrameTime    = useRef({ t: 0, at: 0 });
  // ── Recording (2026-10-07) ────────────────────────────────────
  const recorderRef      = useRef(null);
  const recChunksRef     = useRef([]);
  const recAudioRef      = useRef(null);   // the mic track, if sound was on
  const recTimerRef      = useRef(null);
  const [recording,      setRecording]      = useState(false);
  const [recSeconds,     setRecSeconds]     = useState(0);
  const [recError,       setRecError]       = useState(null);
  const [recReady,       setRecReady]       = useState(null); // { url, name, size }
  const [recWithSound,   setRecWithSound]   = useState(() => {
    try { return localStorage.getItem("rns_rec_sound") !== "0"; } catch (_) { return true; }
  });
  const [partials,       setPartials]       = useState(0);  // shallow attempts this set
  const [shallowFlash,   setShallowFlash]   = useState(false);
  // Live depth scale from the counter: your standing reading and the depth line
  // it computed from it. Null until the standing read settles (about a second).
  const [depthScale,     setDepthScale]     = useState(null);
  // ── Distance mode (bear crawl) ────────────────────────────────
  const distTrackerRef = useRef(null);
  const distModeRef    = useRef(initialConfig.mode === "distance"); // read inside the RAF loop
  const distPhaseRef   = useRef("calibrating");
  const distDoneRef    = useRef(false);  // guards against firing onComplete twice
  const [distPhase,      setDistPhase]      = useState("calibrating"); // 'calibrating' | 'tracking'
  const [calProgress,    setCalProgress]    = useState(0);
  const [distFeet,       setDistFeet]       = useState(0);   // travelled from the mark
  const [distTracking,   setDistTracking]   = useState(false);
  const [distConfidence, setDistConfidence] = useState("poor");
  const [poseDetected,         setPoseDetected]         = useState(false);
  const [multiPersonDetected,  setMultiPersonDetected]  = useState(false);
  const [exerciseConfig, setExerciseConfig] = useState(initialConfig);
  const [selectedEx,     setSelectedEx]     = useState(initialConfig);
  const [showExPicker,   setShowExPicker]   = useState(false);
  // Derived from current exerciseConfig so picker-switches work correctly
  const [isManualMode,   setIsManualMode]   = useState(initialConfig.trackable === false);
  const [isExperimental, setIsExperimental] = useState(initialConfig.trackable === 'experimental');

  // ── Camera tip banner — shown for 5s after camera loads ───────
  useEffect(() => {
    if (!isLoading && !loadError && initialConfig.trackable !== false) {
      setShowCamTip(true);
      const t = setTimeout(() => setShowCamTip(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isLoading, loadError]); // eslint-disable-line

  // ── Init exercise ──────────────────────────────────────────────
  useEffect(() => {
    const cfg = matchExercise(exerciseName);
    setExerciseConfig(cfg);
    setSelectedEx(cfg);
    setIsManualMode(cfg.trackable === false);
    setIsExperimental(cfg.trackable === 'experimental');
    repCounterRef.current = new RepCounter(cfg);
    // Distance exercises (bear crawl) measure travel, not reps. The tracker
    // needs a reference capture before it can report feet, so it starts in the
    // calibrating phase and the UI asks the person to stand on the mark.
    if (cfg.mode === "distance") {
      distTrackerRef.current = new DistanceTracker({ refFeet: cfg.calibrateFeet ?? 6 });
      distModeRef.current = true;
      setDistPhase("calibrating");
      setCalProgress(0);
      setDistFeet(0);
    } else {
      distTrackerRef.current = null;
      distModeRef.current = false;
    }
  }, [exerciseName]);

  // ── Load MediaPipe (skipped when starting in manual mode) ──────
  useEffect(() => {
    if (initialConfig.trackable === false) return;

    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const { FilesetResolver, PoseLandmarker } =
          await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
        if (cancelled) return;
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);

        // Try GPU first (faster), fall back to CPU if GPU delegate fails on this device
        let landmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 2,
          });
        } catch (_gpuErr) {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 2,
          });
        }

        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;
        await startCamera(facingMode);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("RepTracker init error:", err);
          setLoadError(err?.message || "Failed to load body tracking.");
          setIsLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Camera ─────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode) => {
    cancelAnimationFrame(animFrameRef.current);
    const stream = await acquireCamera(mode); // reuses live stream — no new permission prompt
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const caps = track.getCapabilities?.();
        if (caps?.zoom) await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] });
      } catch (_) {}
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await new Promise((res) => { video.onloadedmetadata = res; });
      video.play();
      scheduleDetection();
    }
  }, []);

  const flipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    try { localStorage.setItem("rns_cam_facing", next); } catch (_) {}
    await startCamera(next);
  }, [facingMode, startCamera]);

  /** Re-acquire the camera after the system took it away. */
  const recoverCamera = useCallback(async () => {
    setReacquiring(true);
    try {
      releaseSharedCamera();                 // drop the dead one first
      lastFrameTime.current = { t: 0, at: 0 };
      await startCamera(facingModeRef.current);
      setCameraLost(null);
    } catch (e) {
      setCameraLost(e?.name === "NotAllowedError" ? "denied" : "failed");
    } finally {
      setReacquiring(false);
    }
  }, [startCamera]);

  // ── Workout video recording (2026-10-07) ─────────────────────────────────
  // Records the RAW camera, not the canvas: JT wants the video for his own
  // records, and the skeleton overlay would only get in the way. Recording a
  // CLONE of the live video track means the pose loop keeps its own track
  // untouched — a second getUserMedia call would fight the shared stream, and
  // on iOS would re-prompt.
  //
  // iOS Safari records MP4 (H.264 + AAC) and does NOT support WebM, so the
  // mime list is ordered mp4-first rather than the usual webm-first.
  // Source: https://webkit.org/blog/11353/mediarecorder-api/
  const REC_MIMES = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    "video/webm",
  ];
  const pickRecMime = () => {
    if (typeof MediaRecorder === "undefined") return null;
    for (const m of REC_MIMES) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) {}
    }
    return "";   // let the browser choose
  };

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch (_) {}
    // Release the microphone the moment recording ends. On iOS the mic is what
    // puts the recording indicator in the status bar, so holding it open past
    // the recording would leave that showing for the rest of the workout.
    try { recAudioRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    recAudioRef.current = null;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setRecError(null);
    // Revoke the previous clip's URL before dropping the reference to it —
    // otherwise every re-record pins another whole video in memory, which on a
    // phone is how a long workout runs the tab out of it.
    setRecReady((prev) => {
      if (prev?.url) { try { URL.revokeObjectURL(prev.url); } catch (_) {} }
      return null;
    });
    if (typeof MediaRecorder === "undefined") {
      setRecError("This browser can't record video. On iPhone, use Safari.");
      return;
    }
    const camera = streamRef.current;
    const videoTrack = camera?.getVideoTracks?.()[0];
    if (!videoTrack || videoTrack.readyState !== "live") {
      setRecError("The camera isn't running — start it before recording.");
      return;
    }
    try {
      const tracks = [videoTrack.clone()];
      if (recWithSound) {
        // Requested here and nowhere else, so the mic is only ever on while a
        // recording is actually running.
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        recAudioRef.current = mic;
        tracks.push(...mic.getAudioTracks());
      }
      const mixed = new MediaStream(tracks);
      const mimeType = pickRecMime();
      const rec = new MediaRecorder(mixed, mimeType ? { mimeType } : undefined);
      recChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) recChunksRef.current.push(e.data); };
      rec.onerror = () => { setRecError("Recording stopped unexpectedly."); stopRecording(); };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "video/mp4";
        const blob = new Blob(recChunksRef.current, { type });
        recChunksRef.current = [];
        try { mixed.getTracks().forEach((t) => t.stop()); } catch (_) {}
        if (!blob.size) { setRecError("Nothing was recorded."); return; }
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        setRecReady({
          url: URL.createObjectURL(blob),
          blob,
          name: `repsandsteps-${(exerciseName || "workout").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}.${ext}`,
          size: blob.size,
        });
      };
      rec.start(1000);           // 1s chunks, so a crash still leaves something
      recorderRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((n) => n + 1), 1000);
    } catch (e) {
      // The mic is the usual refusal here, and it must not take the camera with it.
      try { recAudioRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
      recAudioRef.current = null;
      setRecError(
        e?.name === "NotAllowedError"
          ? "Microphone permission was declined. Turn SOUND off to record video only."
          : "Couldn't start recording on this device."
      );
      setRecording(false);
    }
  }, [recWithSound, exerciseName, stopRecording]);

  /** Hand the finished file to the person: the share sheet on iOS, else a download. */
  const saveRecording = useCallback(async () => {
    if (!recReady) return;
    const file = new File([recReady.blob], recReady.name, { type: recReady.blob.type });
    // iOS Safari ignores <a download> for blobs; the share sheet is the only
    // route to Photos or Files, so try it first where it is actually available.
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "RepsAndSteps workout" });
        return;
      }
    } catch (_) { /* cancelled, or unsupported — fall through */ }
    const a = document.createElement("a");
    a.href = recReady.url;
    a.download = recReady.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [recReady]);

  // Recording must never outlive the tracker, or the mic stays open.
  const recReadyRef = useRef(null);
  useEffect(() => { recReadyRef.current = recReady; }, [recReady]);
  useEffect(() => () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch (_) {}
    try { recAudioRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    const url = recReadyRef.current?.url;
    if (url) { try { URL.revokeObjectURL(url); } catch (_) {} }
  }, []);

  // A camera that dies mid-recording ends the recording too — the file is kept.
  useEffect(() => { if (cameraLost && recording) stopRecording(); }, [cameraLost, recording, stopRecording]);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (!keepCameraAlive) releaseSharedCamera(); // keep stream alive between exercises during a workout
    streamRef.current = null;
    if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch (_) {} landmarkerRef.current = null; }
  }, [keepCameraAlive]);

  // ── Detection loop ─────────────────────────────────────────────
  const scheduleDetection = useCallback(() => {
    animFrameRef.current = requestAnimationFrame(detect);
  }, []); // eslint-disable-line

  const detect = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    const landmarker = landmarkerRef.current, counter = repCounterRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect); return;
    }
    const ctx = canvas.getContext("2d");
    const fm  = facingModeRef.current;
    const skl = showSkeletonRef.current;
    const vW  = video.videoWidth, vH = video.videoHeight;
    const sW  = canvas.parentElement?.clientWidth  || window.innerWidth;
    const sH  = canvas.parentElement?.clientHeight || window.innerHeight;
    canvas.width = sW; canvas.height = sH;
    const va = vW / vH, ca = sW / sH;
    let dW, dH, dX, dY;
    if (va > ca) { dW = sW; dH = sW / va; dX = 0; dY = (sH - dH) / 2; }
    else         { dH = sH; dW = sH * va; dX = (sW - dW) / 2; dY = 0; }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, sW, sH);
    ctx.save();
    if (fm === "user") { ctx.translate(dX + dW, dY); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0, dW, dH); }
    else               { ctx.drawImage(video, dX, dY, dW, dH); }
    ctx.restore();
    const ts = performance.now();
    if (ts !== lastVideoTime.current) {
      lastVideoTime.current = ts;
      try {
        const result = landmarker.detectForVideo(video, ts);
        const rawPeople = result?.landmarks || [];

        // Finding 4b (2026-08-20): a low-confidence secondary detection (e.g.
        // a shadow on the ground from a low tripod) used to count as a real
        // "second person" and pause reps — isMulti was a raw length check
        // with no confidence filtering, even though the PRIMARY person was
        // already gated by the same 0.35 visibility bar below. Apply that
        // same existing bar to every detected pose, not just the first one,
        // before it counts toward the multi-person total.
        const KEY_PTS = [11, 12, 23, 24];
        const poseConfidence = (p) => KEY_PTS.reduce((s, i) => s + (p?.[i]?.visibility ?? 0), 0) / KEY_PTS.length;
        const confidentPeople = rawPeople.filter((p) => poseConfidence(p) >= 0.35);
        const numPeople = confidentPeople.length;

        // Multiple people in frame → pause counting, warn user
        const isMulti = numPeople > 1;
        multiPersonRef.current = isMulti;
        setMultiPersonDetected(isMulti);

        if (numPeople > 0) {
          const lm = confidentPeople[0]; // most-prominent confident person
          setPoseDetected(true);
          if (skl) drawSkeleton(ctx, lm, sW, sH, fm, 0, 1, dX, dY, dW, dH);

          // ── Distance mode (bear crawl) ───────────────────────────────
          // Measures travel instead of counting reps. Two phases: hold still on
          // the mark to capture the reference size, then crawl.
          if (distModeRef.current && distTrackerRef.current) {
            const dt = distTrackerRef.current;
            if (!pausedRef.current && !isMulti) {
              if (distPhaseRef.current === "calibrating") {
                const c = dt.calibrate(lm);
                setCalProgress(c.progress);
                setDistTracking(c.tracking);
                if (c.ready) {
                  distPhaseRef.current = "tracking";
                  setDistPhase("tracking");
                  speakOnce("Reference set. Crawl when you are ready.");
                }
              } else {
                const d = dt.update(lm);
                setDistTracking(d.tracking);
                setDistConfidence(d.confidence);
                const ft = Math.round(d.distanceFt);
                setDistFeet(ft);
                const target = exConfigRef.current?.targetFeet || 0;
                if (target && ft >= target && !distDoneRef.current) {
                  distDoneRef.current = true;
                  speakOnce("Distance complete!");
                  onCompleteRef.current?.(ft);
                }
              }
            }
          }
          // Only count when: not paused, single confident person
          else if (counter && !pausedRef.current && !isMulti) {
            const u = counter.update(lm);
            // Finding 4a (2026-08-20): the no-pose banner (React state) could
            // show stale info while the skeleton (drawn straight to canvas,
            // outside React) already reflected the current frame — this
            // component was firing setState for a continuously-changing angle
            // on every single detected frame (~60Hz), and that sustained
            // render churn — on a phone already busy running MediaPipe
            // inference — let React's commit fall behind the canvas's
            // immediate paint. Throttle only the high-churn UI fields
            // (angle/stage) to ~20Hz; rep-counting itself (counter.update
            // above) still runs every frame, so no rep can be missed by this.
            frameSkipRef.current = (frameSkipRef.current + 1) % 3;
            if (frameSkipRef.current === 0) {
              // Only publish a real measurement. u.angle is null on a tracking
              // dropout, and Math.round(null) is 0 — which on the depth meter
              // would read as "you're at parallel" and turn the bar green.
              if (typeof u.angle === "number" && !Number.isNaN(u.angle)) {
                setCurrentAngle(Math.round(u.angle));
              }
              setStage(u.stage);
              // Depth exercises calibrate their own thresholds against your
              // standing reading, so the meter has to draw the moving line
              // rather than a fixed one — otherwise it shows you crossing a
              // line that isn't the one being counted.
              if (typeof u.topEst === "number" && u.topEst > 1) {
                setDepthScale({ top: u.topEst, line: u.depthLine });
              }
            }
            setRepCount(u.count);
            if (u.repCounted) { triggerRepFlash(); announceRep(u.count); }
            // A shallow attempt. Saying so is the whole point — a rep that
            // silently doesn't count reads as the tracker being broken.
            if (u.partialCounted) { setPartials(u.partials); flagShallow(); }
          }
        } else { setPoseDetected(false); }
      } catch (_) {}
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  const showSkeletonRef = useRef(showSkeleton);
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);
  // Mirrored for the RAF closure, which captures first-render values.
  const exConfigRef = useRef(exerciseConfig);
  useEffect(() => { exConfigRef.current = exerciseConfig; }, [exerciseConfig]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const facingModeRef = useRef(facingMode);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);

  // ── Camera loss: detect it, say so, offer to recover ──────────────────────
  // JT's report, 2026-10-07: "the camera is not able to record video".
  //
  // On iOS Safari a camera track gets taken away for ordinary reasons — the
  // page is backgrounded, another app or a real incoming call claims the
  // camera, or iOS reclaims it on a long session. The track moves to
  // readyState 'ended' (or 'muted'), but <video> keeps showing its LAST FRAME
  // and video.readyState stays >= 2, so detect() happily carried on against a
  // frozen image: no error, no recovery, reps silently stop.
  //
  // Holding one shared stream for a whole workout — right in itself, it stops
  // iOS re-prompting per exercise — widens the window for this from one set to
  // the entire session, which is why it shows up in real use and never in a
  // quick test.
  //
  // Three signals, because iOS uses all three depending on the cause:
  //   1. the track fires 'ended' / 'mute'   (wired in acquireCamera)
  //   2. the page returns from background with a dead track
  //   3. neither fires and frames simply stop arriving
  useEffect(() => {
    setCameraLostHandler((reason) => setCameraLost(reason));
    return () => setCameraLostHandler(null);
  }, []);

  useEffect(() => {
    if (initialConfig.trackable === false) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!cameraIsLive()) setCameraLost("backgrounded");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [initialConfig.trackable]);

  useEffect(() => {
    if (initialConfig.trackable === false || cameraLost) return;
    // Signal 3. A live camera advances video.currentTime continuously. If it
    // hasn't moved in 3s while the page is visible, the feed is frozen whatever
    // the track claims about itself.
    const FROZEN_MS = 3000;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || document.visibilityState !== "visible") return;
      const now = performance.now();
      const seen = lastFrameTime.current;
      if (v.currentTime !== seen.t) {
        lastFrameTime.current = { t: v.currentTime, at: now };
        return;
      }
      if (seen.at && now - seen.at > FROZEN_MS) setCameraLost("frozen");
    }, 1000);
    return () => clearInterval(id);
  }, [cameraLost, initialConfig.trackable]);
  // Pause + multi-person refs (read inside RAF closure)
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const multiPersonRef = useRef(false);

  // ── Notification / background recovery ────────────────────────
  // When the app comes back from background (notification opened, app switcher, etc.)
  // requestAnimationFrame stops firing. Restart the detection loop on return.
  useEffect(() => {
    let appListener = null;

    const recover = () => {
      if (pausedRef.current) return;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker) return;
      // Cancel any stale frame, restart loop
      cancelAnimationFrame(animFrameRef.current);
      // If video track was suspended, try to resume
      if (video.paused) {
        video.play().catch(() => {});
      }
      scheduleDetection();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") recover();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Capacitor app state (more reliable than visibilitychange on Android)
    // Dynamic + vite-ignored: only resolves inside a Capacitor native shell.
    // No-ops (and safely fails) on plain web builds where @capacitor/app isn't installed.
    const capacitorAppPkg = "@capacitor/app";
    import(/* @vite-ignore */ capacitorAppPkg).then(({ App }) => {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) recover();
      }).then(h => { appListener = h; }).catch(() => {});
    }).catch(() => {});

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      appListener?.remove?.();
    };
  }, []); // eslint-disable-line

  // ── Live count reporting (Round 15) ────────────────────────────
  // The parent commits these reps even if DONE is never pressed (timer expiry,
  // skip, end-workout). Fixes "0 reps in summary" for timed exercises.
  useEffect(() => { onCountChange?.(repCount); }, [repCount]); // eslint-disable-line

  // ── Auto-advance when rep target is reached (goal mode) ────────
  useEffect(() => {
    if (autoAdvance && targetReps > 0 && repCount >= targetReps) {
      const t = setTimeout(() => onComplete?.(repCount), 600);
      return () => clearTimeout(t);
    }
  }, [repCount, autoAdvance, targetReps]); // eslint-disable-line

  // ── Skeleton drawing ───────────────────────────────────────────
  function drawSkeleton(ctx, lm, w, h, fm, cs = 0, cw = 1, lbX = 0, lbY = 0, lbW = w, lbH = h) {
    const sx = (x) => { const a = (x - cs) / cw; return lbX + (fm === "user" ? 1 - a : a) * lbW; };
    const sy = (y) => lbY + y * lbH;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,169,255,0.3)"; ctx.lineWidth = 14;
    for (const [a, b] of CONNECTIONS) {
      if (lm[a]?.visibility > 0.4 && lm[b]?.visibility > 0.4) {
        ctx.beginPath(); ctx.moveTo(sx(lm[a].x), sy(lm[a].y)); ctx.lineTo(sx(lm[b].x), sy(lm[b].y)); ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(0,200,255,0.95)"; ctx.lineWidth = 6;
    for (const [a, b] of CONNECTIONS) {
      if (lm[a]?.visibility > 0.4 && lm[b]?.visibility > 0.4) {
        ctx.beginPath(); ctx.moveTo(sx(lm[a].x), sy(lm[a].y)); ctx.lineTo(sx(lm[b].x), sy(lm[b].y)); ctx.stroke();
      }
    }
    for (let i = 11; i <= 32; i++) {
      const p = lm[i]; if (!p || p.visibility < 0.4) continue;
      const x = sx(p.x), y = sy(p.y);
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y,  8, 0, Math.PI * 2); ctx.fillStyle = i >= 23 ? "#22c55e" : "#ef4444"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y,  3.5, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill();
    }
  }

  // ── Rep flash + TTS ────────────────────────────────────────────
  function triggerRepFlash() {
    setRepFlash(true);
    setTimeout(() => setRepFlash(false), 400);
  }
  // ── Shallow-rep feedback ───────────────────────────────────────
  // Flashes the on-screen badge and says "go deeper" — but not every time, or
  // it becomes a nag that talks over the rep count. Once every 4 seconds at
  // most, and never while the rep count is being announced.
  const lastShallowSpeakRef = useRef(0);
  function flagShallow() {
    setShallowFlash(true);
    setTimeout(() => setShallowFlash(false), 1200);
    try {
      const now = performance.now();
      if ("speechSynthesis" in window && now - lastShallowSpeakRef.current > 4000) {
        lastShallowSpeakRef.current = now;
        const u = new SpeechSynthesisUtterance("Go deeper");
        u.rate = 1.1; u.pitch = 1.0; u.volume = 0.9;
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }

  // One-shot spoken cue, for distance-mode transitions. Not throttled by a
  // timer — the caller only fires each of these once per effort.
  function speakOnce(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1.05; u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function announceRep(count) {
    try {
      if ("speechSynthesis" in window && count % 5 === 0) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`${count}`);
        u.rate = 1.3; u.pitch = 1.2; u.volume = 0.8;
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }

  // ── Manual tap ─────────────────────────────────────────────────
  function handleManualTap() {
    const next = repCount + 1;
    setRepCount(next);
    triggerRepFlash();
    announceRep(next);
  }

  // ── Exercise picker ────────────────────────────────────────────
  function changeExercise(cfg) {
    setExerciseConfig(cfg);
    setSelectedEx(cfg);
    setIsManualMode(cfg.trackable === false);
    setIsExperimental(cfg.trackable === 'experimental');
    repCounterRef.current = new RepCounter(cfg);
    repCounterRef.current.setCount(repCount);
    setPartials(0); // shallow count belongs to the old exercise's thresholds
    setDepthScale(null);
    setShowExPicker(false);
  }

  function resetCount() {
    setRepCount(0);
    setPartials(0);
    setDepthScale(null);   // the standing read is re-taken from scratch
    if (repCounterRef.current) repCounterRef.current.reset();
    // In distance mode RESET means "re-measure from the mark", which has to
    // re-capture the reference — the phone or the person may have moved.
    if (distTrackerRef.current) {
      distTrackerRef.current.reset();
      distDoneRef.current = false;
      distPhaseRef.current = "calibrating";
      setDistPhase("calibrating");
      setCalProgress(0);
      setDistFeet(0);
    }
  }
  // Distance mode reports the feet travelled, not a rep count.
  function handleDone()  { cleanup(); onComplete?.(isDistanceMode ? distFeet : repCount); }
  function handleClose() { cleanup(); onClose?.(); }

  const categories = getExercisesByCategory();
  const isDistanceMode = exerciseConfig?.mode === "distance";
  const unitLabel  = exerciseConfig?.mode === "time" ? "sec"
                   : isDistanceMode ? "ft" : "reps";
  const targetFeet = exerciseConfig?.targetFeet || 0;
  // The number the big counter shows and the DONE button reports.
  const shownCount = isDistanceMode ? distFeet : repCount;
  const shownTarget = isDistanceMode ? targetFeet : targetReps;

  // ── Depth meter ────────────────────────────────────────────────
  // Exercises whose tracking metric IS depth (squats — see squatDepthMetric in
  // exerciseTracking.js) get a bar, not just a number: a number tells you where
  // you are, a bar with a line on it tells you how much further to go. Scale
  // runs from the standing reading to a little past the target, so the target
  // line sits high enough that a deep rep still has visible travel below it.
  const readoutUnit = exerciseConfig?.unit ?? "°";
  const meterCfg = exerciseConfig?.depthMeter || null;
  const meter = (() => {
    if (!meterCfg) return null;
    // Prefer the counter's live scale — your standing reading and the line it
    // derived from it. The config values are only the scale shown in the first
    // second of a set, before the standing read settles.
    const top = depthScale?.top ?? meterCfg.top;
    const target = (typeof depthScale?.line === "number") ? depthScale.line : meterCfg.target;
    const floor = target - (top - target) * 0.35;
    const span = top - floor;
    if (!(span > 0)) return null;
    const frac = (v) => Math.max(0, Math.min(1, (top - v) / span));
    return {
      fillPct: frac(currentAngle) * 100,
      targetPct: frac(target) * 100,
      atDepth: currentAngle <= target,
      calibrated: !!depthScale,
    };
  })();

  // ════════════════════════════════════════════════════════════════
  // MANUAL TAP MODE
  // ════════════════════════════════════════════════════════════════
  if (isManualMode) {
    return createPortal(
      <div style={{ zIndex: 9999, position: 'fixed', inset: 0 }} className="bg-[#020817] flex flex-col select-none">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 pb-3 bg-[#0a1628]/95 border-b border-white/10"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <button onClick={handleClose} className="w-9 h-9 bg-black/60 rounded-full flex items-center justify-center border border-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setShowExPicker((p) => !p)} className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-white/20">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: exerciseConfig?.color }} />
            <span className="text-white text-sm font-bold truncate max-w-[160px]">{exerciseConfig?.name || exerciseName}</span>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-2.5 py-1 border border-white/10">
            <Hand className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wide">Manual</span>
          </div>
        </div>

        {/* Tap zone */}
        <button onClick={handleManualTap} className="relative flex-1 flex flex-col items-center justify-center gap-6 active:bg-white/5 transition-colors w-full">
          <AnimatePresence>
            {repFlash && (
              <motion.div key="flash" initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }}
                className="absolute inset-0 bg-[#00a9ff] pointer-events-none" />
            )}
          </AnimatePresence>

          <motion.div
            animate={repFlash ? { scale: 1.12 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex flex-col items-center"
          >
            <div className="text-[120px] font-black leading-none tabular-nums" style={{ color: exerciseConfig?.color || "#00a9ff" }}>
              {repCount}
            </div>
            <div className="text-white/50 text-sm font-semibold uppercase tracking-widest mt-1">
              {targetReps ? `${unitLabel} / ${targetReps}` : unitLabel}
            </div>
          </motion.div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <Hand className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-white/30 text-sm font-medium">TAP ANYWHERE TO COUNT</p>
            <p className="text-white/20 text-xs">Auto-tracking not available for this exercise</p>
          </div>
        </button>

        {/* Bottom bar */}
        {/* --artp-cb-h is set by the ARTP bottom control bar while it's mounted
            (0 everywhere else), so DONE/RESET never sit underneath it. */}
        <div className="bg-[#020817]/95 backdrop-blur-sm border-t border-white/10 px-4 pt-3 flex flex-col gap-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px + var(--artp-cb-h, 0px))' }}>
          {exerciseConfig?.formCues?.length > 0 && (
            <div className="w-full">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Form Tip</p>
              <p className="text-xs text-gray-300 leading-snug">{exerciseConfig.formCues[repCount % exerciseConfig.formCues.length]}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-16 h-14" />{/* spacer — no camera flip in manual mode */}
            <button onClick={resetCount}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 bg-gray-800 rounded-2xl border border-white/15 active:scale-95 transition-transform">
              <RotateCcw className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-[10px] font-bold leading-none">RESET</span>
            </button>
            <button onClick={handleDone}
              className="flex-1 h-14 bg-[#00a9ff] hover:bg-[#0090e0] active:scale-95 transition-transform text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#00a9ff]/30">
              <CheckCircle className="w-5 h-5" />
              <span className="text-base">DONE — {repCount} {unitLabel}</span>
            </button>
          </div>
        </div>

        {/* Exercise picker sheet */}
        <AnimatePresence>
          {showExPicker && (
            <motion.div key="picker" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-30 bg-[#0f172a] rounded-t-2xl border-t border-white/10 max-h-[75vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <p className="text-white font-bold text-base">Select Exercise</p>
                <button onClick={() => setShowExPicker(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-3"
                style={{ paddingBottom: 'calc(12px + var(--artp-cb-h, 0px))' }}>
                {Object.entries(categories).map(([cat, exList]) => (
                  <div key={cat}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 px-1">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {exList.map((ex) => (
                        <button key={ex.id} onClick={() => changeExercise(ex)}
                          className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            selectedEx?.id === ex.id ? "border-[#00a9ff]/60 bg-[#00a9ff]/10 text-white" : "border-white/10 bg-white/5 text-gray-300"
                          }`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: ex.color }} />
                          {ex.name}
                          {ex.mode === "time"            && <span className="ml-1 text-[10px] text-gray-500">(timed)</span>}
                          {ex.trackable === 'experimental' && <span className="ml-1 text-[10px] text-yellow-500">~</span>}
                          {ex.trackable === false          && <span className="ml-1 text-[10px] text-gray-600">✋</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>,
      document.body
    );
  }

  // ════════════════════════════════════════════════════════════════
  // POSE TRACKING MODE (trackable: true or 'experimental')
  // ════════════════════════════════════════════════════════════════
  return createPortal(
    <div style={{ zIndex: 9999, position: 'fixed', inset: 0 }} className="bg-black flex flex-col select-none">

      {/* Loading */}
      <AnimatePresence>
        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020817] flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-[#00a9ff]/30 border-t-[#00a9ff] rounded-full animate-spin mb-6" />
            <p className="text-white text-lg font-bold mb-2">Loading Body Tracker</p>
            <p className="text-gray-400 text-sm text-center px-8">
              Downloading AI pose model…<br />
              <span className="text-xs">(First time may take 10-15 seconds on mobile data)</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 bg-[#020817] flex flex-col items-center justify-center z-20 p-6">
          <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-white text-xl font-bold mb-2">Body Tracking Unavailable</p>
          <p className="text-gray-400 text-sm text-center mb-6">{loadError}</p>
          <Button onClick={handleClose} className="bg-brand-blue text-white">Go Back</Button>
        </div>
      )}

      {/* Main tracker */}
      {!isLoading && !loadError && (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover bg-black" />

            {/* Rep flash */}
            <AnimatePresence>
              {repFlash && (
                <motion.div key="flash" initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-[#00a9ff] pointer-events-none" />
              )}
            </AnimatePresence>

            {/* Top bar */}
            {/* Round 20: SOLID top bar (text was unreadable over camera) + set
                label folded into the picker; skeleton toggle moved to bottom bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 bg-black/85 backdrop-blur-sm border-b border-white/10"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', paddingBottom: '10px' }}>
              <button onClick={handleClose} className="w-9 h-9 bg-black/60 rounded-full flex items-center justify-center border border-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setShowExPicker((p) => !p)} className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-white/20">
                {exerciseEmoji && <span className="text-base leading-none">{exerciseEmoji}</span>}
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: exerciseConfig?.color }} />
                <span className="text-white text-sm font-bold truncate max-w-[140px]">{exerciseConfig?.name || exerciseName}</span>
                {setLabel && <span className="text-gray-400 text-xs flex-shrink-0">{setLabel}</span>}
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>
              {isExperimental ? (
                <div className="flex items-center gap-1.5 bg-yellow-500/20 rounded-full px-2.5 py-1 border border-yellow-500/40">
                  <FlaskConical className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-yellow-400 text-[10px] font-bold uppercase tracking-wide">Beta</span>
                </div>
              ) : (
                <div className="w-9" />
              )}
            </div>

            {/* No pose warning */}
            {!poseDetected && !multiPersonDetected && (
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 150px)' }}>
                <div className="bg-yellow-600/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  No pose detected — step back
                </div>
              </div>
            )}

            {/* Multiple-person warning — reps auto-paused */}
            {multiPersonDetected && (
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 150px)' }}>
                <div className="bg-red-600/90 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 font-bold shadow-lg">
                  <Users className="w-3.5 h-3.5" />
                  Multiple people detected — reps paused
                </div>
              </div>
            )}

            {/* Paused overlay */}
            <AnimatePresence>
              {paused && (
                <motion.div key="paused-overlay"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-10 pointer-events-none">
                  <div className="bg-black/60 border border-white/20 rounded-3xl px-8 py-6 text-center">
                    <Pause className="w-12 h-12 text-white mx-auto mb-3" />
                    <p className="text-white font-black text-2xl">PAUSED</p>
                    <p className="text-gray-400 text-xs mt-1">Reps & timers stopped</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera tip banner — dismissible, shown on load */}
            {showCamTip && (
              <div className="absolute left-3 right-3 flex items-center gap-2 bg-black/85 border border-white/20 rounded-xl px-4 py-3 z-20 shadow-xl"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>
                <Camera className="w-5 h-5 text-[#00a9ff] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white text-xs font-bold leading-tight">
                    {facingMode === "user"
                      ? "⚠️ Front camera active — tap REAR to switch for most exercises"
                      : "✓ Rear camera active — tap FRONT below if exercise needs front view"}
                  </p>
                </div>
                <button onClick={() => setShowCamTip(false)} className="text-gray-400 flex-shrink-0 pl-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Experimental ribbon */}
            {isExperimental && poseDetected && (
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 150px)' }}>
                <div className="bg-yellow-600/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <FlaskConical className="w-3 h-3" />
                  Experimental — counts may be approximate
                </div>
              </div>
            )}

            {/* Round 20: name/set pill removed — it duplicated the top-bar picker
                and collided with the skeleton toggle and warnings at the same offset */}

            {/* BIG countdown — readable from across the room (timed mode).
                Round 23: RepTracker is portal'd to document.body at z-9999, but
                ARTPWorkout ALSO portals its own TimerOverlay/AmrapBar bar to
                document.body at the SAME top-of-screen coordinates with a
                HIGHER z-index (z-[10001]) — the two overlay systems don't share
                a coordinate space, each assumes it's the only thing anchored to
                the top. This +56px offset was tuned (Round 20) against
                RepTracker's OWN top bar only (~54px tall) with almost no
                margin; it never accounted for ARTPWorkout's separate bar, whose
                own height varies 1-3 stacked lines (Set/Target rows are
                conditional) and can exceed that budget, painting over the top
                of this pill. Pushed further down with real clearance + shrunk
                the digits so any residual overlap is less likely to matter. */}
            {timedMode && secondsLeft != null && !paused && (
              <div className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 84px)' }}>
                <div className={`px-5 py-1 rounded-3xl border backdrop-blur-sm bg-black/60 ${secondsLeft <= 5 ? "border-red-500/70" : "border-white/25"}`}>
                  <span className={`font-black tabular-nums leading-none ${secondsLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
                    style={{ fontSize: "44px" }}>{secondsLeft}</span>
                  <span className="text-white/50 font-bold text-base ml-1">s</span>
                </div>
              </div>
            )}

            {/* Round 20: floating center form-cue removed — it blocked the view;
                the bottom bar still shows the rotating form tip */}

            {/* Rep counter */}
            <div className="absolute bottom-4 left-4 z-10">
              <motion.div animate={repFlash ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="bg-black/75 rounded-2xl px-4 py-3 border border-[#00a9ff]/50 backdrop-blur-sm">
                <div className="text-6xl font-black leading-none tabular-nums" style={{ color: exerciseConfig?.color || "#00a9ff" }}>
                  {shownCount}
                </div>
                <div className="text-white/60 text-xs font-semibold mt-0.5 uppercase tracking-wide">
                  {unitLabel}{shownTarget ? ` / ${shownTarget}` : ""}
                </div>
              </motion.div>

              {/* Distance confidence. The reading degrades with range and the
                  person deserves to know rather than trust a number that is
                  quietly getting worse — see DistanceTracker's range note. */}
              {isDistanceMode && distPhase === "tracking" && (
                <div className={`mt-1.5 rounded-xl px-3 py-1.5 border backdrop-blur-sm bg-black/75 ${
                  !distTracking ? "border-red-500/60"
                    : distConfidence === "good" ? "border-green-500/50"
                    : distConfidence === "fair" ? "border-amber-500/50" : "border-red-500/50"
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${
                    !distTracking ? "text-red-400"
                      : distConfidence === "good" ? "text-green-400"
                      : distConfidence === "fair" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {!distTracking ? "Lost you — crawl back in frame"
                      : distConfidence === "good" ? "Tracking"
                      : distConfidence === "fair" ? "Tracking · rough" : "Too far to measure"}
                  </span>
                </div>
              )}

              {/* Shallow attempts. Shown rather than hidden: a rep that didn't
                  count looks like a broken tracker unless you say why. */}
              {partials > 0 && (
                <motion.div animate={shallowFlash ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={`mt-1.5 rounded-xl px-3 py-1.5 border backdrop-blur-sm ${
                    shallowFlash ? "bg-amber-500/30 border-amber-400" : "bg-black/75 border-amber-500/40"
                  }`}>
                  <span className="text-amber-400 text-xs font-bold tabular-nums">{partials} too shallow</span>
                </motion.div>
              )}
            </div>

            {/* Distance progress — same slot the depth meter uses, since no
                exercise has both. Fills from the bottom as the lane is covered. */}
            {isDistanceMode && distPhase === "tracking" && targetFeet > 0 && (
              <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                  {targetFeet} FT
                </span>
                <div className="relative w-3.5 h-28 rounded-full bg-black/70 border border-white/20 overflow-hidden">
                  <div className="absolute left-0 right-0 bottom-0 transition-all duration-200"
                    style={{
                      height: `${Math.min(100, (distFeet / targetFeet) * 100)}%`,
                      background: distFeet >= targetFeet ? "#22c55e" : "#06b6d4",
                    }} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">START</span>
              </div>
            )}

            {/* Depth meter + stage + readout */}
            {!isDistanceMode && (
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1.5">
              {meter && (
                <div className="flex flex-col items-center gap-1 mb-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${meter.atDepth ? "text-green-400" : "text-white/50"}`}>
                    {meter.atDepth ? "DEPTH ✓" : "DEEPER"}
                  </span>
                  <div className="relative w-3.5 h-28 rounded-full bg-black/70 border border-white/20 overflow-hidden">
                    {/* Fill grows downward as the hips drop */}
                    <div className="absolute left-0 right-0 top-0"
                      style={{ height: `${meter.fillPct}%`, background: meter.atDepth ? "#22c55e" : "#00a9ff" }} />
                    {/* The line that has to be crossed: hip level with the knee */}
                    <div className="absolute left-0 right-0 h-[2px] bg-white shadow"
                      style={{ top: `${meter.targetPct}%` }} />
                  </div>
                </div>
              )}
              {stage && (
                <div className="flex items-center gap-1.5 bg-black/75 rounded-full px-3 py-1 border border-white/20"
                  style={{ borderColor: exerciseConfig?.color ? `${exerciseConfig.color}60` : undefined }}>
                  {stage === "up" ? <ChevronUp className="w-4 h-4 text-green-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                  <span className="text-white text-xs font-bold uppercase">{stage}</span>
                </div>
              )}
              <div className="bg-black/75 rounded-full px-3 py-1 border border-white/20">
                <span className="text-white/60 text-xs">{exerciseConfig?.primaryJoint} </span>
                <span className="text-white text-xs font-bold">{currentAngle}{readoutUnit}</span>
              </div>
            </div>
            )}

            {/* ── Distance calibration ──────────────────────────────────────
                The whole method rests on one known distance: stand on the mark,
                hold still, and the apparent body size recorded there becomes the
                yardstick for the rest of the crawl. Nothing can be measured
                before this, so it owns the screen until it's done. */}
            {isDistanceMode && distPhase === "calibrating" && (
              <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
                <Crosshair className="w-10 h-10 text-[#06b6d4] mb-3" />
                <p className="text-white font-bold text-lg leading-tight">
                  Stand {exerciseConfig?.calibrateFeet ?? 6} ft from the phone
                </p>
                <p className="text-gray-400 text-sm mt-2 max-w-xs leading-snug">
                  Face the camera and hold still for a second. That one known distance
                  is what turns your size on screen into feet.
                </p>

                <div className="w-48 h-2 bg-white/10 rounded-full mt-5 overflow-hidden">
                  <div className="h-full bg-[#06b6d4] transition-all duration-150"
                    style={{ width: `${Math.round(calProgress * 100)}%` }} />
                </div>
                <p className={`text-xs mt-2 font-semibold ${distTracking ? "text-green-400" : "text-amber-400"}`}>
                  {distTracking ? "Hold still…" : "Step into frame — I can't see you"}
                </p>

                <div className="mt-6 bg-white/5 border border-white/10 rounded-xl px-4 py-3 max-w-xs">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Put the phone at the <span className="text-white font-semibold">start line</span>,
                    facing down the lane, and crawl straight away from it.
                    Good to about 15 ft, rough to 30 ft, and past that a phone
                    can't see you well enough to measure — use DONE to log it.
                  </p>
                </div>
              </div>
            )}

            {/* Round 20: skeleton toggle moved into the bottom bar */}
          </div>

          {/* ── Camera stopped ──────────────────────────────────────────
              Previously this state was invisible: the feed froze on its last
              frame and the rep count simply stopped moving with nothing said.
              Saying so, and offering the one button that fixes it, is the whole
              feature. */}
          {cameraLost && (
            <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
              <div className="rounded-2xl border border-amber-500/50 bg-[#1a1206]/95 backdrop-blur-sm p-4">
                <div className="flex items-start gap-2.5">
                  <CameraOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-200">Camera stopped</p>
                    <p className="text-[11px] text-amber-200/80 leading-snug mt-0.5">
                      {cameraLost === "denied"
                        ? "Camera permission was turned off. Allow it in your browser settings, then tap Resume."
                        : cameraLost === "backgrounded"
                          ? "iOS released the camera while the app was in the background. Your count is safe."
                          : cameraLost === "frozen"
                            ? "The camera stopped sending frames. Your count is safe — reps just weren't being read."
                            : "Something else took the camera. Your count is safe."}
                    </p>
                    <button onClick={recoverCamera} disabled={reacquiring}
                      className="mt-2.5 min-h-[44px] w-full rounded-xl bg-amber-500 text-black font-black text-sm active:scale-95 disabled:opacity-50">
                      {reacquiring ? "RESTARTING…" : "RESUME CAMERA"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Recording indicator ─────────────────────────────────────── */}
          {recording && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5
                            rounded-full bg-red-600/95 px-3 py-1 shadow-lg">
              <Circle className="w-2.5 h-2.5 fill-white text-white animate-pulse" />
              <span className="text-white text-[11px] font-black tabular-nums tracking-wide">
                REC {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, "0")}
              </span>
              {recWithSound
                ? <Mic className="w-3 h-3 text-white/90" />
                : <MicOff className="w-3 h-3 text-white/70" />}
            </div>
          )}

          {/* ── Finished recording ──────────────────────────────────────── */}
          {recReady && !recording && (
            <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
              <div className="rounded-2xl border border-[#00a9ff]/50 bg-[#041020]/95 backdrop-blur-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#00a9ff]" />
                  <p className="text-sm font-bold text-white">
                    Recording ready · {(recReady.size / 1048576).toFixed(1)} MB
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={saveRecording}
                    className="min-h-[44px] rounded-xl bg-[#00a9ff] text-white font-black text-sm active:scale-95 flex items-center justify-center gap-1.5">
                    <Download className="w-4 h-4" /> SAVE
                  </button>
                  <button onClick={() => { try { URL.revokeObjectURL(recReady.url); } catch (_) {} setRecReady(null); }}
                    className="min-h-[44px] rounded-xl border border-gray-700 text-gray-300 font-bold text-sm active:scale-95">
                    DISCARD
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug">
                  SAVE opens your phone's share sheet, so you can send it to Photos, Files or anywhere else.
                </p>
              </div>
            </div>
          )}

          {recError && (
            <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
              <div className="rounded-2xl border border-red-500/50 bg-[#1a0606]/95 backdrop-blur-sm p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="flex-1 text-[11px] text-red-200 leading-snug">{recError}</p>
                <button onClick={() => setRecError(null)} className="text-red-300 text-xs font-bold px-1">OK</button>
              </div>
            </div>
          )}

          {/* Bottom bar */}
          <div className="bg-[#020817]/95 backdrop-blur-sm border-t border-white/10 px-4 pt-2 flex flex-col gap-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px + var(--artp-cb-h, 0px))' }}>
            {exerciseConfig?.formCues?.length > 0 && (
              <div className="w-full">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">💡 Form Tip</p>
                <p className="text-xs text-gray-300 leading-snug">{exerciseConfig.formCues[repCount % exerciseConfig.formCues.length]}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={flipCamera}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 bg-gray-800 rounded-2xl border border-white/15 active:scale-95 transition-transform">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-white text-[10px] font-bold leading-none">{facingMode === "user" ? "FRONT" : "REAR"}</span>
              </button>
              {onPause && (
                <button onClick={onPause}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl border active:scale-95 transition-transform ${
                    paused
                      ? "bg-green-600/30 border-green-500/50"
                      : "bg-yellow-600/20 border-yellow-500/40"
                  }`}>
                  {paused
                    ? <><PlayIcon className="w-5 h-5 text-green-400" /><span className="text-green-400 text-[9px] font-bold leading-none">RESUME</span></>
                    : <><Pause className="w-5 h-5 text-yellow-400" /><span className="text-yellow-400 text-[9px] font-bold leading-none">PAUSE</span></>
                  }
                </button>
              )}
              <button onClick={() => setShowSkeleton((p) => !p)}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 h-14 rounded-2xl border active:scale-95 transition-transform ${
                  showSkeleton ? "bg-[#00a9ff]/30 border-[#00a9ff]/60" : "bg-gray-800 border-white/15"
                }`}>
                <Activity className={`w-5 h-5 ${showSkeleton ? "text-[#00a9ff]" : "text-gray-500"}`} />
                <span className={`text-[9px] font-bold leading-none ${showSkeleton ? "text-[#00a9ff]" : "text-gray-500"}`}>SKEL</span>
              </button>
              <button onClick={resetCount}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 h-14 bg-gray-800 rounded-2xl border border-white/15 active:scale-95 transition-transform">
                <RotateCcw className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-[9px] font-bold leading-none">RESET</span>
              </button>
              {/* Record the set. Long-press isn't discoverable enough for a
                  gym, so sound is its own small toggle beside it. */}
              <button onClick={recording ? stopRecording : startRecording}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 h-14 rounded-2xl border active:scale-95 transition-transform ${
                  recording ? "bg-red-600/30 border-red-500/60" : "bg-gray-800 border-white/15"
                }`}>
                {recording
                  ? <><Square className="w-5 h-5 text-red-400" /><span className="text-red-400 text-[9px] font-bold leading-none">STOP</span></>
                  : <><Video className="w-5 h-5 text-gray-400" /><span className="text-gray-400 text-[9px] font-bold leading-none">REC</span></>}
              </button>
              {!recording && (
                <button
                  onClick={() => setRecWithSound((p) => {
                    const next = !p;
                    try { localStorage.setItem("rns_rec_sound", next ? "1" : "0"); } catch (_) {}
                    return next;
                  })}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 h-14 rounded-2xl border active:scale-95 transition-transform ${
                    recWithSound ? "bg-[#00a9ff]/25 border-[#00a9ff]/60" : "bg-gray-800 border-white/15"
                  }`}>
                  {recWithSound
                    ? <><Mic className="w-5 h-5 text-[#00a9ff]" /><span className="text-[#00a9ff] text-[9px] font-bold leading-none">SOUND</span></>
                    : <><MicOff className="w-5 h-5 text-gray-500" /><span className="text-gray-500 text-[9px] font-bold leading-none">MUTE</span></>}
                </button>
              )}
              <button onClick={handleDone}
                className="flex-1 h-14 bg-[#00a9ff] hover:bg-[#0090e0] active:scale-95 transition-transform text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#00a9ff]/30">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">DONE — {shownCount} {unitLabel}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Exercise picker sheet */}
      <AnimatePresence>
        {showExPicker && (
          <motion.div key="picker" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-30 bg-[#0f172a] rounded-t-2xl border-t border-white/10 max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-base">Select Exercise</p>
              <button onClick={() => setShowExPicker(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-3"
              style={{ paddingBottom: 'calc(12px + var(--artp-cb-h, 0px))' }}>
              {Object.entries(categories).map(([cat, exList]) => (
                <div key={cat}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 px-1">{cat}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {exList.map((ex) => (
                      <button key={ex.id} onClick={() => changeExercise(ex)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          selectedEx?.id === ex.id ? "border-[#00a9ff]/60 bg-[#00a9ff]/10 text-white" : "border-white/10 bg-white/5 text-gray-300"
                        }`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: ex.color }} />
                        {ex.name}
                        {ex.mode === "time"               && <span className="ml-1 text-[10px] text-gray-500">(timed)</span>}
                        {ex.trackable === 'experimental'  && <span className="ml-1 text-[10px] text-yellow-500">~</span>}
                        {ex.trackable === false           && <span className="ml-1 text-[10px] text-gray-600">✋</span>}
                           </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
