import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Flame, Clock, Moon, Sun, Award, Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const achievementDefinitions = [
  { type: "first_workout", title: "First Steps", description: "Complete your first workout", icon: "🎯", requiredValue: 1 },
  { type: "workout_streak_7", title: "Week Warrior", description: "7-day workout streak", icon: "🔥", requiredValue: 7 },
  { type: "workout_streak_30", title: "Monthly Master", description: "30-day workout streak", icon: "💪", requiredValue: 30 },
  { type: "workout_streak_100", title: "Century Champion", description: "100-day workout streak", icon: "👑", requiredValue: 100 },
  { type: "total_workouts_10", title: "Getting Started", description: "Complete 10 workouts", icon: "🌟", requiredValue: 10 },
  { type: "total_workouts_50", title: "Committed", description: "Complete 50 workouts", icon: "💎", requiredValue: 50 },
  { type: "total_workouts_100", title: "Dedicated", description: "Complete 100 workouts", icon: "🏆", requiredValue: 100 },
  { type: "total_reps_1000", title: "Rep Master", description: "Complete 1,000 total reps", icon: "⚡", requiredValue: 1000 },
  { type: "total_reps_5000", title: "Rep King", description: "Complete 5,000 total reps", icon: "👊", requiredValue: 5000 },
  { type: "total_reps_10000", title: "Rep Legend", description: "Complete 10,000 total reps", icon: "🔱", requiredValue: 10000 },
  { type: "early_bird", title: "Early Bird", description: "Complete 10 workouts before 7am", icon: "🌅", requiredValue: 10 },
  { type: "night_owl", title: "Night Owl", description: "Complete 10 workouts after 9pm", icon: "🦉", requiredValue: 10 },
];

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalReps: 0,
    earlyBirdCount: 0,
    nightOwlCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
    calculateStats();
  }, []);

  const loadAchievements = async () => {
    try {
      const data = await base44.entities.Achievement.list();
      setAchievements(data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const calculateStats = async () => {
    try {
      const sessions = await base44.entities.WorkoutSession.list('-created_date');
      
      const totalWorkouts = sessions.length;
      const totalReps = sessions.reduce((sum, s) => sum + (s.total_reps || 0), 0);
      
      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sortedDates = sessions
        .map(s => new Date(s.start_time))
        .sort((a, b) => b - a);
      
      for (let i = 0; i < sortedDates.length; i++) {
        const date = new Date(sortedDates[i]);
        date.setHours(0, 0, 0, 0);
        
        if (i === 0) {
          const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            currentStreak = 1;
            tempStreak = 1;
          }
        } else {
          const prevDate = new Date(sortedDates[i - 1]);
          prevDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((prevDate - date) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            tempStreak++;
            if (i === 0 || currentStreak > 0) currentStreak++;
          } else {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
      
      // Count early bird and night owl workouts
      const earlyBirdCount = sessions.filter(s => {
        const hour = new Date(s.start_time).getHours();
        return hour < 7;
      }).length;
      
      const nightOwlCount = sessions.filter(s => {
        const hour = new Date(s.start_time).getHours();
        return hour >= 21;
      }).length;
      
      setStats({
        totalWorkouts,
        currentStreak: Math.max(currentStreak, longestStreak === 1 && sortedDates.length > 0 ? 1 : currentStreak),
        longestStreak,
        totalReps,
        earlyBirdCount,
        nightOwlCount
      });
      
      // Check and award achievements
      await checkAchievements({
        totalWorkouts,
        currentStreak: Math.max(currentStreak, longestStreak),
        totalReps,
        earlyBirdCount,
        nightOwlCount
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to calculate stats:', error);
      setIsLoading(false);
    }
  };

  const checkAchievements = async (stats) => {
    const earnedTypes = achievements.map(a => a.achievement_type);
    
    const toAward = [];
    
    if (stats.totalWorkouts >= 1 && !earnedTypes.includes('first_workout')) {
      toAward.push({ type: 'first_workout', title: 'First Steps', description: 'Complete your first workout', icon: '🎯' });
    }
    if (stats.currentStreak >= 7 && !earnedTypes.includes('workout_streak_7')) {
      toAward.push({ type: 'workout_streak_7', title: 'Week Warrior', description: '7-day workout streak', icon: '🔥' });
    }
    if (stats.currentStreak >= 30 && !earnedTypes.includes('workout_streak_30')) {
      toAward.push({ type: 'workout_streak_30', title: 'Monthly Master', description: '30-day workout streak', icon: '💪' });
    }
    if (stats.currentStreak >= 100 && !earnedTypes.includes('workout_streak_100')) {
      toAward.push({ type: 'workout_streak_100', title: 'Century Champion', description: '100-day workout streak', icon: '👑' });
    }
    if (stats.totalWorkouts >= 10 && !earnedTypes.includes('total_workouts_10')) {
      toAward.push({ type: 'total_workouts_10', title: 'Getting Started', description: 'Complete 10 workouts', icon: '🌟' });
    }
    if (stats.totalWorkouts >= 50 && !earnedTypes.includes('total_workouts_50')) {
      toAward.push({ type: 'total_workouts_50', title: 'Committed', description: 'Complete 50 workouts', icon: '💎' });
    }
    if (stats.totalWorkouts >= 100 && !earnedTypes.includes('total_workouts_100')) {
      toAward.push({ type: 'total_workouts_100', title: 'Dedicated', description: 'Complete 100 workouts', icon: '🏆' });
    }
    if (stats.totalReps >= 1000 && !earnedTypes.includes('total_reps_1000')) {
      toAward.push({ type: 'total_reps_1000', title: 'Rep Master', description: 'Complete 1,000 total reps', icon: '⚡' });
    }
    if (stats.totalReps >= 5000 && !earnedTypes.includes('total_reps_5000')) {
      toAward.push({ type: 'total_reps_5000', title: 'Rep King', description: 'Complete 5,000 total reps', icon: '👊' });
    }
    if (stats.totalReps >= 10000 && !earnedTypes.includes('total_reps_10000')) {
      toAward.push({ type: 'total_reps_10000', title: 'Rep Legend', description: 'Complete 10,000 total reps', icon: '🔱' });
    }
    if (stats.earlyBirdCount >= 10 && !earnedTypes.includes('early_bird')) {
      toAward.push({ type: 'early_bird', title: 'Early Bird', description: 'Complete 10 workouts before 7am', icon: '🌅' });
    }
    if (stats.nightOwlCount >= 10 && !earnedTypes.includes('night_owl')) {
      toAward.push({ type: 'night_owl', title: 'Night Owl', description: 'Complete 10 workouts after 9pm', icon: '🦉' });
    }
    
    // Award new achievements
    for (const achievement of toAward) {
      try {
        await base44.entities.Achievement.create({
          achievement_type: achievement.type,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          earned_date: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to award achievement:', error);
      }
    }
    
    if (toAward.length > 0) {
      await loadAchievements();
    }
  };

  const isUnlocked = (type) => {
    return achievements.some(a => a.achievement_type === type);
  };

  const getProgress = (def) => {
    switch (def.type) {
      case 'first_workout':
      case 'total_workouts_10':
      case 'total_workouts_50':
      case 'total_workouts_100':
        return Math.min((stats.totalWorkouts / def.requiredValue) * 100, 100);
      case 'workout_streak_7':
      case 'workout_streak_30':
      case 'workout_streak_100':
        return Math.min((stats.currentStreak / def.requiredValue) * 100, 100);
      case 'total_reps_1000':
      case 'total_reps_5000':
      case 'total_reps_10000':
        return Math.min((stats.totalReps / def.requiredValue) * 100, 100);
      case 'early_bird':
        return Math.min((stats.earlyBirdCount / def.requiredValue) * 100, 100);
      case 'night_owl':
        return Math.min((stats.nightOwlCount / def.requiredValue) * 100, 100);
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Achievements & Streaks</h1>
          <p className="text-white/90 mb-4">Track your progress and unlock rewards</p>

          {/* 7-Day Trial CTA */}
          <div className="max-w-2xl mx-auto mt-4">
            <Link to={createPageUrl("Pricing")}>
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-xl border-2 border-green-300 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Zap className="w-6 h-6 text-white animate-pulse" />
                  <div className="text-center">
                    <div className="text-white font-black text-lg">🔥 Unlock MORE Achievements with PRO Trial</div>
                    <div className="text-green-100 text-sm font-semibold">7 Days Full Access - Only $3.99</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50">
            <CardContent className="p-4 text-center">
              <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-400">{stats.currentStreak}</div>
              <div className="text-sm text-gray-400">Day Streak</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-400">{stats.totalWorkouts}</div>
              <div className="text-sm text-gray-400">Total Workouts</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-400">{stats.totalReps.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Reps</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/50">
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-yellow-400">{achievements.length}</div>
              <div className="text-sm text-gray-400">Unlocked</div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Grid */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              All Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievementDefinitions.map((def) => {
                const unlocked = isUnlocked(def.type);
                const progress = getProgress(def);
                
                return (
                  <motion.div
                    key={def.type}
                    whileHover={{ scale: unlocked ? 1.05 : 1 }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      unlocked
                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50'
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Lock className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className="text-4xl mb-2">{def.icon}</div>
                      <h3 className={`font-bold mb-1 ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {def.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">{def.description}</p>
                      
                      {!unlocked && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-brand-blue to-purple-500 transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</div>
                        </div>
                      )}
                      
                      {unlocked && (
                        <Badge className="bg-yellow-500 text-black text-xs">Unlocked!</Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}