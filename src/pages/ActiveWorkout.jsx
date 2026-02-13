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
  Footprints,
  Route,
  Zap,
  RefreshCw,
  Link as LinkIcon,
  Check,
  Search,
  Trophy,
  Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Exercise3DViewer from "@/components/Exercise3DViewer";



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
  const WARMUP_REST_TIME = 5; // Fixed 5 seconds between warmup exercises
  const [warmupTargetTime, setWarmupTargetTime] = useState(30);
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
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [personalRecords, setPersonalRecords] = useState({});
  const [showActiveRecovery, setShowActiveRecovery] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [show3DView, setShow3DView] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const speechSynthRef = useRef(null);

  useEffect(() => {
    loadWorkout();
    loadPersonalRecords();
    initVoiceControl();
    return () => {
      if (voiceRecognition) {
        voiceRecognition.stop();
      }
    };
  }, []);

  const loadPersonalRecords = async () => {
    try {
      const sessions = await WorkoutSession.list();
      const records = {
        mostPushups: 0,
        longestSprint: 0,
        mostSquats: 0,
        longestPlank: 0,
        mostBurpees: 0
      };

      sessions.forEach(session => {
        session.exercises_completed?.forEach(ex => {
          const name = ex.exercise_name.toLowerCase();
          if (name.includes('push') && ex.reps_completed > records.mostPushups) {
            records.mostPushups = ex.reps_completed;
          }
          if (name.includes('squat') && ex.reps_completed > records.mostSquats) {
            records.mostSquats = ex.reps_completed;
          }
          if (name.includes('plank') && ex.time_spent > records.longestPlank) {
            records.longestPlank = ex.time_spent;
          }
          if (name.includes('burpee') && ex.reps_completed > records.mostBurpees) {
            records.mostBurpees = ex.reps_completed;
          }
        });

        const sprints = session.cardio_intervals?.filter(c => c.type === 'sprint') || [];
        sprints.forEach(sprint => {
          if (sprint.time > records.longestSprint) {
            records.longestSprint = sprint.time;
          }
        });
      });

      setPersonalRecords(records);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const checkAchievement = (type, value, exerciseName) => {
    const name = exerciseName.toLowerCase();
    let newRecord = false;

    if (type === 'pushups' && name.includes('push') && value > personalRecords.mostPushups) {
      setAchievementPopup({
        title: '🔥 NEW RECORD!',
        message: `Most Push-ups in a Set: ${value}`,
        prevRecord: personalRecords.mostPushups
      });
      setPersonalRecords(prev => ({...prev, mostPushups: value}));
      newRecord = true;
    } else if (type === 'squats' && name.includes('squat') && value > personalRecords.mostSquats) {
      setAchievementPopup({
        title: '🔥 NEW RECORD!',
        message: `Most Squats in a Set: ${value}`,
        prevRecord: personalRecords.mostSquats
      });
      setPersonalRecords(prev => ({...prev, mostSquats: value}));
      newRecord = true;
    } else if (type === 'burpees' && name.includes('burpee') && value > personalRecords.mostBurpees) {
      setAchievementPopup({
        title: '🔥 NEW RECORD!',
        message: `Most Burpees in a Set: ${value}`,
        prevRecord: personalRecords.mostBurpees
      });
      setPersonalRecords(prev => ({...prev, mostBurpees: value}));
      newRecord = true;
    }

    if (newRecord) {
      setTimeout(() => setAchievementPopup(null), 4000);
    }
  };

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
    setSwapSearchQuery("");
  };

  const openSupersetModal = () => {
    // Initialize selections - get remaining exercises from current index onwards
    const remaining = workout.exercises.slice(currentExerciseIndex).map((ex, idx) => ({
      index: currentExerciseIndex + idx,
      name: ex.exercise_name,
      selected: ex.superset_with_next || false
    }));
    setSupersetSelections(remaining);
    setShowSupersetModal(true);
  };

  const applySupersets = () => {
    const updatedExercises = [...workout.exercises];
    supersetSelections.forEach(selection => {
      if (updatedExercises[selection.index]) {
        updatedExercises[selection.index].superset_with_next = selection.selected;
      }
    });
    setWorkout({...workout, exercises: updatedExercises});
    setShowSupersetModal(false);
    toast.success('Superset settings updated');
  };

  const toggleSupersetSelection = (index) => {
    setSupersetSelections(prev => 
      prev.map(item => 
        item.index === index ? {...item, selected: !item.selected} : item
      )
    );
  };

  const nextExercise = () => {
    const currentExercise = workout.exercises[currentExerciseIndex];
    
    // CRITICAL FIX: Finalize current reps before moving on
    if (currentExercise.metric === 'reps' && currentReps > 0) {
      const updatedExercises = [...workout.exercises];
      const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
      const difference = currentReps - (updatedExercises[currentExerciseIndex].current_set_reps || 0);
      updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + difference;
      updatedExercises[currentExerciseIndex].current_set_reps = currentReps;
      setWorkout({...workout, exercises: updatedExercises});
      
      console.log('[REP TRACKING] Finalized set reps:', {
        exercise: currentExercise.exercise_name,
        set: currentSet,
        current_reps: currentReps,
        total_completed: previousCompleted + difference
      });
      
      // Check achievements
      const name = currentExercise.exercise_name.toLowerCase();
      if (name.includes('push')) checkAchievement('pushups', currentReps, currentExercise.exercise_name);
      if (name.includes('squat')) checkAchievement('squats', currentReps, currentExercise.exercise_name);
      if (name.includes('burpee')) checkAchievement('burpees', currentReps, currentExercise.exercise_name);
    }
    
    // If superset, move to next exercise in the superset chain (same set number)
    if (currentExercise.superset_with_next && currentExerciseIndex < workout.exercises.length - 1) {
      // Show superset transition with cardio options
      setIsSupersetTransition(true);
      return;
    }
    
    // Check if we completed a set and need to go back to start of superset chain
    if (currentSet < (currentExercise.sets || 1)) {
      // Find the start of the current superset chain
      let supersetStart = currentExerciseIndex;
      while (supersetStart > 0 && workout.exercises[supersetStart - 1].superset_with_next) {
        supersetStart--;
      }
      
      // If we're at the end of a superset chain, go back to the beginning for next set
      if (supersetStart !== currentExerciseIndex) {
        setCurrentExerciseIndex(supersetStart);
        setCurrentSet(prev => prev + 1);
        setCurrentReps(0);
        setRepInput("");
        setExerciseTimer(0);
        
        // Rest after completing full superset round
        if (currentExercise.category === 'warmup') {
          setIsResting(true);
          setRestTimer(WARMUP_REST_TIME);
          setRestCardioTotal(0);
        } else {
          setIsResting(true);
          setRestTimer(workout.rest_time || 60);
          setRestCardioTotal(0);
        }
      } else {
        // Not in a superset, just move to next set
        setCurrentSet(prev => prev + 1);
        setCurrentReps(0);
        setRepInput("");
        setExerciseTimer(0);
        
        // Rest between sets
        if (currentExercise.category === 'warmup') {
          setIsResting(true);
          setRestTimer(WARMUP_REST_TIME);
          setRestCardioTotal(0);
        } else {
          setIsResting(true);
          setRestTimer(workout.rest_time || 30);
          setRestCardioTotal(0);
        }
      }
    } else {
      // Completed all sets, move to next exercise
      if (currentExerciseIndex < workout.exercises.length - 1) {
        const nextExercise = workout.exercises[currentExerciseIndex + 1];

        // Move to next exercise
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
        setCurrentReps(0);
        setRepInput("");
        setExerciseTimer(0);

        // Rest based on exercise types
        const isCurrentWarmup = currentExercise.category === 'warmup';
        const isNextWarmup = nextExercise?.category === 'warmup';

        if (isCurrentWarmup || isNextWarmup) {
          setIsResting(true);
          setRestTimer(WARMUP_REST_TIME);
          setRestCardioTotal(0);
        } else {
          setIsResting(true);
          setRestTimer(workout.rest_time || 60);
          setRestCardioTotal(0);
        }
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
    setShowActiveRecovery(false);
  };

  const startActiveRecovery = () => {
    setShowActiveRecovery(true);
    setRestTimer(workout.rest_time || 60);
    setRestCardioTotal(0);
  };

  const skipSupersetTransition = () => {
    // CRITICAL FIX: Finalize current reps before moving to next in superset
    const currentExercise = workout.exercises[currentExerciseIndex];
    if (currentExercise.metric === 'reps' && currentReps > 0) {
      const updatedExercises = [...workout.exercises];
      const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
      const difference = currentReps - (updatedExercises[currentExerciseIndex].current_set_reps || 0);
      updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + difference;
      updatedExercises[currentExerciseIndex].current_set_reps = currentReps;
      setWorkout({...workout, exercises: updatedExercises});
      
      console.log('[REP TRACKING - SUPERSET] Finalized before transition:', {
        exercise: currentExercise.exercise_name,
        current_reps: currentReps,
        total_completed: previousCompleted + difference
      });
    }
    
    setIsSupersetTransition(false);
    setCurrentExerciseIndex(prev => prev + 1);
    setCurrentReps(0);
    setRepInput("");
    setExerciseTimer(0);
  };

  const addRestTime = (seconds) => {
    setRestTimer(prev => prev + seconds);
    setExtendedRestTime(prev => prev + seconds);
  };

  const isFourCountExercise = (exerciseName) => {
    const fourCountExercises = ['jumping jacks', 'arm circles', 'bicycle crunches', 'flutter kicks', 'mountain climbers', 'butt kickers'];
    return fourCountExercises.some(ex => exerciseName.toLowerCase().includes(ex));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance between two GPS coordinates in miles
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startCardio = (type) => {
    setActiveCardio({ type, startTime: Date.now() });
    setCardioTimer(0);
    setCurrentGpsDistance(0);
  };

  const stopCardio = () => {
    if (activeCardio) {
      const cardioEntry = {
        type: activeCardio.type,
        time: cardioTimer,
        timestamp: new Date().toISOString(),
        gps_distance: currentGpsDistance
      };
      
      // Check for sprint achievement
      if (activeCardio.type === 'sprint' && cardioTimer > personalRecords.longestSprint) {
        setAchievementPopup({
          title: '🔥 NEW RECORD!',
          message: `Longest Sprint: ${formatTime(cardioTimer)}`,
          prevRecord: personalRecords.longestSprint
        });
        setPersonalRecords(prev => ({...prev, longestSprint: cardioTimer}));
        setTimeout(() => setAchievementPopup(null), 4000);
      }
      
      setCardioIntervals(prev => [...prev, cardioEntry]);
      setActiveCardio(null);
      setCardioTimer(0);
      setCurrentGpsDistance(0);
      toast.success(`${activeCardio.type} completed: ${formatTime(cardioTimer)}`);
    }
  };

  const stopCardioAndContinueSuperset = () => {
    if (activeCardio) {
      stopCardio();
    }
    skipSupersetTransition();
  };

  const getTotalEstimatedReps = () => {
    if (!workout) return 0;
    return workout.exercises
      .filter(ex => !ex.is_cardio_interval && ex.metric === 'reps')
      .reduce((sum, ex) => sum + (ex.target_reps || 0) * (ex.sets || 1), 0);
  };
  


  const speak = (text) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Select an energetic, clear voice (prefer female US English for fitness coaching)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google US English')) && v.lang.includes('en')
        ) || voices.find(v => v.lang.includes('en-US')) || voices[0];
        
        utterance.voice = preferredVoice;
        utterance.rate = 1.15; // Slightly faster, energetic pace
        utterance.pitch = 1.1; // Slightly higher, enthusiastic tone
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    }
  };

  const initVoiceControl = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Voice control not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice control started');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isVoiceActive && isActive) {
        setTimeout(() => recognition.start(), 100);
      }
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (isVoiceActive && isActive) {
          setTimeout(() => recognition.start(), 500);
        }
      }
    };

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      
      console.log('Voice detected:', transcript);

      // Check for wake phrase "reps and steps" or "RNS"
      if (transcript.includes('reps and steps') || transcript.includes('rns')) {
        playBeep(true);
        
        // Extract command after wake phrase
        const commandMatch = transcript.match(/(?:reps and steps|rns)\s+(.+)/i);
        const command = commandMatch ? commandMatch[1].trim() : '';
        
        // Handle different commands
        if (command.includes('begin') || command.includes('start')) {
          if (!isActive) {
            speak('Begin workout!');
            startWorkout();
          } else {
            const exerciseName = currentExercise?.exercise_name || 'exercise';
            const targetReps = currentExercise?.target_reps || 'as many as possible';
            speak(`${exerciseName}. Target: ${targetReps} reps. Go!`);
          }
        } else if (command.match(/(\d+)\s*(reps?\s*)?(completed|done)/i)) {
          const repsMatch = command.match(/(\d+)/);
          if (repsMatch) {
            const reps = parseInt(repsMatch[1]);
            if (reps > 0 && reps <= 500) {
              setQuickReps(reps);
              speak(`${reps} reps recorded. Great work!`);
              playBeep(true);
            }
          }
        } else if (command.includes('walk completed') || command.includes('walk complete')) {
          if (activeCardio?.type === 'walk') {
            stopCardio();
            speak('Walk completed. Active recovery or skip?');
          } else if (isResting) {
            speak('Active recovery or skip?');
          }
        } else if (command.includes('jog completed') || command.includes('jog complete')) {
          if (activeCardio?.type === 'jog') {
            stopCardio();
            speak('Jog completed. Great pace! Continue workout?');
          }
        } else if (command.includes('sprint completed') || command.includes('sprint complete') || command.includes('run completed')) {
          if (activeCardio?.type === 'sprint') {
            stopCardio();
            speak('Sprint completed. Excellent effort!');
          }
        } else if (command.includes('skip')) {
          if (isResting) {
            skipRest();
            speak('Skipping rest. Next exercise starting now.');
          }
        } else if (command.includes('walk')) {
          startCardio('walk');
          speak('Walking. Stay steady.');
        } else if (command.includes('jog')) {
          startCardio('jog');
          speak('Jogging. Good pace!');
        } else if (command.includes('sprint') || command.includes('run')) {
          startCardio('sprint');
          speak('Sprinting. Push hard!');
        } else if (command.includes('stop')) {
          if (activeCardio) {
            stopCardio();
            speak('Cardio stopped.');
          } else {
            speak('Pausing workout.');
            pauseWorkout();
          }
        } else if (command.includes('next')) {
          nextExercise();
          speak('Moving to next exercise.');
        } else {
          // Default: announce current exercise
          const exerciseName = currentExercise?.exercise_name || 'exercise';
          const targetReps = currentExercise?.target_reps || 'as many as possible';
          speak(`${exerciseName}. Target: ${targetReps} reps. Begin!`);
        }
      }
    };

    setVoiceRecognition(recognition);
  };

  const toggleVoiceControl = async () => {
    if (!voiceRecognition) {
      toast.error('Voice control not available on this device');
      return;
    }

    if (!isVoiceActive) {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just needed permission
        
        voiceRecognition.start();
        setIsVoiceActive(true);
        speak('Voice control activated. Say RNS reps and steps to begin.');
        toast.success('🎤 Voice control ON - Say "RNS reps and steps" to start');
      } catch (error) {
        console.error('Failed to start voice control:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error('Microphone permission denied. Please enable in settings.');
        } else {
          toast.error('Failed to start voice control');
        }
      }
    } else {
      try {
        voiceRecognition.stop();
        setIsVoiceActive(false);
        speak('Voice control deactivated.');
        toast.success('Voice control OFF');
      } catch (error) {
        console.error('Failed to stop voice control:', error);
      }
    }
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
    if (isActive) {
      interval = setInterval(() => {
        const now = Date.now();
        const actualElapsed = Math.floor((now - lastTickTimeRef.current) / 1000);
        
        if (actualElapsed > 0) {
          lastTickTimeRef.current = now;
          
          // Always increment elapsed time (total time) when workout is active
          setElapsedTimer(prev => {
            const newElapsed = prev + actualElapsed;
            // Auto-stop after 4 hours
            if (newElapsed >= 14400) {
              stopWorkout();
            }
            return newElapsed;
          });

          // Only increment active timer when not paused
          if (!isPaused) {
            setTimer(prev => prev + actualElapsed);

          if (activeCardio) {
            // Cardio is active - increment cardio timer and decrement rest timer
            setCardioTimer(prev => prev + actualElapsed);
            setRestCardioTotal(prev => prev + actualElapsed);
            if (restTimer > 0) {
              setRestTimer(prev => Math.max(0, prev - actualElapsed));
            }
          } else if (!isResting) {
            const currentMetric = workout?.exercises[currentExerciseIndex]?.metric || 'reps';
            if (currentMetric === 'reps') {
              setExerciseTimer(prev => prev + actualElapsed);
            } else { // Time-based
              const targetTime = workout.exercises[currentExerciseIndex].target_time;
              setExerciseTimer(prevTime => {
                const newTime = prevTime + actualElapsed;
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
              const newTimer = prev - actualElapsed;
            
            // Countdown beeps for last 3 seconds of rest
            if (newTimer <= 3 && newTimer > 0 && newTimer !== lastBeepSecond) {
              setLastBeepSecond(newTimer);
              playBeep(false);
            } else if (newTimer === 0) {
              playBeep(true); // Long beep
            }
            
            // Auto-close rest if cardio total reaches or exceeds rest time
            if (restCardioTotal >= (workout.rest_time || 60)) {
              setTimeout(() => skipRest(), 100);
            }
              return Math.max(0, newTimer);
              });
          } else if (restTimer <= 0 && isResting) {
              skipRest();
          }
        }
        }
      }, 100);
            }
            return () => clearInterval(interval);
            }, [isActive, isPaused, isResting, restTimer, workout, currentExerciseIndex, activeCardio, isTimerPaused, lastBeepSecond, restCardioTotal]);

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
          category: workoutEx.category || exerciseDetails?.category || 'full_body',
          model_url: exerciseDetails?.model_url
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
    timerStartTimeRef.current = Date.now();
    lastTickTimeRef.current = Date.now();
    
    // Voice announcement when workout starts
    if (isVoiceActive) {
      const firstExercise = workout.exercises[0];
      speak(`Begin workout! ${firstExercise.exercise_name}. Target: ${firstExercise.target_reps || firstExercise.target_time + ' seconds'}. Go!`);
    }
    
    // Start GPS tracking immediately when workout begins
    startGlobalGPSTracking();
  };

  const startGlobalGPSTracking = () => {
    console.log('🎯 [GPS] Starting GPS tracking for workout');
    
    if ('geolocation' in navigator) {
      let gpsRetries = 0;
      const maxRetries = 5; // Increased retries
      let lastValidPosition = null;
      
      const startWatching = () => {
        console.log('🔍 [GPS] Requesting location permission...');
        
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            // Clear any previous errors
            setGpsError(null);
            gpsRetries = 0; // Reset retry count on success
            
            const newPos = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              timestamp: Date.now(),
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || 0
            };
            
            lastValidPosition = newPos;
            
            console.log('✅ [GPS] Position update:', {
              lat: newPos.lat.toFixed(6),
              lon: newPos.lon.toFixed(6),
              accuracy: newPos.accuracy.toFixed(1) + 'm',
              speed: newPos.speed ? newPos.speed.toFixed(2) + 'm/s' : 'N/A'
            });
            
            setGpsPositions(prev => {
              const updated = [...prev, newPos];
              
              // Calculate cumulative distance and steps for entire workout
              if (updated.length > 1) {
                let totalDistance = 0;
                
                // IMPROVED: More lenient accuracy threshold and better filtering
                for (let i = 1; i < updated.length; i++) {
                  const curr = updated[i];
                  const last = updated[i-1];
                  
                  // Only use positions with reasonable accuracy (< 100m)
                  if (curr.accuracy < 100 && last.accuracy < 100) {
                    const dist = calculateDistance(
                      last.lat, last.lon,
                      curr.lat, curr.lon
                    );
                    
                    // IMPROVED: Filter unrealistic jumps (> 0.1 miles in single update)
                    // but allow small movements (> 0.0005 miles / ~2.6 feet)
                    if (dist > 0.0005 && dist < 0.1) {
                      totalDistance += dist;
                      console.log(`📏 [GPS] Segment ${i}: +${dist.toFixed(4)} mi`);
                    } else if (dist >= 0.1) {
                      console.warn(`⚠️ [GPS] Ignoring unrealistic jump: ${dist.toFixed(4)} mi`);
                    }
                  }
                }
                
                setTotalWorkoutDistance(totalDistance);
                
                // Calculate steps: 2,100 steps per mile (average)
                const steps = Math.round(totalDistance * 2100);
                setTotalWorkoutSteps(steps);
                
                console.log('🚶 [STEPS] Total:', {
                  distance: totalDistance.toFixed(4) + ' mi',
                  steps: steps,
                  positions: updated.length
                });
              }
              
              return updated;
            });
          },
          (error) => {
            console.error('❌ [GPS] Error:', {
              code: error.code,
              message: error.message
            });
            
            if (error.code === 1) {
              setGpsError('📍 GPS permission denied - Please enable location in settings');
              toast.error('Location permission needed for step tracking');
            } else if (error.code === 2) {
              setGpsError('📡 GPS signal weak - Retrying...');
              
              // Retry logic for temporary GPS issues
              if (gpsRetries < maxRetries) {
                gpsRetries++;
                console.log(`🔄 [GPS] Retry ${gpsRetries}/${maxRetries}`);
                setTimeout(() => {
                  if (gpsWatchId !== null) {
                    try {
                      navigator.geolocation.clearWatch(gpsWatchId);
                    } catch (e) {
                      console.error('Error clearing watch:', e);
                    }
                  }
                  startWatching();
                }, 3000); // Longer retry delay
              } else {
                setGpsError('📡 GPS unavailable - Steps may be estimated');
                console.warn('⚠️ [GPS] Max retries reached');
              }
            } else if (error.code === 3) {
              setGpsError('⏱️ GPS timeout - Retrying...');
              console.warn('⚠️ [GPS] Timeout');
              
              // Auto-retry on timeout
              if (gpsRetries < maxRetries) {
                gpsRetries++;
                setTimeout(() => startWatching(), 2000);
              }
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased to 15s for better stability
            maximumAge: 2000 // Allow 2s cached position
          }
        );
        
        setGpsWatchId(watchId);
        console.log('✅ [GPS] Watch ID:', watchId);
      };
      
      // Request permission first
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('🔐 [GPS] Permission status:', result.state);
        if (result.state === 'granted') {
          startWatching();
        } else if (result.state === 'prompt') {
          // Will prompt user
          startWatching();
        } else {
          setGpsError('Location permission denied');
          toast.error('Please enable location in your device settings');
        }
      }).catch(() => {
        // Fallback if permissions API not supported
        console.log('⚠️ [GPS] Permissions API not supported, requesting directly');
        startWatching();
      });
    } else {
      setGpsError('GPS not supported on this device');
      console.error('❌ [GPS] Geolocation API not available');
      toast.error('GPS not supported on this device');
    }
  };

  const pauseWorkout = () => setIsPaused(!isPaused);

  const stopWorkout = async () => {
    // CRITICAL FIX: Finalize current exercise reps before stopping
    const currentExercise = workout.exercises[currentExerciseIndex];
    if (currentExercise && currentExercise.metric === 'reps' && currentReps > 0) {
      const updatedExercises = [...workout.exercises];
      const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
      const difference = currentReps - (updatedExercises[currentExerciseIndex].current_set_reps || 0);
      updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + difference;
      
      console.log('[REP TRACKING - STOP] Finalizing current exercise:', {
        exercise: currentExercise.exercise_name,
        current_reps: currentReps,
        previous_completed: previousCompleted,
        final_completed: previousCompleted + difference
      });
      
      // Update workout state with finalized reps
      workout.exercises = updatedExercises;
    }
    
    // Stop GPS tracking
    if (gpsWatchId) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
    }
    
    if (sessionStartTime) {
      // CRITICAL: Calculate actual total reps from workout.exercises array, not from state
      const calculatedTotalReps = workout.exercises
        .filter(ex => ex.metric === 'reps' && ex.category !== 'warmup')
        .reduce((sum, ex) => sum + (ex.completed_reps || 0), 0);
      
      console.log('[REP TRACKING - FINAL] State totalReps:', totalReps);
      console.log('[REP TRACKING - FINAL] Calculated from exercises:', calculatedTotalReps);
      console.log('[REP TRACKING - FINAL] Exercise breakdown:', workout.exercises.map(ex => ({
        name: ex.exercise_name,
        metric: ex.metric,
        completed_reps: ex.completed_reps || 0
      })));
      
      // CRITICAL FIX: Use global GPS-tracked workout steps and distance
      const totalSteps = totalWorkoutSteps;
      const totalDistance = totalWorkoutDistance;
      
      console.log('[STEPS TRACKING - FINAL] GPS Total Steps:', totalSteps);
      console.log('[STEPS TRACKING - FINAL] GPS Total Distance:', totalDistance);
      
      // Calculate cardio analytics with steps and distance
      const walkIntervals = cardioIntervals.filter(c => c.type === 'walk');
      const jogIntervals = cardioIntervals.filter(c => c.type === 'jog');
      const sprintIntervals = cardioIntervals.filter(c => c.type === 'sprint');
      
      // Calculate individual cardio type analytics (estimated from time)
      const walkSteps = Math.round(walkIntervals.reduce((sum, c) => sum + (c.time / 60) * 110, 0));
      const walkDistance = walkIntervals.reduce((sum, c) => {
        return sum + (c.gps_distance || (c.time / 3600) * 3.5);
      }, 0);

      const jogSteps = Math.round(jogIntervals.reduce((sum, c) => sum + (c.time / 60) * 170, 0));
      const jogDistance = jogIntervals.reduce((sum, c) => {
        return sum + (c.gps_distance || (c.time / 3600) * 6);
      }, 0);

      const sprintSteps = Math.round(sprintIntervals.reduce((sum, c) => sum + (c.time / 60) * 190, 0));
      const sprintDistance = sprintIntervals.reduce((sum, c) => {
        return sum + (c.gps_distance || (c.time / 3600) * 10);
      }, 0);
      
      // Improved calorie calculation (more accurate formula)
      // Base: 5 calories per minute of active work
      // Reps: 0.15 calories per rep (strength training)
      // Cardio bonus: walk +2 cal/min, jog +5 cal/min, sprint +10 cal/min
      const activeMinutes = timer / 60;
      const baseCalories = activeMinutes * 5;
      const repCalories = calculatedTotalReps * 0.15;
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
        total_reps: calculatedTotalReps,
        exercises_completed: workout.exercises.filter(ex => !ex.is_cardio_interval && ex.category !== 'warmup').map((ex) => ({
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
            avg_time: walkIntervals.length > 0 ? Math.round(walkIntervals.reduce((sum, c) => sum + c.time, 0) / walkIntervals.length) : 0,
            total_steps: walkSteps,
            total_distance_miles: Math.round(walkDistance * 100) / 100
          },
          jog: {
            count: jogIntervals.length,
            total_time: jogIntervals.reduce((sum, c) => sum + c.time, 0),
            avg_time: jogIntervals.length > 0 ? Math.round(jogIntervals.reduce((sum, c) => sum + c.time, 0) / jogIntervals.length) : 0,
            total_steps: jogSteps,
            total_distance_miles: Math.round(jogDistance * 100) / 100
          },
          sprint: {
            count: sprintIntervals.length,
            total_time: sprintIntervals.reduce((sum, c) => sum + c.time, 0),
            longest_sprint: sprintIntervals.length > 0 ? Math.max(...sprintIntervals.map(c => c.time)) : 0,
            shortest_sprint: sprintIntervals.length > 0 ? Math.min(...sprintIntervals.map(c => c.time)) : 0,
            avg_time: sprintIntervals.length > 0 ? Math.round(sprintIntervals.reduce((sum, c) => sum + c.time, 0) / sprintIntervals.length) : 0,
            total_steps: sprintSteps,
            total_distance_miles: Math.round(sprintDistance * 100) / 100
          },
          total_steps: totalSteps,
          total_distance_miles: Math.round(totalDistance * 100) / 100
        }
      };
      
      console.log('[SESSION SAVE] Final session data:', {
        total_reps: calculatedTotalReps,
        total_steps: totalSteps,
        total_distance: totalDistance,
        cardio_analytics: sessionData.cardio_analytics
      });
      
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
    
    // CRITICAL FIX: Update completed_reps in real-time
    const updatedExercises = [...workout.exercises];
    const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
    updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + 1;
    setWorkout({...workout, exercises: updatedExercises});
    
    console.log('[REP COUNT] Added rep:', {
      exercise: currentExercise.exercise_name,
      currentReps: newReps,
      totalReps: totalReps + 1,
      completed_reps: previousCompleted + 1
    });
    
    updateWorkoutProgress(newReps, 'reps');
  };

  const subtractRep = () => {
    if (currentReps > 0) {
      const newReps = currentReps - 1;
      setCurrentReps(newReps);
      setTotalReps(prev => prev - 1);
      
      // CRITICAL FIX: Update completed_reps in real-time
      const updatedExercises = [...workout.exercises];
      const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
      if (previousCompleted > 0) {
        updatedExercises[currentExerciseIndex].completed_reps = previousCompleted - 1;
        setWorkout({...workout, exercises: updatedExercises});
      }
      
      console.log('[REP COUNT] Subtracted rep:', {
        exercise: currentExercise.exercise_name,
        currentReps: newReps,
        totalReps: totalReps - 1,
        completed_reps: Math.max(0, previousCompleted - 1)
      });
      
      updateWorkoutProgress(newReps, 'reps');
    }
  };
  
  const setQuickReps = (reps) => {
    const difference = reps - currentReps;
    setCurrentReps(reps);
    setTotalReps(prev => prev + difference);
    
    // CRITICAL FIX: Update completed_reps in real-time
    const updatedExercises = [...workout.exercises];
    const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
    updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + difference;
    setWorkout({...workout, exercises: updatedExercises});
    
    console.log('[REP COUNT] Quick set reps:', {
      exercise: currentExercise.exercise_name,
      reps: reps,
      difference: difference,
      totalReps: totalReps + difference,
      completed_reps: previousCompleted + difference
    });
    
    setRepInput(reps.toString());
    updateWorkoutProgress(reps, 'reps');
  };

  const handleRepInput = (value) => {
    const reps = parseInt(value) || 0;
    const difference = reps - currentReps; 
    setCurrentReps(reps);
    setTotalReps(prev => prev + difference);
    
    // Update completed_reps in real-time
    const updatedExercises = [...workout.exercises];
    const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
    updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + difference;
    setWorkout({...workout, exercises: updatedExercises});
    
    setRepInput(value);
    updateWorkoutProgress(reps, 'reps');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getYouTubeVideoId = (exerciseName) => {
    // Map exercise names to YouTube video IDs for tutorials
    const videoMap = {
      'push': 'IODxDxX7oi4', // Push-ups tutorial
      'squat': '9cYEuFbBLSY', // Squat tutorial
      'plank': 'pSHjTRCQxIw', // Plank tutorial
      'lunge': 'QOVaHwm-Q6U', // Lunges tutorial
      'burpee': 'dZgVxmf6jkA', // Burpees tutorial
      'pull': 'eGo4IYlbE5g', // Pull-ups tutorial
      'dip': 'yN6Q1UI_xkE', // Dips tutorial
      'mountain climber': 'nmwgirgXLYM', // Mountain climbers
      'jumping jack': 'c4DAnQ6DtF8', // Jumping jacks
      'crunch': '5ER5Of4EISE', // Crunches
    };

    // Find matching video based on exercise name keywords
    const name = exerciseName.toLowerCase();
    for (const [key, videoId] of Object.entries(videoMap)) {
      if (name.includes(key)) {
        return videoId;
      }
    }
    // Default generic calisthenics tutorial
    return 'g_tea8ZNk5A'; // Calisthenics basics
  };

  const connectBluetoothHRM = async () => {
    try {
      if (!navigator.bluetooth) {
        console.error('❌ Bluetooth API not available');
        toast.error('Bluetooth not supported on this device');
        return;
      }

      console.log('🔵 Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate']
      });
      console.log('✅ Device selected:', device.name);

      console.log('🔗 Connecting to GATT server...');
      const server = await device.gatt.connect();
      console.log('✅ GATT server connected');

      console.log('🔍 Getting heart rate service...');
      const service = await server.getPrimaryService('heart_rate');
      console.log('✅ Heart rate service found');

      console.log('📡 Getting heart rate measurement characteristic...');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      console.log('✅ Characteristic found');

      await characteristic.startNotifications();
      console.log('✅ Notifications started');

      const handleHRChange = (event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        let hr;

        if (rate16Bits) {
          hr = value.getUint16(1, true);
        } else {
          hr = value.getUint8(1);
        }

        console.log(`💓 HR Reading: ${hr} BPM`, {
          timestamp: new Date().toLocaleTimeString(),
          flags,
          rate16Bits,
          valid: hr >= 40 && hr <= 220
        });

        if (hr >= 40 && hr <= 220) {
          setRealtimeHR(hr);
          setHeartRate(hr.toString());
        } else {
          console.warn('⚠️ Invalid HR reading:', hr);
        }
      };

      characteristic.addEventListener('characteristicvaluechanged', handleHRChange);

      const handleDisconnect = () => {
        console.log('❌ Device disconnected');
        setIsBluetoothConnected(false);
        setRealtimeHR(null);
        toast.error('Heart rate monitor disconnected');
      };

      device.addEventListener('gattserverdisconnected', handleDisconnect);

      setBluetoothDevice(device);
      setIsBluetoothConnected(true);
      toast.success(`Connected to ${device.name || 'HRM'}!`);
      console.log('✅ Setup complete - receiving heart rate data');
    } catch (error) {
      console.error('❌ Bluetooth connection failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });

      let errorMsg = 'Connection failed';
      if (error.name === 'NotFoundError') {
        errorMsg = 'No device selected';
      } else if (error.name === 'SecurityError') {
        errorMsg = 'Bluetooth permission denied';
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    }
  };

  const disconnectBluetoothHRM = () => {
    console.log('🔌 Disconnecting heart rate monitor...');
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
      console.log('✅ Disconnected');
    }
    setBluetoothDevice(null);
    setIsBluetoothConnected(false);
    setRealtimeHR(null);
    toast.success('Heart rate monitor disconnected');
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
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3 max-w-2xl pb-20 sm:pb-24">
        {/* Header */}
        <div className="text-center mb-2 sm:mb-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex-1 min-w-0"></div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold px-1 sm:px-2 leading-tight truncate flex-1 min-w-0">{workout.name}</h1>
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
          <div className="flex justify-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base flex-wrap px-1">
            <div className="flex flex-col items-center min-w-0">
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-brand-blue flex-shrink-0" />
                <span className="font-bold text-xs sm:text-sm">{formatTime(elapsedTimer)}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Total Time</span>
            </div>
            <div className="flex flex-col items-center min-w-0">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="font-bold text-xs sm:text-sm">{formatTime(timer)}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Active Time</span>
            </div>
            <div className="flex flex-col items-center min-w-0">
              <div className="flex items-center gap-1">
                <Footprints className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${gpsError ? 'text-red-400' : 'text-purple-400'}`} />
                <span className="font-bold text-xs sm:text-sm">{totalWorkoutSteps.toLocaleString()}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                {totalWorkoutDistance.toFixed(2)} mi
                {gpsError && <span className="text-red-400 ml-1">⚠️</span>}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{totalReps} / {getTotalEstimatedReps()}</span>
            </div>
            <button
              onClick={() => setShowHRInput(!showHRInput)}
              className={`flex items-center gap-1.5 transition-colors ${
                realtimeHR ? 'text-red-500 animate-pulse' : 'text-red-400 hover:text-red-300'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">{realtimeHR || heartRate || "HR"}</span>
              {realtimeHR && <span className="text-xs">BPM</span>}
            </button>
            <button
              onClick={toggleVoiceControl}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all shadow-lg select-none ${
                isVoiceActive 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
              }`}
              title={isVoiceActive ? "Voice Active - Tap to disable" : "Tap to enable AI Voice Coach"}
            >
              <svg className={`w-4 h-4 ${isVoiceActive ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              <span className="text-xs font-bold">{isVoiceActive ? 'ON' : 'AI'}</span>
              {!isVoiceActive && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">NEW</span>}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 px-2">
          <div className="flex justify-between text-[10px] sm:text-xs mb-1 text-gray-400">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
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
                  <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center justify-between">
                    Heart Rate Monitor
                    {isBluetoothConnected && (
                      <Badge className="bg-green-500 text-white text-xs">Connected</Badge>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {/* Bluetooth HRM Connection */}
                    {!isBluetoothConnected ? (
                      <Button
                        onClick={connectBluetoothHRM}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        🔵 Connect Bluetooth HRM
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-400 mb-1">Live Heart Rate</p>
                          <p className="text-4xl font-bold text-green-400 animate-pulse">{realtimeHR || '--'}</p>
                          <p className="text-xs text-green-300">BPM</p>
                        </div>
                        <Button
                          onClick={disconnectBluetoothHRM}
                          variant="outline"
                          className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}

                    {/* Manual Input */}
                    <div className="border-t border-red-500/30 pt-3">
                      <p className="text-xs text-gray-400 mb-2">Or enter manually:</p>
                      <Input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        placeholder="Enter BPM"
                        className="bg-background border-red-500/50 text-white text-center text-lg"
                      />
                    </div>

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

        {/* Superset Transition Screen */}
        <AnimatePresence>
          {isSupersetTransition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
            >
              <Card className="bg-gray-900/80 border-purple-500/30 text-white w-full max-w-sm my-auto" style={{ maxHeight: '95vh' }}>
                <CardContent className="p-3 sm:p-6 text-center overflow-y-auto" style={{ maxHeight: 'calc(95vh - 2rem)' }}>
                  {!activeCardio ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-purple-400">SUPERSET TRANSITION</h2>
                      <p className="text-sm text-gray-400 mb-4">Optional cardio before next exercise</p>

                      {/* Next Exercise Preview */}
                      {workout.exercises[currentExerciseIndex + 1] && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                          <p className="text-xs text-purple-400 font-bold mb-2">▶ UP NEXT</p>
                          <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                            {workout.exercises[currentExerciseIndex + 1].image_url ? (
                              <img src={workout.exercises[currentExerciseIndex + 1].image_url} alt={workout.exercises[currentExerciseIndex + 1].exercise_name} className="w-full h-full object-cover" />
                            ) : (
                              <Target className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white">{workout.exercises[currentExerciseIndex + 1].exercise_name}</p>
                        </div>
                      )}

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
                        onClick={skipSupersetTransition}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold touch-manipulation min-h-[48px] mb-2"
                      >
                        SKIP - Continue Superset
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold mb-2 text-brand-blue uppercase">{activeCardio.type}ING</h2>
                      <div className="text-7xl font-bold mb-4 text-brand-blue animate-pulse">{formatTime(cardioTimer)}</div>

                      <div className="grid grid-cols-2 gap-2 pb-2">
                        <Button
                          onClick={stopCardio}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          STOP & SWITCH
                        </Button>
                        <Button
                          onClick={stopCardioAndContinueSuperset}
                          className="bg-purple-500 hover:bg-purple-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
                        >
                          DONE - Continue
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievement Pop-up */}
        <AnimatePresence>
          {achievementPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -100 }}
              className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000] px-4"
            >
              <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-300 shadow-2xl">
                <CardContent className="p-6 text-center min-w-[280px]">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <Trophy className="w-16 h-16 text-white mx-auto mb-3" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-white mb-2">{achievementPopup.title}</h3>
                  <p className="text-lg font-bold text-black mb-1">{achievementPopup.message}</p>
                  {achievementPopup.prevRecord > 0 && (
                    <p className="text-sm text-white/80">Previous: {achievementPopup.prevRecord}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Recovery Screen (can be triggered anytime) */}
        <AnimatePresence>
          {showActiveRecovery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
            >
              <Card className="bg-gray-900/80 border-cyan-500/30 text-white w-full max-w-sm my-auto max-h-[90vh] overflow-hidden flex flex-col">
                <CardContent className="p-3 sm:p-4 text-center overflow-y-auto flex-1">
                  {!activeCardio ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-cyan-400">ACTIVE RECOVERY</h2>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => addRestTime(-15)}
                            className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                            disabled={restTimer <= 5}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => addRestTime(-30)}
                            className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                            disabled={restTimer <= 30}
                          >
                            -30
                          </button>
                        </div>
                        <div className="text-6xl font-bold">{restTimer}s</div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => addRestTime(15)}
                            className="w-10 h-10 bg-cyan-600/50 hover:bg-cyan-600 rounded-full flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => addRestTime(30)}
                            className="w-10 h-10 bg-cyan-600/50 hover:bg-cyan-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                          >
                            +30
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                        <p className="text-sm text-gray-400 mb-3">Choose cardio activity</p>

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
                      </div>

                      <div className="flex-shrink-0 pt-2">
                      <Button
                        onClick={() => setShowActiveRecovery(false)}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold touch-manipulation min-h-[48px]"
                      >
                        DONE - Continue Workout
                      </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold mb-2 text-brand-blue uppercase">{activeCardio.type}ING</h2>
                      <div className="text-7xl font-bold mb-4 text-brand-blue animate-pulse">{formatTime(cardioTimer)}</div>

                      <div className="grid grid-cols-2 gap-2 pb-2">
                        <Button
                          onClick={stopCardio}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          STOP & SWITCH
                        </Button>
                        <Button
                          onClick={() => {
                            stopCardio();
                            setShowActiveRecovery(false);
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
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

        {/* Rest/Cardio Screen */}
        <AnimatePresence>
          {isResting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
            >
              <Card className="bg-gray-900/80 border-brand-blue/30 text-white w-full max-w-sm my-auto max-h-[85vh] overflow-hidden flex flex-col">
                <CardContent className="p-3 flex flex-col h-full" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                  {!activeCardio ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-brand-blue">ACTIVE RECOVERY</h2>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              const decrement = workout.exercises[currentExerciseIndex]?.category === 'warmup' ? -5 : -15;
                              addRestTime(decrement);
                            }}
                            className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                            title={workout.exercises[currentExerciseIndex]?.category === 'warmup' ? "Subtract 5 seconds" : "Subtract 15 seconds"}
                            disabled={restTimer <= 5}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          {workout.exercises[currentExerciseIndex]?.category !== 'warmup' && (
                            <button
                              onClick={() => addRestTime(-30)}
                              className="w-10 h-10 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                              title="Subtract 30 seconds"
                              disabled={restTimer <= 30}
                            >
                              -30
                            </button>
                          )}
                        </div>
                        <div className="text-6xl font-bold">{restTimer}s</div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              const increment = workout.exercises[currentExerciseIndex]?.category === 'warmup' ? 5 : 15;
                              addRestTime(increment);
                            }}
                            className="w-10 h-10 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                            title={workout.exercises[currentExerciseIndex]?.category === 'warmup' ? "Add 5 seconds" : "Add 15 seconds"}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          {workout.exercises[currentExerciseIndex]?.category !== 'warmup' && (
                            <button
                              onClick={() => addRestTime(30)}
                              className="w-10 h-10 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
                              title="Add 30 seconds"
                            >
                              +30
                            </button>
                          )}
                        </div>
                      </div>
                      {extendedRestTime > 0 && (
                        <p className="text-xs text-blue-400 mb-2">+ {extendedRestTime}s added</p>
                      )}
                      <div className="mb-4">
                        <p className="text-sm text-gray-400">Cardio Time: {restCardioTotal}s / {workout.rest_time || 60}s</p>
                        <Progress value={(restCardioTotal / (workout.rest_time || 60)) * 100} className="h-2 mt-2" />
                        {restTimer <= 0 && restCardioTotal >= (workout.rest_time || 60) && (
                          <p className="text-xs text-green-400 mt-1">✓ Rest complete - tap DONE</p>
                        )}
                      </div>

                      {/* Exercise Preview Cards */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* Just Completed */}
                        {currentExerciseIndex > 0 && (
                          <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-2">
                            <p className="text-[10px] text-green-400 font-bold mb-1">✓ COMPLETED</p>
                            <div className="w-full h-16 bg-gray-800 rounded mb-1 flex items-center justify-center overflow-hidden">
                              {workout.exercises[currentExerciseIndex - 1]?.image_url ? (
                                <img src={workout.exercises[currentExerciseIndex - 1].image_url} alt={workout.exercises[currentExerciseIndex - 1].exercise_name} className="w-full h-full object-cover" />
                              ) : (
                                <Target className="w-6 h-6 text-gray-600" />
                              )}
                            </div>
                            <p className="text-[10px] font-semibold text-white line-clamp-2">{workout.exercises[currentExerciseIndex - 1]?.exercise_name}</p>
                          </div>
                        )}

                        {/* Coming Up Next */}
                        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-lg p-2">
                          <p className="text-[10px] text-brand-blue font-bold mb-1">▶ UP NEXT</p>
                          <div className="w-full h-16 bg-gray-800 rounded mb-1 flex items-center justify-center overflow-hidden">
                            {currentExercise?.image_url ? (
                              <img src={currentExercise.image_url} alt={currentExercise.exercise_name} className="w-full h-full object-cover" />
                            ) : (
                              <Target className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-white line-clamp-2">{currentExercise?.exercise_name}</p>
                          <p className="text-[10px] text-gray-400">
                            {currentExercise?.metric === 'time' 
                              ? `${currentExercise?.target_time}s` 
                              : `${currentExercise?.target_reps} reps`}
                          </p>
                        </div>
                      </div>

                      {/* Quick instructions for next exercise */}
                      {currentExercise?.instructions && (
                        <div className="bg-gray-800/50 rounded-lg p-2 mb-3 max-h-24 overflow-y-auto">
                          <p className="text-[10px] text-brand-blue font-semibold mb-1">How to:</p>
                          <ul className="text-[10px] text-gray-300 space-y-0.5">
                            {currentExercise.instructions.slice(0, 3).map((instruction, i) => (
                              <li key={i} className="line-clamp-1">• {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mb-2">Choose cardio or skip</p>

                      <div className="grid grid-cols-3 gap-2 mb-3">
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

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={skipRest}
                          variant="outline"
                          className="border-gray-500 text-gray-300 hover:bg-gray-700 touch-manipulation h-12 text-xs"
                        >
                          SKIP REST
                        </Button>
                        <Button
                          onClick={openSupersetModal}
                          className="bg-purple-600/20 border-2 border-purple-500 text-purple-300 hover:bg-purple-600/40 touch-manipulation h-12 text-xs"
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          SUPERSET
                        </Button>
                      </div>
                      </>
                      ) : (
                        <>
                          <h2 className="text-3xl font-bold mb-2 text-brand-blue uppercase">{activeCardio.type}ING</h2>
                          <div className="text-7xl font-bold mb-4 text-brand-blue animate-pulse">{formatTime(cardioTimer)}</div>

                          <div className="mb-4">
                            <p className="text-sm text-gray-400">Total Cardio: {restCardioTotal}s / {workout.rest_time || 60}s</p>
                            <Progress value={(restCardioTotal / (workout.rest_time || 60)) * 100} className="h-2 mt-2" />
                            {restTimer <= 0 && restCardioTotal >= (workout.rest_time || 60) && (
                              <p className="text-xs text-green-400 mt-1">✓ Rest complete!</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 pb-2">
                              <Button
                                onClick={stopCardio}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
                              >
                                <Square className="w-4 h-4 mr-1" />
                                STOP & SWITCH
                              </Button>
                              <Button
                                onClick={() => {
                                  stopCardio();
                                  if (restCardioTotal >= (workout.rest_time || 60)) {
                                    setTimeout(() => skipRest(), 100);
                                  }
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold touch-manipulation min-h-[56px] text-sm"
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

        {/* Current Exercise - NEW LAYOUT */}
        <motion.div
          key={`${currentExerciseIndex}-${currentSet}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="mb-2 px-2"
        >
          <Card className="bg-card backdrop-blur-sm border-border text-white">
            <CardContent className="p-2 sm:p-3">
              {/* Header Row */}
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue text-xs">
                  Set {currentSet} of {currentExercise.sets || 1}
                </Badge>
                <div className="flex gap-1">
                  <button
                    onClick={openSupersetModal}
                    className="w-7 h-7 bg-purple-600/50 hover:bg-purple-600 rounded-full flex items-center justify-center transition-colors"
                    title="Supersets"
                  >
                    <LinkIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowSwapModal(true)}
                    className="w-7 h-7 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                    title="Swap"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mb-2 leading-tight">{currentExercise.exercise_name}</h2>
              
              {/* HOW TO Section */}
              <div className="flex justify-center gap-2 mb-2">
                <Button
                  onClick={() => setShowHowTo(true)}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 px-3 py-1 h-8"
                >
                  <Play className="w-3 h-3" />
                  <span className="text-xs font-bold">VIDEO</span>
                </Button>
                <Button
                  onClick={() => setShow3DView(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 px-3 py-1 h-8"
                >
                  <Box className="w-3 h-3" />
                  <span className="text-xs font-bold">3D</span>
                </Button>
              </div>
              
              {/* Set Progress Badge */}
              <div className="mb-2">
                <Badge variant="outline" className="border-brand-blue/50 text-brand-blue text-[10px] sm:text-xs leading-tight">
                  {currentSet < (currentExercise.sets || 1) 
                    ? `Set ${currentSet} of ${currentExercise.sets || 1} → Next: Set ${currentSet + 1}`
                    : currentExerciseIndex < workout.exercises.length - 1
                      ? `Set ${currentSet} of ${currentExercise.sets || 1} completed → Next: ${workout.exercises[currentExerciseIndex + 1]?.exercise_name}`
                      : `Final Set ${currentSet} of ${currentExercise.sets || 1} - Last Exercise!`}
                </Badge>
              </div>
              
              {!isTimeBased && isFourCountExercise(currentExercise.exercise_name) && (
                <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-xs font-semibold">⚠️ 4-COUNT EXERCISE: 1...2...3...4 = 1 REP</p>
                </div>
              )}
              
              {/* MAIN CONTENT - Side by Side Layout */}
              <div className="flex flex-col sm:flex-row gap-3 mb-2">
                {/* Large Exercise Image */}
                <div className="flex-1 bg-background rounded-lg flex items-center justify-center overflow-hidden min-h-[200px] sm:min-h-[280px] max-h-[300px] sm:max-h-[400px]">
                  {currentExercise.image_url ? (
                    <img src={currentExercise.image_url} alt={currentExercise.exercise_name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Target className="w-16 h-16 text-brand-blue/50" />
                  )}
                </div>

                {/* Rep Counter Side Panel */}
                {!isTimeBased ? (
                  <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-3 w-full sm:w-auto sm:min-w-[180px]">
                    <div className="text-6xl sm:text-7xl font-bold mb-2 text-brand-blue">{currentReps}</div>
                    <p className="text-sm sm:text-base text-gray-300 font-bold mb-4">
                      Target: {currentExercise.target_reps || 'As many as possible'}
                    </p>
                    
                    <div className="flex flex-col gap-3 w-full">
                      {/* Only show "5" and target reps button */}
                      {[5, currentExercise.target_reps].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v > 0).sort((a,b) => a-b).map(reps => (
                        <Button key={reps} variant="outline" size="lg" onClick={() => setQuickReps(reps)} className="w-full bg-gray-800 border-gray-700 text-white h-12 text-base font-bold">
                          {reps}
                        </Button>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4 w-full">
                      <Button size="lg" variant="outline" onClick={subtractRep} className="flex-1 h-14 rounded-lg bg-gray-800 border-gray-700 text-white text-base font-bold">
                        -1
                      </Button>
                      <Input
                        type="number" value={repInput} onChange={(e) => handleRepInput(e.target.value)}
                        placeholder="Reps"
                        className="w-24 bg-gray-800 border-gray-700 text-white text-center text-lg font-bold placeholder:text-gray-500 h-14"
                      />
                      <Button size="lg" variant="outline" onClick={addRep} className="flex-1 h-14 rounded-lg bg-gray-800 border-gray-700 text-white text-base font-bold">
                        +1
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 mt-3 w-full">
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => {
                          const newReps = Math.max(0, currentReps - 5);
                          const difference = newReps - currentReps;
                          setCurrentReps(newReps);
                          setTotalReps(prev => prev + difference);
                          const updatedExercises = [...workout.exercises];
                          const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
                          updatedExercises[currentExerciseIndex].completed_reps = Math.max(0, previousCompleted + difference);
                          setWorkout({...workout, exercises: updatedExercises});
                        }} 
                        className="flex-1 h-12 bg-gray-800 border-gray-700 text-base font-bold"
                      >
                        -5
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => {
                          const newReps = currentReps + 5;
                          setCurrentReps(newReps);
                          setTotalReps(prev => prev + 5);
                          const updatedExercises = [...workout.exercises];
                          const previousCompleted = updatedExercises[currentExerciseIndex].completed_reps || 0;
                          updatedExercises[currentExerciseIndex].completed_reps = previousCompleted + 5;
                          setWorkout({...workout, exercises: updatedExercises});
                        }} 
                        className="flex-1 h-12 bg-gray-800 border-gray-700 text-base font-bold"
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-3 w-full sm:w-auto sm:min-w-[180px]">
                    <div className="text-5xl font-bold mb-2 text-brand-blue">{formatTime(exerciseTimer)}</div>
                    <p className="text-xs text-gray-400 mb-3">
                      Target:<br/>{formatTime(currentExercise.target_time)}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => {
                          const newTime = Math.max(5, currentExercise.target_time - 5);
                          const updatedExercises = [...workout.exercises];
                          updatedExercises[currentExerciseIndex].target_time = newTime;
                          setWorkout({...workout, exercises: updatedExercises});
                        }}
                        className="w-8 h-8 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const newTime = Math.min(300, currentExercise.target_time + 5);
                          const updatedExercises = [...workout.exercises];
                          updatedExercises[currentExerciseIndex].target_time = newTime;
                          setWorkout({...workout, exercises: updatedExercises});
                        }}
                        className="w-8 h-8 bg-green-600/50 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <Progress value={timeProgress} className="h-2 w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2 mb-2 px-2">
          {!isActive ? (
            <Button size="lg" onClick={startWorkout} className="gradient-bg text-white px-6 py-3 text-base sm:text-lg font-bold rounded-full flex-1 max-w-xs touch-manipulation min-h-[48px]">
              <Play className="w-5 h-5 mr-2" /> START
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={pauseWorkout} variant="outline" className="bg-yellow-500/20 border-yellow-400 text-white hover:bg-yellow-500/30 px-2 sm:px-3 py-2 flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm">
                <Pause className="w-4 h-4 mr-1" /> {isPaused ? 'RESUME' : 'PAUSE'}
              </Button>
              <Button size="sm" onClick={nextExercise} className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-2 flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm">
                <SkipForward className="w-4 h-4 mr-1" /> NEXT
              </Button>
              <Button size="sm" onClick={stopWorkout} variant="outline" className="bg-red-500/20 border-red-400 text-white hover:bg-red-500/30 px-2 sm:px-3 py-2 flex-1 touch-manipulation min-h-[44px] text-xs sm:text-sm">
                <Square className="w-4 h-4 mr-1" /> STOP
              </Button>
            </>
          )}
        </div>

        {/* Voice Control Status Banner */}
        {isVoiceActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-2"
          >
            <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-purple-300 mb-1">🎤 AI Voice Coach Active</h4>
                    <p className="text-xs text-gray-300">Listening for commands... Hands-free mode ON</p>
                  </div>
                  <Button
                    onClick={toggleVoiceControl}
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-300 hover:bg-purple-500/20"
                  >
                    OFF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Recovery Button - Always Available During Workout */}
        {isActive && !isResting && !isSupersetTransition && (
          <div className="flex justify-center mb-4 px-2">
            <Button
              onClick={startActiveRecovery}
              variant="outline"
              className="bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 px-4 py-2 touch-manipulation min-h-[44px] text-xs sm:text-sm font-bold"
            >
              <Timer className="w-4 h-4 mr-2" />
              ACTIVE RECOVERY
            </Button>
          </div>
        )}

        {/* Split Sets Button - Only for Rep-Based Exercises */}
        {isActive && !isResting && !isSupersetTransition && !isTimeBased && currentExercise.target_reps > 20 && (
          <div className="flex justify-center mb-4 px-2">
            <Button
              onClick={() => {
                const updatedExercises = [...workout.exercises];
                const targetReps = updatedExercises[currentExerciseIndex].target_reps;
                const newReps = Math.ceil(targetReps / 2);
                const newSets = updatedExercises[currentExerciseIndex].sets * 2;
                
                updatedExercises[currentExerciseIndex].target_reps = newReps;
                updatedExercises[currentExerciseIndex].sets = newSets;
                
                setWorkout({...workout, exercises: updatedExercises});
                toast.success(`Split into ${newSets} sets of ${newReps} reps each`);
              }}
              variant="outline"
              className="bg-orange-500/20 border-orange-400 text-orange-300 hover:bg-orange-500/30 px-4 py-2 touch-manipulation min-h-[44px] text-xs sm:text-sm font-bold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              SPLIT SETS ({currentExercise.target_reps} → {Math.ceil(currentExercise.target_reps / 2)} x 2)
            </Button>
          </div>
        )}

        {/* Exercise List */}
        <Card className="bg-card border-border mx-2 mb-2">
          <CardContent className="p-2">
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-white">Workout Plan</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto touch-manipulation">
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

      {/* YouTube Video Modal */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2"
            onClick={() => setShowHowTo(false)}
          >
            <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <CardContent className="p-3 sm:p-4">
                <h3 className="text-lg font-bold mb-3 text-white">{currentExercise.exercise_name}</h3>
                
                {/* YouTube Video Embed */}
                <div className="w-full aspect-video bg-black rounded-lg mb-3 overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(currentExercise.exercise_name)}?rel=0`}
                    title={currentExercise.exercise_name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>

                {/* Instructions */}
                {currentExercise.instructions?.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                    <h4 className="font-semibold mb-2 text-white text-sm">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                      {currentExercise.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                  </div>
                )}

                <Button onClick={() => setShowHowTo(false)} className="w-full gradient-bg text-white">
                  Got It!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Voice Coach Help Modal */}
      <AnimatePresence>
        {showVoiceHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowVoiceHelp(false)}
          >
            <Card className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 w-full max-w-md border-purple-500/50 shadow-2xl" onClick={e => e.stopPropagation()}>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-3">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI Voice Coach™
                  </h2>
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white mb-3">
                    🚀 NEW HI-TECH FEATURE
                  </Badge>
                  
                  {/* Status indicator */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 ${
                    isVoiceActive 
                      ? 'bg-green-500/20 border border-green-500' 
                      : 'bg-gray-800/50 border border-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className={`text-sm font-bold ${isVoiceActive ? 'text-green-400' : 'text-gray-400'}`}>
                      {isVoiceActive ? '🎤 Voice Active' : 'Voice Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400">Truly hands-free workouts with AI-powered voice guidance</p>
                </div>

                <div className="space-y-4 mb-6">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
                    <span className="text-lg">🎯</span> How It Works
                  </h3>
                  <ol className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400">1.</span>
                      <span>Tap <strong className="text-purple-300">START</strong> button, voice says "Begin workout"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400">2.</span>
                      <span>Say <strong className="text-pink-300">"Reps and steps"</strong> then your command</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400">3.</span>
                      <span>Say <strong className="text-pink-300">"Reps and steps 15 reps completed"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400">4.</span>
                      <span>Voice announces next: <strong className="text-pink-300">"Active recovery or skip"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400">5.</span>
                      <span>Say <strong className="text-pink-300">"Reps and steps walk"</strong> or "jog" or "sprint" or "skip"</span>
                    </li>
                  </ol>
                </div>

                  <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                    <h3 className="font-bold text-pink-300 mb-2 flex items-center gap-2">
                      <span className="text-lg">🎤</span> Voice Commands
                    </h3>
                    <div className="text-xs text-gray-300 space-y-2">
                      <p className="font-semibold text-pink-300">Say "Reps and steps" + command:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>• "begin" / "start"</div>
                        <div>• "15 reps completed"</div>
                        <div>• "walk completed"</div>
                        <div>• "jog completed"</div>
                        <div>• "sprint completed"</div>
                        <div>• "walk" / "jog" / "sprint"</div>
                        <div>• "skip"</div>
                        <div>• "next"</div>
                        <div>• "stop"</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <h3 className="font-bold text-green-300 mb-2 flex items-center gap-2">
                      <span className="text-lg">💡</span> Pro Tips
                    </h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Connect Bluetooth headphones for best experience</li>
                      <li>• Works even when phone is in your pocket</li>
                      <li>• Perfect for outdoor runs and intense workouts</li>
                      <li>• Say commands clearly with wake phrase each time</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowVoiceHelp(false);
                      if (!isVoiceActive) {
                        toggleVoiceControl();
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold select-none"
                  >
                    🎤 {isVoiceActive ? 'Voice Active!' : 'Activate Now'}
                  </Button>
                  <Button
                    onClick={() => setShowVoiceHelp(false)}
                    variant="outline"
                    className="flex-1 border-gray-600 hover:bg-gray-800 select-none"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D View Modal */}
      <AnimatePresence>
        {show3DView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2"
            onClick={() => setShow3DView(false)}
          >
            <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <CardContent className="p-3 sm:p-4">
                <h3 className="text-lg font-bold mb-3 text-white">{currentExercise.exercise_name} - 3D View</h3>
                
                {/* 3D Viewer */}
                <div className="w-full aspect-square bg-black rounded-lg mb-3 overflow-hidden">
                  {currentExercise.model_url ? (
                    <Exercise3DViewer 
                      modelUrl={currentExercise.model_url} 
                      exerciseName={currentExercise.exercise_name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-2">🏋️</div>
                        <p className="text-gray-400 text-sm">No 3D model available</p>
                        <p className="text-gray-500 text-xs mt-1">Upload a GLB file to see animated guide</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {currentExercise.instructions?.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                    <h4 className="font-semibold mb-2 text-white text-sm">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                      {currentExercise.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                  </div>
                )}

                <Button onClick={() => setShow3DView(false)} className="w-full gradient-bg text-white">
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Superset Configuration Modal */}
      <AnimatePresence>
        {showSupersetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowSupersetModal(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          >
            <Card className="bg-gray-900 w-full max-w-lg border-gray-800 my-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }} onClick={e => e.stopPropagation()}>
              <CardContent className="p-4 sm:p-6 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 4rem)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <div className="flex-shrink-0 pb-3">
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                    Configure Supersets
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 mb-3">Select exercises to link together (no rest between them)</p>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-purple-400 mb-1">💡 <strong>How Supersets Work:</strong></p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Check exercises to link them together</li>
                      <li>• Checked exercises = superset with the NEXT exercise</li>
                      <li>• Chain multiple exercises by checking all of them</li>
                      <li>• Example: Check Ex1 & Ex2 = Ex1→Ex2→Ex3 superset</li>
                    </ul>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 mb-3" style={{ minHeight: '200px', maxHeight: 'calc(100vh - 28rem)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                  {supersetSelections.map((selection, idx) => (
                    <div key={selection.index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-800/50 border border-gray-700 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selection.selected}
                        onChange={() => toggleSupersetSelection(selection.index)}
                        disabled={idx === supersetSelections.length - 1}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">{selection.name}</div>
                        {selection.selected && idx < supersetSelections.length - 1 && (
                          <div className="text-xs text-purple-400 mt-1">→ Superset with next</div>
                        )}
                        {idx === supersetSelections.length - 1 && (
                          <div className="text-xs text-gray-500 mt-1">Last exercise (can't superset)</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 sm:gap-3 flex-shrink-0 pt-3 border-t border-gray-700">
                  <Button onClick={applySupersets} className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[48px] text-sm sm:text-base">
                    <Check className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                  <Button onClick={() => setShowSupersetModal(false)} variant="outline" className="flex-1 min-h-[48px] text-sm sm:text-base border-gray-600 hover:bg-gray-800">
                    Cancel
                  </Button>
                </div>
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
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowSwapModal(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          >
            <Card className="bg-gray-900 w-full max-w-lg border-gray-800 my-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }} onClick={e => e.stopPropagation()}>
              <CardContent className="p-4 sm:p-6 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 4rem)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white flex-shrink-0">Swap Exercise</h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-2 flex-shrink-0">Search or choose from the list</p>
                
                <div className="relative mb-3 sm:mb-4 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search exercises..."
                    value={swapSearchQuery}
                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="overflow-y-auto flex-1 space-y-2" style={{ minHeight: '200px', maxHeight: 'calc(100vh - 24rem)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                  {allExercises
                    .filter(ex => ex.category === currentExercise.category || ex.category === 'full_body')
                    .filter(ex => !swapSearchQuery || ex.name.toLowerCase().includes(swapSearchQuery.toLowerCase()) || (ex.description && ex.description.toLowerCase().includes(swapSearchQuery.toLowerCase())))
                    .map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => swapExercise(exercise)}
                        className="w-full text-left p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-brand-blue flex-shrink-0"
                      >
                        <div className="font-semibold text-white text-sm sm:text-base">{exercise.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{exercise.description}</div>
                      </button>
                    ))}
                </div>
                <div className="flex-shrink-0 pt-3 border-t border-gray-700">
                  <Button onClick={() => setShowSwapModal(false)} variant="outline" className="w-full min-h-[48px] border-gray-600 hover:bg-gray-800">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}