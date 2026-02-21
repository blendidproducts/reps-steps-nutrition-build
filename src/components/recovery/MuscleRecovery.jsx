import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const MUSCLE_GROUPS = [
  { name: "Chest", categories: ["upper_body"], icon: "💪" },
  { name: "Back", categories: ["upper_body"], icon: "🔙" },
  { name: "Shoulders", categories: ["upper_body"], icon: "🏋️" },
  { name: "Arms", categories: ["upper_body"], icon: "💪" },
  { name: "Core", categories: ["core"], icon: "🎯" },
  { name: "Legs", categories: ["lower_body"], icon: "🦵" },
  { name: "Cardio", categories: ["cardio"], icon: "❤️" }
];

export default function MuscleRecovery() {
  const [muscleStatus, setMuscleStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMuscleRecovery();
  }, []);

  const loadMuscleRecovery = async () => {
    try {
      // Get last 14 days of workout sessions
      const sessions = await base44.entities.WorkoutSession.list('-created_date', 50);
      const now = new Date();
      
      const muscleData = MUSCLE_GROUPS.map(muscle => {
        // Find most recent workout for this muscle group
        const relevantSessions = sessions.filter(session => {
          if (!session.exercises_completed) return false;
          return session.exercises_completed.some(ex => {
            // Match by category or exercise name
            const exerciseName = ex.exercise_name?.toLowerCase() || '';
            if (muscle.name === "Chest" && (exerciseName.includes('push') || exerciseName.includes('press'))) return true;
            if (muscle.name === "Back" && (exerciseName.includes('pull') || exerciseName.includes('row'))) return true;
            if (muscle.name === "Shoulders" && exerciseName.includes('shoulder')) return true;
            if (muscle.name === "Arms" && (exerciseName.includes('curl') || exerciseName.includes('tricep'))) return true;
            if (muscle.name === "Core" && (exerciseName.includes('plank') || exerciseName.includes('crunch') || exerciseName.includes('sit'))) return true;
            if (muscle.name === "Legs" && (exerciseName.includes('squat') || exerciseName.includes('lunge') || exerciseName.includes('calf'))) return true;
            if (muscle.name === "Cardio" && (exerciseName.includes('jump') || exerciseName.includes('run') || exerciseName.includes('cardio'))) return true;
            return false;
          });
        });

        const lastWorkout = relevantSessions[0];
        const daysSince = lastWorkout 
          ? Math.floor((now - new Date(lastWorkout.created_date)) / (1000 * 60 * 60 * 24))
          : 99;

        let status = 'rested';
        if (daysSince === 0) status = 'worked_today';
        else if (daysSince === 1) status = 'recovering';
        else if (daysSince >= 2 && daysSince <= 3) status = 'ready';
        else status = 'rested';

        return {
          ...muscle,
          daysSince,
          status,
          lastWorkout: lastWorkout?.created_date
        };
      });

      setMuscleStatus(muscleData);
    } catch (error) {
      console.error('Failed to load muscle recovery:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'worked_today': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'recovering': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'ready': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'rested': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusText = (status, days) => {
    if (status === 'worked_today') return 'Worked Today';
    if (status === 'recovering') return 'Recovering';
    if (status === 'ready') return 'Ready';
    return days > 7 ? 'Needs Attention' : 'Well Rested';
  };

  const getStatusIcon = (status) => {
    if (status === 'worked_today' || status === 'recovering') return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-blue" />
            Muscle Recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-700 rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-blue" />
          Muscle Recovery Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {muscleStatus.map((muscle, idx) => (
            <motion.div
              key={muscle.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(muscle.status)}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{muscle.icon}</span>
                <div>
                  <div className="font-semibold">{muscle.name}</div>
                  <div className="text-xs opacity-80">
                    {muscle.daysSince < 99 ? `${muscle.daysSince}d ago` : 'Not worked'}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                {getStatusIcon(muscle.status)}
                {getStatusText(muscle.status, muscle.daysSince)}
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}