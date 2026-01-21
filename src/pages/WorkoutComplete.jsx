import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Target, Clock, TrendingUp, Share2, Home, RotateCcw, Trash2, Footprints } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

  useEffect(() => {
    // Auto-hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    loadWorkoutStats();
    return () => clearTimeout(timer);
  }, []);

  const loadWorkoutStats = async () => {
    try {
      // Get the most recent workout session
      const sessions = await base44.entities.WorkoutSession.list('-created_date', 1);
      if (sessions.length > 0) {
        const session = sessions[0];
        setWorkoutStats({
          totalReps: session.total_reps || 0,
          totalSteps: session.cardio_analytics?.total_steps || 0,
          duration: session.duration || 0,
          caloriesBurned: session.calories_burned || 0
        });

        // Check if this was part of a program and advance to next day
        const workouts = await base44.entities.Workout.filter({ id: session.workout_id });
        if (workouts.length > 0 && workouts[0].program_id) {
          const workout = workouts[0];
          const user = await base44.auth.me();
          
          if (user.active_program && user.active_program.program_id === workout.program_id) {
            const nextDay = workout.program_day + 1;
            
            // Update to next day if not completed
            if (nextDay <= user.active_program.total_days) {
              await base44.auth.updateMe({
                active_program: {
                  ...user.active_program,
                  current_day: nextDay
                }
              });
              toast.success(`Day ${workout.program_day} complete! Day ${nextDay} is ready.`);
            } else {
              // Program completed
              await base44.auth.updateMe({ active_program: null });
              toast.success(`🎉 Program "${user.active_program.program_name}" completed!`);
            }
          }
        }
      }

      // Check for new achievements
      const allAchievements = await base44.entities.Achievement.list('-earned_date', 5);
      const recentAchievements = allAchievements.filter(a => {
        const earnedTime = new Date(a.earned_date).getTime();
        const now = Date.now();
        return (now - earnedTime) < 60000; // Within last minute
      });
      setNewAchievements(recentAchievements);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shareResults = () => {
    const text = "Just crushed another workout with RepsAndSteps! 💪 #FitnessGoals #RepsAndSteps";
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  const deleteWorkout = async () => {
    if (confirm('Are you sure you want to delete this workout session? This cannot be undone.')) {
      try {
        const savedState = localStorage.getItem('activeWorkoutState');
        if (savedState) {
          const state = JSON.parse(savedState);
          const workoutId = state.workout?.id;
          if (workoutId) {
            await base44.entities.Workout.delete(workoutId);
          }
        }
        localStorage.removeItem('activeWorkoutState');
        toast.success('Workout deleted');
        navigate(createPageUrl("Home"));
      } catch (error) {
        console.error('Failed to delete workout:', error);
        toast.error('Failed to delete workout');
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full"
              style={{
                background: `hsl(${Math.random() * 360}, 100%, 50%)`
              }}
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 10,
                opacity: 1
              }}
              animate={{
                y: -20,
                x: Math.random() * window.innerWidth,
              }}
              transition={{
                duration: Math.random() * 2 + 3,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="max-w-md w-full z-10"
      >
        <Card className="border-none shadow-2xl bg-card/80 backdrop-blur-sm text-foreground">
          <CardContent className="p-8 text-center">
            {/* Trophy Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.8, type: "spring", bounce: 0.6 }}
              className="mb-6"
            >
              <div className="w-24 h-24 mx-auto gradient-bg rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Workout Complete!
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                Outstanding effort! You've just crushed another session. 🔥
              </p>
            </motion.div>

            {/* Workout Stats */}
            {workoutStats && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6"
              >
                <div className="bg-background rounded-lg p-4 border border-brand-blue/30">
                  <Target className="w-6 h-6 text-brand-blue mx-auto mb-2" />
                  <div className="text-xs text-gray-400">Total Reps</div>
                  <div className="text-2xl font-bold text-brand-blue">{workoutStats.totalReps}</div>
                </div>
                <div className="bg-background rounded-lg p-4 border border-purple-500/30">
                  <Footprints className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-xs text-gray-400">Steps</div>
                  <div className="text-2xl font-bold text-purple-400">{workoutStats.totalSteps?.toLocaleString() || 0}</div>
                </div>
                <div className="bg-background rounded-lg p-4 border border-green-500/30">
                  <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-xs text-gray-400">Time</div>
                  <div className="text-2xl font-bold text-green-400">{formatTime(workoutStats.duration)}</div>
                </div>
                <div className="bg-background rounded-lg p-4 border border-orange-500/30">
                  <TrendingUp className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <div className="text-xs text-gray-400">Calories</div>
                  <div className="text-2xl font-bold text-orange-400">{workoutStats.caloriesBurned}</div>
                </div>
              </motion.div>
            )}

            {/* New Achievements */}
            {newAchievements.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mb-6"
              >
                <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  New Achievements Unlocked!
                </h3>
                <div className="space-y-2">
                  {newAchievements.map(achievement => (
                    <div key={achievement.id} className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="text-left">
                          <div className="font-bold text-yellow-400">{achievement.title}</div>
                          <div className="text-xs text-gray-400">{achievement.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Motivational Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              <div className="bg-background rounded-lg p-4 border border-green-500/30">
                <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-sm text-gray-400">Consistency</div>
                <div className="text-xl font-bold text-green-400">+1 Day</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-blue-500/30">
                <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-sm text-gray-400">Progress</div>
                <div className="text-xl font-bold text-blue-400">Stronger</div>
              </div>
            </motion.div>

            {/* Motivational Message */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="bg-background rounded-lg p-4 mb-8 border border-purple-500/30"
            >
              <p className="text-purple-400 font-medium italic">
                "Every rep counts, every workout matters. You're building the strongest version of yourself!"
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="space-y-4"
            >
              <Button
                onClick={shareResults}
                className="w-full gradient-bg hover:opacity-90 text-lg py-3 rounded-full font-bold shadow-lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share Your Victory
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Exercises"))}
                  className="hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Workout
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Home"))}
                  className="hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </div>

              <Button
                variant="link"
                onClick={() => navigate(createPageUrl("History"))}
                className="text-purple-400 hover:text-purple-300"
              >
                View Full History
              </Button>

              <Button
                variant="outline"
                onClick={deleteWorkout}
                className="w-full mt-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete This Workout
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}