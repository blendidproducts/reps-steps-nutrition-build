import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Play, Share2, Trash2, Edit, Clock, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SavedWorkouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setIsLoading(true);
    const data = await SavedWorkout.list('-created_date');
    setWorkouts(data);
    setIsLoading(false);
  };

  const shareWorkout = async (workout) => {
    const exerciseList = workout.exercises.map(ex => ex.exercise_name).join(', ');
    const text = `Check out my ${workout.name} workout on Reps & Steps! Exercises: ${exerciseList} 💪 #RepsAndSteps #Workout`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: workout.name,
          text: text,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Workout details copied to clipboard!');
      }
    } catch (error) {
      await navigator.clipboard.writeText(text);
      toast.info('Workout details copied to clipboard!');
    }
  };

  const deleteWorkout = async (id) => {
    if (confirm('Are you sure you want to delete this workout?')) {
      await SavedWorkout.delete(id);
      toast.success('Workout deleted!');
      loadWorkouts();
    }
  };

  const startWorkout = (workout) => {
    const exerciseIds = workout.exercises.map(ex => ex.exercise_id).join(',');
    navigate(`${createPageUrl("WorkoutBuilder")}?exercises=${exerciseIds}&savedWorkout=${workout.id}`);
  };

  const workoutTypeIcons = {
    rep_based: Target,
    time_based: Clock,
    random: Zap
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Saved Workouts</h1>
              <p className="text-lg text-white/90">
                Your custom workout templates, ready to use anytime
              </p>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("Exercises"))}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-700 rounded mb-4 w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workouts.map((workout) => {
              const TypeIcon = workoutTypeIcons[workout.workout_type] || Target;
              return (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="h-full bg-card border-border hover:border-brand-blue/50 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <TypeIcon className="w-6 h-6 text-brand-blue" />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => shareWorkout(workout)}
                            className="text-gray-400 hover:text-brand-blue h-8 w-8"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWorkout(workout.id)}
                            className="text-gray-400 hover:text-red-400 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-xl">{workout.name}</CardTitle>
                      {workout.description && (
                        <p className="text-sm text-gray-400">{workout.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="border-brand-blue/50 text-brand-blue capitalize">
                            {workout.workout_type.replace('_', ' ')}
                          </Badge>
                          {workout.difficulty && (
                            <Badge variant="outline" className="border-gray-500/50 text-gray-300 capitalize">
                              {workout.difficulty}
                            </Badge>
                          )}
                          {workout.estimated_duration && (
                            <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                              ~{workout.estimated_duration} min
                            </Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-400 mb-2">
                            {workout.exercises.length} exercises
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {workout.exercises.slice(0, 3).map((ex, idx) => (
                              <span key={idx} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                                {ex.exercise_name}
                              </span>
                            ))}
                            {workout.exercises.length > 3 && (
                              <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                                +{workout.exercises.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => startWorkout(workout)}
                        className="w-full gradient-bg text-white hover:opacity-90"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Workout
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2">No Saved Workouts Yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first custom workout and save it for later
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Exercises"))}
                className="gradient-bg text-white hover:opacity-90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Workout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}