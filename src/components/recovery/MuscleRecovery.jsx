import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  const [isExpanded, setIsExpanded] = useState(false);

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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-brand-blue" />
              Muscle Recovery Tracker
            </CardTitle>
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Get summary counts
  const needsAttention = muscleStatus.filter(m => m.daysSince > 7).length;
  const recovering = muscleStatus.filter(m => m.status === 'recovering' || m.status === 'worked_today').length;
  const ready = muscleStatus.filter(m => m.status === 'ready' || m.status === 'rested').length;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base mb-2">
              <Activity className="w-5 h-5 text-brand-blue" />
              Muscle Recovery Tracker
            </CardTitle>
            {!isExpanded && (
              <div className="flex gap-2 text-xs">
                {ready > 0 && <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">{ready} Ready</Badge>}
                {recovering > 0 && <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50">{recovering} Recovering</Badge>}
                {needsAttention > 0 && <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">{needsAttention} Rested</Badge>}
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="grid gap-2">
                {muscleStatus.map((muscle, idx) => (
                  <motion.div
                    key={muscle.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(muscle.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{muscle.icon}</span>
                      <div>
                        <div className="font-semibold text-sm">{muscle.name}</div>
                        <div className="text-xs opacity-80">
                          {muscle.daysSince < 99 ? `${muscle.daysSince}d ago` : 'Not worked'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {getStatusIcon(muscle.status)}
                      {getStatusText(muscle.status, muscle.daysSince)}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}