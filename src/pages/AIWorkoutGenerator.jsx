import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Workout } from "@/entities/Workout";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Play,
  Timer,
  ChevronRight,
  Check,
  Target,
  Zap,
  TrendingUp,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  GripVertical
} from "lucide-react";
import { motion } from "framer-motion";

export default function AIWorkoutGenerator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [workoutLevel, setWorkoutLevel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const [isFreeTime, setIsFreeTime] = useState(false);
  const [selectedReps, setSelectedReps] = useState(null);
  const [customReps, setCustomReps] = useState("");
  const [autoReps, setAutoReps] = useState(true);
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
        
        if (currentUser.subscription_status !== 'pro') {
          toast.error('AI Workout Generator is a PRO feature');
          navigate(createPageUrl("Pricing"));
          return;
        }
      } catch (error) {
        navigate(createPageUrl("Pricing"));
        return;
      }
      
      const exercises = await Exercise.list();
      setAllExercises(exercises);
    };
    initialize();
  }, []);

  const selectExercisesByCategory = async () => {
    if (!selectedCategory || !selectedTime || !workoutLevel) return;

    let filtered = [];
    if (selectedCategory === 'upper') {
      filtered = allExercises.filter(ex => ex.category === 'upper_body' && ex.metric !== 'time');
    } else if (selectedCategory === 'lower') {
      filtered = allExercises.filter(ex => ex.category === 'lower_body' && ex.metric !== 'time');
    } else if (selectedCategory === 'mix') {
      filtered = allExercises.filter(ex => 
        ['upper_body', 'lower_body', 'core', 'full_body'].includes(ex.category) && ex.metric !== 'time'
      );
    }

    // Filter by difficulty level
    if (workoutLevel === 'beginner') {
      filtered = filtered.filter(ex => ex.difficulty === 'beginner' || ex.difficulty === 'intermediate');
    } else if (workoutLevel === 'intermediate') {
      filtered = filtered.filter(ex => ex.difficulty !== 'advanced');
    }

    // Determine number of exercises based on time
    const numExercises = Math.min(Math.max(5, Math.floor(selectedTime / 5)), filtered.length);
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numExercises).map(ex => ({
      ...ex,
      superset_with_next: false
    }));
    
    setSelectedExercises(selected);
  };

  useEffect(() => {
    if (currentStep === 3 && selectedExercises.length > 0) {
      // Calculate and set settings when reaching step 3
      const totalMinutes = isFreeTime ? 999 : selectedTime;
      const numExercises = selectedExercises.length;
      
      let sets = 3;
      let reps = 15;
      let rest = 30;
      
      // Level-based adjustments
      if (workoutLevel === 'beginner') {
        sets = 2;
        reps = 10;
        rest = 45;
      } else if (workoutLevel === 'intermediate') {
        sets = 3;
        reps = 15;
        rest = 30;
      } else if (workoutLevel === 'advanced') {
        sets = 4;
        reps = 20;
        rest = 20;
      }

      // Time-based adjustments
      if (totalMinutes <= 15) {
        sets = Math.max(1, sets - 1);
        rest = 20;
      } else if (totalMinutes >= 45) {
        sets = Math.min(5, sets + 1);
      }

      // If user selected specific reps, calculate to hit target
      if (!autoReps && selectedReps) {
        const totalSets = numExercises * sets;
        reps = Math.max(5, Math.round(selectedReps / totalSets));
      }

      setSettings({
        defaultSets: [sets],
        defaultReps: [reps],
        restTime: [rest],
        includeWarmup: true,
        useWeightVest: false,
        vestWeightLbs: [10]
      });
    }
  }, [currentStep, selectedExercises, workoutLevel, selectedTime, isFreeTime, autoReps, selectedReps]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedExercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSelectedExercises(items);
  };

  const canProceed = () => {
    if (currentStep === 1) return workoutLevel !== null;
    if (currentStep === 2) return selectedCategory !== null && (selectedTime !== null || isFreeTime);
    if (currentStep === 3) return selectedExercises.length > 0;
    return false;
  };

  const proceedToNextStep = () => {
    if (currentStep === 2) {
      // Generate exercises before moving to step 3
      selectExercisesByCategory();
    }
    setCurrentStep(currentStep + 1);
  };

  const startWorkout = async () => {
    if (selectedExercises.length === 0) {
      toast.error('No exercises selected');
      return;
    }

    let exercisesToUse = [...selectedExercises];
    
    if (settings.includeWarmup) {
      const warmupExercises = [
        { id: 'warmup-1', name: 'Walk in Place', category: 'warmup', metric: 'time', difficulty: 'beginner', target_time: 60 },
        { id: 'warmup-2', name: 'Toe Touches', category: 'warmup', metric: 'time', difficulty: 'beginner', target_time: 20 },
        { id: 'warmup-3', name: 'Arm Circles Forward', category: 'warmup', metric: 'time', difficulty: 'beginner', target_time: 15 },
        { id: 'warmup-4', name: 'Hip Circles', category: 'warmup', metric: 'time', difficulty: 'beginner', target_time: 20 },
        { id: 'warmup-5', name: 'Chest Opener Stretch', category: 'warmup', metric: 'time', difficulty: 'beginner', target_time: 15 }
      ];
      exercisesToUse = [...warmupExercises, ...exercisesToUse];
    }

    const workoutData = {
      name: `AI ${workoutLevel.toUpperCase()} ${selectedCategory?.toUpperCase()} Workout - ${new Date().toLocaleDateString()}`,
      exercises: exercisesToUse.map((ex) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_reps: ex.metric === 'time' ? 0 : settings.defaultReps[0],
        target_time: ex.target_time || 0,
        completed_reps: 0,
        completed_time: 0,
        sets: ex.category === 'warmup' ? 1 : settings.defaultSets[0],
        superset_with_next: ex.superset_with_next || false,
        category: ex.category || 'full_body',
        metric: ex.metric || 'reps'
      })),
      workout_type: "rep_based",
      difficulty: workoutLevel,
      weight_added_lbs: settings.useWeightVest ? settings.vestWeightLbs[0] : 0,
      rest_time: settings.restTime[0]
    };

    try {
      toast.loading('Creating workout...');
      const workout = await Workout.create(workoutData);
      
      if (!workout || !workout.id) {
        throw new Error('Workout created but no ID returned');
      }
      
      toast.dismiss();
      toast.success('AI Workout created!');
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
    } catch (error) {
      toast.dismiss();
      console.error('Failed to start workout:', error);
      toast.error(`Failed to create workout: ${error.message || 'Unknown error'}`);
    }
  };

  const getEstimatedTime = () => {
    if (!selectedExercises.length) return 0;
    const warmupTime = settings.includeWarmup ? 190 : 0;
    const totalSets = selectedExercises.length * settings.defaultSets[0];
    const workTime = totalSets * settings.defaultReps[0] * 2; // 2 sec per rep
    const restTime = (totalSets - 1) * settings.restTime[0];
    return Math.ceil((warmupTime + workTime + restTime) / 60);
  };

  const getEstimatedTotalReps = () => {
    if (!selectedExercises.length) return 0;
    return selectedExercises.length * settings.defaultSets[0] * settings.defaultReps[0];
  };

  const isTimeValid = () => {
    if (isFreeTime) return true;
    const estimated = getEstimatedTime();
    return estimated <= selectedTime;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 text-white py-4 sm:py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Exercises"))}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-lg flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate flex items-center gap-2">
                🧞 AI Workout Generator
              </h1>
              <p className="text-xs sm:text-sm text-white/80">Smart workout creation in 3 steps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= 1 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '1'}
              </div>
              <span className={`text-xs sm:text-sm font-medium ${currentStep >= 1 ? 'text-white' : 'text-gray-400'}`}>
                Level
              </span>
            </div>

            <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${currentStep > 1 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= 2 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 2 ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '2'}
              </div>
              <span className={`text-xs sm:text-sm font-medium ${currentStep >= 2 ? 'text-white' : 'text-gray-400'}`}>
                Setup
              </span>
            </div>

            <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${currentStep > 2 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                currentStep >= 3 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                3
              </div>
              <span className={`text-xs sm:text-sm font-medium ${currentStep >= 3 ? 'text-white' : 'text-gray-400'}`}>
                Confirm
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-32 sm:pb-40 max-w-4xl">
        {/* Step 1: Choose Level */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
                  Step 1: Choose Your Level
                </CardTitle>
                <p className="text-sm sm:text-base text-gray-400">Select your fitness level</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  onClick={() => setWorkoutLevel('beginner')}
                  className={`w-full p-6 sm:p-8 rounded-xl border-2 transition-all text-left ${
                    workoutLevel === 'beginner'
                      ? 'bg-green-600/20 border-green-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold mb-2">🌱 Beginner</div>
                      <div className="text-sm sm:text-base text-gray-400">New to fitness or just starting out</div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Lower intensity, fewer sets</div>
                    </div>
                    {workoutLevel === 'beginner' && <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />}
                  </div>
                </button>

                <button
                  onClick={() => setWorkoutLevel('intermediate')}
                  className={`w-full p-6 sm:p-8 rounded-xl border-2 transition-all text-left ${
                    workoutLevel === 'intermediate'
                      ? 'bg-yellow-600/20 border-yellow-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-yellow-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold mb-2">💪 Intermediate</div>
                      <div className="text-sm sm:text-base text-gray-400">Regular training, good form</div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">Moderate intensity, balanced sets</div>
                    </div>
                    {workoutLevel === 'intermediate' && <Check className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />}
                  </div>
                </button>

                <button
                  onClick={() => setWorkoutLevel('advanced')}
                  className={`w-full p-6 sm:p-8 rounded-xl border-2 transition-all text-left ${
                    workoutLevel === 'advanced'
                      ? 'bg-red-600/20 border-red-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold mb-2">🔥 Advanced</div>
                      <div className="text-sm sm:text-base text-gray-400">Experienced athlete, high endurance</div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">High intensity, maximum sets</div>
                    </div>
                    {workoutLevel === 'advanced' && <Check className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />}
                  </div>
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Body Parts + Time + Reps */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4 sm:space-y-6"
          >
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
                  Step 2: Workout Setup
                </CardTitle>
                <p className="text-sm sm:text-base text-gray-400">Choose body focus, duration, and rep targets</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Body Focus */}
                <div>
                  <Label className="text-white text-base sm:text-lg font-semibold mb-3 block">Body Focus</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedCategory('upper')}
                      className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                        selectedCategory === 'upper'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="text-3xl sm:text-4xl mb-2">💪</div>
                      <div className="font-bold text-sm sm:text-base">UPPER BODY</div>
                      <div className="text-xs text-gray-400 mt-1">Chest, Arms, Back</div>
                    </button>

                    <button
                      onClick={() => setSelectedCategory('lower')}
                      className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                        selectedCategory === 'lower'
                          ? 'bg-green-600/20 border-green-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-green-500/50'
                      }`}
                    >
                      <div className="text-3xl sm:text-4xl mb-2">🦵</div>
                      <div className="font-bold text-sm sm:text-base">LOWER BODY</div>
                      <div className="text-xs text-gray-400 mt-1">Legs, Glutes, Calves</div>
                    </button>

                    <button
                      onClick={() => setSelectedCategory('mix')}
                      className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                        selectedCategory === 'mix'
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="text-3xl sm:text-4xl mb-2">🔥</div>
                      <div className="font-bold text-sm sm:text-base">MIXED</div>
                      <div className="text-xs text-gray-400 mt-1">Full Body Balance</div>
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-white text-base sm:text-lg font-semibold mb-3 block">Workout Duration</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    {[15, 30, 45, 60].map(minutes => (
                      <button
                        key={minutes}
                        onClick={() => {
                          setSelectedTime(minutes);
                          setIsFreeTime(false);
                          setCustomTime("");
                        }}
                        className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                          selectedTime === minutes && !isFreeTime
                            ? 'bg-brand-blue/20 border-brand-blue text-white'
                            : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-brand-blue/50'
                        }`}
                      >
                        <Timer className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                        <div className="text-2xl sm:text-3xl font-bold">{minutes}</div>
                        <div className="text-xs sm:text-sm">MINUTES</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="Custom time (minutes)"
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
                      className={`w-full p-4 sm:p-6 rounded-xl border-2 transition-all ${
                        isFreeTime
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="text-lg sm:text-xl font-bold mb-2">⏱️ NO TIME LIMIT</div>
                      <div className="text-xs sm:text-sm text-gray-400">Train at your own pace</div>
                    </button>
                  </div>
                </div>

                {/* Rep Count */}
                <div>
                  <Label className="text-white text-base sm:text-lg font-semibold mb-3 block">Rep Count</Label>

                  <button
                    onClick={() => {
                      setAutoReps(true);
                      setSelectedReps(null);
                    }}
                    className={`w-full p-4 sm:p-6 rounded-xl border-2 transition-all text-left mb-4 ${
                      autoReps
                        ? 'bg-brand-blue/20 border-brand-blue'
                        : 'bg-gray-800/50 border-gray-700 hover:border-brand-blue/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg sm:text-xl font-bold text-white mb-1">✨ Choose For Me</div>
                        <div className="text-xs sm:text-sm text-gray-400">AI optimizes reps based on level & time</div>
                      </div>
                      {autoReps && <Check className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />}
                    </div>
                  </button>

                  <div>
                    <p className="text-white font-medium mb-3 text-sm sm:text-base">Or manually set total reps:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                      {[100, 150, 200, 250, 300].map(reps => (
                        <button
                          key={reps}
                          onClick={() => {
                            setSelectedReps(reps);
                            setAutoReps(false);
                            setCustomReps("");
                          }}
                          className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            selectedReps === reps && !autoReps && !customReps
                              ? 'bg-brand-blue/20 border-brand-blue text-white'
                              : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-brand-blue/50'
                          }`}
                        >
                          <div className="text-xl sm:text-2xl font-bold">{reps}</div>
                          <div className="text-xs">REPS</div>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="Custom total reps"
                        value={customReps}
                        onChange={(e) => {
                          setCustomReps(e.target.value);
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
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Confirm & Customize */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
                  Workout Summary
                </CardTitle>
                <p className="text-sm sm:text-base text-gray-400">Review your AI-generated workout</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm sm:text-base">
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">Level:</span>
                    <span className="font-bold text-white capitalize">{workoutLevel}</span>
                  </div>
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">Body Focus:</span>
                    <span className="font-bold text-white capitalize">{selectedCategory} body</span>
                  </div>
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">Target Duration:</span>
                    <span className="font-bold text-brand-blue">{isFreeTime ? 'No Limit' : `${selectedTime} min`}</span>
                  </div>
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">Estimated Time:</span>
                    <span className={`font-bold ${isTimeValid() ? 'text-green-400' : 'text-red-400'}`}>
                      {getEstimatedTime()} min
                    </span>
                  </div>
                  {!autoReps && selectedReps && (
                    <div className="flex justify-between p-2 sm:p-3">
                      <span className="text-gray-400">Target Total Reps:</span>
                      <span className="font-bold text-purple-400">{selectedReps} reps</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">{!autoReps && selectedReps ? 'Actual Total Reps:' : 'Estimated Total Reps:'}</span>
                    <span className="font-bold text-brand-blue">{getEstimatedTotalReps()} reps</span>
                  </div>
                  <div className="flex justify-between p-2 sm:p-3 text-xs">
                    <span className="text-gray-500">
                      ({selectedExercises.length} exercises × {settings.defaultSets[0]} sets × {settings.defaultReps[0]} reps)
                    </span>
                  </div>
                  <div className="flex justify-between p-2 sm:p-3">
                    <span className="text-gray-400">Exercises:</span>
                    <span className="font-bold text-white">{selectedExercises.length} exercises</span>
                  </div>
                </div>
                {!isTimeValid() && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-xs sm:text-sm">
                      ⚠️ Workout exceeds time limit. Reduce sets/reps in settings below.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exercise List with Drag & Drop */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg sm:text-xl">Exercise List</CardTitle>
                <p className="text-xs sm:text-sm text-gray-400">Drag to reorder, swap, or configure supersets</p>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="exercises">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 sm:space-y-3">
                        {selectedExercises.map((exercise, index) => (
                          <Draggable key={`${exercise.id}-${index}`} draggableId={`${exercise.id}-${index}`} index={index}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700"
                              >
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-semibold text-sm sm:text-base truncate">{exercise.name}</h4>
                                        <p className="text-xs text-gray-400 mt-1">{exercise.category}</p>
                                      </div>
                                      <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-2">
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
                                          className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600/50 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                                          title="Swap Exercise"
                                        >
                                          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                        </button>
                                        <button
                                          onClick={() => removeExercise(index)}
                                          className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600/50 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                                          title="Remove Exercise"
                                        >
                                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
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
                                          <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                          <span className="text-xs sm:text-sm font-medium">Superset with next</span>
                                        </div>
                                        {exercise.superset_with_next && <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>

            {/* Fine-tune Settings */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg sm:text-xl">Fine-tune Settings</CardTitle>
                <p className="text-xs sm:text-sm text-gray-400">Adjust workout parameters</p>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-3">
                  <Label className="text-white text-sm sm:text-base">Sets per Exercise</Label>
                  <Slider
                    value={settings.defaultSets}
                    onValueChange={(value) => updateSetting('defaultSets', value)}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold text-sm sm:text-base">{settings.defaultSets[0]} sets</div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white text-sm sm:text-base">Reps per Set</Label>
                  <Slider
                    value={settings.defaultReps}
                    onValueChange={(value) => updateSetting('defaultReps', value)}
                    min={5}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold text-sm sm:text-base">{settings.defaultReps[0]} reps</div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white text-sm sm:text-base">Rest Time (seconds)</Label>
                  <Slider
                    value={settings.restTime}
                    onValueChange={(value) => updateSetting('restTime', value)}
                    min={15}
                    max={120}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold text-sm sm:text-base">{settings.restTime[0]} seconds</div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div>
                    <Label className="text-white text-sm sm:text-base font-medium">Include Warm-up</Label>
                    <p className="text-xs sm:text-sm text-gray-400">5 dynamic warm-up exercises</p>
                  </div>
                  <Switch
                    checked={settings.includeWarmup}
                    onCheckedChange={(checked) => updateSetting('includeWarmup', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div>
                    <Label className="text-white text-sm sm:text-base font-medium">Use Weight Vest</Label>
                    <p className="text-xs sm:text-sm text-gray-400">Add extra resistance</p>
                  </div>
                  <Switch
                    checked={settings.useWeightVest}
                    onCheckedChange={(checked) => updateSetting('useWeightVest', checked)}
                  />
                </div>

                {settings.useWeightVest && (
                  <div className="space-y-3">
                    <Label className="text-white text-sm sm:text-base">Vest Weight (LBS)</Label>
                    <Slider
                      value={settings.vestWeightLbs}
                      onValueChange={(value) => updateSetting('vestWeightLbs', value)}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-right text-white font-bold text-sm sm:text-base">{settings.vestWeightLbs[0]} LBS</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-gray-900/95 border-t-2 border-brand-blue/30 p-4 sm:p-6 shadow-2xl z-50">
        <div className="container mx-auto max-w-3xl">
          <div className="flex justify-between items-center gap-3 sm:gap-4">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 rounded-lg px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <Button
                onClick={proceedToNextStep}
                disabled={!canProceed()}
                className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg font-bold shadow-lg flex-1 max-w-xs"
              >
                Next
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={startWorkout}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-brand-blue to-blue-600 hover:opacity-90 text-white font-bold text-base sm:text-lg md:text-xl px-6 sm:px-10 md:px-16 py-4 sm:py-6 md:py-7 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl flex-1 max-w-md mx-auto"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                START WORKOUT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black sm:hidden z-40 flex items-center justify-center">
        <div className="text-gray-800 text-xs">RepsAndSteps</div>
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