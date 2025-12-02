
import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Workout } from "@/entities/Workout";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // New import for the save dialog
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from 'sonner'; // New import for toast notifications
import {
  ArrowLeft,
  Play,
  Timer,
  Repeat,
  Shuffle,
  Target,
  Clock,
  Zap,
  Star,
  Link2,
  Upload // New icon import for save functionality
} from "lucide-react";

export default function WorkoutBuilder() {
  const navigate = useNavigate();
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [workoutType, setWorkoutType] = useState("rep_based");
  const [workoutName, setWorkoutName] = useState("");
  const [user, setUser] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false); // New state for showing save dialog
  const [saveWorkoutName, setSaveWorkoutName] = useState(""); // New state for saved workout name
  const [saveWorkoutDescription, setSaveWorkoutDescription] = useState(""); // New state for saved workout description
  const [settings, setSettings] = useState({
    defaultReps: [15],
    defaultSets: [3],
    defaultTime: [30], // New setting for time-based exercises
    restTime: [30],
    workoutDuration: [20],
    randomizeOrder: false,
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

      loadSelectedExercises();
    };

    initialize();
  }, []);

  const loadSelectedExercises = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const exerciseIds = urlParams.get('exercises');

    if (exerciseIds) {
      const ids = exerciseIds.split(',');
      const exercises = await Exercise.list();
      const selected = exercises.filter(ex => ids.includes(ex.id));
      const selectedWithData = selected.map(ex => ({
        ...ex,
        superset_with_next: false
      }));
      setSelectedExercises(selectedWithData);
      setWorkoutName(`Custom Workout - ${new Date().toLocaleDateString()}`);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSuperset = (index) => {
    const newExercises = [...selectedExercises];
    if (index < newExercises.length - 1) {
      newExercises[index].superset_with_next = !newExercises[index].superset_with_next;
      setSelectedExercises(newExercises);
    }
  };

  const saveWorkoutTemplate = async () => {
    if (!saveWorkoutName.trim()) {
      toast.error('Please enter a workout name.');
      return;
    }
    if (selectedExercises.length === 0) {
      toast.error('Please select at least one exercise to save a workout template.');
      return;
    }

    try {
      const { SavedWorkout } = await import('@/entities/SavedWorkout'); // Dynamic import
      await SavedWorkout.create({
        name: saveWorkoutName,
        description: saveWorkoutDescription,
        exercises: selectedExercises.map(ex => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          // Set target reps or time based on exercise metric
          target_reps: ex.metric === 'reps' ? settings.defaultReps[0] : 0,
          target_time: ex.metric === 'time' ? settings.defaultTime[0] : 0,
          sets: settings.defaultSets[0],
          superset_with_next: ex.superset_with_next
        })),
        workout_type: workoutType,
        difficulty: "intermediate", // This could be dynamically calculated if needed
        estimated_duration: settings.workoutDuration[0], // Store for template, useful for filtering/display
        is_public: false // Default to private for user-saved templates
      });

      toast.success('Workout saved successfully!');
      setShowSaveDialog(false);
      setSaveWorkoutName("");
      setSaveWorkoutDescription("");
    } catch (error) {
      console.error('Failed to save workout template:', error);
      toast.error('Failed to save workout. Please try again.');
    }
  };

  const startWorkout = async () => {
    if (selectedExercises.length === 0) {
      toast.error('Please select exercises before starting a workout.');
      return;
    }

    const workoutData = {
      name: workoutName || `Workout - ${new Date().toLocaleDateString()}`, // Use generated name if not set
      exercises: selectedExercises.map(ex => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        // Set target reps or time based on exercise metric
        target_reps: ex.metric === 'reps' ? settings.defaultReps[0] : 0,
        target_time: ex.metric === 'time' ? settings.defaultTime[0] : 0,
        completed_reps: 0,
        completed_time: 0,
        sets: settings.defaultSets[0],
        superset_with_next: ex.superset_with_next
      })),
      workout_type: workoutType,
      difficulty: "intermediate", // This could be dynamically calculated
      weight_added_lbs: settings.useWeightVest ? settings.vestWeightLbs[0] : 0
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
      <style>
        {`
          /* Custom styling for shadcn/ui Slider components */
          .workout-builder-slider > span[data-state="idle"].relative.h-2.w-full.grow.overflow-hidden.rounded-full {
            height: 8px !important;
            background-color: #374151 !important; /* Unfilled track background */
            border-radius: 9999px !important;
          }
          
          .workout-builder-slider > span[data-state="idle"].relative.h-2.w-full.grow.overflow-hidden.rounded-full > span[data-orientation="horizontal"].absolute.h-full {
            background-color: #00a9ff !important; /* Filled range (the blue progress bar) */
            border-radius: 9999px !important;
            height: 8px !important;
          }
          
          .workout-builder-slider > span[role="slider"].block.h-5.w-5.rounded-full {
            background-color: #00a9ff !important;
            border: 2px solid #ffffff !important;
            box-shadow: 0 2px 8px rgba(0, 169, 255, 0.5) !important;
            width: 20px !important;
            height: 20px !important;
          }
        `}
      </style>
      
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Exercises"))}
              className="bg-white text-black border-2 border-white hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Build Your Workout</h1>
              <p className="text-lg text-white/90">Customize your training session</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Workout Name */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="workoutName">Workout Name</Label>
                <Input
                  id="workoutName"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Enter workout name..."
                  className="text-lg bg-background border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Exercises */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Selected Exercises ({selectedExercises.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedExercises.length > 0 ? (
                <div className="space-y-1">
                  {selectedExercises.map((exercise, index) => (
                    <div key={exercise.id}>
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-gray-700 text-brand-blue rounded-full flex items-center justify-center font-semibold">
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="font-semibold">{exercise.name}</h4>
                            <p className="text-sm text-gray-400 capitalize">{exercise.category?.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-brand-blue/50 text-brand-blue capitalize">
                            {exercise.difficulty}
                          </Badge>
                          {index < selectedExercises.length - 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleSuperset(index)}
                                    className={exercise.superset_with_next ? "text-brand-blue" : "text-gray-500 hover:text-brand-blue"}
                                  >
                                    <Link2 className="w-5 h-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{exercise.superset_with_next ? "Superset enabled. Click to unlink." : "Link with next exercise for a superset."}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      {exercise.superset_with_next && (
                        <div className="flex justify-center items-center h-6">
                          <Link2 className="w-5 h-5 text-brand-blue animate-pulse" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No exercises selected</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Exercises"))}
                    className="mt-4 bg-background border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
                  >
                    Select Exercises
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workout Type & Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Workout Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <Tabs defaultValue="rep_based" onValueChange={setWorkoutType}>
                  <TabsList className="grid w-full grid-cols-3 bg-background border border-border">
                    <TabsTrigger
                      value="rep_based"
                      className="flex items-center gap-2 data-[state=active]:bg-brand-blue data-[state=active]:text-white text-foreground border border-transparent data-[state=active]:border-brand-blue"
                    >
                      <Target className="w-4 h-4" />
                      Rep Based
                    </TabsTrigger>
                    <TabsTrigger
                      value="time_based"
                      className="flex items-center gap-2 data-[state=active]:bg-brand-blue data-[state=active]:text-white text-foreground border border-transparent data-[state=active]:border-brand-blue"
                    >
                      <Clock className="w-4 h-4" />
                      Time Based
                    </TabsTrigger>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value="random"
                          disabled={!isPro}
                          className="flex items-center gap-2 data-[state=active]:bg-brand-blue data-[state=active]:text-white text-foreground border border-transparent data-[state=active]:border-brand-blue disabled:opacity-50"
                        >
                          <Shuffle className="w-4 h-4" />
                          Random
                          {!isPro && <Badge variant="destructive" className="ml-2 bg-yellow-400 text-black">PRO</Badge>}
                        </TabsTrigger>
                      </TooltipTrigger>
                      {!isPro && (
                        <TooltipContent>
                          <p>Upgrade to Pro to unlock AI-powered random workouts!</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TabsList>

                  <div className="mt-6 space-y-6">
                     <div className="space-y-2">
                      <Label className="text-foreground">Default Sets per Exercise</Label>
                      <Slider
                        value={settings.defaultSets}
                        onValueChange={(value) => updateSetting('defaultSets', value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full workout-builder-slider"
                      />
                      <div className="text-sm text-gray-400 text-right">{settings.defaultSets[0]} sets</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Default Reps (for rep-based exercises)</Label>
                      <Slider
                        value={settings.defaultReps}
                        onValueChange={(value) => updateSetting('defaultReps', value)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full workout-builder-slider"
                      />
                      <div className="text-sm text-gray-400 text-right">{settings.defaultReps[0]} reps</div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Default Time (for time-based exercises)</Label>
                      <Slider
                        value={settings.defaultTime}
                        onValueChange={(value) => updateSetting('defaultTime', value)}
                        min={10}
                        max={300}
                        step={5}
                        className="w-full workout-builder-slider"
                      />
                      <div className="text-sm text-gray-400 text-right">{settings.defaultTime[0]} seconds</div>
                    </div>
                  </div>

                  <TabsContent value="time_based" className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-foreground">Total Workout Duration (minutes)</Label>
                      <Slider
                        value={settings.workoutDuration}
                        onValueChange={(value) => updateSetting('workoutDuration', value)}
                        min={5}
                        max={90}
                        step={5}
                        className="w-full workout-builder-slider"
                      />
                      <div className="text-sm text-gray-400 text-right">{settings.workoutDuration[0]} minutes</div>
                    </div>
                    <p className="text-xs text-gray-500">For 'Time Based' workouts, the app will automatically divide the total duration among the selected exercises.</p>
                  </TabsContent>

                  <TabsContent value="random" className="mt-6">
                    {isPro ? (
                      <div className="bg-brand-blue/10 p-6 rounded-lg border border-brand-blue/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-5 h-5 text-brand-blue" />
                          <h4 className="font-semibold text-white">Surprise Workout!</h4>
                        </div>
                        <p className="text-gray-300">
                          Let our AI create a dynamic workout using your selected exercises.
                          Each session will be unique with randomized rep counts, timing, and order.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center bg-gray-800 p-8 rounded-lg">
                        <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">Unlock AI Randomizer</h3>
                        <p className="text-gray-400 mb-6">Upgrade to Pro for unique, AI-generated workouts every time.</p>
                        <Button
                          onClick={() => navigate(createPageUrl("Pricing"))}
                          className="gradient-bg text-white hover:opacity-90"
                        >
                          Upgrade to Pro
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Workout Modifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground">Rest Time Between Sets/Exercises (seconds)</Label>
                <Slider
                  value={settings.restTime}
                  onValueChange={(value) => updateSetting('restTime', value)}
                  min={10}
                  max={180}
                  step={5}
                  className="w-full workout-builder-slider"
                />
                <div className="text-sm text-gray-400 text-right">{settings.restTime[0]} seconds</div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="text-base font-medium text-foreground">Randomize Exercise Order</Label>
                  <p className="text-sm text-gray-500">Shuffle exercises for variety</p>
                </div>
                <Switch
                  checked={settings.randomizeOrder}
                  onCheckedChange={(checked) => updateSetting('randomizeOrder', checked)}
                  className="data-[state=checked]:bg-brand-blue"
                />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="text-base font-medium text-foreground">Include Warm-up</Label>
                  <p className="text-sm text-gray-500">Start with light dynamic movements</p>
                </div>
                <Switch
                  checked={settings.includeWarmup}
                  onCheckedChange={(checked) => updateSetting('includeWarmup', checked)}
                  className="data-[state=checked]:bg-brand-blue"
                />
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between py-3 px-4 bg-background rounded-lg border border-border mb-4">
                  <div>
                    <Label className="text-base font-medium text-foreground">Use Weight Vest</Label>
                    <p className="text-sm text-gray-500">Add resistance to your bodyweight exercises</p>
                  </div>
                  <Switch
                    checked={settings.useWeightVest}
                    onCheckedChange={(checked) => updateSetting('useWeightVest', checked)}
                    className="data-[state=checked]:bg-brand-blue"
                  />
                </div>
                {settings.useWeightVest && (
                   <div className="space-y-2">
                      <Label className="text-foreground">Vest Weight (LBS)</Label>
                      <Slider
                        value={settings.vestWeightLbs}
                        onValueChange={(value) => updateSetting('vestWeightLbs', value)}
                        min={5}
                        max={100}
                        step={1}
                        className="w-full workout-builder-slider"
                      />
                      <div className="text-sm text-gray-400 text-right">{settings.vestWeightLbs[0]} LBS</div>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {selectedExercises.length > 0 && (
            <div className="flex flex-col md:flex-row justify-center gap-4 pt-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="bg-background border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white px-8 py-3 text-lg font-bold rounded-full"
              >
                <Upload className="w-5 h-5 mr-3" />
                SAVE WORKOUT
              </Button>

              <Button
                size="lg"
                onClick={startWorkout}
                className="gradient-bg text-white hover:opacity-90 text-lg px-10 py-6 rounded-full font-bold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all duration-300 transform hover:scale-105"
              >
                <Play className="w-5 h-5 mr-3" />
                START WORKOUT
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Save Workout Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSaveDialog(false)}>
          <Card className="bg-card max-w-md w-full border-border" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Save Workout Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="saveWorkoutName">Workout Name</Label>
                <Input
                  id="saveWorkoutName"
                  value={saveWorkoutName}
                  onChange={(e) => setSaveWorkoutName(e.target.value)}
                  placeholder="e.g., Upper Body Blast"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="saveWorkoutDescription">Description (Optional)</Label>
                <Textarea
                  id="saveWorkoutDescription"
                  value={saveWorkoutDescription}
                  onChange={(e) => setSaveWorkoutDescription(e.target.value)}
                  placeholder="Describe your workout..."
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="bg-background border-border">
                  Cancel
                </Button>
                <Button onClick={saveWorkoutTemplate} className="gradient-bg text-white hover:opacity-90">
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
