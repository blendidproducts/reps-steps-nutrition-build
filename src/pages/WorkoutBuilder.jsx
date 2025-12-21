import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Workout } from "@/entities/Workout";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import {
  ArrowLeft,
  Play,
  Timer,
  Dumbbell,
  ChevronRight,
  Check,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Target
} from "lucide-react";

export default function WorkoutBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const [isFreeTime, setIsFreeTime] = useState(false);
  const [selectedReps, setSelectedReps] = useState(null);
  const [customReps, setCustomReps] = useState("");
  const [autoReps, setAutoReps] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allExercises, setAllExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [user, setUser] = useState(null);
  
  const [settings, setSettings] = useState({
    defaultSets: [3],
    defaultReps: [15],
    restTime: [30],
    includeWarmup: true,
    useWeightVest: false,
    vestWeightLbs: [10]
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        setUser({ subscription_status: 'free' });
      }
      
      const exercises = await Exercise.list();
      setAllExercises(exercises);
      loadSelectedExercises();
    };
    initialize();
  }, []);

  // Auto-adjust settings based on time selection
  useEffect(() => {
    if (selectedTime && selectedExercises.length > 0) {
      calculateRealisticSettings();
    }
  }, [selectedTime, selectedExercises.length]);

  // Validate and calculate max possible values for sliders
  const getConstraints = () => {
    if (!selectedTime || selectedExercises.length === 0) {
      return { maxSets: 5, maxReps: 30, maxRest: 120 };
    }

    const totalMinutes = selectedTime;
    const availableSeconds = totalMinutes * 60;
    const numExercises = selectedExercises.length + (settings.includeWarmup ? 3 : 0);
    
    // Estimate 2 seconds per rep
    const secondsPerRep = 2;
    
    // Calculate max sets given current reps and rest
    const timePerSet = settings.defaultReps[0] * secondsPerRep;
    const totalSets = numExercises * settings.defaultSets[0];
    const restTime = (totalSets - 1) * settings.restTime[0];
    const workTime = totalSets * timePerSet;
    
    // Calculate maximum values
    const maxSets = Math.max(1, Math.min(5, Math.floor(
      (availableSeconds - settings.restTime[0]) / 
      (numExercises * (settings.defaultReps[0] * secondsPerRep + settings.restTime[0]))
    )));
    
    const maxReps = Math.max(5, Math.min(30, Math.floor(
      (availableSeconds - (numExercises * settings.defaultSets[0] - 1) * settings.restTime[0]) /
      (numExercises * settings.defaultSets[0] * secondsPerRep)
    )));
    
    const maxRest = Math.max(15, Math.min(120, Math.floor(
      (availableSeconds - numExercises * settings.defaultSets[0] * settings.defaultReps[0] * secondsPerRep) /
      (numExercises * settings.defaultSets[0] - 1)
    )));

    return { maxSets, maxReps, maxRest };
  };

  const calculateRealisticSettings = () => {
    const totalMinutes = isFreeTime ? 999 : selectedTime;
    const numExercises = selectedExercises.length + (settings.includeWarmup ? 3 : 0);
    const availableSeconds = totalMinutes * 60;
    
    // Start with reasonable defaults
    let newSets = 3;
    let newReps = autoReps ? 15 : (selectedReps || 15);
    let newRest = 30;
    
    // Adjust based on total time (only if auto-reps)
    if (autoReps) {
      if (totalMinutes <= 15) {
        newSets = 2;
        newReps = 10;
        newRest = 20;
      } else if (totalMinutes <= 30) {
        newSets = 3;
        newReps = 15;
        newRest = 30;
      } else if (totalMinutes <= 45) {
        newSets = 4;
        newReps = 18;
        newRest = 45;
      } else if (!isFreeTime) {
        newSets = 5;
        newReps = 20;
        newRest = 60;
      } else {
        newSets = 3;
        newReps = 15;
        newRest = 60;
      }
    } else {
      newReps = selectedReps || 15;
    }
    
    // Validate the combination works
    const totalSets = numExercises * newSets;
    const workTime = totalSets * newReps * 2;
    const restTime = (totalSets - 1) * newRest;
    const totalTime = workTime + restTime;
    
    // If still too long, reduce reps
    if (totalTime > availableSeconds) {
      newReps = Math.max(5, Math.floor(
        (availableSeconds - (totalSets - 1) * newRest) / (totalSets * 2)
      ));
    }
    
    setSettings(prev => ({
      ...prev,
      defaultSets: [newSets],
      defaultReps: [newReps],
      restTime: [newRest]
    }));
  };

  const getEstimatedTime = () => {
    if (!selectedExercises.length) return 0;
    
    const numExercises = selectedExercises.length + (settings.includeWarmup ? 3 : 0);
    const totalSets = numExercises * settings.defaultSets[0];
    const workTime = totalSets * settings.defaultReps[0] * 2; // 2 sec per rep
    const restTime = (totalSets - 1) * settings.restTime[0];
    const totalSeconds = workTime + restTime;
    
    return Math.ceil(totalSeconds / 60); // Convert to minutes
  };

  const isTimeValid = () => {
    if (isFreeTime) return true;
    const estimated = getEstimatedTime();
    return estimated <= selectedTime;
  };

  const loadSelectedExercises = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const exerciseIds = urlParams.get('exercises');

    if (exerciseIds) {
      const ids = exerciseIds.split(',');
      const exercises = await Exercise.list();
      const selected = exercises.filter(ex => ids.includes(ex.id));
      setSelectedExercises(selected);
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Validate time feasibility after each change
    const numExercises = selectedExercises.length + (newSettings.includeWarmup ? 3 : 0);
    const totalSets = numExercises * newSettings.defaultSets[0];
    const workTime = totalSets * newSettings.defaultReps[0] * 2;
    const restTime = (totalSets - 1) * newSettings.restTime[0];
    const totalSeconds = workTime + restTime;
    const availableSeconds = selectedTime * 60;
    
    // If invalid, auto-adjust to make it valid
    if (totalSeconds > availableSeconds && key !== 'includeWarmup' && key !== 'useWeightVest' && key !== 'vestWeightLbs') {
      // Prioritize reducing rest time first
      if (key === 'defaultSets' || key === 'defaultReps') {
        const maxRest = Math.floor(
          (availableSeconds - numExercises * newSettings.defaultSets[0] * newSettings.defaultReps[0] * 2) /
          (numExercises * newSettings.defaultSets[0] - 1)
        );
        if (maxRest < newSettings.restTime[0] && maxRest >= 15) {
          newSettings.restTime = [Math.max(15, maxRest)];
        }
      }
    }
    
    setSettings(newSettings);
  };

  const selectExercisesByCategory = async (category) => {
    let filtered = [];
    if (category === 'upper') {
      filtered = allExercises.filter(ex => ex.category === 'upper_body');
    } else if (category === 'lower') {
      filtered = allExercises.filter(ex => ex.category === 'lower_body');
    } else if (category === 'mix') {
      filtered = allExercises.filter(ex => 
        ['upper_body', 'lower_body', 'core', 'full_body'].includes(ex.category)
      );
    }
    
    // Randomly select exercises based on time
    const numExercises = Math.min(Math.max(5, Math.floor(selectedTime / 5)), filtered.length);
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numExercises).map(ex => ({
      ...ex,
      superset_with_next: false
    }));
    
    setSelectedExercises(selected);
    setSelectedCategory(category);
  };

  const removeExercise = (index) => {
    const updated = selectedExercises.filter((_, i) => i !== index);
    setSelectedExercises(updated);
  };

  const swapExercise = (index, newExercise) => {
    const updated = [...selectedExercises];
    updated[index] = { ...newExercise, superset_with_next: updated[index].superset_with_next || false };
    setSelectedExercises(updated);
  };

  const toggleSuperset = (index) => {
    const updated = [...selectedExercises];
    updated[index] = {
      ...updated[index],
      superset_with_next: !updated[index].superset_with_next
    };
    setSelectedExercises(updated);
  };

  const canProceed = () => {
    if (currentStep === 1) return selectedTime !== null || isFreeTime;
    if (currentStep === 2) return selectedReps !== null || autoReps;
    if (currentStep === 3) return selectedCategory !== null;
    if (currentStep === 4) return true;
    return false;
  };

  const startWorkout = async () => {
    if (selectedExercises.length === 0) {
      toast.error('Please complete all steps');
      return;
    }

    let exercisesToUse = [...selectedExercises];
    
    if (settings.includeWarmup) {
      const warmupExercises = [
        { id: 'warmup-1', name: 'Arm Circles', category: 'warmup', metric: 'time', difficulty: 'beginner' },
        { id: 'warmup-2', name: 'Leg Swings', category: 'warmup', metric: 'time', difficulty: 'beginner' },
        { id: 'warmup-3', name: 'Torso Twists', category: 'warmup', metric: 'time', difficulty: 'beginner' }
      ];
      exercisesToUse = [...warmupExercises, ...exercisesToUse];
    }

    const workoutData = {
      name: `${selectedTime} Min ${selectedCategory?.toUpperCase()} Workout - ${new Date().toLocaleDateString()}`,
      exercises: exercisesToUse.map((ex, idx) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_reps: settings.defaultReps[0],
        target_time: ex.category === 'warmup' ? 30 : 0,
        completed_reps: 0,
        completed_time: 0,
        sets: ex.category === 'warmup' ? 1 : settings.defaultSets[0],
        superset_with_next: ex.superset_with_next || false
      })),
      workout_type: "rep_based",
      difficulty: "intermediate",
      weight_added_lbs: settings.useWeightVest ? settings.vestWeightLbs[0] : 0,
      rest_time: settings.restTime[0]
    };

    try {
      const workout = await Workout.create(workoutData);
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
    } catch (error) {
      console.error('Failed to start workout:', error);
      toast.error('Failed to start workout. Please try again.');
    }
  };

  const isPro = user?.subscription_status === 'pro';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Exercises"))}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Build Your Workout</h1>
              <p className="text-sm text-white/80">Step-by-step workout creation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-white' : 'text-gray-400'}`}>
                Time
              </span>
            </div>

            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 1 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-white' : 'text-gray-400'}`}>
                Reps
              </span>
            </div>

            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 2 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 3 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 3 ? <Check className="w-5 h-5" /> : '3'}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-white' : 'text-gray-400'}`}>
                Focus
              </span>
            </div>

            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 3 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 4 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                4
              </div>
              <span className={`text-sm font-medium ${currentStep >= 4 ? 'text-white' : 'text-gray-400'}`}>
                Customize
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Step 1: Select Time */}
        {currentStep === 1 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Timer className="w-6 h-6 text-brand-blue" />
                Step 1: Choose Workout Duration
              </CardTitle>
              <p className="text-gray-400">How much time do you have?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[15, 30, 45, 60].map(minutes => (
                  <button
                    key={minutes}
                    onClick={() => {
                      setSelectedTime(minutes);
                      setIsFreeTime(false);
                      setCustomTime("");
                    }}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedTime === minutes && !isFreeTime
                        ? 'bg-brand-blue/20 border-brand-blue text-white'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-brand-blue/50'
                    }`}
                  >
                    <Timer className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-3xl font-bold">{minutes}</div>
                    <div className="text-sm">MINUTES</div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Enter custom time (minutes)"
                    value={customTime}
                    onChange={(e) => {
                      setCustomTime(e.target.value);
                      if (e.target.value) {
                        setSelectedTime(parseInt(e.target.value));
                        setIsFreeTime(false);
                      }
                    }}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    onClick={() => {
                      if (customTime) {
                        setSelectedTime(parseInt(customTime));
                        setIsFreeTime(false);
                      }
                    }}
                    className="bg-brand-blue hover:bg-brand-blue/90"
                  >
                    Set
                  </Button>
                </div>

                <button
                  onClick={() => {
                    setIsFreeTime(true);
                    setSelectedTime(999);
                    setCustomTime("");
                  }}
                  className={`w-full p-6 rounded-xl border-2 transition-all ${
                    isFreeTime
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-purple-500/50'
                  }`}
                >
                  <div className="text-xl font-bold mb-2">⏱️ NO TIME LIMIT</div>
                  <div className="text-sm text-gray-400">Train at your own pace</div>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Reps */}
        {currentStep === 2 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Target className="w-6 h-6 text-brand-blue" />
                Step 2: Choose Rep Count
              </CardTitle>
              <p className="text-gray-400">Total reps for the entire workout</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => {
                  setAutoReps(true);
                  setSelectedReps(null);
                }}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                  autoReps
                    ? 'bg-brand-blue/20 border-brand-blue'
                    : 'bg-gray-800/50 border-gray-700 hover:border-brand-blue/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-white mb-1">✨ Choose For Me</div>
                    <div className="text-sm text-gray-400">AI will optimize reps based on your time</div>
                  </div>
                  {autoReps && <Check className="w-6 h-6 text-brand-blue" />}
                </div>
              </button>

              <div>
                <p className="text-white font-medium mb-3">Or select total reps:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[100, 150, 200, 250, 300].map(reps => (
                    <button
                      key={reps}
                      onClick={() => {
                        setSelectedReps(reps);
                        setAutoReps(false);
                        setCustomReps("");
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedReps === reps && !autoReps && !customReps
                          ? 'bg-brand-blue/20 border-brand-blue text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-brand-blue/50'
                      }`}
                    >
                      <div className="text-2xl font-bold">{reps}</div>
                      <div className="text-xs">REPS</div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Enter total reps (e.g., 150, 500)"
                    value={customReps}
                    onChange={(e) => {
                      setCustomReps(e.target.value);
                      if (e.target.value) {
                        setSelectedReps(parseInt(e.target.value));
                        setAutoReps(false);
                      }
                    }}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    onClick={() => {
                      if (customReps) {
                        setSelectedReps(parseInt(customReps));
                        setAutoReps(false);
                      }
                    }}
                    className="bg-brand-blue hover:bg-brand-blue/90"
                  >
                    Set
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Focus */}
        {currentStep === 3 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-brand-blue" />
                Step 2: Choose Workout Focus
              </CardTitle>
              <p className="text-gray-400">What area do you want to train?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => selectExercisesByCategory('upper')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    selectedCategory === 'upper'
                      ? 'bg-brand-blue/20 border-brand-blue'
                      : 'bg-gray-800/50 border-gray-700 hover:border-brand-blue/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-white mb-1">Upper Body</div>
                      <div className="text-sm text-gray-400">Chest, Back, Shoulders, Arms</div>
                    </div>
                    {selectedCategory === 'upper' && <Check className="w-6 h-6 text-brand-blue" />}
                  </div>
                </button>

                <button
                  onClick={() => selectExercisesByCategory('lower')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    selectedCategory === 'lower'
                      ? 'bg-brand-blue/20 border-brand-blue'
                      : 'bg-gray-800/50 border-gray-700 hover:border-brand-blue/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-white mb-1">Lower Body</div>
                      <div className="text-sm text-gray-400">Legs, Glutes, Calves</div>
                    </div>
                    {selectedCategory === 'lower' && <Check className="w-6 h-6 text-brand-blue" />}
                  </div>
                </button>

                <button
                  onClick={() => selectExercisesByCategory('mix')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    selectedCategory === 'mix'
                      ? 'bg-brand-blue/20 border-brand-blue'
                      : 'bg-gray-800/50 border-gray-700 hover:border-brand-blue/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-white mb-1">Full Body Mix</div>
                      <div className="text-sm text-gray-400">Balanced total body workout</div>
                    </div>
                    {selectedCategory === 'mix' && <Check className="w-6 h-6 text-brand-blue" />}
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Customize */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl">Workout Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Duration:</span>
                    <span className="font-bold text-white">{isFreeTime ? 'No Time Limit' : `${selectedTime} minutes`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated Time:</span>
                    <span className={`font-bold ${isTimeValid() ? 'text-green-400' : 'text-red-400'}`}>
                      {getEstimatedTime()} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Reps:</span>
                    <span className="font-bold text-white">{autoReps ? 'Auto-optimized' : `${selectedReps} reps`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Focus:</span>
                    <span className="font-bold text-white capitalize">{selectedCategory} body</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Exercises:</span>
                    <span className="font-bold text-white">{selectedExercises.length} exercises</span>
                  </div>
                </div>
                {!isTimeValid() && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      ⚠️ Workout exceeds time limit. Reduce sets, reps, or rest time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exercise List */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl">Exercise List</CardTitle>
                <p className="text-sm text-gray-400">Customize your workout exercises</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedExercises.map((exercise, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{exercise.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">{exercise.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const similar = allExercises.filter(ex => 
                              ex.category === exercise.category && ex.id !== exercise.id
                            );
                            if (similar.length > 0) {
                              const random = similar[Math.floor(Math.random() * similar.length)];
                              swapExercise(index, random);
                            }
                          }}
                          className="w-8 h-8 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                          title="Swap Exercise"
                        >
                          <RefreshCw className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => removeExercise(index)}
                          className="w-8 h-8 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                          title="Remove Exercise"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>

                    {index < selectedExercises.length - 1 && (
                      <button
                        onClick={() => toggleSuperset(index)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border-2 transition-all ${
                          exercise.superset_with_next
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">Superset with next</span>
                        </div>
                        {exercise.superset_with_next && <Check className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl">Fine-tune Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-white text-base">Sets per Exercise</Label>
                  <Slider
                    value={settings.defaultSets}
                    onValueChange={(value) => updateSetting('defaultSets', value)}
                    min={1}
                    max={Math.min(5, getConstraints().maxSets)}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold">{settings.defaultSets[0]} sets</div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white text-base">Reps per Set</Label>
                  <Slider
                    value={settings.defaultReps}
                    onValueChange={(value) => updateSetting('defaultReps', value)}
                    min={5}
                    max={Math.min(30, getConstraints().maxReps)}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold">{settings.defaultReps[0]} reps</div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white text-base">Rest Time (seconds)</Label>
                  <Slider
                    value={settings.restTime}
                    onValueChange={(value) => updateSetting('restTime', value)}
                    min={15}
                    max={Math.min(120, getConstraints().maxRest)}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold">{settings.restTime[0]} seconds</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div>
                    <Label className="text-white text-base font-medium">Include Warm-up</Label>
                    <p className="text-sm text-gray-400">3 dynamic warm-up exercises</p>
                  </div>
                  <Switch
                    checked={settings.includeWarmup}
                    onCheckedChange={(checked) => updateSetting('includeWarmup', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div>
                    <Label className="text-white text-base font-medium">Use Weight Vest</Label>
                    <p className="text-sm text-gray-400">Add extra resistance</p>
                  </div>
                  <Switch
                    checked={settings.useWeightVest}
                    onCheckedChange={(checked) => updateSetting('useWeightVest', checked)}
                  />
                </div>

                {settings.useWeightVest && (
                  <div className="space-y-3">
                    <Label className="text-white text-base">Vest Weight (LBS)</Label>
                    <Slider
                      value={settings.vestWeightLbs}
                      onValueChange={(value) => updateSetting('vestWeightLbs', value)}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-right text-white font-bold">{settings.vestWeightLbs[0]} LBS</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="container mx-auto max-w-3xl flex justify-between items-center">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed px-8"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={startWorkout}
              disabled={!canProceed() || !isTimeValid()}
              className="bg-gradient-to-r from-brand-blue to-blue-600 hover:opacity-90 text-white font-bold text-lg px-10 py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              START WORKOUT
            </Button>
          )}
        </div>
      </div>

      <style>
        {`
          /* Slider styling */
          [data-orientation="horizontal"].relative.h-2.w-full.grow.overflow-hidden.rounded-full {
            height: 10px !important;
            background-color: #374151 !important;
            border-radius: 9999px !important;
          }
          
          [data-orientation="horizontal"].absolute.h-full {
            background-color: #00a9ff !important;
            height: 10px !important;
            border-radius: 9999px !important;
          }
          
          [role="slider"].block.h-5.w-5.rounded-full {
            background-color: #00a9ff !important;
            border: 3px solid #ffffff !important;
            box-shadow: 0 0 10px rgba(0, 169, 255, 0.8) !important;
            width: 24px !important;
            height: 24px !important;
          }
          
          [data-state="checked"] {
            background-color: #00a9ff !important;
          }
        `}
      </style>
    </div>
  );
}