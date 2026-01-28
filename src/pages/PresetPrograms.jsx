import React, { useState, useEffect } from "react";
import { PresetProgram } from "@/entities/PresetProgram";
import { NutritionProgram } from "@/entities/NutritionProgram";
import { Workout } from "@/entities/Workout";
import { Exercise } from "@/entities/Exercise";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Target, Zap, Trophy, ArrowRight, Check, Eye, X, ArrowLeft, Play, Clock, Flame, Apple, Utensils } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PresetPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [nutritionPrograms, setNutritionPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedNutritionProgram, setSelectedNutritionProgram] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [activeNutritionProgram, setActiveNutritionProgram] = useState(null);
  const [activeProgramDetails, setActiveProgramDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('workout');

  useEffect(() => {
    loadPrograms();
    loadActiveProgram();
  }, []);

  const loadActiveProgram = async () => {
    try {
      const user = await base44.auth.me();
      if (user.active_program) {
        setActiveProgram(user.active_program);
        const programs = await PresetProgram.filter({ id: user.active_program.program_id });
        if (programs.length > 0) {
          setActiveProgramDetails(programs[0]);
        }
      }
      if (user.active_nutrition_program) {
        setActiveNutritionProgram(user.active_nutrition_program);
      }
    } catch (error) {
      console.log('No active program');
    }
  };

  const loadPrograms = async () => {
    setIsLoading(true);
    const [workoutPrograms, nutritionProgramsList] = await Promise.all([
      PresetProgram.filter({ is_preset: true }),
      NutritionProgram.list()
    ]);
    setPrograms(workoutPrograms);
    setNutritionPrograms(nutritionProgramsList);
    setIsLoading(false);
  };

  const startProgram = async (program, dayNumber = 1) => {
    const day = program.daily_plans[dayNumber - 1];
    
    if (day.is_rest_day) {
      toast.error(`Day ${dayNumber} is a rest day. Check the program details.`);
      return;
    }

    try {
      toast.loading('Creating workout...');
      
      const allExercises = await Exercise.list();
      const exercises = day.exercises.map(ex => {
        const dbExercise = allExercises.find(e => e.name.toLowerCase() === ex.exercise_name.toLowerCase());
        return {
          exercise_id: dbExercise?.id || 'custom',
          exercise_name: ex.exercise_name,
          target_reps: ex.target_reps,
          sets: ex.sets || 1,
          completed_reps: 0,
          completed_time: 0,
          metric: 'reps',
          category: dbExercise?.category || 'full_body',
          image_url: dbExercise?.image_url,
          instructions: dbExercise?.instructions
        };
      });

      const warmupExercises = [
        { id: 'warmup-1', name: 'Walk in Place', category: 'warmup', metric: 'time', target_time: 60 },
        { id: 'warmup-2', name: 'Arm Circles Forward', category: 'warmup', metric: 'time', target_time: 15 },
        { id: 'warmup-3', name: 'Hip Circles', category: 'warmup', metric: 'time', target_time: 20 }
      ].map(ex => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_reps: 0,
        target_time: ex.target_time,
        sets: 1,
        completed_reps: 0,
        completed_time: 0,
        metric: 'time',
        category: 'warmup'
      }));

      const workoutData = {
        name: `${program.name} - Day ${dayNumber}`,
        exercises: [...warmupExercises, ...exercises],
        workout_type: "rep_based",
        difficulty: program.difficulty,
        rest_time: day.exercises[0]?.rest_after_circuit_seconds || 300,
        program_id: program.id,
        program_day: dayNumber
      };

      const workout = await Workout.create(workoutData);
      
      await base44.auth.updateMe({
        active_program: {
          program_id: program.id,
          program_name: program.name,
          current_day: dayNumber,
          total_days: program.duration_days,
          started_date: new Date().toISOString(),
          completed_days: []
        }
      });
      
      toast.dismiss();
      toast.success(`Starting Day ${dayNumber} of ${program.name}`);
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
    } catch (error) {
      toast.dismiss();
      console.error('Failed to start program:', error);
      toast.error('Failed to start program');
    }
  };

  const difficultyColors = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="gradient-bg text-white py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Preset Programs</h1>
          <p className="text-lg text-white/90">Structured workout & nutrition programs</p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('workout')}
            className={`pb-3 px-4 font-semibold transition-colors text-base sm:text-lg ${
              activeTab === 'workout' 
                ? 'text-brand-blue border-b-2 border-brand-blue' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Workout Programs
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`pb-3 px-4 font-semibold transition-colors text-base sm:text-lg ${
              activeTab === 'nutrition' 
                ? 'text-brand-blue border-b-2 border-brand-blue' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Nutrition Programs
          </button>
        </div>

        {/* Active Workout Program */}
        {activeTab === 'workout' && activeProgram && activeProgramDetails && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">IN CURRENT PROGRAM</h2>
            <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-2 border-purple-500/50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{activeProgram.program_name}</h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Badge className="bg-green-500 text-white font-bold">
                        ✓ Day {activeProgram.current_day - 1} Complete
                      </Badge>
                      <Badge className={difficultyColors[activeProgramDetails.difficulty]}>
                        {activeProgramDetails.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Progress</span>
                        <span className="text-brand-blue font-bold">
                          {activeProgram.current_day - 1} / {activeProgram.total_days} days
                        </span>
                      </div>
                      <Progress 
                        value={((activeProgram.current_day - 1) / activeProgram.total_days) * 100} 
                        className="h-3"
                      />
                    </div>

                    {activeProgram.current_day <= activeProgram.total_days && (
                      <div className="bg-background/50 border border-brand-blue/30 rounded-lg p-4">
                        <p className="text-sm font-semibold text-brand-blue mb-2">
                          ▶ Next: Day {activeProgram.current_day}
                        </p>
                        {activeProgramDetails.daily_plans[activeProgram.current_day - 1] && (
                          <>
                            <p className="text-white font-medium mb-1">
                              {activeProgramDetails.daily_plans[activeProgram.current_day - 1].workout_name}
                            </p>
                            {activeProgramDetails.daily_plans[activeProgram.current_day - 1].is_rest_day ? (
                              <p className="text-sm text-gray-400">Rest and recovery day</p>
                            ) : (
                              <p className="text-sm text-gray-400">
                                {activeProgramDetails.daily_plans[activeProgram.current_day - 1].total_reps} total reps
                              </p>
                            )}
                          </>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProgram(activeProgramDetails);
                          }}
                          className="w-full mt-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold"
                        >
                          PREVIEW Day {activeProgram.current_day}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Nutrition Program */}
        {activeTab === 'nutrition' && activeNutritionProgram && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4">ACTIVE NUTRITION PROGRAM</h2>
            <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{activeNutritionProgram.program_name}</h3>
                    <p className="text-gray-400">Day {activeNutritionProgram.current_day} of {activeNutritionProgram.total_days}</p>
                  </div>
                  <Button
                    onClick={async () => {
                      await User.updateMe({ active_nutrition_program: null });
                      setActiveNutritionProgram(null);
                      toast.success('Nutrition program deactivated');
                    }}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/20"
                  >
                    Deactivate
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Daily Calories</p>
                    <p className="text-2xl font-bold">{activeNutritionProgram.daily_calories}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Progress</p>
                    <p className="text-2xl font-bold">{Math.round(((activeNutritionProgram.current_day - 1) / activeNutritionProgram.total_days) * 100)}%</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Days Left</p>
                    <p className="text-2xl font-bold">{activeNutritionProgram.total_days - activeNutritionProgram.current_day + 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Workout Programs Grid */}
        {activeTab === 'workout' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="bg-card animate-pulse">
                    <div className="h-48 bg-gray-700 rounded-t-xl"></div>
                    <CardHeader>
                      <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <Card className="bg-card text-center p-12">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Programs Yet</h3>
                <p className="text-muted-foreground">Preset programs will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program, idx) => (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card 
                      className="bg-card hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-brand-blue"
                      onClick={() => setSelectedProgram(program)}
                    >
                      {program.thumbnail_url && (
                        <div className="h-48 overflow-hidden rounded-t-xl">
                          <img src={program.thumbnail_url} alt={program.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-xl text-foreground">{program.name}</CardTitle>
                          <Badge className={difficultyColors[program.difficulty]}>
                            {program.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{program.duration_days} days</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-4 h-4" />
                            <span>{program.daily_plans[0]?.total_reps || 0} reps per day</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="w-4 h-4" />
                            <span>{program.category}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startProgram(program);
                          }}
                          className="w-full mt-4 gradient-bg text-white hover:opacity-90"
                        >
                          Start Day 1
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Nutrition Programs Grid */}
        {activeTab === 'nutrition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nutritionPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card border-border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => setSelectedNutritionProgram(program)}>
                  <CardHeader className={`bg-gradient-to-br ${
                    program.program_type === 'weight_loss' ? 'from-red-600 to-orange-600' :
                    program.program_type === 'muscle_gain' ? 'from-blue-600 to-purple-600' :
                    'from-green-600 to-emerald-600'
                  } text-white rounded-t-xl p-6`}>
                    <CardTitle className="text-2xl font-bold">{program.name}</CardTitle>
                    <CardDescription className="text-white/90 mt-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Duration</span>
                        <span className="font-semibold">{program.duration_days} Days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Daily Calories</span>
                        <span className="font-semibold">{program.daily_calories_target} cal</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Protein</span>
                        <span className="font-semibold">{program.daily_protein_grams}g</span>
                      </div>
                    </div>
                    <Button className="w-full bg-brand-blue hover:bg-brand-blue-dark">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition Program Detail Modal */}
      {selectedNutritionProgram && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedNutritionProgram(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="bg-card border-border">
              <CardHeader className={`bg-gradient-to-br ${
                selectedNutritionProgram.program_type === 'weight_loss' ? 'from-red-600 to-orange-600' :
                selectedNutritionProgram.program_type === 'muscle_gain' ? 'from-blue-600 to-purple-600' :
                'from-green-600 to-emerald-600'
              } text-white p-6`}>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">{selectedNutritionProgram.name}</CardTitle>
                    <CardDescription className="text-white/90">{selectedNutritionProgram.description}</CardDescription>
                  </div>
                  <button 
                    onClick={() => setSelectedNutritionProgram(null)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-brand-blue" />
                    <p className="text-2xl font-bold">{selectedNutritionProgram.duration_days}</p>
                    <p className="text-xs text-gray-400">Days</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <Flame className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                    <p className="text-2xl font-bold">{selectedNutritionProgram.daily_calories_target}</p>
                    <p className="text-xs text-gray-400">Calories</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <Apple className="w-6 h-6 mx-auto mb-2 text-green-400" />
                    <p className="text-2xl font-bold">{selectedNutritionProgram.daily_protein_grams}g</p>
                    <p className="text-xs text-gray-400">Protein</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <Utensils className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-2xl font-bold">{selectedNutritionProgram.daily_meal_plans?.length || 0}</p>
                    <p className="text-xs text-gray-400">Meal Plans</p>
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    await User.updateMe({ 
                      active_nutrition_program: {
                        program_id: selectedNutritionProgram.id,
                        program_name: selectedNutritionProgram.name,
                        current_day: 1,
                        total_days: selectedNutritionProgram.duration_days,
                        daily_calories: selectedNutritionProgram.daily_calories_target,
                        start_date: new Date().toISOString()
                      }
                    });
                    setActiveNutritionProgram({
                      program_id: selectedNutritionProgram.id,
                      program_name: selectedNutritionProgram.name,
                      current_day: 1,
                      total_days: selectedNutritionProgram.duration_days,
                      daily_calories: selectedNutritionProgram.daily_calories_target
                    });
                    setSelectedNutritionProgram(null);
                    toast.success('Nutrition program activated!');
                  }}
                  className="w-full bg-brand-blue hover:bg-brand-blue-dark mb-6"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Activate This Program
                </Button>

                {/* Tips Section */}
                {selectedNutritionProgram.tips && selectedNutritionProgram.tips.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-3">Program Tips</h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <ul className="space-y-2">
                        {selectedNutritionProgram.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-brand-blue mt-1">•</span>
                            <span className="text-gray-300">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sample Days Preview */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Sample Daily Meal Plans</h3>
                  <div className="space-y-4">
                    {selectedNutritionProgram.daily_meal_plans?.slice(0, 2).map((day, i) => (
                      <div key={i} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-lg">{day.day_name}</h4>
                          <Badge className="bg-brand-blue">{day.total_calories} cal</Badge>
                        </div>
                        <div className="grid gap-2">
                          {day.meals?.map((meal, j) => (
                            <div key={j} className="bg-gray-900/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold capitalize text-sm">{meal.meal_type}: {meal.meal_name}</span>
                                <span className="text-xs text-gray-400">{meal.calories} cal</span>
                              </div>
                              <div className="flex gap-3 text-xs text-gray-500">
                                <span>P: {meal.protein}g</span>
                                <span>C: {meal.carbs}g</span>
                                <span>F: {meal.fat}g</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedNutritionProgram.daily_meal_plans?.length > 2 && (
                      <p className="text-center text-gray-400 text-sm">+ {selectedNutritionProgram.daily_meal_plans.length - 2} more days of meal plans</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Workout Program Detail Modal */}
      {selectedProgram && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProgram(null)}
        >
          <Card 
            className="bg-card max-w-3xl w-full max-h-[85vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Button
                  onClick={() => setSelectedProgram(null)}
                  variant="outline"
                  className="border-gray-600 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-foreground mb-2">{selectedProgram.name}</CardTitle>
                  <p className="text-muted-foreground">{selectedProgram.description}</p>
                </div>
                <Badge className={difficultyColors[selectedProgram.difficulty]}>
                  {selectedProgram.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedProgram.daily_plans.map((day, idx) => {
                const isCompleted = false;
                return (
                  <div key={idx} className={`border rounded-lg p-4 ${isCompleted ? 'border-green-500 bg-green-500/10' : 'border-border'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {isCompleted ? '✓' : day.day_number}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            Day {day.day_number}: {day.day_name}
                          </h3>
                          {day.workout_name && (
                            <p className="text-sm text-brand-blue">{day.workout_name}</p>
                          )}
                        </div>
                      </div>
                      {day.is_rest_day && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Rest Day
                        </Badge>
                      )}
                    </div>

                  {!day.is_rest_day && day.exercises && (
                    <div className="space-y-2 mb-3">
                      <p className="text-sm font-semibold text-foreground">Exercises ({day.total_reps} total reps):</p>
                      <div className="space-y-1">
                        {day.exercises.map((ex, i) => (
                          <div key={i} className="flex justify-between text-sm bg-background/50 p-2 rounded">
                            <span className="text-muted-foreground">
                              {ex.circuit_number && `Circuit ${ex.circuit_number}: `}{ex.exercise_name}
                            </span>
                            <span className="font-medium text-foreground">{ex.target_reps} × {ex.sets}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {day.nutrition_notes && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                      <p className="text-xs font-semibold text-green-400 mb-1">Nutrition:</p>
                      <p className="text-xs text-gray-300">{day.nutrition_notes}</p>
                    </div>
                  )}
                </div>
                );
              })}

              <Button 
                onClick={() => startProgram(selectedProgram)}
                className="w-full gradient-bg text-white hover:opacity-90 py-6 text-lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Start This Program
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}