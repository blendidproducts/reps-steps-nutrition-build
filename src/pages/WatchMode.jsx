import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle2, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WatchMode() {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [repsCompleted, setRepsCompleted] = useState(0);

  useEffect(() => {
    checkActiveWorkout();
  }, []);

  useEffect(() => {
    if (!isPaused && activeWorkout) {
      const interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, activeWorkout]);

  const checkActiveWorkout = async () => {
    const savedState = localStorage.getItem('activeWorkoutState');
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.workout) {
        setActiveWorkout(state.workout);
        setCurrentExercise(state.currentExerciseIndex || 0);
        setTimer(state.timer || 0);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completeExercise = () => {
    if (currentExercise < activeWorkout.exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setRepsCompleted(0);
    } else {
      navigate(createPageUrl("WorkoutComplete"));
    }
  };

  if (!activeWorkout) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-[280px]">
          <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h1 className="text-xl font-bold mb-2">Watch Mode</h1>
          <p className="text-sm text-gray-400 mb-4">Simplified interface for small screens</p>
          <Button 
            onClick={() => navigate(createPageUrl("Exercises"))}
            className="w-full bg-blue-600"
          >
            Start Workout
          </Button>
        </div>
      </div>
    );
  }

  const exercise = activeWorkout.exercises[currentExercise];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Timer Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-center">
        <div className="text-3xl font-bold font-mono">{formatTime(timer)}</div>
        <div className="text-xs opacity-80">Exercise {currentExercise + 1}/{activeWorkout.exercises.length}</div>
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{exercise.exercise_name}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {exercise.target_reps} reps
            </div>
            {exercise.sets > 1 && (
              <div>×{exercise.sets} sets</div>
            )}
          </div>
        </div>

        {/* Big Rep Counter */}
        <div className="text-8xl font-bold text-blue-400 mb-8">
          {repsCompleted}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 w-full max-w-[280px]">
          <Button
            onClick={() => setRepsCompleted(prev => Math.max(0, prev - 1))}
            variant="outline"
            className="flex-1 h-14 text-lg"
          >
            -1
          </Button>
          <Button
            onClick={() => setRepsCompleted(prev => prev + 1)}
            className="flex-1 h-14 text-lg bg-blue-600"
          >
            +1
          </Button>
        </div>

        <Button
          onClick={completeExercise}
          className="w-full max-w-[280px] mt-4 h-12 bg-green-600"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Complete
        </Button>
      </div>

      {/* Pause Button */}
      <div className="p-4">
        <Button
          onClick={() => setIsPaused(!isPaused)}
          variant="outline"
          className="w-full"
        >
          {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}