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
import { matchExercise, RepCounter, getExercisesByCategory } from "@/lib/exerciseTracking";
import {
  X, Camera, Activity, CheckCircle,
  ChevronUp, ChevronDown, AlertTriangle, RotateCcw, Hand, FlaskConical,
  Pause, Play as PlayIcon, Users,
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function RepTracker({ exerciseName, targetReps, onComplete, onClose, defaultFacingMode = "user", exerciseEmoji = "", setLabel = "", paused = false, onPause, autoAdvance = false }) {
  const initialConfig = matchExercise(exerciseName);

  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const landmarkerRef  = useRef(null);
  const streamRef      = useRef(null);
  const animFrameRef   = useRef(null);
  const repCounterRef  = useRef(null);
  const lastVideoTime  = useRef(-1);

  const [isLoading,      setIsLoading]      = useState(initialConfig.trackable !== false);
  const [loadError,      setLoadError]      = useState(null);
  const [showCamTip,     setShowCamTip]     = useState(false);
  const [repCount,       setRepCount]       = useState(0);
  const [stage,          setStage]          = useState(null);
  const [currentAngle,   setCurrentAngle]   = useState(0);
  const [showSkeleton,   setShowSkeleton]   = useState(true);
  const [facingMode,     setFacingMode]     = useState(defaultFacingMode);
  const [repFlash,       setRepFlash]       = useState(false);
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
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
    await startCamera(next);
  }, [facingMode, startCamera]);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch (_) {} landmarkerRef.current = null; }
  }, []);

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
        const numPeople = result?.landmarks?.length || 0;

        // Multiple people in frame → pause counting, warn user
        const isMulti = numPeople > 1;
        multiPersonRef.current = isMulti;
        setMultiPersonDetected(isMulti);

        if (numPeople > 0) {
          const lm = result.landmarks[0]; // always use most-prominent person
          setPoseDetected(true);
          if (skl) drawSkeleton(ctx, lm, sW, sH, fm, 0, 1, dX, dY, dW, dH);

          // Visibility gate: ignore low-confidence detections (background/far-away people)
          const KEY_PTS = [11, 12, 23, 24];
          const avgVis = KEY_PTS.reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0) / KEY_PTS.length;
          const goodVis = avgVis >= 0.35;

          // Only count when: not paused, single person, landmarks clearly visible
          if (counter && !pausedRef.current && !isMulti && goodVis) {
            const u = counter.update(lm);
            setCurrentAngle(Math.round(u.angle));
            setStage(u.stage);
            setRepCount(u.count);
            if (u.repCounted) { triggerRepFlash(); announceRep(u.count); }
          }
        } else { setPoseDetected(false); }
      } catch (_) {}
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  const showSkeletonRef = useRef(showSkeleton);
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);
  const facingModeRef = useRef(facingMode);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
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
    setShowExPicker(false);
  }

  function resetCount() {
    setRepCount(0);
    if (repCounterRef.current) repCounterRef.current.reset();
  }
  function handleDone()  { cleanup(); onComplete?.(repCount); }
  function handleClose() { cleanup(); onClose?.(); }

  const categories = getExercisesByCategory();
  const unitLabel  = exerciseConfig?.mode === "time" ? "sec" : "reps";

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
        <div className="bg-[#020817]/95 backdrop-blur-sm border-t border-white/10 px-4 pt-3 flex flex-col gap-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}>
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
              <div className="overflow-y-auto flex-1 p-3 space-y-3">
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
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 bg-gradient-to-b from-black/80 to-transparent"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', paddingBottom: '10px' }}>
              <button onClick={handleClose} className="w-9 h-9 bg-black/60 rounded-full flex items-center justify-center border border-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setShowExPicker((p) => !p)} className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-white/20">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: exerciseConfig?.color }} />
                <span className="text-white text-sm font-bold truncate max-w-[160px]">{exerciseConfig?.name || exerciseName}</span>
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
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
                <div className="bg-yellow-600/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  No pose detected — step back
                </div>
              </div>
            )}

            {/* Multiple-person warning — reps auto-paused */}
            {multiPersonDetected && (
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
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
              <div className="absolute left-0 right-0 flex justify-center z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
                <div className="bg-yellow-600/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <FlaskConical className="w-3 h-3" />
                  Experimental — counts may be approximate
                </div>
              </div>
            )}

            {/* Exercise name + set label overlay */}
            {(exerciseEmoji || setLabel) && (
              <div className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none px-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
                <div className="flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-full px-4 py-2 border border-white/15">
                  {exerciseEmoji && <span className="text-lg">{exerciseEmoji}</span>}
                  <span className="text-white font-bold text-sm">{exerciseConfig?.name || exerciseName}</span>
                  {setLabel && <span className="text-gray-400 text-xs">{setLabel}</span>}
                </div>
              </div>
            )}

            {/* Form cue overlay — center of camera view, above rep counter */}
            {exerciseConfig?.formCues?.length > 0 && poseDetected && !paused && (
              <div className="absolute left-4 right-4 z-10 flex justify-center pointer-events-none"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>
                <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/15 max-w-xs">
                  <p className="text-[10px] text-[#00a9ff] uppercase tracking-wide font-bold mb-0.5">💡 Form Tip</p>
                  <p className="text-white text-xs leading-snug text-center">{exerciseConfig.formCues[repCount % exerciseConfig.formCues.length]}</p>
                </div>
              </div>
            )}

            {/* Rep counter */}
            <div className="absolute bottom-4 left-4 z-10">
              <motion.div animate={repFlash ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="bg-black/75 rounded-2xl px-4 py-3 border border-[#00a9ff]/50 backdrop-blur-sm">
                <div className="text-6xl font-black leading-none tabular-nums" style={{ color: exerciseConfig?.color || "#00a9ff" }}>
                  {repCount}
                </div>
                <div className="text-white/60 text-xs font-semibold mt-0.5 uppercase tracking-wide">
                  {unitLabel}{targetReps ? ` / ${targetReps}` : ""}
                </div>
              </motion.div>
            </div>

            {/* Stage + angle */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1.5">
              {stage && (
                <div className="flex items-center gap-1.5 bg-black/75 rounded-full px-3 py-1 border border-white/20"
                  style={{ borderColor: exerciseConfig?.color ? `${exerciseConfig.color}60` : undefined }}>
                  {stage === "up" ? <ChevronUp className="w-4 h-4 text-green-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                  <span className="text-white text-xs font-bold uppercase">{stage}</span>
                </div>
              )}
              <div className="bg-black/75 rounded-full px-3 py-1 border border-white/20">
                <span className="text-white/60 text-xs">{exerciseConfig?.primaryJoint} </span>
                <span className="text-white text-xs font-bold">{currentAngle}°</span>
              </div>
            </div>

            {/* Skeleton toggle */}
            <div className="absolute right-3 z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
              <button onClick={() => setShowSkeleton((p) => !p)}
                className={`text-sm px-3.5 py-2 rounded-full border font-bold transition-all flex items-center gap-1.5 ${
                  showSkeleton ? "bg-[#00a9ff]/40 border-[#00a9ff] text-white shadow-lg shadow-[#00a9ff]/20" : "bg-black/60 border-white/30 text-white/60"
                }`}>
                <Activity className="w-4 h-4" />
                {showSkeleton ? "Skeleton ON" : "Skeleton OFF"}
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="bg-[#020817]/95 backdrop-blur-sm border-t border-white/10 px-4 pt-2 flex flex-col gap-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}>
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
              <button onClick={resetCount}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-12 h-14 bg-gray-800 rounded-2xl border border-white/15 active:scale-95 transition-transform">
                <RotateCcw className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-[9px] font-bold leading-none">RESET</span>
              </button>
              <button onClick={handleDone}
                className="flex-1 h-14 bg-[#00a9ff] hover:bg-[#0090e0] active:scale-95 transition-transform text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#00a9ff]/30">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">DONE — {repCount} {unitLabel}</span>
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
            <div className="overflow-y-auto flex-1 p-3 space-y-3">
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
