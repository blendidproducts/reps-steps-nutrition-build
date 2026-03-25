import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, CheckCircle, Heart,
  Timer, Dumbbell, Zap, ArrowRight, Plus, Watch,
  RotateCcw, Flag
} from "lucide-react";

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function WatchWorkoutController({ connectedDevice, liveData, activeWorkoutData }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState("exercise"); // exercise | rest | complete
  const [restTimer, setRestTimer] = useState(0);
  const [hrZone, setHrZone] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Load from active workout state
    const saved = localStorage.getItem("activeWorkoutState");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.workout) {
          setWorkout(state.workout);
          setCurrentIdx(state.currentExerciseIndex || 0);
          setTimer(state.timer || 0);
        }
      } catch (_) {}
    } else if (activeWorkoutData?.workout) {
      setWorkout(activeWorkoutData.workout);
      setCurrentIdx(activeWorkoutData.currentExerciseIndex || 0);
      setTimer(activeWorkoutData.timer || 0);
    }
  }, [activeWorkoutData]);

  useEffect(() => {
    if (isPaused || phase === "complete") {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (phase === "exercise") {
        setTimer(t => {
          const next = t + 1;
          // Persist every 5s
          if (next % 5 === 0 && workout) {
            const state = JSON.parse(localStorage.getItem("activeWorkoutState") || "{}");
            localStorage.setItem("activeWorkoutState", JSON.stringify({ ...state, timer: next }));
          }
          return next;
        });
      } else if (phase === "rest") {
        setRestTimer(t => {
          if (t <= 1) {
            setPhase("exercise");
            setReps(0);
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isPaused, phase, workout]);

  // HR zone calculation
  useEffect(() => {
    if (!liveData?.heartRate) return;
    const hr = liveData.heartRate;
    if (hr < 100) setHrZone({ label: "Rest", color: "text-blue-400", bg: "bg-blue-500/20" });
    else if (hr < 130) setHrZone({ label: "Fat Burn", color: "text-green-400", bg: "bg-green-500/20" });
    else if (hr < 155) setHrZone({ label: "Cardio", color: "text-yellow-400", bg: "bg-yellow-500/20" });
    else if (hr < 170) setHrZone({ label: "Anaerobic", color: "text-orange-400", bg: "bg-orange-500/20" });
    else setHrZone({ label: "Max Effort", color: "text-red-400", bg: "bg-red-500/20" });
  }, [liveData?.heartRate]);

  const nextExercise = () => {
    if (!workout) return;
    const exercises = workout.exercises || [];
    const ex = exercises[currentIdx];
    const restTime = ex?.sets > 1 ? 60 : 30;

    if (currentIdx < exercises.length - 1) {
      setPhase("rest");
      setRestTimer(restTime);
      setCurrentIdx(prev => prev + 1);
    } else {
      setPhase("complete");
      clearInterval(intervalRef.current);
    }
  };

  const completeExercise = () => {
    nextExercise();
  };

  if (!workout) {
    return (
      <div className="text-center py-12">
        <Watch className="w-14 h-14 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-300 font-semibold text-lg mb-2">No Active Workout</p>
        <p className="text-gray-500 text-sm mb-6">Start a workout from Exercises or Programs to control it here</p>
        <Button
          onClick={() => navigate(createPageUrl("Exercises"))}
          className="bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold px-8 py-3 h-auto rounded-xl"
        >
          <Dumbbell className="w-5 h-5 mr-2" /> Start a Workout
        </Button>
        {connectedDevice && (
          <p className="text-green-400 text-xs mt-6 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Watch connected — will display live HR during workout
          </p>
        )}
      </div>
    );
  }

  const exercises = workout.exercises || [];
  const exercise = exercises[currentIdx];

  if (phase === "complete") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12">
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-white font-black text-2xl mb-2">Workout Complete!</h2>
        <p className="text-gray-400 mb-2">Total time: <span className="text-white font-bold">{formatTime(timer)}</span></p>
        <p className="text-gray-400 mb-6">Exercises: <span className="text-white font-bold">{exercises.length}</span></p>
        <Button
          onClick={() => navigate(createPageUrl("WorkoutComplete"))}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 h-auto rounded-xl"
        >
          <Flag className="w-5 h-5 mr-2" /> View Summary
        </Button>
      </motion.div>
    );
  }

  if (phase === "rest") {
    return (
      <div className="text-center py-8">
        <div className="w-28 h-28 rounded-full border-4 border-blue-500/40 bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <div>
            <div className="text-4xl font-black text-blue-400">{restTimer}</div>
            <div className="text-blue-300 text-xs">REST</div>
          </div>
        </div>
        <p className="text-gray-300 font-semibold mb-1">Recovery time</p>
        <p className="text-gray-500 text-sm mb-6">
          Up next: <span className="text-white">{exercise?.exercise_name}</span>
        </p>
        <Button onClick={() => { setPhase("exercise"); setRestTimer(0); setReps(0); }}
          className="bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold px-8 py-3 h-auto rounded-xl">
          Skip Rest →
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/10 rounded-full h-1.5">
          <div className="bg-[#00a9ff] h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIdx) / exercises.length) * 100}%` }} />
        </div>
        <span className="text-gray-400 text-xs shrink-0">{currentIdx + 1}/{exercises.length}</span>
      </div>

      {/* HR Zone + Timer row */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-2xl font-bold text-white flex items-center gap-2">
          <Timer className="w-5 h-5 text-[#00a9ff]" />
          {formatTime(timer)}
        </div>
        {connectedDevice && liveData?.heartRate && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${hrZone?.bg || "bg-red-500/20"}`}>
            <Heart className={`w-4 h-4 ${hrZone?.color || "text-red-400"} animate-pulse`} />
            <span className={`font-bold text-sm ${hrZone?.color || "text-red-400"}`}>{liveData.heartRate} BPM</span>
            {hrZone && <span className="text-gray-400 text-xs">· {hrZone.label}</span>}
          </div>
        )}
        {!connectedDevice && (
          <span className="text-gray-600 text-xs">No watch connected</span>
        )}
      </div>

      {/* Exercise card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx}
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          className="bg-gradient-to-br from-[#00a9ff]/10 to-blue-900/20 border border-[#00a9ff]/30 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest">Now</p>
          <h2 className="text-white font-black text-2xl mb-3">{exercise?.exercise_name}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-300 mb-4">
            <span>🎯 {exercise?.target_reps} reps</span>
            {exercise?.sets > 1 && <span>× {exercise.sets} sets</span>}
          </div>

          {/* Big rep counter */}
          <div className="text-7xl font-black text-[#00a9ff] mb-2">{reps}</div>
          <p className="text-gray-500 text-xs">reps completed</p>
        </motion.div>
      </AnimatePresence>

      {/* Large control buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => setReps(r => Math.max(0, r - 1))}
          aria-label="Remove one rep"
          className="h-16 text-2xl font-black bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl"
          variant="ghost"
        >
          −1
        </Button>
        <Button
          onClick={() => setIsPaused(p => !p)}
          aria-label={isPaused ? "Resume workout" : "Pause workout"}
          className={`h-16 font-bold rounded-xl text-white ${isPaused ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}`}
        >
          {isPaused ? <Play className="w-6 h-6" aria-hidden="true" /> : <Pause className="w-6 h-6" aria-hidden="true" />}
        </Button>
        <Button
          onClick={() => setReps(r => r + 1)}
          aria-label="Add one rep"
          className="h-16 text-2xl font-black bg-[#00a9ff] hover:bg-[#007fbf] text-white rounded-xl"
        >
          +1
        </Button>
      </div>

      {/* Complete & Skip */}
      <Button
        onClick={completeExercise}
        aria-label="Mark exercise as done and go to next"
        className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-xl gap-2"
      >
        <CheckCircle className="w-6 h-6" aria-hidden="true" />
        Done — Next Exercise
      </Button>

      <Button
        onClick={nextExercise}
        aria-label="Skip this exercise"
        variant="outline"
        className="w-full border-white/20 text-gray-400 hover:bg-white/10 rounded-xl h-11 gap-2"
      >
        <SkipForward className="w-4 h-4" aria-hidden="true" /> Skip Exercise
      </Button>

      {/* Next exercise preview */}
      {exercises[currentIdx + 1] && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Up next</p>
            <p className="text-gray-300 text-sm font-medium">{exercises[currentIdx + 1].exercise_name}</p>
          </div>
          <span className="ml-auto text-gray-500 text-xs">{exercises[currentIdx + 1].target_reps} reps</span>
        </div>
      )}
    </div>
  );
}