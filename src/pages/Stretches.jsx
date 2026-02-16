import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Play, Square, RotateCcw, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Exercise3DViewer from "@/components/Exercise3DViewer";

export default function Stretches() {
  const [stretches, setStretches] = useState([]);
  const [activeStretch, setActiveStretch] = useState(null);
  const [stretchTimer, setStretchTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);
  const [show3DView, setShow3DView] = useState(false);
  const [selectedStretch, setSelectedStretch] = useState(null);

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

  const getYouTubeVideoId = (exerciseName) => {
    const videoMap = {
      'arm circles': 'IODxDxX7oi4',
      'quad stretch': 'QOVaHwm-Q6U',
      'calf raises': '9cYEuFbBLSY',
      'hip circles': 'nmwgirgXLYM',
      'cat-cow': 'pSHjTRCQxIw',
      'toe touches': 'g_tea8ZNk5A',
      'tricep': 'yN6Q1UI_xkE',
      'chest': 'IODxDxX7oi4',
    };

    const name = exerciseName.toLowerCase();
    for (const [key, videoId] of Object.entries(videoMap)) {
      if (name.includes(key)) {
        return videoId;
      }
    }
    return 'g_tea8ZNk5A';
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
                  
                  {/* Video and 3D Buttons */}
                  <div className="flex justify-center gap-3 mb-4">
                    <Button
                      onClick={() => {
                        setSelectedStretch(activeStretch);
                        setShowHowTo(true);
                      }}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      VIDEO
                    </Button>
                    {activeStretch.model_url && (
                      <Button
                        onClick={() => {
                          setSelectedStretch(activeStretch);
                          setShow3DView(true);
                        }}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Box className="w-4 h-4 mr-2" />
                        3D
                      </Button>
                    )}
                  </div>
                  
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
                  <div className="flex gap-2 items-center justify-between flex-wrap">
                    <div className="flex gap-1 flex-wrap">
                      {stretch.muscle_groups?.slice(0, 3).map(muscle => (
                        <Badge key={muscle} variant="secondary" className="text-xs">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStretch(stretch);
                          setShowHowTo(true);
                        }}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-7"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      {stretch.model_url && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStretch(stretch);
                            setShow3DView(true);
                          }}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 h-7"
                        >
                          <Box className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* YouTube Video Modal */}
      <AnimatePresence>
        {showHowTo && selectedStretch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowHowTo(false)}
          >
            <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-xl font-bold mb-4 text-white">{selectedStretch.name}</h3>
                
                <div className="w-full aspect-video bg-black rounded-lg mb-4 overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedStretch.name)}?rel=0`}
                    title={selectedStretch.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                {selectedStretch.instructions?.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-white">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                      {selectedStretch.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                  </div>
                )}

                <Button onClick={() => setShowHowTo(false)} className="w-full gradient-bg text-white">
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D View Modal */}
      <AnimatePresence>
        {show3DView && selectedStretch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShow3DView(false)}
          >
            <Card className="bg-gray-900 w-full max-w-2xl border-gray-800 max-h-[95vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-xl font-bold mb-4 text-white">{selectedStretch.name} - 3D View</h3>
                
                <div className="w-full aspect-square bg-black rounded-lg mb-4 overflow-hidden">
                  {selectedStretch.model_url ? (
                    <Exercise3DViewer 
                      modelUrl={selectedStretch.model_url} 
                      exerciseName={selectedStretch.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-2">🏋️</div>
                        <p className="text-gray-400 text-sm">No 3D model available</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedStretch.instructions?.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-white">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                      {selectedStretch.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                  </div>
                )}

                <Button onClick={() => setShow3DView(false)} className="w-full gradient-bg text-white">
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}