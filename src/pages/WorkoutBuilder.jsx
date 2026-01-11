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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  Target,
  Zap,
  GripVertical
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function WorkoutBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const [isFreeTime, setIsFreeTime] = useState(false);
  const [selectedReps, setSelectedReps] = useState(null);
  const [customReps, setCustomReps] = useState("");
  const [autoReps, setAutoReps] = useState(true);
  const [workoutLevel, setWorkoutLevel] = useState(null);
  const [allExercises, setAllExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [user, setUser] = useState(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
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
      await loadSelectedExercises();
      
      // Check if AI generated workout
      const urlParams = new URLSearchParams(window.location.search);
      const isAI = urlParams.get('ai') === 'true';
      if (isAI) {
        // Auto-configure from AI parameters
        const duration = parseInt(urlParams.get('duration')) || 30;
        const sets = parseInt(urlParams.get('sets')) || 3;
        const reps = parseInt(urlParams.get('reps')) || 15;
        
        setSelectedTime(duration);
        setIsFreeTime(false);
        setSelectedReps(null);
        setAutoReps(true);

        // Update settings
        setSettings(prev => ({
          ...prev,
          defaultSets: [sets],
          defaultReps: [reps],
          restTime: [duration <= 15 ? 20 : duration <= 30 ? 30 : 45]
        }));

        // Skip directly to step 2 (summary)
        setCurrentStep(2);
      }
    };
    initialize();
  }, []);

  // Recalculate settings when user manually sets total reps
  useEffect(() => {
    if (currentStep === 2 && !autoReps && selectedReps && selectedReps > 0 && selectedExercises.length > 0) {
      // User wants specific total reps - adjust reps per set to hit target
      const numExercises = selectedExercises.length;
      const totalSets = numExercises * settings.defaultSets[0];
      const calculatedReps = Math.ceil(selectedReps / totalSets);
      
      setSettings(prev => ({
        ...prev,
        defaultReps: [Math.max(5, Math.min(50, calculatedReps))]
      }));
    }
  }, [selectedReps, autoReps, currentStep, selectedExercises.length]);

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
    const numExercises = selectedExercises.length; // Warmup is time-based, don't count in rep calculations
    const availableSeconds = totalMinutes * 60;
    
    // Start with reasonable defaults
    let newSets = 3;
    let newReps = 15;
    let newRest = 30;
    
    if (autoReps) {
      // Auto-optimize based on time
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
      // User selected specific total reps - distribute across exercises and sets
      const targetTotalReps = selectedReps || 300;
      
      // Determine optimal sets based on time
      if (totalMinutes <= 15) {
        newSets = 2;
        newRest = 20;
      } else if (totalMinutes <= 30) {
        newSets = 3;
        newRest = 30;
      } else if (totalMinutes <= 45) {
        newSets = 4;
        newRest = 45;
      } else {
        newSets = 5;
        newRest = 60;
      }
      
      // Calculate reps per set to hit target total reps
      const totalSets = numExercises * newSets;
      newReps = Math.max(5, Math.round(targetTotalReps / totalSets));
      }

      // Validate the combination works within time constraint
      const totalSets = numExercises * newSets;
      const workTime = totalSets * newReps * 2;
      const restTime = (totalSets - 1) * newRest;
      const totalTime = workTime + restTime;

      // If still too long and user wants auto reps, reduce reps
      // If user explicitly chose reps, prioritize hitting their target
      if (totalTime > availableSeconds && !isFreeTime && autoReps) {
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

    // Calculate warmup time separately (time-based, not rep-based)
    const warmupTime = settings.includeWarmup ? 190 : 0; // ~3 minutes for warmup
    
    // Calculate workout time (only actual exercises)
    const totalSets = selectedExercises.length * settings.defaultSets[0];
    const workTime = totalSets * settings.defaultReps[0] * 2; // 2 sec per rep
    const restTime = (totalSets - 1) * settings.restTime[0];
    const totalSeconds = warmupTime + workTime + restTime;

    return Math.ceil(totalSeconds / 60); // Convert to minutes
  };

  const getEstimatedTotalReps = () => {
    if (!selectedExercises.length) return 0;
    // Only count actual workout exercises, NOT warmup (warmup is time-based)
    return selectedExercises.length * settings.defaultSets[0] * settings.defaultReps[0];
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
      const selected = exercises.filter(ex => ids.includes(ex.id)).map(ex => ({
        ...ex,
        superset_with_next: false
      }));
      setSelectedExercises(selected);
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Validate time feasibility after each change (warmup doesn't count for reps)
    const numExercises = selectedExercises.length;
    const warmupTime = newSettings.includeWarmup ? 190 : 0;
    const totalSets = numExercises * newSettings.defaultSets[0];
    const workTime = totalSets * newSettings.defaultReps[0] * 2;
    const restTime = (totalSets - 1) * newSettings.restTime[0];
    const totalSeconds = warmupTime + workTime + restTime;
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
      filtered = allExercises.filter(ex => ex.category === 'upper_body' && ex.metric !== 'time');
    } else if (category === 'lower') {
      filtered = allExercises.filter(ex => ex.category === 'lower_body' && ex.metric !== 'time');
    } else if (category === 'mix') {
      filtered = allExercises.filter(ex => 
        ['upper_body', 'lower_body', 'core', 'full_body'].includes(ex.category) && ex.metric !== 'time'
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

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedExercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSelectedExercises(items);
  };

  const canProceed = () => {
    if (currentStep === 1) return selectedExercises.length > 0 && (selectedTime !== null || isFreeTime);
    if (currentStep === 2) return selectedExercises.length > 0;
    return false;
  };

  const startWorkout = async () => {
    if (selectedExercises.length === 0) {
      toast.error('Please complete all steps');
      return;
    }

    // Validate all exercises have valid data
    const invalidExercises = selectedExercises.filter(ex => !ex.id || !ex.name);
    if (invalidExercises.length > 0) {
      toast.error('Some exercises are missing data. Please try regenerating your workout.');
      console.error('Invalid exercises:', invalidExercises);
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
      name: `${selectedTime} Min ${selectedCategory?.toUpperCase() || 'CUSTOM'} Workout - ${new Date().toLocaleDateString()}`,
      exercises: exercisesToUse.map((ex, idx) => ({
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
      difficulty: "intermediate",
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
      toast.success('Workout created!');
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
    } catch (error) {
      toast.dismiss();
      console.error('Failed to start workout:', error);
      toast.error(`Failed to create workout: ${error.message || 'Unknown error'}`);
    }
  };

  const isPro = user?.subscription_status === 'pro';

  const generateAIWorkout = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a workout description');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional fitness trainer. Generate a workout based on this request: "${aiPrompt}"
        
Return a JSON object with this exact structure:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "category": "upper_body|lower_body|core|full_body",
      "target_reps": 15,
      "sets": 3,
      "superset_with_next": false
    }
  ],
  "workout_type": "rep_based",
  "estimated_duration": 30,
  "difficulty": "beginner|intermediate|advanced"
}

Choose real exercises from this list: Push-ups, Squats, Lunges, Plank, Sit-ups, Burpees, Mountain Climbers, Jumping Jacks, Dips, Pull-ups, Tricep Dips, Leg Raises, Russian Twists, High Knees, Butt Kickers, Jump Squats, Wall Sits, Bicycle Crunches, Flutter Kicks, Crunches.

Make it realistic and achievable.`,
        response_json_schema: {
          type: "object",
          properties: {
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  target_reps: { type: "number" },
                  sets: { type: "number" },
                  superset_with_next: { type: "boolean" }
                }
              }
            },
            workout_type: { type: "string" },
            estimated_duration: { type: "number" },
            difficulty: { type: "string" }
          }
        }
      });

      // Find exercise IDs from database
      const exerciseNames = response.exercises.map(ex => ex.name);
      const dbExercises = await Exercise.list();
      
      const selectedExercises = response.exercises.map(aiEx => {
        const dbEx = dbExercises.find(ex => ex.name.toLowerCase() === aiEx.name.toLowerCase());
        
        if (!dbEx) {
          console.warn(`Exercise not found in database: ${aiEx.name}`);
        }
        
        return {
          ...dbEx,
          id: dbEx?.id,
          name: aiEx.name,
          category: aiEx.category,
          target_reps: aiEx.target_reps,
          sets: aiEx.sets,
          superset_with_next: aiEx.superset_with_next || false,
          metric: dbEx?.metric || 'reps'
        };
      }).filter(ex => ex.id); // Remove exercises without valid IDs

      if (selectedExercises.length === 0) {
        toast.error('No matching exercises found. Try a different description.');
        setIsGenerating(false);
        return;
      }

      setSelectedExercises(selectedExercises);
      setSelectedTime(response.estimated_duration || 30);
      setCurrentStep(2); // Skip to summary step
      setShowAIPrompt(false);
      toast.success(`AI workout generated with ${selectedExercises.length} exercises!`);
    } catch (error) {
      console.error('Failed to generate workout:', error);
      toast.error('Failed to generate workout. Please try again.');
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 sm:py-6">
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
              <h1 className="text-xl sm:text-2xl font-bold truncate">Build Your Workout</h1>
              <p className="text-xs sm:text-sm text-white/80">Step-by-step workout creation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-white' : 'text-gray-400'}`}>
                Configure
              </span>
            </div>

            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 1 ? 'bg-brand-blue' : 'bg-gray-700'}`} />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-brand-blue text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-white' : 'text-gray-400'}`}>
                Summary
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-64 md:pb-40 max-w-3xl">
        {/* AI Prompt Modal */}
        <AnimatePresence>
          {showAIPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAIPrompt(false)}
            >
              <Card className="bg-gray-900 border-gray-800 rounded-xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="text-white text-2xl flex items-center gap-2">
                    🧞 WorkoutGenie
                    <Badge className="ml-auto bg-yellow-400 text-black font-bold">PRO</Badge>
                  </CardTitle>
                  <p className="text-gray-400">Describe your workout - AI selects exercises from our database</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white mb-2">Describe your workout idea</Label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAIPrompt(e.target.value)}
                      placeholder="Example: 'Build me a workout for 18 minutes, low intensity and mix up body upper and lower workouts' or 'Intense 30 minute leg day focusing on squats and lunges'"
                      className="w-full h-32 bg-gray-800 border-gray-700 text-white rounded-lg p-3 resize-none"
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400 mb-2">💡 Tips for better workouts:</p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Mention time (e.g., "18 minutes", "quick 15 min")</li>
                      <li>• Specify intensity (e.g., "low", "moderate", "high intensity")</li>
                      <li>• Choose focus (e.g., "upper body", "legs", "full body mix")</li>
                      <li>• WorkoutGenie uses real exercises from our library</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={generateAIWorkout}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold hover:opacity-90"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          🧞 Make My Workout
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowAIPrompt(false)}
                      variant="outline"
                      className="bg-gray-800 border-gray-700"
                      disabled={isGenerating}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Configure Duration and Reps */}
        {currentStep === 1 && selectedExercises.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardContent className="p-12 text-center">
              <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Choose Your Exercises</h3>
              <p className="text-gray-400 mb-6">
                Select exercises from the Exercises page first, then return here to build your workout.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Exercises"))}
                className="gradient-bg text-white hover:opacity-90"
              >
                Go to Exercises
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && selectedExercises.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Timer className="w-6 h-6 text-brand-blue" />
                Step 1: Duration & Reps
              </CardTitle>
              <p className="text-gray-400">Set duration and rep targets for your {selectedExercises.length} exercises</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duration Selection */}
              <div>
                <Label className="text-white text-lg font-semibold mb-3 block">Workout Duration</Label>
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
                        const time = parseInt(e.target.value);
                        setSelectedTime(time);
                        setIsFreeTime(false);
                      }
                    }}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    onClick={() => {
                      if (customTime) {
                        const time = parseInt(customTime);
                        setSelectedTime(time);
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
              </div>

              {/* Rep Settings */}
              <div>
                <Label className="text-white text-lg font-semibold mb-3 block">Rep Count</Label>

              <button
                onClick={() => {
                  setAutoReps(true);
                  setSelectedReps(null);
                }}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left mb-4 ${
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
                <p className="text-white font-medium mb-3">Or manually set total reps:</p>
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
        )}

        {currentStep === 1 && selectedExercises.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center gap-2">
                <Timer className="w-6 h-6 text-brand-blue" />
                Step 1: Configure Your Workout
              </CardTitle>
              <p className="text-gray-400">Set duration and rep targets for your {selectedExercises.length} exercises</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duration Selection */}
              <div>
                <Label className="text-white text-lg font-semibold mb-3 block">Workout Duration</Label>
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
                        const time = parseInt(e.target.value);
                        setSelectedTime(time);
                        setIsFreeTime(false);
                      }
                    }}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    onClick={() => {
                      if (customTime) {
                        const time = parseInt(customTime);
                        setSelectedTime(time);
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
              </div>
              {/* Reps Only - No Level */}
              <div>
                <Label className="text-white text-lg font-semibold mb-3 block">Rep Settings</Label>

              <button
                onClick={() => {
                  setAutoReps(true);
                  setSelectedReps(null);
                }}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left mb-4 ${
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
                <p className="text-white font-medium mb-3">Or manually set total reps:</p>
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Summary */}
        {currentStep === 2 && selectedExercises.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 rounded-xl">
            <CardContent className="p-12 text-center">
              <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Exercises Selected</h3>
              <p className="text-gray-400 mb-6">
                Please select exercises from the Exercises page first, then build your workout here.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Exercises"))}
                className="gradient-bg text-white hover:opacity-90"
              >
                Go to Exercises
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && selectedExercises.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
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
                  {!autoReps && selectedReps && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Target Total Reps:</span>
                      <span className="font-bold text-purple-400">
                        {selectedReps} reps
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">{!autoReps && selectedReps ? 'Actual Total Reps:' : 'Estimated Total Reps:'}</span>
                    <span className={`font-bold ${!autoReps && selectedReps && getEstimatedTotalReps() !== selectedReps ? 'text-yellow-400' : 'text-brand-blue'}`}>
                      {getEstimatedTotalReps()} reps
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      ({selectedExercises.length} exercises × {settings.defaultSets[0]} sets × {settings.defaultReps[0]} reps)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Exercises:</span>
                    <span className="font-bold text-white">{selectedExercises.length} exercises</span>
                  </div>
                </div>
                {!isTimeValid() && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      ⚠️ Workout exceeds time limit by {getEstimatedTime() - selectedTime} minutes. {!autoReps && selectedReps ? 'Increase duration or reduce reps/sets.' : 'Reduce sets, reps, or rest time.'}
                    </p>
                  </div>
                )}
                {!autoReps && selectedReps && getEstimatedTotalReps() !== selectedReps && isTimeValid() && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      ℹ️ Your target of {selectedReps} reps will result in approximately {getEstimatedTotalReps()} reps based on your selected time and settings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exercise List with Drag & Drop */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl">Exercise List</CardTitle>
                <p className="text-sm text-gray-400">Drag to reorder, customize settings, and configure supersets</p>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="exercises">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {selectedExercises.map((exercise, index) => (
                          <Draggable key={`${exercise.id}-${index}`} draggableId={`${exercise.id}-${index}`} index={index}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                              >
                                <div className="flex items-start gap-3">
                                  <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div className="flex-1">
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

            <Card className="bg-gray-900 border-gray-800 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl">Fine-tune Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-white text-base">Sets per Exercise</Label>
                  <Slider
                    value={settings.defaultSets}
                    onValueChange={(value) => {
                      updateSetting('defaultSets', value);
                      // If manual reps target is set, recalculate reps per set
                      if (!autoReps && selectedReps && selectedReps > 0 && selectedExercises.length > 0) {
                        const totalSets = selectedExercises.length * value[0];
                        const calculatedReps = Math.ceil(selectedReps / totalSets);
                        updateSetting('defaultReps', [Math.max(5, Math.min(50, calculatedReps))]);
                      }
                    }}
                    min={1}
                    max={5}
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
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-right text-white font-bold">{settings.defaultReps[0]} reps</div>
                  {!autoReps && selectedReps && (
                    <p className="text-xs text-gray-400">
                      Adjust to hit your target of {selectedReps} reps
                    </p>
                  )}
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
          </motion.div>
        )}
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="h-64 md:h-32"></div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-gray-900/95 border-t-2 border-brand-blue/30 p-6 shadow-2xl z-50">
        <div className="container mx-auto max-w-3xl">
          <div className="flex justify-between items-center gap-4">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 rounded-lg px-6 py-6 text-base"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 2 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-12 py-6 text-lg font-bold shadow-lg"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={startWorkout}
                disabled={!canProceed() || !isTimeValid()}
                className="bg-gradient-to-r from-brand-blue to-blue-600 hover:opacity-90 text-white font-bold text-base md:text-xl px-6 md:px-12 py-4 md:py-7 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl flex-1 max-w-md mx-auto"
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                START WORKOUT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Placeholder/Graphic */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black md:hidden z-40 flex items-center justify-center">
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