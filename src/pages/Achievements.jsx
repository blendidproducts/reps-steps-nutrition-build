import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Flame, Award, Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { AchievementManager } from "@/components/services/achievementManager";
import AchievementUnlockedPopup from "@/components/achievements/AchievementUnlockedPopup";

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalReps: 0,
    earnedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(null);

  useEffect(() => {
    initializeAndLoad();
  }, []);

  const initializeAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      await AchievementManager.initializeUserAchievements(user.email);
      await loadAchievements();
    } catch (error) {
      console.error('Failed to initialize:', error);
      setIsLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      const user = await base44.auth.me();
      const sessions = await base44.entities.WorkoutSession.list('-created_date');
      
      const achievementData = await AchievementManager.getAchievementProgress(user.email);
      console.log('Achievement data loaded:', achievementData);
      console.log('Total achievements:', achievementData.length);
      console.log('Visible achievements:', achievementData.filter(a => a.is_visible).length);
      
      setAchievements(achievementData);
      
      const totalWorkouts = sessions.length;
      const totalReps = sessions.reduce((sum, s) => sum + (s.total_reps || 0), 0);
      const earnedCount = achievementData.filter(a => a.earned_date).length;
      
      setStats({
        totalWorkouts,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        totalReps,
        earnedCount
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {showPopup && (
        <AchievementUnlockedPopup 
          achievement={showPopup} 
          onClose={() => setShowPopup(null)} 
        />
      )}
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
              <div className="text-3xl font-bold text-yellow-400">{stats.earnedCount}</div>
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
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading achievements...</div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No achievements found. Complete a workout to start earning badges!</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievements.filter(a => a.is_visible).map((achievement) => {
                const isEarned = !!achievement.earned_date;
                
                return (
                  <motion.div
                    key={achievement.achievement_type}
                    whileHover={{ scale: isEarned ? 1.05 : 1 }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isEarned
                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50'
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    {!isEarned && (
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                        <Lock className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <img 
                        src={achievement.icon_url} 
                        alt={achievement.title}
                        className={`w-20 h-20 mx-auto mb-2 ${!isEarned ? 'opacity-30 grayscale' : ''}`}
                      />
                      <h3 className={`font-bold mb-1 text-sm ${isEarned ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {achievement.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">{achievement.description}</p>
                      
                      {!isEarned && (
                        <div className="mt-2 relative z-10">
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-brand-blue to-purple-500 transition-all duration-500"
                              style={{ width: `${achievement.progress_percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {achievement.progress.toLocaleString()} / {achievement.target.toLocaleString()} ({Math.round(achievement.progress_percentage)}%)
                          </div>
                        </div>
                      )}
                      
                      {isEarned && (
                        <Badge className="bg-yellow-500 text-black text-xs mt-2">Unlocked!</Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}