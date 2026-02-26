import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ProgramEnrollment } from "@/entities/ProgramEnrollment";
import { Achievement } from "@/entities/Achievement";
import { Trophy, Target, Clock, TrendingUp, Share2, Home, RotateCcw, Trash2, Footprints } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AchievementManager } from '@/components/services/achievementManager';
import AchievementUnlockedPopup from '@/components/achievements/AchievementUnlockedPopup';

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [currentAchievementPopup, setCurrentAchievementPopup] = useState(null);

  useEffect(() => {
    // CRITICAL: Clear active workout state immediately on mount
    console.log('[WorkoutComplete] Clearing activeWorkoutState');
    localStorage.removeItem('activeWorkoutState');
    
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

        // STREAK UPDATE: Import and use centralized streak manager
        const { updateStreak } = await import('@/components/services/streakManager');
        const user = await base44.auth.me();
        await updateStreak(user);

        // CRITICAL FIX: Check if this was part of a program and advance to next day
        const workouts = await base44.entities.Workout.filter({ id: session.workout_id });
        console.log('[PROGRAM] Checking workout for program:', workouts);
        console.log('[PROGRAM] Full workout data:', workouts[0]);
        
        if (workouts.length > 0 && workouts[0].program_id) {
          const workout = workouts[0];
          const dayJustCompleted = workout.program_day || 1;
          
          console.log('[PROGRAM] ✅ Found program workout:', {
            program_id: workout.program_id,
            program_day: dayJustCompleted,
            workout_name: workout.name
          });
          
          // IMMEDIATE: Set basic program info from workout data (before enrollment lookup)
          const basicProgramInfo = {
            programName: workout.name?.includes('-') ? workout.name.split('-')[0].trim() : 'Program',
            dayCompleted: dayJustCompleted,
            nextDay: null,
            totalDays: null,
            nextDayPlan: null,
            programId: workout.program_id
          };
          console.log('[PROGRAM] ✅ Setting basic program info immediately:', basicProgramInfo);
          setProgramInfo(basicProgramInfo);
          
          // CRITICAL: Find enrollment by program_id AND active status
          const enrollments = await ProgramEnrollment.filter({ 
            program_id: workout.program_id,
            status: 'active'
          });
          
          console.log('[PROGRAM] Found enrollments:', enrollments);
          
          if (enrollments.length > 0) {
            const enrollment = enrollments[0];
            const existingCompletedDays = enrollment.completed_days || [];
            
            console.log('[PROGRAM] Current enrollment state:', {
              current_day: enrollment.current_day,
              completed_days: existingCompletedDays,
              total_days: enrollment.total_days
            });
            
            // Only add if not already completed
            const updatedCompletedDays = existingCompletedDays.includes(dayJustCompleted) 
              ? existingCompletedDays 
              : [...existingCompletedDays, dayJustCompleted];
            
            const daysCompletedCount = updatedCompletedDays.length;
            const nextDay = dayJustCompleted + 1;
            const completionPercentage = (daysCompletedCount / enrollment.total_days) * 100;
            
            console.log('[PROGRAM] Updating enrollment:', {
              day_just_completed: dayJustCompleted,
              updated_completed_days: updatedCompletedDays,
              next_day: nextDay,
              completion_percentage: completionPercentage
            });
            
            // CRITICAL: Update enrollment FIRST
            await ProgramEnrollment.update(enrollment.id, {
              completed_days: updatedCompletedDays,
              days_completed_count: daysCompletedCount,
              completion_percentage: completionPercentage,
              last_activity_date: new Date().toISOString(),
              current_day: nextDay
            });
            
            console.log('[PROGRAM] ✅ Enrollment updated in database');
            
            // Fetch program details for UI
            const programs = await base44.entities.PresetProgram.filter({ id: workout.program_id });
            const program = programs[0];
            
            // Update with full program info including enrollment details
            const fullProgramInfo = {
              programName: enrollment.program_name || program?.name || basicProgramInfo.programName,
              dayCompleted: dayJustCompleted,
              nextDay: nextDay <= enrollment.total_days ? nextDay : null,
              totalDays: enrollment.total_days,
              nextDayPlan: nextDay <= enrollment.total_days ? program?.daily_plans?.[nextDay - 1] : null,
              programId: workout.program_id
            };
            console.log('[PROGRAM] Updating with full program info:', fullProgramInfo);
            setProgramInfo(fullProgramInfo);
            
            // CRITICAL: Update user.active_program to match enrollment
            const user = await base44.auth.me();
            await base44.auth.updateMe({
              active_program: {
                program_id: workout.program_id,
                program_name: enrollment.program_name,
                program_type: 'workout',
                current_day: nextDay,
                total_days: enrollment.total_days,
                completed_days: updatedCompletedDays,
                days_completed_count: daysCompletedCount,
                start_date: enrollment.start_date
              }
            });
            
            console.log('[PROGRAM] ✅ User.active_program synced');
            
            // Check if program is complete
            if (nextDay > enrollment.total_days) {
              // Program completed - award achievement
              await ProgramEnrollment.update(enrollment.id, {
                status: 'completed',
                end_date: new Date().toISOString(),
                completion_percentage: 100,
                achievement_earned: true
              });
              
              console.log('[PROGRAM] ✅ Program completed!');
              
              // Award program completion achievement
              await Achievement.create({
                achievement_type: `program_${workout.program_id}_completed`,
                title: `${enrollment.program_name} Champion`,
                description: `Completed all ${enrollment.total_days} days of ${enrollment.program_name}`,
                icon_url: 'https://api.dicebear.com/7.x/icons/svg?icon=trophy',
                earned_date: new Date().toISOString(),
                progress: 100,
                target: 100,
                category: 'elite'
              });
              
              // Clear active program from user
              await base44.auth.updateMe({ active_program: null });
              toast.success(`🎉 Program "${enrollment.program_name}" completed!`);
            } else {
              // Show progress message
              toast.success(`✓ Day ${dayJustCompleted} complete! Day ${nextDay} is ready.`);
            }
          } else {
            console.warn('[PROGRAM] ⚠️ No active enrollment found for program:', workout.program_id);
            console.warn('[PROGRAM] ⚠️ But still showing day completed in UI');
          }
        } else {
          console.log('[PROGRAM] ℹ️ This workout is NOT part of a program (no program_id)');
          console.log('[PROGRAM] Workout details:', workouts[0]);
        }
      }

      // Check and award new achievements
      const user = await base44.auth.me();
      const newlyEarned = await AchievementManager.checkAndAwardAchievements(user.email);
      
      if (newlyEarned.length > 0) {
        setNewAchievements(newlyEarned);
        // Show first achievement popup immediately
        setCurrentAchievementPopup(newlyEarned[0]);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAchievementPopupClose = () => {
    const currentIndex = newAchievements.indexOf(currentAchievementPopup);
    if (currentIndex < newAchievements.length - 1) {
      // Show next achievement
      setCurrentAchievementPopup(newAchievements[currentIndex + 1]);
    } else {
      // All achievements shown
      setCurrentAchievementPopup(null);
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
        // Get the most recent session to delete
        const sessions = await base44.entities.WorkoutSession.list('-created_date', 1);
        if (sessions.length > 0) {
          const session = sessions[0];
          
          // Delete the workout session
          await base44.entities.WorkoutSession.delete(session.id);
          
          // Delete the associated workout if it exists
          if (session.workout_id) {
            try {
              await base44.entities.Workout.delete(session.workout_id);
            } catch (error) {
              console.log('Workout already deleted or not found');
            }
          }
        }
        
        // CRITICAL: Clear localStorage
        localStorage.removeItem('activeWorkoutState');
        console.log('[WorkoutComplete] Deleted workout and cleared state');
        
        toast.success('Workout deleted');
        navigate(createPageUrl("Home"));
      } catch (error) {
        console.error('Failed to delete workout:', error);
        toast.error('Failed to delete workout');
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-4 sm:p-6 pb-32 relative overflow-hidden">
      {currentAchievementPopup && (
        <AchievementUnlockedPopup 
          achievement={currentAchievementPopup} 
          onClose={handleAchievementPopupClose} 
        />
      )}
      
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
              {programInfo ? (
                <div className="bg-gradient-to-r from-brand-blue/20 to-purple-600/20 border-2 border-brand-blue/50 rounded-xl p-6 mb-6">
                  <div className="text-sm text-brand-blue font-bold mb-2">PROGRAM WORKOUT</div>
                  <h1 className="text-4xl font-bold text-white mb-3">
                    🎯 Day {programInfo.dayCompleted} Complete!
                  </h1>
                  <p className="text-2xl text-brand-blue font-bold mb-2">
                    {programInfo.programName}
                  </p>
                  {programInfo.totalDays && (
                    <div className="bg-background/50 rounded-lg px-4 py-2 inline-block">
                      <p className="text-sm text-gray-300">
                        Progress: <span className="text-brand-blue font-bold text-lg">{programInfo.dayCompleted}/{programInfo.totalDays}</span> days
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Workout Complete!
                  </h1>
                  <p className="text-lg text-gray-400 mb-8">
                    Outstanding effort! You've just crushed another session. 🔥
                  </p>
                </>
              )}
              <p className="text-sm text-gray-500 mb-8">
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
                  {newAchievements.length} New Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!
                </h3>
                <div className="space-y-2">
                  {newAchievements.map((achievement, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img src={achievement.icon_url} alt={achievement.title} className="w-12 h-12" />
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

            {/* Program Next Day Preview */}
            {programInfo?.nextDay && programInfo.nextDayPlan && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.95, duration: 0.6 }}
                className="mb-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 rounded-xl p-5"
              >
                <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center justify-center gap-2">
                  ▶ Next: Day {programInfo.nextDay}
                </h3>
                <div className="text-white font-semibold mb-2">{programInfo.nextDayPlan.workout_name}</div>
                {programInfo.nextDayPlan.is_rest_day ? (
                  <p className="text-sm text-gray-400 mb-3">Rest and recovery day</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-2">
                      {programInfo.nextDayPlan.total_reps} total reps
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                      {programInfo.nextDayPlan.exercises?.slice(0, 4).map((ex, i) => (
                        <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          {ex.exercise_name}
                        </span>
                      ))}
                      {programInfo.nextDayPlan.exercises?.length > 4 && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          +{programInfo.nextDayPlan.exercises.length - 4} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                <Button
                  onClick={() => navigate(createPageUrl("PresetPrograms"))}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  PREVIEW Day {programInfo.nextDay}
                </Button>
              </motion.div>
            )}

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