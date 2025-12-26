import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowRight, Zap, Star, Dumbbell, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";

import ExerciseCard from "../components/exercises/ExerciseCard";
import CategoryFilter from "../components/exercises/CategoryFilter";
import ExerciseModal from "../components/exercises/ExerciseModal";

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await User.me();
        setIsPro(user.subscription_status === 'pro');
      } catch (error) {
        setIsPro(false);
      }
      setIsUserLoading(false);
    };
    checkUserStatus();
    loadExercises();
  }, []);

  useEffect(() => {
    let filtered = exercises;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ex.description && ex.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredExercises(filtered);
  }, [exercises, selectedCategory, searchQuery]);

  const loadExercises = async () => {
    setIsLoading(true);
    const data = await Exercise.list();
    // Remove duplicates by name and sort alphabetically
    const uniqueExercises = data.filter((exercise, index, self) => 
      index === self.findIndex(e => e.name?.toLowerCase() === exercise.name?.toLowerCase())
    );
    const sortedExercises = uniqueExercises.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
    setExercises(sortedExercises);
    setIsLoading(false);
  };

  const toggleExerciseSelection = (exercise) => {
    setSelectedExercises(prev => {
      const isSelected = prev.find(ex => ex.id === exercise.id);
      if (isSelected) {
        return prev.filter(ex => ex.id !== exercise.id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  const showExerciseHelp = (exercise) => {
    setCurrentExercise(exercise);
    setShowModal(true);
  };

  const generateAIWorkout = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a workout description');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional fitness trainer. Generate a workout based on this request: "${aiPrompt}"
        
Return a JSON object with this exact structure:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "category": "upper_body|lower_body|core|full_body",
      "target_reps": 15,
      "sets": 3,
      "superset_with_next": false
    }
  ],
  "workout_type": "rep_based",
  "estimated_duration": 30,
  "difficulty": "beginner|intermediate|advanced"
}

Choose real exercises from this list: Push-ups, Squats, Lunges, Plank, Sit-ups, Burpees, Mountain Climbers, Jumping Jacks, Dips, Pull-ups, Tricep Dips, Leg Raises, Russian Twists, High Knees, Butt Kickers, Jump Squats, Wall Sits, Bicycle Crunches, Flutter Kicks, Crunches.

Make it realistic and achievable.`,
        response_json_schema: {
          type: "object",
          properties: {
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  target_reps: { type: "number" },
                  sets: { type: "number" },
                  superset_with_next: { type: "boolean" }
                }
              }
            },
            workout_type: { type: "string" },
            estimated_duration: { type: "number" },
            difficulty: { type: "string" }
          }
        }
      });

      // Find exercise IDs from database
      const dbExercises = await Exercise.list();
      
      const selectedExercises = response.exercises.map(aiEx => {
        const dbEx = dbExercises.find(ex => ex.name.toLowerCase() === aiEx.name.toLowerCase());
        return dbEx;
      }).filter(Boolean);

      if (selectedExercises.length === 0) {
        toast.error('No matching exercises found');
        setIsGenerating(false);
        return;
      }

      // Navigate to WorkoutBuilder with the exercises
      const exerciseIds = selectedExercises.map(ex => ex.id).join(',');
      navigate(`${createPageUrl("WorkoutBuilder")}?exercises=${exerciseIds}&ai=true&duration=${response.estimated_duration}`);
      
    } catch (error) {
      console.error('Failed to generate workout:', error);
      toast.error('Failed to generate workout. Please try again.');
    }
    setIsGenerating(false);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb', paddingBottom: '100px' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8 md:py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-lg md:text-xl text-white/90 mb-6">
            AI Generator or Manual Builder
          </p>

          {/* AI Prompt Option - NEW PRO FEATURE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-4"
          >
            <button
              onClick={() => {
                if (isPro) {
                  setShowAIPrompt(true);
                } else {
                  navigate(createPageUrl("Pricing"));
                }
              }}
              className={`w-full relative bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-2xl border-2 ${
                isPro ? 'border-yellow-400' : 'border-yellow-500/50 opacity-75'
              } hover:scale-105 transition-transform cursor-pointer text-left`}>
                {!isPro && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-black text-yellow-400 font-bold border border-yellow-400">PRO ONLY</Badge>
                  </div>
                )}
                <Zap className="w-12 h-12 mb-3 text-white" />
                <h3 className="text-2xl font-bold mb-2 text-white">🧞 WorkoutGenie</h3>
                <p className="text-white/90 text-sm mb-4">
                  Describe your workout idea - AI builds it from our exercise library
                </p>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>✓ Just type what you want in plain English</li>
                  <li>✓ Instant custom workout in seconds</li>
                  <li>✓ Uses real exercises from our database</li>
                </ul>
                <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  "18 min low intensity upper & lower mix" →
                </div>
                </div>
                </button>
                </motion.div>

          {/* Plan Selection Cards */}
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
            {/* AI Workout Generator - PRO ONLY */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Link to={isPro ? createPageUrl("WorkoutBuilder") : createPageUrl("Pricing")}>
                <div className={`relative bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-2xl border-2 ${
                  isPro ? 'border-yellow-400' : 'border-purple-500/50 opacity-75'
                } hover:scale-105 transition-transform cursor-pointer`}>
                  {!isPro && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-yellow-400 text-black font-bold">PRO ONLY</Badge>
                    </div>
                  )}
                  <Zap className="w-12 h-12 mb-3 text-white" />
                  <h3 className="text-2xl font-bold mb-2">AI Workout Generator</h3>
                  <p className="text-white/90 text-sm mb-4">
                    Smart AI creates personalized workouts in seconds
                  </p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li>✓ Choose duration & focus area</li>
                    <li>✓ Auto-selected exercises</li>
                    <li>✓ Optimized for your time</li>
                  </ul>
                </div>
              </Link>
            </motion.div>

            {/* Manual Builder - FREE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-gray-700 to-gray-800 p-6 rounded-2xl border-2 border-gray-600 hover:scale-105 transition-transform cursor-pointer">
                <div className="absolute top-3 right-3">
                  <Badge className="bg-green-500 text-white font-bold">FREE</Badge>
                </div>
                <Dumbbell className="w-12 h-12 mb-3 text-white" />
                <h3 className="text-2xl font-bold mb-2">Build Your Workout</h3>
                <p className="text-white/90 text-sm mb-4">
                  Manually select exercises & customize
                </p>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>✓ Browse exercise library</li>
                  <li>✓ Pick your favorites</li>
                  <li>✓ Full control & flexibility</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="bg-card rounded-xl shadow-lg p-4 mb-6 sticky top-0 z-10">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search exercises (e.g., Push-ups, Squats)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-base py-3 touch-manipulation bg-background border-border"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              <CategoryFilter 
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          </div>
        </div>
        
        {/* Selected Exercises Bar */}
        <AnimatePresence>
        {selectedExercises.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-20 p-4"
          >
            <div className="container mx-auto max-w-2xl">
                <div className="flex justify-between items-center bg-card border border-brand-blue/50 rounded-xl shadow-2xl p-3">
                  <div>
                    <span className="font-semibold text-foreground text-base"> {/* Changed from text-white to text-foreground */}
                      {selectedExercises.length} exercises selected
                    </span>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {selectedExercises.slice(0, 3).map(ex => (
                        <Badge key={ex.id} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          {ex.name}
                        </Badge>
                      ))}
                      {selectedExercises.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">+{selectedExercises.length - 3} more</Badge>
                      )}
                    </div>
                  </div>
                  <Link to={`${createPageUrl("WorkoutBuilder")}?exercises=${selectedExercises.map(ex => ex.id).join(',')}`}>
                    <Button className="gradient-bg text-white hover:opacity-90 touch-manipulation">
                      Build <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>


        {/* Exercise Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                <div className="w-full h-24 bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24"
          >
            <AnimatePresence>
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  isSelected={selectedExercises.some(ex => ex.id === exercise.id)}
                  onSelect={() => toggleExerciseSelection(exercise)}
                  onShowHelp={() => showExerciseHelp(exercise)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredExercises.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No exercises found.</p>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <ExerciseModal
        exercise={currentExercise}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

      {/* AI Prompt Modal */}
      <AnimatePresence>
        {showAIPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isGenerating && setShowAIPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border-gray-800 border-2 rounded-xl max-w-2xl w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                🧞 WorkoutGenie
                <Badge className="ml-auto bg-yellow-400 text-black font-bold text-xs">PRO</Badge>
              </h2>
              <p className="text-gray-400 mb-4">Describe your workout - AI builds it from our exercise library</p>

              <div className="mb-4">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  placeholder="Example: 'Build me a workout for 18 minutes, low intensity and mix up body upper and lower workouts'"
                  className="w-full h-32 bg-gray-800 border-gray-700 border text-white rounded-lg p-3 resize-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  disabled={isGenerating}
                  autoFocus
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-400 mb-1">💡 Tips for better workouts:</p>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  <li>• Mention time (e.g., "18 minutes", "quick 15 min")</li>
                  <li>• Specify intensity (e.g., "low", "moderate", "high")</li>
                  <li>• Choose focus (e.g., "upper body", "legs", "full body")</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={generateAIWorkout}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      🧞 Make My Workout
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowAIPrompt(false)}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      );
      }