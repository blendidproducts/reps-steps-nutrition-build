import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Play, Pause, Square, SkipForward, Plus, Minus, Timer, Target, Footprints,
  Route, Zap, RefreshCw, Link as LinkIcon, Search, Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import StepTracker from "@/components/StepTracker";
import RestScreen from "@/components/workout/RestScreen";
import ActiveRecoveryScreen from "@/components/workout/ActiveRecoveryScreen";
import {
  SupersetTransitionModal, AchievementPopup, VideoModal, ThreeDViewModal,
  SupersetConfigModal, SwapExerciseModal, VoiceCoachModal
} from "@/components/workout/WorkoutModals";

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [repInput, setRepInput] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalReps, setTotalReps] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [cardioIntervals, setCardioIntervals] = useState([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [showHRInput, setShowHRInput] = useState(false);
  const [activeCardio, setActiveCardio] = useState(null);
  const [cardioTimer, setCardioTimer] = useState(0);
  const [restCardioTotal, setRestCardioTotal] = useState(0);
  const [extendedRestTime, setExtendedRestTime] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const [lastBeepSecond, setLastBeepSecond] = useState(null);
  const audioContextRef = useRef(null);
  const timerStartTimeRef = useRef(null);
  const lastTickTimeRef = useRef(Date.now());
  const WARMUP_REST_TIME = 5;
  const [showSupersetModal, setShowSupersetModal] = useState(false);
  const [supersetSelections, setSupersetSelections] = useState([]);
  const [isSupersetTransition, setIsSupersetTransition] = useState(false);
  const [gpsPositions, setGpsPositions] = useState([]);
  const [currentGpsDistance, setCurrentGpsDistance] = useState(0);
  const [gpsWatchId, setGpsWatchId] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [realtimeHR, setRealtimeHR] = useState(null);
  const [totalWorkoutSteps, setTotalWorkoutSteps] = useState(0);
  const [totalWorkoutDistance, setTotalWorkoutDistance] = useState(0);
  const [accelSteps, setAccelSteps] = useState(0);
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [personalRecords, setPersonalRecords] = useState({});
  const [showActiveRecovery, setShowActiveRecovery] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [show3DView, setShow3DView] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  // STEP TRACKING: Use accelerometer as PRIMARY, GPS as distance backup
  // Combine: accel steps are authoritative, GPS provides distance
  const combinedSteps = Math.max(accelSteps, totalWorkoutSteps);

  const handleAccelStepUpdate = useCallback((steps) => {
    setAccelSteps(steps);
    // Also update totalWorkoutSteps so it's saved to localStorage/session
    setTotalWorkoutSteps(prev => Math.max(prev, steps));
  }, []);

  useEffect(() => {
    loadWorkout();
    loadPersonalRecords();
    initVoiceControl();
    return () => { if (voiceRecognition) voiceRecognition.stop(); };
  }, []);

  const loadPersonalRecords = async () => {
    try {
      const sessions = await base44.entities.WorkoutSession.list();
      const records = { mostPushups: 0, longestSprint: 0, mostSquats: 0, longestPlank: 0, mostBurpees: 0 };
      sessions.forEach(session => {
        session.exercises_completed?.forEach(ex => {
          const name = ex.exercise_name.toLowerCase();
          if (name.includes('push') && ex.reps_completed > records.mostPushups) records.mostPushups = ex.reps_completed;
          if (name.includes('squat') && ex.reps_completed > records.mostSquats) records.mostSquats = ex.reps_completed;
          if (name.includes('plank') && ex.time_spent > records.longestPlank) records.longestPlank = ex.time_spent;
          if (name.includes('burpee') && ex.reps_completed > records.mostBurpees) records.mostBurpees = ex.reps_completed;
        });
        (session.cardio_intervals?.filter(c => c.type === 'sprint') || []).forEach(sprint => {
          if (sprint.time > records.longestSprint) records.longestSprint = sprint.time;
        });
      });
      setPersonalRecords(records);
    } catch (error) { console.error('Failed to load records:', error); }
  };

  const checkAchievement = (type, value, exerciseName) => {
    const name = exerciseName.toLowerCase();
    let newRecord = false;
    if (type === 'pushups' && name.includes('push') && value > personalRecords.mostPushups) {
      setAchievementPopup({ title: '🔥 NEW RECORD!', message: `Most Push-ups in a Set: ${value}`, prevRecord: personalRecords.mostPushups });
      setPersonalRecords(prev => ({...prev, mostPushups: value})); newRecord = true;
    } else if (type === 'squats' && name.includes('squat') && value > personalRecords.mostSquats) {
      setAchievementPopup({ title: '🔥 NEW RECORD!', message: `Most Squats in a Set: ${value}`, prevRecord: personalRecords.mostSquats });
      setPersonalRecords(prev => ({...prev, mostSquats: value})); newRecord = true;
    } else if (type === 'burpees' && name.includes('burpee') && value > personalRecords.mostBurpees) {
      setAchievementPopup({ title: '🔥 NEW RECORD!', message: `Most Burpees in a Set: ${value}`, prevRecord: personalRecords.mostBurpees });
      setPersonalRecords(prev => ({...prev, mostBurpees: value})); newRecord = true;
    }
    if (newRecord) setTimeout(() => setAchievementPopup(null), 4000);
  };

  useEffect(() => {
    if (workout?.exercises?.[currentExerciseIndex]) {
      const currentEx = workout.exercises[currentExerciseIndex];
      if ((currentEx.category === 'warmup' || currentEx.metric === 'time') && isActive) setIsTimerPaused(false);
    }
  }, [currentExerciseIndex, workout, isActive]);

  useEffect(() => {
    if (workout) {
      localStorage.setItem('activeWorkoutState', JSON.stringify({
        workout: { ...workout, id: workout.id }, currentExerciseIndex, currentSet, timer, elapsedTimer,
        currentReps, sessionStartTime, totalReps, exerciseTimer, isResting, restTimer, cardioIntervals,
        isPaused, isActive, gpsPositions, totalWorkoutSteps: combinedSteps, totalWorkoutDistance, gpsWatchId
      }));
    }
  }, [workout, currentExerciseIndex, currentSet, timer, elapsedTimer, currentReps, sessionStartTime, totalReps, exerciseTimer, isResting, restTimer, cardioIntervals, isActive, isPaused, gpsPositions, combinedSteps, totalWorkoutDistance]);

  const swapExercise = (newExercise) => {
    const updatedExercises = [...workout.exercises];
    const details = allExercises.find(ex => ex.id === newExercise.id);
    updatedExercises[currentExerciseIndex] = { ...updatedExercises[currentExerciseIndex], exercise_id: newExercise.id, exercise_name: newExercise.name, image_url: details?.image_url, instructions: details?.instructions, metric: details?.metric || 'reps', completed_reps: 0, completed_time: 0 };
    setWorkout({...workout, exercises: updatedExercises}); setCurrentSet(1); setCurrentReps(0); setRepInput(""); setExerciseTimer(0); setShowSwapModal(false); setSwapSearchQuery("");
  };

  const openSupersetModal = () => {
    const remaining = workout.exercises.slice(currentExerciseIndex).map((ex, idx) => ({ index: currentExerciseIndex + idx, name: ex.exercise_name, selected: ex.superset_with_next || false }));
    setSupersetSelections(remaining); setShowSupersetModal(true);
  };

  const applySupersets = () => {
    const updatedExercises = [...workout.exercises];
    supersetSelections.forEach(s => { if (updatedExercises[s.index]) updatedExercises[s.index].superset_with_next = s.selected; });
    setWorkout({...workout, exercises: updatedExercises}); setShowSupersetModal(false); toast.success('Superset settings updated');
  };

  const toggleSupersetSelection = (index) => setSupersetSelections(prev => prev.map(item => item.index === index ? {...item, selected: !item.selected} : item));

  const nextExercise = () => {
    const currentExercise = workout.exercises[currentExerciseIndex];
    if (currentExercise.metric === 'reps' && currentReps > 0) {
      const updatedExercises = [...workout.exercises];
      const prev = updatedExercises[currentExerciseIndex].completed_reps || 0;
      const diff = currentReps - (updatedExercises[currentExerciseIndex].current_set_reps || 0);
      updatedExercises[currentExerciseIndex].completed_reps = prev + diff;
      updatedExercises[currentExerciseIndex].current_set_reps = currentReps;
      setWorkout({...workout, exercises: updatedExercises});
      const n = currentExercise.exercise_name.toLowerCase();
      if (n.includes('push')) checkAchievement('pushups', currentReps, currentExercise.exercise_name);
      if (n.includes('squat')) checkAchievement('squats', currentReps, currentExercise.exercise_name);
      if (n.includes('burpee')) checkAchievement('burpees', currentReps, currentExercise.exercise_name);
    }
    if (currentExercise.superset_with_next && currentExerciseIndex < workout.exercises.length - 1) { setIsSupersetTransition(true); return; }
    if (currentSet < (currentExercise.sets || 1)) {
      let supersetStart = currentExerciseIndex;
      while (supersetStart > 0 && workout.exercises[supersetStart - 1].superset_with_next) supersetStart--;
      if (supersetStart !== currentExerciseIndex) { setCurrentExerciseIndex(supersetStart); setCurrentSet(p => p + 1); } else { setCurrentSet(p => p + 1); }
      setCurrentReps(0); setRepInput(""); setExerciseTimer(0);
      setIsResting(true); setRestTimer(currentExercise.category === 'warmup' ? WARMUP_REST_TIME : (workout.rest_time || (supersetStart !== currentExerciseIndex ? 60 : 30))); setRestCardioTotal(0);
    } else {
      if (currentExerciseIndex < workout.exercises.length - 1) {
        const next = workout.exercises[currentExerciseIndex + 1];
        setCurrentExerciseIndex(p => p + 1); setCurrentSet(1); setCurrentReps(0); setRepInput(""); setExerciseTimer(0);
        const isWarmup = currentExercise.category === 'warmup' || next?.category === 'warmup';
        setIsResting(true); setRestTimer(isWarmup ? WARMUP_REST_TIME : (workout.rest_time || 60)); setRestCardioTotal(0);
      } else { stopWorkout(); }
    }
  };

  const skipRest = () => { setIsResting(false); setRestTimer(0); setRestCardioTotal(0); setExtendedRestTime(0); setShowActiveRecovery(false); };
  const startActiveRecovery = () => { setShowActiveRecovery(true); setRestTimer(workout.rest_time || 60); setRestCardioTotal(0); };
  const skipSupersetTransition = () => {
    const ce = workout.exercises[currentExerciseIndex];
    if (ce.metric === 'reps' && currentReps > 0) {
      const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps || 0;
      const d = currentReps - (ue[currentExerciseIndex].current_set_reps || 0);
      ue[currentExerciseIndex].completed_reps = p + d; ue[currentExerciseIndex].current_set_reps = currentReps;
      setWorkout({...workout, exercises: ue});
    }
    setIsSupersetTransition(false); setCurrentExerciseIndex(p => p + 1); setCurrentReps(0); setRepInput(""); setExerciseTimer(0);
  };
  const addRestTime = (s) => { setRestTimer(p => p + s); setExtendedRestTime(p => p + s); };
  const isFourCountExercise = (name) => ['jumping jacks','arm circles','bicycle crunches','flutter kicks','mountain climbers','butt kickers'].some(ex => name.toLowerCase().includes(ex));

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const startCardio = (type) => { setActiveCardio({ type, startTime: Date.now() }); setCardioTimer(0); setCurrentGpsDistance(0); };
  const stopCardio = () => {
    if (activeCardio) {
      const entry = { type: activeCardio.type, time: cardioTimer, timestamp: new Date().toISOString(), gps_distance: currentGpsDistance };
      if (activeCardio.type === 'sprint' && cardioTimer > personalRecords.longestSprint) {
        setAchievementPopup({ title: '🔥 NEW RECORD!', message: `Longest Sprint: ${formatTime(cardioTimer)}`, prevRecord: personalRecords.longestSprint });
        setPersonalRecords(prev => ({...prev, longestSprint: cardioTimer})); setTimeout(() => setAchievementPopup(null), 4000);
      }
      setCardioIntervals(prev => [...prev, entry]); setActiveCardio(null); setCardioTimer(0); setCurrentGpsDistance(0);
      toast.success(`${activeCardio.type} completed: ${formatTime(cardioTimer)}`);
    }
  };
  const stopCardioAndContinueSuperset = () => { if (activeCardio) stopCardio(); skipSupersetTransition(); };
  const getTotalEstimatedReps = () => workout ? workout.exercises.filter(ex => !ex.is_cardio_interval && ex.metric === 'reps').reduce((s, ex) => s + (ex.target_reps || 0) * (ex.sets || 1), 0) : 0;

  const speak = (text) => { try { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); const voices = window.speechSynthesis.getVoices(); u.voice = voices.find(v => v.lang.includes('en-US')) || voices[0]; u.rate = 1.15; u.pitch = 1.1; window.speechSynthesis.speak(u); } } catch(e){} };

  const initVoiceControl = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true); rec.onend = () => { setIsListening(false); if (isVoiceActive && isActive) setTimeout(() => rec.start(), 100); };
    rec.onerror = (e) => { if ((e.error === 'no-speech' || e.error === 'audio-capture') && isVoiceActive && isActive) setTimeout(() => rec.start(), 500); };
    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes('reps and steps') || transcript.includes('rns')) {
        playBeep(true);
        const cmdMatch = transcript.match(/(?:reps and steps|rns)\s+(.+)/i);
        const cmd = cmdMatch ? cmdMatch[1].trim() : '';
        if (cmd.includes('begin') || cmd.includes('start')) { if (!isActive) { speak('Begin workout!'); startWorkout(); } }
        else if (cmd.match(/(\d+)\s*(reps?\s*)?(completed|done)/i)) { const m = cmd.match(/(\d+)/); if (m) { const r = parseInt(m[1]); if (r > 0 && r <= 500) { setQuickReps(r); speak(`${r} reps recorded.`); } } }
        else if (cmd.includes('skip')) { if (isResting) { skipRest(); speak('Skipping rest.'); } }
        else if (cmd.includes('walk')) { startCardio('walk'); speak('Walking.'); }
        else if (cmd.includes('jog')) { startCardio('jog'); speak('Jogging.'); }
        else if (cmd.includes('sprint') || cmd.includes('run')) { startCardio('sprint'); speak('Sprinting!'); }
        else if (cmd.includes('stop')) { if (activeCardio) { stopCardio(); speak('Cardio stopped.'); } else { speak('Pausing.'); pauseWorkout(); } }
        else if (cmd.includes('next')) { nextExercise(); speak('Next exercise.'); }
      }
    };
    setVoiceRecognition(rec);
  };

  const toggleVoiceControl = async () => {
    if (!voiceRecognition) { toast.error('Voice control not available'); return; }
    if (!isVoiceActive) {
      try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); voiceRecognition.start(); setIsVoiceActive(true); speak('Voice control activated.'); toast.success('🎤 Voice ON'); }
      catch(e) { toast.error(e.name === 'NotAllowedError' ? 'Microphone denied.' : 'Failed.'); }
    } else { voiceRecognition.stop(); setIsVoiceActive(false); speak('Voice off.'); toast.success('Voice OFF'); }
  };

  const playBeep = (isLong = false) => {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (settings.enableTimerBeeps === false) return;
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current; const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination); osc.frequency.value = isLong ? 800 : 1000; osc.type = 'sine';
      g.gain.value = (settings.audioLevels?.timerBeeps || 50) / 100;
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + (isLong ? 0.5 : 0.15));
    } catch(e){}
  };

  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        const now = Date.now(); const elapsed = Math.floor((now - lastTickTimeRef.current) / 1000);
        if (elapsed > 0) {
          lastTickTimeRef.current = now;
          setElapsedTimer(p => { const n = p + elapsed; if (n >= 14400) stopWorkout(); return n; });
          if (!isPaused) {
            setTimer(p => p + elapsed);
            if (activeCardio) { setCardioTimer(p => p + elapsed); setRestCardioTotal(p => p + elapsed); if (restTimer > 0) setRestTimer(p => Math.max(0, p - elapsed)); }
            else if (!isResting) {
              const metric = workout?.exercises[currentExerciseIndex]?.metric || 'reps';
              if (metric === 'reps') setExerciseTimer(p => p + elapsed);
              else {
                const target = workout.exercises[currentExerciseIndex].target_time;
                setExerciseTimer(p => {
                  const n = p + elapsed; const left = target - n;
                  if (left <= 3 && left > 0 && left !== lastBeepSecond && !isTimerPaused) { setLastBeepSecond(left); playBeep(false); }
                  else if (left === 0 && !isTimerPaused) { playBeep(true); setTimeout(nextExercise, 500); }
                  return n;
                });
              }
            } else if (restTimer > 0) {
              setRestTimer(p => {
                const n = p - elapsed;
                if (n <= 3 && n > 0 && n !== lastBeepSecond) { setLastBeepSecond(n); playBeep(false); } else if (n === 0) playBeep(true);
                if (restCardioTotal >= (workout.rest_time || 60)) setTimeout(() => skipRest(), 100);
                return Math.max(0, n);
              });
            } else if (restTimer <= 0 && isResting) skipRest();
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, isResting, restTimer, workout, currentExerciseIndex, activeCardio, isTimerPaused, lastBeepSecond, restCardioTotal]);

  const loadWorkout = async () => {
    try {
      const savedState = localStorage.getItem('activeWorkoutState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (!state.workout?.exercises?.length) { localStorage.removeItem('activeWorkoutState'); throw new Error('Invalid'); }
          setWorkout(state.workout); setCurrentExerciseIndex(state.currentExerciseIndex || 0); setCurrentSet(state.currentSet || 1);
          setTimer(state.timer || 0); setCurrentReps(state.currentReps || 0);
          setSessionStartTime(state.sessionStartTime ? new Date(state.sessionStartTime) : null);
          setTotalReps(state.totalReps || 0); setExerciseTimer(state.exerciseTimer || 0);
          setIsResting(state.isResting || false); setRestTimer(state.restTimer || 0);
          setCardioIntervals(state.cardioIntervals || []); setIsPaused(state.isPaused || false);
          setIsActive(state.isActive || false); setElapsedTimer(state.elapsedTimer || 0);
          setGpsPositions(state.gpsPositions || []); setTotalWorkoutSteps(state.totalWorkoutSteps || 0);
          setTotalWorkoutDistance(state.totalWorkoutDistance || 0);
          if (state.isActive && !state.isPaused) startGlobalGPSTracking();
          setAllExercises(await base44.entities.Exercise.list());
          return;
        } catch(e) { localStorage.removeItem('activeWorkoutState'); }
      }
      const urlParams = new URLSearchParams(window.location.search);
      const workoutId = urlParams.get('workoutId');
      if (!workoutId) { setLoadingError('No workout ID'); setTimeout(() => navigate(createPageUrl("Exercises")), 2000); return; }
      const workoutData = await base44.entities.Workout.filter({id: workoutId});
      if (!workoutData?.length) { setLoadingError('Not found'); setTimeout(() => navigate(createPageUrl("Exercises")), 2000); return; }
      const data = workoutData[0];
      if (!data.exercises?.length) { setLoadingError('No exercises'); setTimeout(() => navigate(createPageUrl("Exercises")), 2000); return; }
      const exList = await base44.entities.Exercise.list(); setAllExercises(exList);
      data.exercises = data.exercises.map(we => {
        const d = exList.find(ex => ex.id === we.exercise_id || ex.name === we.exercise_name);
        return { ...we, image_url: d?.image_url, instructions: d?.instructions, metric: d?.metric || we.metric || 'reps', category: we.category || d?.category || 'full_body', model_url: d?.model_url };
      });
      if (data.workout_type === 'time_based' && data.total_duration > 0) {
        const tpe = Math.floor((data.total_duration * 60) / data.exercises.length);
        data.exercises.forEach(ex => { ex.target_time = tpe; });
      }
      setWorkout(data);
    } catch(e) { setLoadingError(e.message || 'Failed'); setTimeout(() => navigate(createPageUrl("Exercises")), 3000); }
  };

  const startWorkout = () => {
    setIsActive(true); setSessionStartTime(new Date()); timerStartTimeRef.current = Date.now(); lastTickTimeRef.current = Date.now();
    if (isVoiceActive) { const f = workout.exercises[0]; speak(`Begin! ${f.exercise_name}. Go!`); }
    startGlobalGPSTracking();
  };

  const startGlobalGPSTracking = () => {
    if (!('geolocation' in navigator)) { setGpsError('GPS not supported'); return; }
    if (gpsWatchId !== null) { try { navigator.geolocation.clearWatch(gpsWatchId); } catch(e){} setGpsWatchId(null); }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsError(null);
        const newPos = { lat: position.coords.latitude, lon: position.coords.longitude, timestamp: Date.now(), accuracy: position.coords.accuracy, speed: position.coords.speed || 0 };
        setGpsPositions(prev => {
          const updated = [...prev, newPos];
          if (updated.length > 1) {
            let totalDist = 0;
            for (let i = 1; i < updated.length; i++) {
              const c = updated[i], l = updated[i-1];
              if (c.accuracy < 100 && l.accuracy < 100) {
                const d = calculateDistance(l.lat, l.lon, c.lat, c.lon);
                if (d > 0.0003 && d < 0.1) totalDist += d;
              }
            }
            setTotalWorkoutDistance(totalDist);
            // GPS-derived steps as fallback (accel is primary)
            const gpsSteps = Math.round(totalDist * 2100);
            setTotalWorkoutSteps(prev => Math.max(prev, gpsSteps));
          }
          return updated;
        });
      },
      (error) => {
        if (error.code === 1) setGpsError('GPS permission denied');
        else if (error.code === 2) setGpsError('GPS signal weak');
        else setGpsError('GPS timeout');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );
    setGpsWatchId(watchId);
  };

  const pauseWorkout = () => setIsPaused(!isPaused);

  const stopWorkout = async () => {
    localStorage.removeItem('activeWorkoutState');
    const ce = workout.exercises[currentExerciseIndex];
    if (ce?.metric === 'reps' && currentReps > 0) {
      const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps || 0;
      const d = currentReps - (ue[currentExerciseIndex].current_set_reps || 0);
      ue[currentExerciseIndex].completed_reps = p + d; workout.exercises = ue;
    }
    if (gpsWatchId) { navigator.geolocation.clearWatch(gpsWatchId); setGpsWatchId(null); }
    if (voiceRecognition && isVoiceActive) { try { voiceRecognition.stop(); setIsVoiceActive(false); } catch(e){} }
    if (sessionStartTime) {
      const calcReps = workout.exercises.filter(ex => ex.metric === 'reps' && ex.category !== 'warmup').reduce((s, ex) => s + (ex.completed_reps || 0), 0);
      const finalSteps = combinedSteps;
      const walk = cardioIntervals.filter(c => c.type === 'walk'), jog = cardioIntervals.filter(c => c.type === 'jog'), sprint = cardioIntervals.filter(c => c.type === 'sprint');
      const mins = timer / 60;
      const cal = Math.round(mins * 5 + calcReps * 0.15 + walk.reduce((s,c) => s+c.time,0)/60*2 + jog.reduce((s,c) => s+c.time,0)/60*5 + sprint.reduce((s,c) => s+c.time,0)/60*10 + (workout.weight_added_lbs ? workout.weight_added_lbs * 0.02 * mins : 0));
      await base44.entities.WorkoutSession.create({
        workout_id: workout.id, start_time: sessionStartTime.toISOString(), end_time: new Date().toISOString(), duration: timer, total_reps: calcReps,
        exercises_completed: workout.exercises.filter(ex => !ex.is_cardio_interval && ex.category !== 'warmup').map(ex => ({ exercise_name: ex.exercise_name, reps_completed: ex.metric === 'reps' ? (ex.completed_reps || 0) : 0, time_spent: ex.metric === 'time' ? (ex.completed_time || 0) : 0 })),
        calories_burned: cal, weight_added_lbs: workout.weight_added_lbs || 0, cardio_intervals: cardioIntervals,
        cardio_analytics: {
          walk: { count: walk.length, total_time: walk.reduce((s,c) => s+c.time,0), avg_time: walk.length ? Math.round(walk.reduce((s,c) => s+c.time,0)/walk.length) : 0, total_steps: Math.round(walk.reduce((s,c) => s+(c.time/60)*110,0)), total_distance_miles: Math.round(walk.reduce((s,c) => s+(c.gps_distance||(c.time/3600)*3.5),0)*100)/100 },
          jog: { count: jog.length, total_time: jog.reduce((s,c) => s+c.time,0), avg_time: jog.length ? Math.round(jog.reduce((s,c) => s+c.time,0)/jog.length) : 0, total_steps: Math.round(jog.reduce((s,c) => s+(c.time/60)*170,0)), total_distance_miles: Math.round(jog.reduce((s,c) => s+(c.gps_distance||(c.time/3600)*6),0)*100)/100 },
          sprint: { count: sprint.length, total_time: sprint.reduce((s,c) => s+c.time,0), longest_sprint: sprint.length ? Math.max(...sprint.map(c => c.time)) : 0, shortest_sprint: sprint.length ? Math.min(...sprint.map(c => c.time)) : 0, avg_time: sprint.length ? Math.round(sprint.reduce((s,c) => s+c.time,0)/sprint.length) : 0, total_steps: Math.round(sprint.reduce((s,c) => s+(c.time/60)*190,0)), total_distance_miles: Math.round(sprint.reduce((s,c) => s+(c.gps_distance||(c.time/3600)*10),0)*100)/100 },
          total_steps: finalSteps, total_distance_miles: Math.round(totalWorkoutDistance * 100) / 100
        }
      });
    }
    setIsActive(false); localStorage.removeItem('activeWorkoutState');
    setTimeout(() => navigate(createPageUrl("WorkoutComplete")), 100);
  };

  const updateWorkoutProgress = (value, metric) => {
    if (workout) { const ue = [...workout.exercises]; if (ue[currentExerciseIndex]) { if (metric === 'reps') ue[currentExerciseIndex].current_set_reps = value; else ue[currentExerciseIndex].completed_time = value; setWorkout({...workout, exercises: ue}); } }
  };
  const addRep = () => { const n = currentReps + 1; setCurrentReps(n); setTotalReps(p => p+1); const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps||0; ue[currentExerciseIndex].completed_reps = p+1; setWorkout({...workout, exercises: ue}); updateWorkoutProgress(n,'reps'); };
  const subtractRep = () => { if (currentReps > 0) { const n = currentReps-1; setCurrentReps(n); setTotalReps(p => p-1); const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps||0; if (p > 0) { ue[currentExerciseIndex].completed_reps = p-1; setWorkout({...workout, exercises: ue}); } updateWorkoutProgress(n,'reps'); } };
  const setQuickReps = (reps) => { const d = reps - currentReps; setCurrentReps(reps); setTotalReps(p => p+d); const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps||0; ue[currentExerciseIndex].completed_reps = p+d; setWorkout({...workout, exercises: ue}); setRepInput(reps.toString()); updateWorkoutProgress(reps,'reps'); };
  const handleRepInput = (value) => { const reps = parseInt(value)||0; const d = reps - currentReps; setCurrentReps(reps); setTotalReps(p => p+d); const ue = [...workout.exercises]; const p = ue[currentExerciseIndex].completed_reps||0; ue[currentExerciseIndex].completed_reps = p+d; setWorkout({...workout, exercises: ue}); setRepInput(value); updateWorkoutProgress(reps,'reps'); };
  const formatTime = (seconds) => { const m = Math.floor(seconds/60); const s = seconds%60; return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; };

  // ── aria-live announcement throttle ────────────────────────────────────────
  // Announce rep count every 5 reps and timer every 10 seconds to avoid
  // overwhelming screen-reader / TalkBack / VoiceOver users.
  const prevAnnouncedReps = useRef(-1);
  const prevAnnouncedTimer = useRef(-1);

  const ariaTimerAnnouncement = useMemo(() => {
    if (!isActive || isPaused) return "";
    if (isResting) return `Rest: ${restTimer} seconds remaining`;
    if (isTimeBased) {
      const left = (currentExercise?.target_time || 0) - exerciseTimer;
      // announce every 10 s; don't re-announce same value
      const bucket = Math.floor(left / 10) * 10;
      if (bucket !== prevAnnouncedTimer.current && left > 0) {
        prevAnnouncedTimer.current = bucket;
        return `${left} seconds remaining`;
      }
      return "";
    }
    return "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer, exerciseTimer, isResting, isActive, isPaused]);

  const ariaRepAnnouncement = useMemo(() => {
    if (!isActive || isTimeBased) return "";
    // announce on every 5th rep boundary
    const bucket = Math.floor(currentReps / 5) * 5;
    if (currentReps > 0 && bucket !== prevAnnouncedReps.current) {
      prevAnnouncedReps.current = bucket;
      return `${currentReps} reps`;
    }
    return "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReps, isActive, isTimeBased]);
  const getYouTubeVideoId = (name) => { const map = {'push':'IODxDxX7oi4','squat':'9cYEuFbBLSY','plank':'pSHjTRCQxIw','lunge':'QOVaHwm-Q6U','burpee':'dZgVxmf6jkA','pull':'eGo4IYlbE5g','dip':'yN6Q1UI_xkE','mountain climber':'nmwgirgXLYM','jumping jack':'c4DAnQ6DtF8','crunch':'5ER5Of4EISE'}; const n = name.toLowerCase(); for (const [k,v] of Object.entries(map)) if (n.includes(k)) return v; return 'g_tea8ZNk5A'; };

  if (!workout) return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-6">
      <div className="text-center">
        {loadingError ? (<div><div className="text-6xl mb-4">⚠️</div><div className="text-xl text-red-400 mb-2">Error: {loadingError}</div><Button onClick={() => { localStorage.clear(); navigate(createPageUrl("Exercises")); }} className="bg-blue-600 hover:bg-blue-700">Go Back</Button></div>)
        : (<div><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-blue mx-auto mb-4"></div><div className="text-xl">Loading workout...</div></div>)}
      </div>
    </div>
  );

  const currentExercise = workout.exercises[currentExerciseIndex];
  if (!currentExercise) return (<div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-6"><div className="text-center"><div className="text-6xl mb-4">⚠️</div><div className="text-xl text-red-400 mb-2">Invalid workout data</div><Button onClick={() => navigate(createPageUrl("Exercises"))} className="bg-blue-600 hover:bg-blue-700">Go Back</Button></div></div>);

  const isTimeBased = currentExercise.metric === 'time';
  const totalSets = workout.exercises.reduce((s,ex) => s + (ex.sets||1), 0);
  const completedSets = workout.exercises.slice(0, currentExerciseIndex).reduce((s,ex) => s + (ex.sets||1), 0) + (currentSet - 1);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const timeProgress = isTimeBased && currentExercise.target_time ? (exerciseTimer / currentExercise.target_time) * 100 : 0;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="overflow-x-hidden">
      {/* aria-live regions — visually hidden, announce dynamic changes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaTimerAnnouncement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {ariaRepAnnouncement}
      </div>

      {/* Accelerometer Step Tracker - invisible, runs in background */}
      <StepTracker isActive={isActive && !isPaused} onStepUpdate={handleAccelStepUpdate} />

      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3 max-w-2xl pb-20 sm:pb-24">
        {/* Header */}
        <div className="text-center mb-2 sm:mb-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex-1 min-w-0"></div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold px-1 sm:px-2 leading-tight truncate flex-1 min-w-0">{workout.name}</h1>
            {isActive && (<div className="flex-1 flex justify-end"><Button onClick={stopWorkout} size="sm" className="bg-red-500 hover:bg-red-600 text-white font-bold"><Square className="w-4 h-4 mr-1" /> END</Button></div>)}
          </div>
          <div className="flex justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap px-1">
            <div className="flex flex-col items-center min-w-0"><div className="flex items-center gap-1"><Timer className="w-3 h-3 sm:w-4 sm:h-4 text-brand-blue flex-shrink-0" /><span className="font-bold text-xs sm:text-sm">{formatTime(elapsedTimer)}</span></div><span className="text-[10px] sm:text-xs text-gray-400">Total Time</span></div>
            <div className="flex flex-col items-center min-w-0"><div className="flex items-center gap-1"><Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" /><span className="font-bold text-xs sm:text-sm">{formatTime(timer)}</span></div><span className="text-[10px] sm:text-xs text-gray-400">Active Time</span></div>
            <div className="flex flex-col items-center min-w-0"><div className="flex items-center gap-1"><Footprints className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${gpsError ? 'text-red-400' : 'text-purple-400'}`} /><span className="font-bold text-xs sm:text-sm">{combinedSteps.toLocaleString()}</span></div><span className="text-[10px] sm:text-xs text-gray-400">{totalWorkoutDistance.toFixed(2)} mi{gpsError && <span className="text-red-400 ml-1">⚠️</span>}</span></div>
            <div className="flex items-center gap-1 min-w-0"><Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="text-xs sm:text-sm">{totalReps} / {getTotalEstimatedReps()}</span></div>
            <button onClick={() => setShowHRInput(!showHRInput)} className={`flex items-center gap-1.5 ${realtimeHR ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
              <span className="font-bold">{realtimeHR || heartRate || "HR"}</span>{realtimeHR && <span className="text-xs">BPM</span>}
            </button>
            <button onClick={toggleVoiceControl} className={`flex items-center gap-1 px-2 py-1 rounded-lg shadow-lg select-none ${isVoiceActive ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>
              <svg className={`w-4 h-4 ${isVoiceActive ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              <span className="text-xs font-bold">{isVoiceActive ? 'ON' : 'AI'}</span>
            </button>
          </div>
        </div>

        <div className="mb-2 px-2"><div className="flex justify-between text-[10px] sm:text-xs mb-1 text-gray-400"><span>Overall Progress</span><span>{Math.round(progress)}%</span></div><Progress value={progress} className="h-1.5" /></div>

        {/* Modals */}
        <SupersetTransitionModal show={isSupersetTransition} activeCardio={activeCardio} workout={workout} currentExerciseIndex={currentExerciseIndex} cardioTimer={cardioTimer} formatTime={formatTime} startCardio={startCardio} stopCardio={stopCardio} skipSupersetTransition={skipSupersetTransition} stopCardioAndContinueSuperset={stopCardioAndContinueSuperset} />
        <AchievementPopup popup={achievementPopup} />
        <ActiveRecoveryScreen show={showActiveRecovery} activeCardio={activeCardio} restTimer={restTimer} cardioTimer={cardioTimer} formatTime={formatTime} addRestTime={addRestTime} startCardio={startCardio} stopCardio={stopCardio} onClose={() => setShowActiveRecovery(false)} />
        <RestScreen isResting={isResting} activeCardio={activeCardio} workout={workout} currentExerciseIndex={currentExerciseIndex} currentExercise={currentExercise} restTimer={restTimer} restCardioTotal={restCardioTotal} extendedRestTime={extendedRestTime} cardioTimer={cardioTimer} formatTime={formatTime} addRestTime={addRestTime} startCardio={startCardio} stopCardio={stopCardio} skipRest={skipRest} openSupersetModal={openSupersetModal} />

        {/* Current Exercise */}
        <motion.div key={`${currentExerciseIndex}-${currentSet}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="mb-2 px-2">
          <Card className="bg-card backdrop-blur-sm border-border text-white">
            <CardContent className="p-2 sm:p-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue text-xs">Set {currentSet} of {currentExercise.sets || 1}</Badge>
                <div className="flex gap-1">
                  <button aria-label="Configure supersets" onClick={openSupersetModal} className="no-press-feedback w-7 h-7 bg-purple-600/50 hover:bg-purple-600 active:bg-purple-700 active:scale-90 rounded-full flex items-center justify-center transition-all"><LinkIcon className="w-3 h-3" /></button>
                  <button aria-label="Swap exercise" onClick={() => setShowSwapModal(true)} className="no-press-feedback w-7 h-7 bg-blue-600/50 hover:bg-blue-600 active:bg-blue-700 active:scale-90 rounded-full flex items-center justify-center transition-all"><RefreshCw className="w-3 h-3" /></button>
                </div>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 leading-tight">{currentExercise.exercise_name}</h2>
              <div className="flex justify-center gap-2 mb-2">
                <Button onClick={() => setShowHowTo(true)} size="sm" className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 px-3 py-1 h-8"><Play className="w-3 h-3" /><span className="text-xs font-bold">VIDEO</span></Button>
                <Button onClick={() => setShow3DView(true)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 px-3 py-1 h-8"><Box className="w-3 h-3" /><span className="text-xs font-bold">3D</span></Button>
              </div>
              <div className="mb-2">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue text-[10px] sm:text-xs leading-tight">
                  {currentSet < (currentExercise.sets || 1) ? `Set ${currentSet} of ${currentExercise.sets || 1} → Next: Set ${currentSet + 1}` : currentExerciseIndex < workout.exercises.length - 1 ? `Set ${currentSet} completed → Next: ${workout.exercises[currentExerciseIndex + 1]?.exercise_name}` : `Final Set ${currentSet} - Last Exercise!`}
                </Badge>
              </div>
              {!isTimeBased && isFourCountExercise(currentExercise.exercise_name) && <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"><p className="text-yellow-400 text-xs font-semibold">⚠️ 4-COUNT: 1...2...3...4 = 1 REP</p></div>}
              <div className="flex flex-col sm:flex-row gap-3 mb-2">
                <div className="flex-1 bg-background rounded-lg flex items-center justify-center overflow-hidden min-h-[200px] sm:min-h-[280px] max-h-[300px] sm:max-h-[400px]">
                  {currentExercise.image_url ? <img src={currentExercise.image_url} alt={currentExercise.exercise_name} className="w-full h-full object-cover rounded-lg" /> : <Target className="w-16 h-16 text-brand-blue/50" />}
                </div>
                {!isTimeBased ? (
                  <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-3 w-full sm:w-auto sm:min-w-[180px]">
                    <div
                      className="text-6xl sm:text-7xl font-bold mb-2 text-brand-blue"
                      aria-label={`${currentReps} reps completed`}
                      role="status"
                    >{currentReps}</div>
                    <p className="text-sm text-gray-300 font-bold mb-4">Target: {currentExercise.target_reps || 'AMAP'}</p>
                    <div className="flex flex-col gap-3 w-full">
                      {[5, currentExercise.target_reps].filter(Boolean).filter((v,i,a) => a.indexOf(v)===i && v > 0).sort((a,b) => a-b).map(r => (
                        <Button key={r} variant="outline" size="lg" onClick={() => setQuickReps(r)} className="w-full bg-gray-800 border-gray-700 text-white h-12 text-base font-bold">{r}</Button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4 w-full">
                      <Button size="lg" variant="outline" onClick={subtractRep} className="flex-1 h-14 bg-gray-800 border-gray-700 text-white text-base font-bold">-1</Button>
                      <Input type="number" value={repInput} onChange={(e) => handleRepInput(e.target.value)} placeholder="Reps" className="w-24 bg-gray-800 border-gray-700 text-white text-center text-lg font-bold h-14" />
                      <Button size="lg" variant="outline" onClick={addRep} className="flex-1 h-14 bg-gray-800 border-gray-700 text-white text-base font-bold">+1</Button>
                    </div>
                    <div className="flex gap-2 mt-3 w-full">
                      <Button size="lg" variant="outline" onClick={() => { const n = Math.max(0,currentReps-5); const d = n-currentReps; setCurrentReps(n); setTotalReps(p => p+d); const ue = [...workout.exercises]; ue[currentExerciseIndex].completed_reps = Math.max(0,(ue[currentExerciseIndex].completed_reps||0)+d); setWorkout({...workout, exercises: ue}); }} className="flex-1 h-12 bg-gray-800 border-gray-700 text-base font-bold">-5</Button>
                      <Button size="lg" variant="outline" onClick={() => { const n = currentReps+5; setCurrentReps(n); setTotalReps(p => p+5); const ue = [...workout.exercises]; ue[currentExerciseIndex].completed_reps = (ue[currentExerciseIndex].completed_reps||0)+5; setWorkout({...workout, exercises: ue}); }} className="flex-1 h-12 bg-gray-800 border-gray-700 text-base font-bold">+5</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-3 w-full sm:w-auto sm:min-w-[180px]">
                    <div
                      className="text-5xl font-bold mb-2 text-brand-blue"
                      aria-label={`${formatTime(exerciseTimer)} elapsed`}
                      role="timer"
                      aria-live="off"
                    >{formatTime(exerciseTimer)}</div>
                    <p className="text-xs text-gray-400 mb-3">Target: {formatTime(currentExercise.target_time)}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <button aria-label="Decrease target time by 5 seconds" onClick={() => { const t = Math.max(5, currentExercise.target_time-5); const ue = [...workout.exercises]; ue[currentExerciseIndex].target_time = t; setWorkout({...workout, exercises: ue}); }} className="no-press-feedback w-8 h-8 bg-red-600/50 hover:bg-red-600 active:bg-red-700 active:scale-90 rounded-full flex items-center justify-center transition-all"><Minus className="w-4 h-4" /></button>
                      <button aria-label="Increase target time by 5 seconds" onClick={() => { const t = Math.min(300, currentExercise.target_time+5); const ue = [...workout.exercises]; ue[currentExerciseIndex].target_time = t; setWorkout({...workout, exercises: ue}); }} className="no-press-feedback w-8 h-8 bg-green-600/50 hover:bg-green-600 active:bg-green-700 active:scale-90 rounded-full flex items-center justify-center transition-all"><Plus className="w-4 h-4" /></button>
                    </div>
                    <Progress value={timeProgress} className="h-2 w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls */}
        <div className="flex justify-center gap-2 mb-2 px-2">
          {!isActive ? (
            <Button size="lg" onClick={startWorkout} className="gradient-bg text-white px-6 py-3 text-base sm:text-lg font-bold rounded-full flex-1 max-w-xs touch-manipulation min-h-[48px]"><Play className="w-5 h-5 mr-2" /> START</Button>
          ) : (<>
            <Button size="sm" onClick={pauseWorkout} variant="outline" className="bg-yellow-500/20 border-yellow-400 text-white flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm"><Pause className="w-4 h-4 mr-1" /> {isPaused ? 'RESUME' : 'PAUSE'}</Button>
            <Button size="sm" onClick={nextExercise} className="bg-blue-500 hover:bg-blue-600 text-white flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm"><SkipForward className="w-4 h-4 mr-1" /> NEXT</Button>
            <Button size="sm" onClick={stopWorkout} variant="outline" className="bg-red-500/20 border-red-400 text-white flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm"><Square className="w-4 h-4 mr-1" /> STOP</Button>
          </>)}
        </div>

        {isActive && !isResting && !isSupersetTransition && (
          <div className="flex justify-center mb-4 px-2">
            <Button onClick={startActiveRecovery} variant="outline" className="bg-cyan-500/20 border-cyan-400 text-cyan-300 px-4 py-2 touch-manipulation min-h-[44px] text-xs sm:text-sm font-bold"><Timer className="w-4 h-4 mr-2" />ACTIVE RECOVERY</Button>
          </div>
        )}
        {isActive && !isResting && !isSupersetTransition && !isTimeBased && currentExercise.target_reps > 20 && (
          <div className="flex justify-center mb-4 px-2">
            <Button onClick={() => { const ue = [...workout.exercises]; const tr = ue[currentExerciseIndex].target_reps; const nr = Math.ceil(tr/2); const ns = ue[currentExerciseIndex].sets*2; ue[currentExerciseIndex].target_reps = nr; ue[currentExerciseIndex].sets = ns; setWorkout({...workout, exercises: ue}); toast.success(`Split into ${ns} sets of ${nr}`); }}
              variant="outline" className="bg-orange-500/20 border-orange-400 text-orange-300 px-4 py-2 touch-manipulation min-h-[44px] text-xs sm:text-sm font-bold">
              <RefreshCw className="w-4 h-4 mr-2" />SPLIT SETS ({currentExercise.target_reps} → {Math.ceil(currentExercise.target_reps / 2)} x 2)
            </Button>
          </div>
        )}

        {/* Exercise List */}
        <Card className="bg-card border-border mx-2 mb-2">
          <CardContent className="p-2">
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-white">Workout Plan</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto touch-manipulation">
              {workout.exercises.filter(ex => !ex.is_cardio_interval).map((exercise, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded-lg text-sm ${index === currentExerciseIndex ? 'bg-brand-blue/20 border border-brand-blue/30' : index < currentExerciseIndex ? 'bg-green-500/10 text-gray-400' : 'bg-gray-800/50 text-gray-300'}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${index === currentExerciseIndex ? 'bg-brand-blue text-white' : index < currentExerciseIndex ? 'bg-green-500 text-white' : 'bg-gray-700 text-white'}`}>{index + 1}</span>
                    <span className="font-medium truncate">{exercise.exercise_name}</span>
                  </div>
                  <div className="text-xs flex-shrink-0 ml-2">{exercise.metric === 'time' ? `${exercise.target_time}s` : `${exercise.target_reps} reps`}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Modals */}
      <VideoModal show={showHowTo} exerciseName={currentExercise.exercise_name} videoId={getYouTubeVideoId(currentExercise.exercise_name)} instructions={currentExercise.instructions} onClose={() => setShowHowTo(false)} />
      <ThreeDViewModal show={show3DView} exerciseName={currentExercise.exercise_name} modelUrl={currentExercise.model_url} instructions={currentExercise.instructions} onClose={() => setShow3DView(false)} />
      <SupersetConfigModal show={showSupersetModal} selections={supersetSelections} onToggle={toggleSupersetSelection} onApply={applySupersets} onClose={() => setShowSupersetModal(false)} />
      <SwapExerciseModal show={showSwapModal} exercises={allExercises} currentCategory={currentExercise.category} searchQuery={swapSearchQuery} onSearch={setSwapSearchQuery} onSwap={swapExercise} onClose={() => setShowSwapModal(false)} />
      <VoiceCoachModal show={showVoiceHelp} isVoiceActive={isVoiceActive} onActivate={() => { setShowVoiceHelp(false); if (!isVoiceActive) toggleVoiceControl(); }} onClose={() => setShowVoiceHelp(false)} />
    </div>
  );
}