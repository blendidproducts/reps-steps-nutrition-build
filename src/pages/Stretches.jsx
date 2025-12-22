import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Play, Square, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Stretches() {
  const [stretches, setStretches] = useState([]);
  const [activeStretch, setActiveStretch] = useState(null);
  const [stretchTimer, setStretchTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadStretches();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && activeStretch) {
      interval = setInterval(() => {
        setStretchTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeStretch]);

  const loadStretches = async () => {
    try {
      const exercises = await base44.entities.Exercise.list();
      const stretchExercises = exercises.filter(ex => 
        ['Toe Touches', 'Hip Circles', 'Calf Raises', 'Arm Circles Forward', 
         'Arm Circles Backward', 'Tricep Overhead Stretch', 'Cross-Body Arm Stretch', 
         'Chest Opener Stretch', 'Quad Stretch', 'Cat-Cow Stretch'].includes(ex.name)
      );
      setStretches(stretchExercises);
    } catch (error) {
      console.error('Failed to load stretches:', error);
    }
  };

  const startStretch = (stretch, index) => {
    setActiveStretch(stretch);
    setCurrentIndex(index);
    setStretchTimer(0);
    setIsRunning(true);
  };

  const stopStretch = () => {
    setIsRunning(false);
  };

  const nextStretch = () => {
    if (currentIndex < stretches.length - 1) {
      startStretch(stretches[currentIndex + 1], currentIndex + 1);
    } else {
      setActiveStretch(null);
      setIsRunning(false);
      setCurrentIndex(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startFullRoutine = () => {
    if (stretches.length > 0) {
      startStretch(stretches[0], 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Stretching & Mobility</h1>
          <p className="text-white/90">Dynamic stretches and mobility exercises</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Active Stretch Display */}
        <AnimatePresence>
          {activeStretch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-br from-brand-blue/20 to-purple-500/20 border-brand-blue/50">
                <CardContent className="p-6 text-center">
                  <Badge className="mb-4 bg-brand-blue">
                    Stretch {currentIndex + 1} of {stretches.length}
                  </Badge>
                  <h2 className="text-3xl font-bold mb-4">{activeStretch.name}</h2>
                  <div className="text-6xl font-bold mb-4 text-brand-blue">
                    {formatTime(stretchTimer)}
                  </div>
                  <p className="text-gray-300 mb-6">{activeStretch.description}</p>
                  
                  <div className="flex gap-3 justify-center">
                    {isRunning ? (
                      <Button onClick={stopStretch} size="lg" className="bg-yellow-500 hover:bg-yellow-600">
                        <Square className="w-5 h-5 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button onClick={() => setIsRunning(true)} size="lg" className="gradient-bg">
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button onClick={nextStretch} size="lg" className="bg-green-500 hover:bg-green-600">
                      Next Stretch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Start */}
        {!activeStretch && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={startFullRoutine} size="lg" className="w-full gradient-bg">
                <Play className="w-5 h-5 mr-2" />
                Start Full Stretching Routine (5 minutes)
              </Button>
              <p className="text-sm text-gray-400 mt-3 text-center">
                Perfect warm-up before any workout • 10-30 seconds per stretch
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stretch Library */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-brand-blue" />
              Stretch Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {stretches.map((stretch, index) => (
                <div
                  key={stretch.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-brand-blue ${
                    activeStretch?.id === stretch.id
                      ? 'bg-brand-blue/20 border-brand-blue'
                      : 'bg-background border-border'
                  }`}
                  onClick={() => startStretch(stretch, index)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-white">{stretch.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {stretch.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{stretch.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {stretch.muscle_groups?.map(muscle => (
                      <Badge key={muscle} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
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