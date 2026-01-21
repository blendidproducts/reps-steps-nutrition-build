import React, { useState, useEffect } from "react";
import { PresetProgram } from "@/entities/PresetProgram";
import { Workout } from "@/entities/Workout";
import { Exercise } from "@/entities/Exercise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Target, Zap, Trophy, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PresetPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setIsLoading(true);
    const data = await PresetProgram.filter({ is_preset: true });
    setPrograms(data);
    setIsLoading(false);
  };

  const startProgram = async (program, dayNumber = 1) => {
    // Start specific day workout
    const day = program.daily_plans[dayNumber - 1];
    
    if (day.is_rest_day) {
      toast.error(`Day ${dayNumber} is a rest day. Check the program details.`);
      return;
    }

    try {
      toast.loading('Creating workout...');
      
      // Get all exercises to map names to IDs
      const allExercises = await Exercise.list();
      
      // Build workout from day plan
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

      // Add warmup
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
      
      // Update user's active program
      const user = await base44.auth.me();
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
          <p className="text-lg text-white/90">Structured multi-day workout programs</p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
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
      </div>

      {/* Program Detail Modal */}
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
                const isCompleted = false; // Will be updated when we track user progress
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
              ))}

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