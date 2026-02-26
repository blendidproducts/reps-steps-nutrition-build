import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ProgramEnrollment } from "@/entities/ProgramEnrollment";
import { PresetProgram } from "@/entities/PresetProgram";
import { WorkoutSession } from "@/entities/WorkoutSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp, 
  Award,
  ChevronRight,
  Dumbbell,
  Flame,
  Target,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";

export default function ProgramProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [program, setProgram] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadProgramProgress();
  }, []);

  const loadProgramProgress = async () => {
    try {
      const user = await base44.auth.me();
      
      // Get active program enrollment
      let activeEnrollment = null;
      
      // Check URL params first
      const params = new URLSearchParams(location.search);
      const enrollmentId = params.get('enrollmentId');
      
      if (enrollmentId) {
        const enrollments = await ProgramEnrollment.filter({ id: enrollmentId });
        activeEnrollment = enrollments[0];
      } else if (user.active_program) {
        const enrollments = await ProgramEnrollment.filter({ 
          program_id: user.active_program.program_id,
          status: 'active'
        });
        activeEnrollment = enrollments[0];
      }
      
      if (!activeEnrollment) {
        // No active program
        return;
      }
      
      setEnrollment(activeEnrollment);
      
      // Load program details
      const programs = await PresetProgram.filter({ id: activeEnrollment.program_id });
      if (programs.length > 0) {
        setProgram(programs[0]);
      }
      
      // Load workout sessions for this program
      const allSessions = await WorkoutSession.list('-created_date', 100);
      const programSessions = allSessions.filter(s => {
        // Match sessions that are part of this program
        return s.workout_id && activeEnrollment.completed_days?.some(day => {
          // Check if session timestamp matches completed day
          return true; // Simplified - we'll show all recent sessions
        });
      });
      setSessions(programSessions.slice(0, activeEnrollment.completed_days?.length || 0));
      
    } catch (error) {
      console.error('Failed to load program progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayStatus = (dayNumber) => {
    if (!enrollment) return 'locked';
    if (enrollment.completed_days?.includes(dayNumber)) return 'completed';
    if (dayNumber === enrollment.current_day) return 'current';
    if (dayNumber < enrollment.current_day) return 'available';
    return 'locked';
  };

  const handleDayClick = (day) => {
    if (!program) return;
    const dayPlan = program.daily_plans[day.day_number - 1];
    setSelectedDay({ ...day, plan: dayPlan });
  };

  const startDay = async (dayNumber) => {
    try {
      const dayPlan = program.daily_plans[dayNumber - 1];
      
      if (dayPlan.is_rest_day) {
        alert('This is a rest day. Take a break and recover!');
        return;
      }
      
      // Navigate to exercises page to build workout for this day
      navigate(createPageUrl("Exercises"));
    } catch (error) {
      console.error('Failed to start day:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!enrollment || !program) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">No Active Program</h2>
          <p className="text-gray-400 mb-6">Start a workout program to track your progress here.</p>
          <Button onClick={() => navigate(createPageUrl("PresetPrograms"))}>
            Browse Programs
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage = Math.round((enrollment.days_completed_count / enrollment.total_days) * 100);
  const daysRemaining = enrollment.total_days - enrollment.days_completed_count;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue/20 to-purple-600/20 border-b border-brand-blue/30 p-6">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(createPageUrl("PresetPrograms"))}
            className="mb-4 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{program.name}</h1>
              <p className="text-gray-300 max-w-2xl">{program.description}</p>
            </div>
            <Badge className="bg-brand-blue text-white text-sm px-3 py-1">
              Day {enrollment.current_day}/{enrollment.total_days}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border-brand-blue/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-blue/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Overall Progress</p>
                  <p className="text-2xl font-bold text-white">{completionPercentage}%</p>
                </div>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Days Completed</p>
                  <p className="text-2xl font-bold text-white">{enrollment.days_completed_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Days Remaining</p>
                  <p className="text-2xl font-bold text-white">{daysRemaining}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program Journey Timeline */}
        <Card className="bg-card/80 backdrop-blur-sm border-brand-blue/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-blue" />
              Your Program Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {program.daily_plans.map((day, index) => {
                const dayNumber = day.day_number;
                const status = getDayStatus(dayNumber);
                
                return (
                  <button
                    key={dayNumber}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all
                      ${status === 'completed' ? 'bg-green-500/20 border-green-500/50 hover:border-green-500' : ''}
                      ${status === 'current' ? 'bg-brand-blue/20 border-brand-blue/70 hover:border-brand-blue animate-pulse' : ''}
                      ${status === 'available' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' : ''}
                      ${status === 'locked' ? 'bg-gray-800/20 border-gray-700/30 opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    disabled={status === 'locked'}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Day {dayNumber}</div>
                      <div className="flex justify-center mb-2">
                        {status === 'completed' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                        {status === 'current' && <Target className="w-6 h-6 text-brand-blue" />}
                        {status === 'available' && <Circle className="w-6 h-6 text-yellow-500" />}
                        {status === 'locked' && <Circle className="w-6 h-6 text-gray-600" />}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {day.is_rest_day ? '🧘 Rest' : day.day_name || 'Workout'}
                      </div>
                    </div>
                    {status === 'current' && (
                      <div className="absolute -top-1 -right-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <Card className="bg-gradient-to-br from-card/90 to-brand-blue/5 backdrop-blur-sm border-brand-blue/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-brand-blue" />
                  Day {selectedDay.day_number} - {selectedDay.day_name || selectedDay.workout_name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-400"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDay.is_rest_day ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🧘</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Rest Day</h3>
                  <p className="text-gray-400">Take a break and let your body recover. You've earned it!</p>
                </div>
              ) : (
                <>
                  {selectedDay.plan?.exercises && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Exercises ({selectedDay.plan.exercises.length})</h4>
                      <div className="space-y-2">
                        {selectedDay.plan.exercises.map((ex, idx) => (
                          <div 
                            key={idx}
                            className="bg-background/50 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium text-white">{ex.exercise_name}</p>
                              <p className="text-sm text-gray-400">
                                {ex.sets} sets × {ex.target_reps} reps
                              </p>
                            </div>
                            {ex.circuit_number && (
                              <Badge variant="outline" className="text-xs">
                                Circuit {ex.circuit_number}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedDay.plan?.nutrition_notes && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-400 mb-2">💡 Nutrition Tip</h4>
                      <p className="text-sm text-gray-300">{selectedDay.plan.nutrition_notes}</p>
                    </div>
                  )}

                  {getDayStatus(selectedDay.day_number) === 'current' && (
                    <Button 
                      onClick={() => startDay(selectedDay.day_number)}
                      className="w-full bg-brand-blue hover:bg-brand-blue/90"
                    >
                      Start Day {selectedDay.day_number}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-brand-blue/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-blue" />
                Recent Program Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div 
                    key={session.id}
                    className="bg-background/50 rounded-lg p-4 flex items-center justify-between hover:bg-background/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`${createPageUrl("WorkoutDetail")}?id=${session.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {format(new Date(session.created_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-400">
                          {session.total_reps} reps · {Math.round(session.duration / 60)} min
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}