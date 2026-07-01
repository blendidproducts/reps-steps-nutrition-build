/**
 * ARTPWorkout.jsx — AI Rep Tracking Program
 *
 * Guided AI workout with:
 *  - Exercise selection, save/edit, superset, "Choose for Me"
 *  - Sets configuration (1–5 sets, repeats full circuit each set)
 *  - AMRAP or Timed mode
 *  - Per-exercise preview card (emoji + cue + camera tip) before each exercise
 *  - Full guided rest: Walk / Jog / Sprint + step counter + adjustable timer
 *  - Elapsed workout timer always visible
 *  - End Workout button (in-UI confirm sheet — no window.confirm)
 *  - Rep count + step count tracked throughout
 *  - Full report on completion with per-exercise & per-set breakdown
 */

import React, { useState, useEffect, useRef, useCallback, Component } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";
import { checkIsPro } from "@/lib/proCheck";
import { motion, AnimatePresence } from "framer-motion";
import RepTracker from "@/components/workout/RepTracker";
import StepTracker from "@/components/StepTracker";
import {
  Brain, Timer, Zap, ChevronRight, ChevronLeft,
  Trophy, RotateCcw, X, Play, Clock, Shuffle,
  Save, Edit2, CheckCircle, Link as LinkIcon,
  Footprints, Route, Square, Plus, Minus, SkipForward,
  AlertTriangle, Activity, Repeat, BarChart2, Camera,
  Pause, Target,
} from "lucide-react";

// ── Body-trackable exercises (AI pose detection verified) ────────────────────
// Removed: Mountain Climber, Burpee, Sit-Up, Crunch, Bicycle Crunch, Arm Circle
// — pose model cannot reliably count reps for these movements.
const ALL_EXERCISES = [
  { name: "Push-Up",       cue: "Side view · lower chest to floor · full lockout",     emoji: "💪", cameraTip: "Place phone on floor beside you" },
  { name: "Squat",         cue: "Side view · break parallel · drive through heels",     emoji: "🦵", cameraTip: "Place phone at hip height to side" },
  { name: "Jumping Jack",  cue: "Front camera · arms meet overhead · stay rhythmic",    emoji: "⭐", cameraTip: "Front-facing camera works best" },
  { name: "High Knee",     cue: "Front camera · drive knees to hip height · pump arms", emoji: "🏃", cameraTip: "Front-facing camera works best" },
  { name: "Lunge",         cue: "Side view · front knee behind toes · upright torso",   emoji: "🦶", cameraTip: "Place phone at hip height to side" },
  { name: "Reverse Lunge", cue: "Side view · step back · push through front heel",      emoji: "🦶", cameraTip: "Place phone at hip height to side" },
  { name: "Jump Squat",    cue: "Side view · explode up · land softly bent knees",      emoji: "⚡", cameraTip: "Place phone at hip height to side" },
  { name: "Sumo Squat",    cue: "Side view · wide stance · toes at 45°",               emoji: "🏋️", cameraTip: "Place phone at hip height to side" },
  { name: "Leg Raise",     cue: "Side view · press lower back down · legs straight",    emoji: "📐", cameraTip: "Place phone to your side on the floor" },
  { name: "Butt Kicker",   cue: "Side view · kick heels to glutes · light on feet",     emoji: "👟", cameraTip: "Place phone at hip height to side" },
];

const TIME_OPTIONS  = [{ label: "30s", seconds: 30 }, { label: "45s", seconds: 45 }, { label: "60s", seconds: 60 }, { label: "90s", seconds: 90 }];
const SETS_OPTIONS  = [1, 2, 3, 4, 5];
const REP_OPTIONS   = [8, 10, 12, 15, 20];
const REST_DEFAULT  = 30;
const SAVE_KEY      = "artp_saved_program";

// Conditioning preset: cardio/explosive movements
const CONDITIONING_EXERCISES = new Set(["Jumping Jack", "High Knee", "Jump Squat", "Butt Kicker"]);

