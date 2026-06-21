import React, { useState, useEffect } from "react";
import { WorkoutSession } from "@/entities/WorkoutSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Target, TrendingUp, ArrowLeft, Zap, Dumbbell, Footprints, Route } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WorkoutDetail() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    
    if (!sessionId) {
      navigate(createPageUrl("History"));
      return;
    }

    const sessions = await WorkoutSession.filter({ id: sessionId });
    if (sessions.length > 0) {
      setSession(sessions[0]);
    } else {
      navigate(createPageUrl("History"));
    }
    setIsLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-blue mx-auto mb-4"></div>
          <div className="text-xl">Loading workout details...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb', paddingBottom: '80px' }}>
      {/* Mobile Header with Back Button */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0a1628]/95 backdrop-blur-lg border-b border-brand-blue/30 px-4 py-3 select-none">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:text-brand-blue flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate">Workout Details</h1>
            <p className="text-xs text-white/70 truncate">
              {format(new Date(session.start_time), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("History"))}
            className="mb-4 text-white hover:text-brand-blue select-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <h1 className="text-3xl font-bold mb-2">Workout Details</h1>
          <p className="text-lg text-white/90">
            {format(new Date(session.start_time), 'MMMM d, yyyy - h:mm a')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{formatTime(session.duration)}</div>
              <p className="text-xs text-gray-400">Duration</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{session.total_reps}</div>
              <p className="text-xs text-gray-400">Total Reps</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Footprints className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{session.cardio_analytics?.total_steps?.toLocaleString() || 0}</div>
              <p className="text-xs text-gray-400">Total Steps</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{Math.round(session.calories_burned || 0)}</div>
              <p className="text-xs text-gray-400">Calories</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Dumbbell className="w-6 h-6 text-brand-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{session.exercises_completed?.length || 0}</div>
              <p className="text-xs text-gray-400">Exercises</p>
            </CardContent>
          </Card>
        </div>

        {session.weight_added_lbs > 0 && (
          <Card className="mb-6 bg-card border-brand-blue/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <Dumbbell className="w-5 h-5 text-brand-blue" />
                <span className="text-lg font-bold">Weight Vest: {session.weight_added_lbs} LBS</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cardio Analytics */}
        {session.cardio_analytics && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-blue" />
                Active Recovery Cardio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session.cardio_analytics?.total_steps > 0 && (
              <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-brand-blue text-lg mb-2">Total Cardio Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Steps</p>
                    <p className="text-2xl font-bold text-white">{session.cardio_analytics.total_steps.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Distance</p>
                    <p className="text-2xl font-bold text-white">{session.cardio_analytics.total_distance_miles} miles</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
                {session.cardio_analytics.walk && session.cardio_analytics.walk.count > 0 && (
                  <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Footprints className="w-5 h-5 text-green-400" />
                      <h3 className="font-bold text-green-400">WALK</h3>
                    </div>
                    <p className="text-sm text-gray-300">Count: {session.cardio_analytics.walk.count}</p>
                    <p className="text-sm text-gray-300">Total: {formatTime(session.cardio_analytics.walk.total_time)}</p>
                    <p className="text-sm text-gray-300">Avg: {formatTime(session.cardio_analytics.walk.avg_time)}</p>
                    {session.cardio_analytics.walk.total_steps > 0 && (
                      <>
                        <p className="text-sm text-green-400 font-bold mt-2">Steps: {session.cardio_analytics.walk.total_steps.toLocaleString()}</p>
                        <p className="text-sm text-green-400 font-bold">Distance: {session.cardio_analytics.walk.total_distance_miles} mi</p>
                      </>
                    )}
                  </div>
                )}

                {session.cardio_analytics.jog && session.cardio_analytics.jog.count > 0 && (
                  <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Route className="w-5 h-5 text-yellow-400" />
                      <h3 className="font-bold text-yellow-400">JOG</h3>
                    </div>
                    <p className="text-sm text-gray-300">Count: {session.cardio_analytics.jog.count}</p>
                    <p className="text-sm text-gray-300">Total: {formatTime(session.cardio_analytics.jog.total_time)}</p>
                    <p className="text-sm text-gray-300">Avg: {formatTime(session.cardio_analytics.jog.avg_time)}</p>
                    {session.cardio_analytics.jog.total_steps > 0 && (
                      <>
                        <p className="text-sm text-yellow-400 font-bold mt-2">Steps: {session.cardio_analytics.jog.total_steps.toLocaleString()}</p>
                        <p className="text-sm text-yellow-400 font-bold">Distance: {session.cardio_analytics.jog.total_distance_miles} mi</p>
                      </>
                    )}
                  </div>
                )}

                {session.cardio_analytics.sprint && session.cardio_analytics.sprint.count > 0 && (
                  <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-red-400" />
                      <h3 className="font-bold text-red-400">SPRINT</h3>
                    </div>
                    <p className="text-sm text-gray-300">Count: {session.cardio_analytics.sprint.count}</p>
                    <p className="text-sm text-gray-300">Total: {formatTime(session.cardio_analytics.sprint.total_time)}</p>
                    <p className="text-sm text-gray-300">Longest: {formatTime(session.cardio_analytics.sprint.longest_sprint)}</p>
                    <p className="text-sm text-gray-300">Avg: {formatTime(session.cardio_analytics.sprint.avg_time)}</p>
                    {session.cardio_analytics.sprint.total_steps > 0 && (
                      <>
                        <p className="text-sm text-red-400 font-bold mt-2">Steps: {session.cardio_analytics.sprint.total_steps.toLocaleString()}</p>
                        <p className="text-sm text-red-400 font-bold">Distance: {session.cardio_analytics.sprint.total_distance_miles} mi</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exercises Completed */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Exercises Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.exercises_completed?.map((exercise, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg mb-2">{exercise.exercise_name}</h3>
                      <div className="flex flex-wrap gap-3">
                        {exercise.reps_completed > 0 && (
                          <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-500/30">
                            {exercise.reps_completed} reps
                          </Badge>
                        )}
                        {exercise.time_spent > 0 && (
                          <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                            {formatTime(exercise.time_spent)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-brand-blue">#{index + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}