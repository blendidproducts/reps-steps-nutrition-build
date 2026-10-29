/**
 * MovementTrainer.jsx — record any movement, then count it (doc 17 §1).
 *
 *   list    saved movements + "Record a new movement"
 *   record  camera: hold still -> GO -> 2-3 reps -> stops on its own
 *   review  what was learned (which joints, how many reps) -> name + Save
 *   count   the normal RepTracker, counting the learned movement
 *
 * The engine is lib/movementTemplates.js (tested in
 * _scratch/test-movement-trainer.cjs). Saved movements live on this device
 * until a CustomMovement entity exists in Base44.
 *
 * A custom movement has no external standard: it is counted against your own
 * demo and is never offered in a fitness test or a leaderboard.
 *
 * Weights (2026-10-27): Start opens a weight box (blank = bodyweight, last
 * weight remembered per movement). A finished set is saved as a WorkoutSession
 * with its weight, so it shows in History with its volume (weight x reps).
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RepTracker, { releaseSharedCamera } from "@/components/workout/RepTracker";
import {
  MovementRecorder, makeCustomExerciseConfig,
  loadCustomMovements, saveCustomMovement, deleteCustomMovement,
} from "@/lib/movementTemplates";
import { ScanLine, Play, Trash2, ArrowLeft, Circle, Square, RotateCcw, Check, AlertTriangle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import WeightInput, { weightLabel } from "@/components/workout/WeightInput";
import { ClipTray } from "@/components/workout/AutoTrack";
import { getWeightUnit, setWeightUnit, getLastWeight, rememberWeight, buildExercisesWithSets, fmtNum } from "@/lib/weights";

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
  } catch (_) {}
}
function say(text) {
  try { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════
// Recorder screen
// ═══════════════════════════════════════════════════════════════════════════
function RecordScreen({ onDone, onCancel }) {
  const videoRef = useRef(null), canvasRef = useRef(null);
  const landmarkerRef = useRef(null), streamRef = useRef(null), rafRef = useRef(0);
  const recRef = useRef(new MovementRecorder());
  const [phase, setPhase] = useState("loading");     // loading | waiting | go | recording | done
  const [roughReps, setRoughReps] = useState(0);
  const [seen, setSeen] = useState(false);
  const [error, setError] = useState(null);
  const finishedRef = useRef(false);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { landmarkerRef.current?.close?.(); } catch (_) {}
  };

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopCamera();
    onDone(recRef.current.result());
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The workout tracker may still hold the camera; free it first.
        releaseSharedCamera();
        const { FilesetResolver, PoseLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);
        let lmk;
        try { lmk = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" }, runningMode: "VIDEO", numPoses: 1 }); }
        catch (_) { lmk = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" }, runningMode: "VIDEO", numPoses: 1 }); }
        if (cancelled) { lmk.close(); return; }
        landmarkerRef.current = lmk;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        v.srcObject = stream;
        await new Promise((res) => { v.onloadedmetadata = res; });
        await v.play();
        setPhase("waiting");
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (!cancelled) setError(e?.name === "NotAllowedError" ? "Camera permission is off. Allow it in your browser settings and try again." : "Couldn't start the camera or body tracking.");
      }
    })();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPhase = useRef("waiting");
  const loop = () => {
    const v = videoRef.current, c = canvasRef.current, lmk = landmarkerRef.current;
    if (!v || !c || !lmk || v.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
    const W = c.parentElement?.clientWidth || window.innerWidth, H = c.parentElement?.clientHeight || window.innerHeight;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const va = v.videoWidth / v.videoHeight, ca = W / H;
    let dW, dH, dX, dY;
    if (va > ca) { dW = W; dH = W / va; dX = 0; dY = (H - dH) / 2; } else { dH = H; dW = H * va; dX = (W - dW) / 2; dY = 0; }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(dX + dW, dY); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, dW, dH); ctx.restore();
    const t = performance.now();
    try {
      const lm = lmk.detectForVideo(v, t)?.landmarks?.[0];
      if (lm) {
        setSeen(true);
        for (let i = 11; i <= 28; i++) {
          const p = lm[i]; if (!p || p.visibility < 0.5) continue;
          ctx.beginPath(); ctx.arc(dX + (1 - p.x) * dW, dY + p.y * dH, 7, 0, Math.PI * 2);
          ctx.fillStyle = recRef.current.phase === "recording" ? "#a855f7" : "#00a9ff"; ctx.fill();
        }
        const s = recRef.current.push(t, lm);
        if (s.phase !== lastPhase.current) {
          lastPhase.current = s.phase;
          setPhase(s.phase);
          if (s.phase === "go") { beep(); say("Go"); }
        }
        setRoughReps(s.roughReps);
        if (s.phase === "done") { finish(); return; }
      } else setSeen(false);
    } catch (_) {}
    rafRef.current = requestAnimationFrame(loop);
  };

  const manualStop = () => { recRef.current.stop(); finish(); };

  const prompt = {
    loading: ["Starting camera…", ""],
    waiting: [seen ? "Get into your START position" : "Step into view", seen ? "Hold still — I'll say GO" : "Whole body, or at least everything that moves"],
    go: ["GO", "Do 2-3 reps, then hold still at the start"],
    recording: [`${roughReps} rep${roughReps === 1 ? "" : "s"}`, roughReps >= 2 ? "Hold still at the start to finish" : "Keep going — 2-3 reps"],
    done: ["Got it", "Learning your movement…"],
  }[phase] || ["", ""];

  return createPortal(
    <div style={{ zIndex: 9999, position: "fixed", inset: 0 }} className="bg-black flex flex-col select-none">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <button onClick={() => { stopCamera(); onCancel(); }} aria-label="Cancel recording"
          className="absolute right-4 z-10 w-11 h-11 rounded-full bg-black/70 border border-white/20 flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="absolute inset-x-0 z-10 flex flex-col items-center px-6 text-center pointer-events-none"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}>
          <div className={`rounded-2xl px-5 py-3 bg-black/75 border ${phase === "go" || phase === "recording" ? "border-purple-400/70" : "border-white/20"}`}>
            <p className={`font-black leading-none ${phase === "go" ? "text-5xl text-purple-300" : phase === "recording" ? "text-4xl text-white tabular-nums" : "text-xl text-white"}`}>{prompt[0]}</p>
            {prompt[1] && <p className="text-sm text-white/70 mt-1.5">{prompt[1]}</p>}
          </div>
        </div>
        {error && (
          <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center px-6">
            <div className="max-w-sm rounded-2xl border border-red-500/50 bg-[#1a0606] p-5 text-center">
              <AlertTriangle className="w-7 h-7 text-red-400 mx-auto mb-2" />
              <p className="text-white text-sm">{error}</p>
              <button onClick={onCancel} className="mt-4 min-h-[48px] w-full rounded-xl bg-white/10 text-white font-bold">Back</button>
            </div>
          </div>
        )}
      </div>
      <div className="bg-[#020817] border-t border-white/10 px-4 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 12px) + 12px)" }}>
        {phase === "recording" || phase === "go" ? (
          <button onClick={manualStop}
            className="w-full min-h-[56px] rounded-xl bg-red-600 text-white font-black flex items-center justify-center gap-2 active:scale-[0.98]">
            <Square className="w-5 h-5 fill-white" /> STOP
          </button>
        ) : (
          <p className="text-center text-xs text-gray-400 py-3 leading-snug">
            Prop the phone where it can see the joints that move. Keep it in the same spot for your workouts.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════
export default function MovementTrainer() {
  const navigate = useNavigate();
  const [view, setView] = useState("list");          // list | record | review | count
  const [saved, setSaved] = useState(() => loadCustomMovements());
  const [result, setResult] = useState(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(null);         // movement being counted
  const [lastCount, setLastCount] = useState(null);
  const [armed, setArmed] = useState(null);           // id whose Start was tapped (weight box open)
  const [weight, setWeight] = useState({ weight: 0, unit: getWeightUnit() });
  const startedAtRef = useRef(0);

  const arm = (m) => {
    setLastCount(null);
    setArmed(m.id);
    setWeight(getLastWeight(m.name) || { weight: 0, unit: getWeightUnit() });
  };
  const changeWeight = (w, u) => {
    const next = { weight: w, unit: u };
    setWeight(next); setWeightUnit(u);
    const m = saved.find((x) => x.id === armed);
    if (m) rememberWeight(m.name, w, u);
  };

  // Save the set to History (non-fatal if it fails or the user is offline).
  const saveSet = async (name, n, w) => {
    if (!(n > 0)) return;
    try {
      const { exercises, totalVolumeLbs } = buildExercisesWithSets([
        { name, reps: n, unit: "reps", weight: w.weight || 0, weightUnit: w.unit },
      ]);
      const dur = Math.max(1, Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000));
      await base44.entities.WorkoutSession.create({
        start_time: new Date(Date.now() - dur * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration: dur,
        total_reps: n,
        calories_burned: Math.round((dur / 60) * 6),
        exercises_completed: exercises,
        total_volume_lbs: totalVolumeLbs,
        notes: "Movement Trainer",
      });
    } catch (_) { /* the on-screen count is still shown */ }
  };

  const onRecorded = useCallback((r) => { setResult(r); setName(""); setView("review"); }, []);

  const save = () => {
    const item = saveCustomMovement({ name: name || "My movement", template: result.template });
    if (!item) { alert("Couldn't save on this device — storage is full or blocked."); return; }
    setSaved(loadCustomMovements());
    setResult(null);
    setView("list");
  };

  const remove = (m) => {
    if (!window.confirm(`Delete "${m.name}"?`)) return;
    setSaved(deleteCustomMovement(m.id));
  };

  if (view === "record") return <RecordScreen onDone={onRecorded} onCancel={() => setView("list")} />;

  if (view === "count" && active) {
    return (
      <RepTracker
        exerciseName={active.name}
        customConfig={makeCustomExerciseConfig(active.template, { id: active.id, name: active.name })}
        targetReps={0}
        defaultFacingMode="user"
        onComplete={(n) => {
          releaseSharedCamera();
          setLastCount({ name: active.name, n, weight: weight.weight, unit: weight.unit });
          saveSet(active.name, n, weight);
          setActive(null); setArmed(null); setView("list");
        }}
        onClose={() => { releaseSharedCamera(); setActive(null); setView("list"); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white pb-28">
      <div className="max-w-xl mx-auto px-4 pt-5">
        <button onClick={() => navigate(createPageUrl("Home"))} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-black tracking-tight">Movement Trainer</h1>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-snug">
          Show the camera 2-3 reps of any exercise. It learns which joints move and counts it from then on.
        </p>

        {view === "review" && result && (
          <div className={`rounded-2xl border p-4 mb-5 ${result.ok ? "border-purple-500/50 bg-purple-500/10" : "border-amber-500/50 bg-amber-500/10"}`}>
            {result.ok ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-5 h-5 text-purple-300" />
                  <p className="font-bold">Learned your movement</p>
                </div>
                <p className="text-sm text-gray-300">
                  Tracking your <span className="text-white font-semibold">{result.template.describe}</span> · {result.template.demoReps} demo reps
                </p>
                {result.warning && <p className="text-xs text-amber-300 mt-2">{result.warning}</p>}
                <label className="block text-xs text-gray-400 mt-4 mb-1" htmlFor="mvname">Name it</label>
                <input id="mvname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                  placeholder="e.g. Lateral raise" autoFocus
                  className="w-full min-h-[48px] rounded-xl bg-black/40 border border-white/15 px-3 text-white placeholder:text-gray-500" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => setView("record")} className="min-h-[48px] rounded-xl border border-white/20 text-gray-200 font-bold flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Re-record
                  </button>
                  <button onClick={save} className="min-h-[48px] rounded-xl bg-purple-600 text-white font-black">Save</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                  <p className="font-bold">Couldn't learn that one</p>
                </div>
                <p className="text-sm text-gray-200">{result.message}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => { setResult(null); setView("list"); }} className="min-h-[48px] rounded-xl border border-white/20 text-gray-200 font-bold">Cancel</button>
                  <button onClick={() => setView("record")} className="min-h-[48px] rounded-xl bg-amber-500 text-black font-black">Try again</button>
                </div>
              </>
            )}
          </div>
        )}

        {view === "list" && <div className="mb-4 flex justify-center"><ClipTray /></div>}

        {lastCount && view === "list" && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 mb-4 text-sm">
            <span className="font-bold text-green-300">{lastCount.n}</span> reps of {lastCount.name}
            {lastCount.weight > 0 && (
              <> @ {weightLabel(lastCount.weight, lastCount.unit)} = <span className="font-bold text-amber-300">{fmtNum(lastCount.weight * lastCount.n)} {lastCount.unit}</span> volume</>
            )}
            {lastCount.n > 0 && <span className="block text-xs text-gray-400 mt-0.5">Saved to History</span>}
          </div>
        )}

        {view === "list" && (
          <button onClick={() => { setLastCount(null); setView("record"); }}
            className="w-full min-h-[56px] rounded-xl text-white font-black flex items-center justify-center gap-2 mb-6 active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
            <Circle className="w-4 h-4 fill-red-500 text-red-500" /> Record a new movement
          </button>
        )}

        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Your movements</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Nothing saved yet.</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((m) => (
              <li key={m.id} className="rounded-xl bg-[#0d1524] border border-gray-800 p-3">
                <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.template.describe} · {m.template.side === "both" ? "both sides" : `${m.template.side} side`}</p>
                </div>
                <button onClick={() => remove(m)} aria-label={`Delete ${m.name}`}
                  className="w-11 h-11 rounded-lg border border-gray-700 flex items-center justify-center text-gray-400 active:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => (armed === m.id ? setArmed(null) : arm(m))}
                  className="min-h-[44px] px-4 rounded-lg bg-[#00a9ff] text-white font-black flex items-center gap-1.5">
                  <Play className="w-4 h-4 fill-white" /> Start
                </button>
                </div>
                {armed === m.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <WeightInput value={weight.weight} unit={weight.unit} onChange={changeWeight} />
                    <button onClick={() => { startedAtRef.current = Date.now(); setActive(m); setView("count"); }}
                      className="mt-2 w-full min-h-[48px] rounded-xl bg-green-600 text-white font-black flex items-center justify-center gap-1.5">
                      <Play className="w-4 h-4 fill-white" /> Go{weight.weight > 0 ? ` — ${weightLabel(weight.weight, weight.unit)}` : " — bodyweight"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400 leading-relaxed">
          <p className="font-semibold text-gray-300 mb-1">What works best</p>
          <p>Keep the phone in the same spot as your demo. Movements of the arms, legs or hips work well; small or hidden ones (wrist curls, front-on calf raises, anything that leaves the frame) don't. A one-arm demo counts that arm only. Custom movements count against your own demo, so they aren't used in fitness tests.</p>
        </div>
      </div>
    </div>
  );
}
