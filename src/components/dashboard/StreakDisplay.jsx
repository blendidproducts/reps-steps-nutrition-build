import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Trophy, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getStreakStatus, debugStreak } from '@/components/services/streakManager';
import { motion } from 'framer-motion';

export default function StreakDisplay() {
  const [user, setUser] = useState(null);
  const [streakStatus, setStreakStatus] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    loadStreakData();
  }, []);

  const loadStreakData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const status = getStreakStatus(userData);
      setStreakStatus(status);
      setDebugInfo(debugStreak(userData));
    } catch (error) {
      console.error('Failed to load streak data:', error);
    }
  };

  if (!streakStatus) return null;

  return (
    <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10">
      <CardContent className="p-6">
        {/* Current Streak */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-10 h-10 text-orange-500" />
            </motion.div>
            <div>
              <div className="text-sm text-gray-400">Current Streak</div>
              <div className="text-4xl font-bold text-orange-400">
                {streakStatus.current} 
                <span className="text-lg text-gray-400 ml-1">days</span>
              </div>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="text-right">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
            <div className="text-xs text-gray-400">Best</div>
            <div className="text-2xl font-bold text-yellow-400">{streakStatus.longest}</div>
          </div>
        </div>

        {/* Warning if streak will break tonight */}
        {streakStatus.willBreakTonight && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="text-sm text-red-400">
              <strong>⚠️ Streak Alert!</strong> Complete a workout today to keep your {streakStatus.current}-day streak alive!
            </div>
          </div>
        )}

        {/* Active Today Indicator */}
        <div className="flex items-center justify-between bg-background rounded-lg p-3">
          <span className="text-sm text-gray-400">Today's Activity</span>
          {streakStatus.isActiveToday ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              ✓ Completed
            </span>
          ) : (
            <span className="text-yellow-400 font-bold">Pending</span>
          )}
        </div>

        {/* Debug Toggle */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-gray-500 hover:text-gray-300 mt-3 underline"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>

        {/* Debug Information */}
        {showDebug && debugInfo && (
          <div className="mt-3 bg-black/50 rounded-lg p-3 text-xs font-mono">
            <div className="text-gray-400 mb-2">Debug Information:</div>
            <div className="space-y-1 text-gray-300">
              <div>Today: {debugInfo.today}</div>
              <div>Last Activity: {debugInfo.lastActivityDate || 'Never'}</div>
              <div>Day Difference: {debugInfo.dayDifference ?? 'N/A'}</div>
              <div>Current Streak: {debugInfo.currentStreak}</div>
              <div>Longest Streak: {debugInfo.longestStreak}</div>
              <div>Is Active Today: {debugInfo.isActiveToday ? 'Yes' : 'No'}</div>
              <div>Timezone: {debugInfo.timezone}</div>
              <div>Timestamp: {debugInfo.timestamp}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}