import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '@/entities/Exercise';
import { createPageUrl } from '@/utils';
import { Zap } from 'lucide-react';

export default function RandomWorkout() {
  const navigate = useNavigate();

  useEffect(() => {
    const generateWorkout = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const workoutType = urlParams.get('type') || 'mix';
      
      const allExercises = await Exercise.list();
      let filteredExercises = allExercises;
      
      // Filter based on workout type
      if (workoutType === 'upper') {
        filteredExercises = allExercises.filter(ex => 
          ex.category === 'upper_body' || 
          (ex.muscle_groups && ex.muscle_groups.some(mg => 
            ['chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps'].includes(mg.toLowerCase())
          ))
        );
      } else if (workoutType === 'lower') {
        filteredExercises = allExercises.filter(ex => 
          ex.category === 'lower_body' || 
          (ex.muscle_groups && ex.muscle_groups.some(mg => 
            ['legs', 'quads', 'hamstrings', 'glutes', 'calves'].includes(mg.toLowerCase())
          ))
        );
      }
      // For 'mix', use all exercises
      
      // Simple shuffle and pick 5-7 exercises
      const shuffled = filteredExercises.sort(() => 0.5 - Math.random());
      const selectedExercises = shuffled.slice(0, Math.floor(Math.random() * 3) + 5); // 5-7 exercises
      
      const exerciseIds = selectedExercises.map(ex => ex.id);

      // Redirect to builder with pre-selected exercises
      if (exerciseIds.length > 0) {
        navigate(`${createPageUrl("WorkoutBuilder")}?exercises=${exerciseIds.join(',')}`);
      } else {
        // Fallback if no exercises are found
        navigate(createPageUrl("Exercises"));
      }
    };

    generateWorkout();
  }, [navigate]);

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }} className="flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-brand-blue/50 rounded-full animate-ping"></div>
          <div className="relative gradient-bg text-white rounded-full w-24 h-24 flex items-center justify-center">
            <Zap className="w-12 h-12" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Generating Your AI Workout...</h1>
        <p className="text-gray-400">Please wait while we craft a unique challenge for you!</p>
      </div>
    </div>
  );
}