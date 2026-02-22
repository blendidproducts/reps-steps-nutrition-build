import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle2, Clock, Target, Plus, Download, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function WatchMode() {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [cachedWorkouts, setCachedWorkouts] = useState([]);

  useEffect(() => {
    checkActiveWorkout();
    loadCachedWorkouts();
    
    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Detect if app can be installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;
    if (!isStandalone && !localStorage.getItem('installPromptDismissed')) {
      setShowInstallPrompt(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isPaused && activeWorkout) {
      const interval = setInterval(() => {
        setTimer(t => t + 1);
        // Auto-save workout progress every second
        saveWorkoutProgress();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, activeWorkout, currentExercise, repsCompleted]);

  const checkActiveWorkout = async () => {
    const savedState = localStorage.getItem('activeWorkoutState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.workout) {
          setActiveWorkout(state.workout);
          setCurrentExercise(state.currentExerciseIndex || 0);
          setTimer(state.timer || 0);
          
          // Cache this workout for offline access
          cacheWorkout(state.workout);
        }
      } catch (error) {
        console.error('Failed to load workout state:', error);
        toast.error('Failed to load workout');
      }
    }
  };

  const loadCachedWorkouts = () => {
    const cached = localStorage.getItem('watchMode_cachedWorkouts');
    if (cached) {
      try {
        setCachedWorkouts(JSON.parse(cached));
      } catch (error) {
        console.error('Failed to load cached workouts');
      }
    }
  };

  const cacheWorkout = (workout) => {
    const cached = localStorage.getItem('watchMode_cachedWorkouts');
    let workouts = [];
    
    try {
      workouts = cached ? JSON.parse(cached) : [];
    } catch (error) {
      workouts = [];
    }
    
    // Add workout if not already cached
    const exists = workouts.find(w => w.id === workout.id);
    if (!exists) {
      workouts.unshift({
        id: workout.id,
        name: workout.name,
        exercises: workout.exercises,
        cachedAt: new Date().toISOString()
      });
      
      // Keep only last 5 workouts
      if (workouts.length > 5) {
        workouts = workouts.slice(0, 5);
      }
      
      localStorage.setItem('watchMode_cachedWorkouts', JSON.stringify(workouts));
      setCachedWorkouts(workouts);
    }
  };

  const saveWorkoutProgress = () => {
    if (!activeWorkout) return;
    
    const progressData = {
      workoutId: activeWorkout.id,
      currentExerciseIndex: currentExercise,
      repsCompleted,
      timer,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('watchMode_progress', JSON.stringify(progressData));
  };

  const loadCachedWorkout = (workout) => {
    setActiveWorkout(workout);
    setCurrentExercise(0);
    setTimer(0);
    setRepsCompleted(0);
    setIsPaused(false);
    
    // Update active workout state
    localStorage.setItem('activeWorkoutState', JSON.stringify({
      workout,
      currentExerciseIndex: 0,
      timer: 0,
      isActive: true
    }));
    
    toast.success('Loaded cached workout');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completeExercise = () => {
    if (currentExercise < activeWorkout.exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setRepsCompleted(0);
      toast.success('Exercise complete!');
    } else {
      // Clear cached progress on completion
      localStorage.removeItem('watchMode_progress');
      navigate(createPageUrl("WorkoutComplete"));
    }
  };

  const showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      toast.info('Tap Share button → Add to Home Screen', { duration: 5000 });
    } else if (isAndroid) {
      toast.info('Tap ⋮ menu → Add to Home screen', { duration: 5000 });
    } else {
      toast.info('Use browser menu to install this app', { duration: 5000 });
    }
    
    localStorage.setItem('installPromptDismissed', 'true');
    setShowInstallPrompt(false);
  };

  if (!activeWorkout) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-4">
        {/* Install Prompt Banner */}
        {showInstallPrompt && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-lg mb-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">Install Watch Mode</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={showInstallInstructions}
                  className="h-7 text-xs text-white hover:bg-white/20"
                >
                  How?
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    localStorage.setItem('installPromptDismissed', 'true');
                    setShowInstallPrompt(false);
                  }}
                  className="h-7 text-xs text-white hover:bg-white/20"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="bg-yellow-600/20 border border-yellow-600/50 p-3 rounded-lg mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>Offline Mode - Using cached data</span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[320px] mx-auto w-full">
          <Clock className="w-16 h-16 mb-4 text-blue-400" />
          <h1 className="text-2xl font-bold mb-2">Watch Mode</h1>
          <p className="text-sm text-gray-400 mb-6">Optimized for small screens & offline use</p>
          
          <Button 
            onClick={() => navigate(createPageUrl("Exercises"))}
            className="w-full bg-blue-600 mb-4 h-12"
          >
            <Plus className="w-5 h-5 mr-2" />
            Start New Workout
          </Button>

          {/* Cached Workouts */}
          {cachedWorkouts.length > 0 && (
            <div className="w-full mt-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 text-left">Recently Cached</h3>
              <div className="space-y-2">
                {cachedWorkouts.map((workout) => (
                  <Button
                    key={workout.id}
                    onClick={() => loadCachedWorkout(workout)}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 text-left"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">{workout.name}</div>
                      <div className="text-xs text-gray-400">
                        {workout.exercises?.length || 0} exercises
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 space-y-3 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Works offline with cached workouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              <span>Install to home screen for quick access</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const exercise = activeWorkout.exercises[currentExercise];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Offline Indicator (workout active) */}
      {!isOnline && (
        <div className="bg-yellow-600/20 border-b border-yellow-600/50 px-4 py-2 text-xs text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
            Offline - Changes saved locally
          </div>
        </div>
      )}

      {/* Timer Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-center">
        <div className="text-3xl font-bold font-mono">{formatTime(timer)}</div>
        <div className="text-xs opacity-80">Exercise {currentExercise + 1}/{activeWorkout.exercises.length}</div>
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{exercise.exercise_name}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {exercise.target_reps} reps
            </div>
            {exercise.sets > 1 && (
              <div>×{exercise.sets} sets</div>
            )}
          </div>
        </div>

        {/* Big Rep Counter */}
        <div className="text-8xl font-bold text-blue-400 mb-8">
          {repsCompleted}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 w-full max-w-[280px]">
          <Button
            onClick={() => setRepsCompleted(prev => Math.max(0, prev - 1))}
            variant="outline"
            className="flex-1 h-14 text-lg"
          >
            -1
          </Button>
          <Button
            onClick={() => setRepsCompleted(prev => prev + 1)}
            className="flex-1 h-14 text-lg bg-blue-600"
          >
            +1
          </Button>
        </div>

        <Button
          onClick={completeExercise}
          className="w-full max-w-[280px] mt-4 h-12 bg-green-600"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Complete
        </Button>
      </div>

      {/* Pause Button */}
      <div className="p-4">
        <Button
          onClick={() => setIsPaused(!isPaused)}
          variant="outline"
          className="w-full"
        >
          {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}