/** Speak a phrase via TTS — safe no-op if speech not available */
function speak(text, rate = 1.05, pitch = 1.05) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate; u.pitch = pitch; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Exercise Preview Card — shown before each exercise starts ─────────────────
function ExercisePreviewCard({ exercise, setNum, totalSets, onStart, imageUrl }) {
  // Countdown only runs AFTER user presses START NOW — never auto-launches
  const [started, setStarted] = useState(false);
  const [count,   setCount]   = useState(3);

  useEffect(() => {
    const phrase = totalSets > 1
      ? `Set ${setNum}. Get ready for ${exercise.name}!`
      : `Get ready for ${exercise.name}!`;
    speak(phrase, 1.05, 1.1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown ticks only after button press, then calls onStart at 0
  useEffect(() => {
    if (!started) return;
    if (count <= 0) { onStart(); return; }
    if (count === 1) speak("Go!", 1.1, 1.2);
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, started, onStart]);

  const handleStart = () => {
    setStarted(true);
  };

  // Safe-area: use 56px minimum so notch/punch-hole phones don't clip the header
  return (
    <div className="fixed inset-0 bg-[#020817] overflow-y-auto"
      style={{ zIndex: 99998, paddingTop: "max(env(safe-area-inset-top, 0px), 56px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>

      {/* Ghost emoji background */}
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ opacity: 0.05 }}>
          <div className="text-[260px] leading-none">{exercise.emoji}</div>
        </div>
      )}

      <div className="flex flex-col items-center min-h-full px-5 gap-3 py-4">

        {/* Exercise name + set badge — always visible at top */}
        <div className="text-center z-10 w-full">
          {!imageUrl && <div className="text-4xl leading-none mb-1">{exercise.emoji}</div>}
          <h2 className="text-3xl font-black text-white">{exercise.name}</h2>
          {totalSets > 1 && (
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-1.5 mt-2">
              <Repeat className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-sm font-bold">Set {setNum} of {totalSets}</span>
            </div>
          )}
        </div>

        {/* START button OR live countdown */}
        {!started ? (
          <motion.button
            onClick={handleStart}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-xs py-5 rounded-2xl font-black text-xl text-white active:scale-95 transition-transform z-10 shadow-lg shadow-green-900/40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #00c853, #00a9ff)" }}
          >
            <Play className="w-6 h-6 fill-white" />
            START NOW
          </motion.button>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={count}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-[100px] font-black text-white tabular-nums leading-none z-10 drop-shadow-lg">
              {count > 0 ? count : "GO!"}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Exercise image */}
        {imageUrl && (
          <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-gray-700 z-10"
            style={{ maxHeight: 180 }}>
            <img src={imageUrl} alt={exercise.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* How-to guide card */}
        <div className="bg-[#111]/95 border border-gray-700 rounded-2xl p-4 space-y-2.5 w-full max-w-xs z-10">
          <p className="text-white text-sm font-bold text-center mb-1">How To Perform</p>
          <p className="text-gray-300 text-sm text-center leading-relaxed">{exercise.cue}</p>
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
            <Camera className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 text-xs font-medium">{exercise.cameraTip}</p>
          </div>
          {!started && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
              <Target className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-xs font-medium">Get into position, then press START NOW</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Guided Rest Screen — styled to match RestScreen.jsx ──────────────────────
function GuidedRestScreen({ nextExercise, prevExercise, nextSetNum, totalSets, isLastExercise, totalSteps, onSkip, onEndWorkout }) {
  const [restSecs,     setRestSecs]    = useState(REST_DEFAULT);
  const [cardioMode,   setCardioMode]  = useState(null); // null | 'walk' | 'jog' | 'sprint'
  const [cardioTimer,  setCardioTimer] = useState(0);
  const [cardioTotal,  setCardioTotal] = useState(0);   // total seconds of cardio this rest
  const timerRef    = useRef(null);
  const cardioRef   = useRef(null);
  const endRef      = useRef(Date.now() + REST_DEFAULT * 1000); // wall-clock target
  const frozenRef   = useRef(REST_DEFAULT);                     // remaining while cardio pauses it

  // Rest countdown — wall-clock so it survives screen dim / backgrounding.
  useEffect(() => {
    if (cardioMode) { clearInterval(timerRef.current); return; }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setRestSecs(rem);
      if (rem <= 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 250);
    return () => clearInterval(timerRef.current);
  }, [cardioMode]);

  // Adjust rest by seconds (moves the wall-clock target, min 5s).
  const adjustRest = (delta) => {
    const cur = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
    const next = Math.max(5, cur + delta);
    endRef.current = Date.now() + next * 1000;
    setRestSecs(next);
  };

  // Auto-advance when rest hits 0
  useEffect(() => {
    if (restSecs === 0 && !cardioMode) {
      const t = setTimeout(onSkip, 900);
      return () => clearTimeout(t);
    }
  }, [restSecs, cardioMode, onSkip]);

  // Cardio timer
  useEffect(() => {
    if (!cardioMode) return;
    cardioRef.current = setInterval(() => {
      setCardioTimer(s => s + 1);
      setCardioTotal(s => s + 1);
    }, 1000);
    return () => clearInterval(cardioRef.current);
  }, [cardioMode]);

  const startCardio = (type) => {
    frozenRef.current = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000)); // freeze remaining
    setCardioMode(type);
    setCardioTimer(0);
    speak(`${type}ing! Let's go!`, 1.1, 1.1);
  };
  const stopCardio  = () => {
    clearInterval(cardioRef.current);
    endRef.current = Date.now() + frozenRef.current * 1000; // resume where it paused
    setCardioMode(null);
  };

  const urgentRest  = restSecs <= 5 && restSecs > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col justify-end"
      style={{ zIndex: 99990 }}>

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="bg-gray-900 border-t border-[#00a9ff]/30 text-white w-full flex flex-col overflow-hidden"
        style={{
          maxHeight: "72vh",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>

      {/* drag handle */}
      <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
        <div className="p-4 flex flex-col overflow-hidden">

          {!cardioMode ? (
            <>
              {/* ACTIVE RECOVERY header + timer */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-black text-[#00a9ff]">ACTIVE RECOVERY</h2>
                  <button onClick={onEndWorkout}
                    className="flex items-center gap-1 text-[10px] text-red-400 font-bold border border-red-500/30 rounded-full px-2.5 py-1">
                    <Square className="w-3 h-3" /> End
                  </button>
                </div>

                {totalSets > 1 && nextSetNum && isLastExercise && (
                  <p className="text-[10px] text-blue-400 font-semibold mb-2">Starting Set {nextSetNum} of {totalSets} after this rest</p>
                )}

                {/* Timer row */}
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => adjustRest(-15)} disabled={restSecs <= 5}
                      className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-40">
                      <Minus className="w-4 h-4" />
                    </button>
                    <button onClick={() => adjustRest(-30)} disabled={restSecs <= 30}
                      className="w-9 h-9 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors disabled:opacity-40">
                      -30
                    </button>
                  </div>

                  <div className={`text-6xl font-black tabular-nums ${urgentRest ? "text-red-400 animate-pulse" : restSecs === 0 ? "text-green-400" : "text-white"}`}>
                    {restSecs}s
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => adjustRest(15)}
                      className="w-9 h-9 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => adjustRest(30)}
                      className="w-9 h-9 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors">
                      +30
                    </button>
                  </div>
                </div>

                {/* Cardio progress bar */}
                <div className="mb-2">
                  <p className="text-[10px] text-gray-400 text-center mb-1">Cardio: {cardioTotal}s</p>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00a9ff] transition-all duration-1000"
                      style={{ width: `${Math.min(100, (cardioTotal / REST_DEFAULT) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Exercise cards + cardio */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mt-2">
                {/* Previous / Up Next cards */}
                <div className="grid grid-cols-2 gap-2">
                  {prevExercise && (
                    <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-3">
                      <p className="text-[9px] text-green-400 font-bold mb-2">✓ DONE</p>
                      <div className="text-2xl mb-1">{prevExercise.emoji}</div>
                      <p className="text-[10px] font-semibold text-white leading-tight">{prevExercise.name}</p>
                    </div>
                  )}
                  {nextExercise ? (
                    <div className="bg-[#00a9ff]/10 border border-[#00a9ff]/30 rounded-xl p-3">
                      <p className="text-[9px] text-[#00a9ff] font-bold mb-2">▶ UP NEXT</p>
                      <div className="text-2xl mb-1">{nextExercise.emoji}</div>
                      <p className="text-[10px] font-semibold text-white leading-tight">{nextExercise.name}</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-center">
                      <p className="text-yellow-400 text-[10px] font-bold text-center">🏆 Last Set Done!</p>
                    </div>
                  )}
                </div>

                {/* Walk / Jog / Sprint */}
                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">Choose cardio or skip</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => startCardio('walk')}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-green-500 bg-green-600/20 text-green-300 active:scale-95 transition-transform">
                    <Footprints className="w-5 h-5" />
                    <span className="text-[10px] font-black">WALK</span>
                  </button>
                  <button onClick={() => startCardio('jog')}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-yellow-500 bg-yellow-600/20 text-yellow-300 active:scale-95 transition-transform">
                    <Route className="w-5 h-5" />
                    <span className="text-[10px] font-black">JOG</span>
                  </button>
                  <button onClick={() => startCardio('sprint')}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-red-500 bg-red-600/20 text-red-300 active:scale-95 transition-transform">
                    <Zap className="w-5 h-5" />
                    <span className="text-[10px] font-black">SPRINT</span>
                  </button>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-[#00a9ff]/20 pt-3 mt-3">
                <button onClick={onSkip}
                  className="min-h-[48px] rounded-xl border border-gray-500 text-gray-300 font-bold text-xs hover:bg-gray-700 active:scale-95 transition-transform">
                  SKIP REST
                </button>
                <button onClick={onEndWorkout}
                  className="min-h-[48px] rounded-xl border-2 border-red-500/60 bg-red-600/10 text-red-300 font-bold text-xs active:scale-95 transition-transform">
                  END WORKOUT
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Active cardio view */}
              <div className="flex-shrink-0">
                <h2 className="text-2xl font-black text-[#00a9ff] uppercase text-center mb-2">
                  {cardioMode}ing
                </h2>
                <div className="text-6xl font-black text-[#00a9ff] animate-pulse text-center mb-3 tabular-nums">
                  {formatTime(cardioTimer)}
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Footprints className="w-5 h-5 text-gray-400" />
                  <span className="text-2xl font-black text-white">{totalSteps}</span>
                  <span className="text-gray-400 text-sm">total steps</span>
                </div>
                <div className="mb-3">
                  <p className="text-[10px] text-gray-400 text-center">Total Cardio: {cardioTotal}s</p>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-[#00a9ff] transition-all duration-1000"
                      style={{ width: `${Math.min(100, (cardioTotal / REST_DEFAULT) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-[#00a9ff]/20 pt-3">
                <button onClick={stopCardio}
                  className="min-h-[48px] rounded-xl bg-yellow-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95">
                  <Square className="w-4 h-4" /> STOP & SWITCH
                </button>
                <button onClick={() => { stopCardio(); setTimeout(() => onSkip(), 100); }}
                  className="min-h-[48px] rounded-xl bg-green-500 text-white font-bold text-xs active:scale-95">
                  DONE
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Mid-Exercise Active Recovery modal ────────────────────────────────────────
function MidExerciseRecovery({ totalSteps, onClose }) {
  const [cardioMode,  setCardioMode]  = useState(null);
  const [cardioTimer, setCardioTimer] = useState(0);
  const cardioRef = useRef(null);

  useEffect(() => {
    if (!cardioMode) return;
    cardioRef.current = setInterval(() => setCardioTimer(s => s + 1), 1000);
    return () => clearInterval(cardioRef.current);
  }, [cardioMode]);

  const startCardio = (type) => { setCardioMode(type); setCardioTimer(0); speak(`${type}ing! Let's go!`, 1.1, 1.1); };
  const stopCardio  = () => { clearInterval(cardioRef.current); setCardioMode(null); };

  return createPortal(
    <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[10002] flex flex-col items-center justify-center"
      style={{ padding: 'calc(env(safe-area-inset-top, 16px) + 16px) 16px calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>

      <div className="bg-gray-900 border border-[#00a9ff]/40 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#00a9ff]/20 flex items-center justify-between">
          <h2 className="text-[#00a9ff] font-black text-base">ACTIVE RECOVERY</h2>
          <button onClick={onClose} className="text-gray-400 text-xs border border-gray-600 rounded-full px-3 py-1 font-bold">
            ↩ Resume Exercise
          </button>
        </div>

        {!cardioMode ? (
          <div className="p-4 space-y-3">
            <p className="text-gray-400 text-xs text-center">Choose your recovery activity</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => startCardio('walk')}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-green-500 bg-green-600/20 text-green-300 active:scale-95 transition-transform">
                <Footprints className="w-6 h-6" />
                <span className="text-xs font-black">WALK</span>
              </button>
              <button onClick={() => startCardio('jog')}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-yellow-500 bg-yellow-600/20 text-yellow-300 active:scale-95 transition-transform">
                <Route className="w-6 h-6" />
                <span className="text-xs font-black">JOG</span>
              </button>
              <button onClick={() => startCardio('sprint')}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-red-500 bg-red-600/20 text-red-300 active:scale-95 transition-transform">
                <Zap className="w-6 h-6" />
                <span className="text-xs font-black">SPRINT</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Footprints className="w-4 h-4 text-gray-400" />
              <span className="text-white font-black text-lg">{totalSteps}</span>
              <span className="text-gray-400 text-sm">total steps</span>
            </div>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-sm active:scale-95">
              ↩ Return to Exercise
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-2xl font-black text-[#00a9ff] text-center uppercase animate-pulse">{cardioMode}ing</p>
            <p className="text-5xl font-black text-white text-center tabular-nums">{formatTime(cardioTimer)}</p>
            <div className="flex items-center justify-center gap-2">
              <Footprints className="w-5 h-5 text-gray-400" />
              <span className="text-white font-black text-2xl">{totalSteps}</span>
              <span className="text-gray-400 text-sm">total steps</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={stopCardio}
                className="py-3 rounded-xl bg-yellow-500 text-white font-black text-sm active:scale-95">
                ⏹ Switch
              </button>
              <button onClick={() => { stopCardio(); onClose(); }}
                className="py-3 rounded-xl bg-blue-600 text-white font-black text-sm active:scale-95">
                ↩ Resume Exercise
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}

// ── Exit Confirm Sheet ────────────────────────────────────────────────────────
function ExitConfirmSheet({ onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 100000, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#111] rounded-t-3xl border-t border-gray-700 px-5 pb-6 pt-5 z-10"
      >
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">End AI Workout?</p>
            <p className="text-gray-400 text-sm">Your progress will be saved.</p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={onConfirm} className="w-full py-3.5 rounded-xl bg-red-600 text-white font-black text-base active:scale-95 transition-transform">End Workout</button>
          <button onClick={onCancel} className="w-full py-3.5 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm active:scale-95 transition-transform">Keep Going</button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ── Timer overlay (time mode) ────────────────────────────────────────────────
function TimerOverlay({ secondsLeft, exerciseIndex, total, setNum, totalSets, elapsedSecs, totalSteps, targetReps, isPaused, onSkip, onPause, onEndWorkout, onActiveRecovery, onAddSet }) {
  const urgent = secondsLeft <= 5;
  return createPortal(
    <div className="fixed left-0 right-0 z-[10001]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="h-1 bg-white/10">
        <div className={`h-1 transition-all duration-1000 ${isPaused ? "bg-yellow-400" : urgent ? "bg-red-400" : "bg-blue-400"}`}
          style={{ width: `${(secondsLeft / 60) * 100}%` }} />
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/90 backdrop-blur-sm">
        <div className="flex flex-col items-start">
          <span className="text-white/70 text-[10px] font-semibold">Ex {exerciseIndex + 1}/{total}</span>
          {totalSets > 1 && <span className="text-blue-400 text-[9px]">Set {setNum}/{totalSets}</span>}
          {targetReps > 0 && <span className="text-orange-400 text-[9px] font-bold">Target: {targetReps} reps</span>}
        </div>
        <div className={`text-2xl font-black tabular-nums ${isPaused ? "text-yellow-400" : urgent ? "text-red-400" : "text-white"}`}>
          {isPaused ? "⏸" : `${secondsLeft}s`}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onActiveRecovery}
            className="flex items-center gap-0.5 text-[#00a9ff] text-[9px] font-bold border border-[#00a9ff]/40 rounded-full px-1.5 py-0.5 bg-[#00a9ff]/10">
            <Footprints className="w-2.5 h-2.5" />
            <span>{totalSteps}</span>
          </button>
          <span className="text-gray-400 text-[9px] font-mono">{formatTime(elapsedSecs)}</span>
          {!isPaused && <button onClick={onSkip} className="text-white/60 text-[10px] underline">Skip</button>}
          <button onClick={onPause}
            className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${isPaused ? "text-green-400 border-green-500/40" : "text-yellow-400 border-yellow-500/40"}`}>
            {isPaused ? "▶" : "⏸"}
          </button>
          <button onClick={onEndWorkout} className="text-red-400 text-[10px] font-bold border border-red-500/30 rounded-full px-2 py-0.5">End</button>
          <button onClick={onAddSet} className="text-green-400 text-[10px] font-bold border border-green-500/30 rounded-full px-2 py-0.5">+Set</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── AMRAP top bar ────────────────────────────────────────────────────────────
function AmrapBar({ exerciseIndex, total, setNum, totalSets, elapsedSecs, totalSteps, isSS, isPaused, onPause, onEndWorkout, onActiveRecovery, onAddSet }) {
  return createPortal(
    <div className="fixed left-0 right-0 z-[10001]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="h-1 bg-white/10">
        <div className={`h-1 transition-all duration-300 ${isPaused ? "bg-yellow-400" : "bg-blue-400"}`}
          style={{ width: `${(exerciseIndex / total) * 100}%` }} />
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/90 backdrop-blur-sm">
        <div className="flex flex-col items-start">
          <span className="text-white/70 text-[10px] font-semibold">Ex {exerciseIndex + 1}/{total}</span>
          {totalSets > 1 && <span className="text-blue-400 text-[9px]">Set {setNum}/{totalSets}</span>}
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest ${isPaused ? "text-yellow-400" : "text-white/60"}`}>
          {isPaused ? "PAUSED" : `AMRAP${isSS ? " · SS" : ""}`}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onActiveRecovery}
            className="flex items-center gap-0.5 text-[#00a9ff] text-[9px] font-bold border border-[#00a9ff]/40 rounded-full px-1.5 py-0.5 bg-[#00a9ff]/10">
            <Footprints className="w-2.5 h-2.5" />
            <span>{totalSteps}</span>
          </button>
          <span className="text-gray-400 text-[9px] font-mono">{formatTime(elapsedSecs)}</span>
          <button onClick={onPause}
            className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${isPaused ? "text-green-400 border-green-500/40" : "text-yellow-400 border-yellow-500/40"}`}>
            {isPaused ? "▶" : "⏸"}
          </button>
          <button onClick={onEndWorkout} className="text-red-400 text-[10px] font-bold border border-red-500/30 rounded-full px-2 py-0.5">End</button>
          <button onClick={onAddSet} className="text-green-400 text-[10px] font-bold border border-green-500/30 rounded-full px-2 py-0.5">+Set</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Completion / Report screen ────────────────────────────────────────────────
function CompletionScreen({ scores, totalSteps, elapsedSecs, totalSets, exerciseCount, onRestart, onExit, onViewAchievements }) {
  const totalReps = scores.reduce((s, e) => s + (e.reps || 0), 0);
  const completedSets = totalSets;
  // Estimate calories: ~8 cal/min HIIT
  const calEstimate = Math.round((elapsedSecs / 60) * 8);

  // Group scores by exercise name
  const byExercise = {};
  for (const s of scores) {
    if (!byExercise[s.name]) byExercise[s.name] = [];
    byExercise[s.name].push(s.reps);
  }

  return (
    <div className="fixed inset-0 bg-[#020817] flex flex-col overflow-y-auto"
      style={{ zIndex: 99990, paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
      <div className="max-w-md mx-auto w-full px-5 pt-6 space-y-5 pb-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🏆</div>
          <h1 className="text-3xl font-black text-white">Workout Complete!</h1>
          <p className="text-gray-400 text-sm">{exerciseCount} exercises · {completedSets} set{completedSets !== 1 ? "s" : ""} · {formatTime(elapsedSecs)}</p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-blue-400">{totalReps}</p>
            <p className="text-gray-500 text-xs mt-0.5">Total Reps</p>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-green-400">{totalSteps}</p>
            <p className="text-gray-500 text-xs mt-0.5">Steps</p>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-purple-400">{formatTime(elapsedSecs)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Duration</p>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-orange-400">~{calEstimate}</p>
            <p className="text-gray-500 text-xs mt-0.5">Est. Calories</p>
          </div>
        </div>

        {/* Per-exercise breakdown */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <p className="text-white font-semibold text-sm">Exercise Report</p>
          </div>
          <div className="divide-y divide-gray-800">
            {Object.entries(byExercise).map(([name, repsPerSet], i) => {
              const ex = ALL_EXERCISES.find(e => e.name === name);
              const total = repsPerSet.reduce((a, b) => a + b, 0);
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ex?.emoji || "💪"}</span>
                      <span className="text-white text-sm font-medium">{name}</span>
                    </div>
                    <span className="text-blue-400 font-bold text-sm">{total} reps</span>
                  </div>
                  {repsPerSet.length > 1 && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {repsPerSet.map((r, si) => (
                        <span key={si} className="text-[10px] text-gray-500 bg-gray-800 rounded px-2 py-0.5">
                          Set {si + 1}: {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary totals */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-2">Workout Summary</p>
          <div className="space-y-1.5 text-xs text-gray-400">
            <div className="flex justify-between"><span>Exercises completed</span><span className="text-white font-semibold">{exerciseCount}</span></div>
            <div className="flex justify-between"><span>Sets completed</span><span className="text-white font-semibold">{completedSets}</span></div>
            <div className="flex justify-between"><span>Total reps</span><span className="text-white font-semibold">{totalReps}</span></div>
            <div className="flex justify-between"><span>Steps during rest</span><span className="text-white font-semibold">{totalSteps}</span></div>
            <div className="flex justify-between"><span>Total time</span><span className="text-white font-semibold">{formatTime(elapsedSecs)}</span></div>
            <div className="flex justify-between"><span>Est. calories burned</span><span className="text-orange-400 font-semibold">~{calEstimate} kcal</span></div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button onClick={onViewAchievements}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold active:scale-95 transition-transform shadow-lg"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}>
            <Trophy className="w-5 h-5" /> View Achievements &amp; History
          </button>
          <button onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-bold active:scale-95 transition-transform shadow-lg">
            <RotateCcw className="w-5 h-5" /> Run Again
          </button>
          <button onClick={onExit}
            className="w-full py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm active:scale-95 transition-transform">
            Back to Programs
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Error boundary — prevents blank screen if a child crashes ─────────────────
class ARTPErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 bg-[#020817] flex flex-col items-center justify-center px-6 text-center"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 48px)" }}>
          <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Couldn't load workout</h2>
          <p className="text-gray-400 text-sm mb-6">This can happen if the camera or sensors took too long. Try again.</p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-sm"
            >
              ↺ Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 rounded-xl bg-gray-700 text-white font-bold text-sm"
            >
              ← Go Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
// ── Manual tap counter — for conditioning moves the pose model can't count ──
function ManualRepCounter({ onCount }) {
  const [count, setCount] = React.useState(0);
  const bump = (d) => setCount((c) => { const n = Math.max(0, c + d); onCount(n); return n; });
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[99985]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }}>
      <div className="bg-black/80 backdrop-blur-md border border-[#00a9ff]/40 rounded-2xl px-3 py-2 flex items-center gap-3 shadow-2xl">
        <button onClick={() => bump(-1)} aria-label="minus one rep"
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-bold flex items-center justify-center active:scale-95">−</button>
        <div className="text-center min-w-[60px]">
          <div className="text-white text-3xl font-black leading-none tabular-nums">{count}</div>
          <div className="text-[10px] text-gray-400 font-semibold tracking-wider">REPS</div>
        </div>
        <button onClick={() => bump(1)} aria-label="add one rep"
          className="w-14 h-14 rounded-full bg-[#00a9ff] hover:bg-[#0090e0] text-white text-3xl font-black flex items-center justify-center active:scale-95 shadow-lg shadow-[#00a9ff]/30">+</button>
      </div>
    </div>
  );
}

function ARTPWorkoutInner() {
  const navigate = useNavigate();

  // ── Setup state ─────────────────────────────────────────────────
  const [phase,          setPhase]         = useState("setup");
  const [mode,           setMode]          = useState(null);
  const [timePerEx,      setTimePerEx]     = useState(45);
  const [totalSets,      setTotalSets]     = useState(3);

  // Lazy-init directly from localStorage — no useEffect race condition
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const { selectedNames } = JSON.parse(raw);
        if (Array.isArray(selectedNames) && selectedNames.length > 0)
          return new Set(selectedNames);
      }
    } catch {}
    return new Set(ALL_EXERCISES.map(e => e.name));
  });

  const [supersets, setSupersets] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const { supersetNames } = JSON.parse(raw);
        if (Array.isArray(supersetNames)) return new Set(supersetNames);
      }
    } catch {}
    return new Set();
  });

  const [savedName,      setSavedName]     = useState(() => localStorage.getItem(SAVE_KEY + "_name") || "");
  const [showSaveInput,  setShowSaveInput] = useState(false);
  const [saveNameInput,  setSaveNameInput] = useState("");

  // ── Working state ───────────────────────────────────────────────
  const [exerciseIndex,  setExerciseIndex]  = useState(0);
  const [currentSet,     setCurrentSet]     = useState(1);
  const [countdownSecs,  setCountdownSecs]  = useState(3);
  const [timerSecs,      setTimerSecs]      = useState(45);
  const [scores,         setScores]         = useState([]); // { name, reps, set, isSuperset }
  const [totalSteps,     setTotalSteps]     = useState(0);
  const [elapsedSecs,    setElapsedSecs]    = useState(0);
  const [showExitSheet,  setShowExitSheet]  = useState(false);
  const [isPaused,       setIsPaused]       = useState(false);
  const [targetRepsPerEx, setTargetRepsPerEx] = useState(12);
  const [repGoalPerEx,   setRepGoalPerEx]   = useState(20); // used in "goal" mode
  const [showMidRest,    setShowMidRest]    = useState(false);

  const timerRef      = useRef(null);
  const elapsedRef    = useRef(null);
  const pendingReps   = useRef(0);
  const stepBaseRef   = useRef(0);
  const stepLastRef   = useRef(0);
  const exImageMapRef = useRef({}); // exercise name → image_url from backend

  // Fetch exercise images from backend once on mount (best-effort, no-op on failure)
  useEffect(() => {
    base44.entities.Exercise.list().then(list => {
      const map = {};
      list.forEach(ex => {
        if (ex.name && ex.image_url) map[ex.name.toLowerCase()] = ex.image_url;
      });
      exImageMapRef.current = map;
    }).catch(() => {});
  }, []);

  const activeList = ALL_EXERCISES.filter(e => selected.has(e.name));
  const currentEx  = activeList[exerciseIndex];
  const isLastEx   = exerciseIndex === activeList.length - 1;

  // (saved selection is loaded directly in lazy state initialisers above)

  // Elapsed timer — stops when paused
  useEffect(() => {
    if ((phase === "working" || phase === "rest") && !isPaused) {
      elapsedRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000);
    } else {
      clearInterval(elapsedRef.current);
    }
    return () => clearInterval(elapsedRef.current);
  }, [phase, isPaused]);

  const saveProgram = (name) => {
    const nm = name?.trim() || "My ARTP";
    localStorage.setItem(SAVE_KEY, JSON.stringify({ selectedNames: [...selected], supersetNames: [...supersets] }));
    localStorage.setItem(SAVE_KEY + "_name", nm);
    setSavedName(nm);
    setShowSaveInput(false);
    setSaveNameInput("");
  };

  // Restore exercise selection from the last saved snapshot
  const reloadSaved = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const { selectedNames, supersetNames } = JSON.parse(raw);
      if (Array.isArray(selectedNames) && selectedNames.length > 0) setSelected(new Set(selectedNames));
      if (Array.isArray(supersetNames)) setSupersets(new Set(supersetNames));
    } catch {}
  };

  const clearSaved = () => {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY + "_name");
    setSavedName("");
    setSelected(new Set(ALL_EXERCISES.map(e => e.name)));
    setSupersets(new Set());
  };

  const chooseForMe = () => {
    const count = 6 + Math.floor(Math.random() * 7);
    setSelected(new Set(shuffle(ALL_EXERCISES).slice(0, count).map(e => e.name)));
    setSupersets(new Set());
  };

  const toggleExercise = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size <= 1) return prev; next.delete(name); }
      else next.add(name);
      return next;
    });
  };

  const toggleSuperset = (name) => {
    setSupersets(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // ── Save ARTP session to backend so History & Achievements track it ──────────
  // NOTE: declared BEFORE finishExercise so it is initialised when finishExercise's
  // dependency array is evaluated (avoids temporal-dead-zone ReferenceError crash).
  const saveArtpSession = useCallback(async (finalScores, finalSteps, finalElapsed) => {
    try {
      const totalReps = finalScores.reduce((s, e) => s + (e.reps || 0), 0);
      const calEstimate = Math.round((finalElapsed / 60) * 8);
      const exercisesCompleted = Object.entries(
        finalScores.reduce((acc, s) => {
          if (!acc[s.name]) acc[s.name] = 0;
          acc[s.name] += s.reps || 0;
          return acc;
        }, {})
      ).map(([name, reps]) => ({ exercise_name: name, reps_completed: reps, time_spent: 0 }));

      await base44.entities.WorkoutSession.create({
        start_time: new Date(Date.now() - finalElapsed * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration: finalElapsed,
        total_reps: totalReps,
        calories_burned: calEstimate,
        exercises_completed: exercisesCompleted,
        cardio_analytics: {
          total_steps: finalSteps,
          total_distance_miles: Math.round((finalSteps / 2100) * 100) / 100,
          walk: { count: 0, total_time: 0, total_steps: 0, total_distance_miles: 0 },
          jog:  { count: 0, total_time: 0, total_steps: 0, total_distance_miles: 0 },
          sprint: { count: 0, total_time: 0, total_steps: 0, longest_sprint: 0, shortest_sprint: 0 },
        },
      });

      // Update streak
      const { updateStreak } = await import('@/components/services/streakManager');
      const user = await base44.auth.me();
      await updateStreak(user);
    } catch (_) {
      // Non-fatal — workout was still completed
    }
  }, []);

  // ── Advance / finish helpers ─────────────────────────────────────
  const finishExercise = useCallback((reps) => {
    clearInterval(timerRef.current);
    const newScore = { name: currentEx.name, reps: reps || 0, set: currentSet, isSuperset: supersets.has(currentEx.name) };
    setScores(prev => {
      const updated = [...prev, newScore];
      if (isLastEx && currentSet >= totalSets) {
        // Workout naturally complete — save to backend
        clearInterval(elapsedRef.current);
        setElapsedSecs(e => {
          saveArtpSession(updated, totalSteps, e);
          return e;
        });
      }
      return updated;
    });

    if (isLastEx) {
      if (currentSet < totalSets) {
        speak(`Set ${currentSet} complete! Take a rest.`, 1.05, 1.05);
        setPhase("rest");
      } else {
        speak("Workout complete! Amazing work!", 1.1, 1.1);
        clearInterval(elapsedRef.current);
        setPhase("done");
      }
    } else {
      speak("Rest. Get ready for next exercise.", 1.05, 1.05);
      setPhase("rest");
    }
  }, [currentEx, isLastEx, supersets, currentSet, totalSets, totalSteps, saveArtpSession]);

  const advanceToNext = useCallback(() => {
    pendingReps.current = 0;
    if (isLastEx && currentSet < totalSets) {
      // Start next set
      setCurrentSet(s => s + 1);
      setExerciseIndex(0);
      setTimerSecs(timePerEx);
      setPhase("preview");
    } else if (!isLastEx) {
      setExerciseIndex(exerciseIndex + 1);
      setTimerSecs(timePerEx);
      setPhase("preview");
    }
  }, [exerciseIndex, isLastEx, currentSet, totalSets, timePerEx]);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownSecs <= 0) { setPhase("preview"); return; }
    const t = setTimeout(() => setCountdownSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownSecs]);

  // Per-exercise timed countdown — stops when paused
  useEffect(() => {
    if (phase !== "working" || mode !== "time") return;
    if (isPaused) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); finishExercise(pendingReps.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, mode, exerciseIndex, currentSet, isPaused, finishExercise]);

  const handleStart = () => {
    if (!mode || activeList.length === 0) return;
    setExerciseIndex(0); setCurrentSet(1); setScores([]);
    setCountdownSecs(3); setTimerSecs(timePerEx);
    setElapsedSecs(0); setTotalSteps(0); setIsPaused(false);
    pendingReps.current = 0;
    stepBaseRef.current = 0; stepLastRef.current = 0;
    setPhase("countdown");
  };

  const handleRestart = () => {
    setExerciseIndex(0); setCurrentSet(1); setScores([]);
    setCountdownSecs(3); setTimerSecs(timePerEx);
    setElapsedSecs(0); setTotalSteps(0); setIsPaused(false);
    pendingReps.current = 0;
    stepBaseRef.current = 0; stepLastRef.current = 0;
    setPhase("setup");
  };

  const handleRepTrackerComplete = useCallback((reps) => {
    pendingReps.current = reps;
    finishExercise(reps); // RepTracker DONE = advance immediately; no second tap needed
  }, [finishExercise]);

  // Accumulate steps across StepTracker remounts (each phase creates a new instance starting from 0)
  const handleStepUpdate = useCallback((count) => {
    if (count < stepLastRef.current) {
      // Detected remount — carry forward the previous total
      stepBaseRef.current += stepLastRef.current;
    }
    stepLastRef.current = count;
    setTotalSteps(stepBaseRef.current + count);
  }, []);

  // ── Intercept Android hardware back button during active workout phases ──────
  // Without this the WebView navigates away and the workout is lost with no warning.
  useEffect(() => {
    if (phase === "setup" || phase === "done") return; // let normal back work here
    let handle = null;
    // Dynamic + vite-ignored: only resolves when running inside a Capacitor native shell.
    // No-ops (and safely fails) on plain web builds where @capacitor/app isn't installed.
    const pkg = "@capacitor/app";
    import(/* @vite-ignore */ pkg).then(({ App }) => {
      App.addListener("backButton", () => {
        setIsPaused(true);
        setShowExitSheet(true);
      }).then(h => { handle = h; }).catch(() => {});
    }).catch(() => {});
    return () => { handle?.remove?.(); };
  }, [phase]);

  const handlePause  = useCallback(() => setIsPaused(true),  []);
  const handleResume = useCallback(() => setIsPaused(false), []);
  const handleEndWorkout = () => { setIsPaused(false); setShowExitSheet(true); };

  const confirmEndWorkout = () => {
    clearInterval(timerRef.current);
    clearInterval(elapsedRef.current);
    setShowExitSheet(false);
    setScores(prev => {
      const extra = (currentEx && pendingReps.current > 0)
        ? [{ name: currentEx.name, reps: pendingReps.current, set: currentSet, isSuperset: supersets.has(currentEx.name) }]
        : [];
      const finalScores = [...prev, ...extra];
      // Save to backend (non-blocking)
      saveArtpSession(finalScores, totalSteps, elapsedSecs);
      return finalScores;
    });
    speak("Workout complete!", 1.05, 1.05);
    setPhase("done");
  };

  // ── Detect when app returns from background (notifications) ──────────
  // Visibility/appState changes handled in RepTracker directly (RAF recovery).
  // For step counter: native Java sensor auto-recovers; DeviceMotion can't.

  // ── Single-return render — keeps StepTracker mounted across all phases ──
  // This fixes the bug where step counting stopped between phases (the tracker
  // was being unmounted/remounted on every phase transition).

  const isWorkoutActive = phase !== "setup" && phase !== "done";

  // Step badge portal — rendered separately so it persists across all phases
  const stepBadgePortal = isWorkoutActive ? createPortal(
    <div className="fixed z-[10002] flex items-center gap-1 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 pointer-events-none select-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 6px)", right: "12px" }}>
      <Footprints className="w-3.5 h-3.5 text-[#00a9ff]" />
      <span className="text-white text-xs font-bold tabular-nums">{totalSteps}</span>
      <span className="text-gray-400 text-[10px]">steps</span>
    </div>,
    document.body
  ) : null;

  // ── PHASE: setup ───────────────────────────────────────────────────
  if (phase === "setup") return (
    <div className="min-h-screen bg-[#020817] flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 bg-[#111] border-b border-gray-800 sticky top-0 z-10"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 52px)", paddingBottom: "12px" }}>
        <button onClick={() => navigate(createPageUrl("PresetPrograms"))} className="text-gray-400 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Brain className="w-5 h-5 text-blue-400" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold leading-tight truncate">{savedName || "AI Rep Tracking Program"}</h1>
          <p className="text-[10px] text-gray-500">{selected.size} exercises · {totalSets} set{totalSets !== 1 ? "s" : ""}</p>
        </div>
        <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 rounded-full px-2.5 py-0.5 shrink-0">PRO</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[140px]">

        {/* ── Saved Program card ───────────────────────────────────── */}
        {savedName ? (
          <div className="rounded-2xl border-2 border-blue-500/40 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Save className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-0.5">Saved Program</p>
                <p className="text-white font-black text-base truncate">{savedName}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {selected.size} exercise{selected.size !== 1 ? "s" : ""}
                  {supersets.size > 0 ? ` · ${supersets.size} superset${supersets.size !== 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={reloadSaved}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black active:scale-95 transition-transform">
                  ↺ Reload
                </button>
                <button
                  onClick={() => { setShowSaveInput(true); setSaveNameInput(savedName); }}
                  className="px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-gray-700 text-gray-300 text-xs font-semibold active:scale-95 transition-transform">
                  Rename
                </button>
              </div>
            </div>
            {/* Clear saved */}
            <button onClick={clearSaved}
              className="mt-2.5 w-full text-[10px] text-gray-600 underline text-center active:text-red-400 transition-colors">
              Remove saved program
            </button>
          </div>
        ) : (
          /* No saved program yet — show save button prominently */
          <div className="rounded-2xl border border-dashed border-gray-700 p-3 text-center">
            <p className="text-gray-500 text-xs mb-2">No saved program · customise below and save</p>
            <button onClick={() => { setShowSaveInput(true); setSaveNameInput("My ARTP"); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-gray-600 text-gray-300 text-xs font-bold active:scale-95 transition-transform">
              <Save className="w-3.5 h-3.5" /> Save Current Selection
            </button>
          </div>
        )}

        {/* Save / Rename input */}
        <AnimatePresence>
          {showSaveInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex gap-2">
                <input value={saveNameInput} onChange={e => setSaveNameInput(e.target.value)}
                  placeholder="Program name…"
                  className="flex-1 bg-[#1a1a1a] border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" autoFocus />
                <button onClick={() => saveProgram(saveNameInput)} className="px-4 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm active:scale-95">Save</button>
                <button onClick={() => setShowSaveInput(false)} className="px-3 py-3 rounded-xl bg-gray-800 text-gray-400 text-sm">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions: Choose for Me + Conditioning Day + All/Clear */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={chooseForMe}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
            <Shuffle className="w-4 h-4" /> Random
          </button>
          <button
            onClick={() => setSelected(new Set(ALL_EXERCISES.filter(e => CONDITIONING_EXERCISES.has(e.name)).map(e => e.name)))}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #dc2626, #ea580c)", boxShadow: "0 4px 14px rgba(220,38,38,0.35)" }}>
            <Zap className="w-4 h-4" /> Conditioning
          </button>
          <button
            onClick={() => selected.size === ALL_EXERCISES.length
              ? setSelected(new Set([ALL_EXERCISES[0].name]))
              : setSelected(new Set(ALL_EXERCISES.map(e => e.name)))}
            className="px-3 py-3 rounded-xl font-semibold text-sm text-gray-300 bg-[#1a1a1a] border border-gray-700 active:scale-95">
            {selected.size === ALL_EXERCISES.length ? "Clear" : "All"}
          </button>
        </div>

        {/* Sets selector — Repeat icon randomises both exercises AND sets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm">Number of Sets</p>
            <button
              onClick={() => {
                // Randomise exercises: pick 4–10 from the full list
                const exCount = 4 + Math.floor(Math.random() * 7); // 4-10
                setSelected(new Set(shuffle(ALL_EXERCISES).slice(0, exCount).map(e => e.name)));
                setSupersets(new Set());
                // Randomise sets: 1–5
                setTotalSets(SETS_OPTIONS[Math.floor(Math.random() * SETS_OPTIONS.length)]);
              }}
              className="flex items-center gap-1 text-[10px] text-purple-400 border border-purple-500/40 bg-purple-500/10 rounded-full px-2.5 py-1 active:scale-95 transition-transform hover:bg-purple-500/20">
              <Repeat className="w-3 h-3" /> Randomize All
            </button>
          </div>
          <div className="flex gap-2">
            {SETS_OPTIONS.map(n => (
              <button key={n} onClick={() => setTotalSets(n)}
                className={`flex-1 py-3 rounded-xl font-black text-base border-2 transition-all active:scale-95 ${totalSets === n ? "border-blue-400 bg-blue-900/30 text-blue-300" : "border-gray-700 text-gray-400"}`}>
                {n}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-[10px] text-center">
            {selected.size} exercise{selected.size !== 1 ? "s" : ""} × {totalSets} set{totalSets !== 1 ? "s" : ""} = {selected.size * totalSets} total working sets
          </p>
        </div>

        {/* Superset info */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <LinkIcon className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="text-purple-300 text-xs leading-relaxed">
            <span className="font-bold">Superset</span> — tap 🔗 on an exercise to chain it with the next (no rest between them).
          </p>
        </div>

        {/* Exercise list */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Exercises</p>
            <span className="text-blue-400 text-xs font-semibold">{selected.size} selected</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {ALL_EXERCISES.map((ex) => {
              const isSelected = selected.has(ex.name);
              const isSS = supersets.has(ex.name);
              return (
                <div key={ex.name} className={`flex items-center gap-3 px-3 py-3 transition-colors ${isSelected ? "" : "opacity-40"}`}>
                  <button onClick={() => toggleExercise(ex.name)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isSelected ? "bg-blue-500 border-blue-500" : "bg-transparent border-gray-600"}`}>
                    {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                  <span className="text-base flex-shrink-0">{ex.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{ex.name}</p>
                    <p className="text-gray-500 text-[10px] truncate">{ex.cue}</p>
                  </div>
                  {isSelected && (
                    <button onClick={() => toggleSuperset(ex.name)} title="Superset with next"
                      className={`p-1.5 rounded-lg transition-all active:scale-90 ${isSS ? "bg-purple-500/30 text-purple-400 border border-purple-500/40" : "text-gray-700 border border-gray-700"}`}>
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-blue-400/60 text-[10px] flex-shrink-0">AI ✓</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode selection */}
        <div className="space-y-3">
          <p className="text-white font-bold text-sm">Choose mode</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setMode("amrap")}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${mode === "amrap" ? "border-blue-400 bg-blue-900/30" : "border-gray-700 bg-[#111]"}`}>
              <Zap className={`w-4 h-4 mb-1.5 ${mode === "amrap" ? "text-blue-400" : "text-gray-600"}`} />
              <p className="text-white font-bold text-xs">AMRAP</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-tight">Max reps, tap Done</p>
            </button>
            <button onClick={() => setMode("time")}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${mode === "time" ? "border-orange-400 bg-orange-900/20" : "border-gray-700 bg-[#111]"}`}>
              <Clock className={`w-4 h-4 mb-1.5 ${mode === "time" ? "text-orange-400" : "text-gray-600"}`} />
              <p className="text-white font-bold text-xs">Timed</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-tight">Fixed time, auto-advances</p>
            </button>
            <button onClick={() => setMode("goal")}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${mode === "goal" ? "border-green-400 bg-green-900/20" : "border-gray-700 bg-[#111]"}`}>
              <Target className={`w-4 h-4 mb-1.5 ${mode === "goal" ? "text-green-400" : "text-gray-600"}`} />
              <p className="text-white font-bold text-xs">Rep Goal</p>
              <p className="text-gray-400 text-[10px] mt-0.5 leading-tight">Hit target, auto-advances</p>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mode === "time" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              <div className="space-y-2">
                <p className="text-white font-bold text-sm">Time per exercise</p>
                <div className="flex gap-3">
                  {TIME_OPTIONS.map(opt => (
                    <button key={opt.seconds} onClick={() => setTimePerEx(opt.seconds)}
                      className={`flex-1 py-3 rounded-xl font-bold text-base border-2 transition-all ${timePerEx === opt.seconds ? "border-orange-400 bg-orange-500/20 text-orange-300" : "border-gray-700 text-gray-400"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold text-sm">Target reps per set</p>
                <div className="flex gap-2">
                  {REP_OPTIONS.map(n => (
                    <button key={n} onClick={() => setTargetRepsPerEx(n)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all active:scale-95 ${targetRepsPerEx === n ? "border-orange-400 bg-orange-500/20 text-orange-300" : "border-gray-700 text-gray-400"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-gray-600 text-[10px] text-center">Rep target shown during exercise — complete then wait for timer</p>
              </div>
            </motion.div>
          )}
          {mode === "goal" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              <div className="space-y-2">
                <p className="text-white font-bold text-sm">Rep target per exercise</p>
                <div className="flex gap-2">
                  {[10, 15, 20, 25, 30, 50].map(n => (
                    <button key={n} onClick={() => setRepGoalPerEx(n)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all active:scale-95 ${repGoalPerEx === n ? "border-green-400 bg-green-500/20 text-green-300" : "border-gray-700 text-gray-400"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-xs">When you hit <span className="font-bold">{repGoalPerEx} reps</span>, the exercise auto-advances</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Fixed START bar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 8px)", background: "linear-gradient(to top, #020817 70%, transparent)" }}
      >
        <button
          onClick={handleStart}
          disabled={!mode || activeList.length === 0}
          className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
          style={{
            background: (!mode || activeList.length === 0) ? "#374151" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            boxShadow: (!mode || activeList.length === 0) ? "none" : "0 8px 24px rgba(59,130,246,0.4)",
          }}
        >
          <Play className="w-6 h-6" />
          {activeList.length === 0 ? "Select at least 1 exercise"
            : mode ? `START · ${activeList.length} Exercises × ${totalSets} Set${totalSets !== 1 ? "s" : ""}`
            : "Choose a mode above"}
        </button>
      </motion.div>
    </div>
  );

  // ── All active workout phases — single return keeps StepTracker alive ──────
  // A single <> wrapper ensures <StepTracker> is NEVER unmounted between phases,
  // fixing the bug where step counting stopped on every phase transition.
  return (
    <>
      {/* Global step tracker — mounts once when workout starts, unmounts on done/setup */}
      <StepTracker key="artp-global-step-tracker" isActive={true} onStepUpdate={handleStepUpdate} />

      {/* Persistent step badge */}
      {stepBadgePortal}

      {/* ── Countdown ─────────────────────────────────────────────── */}
      {phase === "countdown" && createPortal(
        <div className="fixed inset-0 bg-[#020817] flex flex-col items-center justify-center"
          style={{ zIndex: 99999, paddingTop: "max(env(safe-area-inset-top, 0px), 52px)", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}>
          <AnimatePresence mode="wait">
            <motion.div key={countdownSecs} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.35 }} className="text-center">
              <div className="text-9xl font-black text-white tabular-nums">{countdownSecs > 0 ? countdownSecs : "GO!"}</div>
              <p className="text-gray-400 mt-4 text-lg">First up: {activeList[0]?.name}</p>
              {totalSets > 1 && <p className="text-blue-400 text-sm mt-1">{totalSets} sets · {activeList.length} exercises each</p>}
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* ── Preview ───────────────────────────────────────────────── */}
      {phase === "preview" && createPortal(
        <ExercisePreviewCard
          exercise={currentEx}
          setNum={currentSet}
          totalSets={totalSets}
          imageUrl={exImageMapRef.current[currentEx?.name?.toLowerCase()]}
          onStart={() => { setPhase("working"); }}
        />,
        document.body
      )}

      {/* ── Rest ──────────────────────────────────────────────────── */}
      {phase === "rest" && createPortal(
        <AnimatePresence>
          <GuidedRestScreen
            key="rest"
            nextExercise={isLastEx && currentSet < totalSets ? activeList[0] : activeList[exerciseIndex + 1]}
            prevExercise={activeList[exerciseIndex]}
            nextSetNum={isLastEx && currentSet < totalSets ? currentSet + 1 : currentSet}
            totalSets={totalSets}
            isLastExercise={isLastEx}
            totalSteps={totalSteps}
            onSkip={advanceToNext}
            onEndWorkout={handleEndWorkout}
          />
          {showExitSheet && (
            <ExitConfirmSheet key="exit" onConfirm={confirmEndWorkout} onCancel={() => setShowExitSheet(false)} />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Done ──────────────────────────────────────────────────── */}
      {phase === "done" && createPortal(
        <CompletionScreen
          scores={scores}
          totalSteps={totalSteps}
          elapsedSecs={elapsedSecs}
          totalSets={currentSet}
          exerciseCount={activeList.length}
          onRestart={handleRestart}
          onExit={() => navigate(createPageUrl("PresetPrograms"))}
          onViewAchievements={() => navigate(createPageUrl("Achievements"))}
        />,
        document.body
      )}

      {/* ── Working ───────────────────────────────────────────────── */}
      {phase === "working" && (
        <>
          <AnimatePresence>
            {showExitSheet && (
              <ExitConfirmSheet onConfirm={confirmEndWorkout} onCancel={() => setShowExitSheet(false)} />
            )}
            {showMidRest && (
              <MidExerciseRecovery
                key="mid-rest"
                totalSteps={totalSteps}
                onClose={() => { setShowMidRest(false); setIsPaused(false); }}
              />
            )}
          </AnimatePresence>

          {mode === "time" && (
            <TimerOverlay
              secondsLeft={timerSecs}
              exerciseIndex={exerciseIndex}
              total={activeList.length}
              setNum={currentSet}
              totalSets={totalSets}
              elapsedSecs={elapsedSecs}
              totalSteps={totalSteps}
              targetReps={targetRepsPerEx}
              isPaused={isPaused}
              onSkip={() => finishExercise(pendingReps.current)}
              onPause={isPaused ? handleResume : handlePause}
              onEndWorkout={handleEndWorkout}
              onActiveRecovery={() => { setIsPaused(true); setShowMidRest(true); speak("Active recovery mode", 1.05, 1.05); }}
              onAddSet={() => setTotalSets(s => s + 1)}
            />
          )}

          {(mode === "amrap" || mode === "goal") && (
            <AmrapBar
              exerciseIndex={exerciseIndex}
              total={activeList.length}
              setNum={currentSet}
              totalSets={totalSets}
              elapsedSecs={elapsedSecs}
              totalSteps={totalSteps}
              isSS={supersets.has(currentEx?.name)}
              isPaused={isPaused}
              onPause={isPaused ? handleResume : handlePause}
              onEndWorkout={handleEndWorkout}
              onActiveRecovery={() => { setIsPaused(true); setShowMidRest(true); speak("Active recovery mode", 1.05, 1.05); }}
              onAddSet={() => setTotalSets(s => s + 1)}
            />
          )}

          <RepTracker
            key={`artp-${exerciseIndex}-set${currentSet}`}
            exerciseName={currentEx?.name}
            exerciseEmoji={currentEx?.emoji}
            setLabel={totalSets > 1 ? `Set ${currentSet}/${totalSets}` : ""}
            targetReps={mode === "goal" ? repGoalPerEx : mode === "time" ? targetRepsPerEx : 0}
            autoAdvance={mode === "goal"}
            defaultFacingMode="user"
            paused={isPaused || showMidRest}
            onPause={isPaused ? handleResume : handlePause}
            onComplete={handleRepTrackerComplete}
            onClose={handleEndWorkout}
          />
          {CONDITIONING_EXERCISES.has(currentEx?.name) && (
            <ManualRepCounter
              key={`mc-${exerciseIndex}-set${currentSet}`}
              onCount={(n) => { pendingReps.current = n; }}
            />
          )}
        </>
      )}
    </>
  );
}

export default function ARTPWorkout() {
  const navigate = useNavigate();
  const [isPro,    setIsPro]    = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    User.me()
      .then(u => setIsPro(checkIsPro(u)))
      .catch(() => setIsPro(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00a9ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-2xl font-black text-white mb-2">AI Rep Tracking</h1>
        <p className="text-gray-400 mb-6 max-w-xs">
          AI-powered pose detection and automatic rep counting is a Pro feature.
          Upgrade to unlock it.
        </p>
        <button
          onClick={() => navigate(createPageUrl("Pricing"))}
          className="bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold px-8 py-3 rounded-xl text-lg"
        >
          View Plans
        </button>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-gray-500 text-sm underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return <ARTPErrorBoundary><ARTPWorkoutInner /></ARTPErrorBoundary>;
}
