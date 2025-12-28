import React, { useState, useEffect, useRef } from "react";
import { Workout } from "@/entities/Workout";
import { WorkoutSession } from "@/entities/WorkoutSession";
import { Exercise } from "@/entities/Exercise";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward,
  Plus,
  Minus,
  Timer,
  Target,
  PlayCircle,
  HelpCircle,
  Footprints,
  Route,
  Zap,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";



export default function ActiveWorkout() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState(0); // Total elapsed time like Garmin
  const [currentReps, setCurrentReps] = useState(0);
  const [repInput, setRepInput] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalReps, setTotalReps] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [cardioIntervals, setCardioIntervals] = useState([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [heartRate, setHeartRate] = useState("");
  const [showHRInput, setShowHRInput] = useState(false);
  const [activeCardio, setActiveCardio] = useState(null);
  const [cardioTimer, setCardioTimer] = useState(0);
  const [restCardioTotal, setRestCardioTotal] = useState(0);
  const [extendedRestTime, setExtendedRestTime] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const [lastBeepSecond, setLastBeepSecond] = useState(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    loadWorkout();
  }, []);

  // Auto-start warmup and time-based exercises
  useEffect(() => {
    if (workout && workout.exercises && workout.exercises[currentExerciseIndex]) {
      const currentEx = workout.exercises[currentExerciseIndex];
      if ((currentEx.category === 'warmup' || currentEx.metric === 'time') && isActive) {
        setIsTimerPaused(false);
      }
    }
  }, [currentExerciseIndex, workout, isActive]);

  // Save workout state to localStorage (including workout ID)
  useEffect(() => {
    if (workout) {
      const workoutState = {
        workout: { ...workout, id: workout.id }, // Ensure ID is saved
        currentExerciseIndex,
        currentSet,
        timer,
        elapsedTimer,
        currentReps,
        sessionStartTime,
        totalReps,
        exerciseTimer,
        isResting,
        restTimer,
        cardioIntervals,
        isPaused,
        isActive
      };
      localStorage.setItem('activeWorkoutState', JSON.stringify(workoutState));
    }
  }, [workout, currentExerciseIndex, currentSet, timer, elapsedTimer, currentReps, sessionStartTime, totalReps, exerciseTimer, isResting, restTimer, cardioIntervals, isActive, isPaused]);



  const swapExercise = (newExercise) => {
    const updatedExercises = [...workout.exercises];
    const exerciseDetails = allExercises.find(ex => ex.id === newExercise.id);
    
    updatedExercises[currentExerciseIndex] = {
      ...updatedExercises[currentExerciseIndex],
      exercise_id: newExercise.id,
      exercise_name: newExercise.name,
      image_url: exerciseDetails?.image_url,
      instructions: exerciseDetails?.instructions,
      metric: exerciseDetails?.metric || 'reps',
      completed_reps: 0,
      completed_time: 0
    };
    
    setWorkout({...workout, exercises: updatedExercises});
    setCurrentSet(1);
    setCurrentReps(0);
    setRepInput("");
    setExerciseTimer(0);
    setShowSwapModal(false);
  };

  const nextExercise = () => {
    const currentExercise = workout.exercises[currentExerciseIndex];
    
    // Save completed reps/time for this set before moving on
    const updatedExercises = [...workout.exercises];
    if (updatedExercises[currentExerciseIndex]) {
      const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
      updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + currentReps;
      setWorkout({...workout, exercises: updatedExercises});
    }
    
    // Check if we've completed all sets for current exercise
    if (currentSet < (currentExercise.sets || 1)) {
      setCurrentSet(prev => prev + 1);
      setCurrentReps(0);
      setRepInput("");
      setExerciseTimer(0);
      
      // Rest between sets (not for supersets or warmup)
      if (!currentExercise.superset_with_next && currentExercise.category !== 'warmup') {
        setIsResting(true);
        setRestTimer(workout.rest_time || 30);
        setRestCardioTotal(0);
      }
    } else {
      if (currentExerciseIndex < workout.exercises.length - 1) {
        const nextExercise = workout.exercises[currentExerciseIndex + 1];
        // Rest between exercises (not for supersets or warmup)
        const isCurrentWarmup = currentExercise.category === 'warmup';
        const isNextWarmup = nextExercise?.category === 'warmup';

        if (!currentExercise.superset_with_next && !isCurrentWarmup && !isNextWarmup) {
            setIsResting(true);
            setRestTimer(workout.rest_time || 60);
            setRestCardioTotal(0);
        }
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
        setCurrentReps(0);
        setRepInput("");
        setExerciseTimer(0);
      } else {
        stopWorkout();
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
    setRestCardioTotal(0);
    setExtendedRestTime(0);
  };

  const addRestTime = (seconds) => {
    setRestTimer(prev => prev + seconds);
    setExtendedRestTime(prev => prev + seconds);
  };

  const isFourCountExercise = (exerciseName) => {
    const fourCountExercises = ['jumping jacks', 'arm circles', 'bicycle crunches', 'flutter kicks', 'mountain climbers', 'butt kickers'];
    return fourCountExercises.some(ex => exerciseName.toLowerCase().includes(ex));
  };

  const startCardio = (type) => {
    setActiveCardio({ type, startTime: Date.now() });
    setCardioTimer(0);
  };

  const stopCardio = () => {
    if (activeCardio) {
      const cardioEntry = {
        type: activeCardio.type,
        time: cardioTimer,
        timestamp: new Date().toISOString()
      };
      
      setCardioIntervals(prev => [...prev, cardioEntry]);
      setRestCardioTotal(prev => prev + cardioTimer);
      
      // DO NOT add to workout exercises - just log for analytics
      setActiveCardio(null);
      setCardioTimer(0);
      toast.success(`${activeCardio.type} completed: ${formatTime(cardioTimer)}`);
    }
  };

  const getTotalEstimatedReps = () => {
    if (!workout) return 0;
    return workout.exercises
      .filter(ex => !ex.is_cardio_interval && ex.metric === 'reps')
      .reduce((sum, ex) => sum + (ex.target_reps || 0) * (ex.sets || 1), 0);
  };
  


  const playBeep = (isLong = false) => {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (settings.enableTimerBeeps === false) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = isLong ? 800 : 1000;
      oscillator.type = 'sine';
      
      const volume = (settings.audioLevels?.timerBeeps || 50) / 100;
      gainNode.gain.value = volume;
      
      const duration = isLong ? 0.5 : 0.15;
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
        setElapsedTimer(prev => prev + 1); // Always increment elapsed time
        
        if (activeCardio) {
          setCardioTimer(prev => prev + 1);
        } else if (!isResting) {
          const currentMetric = workout?.exercises[currentExerciseIndex]?.metric || 'reps';
          if (currentMetric === 'reps') {
            setExerciseTimer(prev => prev + 1);
          } else { // Time-based
            const targetTime = workout.exercises[currentExerciseIndex].target_time;
            setExerciseTimer(prevTime => {
              const newTime = prevTime + 1;
              const timeLeft = targetTime - newTime;
              
              // Countdown beeps for last 3 seconds
              if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== lastBeepSecond && !isTimerPaused) {
                setLastBeepSecond(timeLeft);
                playBeep(false);
              } else if (timeLeft === 0 && !isTimerPaused) {
                playBeep(true); // Long beep at completion
                setTimeout(nextExercise, 500);
              }
              
              return newTime;
            });
          }
        } else if (restTimer > 0) {
          setRestTimer(prev => {
            const newTimer = prev - 1;
            
            // Countdown beeps for last 3 seconds of rest
            if (newTimer <= 3 && newTimer > 0 && newTimer !== lastBeepSecond) {
              setLastBeepSecond(newTimer);
              playBeep(false);
            } else if (newTimer === 0) {
              playBeep(true); // Long beep
            }
            
            // Auto-close rest if cardio total reaches rest time
            if (restCardioTotal >= (workout.rest_time || 60)) {
              setTimeout(() => skipRest(), 100);
            }
            return newTimer;
          });
        } else if (restTimer === 0 && isResting) {
          skipRest();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, isResting, restTimer, workout, currentExerciseIndex, activeCardio, isTimerPaused, lastBeepSecond]);

  const loadWorkout = async () => {
    try {
      console.log('[ActiveWorkout] Loading workout...');
      
      // First check if we're resuming from localStorage
      const savedState = localStorage.getItem('activeWorkoutState');
      
      if (savedState) {
        try {
          console.log('[ActiveWorkout] Found saved state, restoring...');
          const state = JSON.parse(savedState);
          
          if (!state.workout || !state.workout.exercises || state.workout.exercises.length === 0) {
            console.error('[ActiveWorkout] Invalid saved state:', state);
            localStorage.removeItem('activeWorkoutState');
            throw new Error('Invalid saved workout state');
          }
          
          // Restore full workout state
          setWorkout(state.workout);
          setCurrentExerciseIndex(state.currentExerciseIndex || 0);
          setCurrentSet(state.currentSet || 1);
          setTimer(state.timer || 0);
          setCurrentReps(state.currentReps || 0);
          setSessionStartTime(state.sessionStartTime ? new Date(state.sessionStartTime) : null);
          setTotalReps(state.totalReps || 0);
          setExerciseTimer(state.exerciseTimer || 0);
          setIsResting(state.isResting || false);
          setRestTimer(state.restTimer || 0);
          setCardioIntervals(state.cardioIntervals || []);
          setIsPaused(state.isPaused || false);
          setIsActive(state.isActive || false);
          setElapsedTimer(state.elapsedTimer || 0);
          
          // Load all exercises for swap functionality
          const allExercises = await Exercise.list();
          setAllExercises(allExercises);
          console.log('[ActiveWorkout] Successfully restored workout');
          return;
        } catch (error) {
          console.error("[ActiveWorkout] Failed to restore workout state:", error);
          localStorage.removeItem('activeWorkoutState');
        }
      }

      // If no saved state, load from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const workoutId = urlParams.get('workoutId');
      
      console.log('[ActiveWorkout] Loading workout from ID:', workoutId);
      
      if (!workoutId) {
        console.error('[ActiveWorkout] No workout ID provided');
        setLoadingError('No workout ID provided');
        setTimeout(() => navigate(createPageUrl("Exercises")), 2000);
        return;
      }
      
      const workoutData = await Workout.filter({id: workoutId});
      console.log('[ActiveWorkout] Workout data fetched:', workoutData);
      
      if (!workoutData || workoutData.length === 0) {
        console.error('[ActiveWorkout] Workout not found');
        setLoadingError('Workout not found');
        setTimeout(() => navigate(createPageUrl("Exercises")), 2000);
        return;
      }
      
      const data = workoutData[0];
      
      if (!data.exercises || data.exercises.length === 0) {
        console.error('[ActiveWorkout] Workout has no exercises');
        setLoadingError('Workout has no exercises');
        setTimeout(() => navigate(createPageUrl("Exercises")), 2000);
        return;
      }
      
      const allExercises = await Exercise.list();
      setAllExercises(allExercises);
      
      // Merge exercise details
      data.exercises = data.exercises.map(workoutEx => {
        const exerciseDetails = allExercises.find(ex => ex.id === workoutEx.exercise_id || ex.name === workoutEx.exercise_name);
        return {
          ...workoutEx,
          image_url: exerciseDetails?.image_url,
          instructions: exerciseDetails?.instructions,
          metric: exerciseDetails?.metric || workoutEx.metric || 'reps',
          category: workoutEx.category || exerciseDetails?.category || 'full_body'
        };
      });
      
      if (data.workout_type === 'time_based' && data.total_duration > 0) {
        const exerciseCount = data.exercises.length;
        const timePerExercise = Math.floor((data.total_duration * 60) / exerciseCount);
        data.exercises.forEach(ex => {
          ex.target_time = timePerExercise;
        });
      }
      
      console.log('[ActiveWorkout] Workout loaded successfully:', data);
      setWorkout(data);
    } catch (error) {
      console.error('[ActiveWorkout] Load error:', error);
      setLoadingError(error.message || 'Failed to load workout');
      setTimeout(() => navigate(createPageUrl("Exercises")), 3000);
    }
  };

  const startWorkout = () => {
    setIsActive(true);
    setSessionStartTime(new Date());
  };

  const pauseWorkout = () => setIsPaused(!isPaused);

  const stopWorkout = async () => {
    if (sessionStartTime) {
      // Calculate cardio analytics
      const walkIntervals = cardioIntervals.filter(c => c.type === 'walk');
      const jogIntervals = cardioIntervals.filter(c => c.type === 'jog');
      const sprintIntervals = cardioIntervals.filter(c => c.type === 'sprint');
      
      // Improved calorie calculation (more accurate formula)
      // Base: 5 calories per minute of active work
      // Reps: 0.15 calories per rep (strength training)
      // Cardio bonus: walk +2 cal/min, jog +5 cal/min, sprint +10 cal/min
      const activeMinutes = timer / 60;
      const baseCalories = activeMinutes * 5;
      const repCalories = totalReps * 0.15;
      const cardioCalories = (
        (walkIntervals.reduce((sum, c) => sum + c.time, 0) / 60) * 2 +
        (jogIntervals.reduce((sum, c) => sum + c.time, 0) / 60) * 5 +
        (sprintIntervals.reduce((sum, c) => sum + c.time, 0) / 60) * 10
      );
      const weightBonus = workout.weight_added_lbs ? (workout.weight_added_lbs * 0.02 * activeMinutes) : 0;
      const totalCalories = Math.round(baseCalories + repCalories + cardioCalories + weightBonus);
      
      const sessionData = {
        workout_id: workout.id,
        start_time: sessionStartTime.toISOString(),
        end_time: new Date().toISOString(),
        duration: timer,
        total_reps: totalReps,
        exercises_completed: workout.exercises.filter(ex => !ex.is_cardio_interval).map((ex) => ({
          exercise_name: ex.exercise_name,
          reps_completed: ex.metric === 'reps' ? (ex.completed_reps || 0) : 0,
          time_spent: ex.metric === 'time' ? (ex.completed_time || 0) : 0
        })),
        calories_burned: totalCalories,
        weight_added_lbs: workout.weight_added_lbs || 0,
        cardio_intervals: cardioIntervals,
        cardio_analytics: {
          walk: {
            count: walkIntervals.length,
            total_time: walkIntervals.reduce((sum, c) => sum + c.time, 0),
            avg_time: walkIntervals.length > 0 ? Math.round(walkIntervals.reduce((sum, c) => sum + c.time, 0) / walkIntervals.length) : 0
          },
          jog: {
            count: jogIntervals.length,
            total_time: jogIntervals.reduce((sum, c) => sum + c.time, 0),
            avg_time: jogIntervals.length > 0 ? Math.round(jogIntervals.reduce((sum, c) => sum + c.time, 0) / jogIntervals.length) : 0
          },
          sprint: {
            count: sprintIntervals.length,
            total_time: sprintIntervals.reduce((sum, c) => sum + c.time, 0),
            longest_sprint: sprintIntervals.length > 0 ? Math.max(...sprintIntervals.map(c => c.time)) : 0,
            shortest_sprint: sprintIntervals.length > 0 ? Math.min(...sprintIntervals.map(c => c.time)) : 0,
            avg_time: sprintIntervals.length > 0 ? Math.round(sprintIntervals.reduce((sum, c) => sum + c.time, 0) / sprintIntervals.length) : 0
          }
        }
      };
      await WorkoutSession.create(sessionData);
    }
    setIsActive(false);
    localStorage.removeItem('activeWorkoutState');
    navigate(createPageUrl("WorkoutComplete"));
  };
  
  const updateWorkoutProgress = (value, metric) => {
     if (workout) {
      const updatedExercises = [...workout.exercises];
      if (updatedExercises[currentExerciseIndex]) {
        // Store current set progress, don't overwrite total completed
        if (metric === 'reps') {
          updatedExercises[currentExerciseIndex].current_set_reps = value;
        } else if (metric === 'time') {
          updatedExercises[currentExerciseIndex].completed_time = value;
        }
        setWorkout({...workout, exercises: updatedExercises});
      }
    }
  }

  const addRep = () => {
    const newReps = currentReps + 1;
    setCurrentReps(newReps);
    setTotalReps(prev => prev + 1);
    updateWorkoutProgress(newReps, 'reps');
  };

  const subtractRep = () => {
    if (currentReps > 0) {
      const newReps = currentReps - 1;
      setCurrentReps(newReps);
      setTotalReps(prev => prev - 1);
      updateWorkoutProgress(newReps, 'reps');
    }
  };
  
  const setQuickReps = (reps) => {
    const difference = reps - currentReps;
    setCurrentReps(reps);
    setTotalReps(prev => prev + difference);
    setRepInput(reps.toString());
    updateWorkoutProgress(reps, 'reps');
  };

  const handleRepInput = (value) => {
    const reps = parseInt(value) || 0;
    const difference = reps - currentReps; 
    setCurrentReps(reps);
    setTotalReps(prev => prev + difference);
    setRepInput(value);
    updateWorkoutProgress(reps, 'reps');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!workout) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-6">
        <div className="text-center">
          {loadingError ? (
            <div>
              <div className="text-6xl mb-4">⚠️</div>
              <div className="text-xl text-red-400 mb-2">Error: {loadingError}</div>
              <div className="text-sm text-gray-400 mb-4">Redirecting to exercises...</div>
              <Button 
                onClick={() => {
                  localStorage.clear();
                  navigate(createPageUrl("Exercises"));
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go Back to Exercises
              </Button>
            </div>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-blue mx-auto mb-4"></div>
              <div className="text-xl">Loading workout...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentExercise = workout.exercises[currentExerciseIndex];
  
  if (!currentExercise) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl text-red-400 mb-2">Invalid workout data</div>
          <Button onClick={() => navigate(createPageUrl("Exercises"))} className="bg-blue-600 hover:bg-blue-700">
            Go Back to Exercises
          </Button>
        </div>
      </div>
    );
  }
  
  const isTimeBased = currentExercise.metric === 'time';
  const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets || 1), 0);
  const completedSets = workout.exercises.slice(0, currentExerciseIndex).reduce((sum, ex) => sum + (ex.sets || 1), 0) + (currentSet - 1);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  
  const timeProgress = isTimeBased && currentExercise.target_time ? (exerciseTimer / currentExercise.target_time) * 100 : 0;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="container mx-auto px-2 py-4 md:px-4 md:py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <h1 className="text-xl md:text-2xl font-bold px-2 leading-tight truncate flex-1">{workout.name}</h1>
            {isActive && (
              <div className="flex-1 flex justify-end">
                <Button
                  onClick={stopWorkout}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  <Square className="w-4 h-4 mr-1" /> END
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 text-sm md:text-base flex-wrap">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-brand-blue" />
                <span className="font-bold">{formatTime(elapsedTimer)}</span>
              </div>
              <span className="text-xs text-gray-400">Total Time</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="font-bold">{formatTime(timer)}</span>
              </div>
              <span className="text-xs text-gray-400">Active Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>{totalReps} / {getTotalEstimatedReps()} reps</span>
            </div>
            <button
              onClick={() => setShowHRInput(!showHRInput)}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>{heartRate || "HR"}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 px-2">
          <div className="flex justify-between text-xs mb-1 text-gray-400">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Heart Rate Input */}
        <AnimatePresence>
          {showHRInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 px-2"
            >
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Heart Rate Monitor</h3>
                  <div className="space-y-3">
                    <Input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="Enter BPM"
                      className="bg-background border-red-500/50 text-white text-center text-lg"
                    />
                    <div className="text-xs text-gray-400 space-y-1">
                      <p><strong>How to measure:</strong></p>
                      <p>1. Stop moving, find pulse on neck or wrist</p>
                      <p>2. Count beats for 15 seconds</p>
                      <p>3. Multiply by 4 = your BPM</p>
                      <p className="text-red-400 mt-2"><strong>Target zones:</strong> Moderate 50-70% max | Vigorous 70-85% max</p>
                      <p className="text-gray-500">Max HR ≈ 220 - your age</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rest/Cardio Screen */}
        <AnimatePresence>
          {isResting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <Card className="bg-gray-900/80 border-brand-blue/30 text-white w-full max-w-sm">
                <CardContent className="p-6 text-center">
                  {!activeCardio ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-brand-blue">ACTIVE RECOVERY</h2>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => addRestTime(-15)}
                            className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                            title="Subtract 15 seconds"
                            disabled={restTimer <= 15}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => addRestTime(-30)}
                            className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                            title="Subtract 30 seconds"
                            disabled={restTimer <= 30}
                          >
                            -30
                          </button>
                        </div>
                        <div className="text-6xl font-bold">{restTimer}s</div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => addRestTime(15)}
                            className="w-10 h-10 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                            title="Add 15 seconds"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => addRestTime(30)}
                            className="w-10 h-10 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                            title="Add 30 seconds"
                          >
                            +30
                          </button>
                        </div>
                      </div>
                      {extendedRestTime > 0 && (
                        <p className="text-xs text-blue-400 mb-2">+ {extendedRestTime}s added</p>
                      )}
                      <div className="mb-4">
                        <p className="text-sm text-gray-400">Cardio Time: {restCardioTotal}s / {workout.rest_time || 60}s</p>
                        <Progress value={(restCardioTotal / (workout.rest_time || 60)) * 100} className="h-2 mt-2" />
                      </div>

                      {/* Exercise Preview Cards */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* Just Completed */}
                        <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-xs text-green-400 font-bold mb-2">✓ COMPLETED</p>
                          <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                            {currentExercise?.image_url ? (
                              <img src={currentExercise.image_url} alt={currentExercise.exercise_name} className="w-full h-full object-cover" />
                            ) : (
                              <Target className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-white">{currentExercise?.exercise_name}</p>
                        </div>

                        {/* Coming Up Next */}
                        {currentExerciseIndex < workout.exercises.length - 1 && (
                          <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-lg p-3">
                            <p className="text-xs text-brand-blue font-bold mb-2">▶ UP NEXT</p>
                            <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                              {workout.exercises[currentExerciseIndex + 1]?.image_url ? (
                                <img src={workout.exercises[currentExerciseIndex + 1].image_url} alt={workout.exercises[currentExerciseIndex + 1].exercise_name} className="w-full h-full object-cover" />
                              ) : (
                                <Target className="w-8 h-8 text-gray-600" />
                              )}
                            </div>
                            <p className="text-xs font-semibold text-white">{workout.exercises[currentExerciseIndex + 1]?.exercise_name}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {workout.exercises[currentExerciseIndex + 1]?.metric === 'time' 
                                ? `${workout.exercises[currentExerciseIndex + 1]?.target_time}s` 
                                : `${workout.exercises[currentExerciseIndex + 1]?.target_reps} reps`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick instructions for next exercise */}
                      {currentExerciseIndex < workout.exercises.length - 1 && workout.exercises[currentExerciseIndex + 1]?.instructions && (
                        <div className="bg-gray-800/50 rounded-lg p-3 mb-4 max-h-24 overflow-y-auto">
                          <p className="text-xs text-brand-blue font-semibold mb-1">How to:</p>
                          <ul className="text-xs text-gray-300 space-y-1">
                            {workout.exercises[currentExerciseIndex + 1].instructions.slice(0, 2).map((instruction, i) => (
                              <li key={i}>• {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-sm text-gray-400 mb-3">Choose cardio activity or skip to rest</p>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <Button
                          onClick={() => startCardio('walk')}
                          className="flex flex-col items-center gap-2 h-auto py-4 bg-green-600/20 border-2 border-green-500 text-green-300 hover:bg-green-600/40"
                        >
                          <Footprints className="w-6 h-6" />
                          <span className="text-xs font-bold">WALK</span>
                        </Button>

                        <Button
                          onClick={() => startCardio('jog')}
                          className="flex flex-col items-center gap-2 h-auto py-4 bg-yellow-600/20 border-2 border-yellow-500 text-yellow-300 hover:bg-yellow-600/40"
                        >
                          <Route className="w-6 h-6" />
                          <span className="text-xs font-bold">JOG</span>
                        </Button>

                        <Button
                          onClick={() => startCardio('sprint')}
                          className="flex flex-col items-center gap-2 h-auto py-4 bg-red-600/20 border-2 border-red-500 text-red-300 hover:bg-red-600/40"
                        >
                          <Zap className="w-6 h-6" />
                          <span className="text-xs font-bold">SPRINT</span>
                        </Button>
                      </div>

                      <Button
                        onClick={skipRest}
                        variant="outline"
                        className="w-full border-gray-500 text-gray-300 hover:bg-gray-700"
                      >
                        SKIP - JUST REST
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold mb-2 text-brand-blue uppercase">{activeCardio.type}ING</h2>
                      <div className="text-7xl font-bold mb-4 text-brand-blue animate-pulse">{formatTime(cardioTimer)}</div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-400">Total Cardio: {restCardioTotal + cardioTimer}s / {workout.rest_time || 60}s</p>
                        <Progress value={((restCardioTotal + cardioTimer) / (workout.rest_time || 60)) * 100} className="h-2 mt-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button
                          onClick={stopCardio}
                          size="lg"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-6"
                        >
                          <Square className="w-5 h-5 mr-2" />
                          STOP & SWITCH
                        </Button>
                        <Button
                          onClick={() => {
                            stopCardio();
                            if (restCardioTotal + cardioTimer >= (workout.rest_time || 60)) {
                              skipRest();
                            }
                          }}
                          size="lg"
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-6"
                        >
                          DONE
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Exercise */}
        <motion.div
          key={`${currentExerciseIndex}-${currentSet}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="text-center mb-4 px-2"
        >
          <Card className="bg-card backdrop-blur-sm border-border text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue">
                  Set {currentSet} of {currentExercise.sets || 1}
                </Badge>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSwapModal(true)}
                    className="w-8 h-8 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                    title="Swap Exercise"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowVideoHelp(true)}
                    className="w-8 h-8 bg-gray-700/50 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowVideoHelp(true)}
                    className="w-8 h-8 bg-gray-700/50 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{currentExercise.exercise_name}</h2>
              
              {/* Set Progress Badge */}
              <div className="mb-3">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue text-sm">
                  {currentSet < (currentExercise.sets || 1) 
                    ? `Set ${currentSet} of ${currentExercise.sets || 1} → Next: Set ${currentSet + 1}`
                    : currentExerciseIndex < workout.exercises.length - 1
                      ? `Set ${currentSet} of ${currentExercise.sets || 1} completed → Next: ${workout.exercises[currentExerciseIndex + 1]?.exercise_name}`
                      : `Final Set ${currentSet} of ${currentExercise.sets || 1} - Last Exercise!`}
                </Badge>
              </div>
              
              {!isTimeBased && isFourCountExercise(currentExercise.exercise_name) && (
                <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-xs font-semibold">⚠️ 4-COUNT EXERCISE: 1...2...3...4 = 1 REP</p>
                </div>
              )}
              
              <div className="w-full h-32 md:h-40 bg-background rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                {currentExercise.image_url ? (
                  <img src={currentExercise.image_url} alt={currentExercise.exercise_name} className="w-full h-full object-contain" />
                ) : (
                  <Target className="w-12 h-12 md:w-16 md:h-16 text-brand-blue/50" />
                )}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                  Exercise Demo
                </div>
              </div>

              {isTimeBased ? (
                // UI for Time-Based Exercises
                <div className="text-center mb-6">
                   <div className="text-4xl md:text-6xl font-bold mb-2">{formatTime(exerciseTimer)}</div>
                   <p className="text-sm md:text-base text-gray-400 mb-4">
                     Target: {formatTime(currentExercise.target_time)}
                   </p>
                   <Progress value={timeProgress} className="h-2" />

                   <div className="flex justify-center gap-3 mt-4">
                     <Button
                       onClick={() => setIsTimerPaused(!isTimerPaused)}
                       size="lg"
                       className={`${isTimerPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-bold px-8`}
                     >
                       {isTimerPaused ? <Play className="w-5 h-5 mr-2" /> : <Pause className="w-5 h-5 mr-2" />}
                       {isTimerPaused ? 'START' : 'PAUSE'}
                     </Button>
                     <Button
                       onClick={() => {
                         setExerciseTimer(currentExercise.target_time);
                         setTimeout(nextExercise, 500);
                       }}
                       size="lg"
                       variant="outline"
                       className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                     >
                       <SkipForward className="w-5 h-5 mr-2" />
                       SKIP
                     </Button>
                   </div>
                </div>
              ) : (
                // UI for Rep-Based Exercises
                <div className="text-center mb-6">
                  <div className="text-4xl md:text-6xl font-bold mb-2">{currentReps}</div>
                  <p className="text-sm md:text-base text-gray-400 mb-4">
                    Target: {currentExercise.target_reps || 'As many as possible'}
                  </p>
                  
                  <div className="flex justify-center gap-2 mb-4">
                    {[5, 10, 15, currentExercise.target_reps].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v > 0).sort((a,b) => a-b).map(reps => (
                      <Button key={reps} variant="outline" size="sm" onClick={() => setQuickReps(reps)} className="bg-gray-800 border-gray-700 text-white">
                        {reps}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-center items-center gap-2 mb-4">
                    <Button size="icon" variant="outline" onClick={subtractRep} className="w-10 h-10 rounded-full bg-gray-800 border-gray-700">
                      <Minus className="w-5 h-5" />
                    </Button>
                     <Input
                        type="number" value={repInput} onChange={(e) => handleRepInput(e.target.value)}
                        placeholder="Reps"
                        className="w-20 bg-gray-800 border-gray-700 text-white text-center text-lg placeholder:text-gray-500"
                     />
                    <Button size="icon" variant="outline" onClick={addRep} className="w-10 h-10 rounded-full bg-gray-800 border-gray-700">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2 mb-4 px-2">
          {!isActive ? (
            <Button size="lg" onClick={startWorkout} className="gradient-bg text-white px-6 py-3 text-lg font-bold rounded-full flex-1 max-w-xs">
              <Play className="w-5 h-5 mr-2" /> START
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={pauseWorkout} variant="outline" className="bg-yellow-500/20 border-yellow-400 text-white hover:bg-yellow-500/30 px-3 py-2 flex-1">
                <Pause className="w-4 h-4 mr-1" /> {isPaused ? 'RESUME' : 'PAUSE'}
              </Button>
              <Button size="sm" onClick={nextExercise} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 flex-1">
                <SkipForward className="w-4 h-4 mr-1" /> NEXT
              </Button>
              <Button size="sm" onClick={stopWorkout} variant="outline" className="bg-red-500/20 border-red-400 text-white hover:bg-red-500/30 px-3 py-2 flex-1">
                <Square className="w-4 h-4 mr-1" /> STOP
              </Button>
            </>
          )}
        </div>

        {/* Exercise List */}
        <Card className="bg-card border-border mx-2">
          <CardContent className="p-3">
            <h3 className="text-base font-semibold mb-3 text-white">Workout Plan</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {workout.exercises.filter(ex => !ex.is_cardio_interval).map((exercise, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    index === currentExerciseIndex 
                      ? 'bg-brand-blue/20 border border-brand-blue/30' 
                      : index < currentExerciseIndex 
                        ? 'bg-green-500/10 text-gray-400'
                        : 'bg-gray-800/50 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${
                      index === currentExerciseIndex ? 'bg-brand-blue text-white' : index < currentExerciseIndex ? 'bg-green-500 text-white' : 'bg-gray-700 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium truncate">{exercise.exercise_name}</span>
                  </div>
                  <div className="text-xs flex-shrink-0 ml-2">
                    {exercise.metric === 'time' 
                      ? `${exercise.target_time}s` 
                      : `${exercise.target_reps} reps`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {showVideoHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowVideoHelp(false)}
          >
            <Card className="bg-card max-w-md w-full border-border" onClick={e => e.stopPropagation()}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-white">{currentExercise.exercise_name} - How To</h3>
                <div className="w-full h-48 bg-background rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <PlayCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500">Exercise demo video</p>
                  </div>
                </div>
                <div className="text-gray-300 mb-4">
                  <h4 className="font-semibold mb-2 text-white">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {currentExercise.instructions?.length > 0 ? currentExercise.instructions.map((inst, i) => <li key={i}>{inst}</li>) : <li>No instructions available.</li>}
                  </ol>
                </div>
                <Button onClick={() => setShowVideoHelp(false)} className="w-full gradient-bg text-white">
                  Got It!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap Exercise Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSwapModal(false)}
          >
            <Card className="bg-card max-w-lg w-full border-border max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Swap Exercise</h3>
                <p className="text-sm text-gray-400 mb-4">Choose a different exercise for this slot</p>
                <div className="overflow-y-auto max-h-[50vh] space-y-2">
                  {allExercises
                    .filter(ex => ex.category === currentExercise.category || ex.category === 'full_body')
                    .map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => swapExercise(exercise)}
                        className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-brand-blue"
                      >
                        <div className="font-semibold text-white">{exercise.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{exercise.description}</div>
                      </button>
                    ))}
                </div>
                <Button onClick={() => setShowSwapModal(false)} variant="outline" className="w-full mt-4">
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}