import React, { useState, useEffect } from "react";
import { WorkoutSession } from "@/entities/WorkoutSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Target, TrendingUp, Share2, Footprints, Download, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import JSZip from 'jszip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MobileDrawerSelect from "@/components/MobileDrawerSelect";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import PullToRefresh from "@/components/PullToRefresh";

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalReps: 0,
    totalTime: 0,
    avgDuration: 0,
    caloriesBurned: 0
  });
  const [chartData, setChartData] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);
  
  useEffect(() => {
    if (sessions.length > 0) {
      const exerciseSet = new Set();
      sessions.forEach(session => {
        session.exercises_completed?.forEach(ex => {
          if (ex.exercise_name) { // Ensure exercise name is not empty
            exerciseSet.add(ex.exercise_name);
          }
        });
      });
      const exercises = Array.from(exerciseSet).sort();
      setAllExercises(exercises);
      if (exercises.length > 0 && !selectedExercise) {
        setSelectedExercise(exercises[0]);
      } else if (exercises.length === 0) {
        // If no exercises are found, ensure selectedExercise is cleared or set to a default.
        // If selectedExercise was a valid exercise but now no exercises exist,
        // it should be cleared to prevent an invalid value in the select component.
        setSelectedExercise('');
      } else if (selectedExercise && !exercises.includes(selectedExercise)) {
        // If the previously selected exercise is no longer in the list (e.g., after data refresh)
        // default to the first available exercise.
        setSelectedExercise(exercises[0]);
      }
    } else {
      // If there are no sessions, clear exercises and selectedExercise
      setAllExercises([]);
      setSelectedExercise('');
    }
  }, [sessions]);

  useEffect(() => {
    if (selectedExercise && sessions.length > 0) {
      const data = sessions
        .map(session => {
          const exercise = session.exercises_completed?.find(ex => ex.exercise_name === selectedExercise);
          if (exercise) {
            // Determine the value for reps/seconds. Prioritize reps, then time_spent if reps is 0.
            const reps = exercise.reps_completed > 0 ? exercise.reps_completed : exercise.time_spent;
            // weightedRepsValue should only be present if a weight was added AND there were reps/time spent.
            const weightedRepsValue = session.weight_added_lbs > 0 && reps > 0
              ? reps
              : null;

            return {
              date: format(new Date(session.start_time), 'MMM d'),
              reps: reps,
              weighted_reps: weightedRepsValue
            };
          }
          return null;
        })
        .filter(Boolean)
        .reverse(); // Display most recent last for chart
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [selectedExercise, sessions]);


  const loadHistory = async () => {
    setIsLoading(true);
    const data = await WorkoutSession.list('-created_date');
    setSessions(data);
    
    const totalWorkouts = data.length;
    const totalReps = data.reduce((sum, session) => sum + (session.total_reps || 0), 0);
    const totalTime = data.reduce((sum, session) => sum + (session.duration || 0), 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalTime / totalWorkouts) : 0;
    const caloriesBurned = data.reduce((sum, session) => sum + (session.calories_burned || 0), 0);
    
    setStats({ totalWorkouts, totalReps, totalTime, avgDuration, caloriesBurned });
    setIsLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const generateTCX = (session) => {
    const startTime = new Date(session.start_time).toISOString();
    const duration = session.duration || 0;
    const calories = Math.round(session.calories_burned || 0);
    const distanceMeters = (session.cardio_analytics?.total_distance_miles || 0) * 1609.34;
    
    // COROS supports Run, Bike, Pool Swim, Strength, Multisports, etc.
    const sportType = distanceMeters > 0 ? "Run" : "Strength";
    
    // Using Garmin schema as it is the standard format for TCX that most platforms (including COROS) accept.
    return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd"
  xmlns:ns5="http://www.garmin.com/xmlschemas/ActivityGoals/v1"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"
  xmlns:ns2="http://www.garmin.com/xmlschemas/UserProfile/v2"
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns4="http://www.garmin.com/xmlschemas/ProfileExtension/v1">
  <Activities>
    <Activity Sport="${sportType}">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${duration}</TotalTimeSeconds>
        <DistanceMeters>${distanceMeters}</DistanceMeters>
        <Calories>${calories}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
          <Trackpoint>
            <Time>${startTime}</Time>
          </Trackpoint>
        </Track>
      </Lap>
      <Creator xsi:type="Application_t">
        <Name>Reps &amp; Steps</Name>
        <Build>
          <Version>
            <VersionMajor>1</VersionMajor>
            <VersionMinor>0</VersionMinor>
            <BuildMajor>0</BuildMajor>
            <BuildMinor>0</BuildMinor>
          </Version>
        </Build>
        <LangID>en</LangID>
        <PartNumber>000-00000-00</PartNumber>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
  };

  const exportWorkoutToTCX = (session) => {
    const tcx = generateTCX(session);
    const startTime = new Date(session.start_time).toISOString();

    const blob = new Blob([tcx], { type: 'application/vnd.garmin.tcx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workout_${startTime.split('T')[0]}.tcx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workout exported as TCX!');
  };

  const exportAllWorkoutsToZip = async () => {
    if (!sessions || sessions.length === 0) {
      toast.error('No workouts to export.');
      return;
    }
    
    toast.loading('Generating zip file...');
    
    try {
      const zip = new JSZip();
      
      sessions.forEach(session => {
        const tcx = generateTCX(session);
        const startTime = new Date(session.start_time).toISOString();
        zip.file(`Workout_${startTime.split('T')[0]}_${session.id}.tcx`, tcx);
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `All_Workouts_Export.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('All workouts exported to ZIP!');
    } catch (error) {
      console.error('Failed to generate zip:', error);
      toast.dismiss();
      toast.error('Failed to export workouts.');
    }
  };

  const handleImportTCX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        const activities = xmlDoc.getElementsByTagName('Activity');
        if (activities.length === 0) throw new Error("No activities found in TCX");
        
        let importedCount = 0;
        for (let i = 0; i < activities.length; i++) {
          const activity = activities[i];
          const idNode = activity.getElementsByTagName('Id')[0];
          const startTime = idNode ? idNode.textContent : new Date().toISOString();
          
          let duration = 0;
          let distanceMeters = 0;
          let calories = 0;
          
          const laps = activity.getElementsByTagName('Lap');
          for (let j = 0; j < laps.length; j++) {
            const timeNode = laps[j].getElementsByTagName('TotalTimeSeconds')[0];
            const distNode = laps[j].getElementsByTagName('DistanceMeters')[0];
            const calNode = laps[j].getElementsByTagName('Calories')[0];
            
            if (timeNode) duration += parseFloat(timeNode.textContent);
            if (distNode) distanceMeters += parseFloat(distNode.textContent);
            if (calNode) calories += parseFloat(calNode.textContent);
          }
          
          await base44.entities.WorkoutSession.create({
            workout_id: "imported_tcx",
            start_time: startTime,
            end_time: new Date(new Date(startTime).getTime() + duration * 1000).toISOString(),
            duration: Math.round(duration),
            calories_burned: Math.round(calories),
            notes: "Imported from TCX",
            cardio_analytics: {
              total_distance_miles: parseFloat((distanceMeters / 1609.34).toFixed(2))
            }
          });
          importedCount++;
        }
        
        toast.success(`Imported ${importedCount} workout(s) successfully!`);
        loadHistory();
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse TCX file. Make sure it is a valid TCX format.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const shareWorkout = async (session) => {
    const text = `Just completed a ${formatTime(session.duration)} workout with Reps & Steps! Crushed ${session.total_reps} reps. 🔥 #RepsAndSteps #Calisthenics`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Workout Complete!',
          text: text,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Workout stats copied to clipboard!');
      }
    } catch (error) {
      console.error("Share failed:", error);
      await navigator.clipboard.writeText(text);
      toast.info('Share failed, copied to clipboard instead!');
    }
  };

  return (
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb', paddingBottom: '80px' }}>
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Workout History</h1>
              <p className="text-lg text-white/90">
                Track your fitness journey and celebrate your progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportAllWorkoutsToZip} variant="secondary" className="gap-2 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border-0">
                <Download className="w-4 h-4" /> Export All
              </Button>
              <Button onClick={() => document.getElementById('tcx-upload').click()} variant="secondary" className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0">
                <Upload className="w-4 h-4" /> Import TCX
              </Button>
              <input type="file" id="tcx-upload" className="hidden" accept=".tcx,.xml" onChange={handleImportTCX} />
            </div>
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={loadHistory}>
      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[
            {label: 'Workouts', value: stats.totalWorkouts, color: 'text-brand-blue'},
            {label: 'Total Reps', value: stats.totalReps.toLocaleString(), color: 'text-green-400'},
            {label: 'Total Steps', value: sessions.reduce((sum, s) => sum + (s.cardio_analytics?.total_steps || 0), 0).toLocaleString(), color: 'text-purple-400'},
            {label: 'Total Time', value: formatTime(stats.totalTime), color: 'text-yellow-400'},
            {label: 'Avg. Time', value: formatTime(stats.avgDuration), color: 'text-orange-400'},
            {label: 'Calories', value: Math.round(stats.caloriesBurned), color: 'text-red-400'},
          ].map(stat => (
             <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Analytics */}
        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle>Progress Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Label className="text-sm font-medium shrink-0">Exercise:</Label>
              <div className="w-full max-w-[220px]">
                <MobileDrawerSelect
                  value={selectedExercise}
                  onValueChange={setSelectedExercise}
                  options={allExercises.length > 0
                    ? allExercises.map(ex => ({ value: ex, label: ex }))
                    : [{ value: "no-data", label: "No exercises in history" }]
                  }
                  placeholder="Select an exercise"
                  label="Select Exercise"
                />
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 12}} />
                  <YAxis stroke="#9ca3af" tick={{fontSize: 12}}/>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey="reps" stroke="#00a9ff" name="Reps / Seconds" yAxisId={0} />
                  <Line type="monotone" dataKey="weighted_reps" stroke="#22c55e" name="Weighted" yAxisId={0} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">
                {isLoading ? "Loading chart data..." : "Complete some workouts to see your progress!"}
              </p>
            )}
          </CardContent>
        </Card>


        {/* Workout Sessions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Recent Workouts</h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading history...</div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="bg-card border-border hover:border-brand-blue/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Navigate to workout detail view
                    window.location.href = createPageUrl("WorkoutDetail") + `?sessionId=${session.id}`;
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-base font-semibold">
                            {format(new Date(session.start_time), 'MMMM d, yyyy')}
                          </span>
                          <Badge variant="outline" className="border-border">
                            {format(new Date(session.start_time), 'h:mm a')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{formatTime(session.duration)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-400" />
                            <span className="text-sm">{session.total_reps} reps</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Footprints className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{session.cardio_analytics?.total_steps?.toLocaleString() || 0} steps</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-red-400" />
                            <span className="text-sm">{Math.round(session.calories_burned || 0)} cal</span>
                          </div>
                          {session.weight_added_lbs > 0 && (
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-400">VEST:</span>
                                <span className="text-sm">{session.weight_added_lbs} lbs</span>
                             </div>
                          )}
                        </div>
                        
                        {session.exercises_completed?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {session.exercises_completed.slice(0, 5).map((exercise, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                {exercise.exercise_name}
                              </Badge>
                            ))}
                            {session.exercises_completed.length > 5 && (
                              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                +{session.exercises_completed.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                      </div>
                      
                      <div className="flex flex-col gap-1 ml-2">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); shareWorkout(session); }} aria-label="Share this workout" className="text-gray-400 hover:text-brand-blue h-8 w-8">
                          <Share2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); exportWorkoutToTCX(session); }} aria-label="Export to TCX" className="text-gray-400 hover:text-emerald-400 h-8 w-8">
                          <Download className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <div className="text-gray-600 mb-4">
                  <Target className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No workouts yet</h3>
                <p className="text-gray-400 mb-6">
                  Complete your first workout to see it here.
                </p>
                <Button 
                  className="gradient-bg text-white hover:opacity-90"
                  onClick={() => window.location.href = createPageUrl("Exercises")}
                >
                  Start Your First Workout
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </PullToRefresh>
    </div>
  );
}