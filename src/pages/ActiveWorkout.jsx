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
  MapPin,
  X,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Haversine formula to calculate distance between two lat/lon points
const haversineDistance = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
};

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [repInput, setRepInput] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalReps, setTotalReps] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [cardioIntervals, setCardioIntervals] = useState([]);
  const [stepsInput, setStepsInput] = useState("");
  const [distanceInput, setDistanceInput] = useState("");

  // GPS Tracking State
  const [isTrackingGps, setIsTrackingGps] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState(null);
  const [route, setRoute] = useState([]);
  const [trackedDistance, setTrackedDistance] = useState(0);
  const lastPosition = useRef(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [debugInfo, setDebugInfo] = useState([]);

  useEffect(() => {
    loadWorkout();
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!workout) {
        setDebugInfo(prev => [...prev, '⏱️ TIMEOUT: Taking too long']);
        setLoadingError('Timeout - Check your connection');
      }
    }, 10000);
    
    // Clean up GPS watch on component unmount
    return () => {
      clearTimeout(timeout);
      if (gpsWatchId) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, []);

  // Save workout state to localStorage (including workout ID)
  useEffect(() => {
    if (workout) {
      const workoutState = {
        workout: { ...workout, id: workout.id }, // Ensure ID is saved
        currentExerciseIndex,
        currentSet,
        timer,
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
  }, [workout, currentExerciseIndex, currentSet, timer, currentReps, sessionStartTime, totalReps, exerciseTimer, isResting, restTimer, cardioIntervals, isActive, isPaused]);



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
      
      if (!currentExercise.superset_with_next) {
        setIsResting(true);
        setRestTimer(workout.rest_time || 30);
      }
    } else {
      if (currentExerciseIndex < workout.exercises.length - 1) {
        if (!currentExercise.superset_with_next) {
            setIsResting(true);
            setRestTimer(workout.rest_time || 60);
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
    const steps = parseInt(stepsInput) || 0;
    let distance_km = parseFloat(distanceInput) || 0;

    if (isTrackingGps) {
        stopGpsTracking();
        distance_km += trackedDistance;
    }
    
    if (steps > 0 || distance_km > 0) {
        setCardioIntervals(prev => [...prev, { steps, distance_km }]);
    }
    setStepsInput("");
    setDistanceInput("");
    setTrackedDistance(0);
    setRoute([]);
    lastPosition.current = null;
    
    setIsResting(false);
    setRestTimer(0);
  };
  
  const startGpsTracking = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsTrackingGps(true);
          const { latitude, longitude } = position.coords;
          setRoute([{ latitude, longitude }]);
          lastPosition.current = { latitude, longitude };

          const watchId = navigator.geolocation.watchPosition(
            (newPosition) => {
              const { latitude, longitude } = newPosition.coords;
              const newPoint = { latitude, longitude };
              setRoute(prevRoute => [...prevRoute, newPoint]);

              if (lastPosition.current) {
                setTrackedDistance(prevDist => prevDist + haversineDistance(lastPosition.current, newPoint));
              }
              lastPosition.current = newPoint;
            },
            (error) => {
              console.error("Error watching position:", error);
              alert("GPS tracking failed. Please ensure location services are enabled.");
              stopGpsTracking();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
          setGpsWatchId(watchId);
        },
        (error) => {
          if (error.code === 1) {
            alert("GPS permission denied. Please enable location access in your browser settings to use this feature.");
          } else {
            alert(`Error getting location: ${error.message}`);
          }
        }
      );
    } else {
      alert('GPS is not supported by your browser.');
    }
  };

  const stopGpsTracking = () => {
    if (gpsWatchId) {
      navigator.geolocation.clearWatch(gpsWatchId);
    }
    setIsTrackingGps(false);
    setGpsWatchId(null);
  };

  useEffect(() => {
    let interval;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
        if (!isResting) {
          const currentMetric = workout?.exercises[currentExerciseIndex]?.metric || 'reps';
          if (currentMetric === 'reps') {
            setExerciseTimer(prev => prev + 1);
          } else { // Time-based
            const targetTime = workout.exercises[currentExerciseIndex].target_time;
            setExerciseTimer(prevTime => {
              const newTime = prevTime + 1;
              if (newTime >= targetTime) {
                // Auto-complete and move to next
                setTimeout(nextExercise, 500); 
              }
              return newTime;
            });
          }
        } else if (restTimer > 0) {
          setRestTimer(prev => prev - 1);
        } else if (restTimer === 0 && isResting) {
          skipRest(); // Automatically skip rest when timer hits 0
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, isResting, restTimer, workout, currentExerciseIndex]);

  const loadWorkout = async () => {
    try {
      setDebugInfo(['1. Starting...']);
      
      // Get workout ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const workoutId = urlParams.get('workoutId');
      setDebugInfo(prev => [...prev, `2. ID: ${workoutId || 'MISSING'}`]);
      
      if (!workoutId) {
        setLoadingError('No workout ID');
        setDebugInfo(prev => [...prev, '❌ No ID in URL']);
        setTimeout(() => navigate(createPageUrl("Exercises")), 2000);
        return;
      }
      
      setDebugInfo(prev => [...prev, '3. Fetching workout...']);
      const workoutData = await Workout.filter({id: workoutId});
      setDebugInfo(prev => [...prev, `4. Got: ${workoutData?.length || 0} results`]);
      
      if (!workoutData || workoutData.length === 0) {
        setLoadingError('Workout not found');
        setDebugInfo(prev => [...prev, '❌ Not in database']);
        setTimeout(() => navigate(createPageUrl("Exercises")), 2000);
        return;
      }
      
      const data = workoutData[0];
      setDebugInfo(prev => [...prev, `5. Name: ${data.name}`]);
      
      setDebugInfo(prev => [...prev, '6. Fetching exercises...']);
      const allExercises = await Exercise.list();
      setDebugInfo(prev => [...prev, `7. Got ${allExercises.length} exercises`]);
      setAllExercises(allExercises);
      
      // Merge exercise details
      data.exercises = data.exercises.map(workoutEx => {
        const exerciseDetails = allExercises.find(ex => ex.id === workoutEx.exercise_id || ex.name === workoutEx.exercise_name);
        return {
          ...workoutEx,
          image_url: exerciseDetails?.image_url,
          instructions: exerciseDetails?.instructions,
          metric: exerciseDetails?.metric || workoutEx.metric || 'reps'
        };
      });
      
      if (data.workout_type === 'time_based' && data.total_duration > 0) {
        const exerciseCount = data.exercises.length;
        const timePerExercise = Math.floor((data.total_duration * 60) / exerciseCount);
        data.exercises.forEach(ex => {
          ex.target_time = timePerExercise;
        });
      }
      
      setDebugInfo(prev => [...prev, '8. Setting workout...']);
      setWorkout(data);
      setDebugInfo(prev => [...prev, '✅ SUCCESS!']);
    } catch (error) {
      setLoadingError(error.message || 'Failed');
      setDebugInfo(prev => [...prev, `❌ ${error.message || 'Unknown error'}`]);
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
      const sessionData = {
        workout_id: workout.id,
        start_time: sessionStartTime.toISOString(),
        end_time: new Date().toISOString(),
        duration: timer,
        total_reps: totalReps,
        exercises_completed: workout.exercises.map((ex, index) => ({
          exercise_name: ex.exercise_name,
          reps_completed: ex.metric === 'reps' ? (ex.completed_reps || 0) : 0,
          time_spent: ex.metric === 'time' ? (ex.completed_time || 0) : 0
        })),
        calories_burned: Math.round(totalReps * 0.5 + timer * 0.1),
        weight_added_lbs: workout.weight_added_lbs || 0,
        cardio_intervals: cardioIntervals,
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
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb', padding: '20px' }}>
        {/* BRIGHT RED DEBUG BANNER - ALWAYS VISIBLE */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'red',
          color: 'white',
          padding: '15px',
          fontSize: '14px',
          zIndex: 9999,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🔧 DEBUG INFO:</div>
          {debugInfo.length === 0 ? (
            <div>Waiting to start...</div>
          ) : (
            <div>
              {debugInfo.map((info, i) => (
                <div key={i} style={{ marginBottom: '5px' }}>{info}</div>
              ))}
            </div>
          )}
        </div>

        {/* Main Loading Content */}
        <div style={{ marginTop: '220px', textAlign: 'center' }}>
          {loadingError ? (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
              <div style={{ fontSize: '24px', color: '#ef4444', marginBottom: '10px' }}>
                Error: {loadingError}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '20px' }}>
                Redirecting to exercises...
              </div>
              <Button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = createPageUrl("Exercises");
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go Back to Exercises
              </Button>
            </div>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-blue mx-auto mb-4"></div>
              <div style={{ fontSize: '20px', marginBottom: '20px' }}>Loading workout...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentExercise = workout.exercises[currentExerciseIndex];
  const isTimeBased = currentExercise.metric === 'time';
  const totalSets = workout.exercises.reduce((sum, ex) => sum + (ex.sets || 1), 0);
  const completedSets = workout.exercises.slice(0, currentExerciseIndex).reduce((sum, ex) => sum + (ex.sets || 1), 0) + (currentSet - 1);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  
  const timeProgress = isTimeBased ? (exerciseTimer / currentExercise.target_time) * 100 : 0;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="container mx-auto px-2 py-4 md:px-4 md:py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl md:text-2xl font-bold mb-2 px-2 leading-tight truncate">{workout.name}</h1>
          <div className="flex justify-center gap-4 text-sm md:text-base">
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              <span>{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>{totalReps} reps</span>
            </div>
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
                  <h2 className="text-2xl font-bold mb-2 text-brand-blue">CARDIO / REST</h2>
                  <div className="text-6xl font-bold mb-4">{restTimer}</div>
                  
                  <div className="space-y-3 mb-4 text-left">
                    <p className="text-sm text-center text-gray-400">Log cardio or rest up.</p>
                     <div className="relative">
                       <Footprints className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                       <Input 
                         type="number" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)}
                         placeholder="Enter steps"
                         className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                       />
                     </div>
                     <div className="relative">
                       <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                       <Input 
                         type="number" value={distanceInput} onChange={(e) => setDistanceInput(e.target.value)}
                         placeholder="Distance (km)"
                         className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                       />
                     </div>
                  </div>
                  
                  <div className="border-t border-gray-700 my-4"></div>

                  <div className="space-y-3">
                    <p className="text-sm text-center text-gray-400">Or track live distance:</p>
                    {isTrackingGps ? (
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-400 animate-pulse">
                          {trackedDistance.toFixed(2)} km
                        </div>
                        <Button onClick={stopGpsTracking} variant="destructive" size="sm" className="mt-2">
                           <X className="w-4 h-4 mr-1"/> Stop Tracking
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={startGpsTracking} variant="outline" className="w-full border-green-500 text-green-400 hover:bg-green-500/10 hover:text-green-300">
                          <MapPin className="w-4 h-4 mr-2" /> Start GPS Tracking
                      </Button>
                    )}
                  </div>


                  <p className="text-base my-4 text-gray-300">
                    Next: {workout.exercises[currentExerciseIndex]?.exercise_name || 'Workout Complete!'}
                  </p>
                  <Button
                    onClick={skipRest}
                    className="w-full gradient-bg text-white"
                  >
                    CONTINUE
                  </Button>
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
              {workout.exercises.map((exercise, index) => (
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
                    {exercise.metric === 'time' ? `${exercise.target_time}s` : `${exercise.target_reps} reps`}
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