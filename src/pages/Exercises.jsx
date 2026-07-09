import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Filter, ArrowRight, Zap, Star, Dumbbell, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { checkIsPro } from "@/lib/proCheck";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";

import ExerciseCard from "../components/exercises/ExerciseCard";
import CategoryFilter from "../components/exercises/CategoryFilter";
import ExerciseModal from "../components/exercises/ExerciseModal";
import PullToRefresh from "@/components/PullToRefresh";

export default function Exercises() {
  const navigate = useNavigate();
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
  const [aiBodyFocus, setAiBodyFocus] = useState("mixed");
  const [aiDuration, setAiDuration] = useState(30);
  const [aiIntensity, setAiIntensity] = useState("moderate");

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await User.me();
        setIsPro(checkIsPro(user));
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

  const CACHE_KEY = 'rns_exercises_cache';
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour — persists across app restarts in localStorage

  const processExercises = (data) => {
    return data
      .filter((exercise, index, self) =>
        !exercise.is_deleted &&
        index === self.findIndex(e => e.name?.toLowerCase() === exercise.name?.toLowerCase())
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const loadExercises = async (forceRefresh = false) => {
    // Serve from cache instantly if fresh
    if (!forceRefresh) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL && data?.length > 0) {
            setExercises(data);
            setIsLoading(false);
            return;
          }
        }
      } catch (_) { /* corrupt cache — ignore and fetch fresh */ }
    }

    setIsLoading(true);
    try {
      const data = await Exercise.list();
      const sorted = processExercises(data);
      setExercises(sorted);
      // Only cache if we actually got exercises — never cache an empty result
      if (sorted.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: sorted, ts: Date.now() }));
        } catch (_) { /* storage full — skip cache write */ }
      } else {
        // Empty database — clear any stale cache and surface the seed tool
        try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
      }
    } catch (error) {
      console.error("Failed to load exercises:", error);
      // Try to fall back to stale cache rather than showing nothing
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data } = JSON.parse(raw);
          if (data?.length > 0) {
            setExercises(data);
            toast.error("Showing cached exercises — couldn't reach server.");
            return;
          }
        }
      } catch (_) {}
      toast.error("Could not load exercises. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
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
      toast.error('Please describe your workout');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional fitness trainer. Generate a calisthenics workout based on this EXACT request:

"${aiPrompt}"

CRITICAL REQUIREMENTS:
1. Parse the user's request to determine body focus, duration, and intensity
2. If duration is mentioned, respect it EXACTLY
3. If intensity is mentioned (low/moderate/high/easy/hard), respect it
4. If body focus is mentioned (upper/lower/full body/mixed), respect it
5. If not mentioned, use reasonable defaults (30 min, moderate, mixed)

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
  "estimated_duration": ${aiDuration},
  "difficulty": "beginner|intermediate|advanced"
}

AVAILABLE EXERCISES BY CATEGORY:
UPPER BODY: Push-ups, Wide Push-ups, Diamond Push-ups, Decline Push-ups, Dips, Tricep Dips, Pull-ups, Arm Circles
LOWER BODY: Squats, Jump Squats, Lunges, Calf Raises, Wall Sits, Glute Bridges
CORE: Sit-ups, Crunches, Bicycle Crunches, Russian Twists, Leg Raises, Flutter Kicks, Plank, Mountain Climbers
FULL BODY: Burpees, Jumping Jacks, High Knees, Butt Kickers

EXERCISE SELECTION RULES:
- Balance exercises across requested body parts
- Calculate exercises based on mentioned duration
- Adjust sets/reps/rest based on mentioned intensity
- Ensure workout fits within time constraints

Choose realistic exercises that match the body focus and intensity level.`,
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

      // Normalize response — InvokeLLM may return a string or parsed object
      let parsedResponse = response;
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response);
        } catch {
          toast.error('AI returned an unexpected format. Please try again.');
          setIsGenerating(false);
          return;
        }
      }

      if (!parsedResponse?.exercises?.length) {
        toast.error('No exercises generated. Try rephrasing your prompt.');
        setIsGenerating(false);
        return;
      }

      // Find exercise IDs from database
      const dbExercises = await Exercise.list();

      const selectedExercises = parsedResponse.exercises.map(aiEx => {
        const dbEx = dbExercises.find(ex => ex.name.toLowerCase() === aiEx.name.toLowerCase());
        return dbEx;
      }).filter(Boolean);

      if (selectedExercises.length === 0) {
        toast.error('No matching exercises found in library. Try different exercise names.');
        setIsGenerating(false);
        return;
      }

      // Navigate to WorkoutBuilder with full AI-generated workout
      const exerciseIds = selectedExercises.map(ex => ex.id).join(',');
      const params = new URLSearchParams({
        exercises: exerciseIds,
        ai: 'true',
        duration: parsedResponse.estimated_duration || 30,
        sets: parsedResponse.exercises[0]?.sets || 3,
        reps: parsedResponse.exercises[0]?.target_reps || 15,
        difficulty: parsedResponse.difficulty || 'intermediate'
      });
      navigate(`${createPageUrl("WorkoutBuilder")}?${params.toString()}`);
      
    } catch (error) {
      console.error('Failed to generate workout:', error);
      toast.error('Failed to generate workout. Please try again.');
    }
    setIsGenerating(false);
  };

  return (
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-3 sm:py-4 md:py-6 backdrop-blur-lg bg-gradient-to-r from-blue-600/90 to-blue-800/90">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 max-w-3xl">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Your Plan</h1>
          <p className="text-xs sm:text-sm md:text-base text-white/90 mb-2 sm:mb-3">
            AI Generator or Manual Builder
          </p>

          {/* 🔥 7-Day Trial Banner */}
          {!isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mb-2 sm:mb-3"
            >
              <button
                onClick={() => navigate(createPageUrl("Pricing"))}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 p-2.5 sm:p-3 rounded-lg border border-green-400 shadow-lg hover:scale-[1.01] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2 justify-center">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse flex-shrink-0" />
                  <div className="text-center">
                    <div className="text-white font-bold text-xs sm:text-sm">🔥 7-DAY TRIAL - $3.99</div>
                    <div className="text-green-100 text-[10px] sm:text-xs font-semibold">Try ALL PRO features!</div>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* 🧞 WorkoutGenie - PREMIUM AI FEATURE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-2 sm:mb-3"
          >
            <button
              onClick={() => {
                // Route to the working WorkoutGenie generator (same as AI Auto Mode's
                // "Ask WorkoutGenie"). Avoids the old pop-up modal that black-screened.
                if (isPro) {
                  navigate(createPageUrl("AIWorkoutGenerator"));
                } else {
                  navigate(createPageUrl("Pricing"));
                }
              }}
              className={`w-full relative bg-gradient-to-br from-yellow-500 via-orange-600 to-red-600 p-2.5 sm:p-3 md:p-4 rounded-lg border ${
                isPro ? 'border-yellow-300 shadow-lg shadow-yellow-500/20' : 'border-yellow-500/50 opacity-90'
              } hover:scale-[1.01] transition-transform cursor-pointer text-left`}>
                {!isPro && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                    <Badge className="bg-black text-yellow-400 font-bold border border-yellow-400 text-[10px] sm:text-xs px-1.5 py-0.5">⭐ PRO</Badge>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white animate-pulse flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg font-black mb-0.5 sm:mb-1 text-white">🧞 WorkoutGenie AI</h3>
                    <p className="text-white text-[11px] sm:text-xs md:text-sm mb-1.5 sm:mb-2 font-semibold">
                      Describe your workout - AI builds it
                    </p>
                    <div className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded text-[10px] sm:text-xs font-bold border border-white/20 inline-block break-words">
                      💬 "18 min low intensity"
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>

          {/* Main Workout Builder Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {/* AI Workout Generator (AUTO MODE) - PRO ONLY */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Link to={isPro ? createPageUrl("AIWorkoutGenerator") : createPageUrl("Pricing")}>
                <div className={`relative bg-gradient-to-br from-purple-600 to-indigo-700 p-2.5 sm:p-3 md:p-4 rounded-lg border ${
                  isPro ? 'border-purple-300 shadow-lg shadow-purple-500/20' : 'border-purple-500/50 opacity-85'
                } hover:scale-[1.01] transition-transform cursor-pointer h-full min-h-[120px] sm:min-h-[140px]`}>
                  {!isPro && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                      <Badge className="bg-yellow-400 text-black font-bold text-[10px] sm:text-xs px-1.5 py-0.5">⭐ PRO</Badge>
                    </div>
                  )}
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2 text-white" />
                  <h3 className="text-xs sm:text-sm md:text-base font-bold mb-0.5 sm:mb-1 text-white">AI Auto Mode</h3>
                  <p className="text-white/90 text-[10px] sm:text-xs mb-1.5 sm:mb-2 font-medium">
                    AI creates workouts automatically
                  </p>
                  <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-white/85">
                    <li>🎚️ Choose fitness level</li>
                    <li>⏱️ Set duration & intensity</li>
                    <li>🤖 AI picks exercises</li>
                  </ul>
                </div>
              </Link>
            </motion.div>

            {/* Manual Builder - FREE FOREVER */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-gray-700 to-gray-900 p-2.5 sm:p-3 md:p-4 rounded-lg border border-green-500 hover:scale-[1.01] transition-transform cursor-pointer h-full min-h-[120px] sm:min-h-[140px] shadow-lg shadow-green-500/10">
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                  <Badge className="bg-green-500 text-white font-bold text-[10px] sm:text-xs px-1.5 py-0.5">✓ FREE</Badge>
                </div>
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2 text-green-400" />
                <h3 className="text-xs sm:text-sm md:text-base font-bold mb-0.5 sm:mb-1 text-white">Manual Builder</h3>
                <p className="text-white/90 text-[10px] sm:text-xs mb-1.5 sm:mb-2 font-medium">
                  Browse & select exercises
                </p>
                <ul className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-white/85">
                  <li>📚 Browse 50+ exercises</li>
                  <li>✋ Pick your favorites</li>
                  <li>🆓 100% Free forever</li>
                </ul>
              </div>
            </motion.div>
          </div>

          {/* FREE Instructions */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-2 sm:mb-3">
            <p className="text-green-400 font-bold text-center text-[11px] sm:text-xs">
              👇 FREE: Scroll to browse exercises
            </p>
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={() => loadExercises(true)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Search and Filters */}
        <div className="bg-card/90 backdrop-blur-lg rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 sticky top-0 z-10 select-none">
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

        {/* Select all / Clear all toolbar */}
        {!isLoading && filteredExercises.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs text-gray-400 font-semibold">
              {selectedExercises.length > 0 ? `${selectedExercises.length} selected` : `${filteredExercises.length} exercises`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedExercises(prev => {
                  const ids = new Set(prev.map(e => e.id));
                  return [...prev, ...filteredExercises.filter(e => !ids.has(e.id))];
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/40 active:scale-95 transition-transform">
                Select all
              </button>
              <button
                onClick={() => setSelectedExercises([])}
                disabled={selectedExercises.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 bg-gray-700/40 border border-gray-600 disabled:opacity-40 active:scale-95 transition-transform">
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Exercise Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {Array(21).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-1.5 animate-pulse">
                <div className="w-full h-12 bg-gray-700 rounded mb-1"></div>
                <div className="h-2 bg-gray-700 rounded mb-1 w-3/4"></div>
                <div className="h-2 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 pb-24"
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

        {filteredExercises.length === 0 && !isLoading && exercises.length === 0 && (
          /* Database is empty — show restore prompt */
          <div className="text-center py-12 px-6 space-y-4">
            <div className="text-5xl mb-2">🏋️</div>
            <p className="text-white text-lg font-semibold">Exercise library is empty</p>
            <p className="text-gray-400 text-sm">The exercise database needs to be restored. This takes about 10 seconds.</p>
            <button
              onClick={() => navigate(createPageUrl("ExerciseSeed"))}
              className="inline-block mt-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Restore All Exercises →
            </button>
          </div>
        )}

        {filteredExercises.length === 0 && !isLoading && exercises.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No exercises found.</p>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      </PullToRefresh>

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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
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
              <p className="text-gray-400 mb-4">Just describe what you want - AI builds it instantly</p>

              <div className="space-y-4">
                <div>
                  <Label className="text-white font-semibold mb-2 block">Describe Your Workout</Label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAIPrompt(e.target.value)}
                    placeholder="Example: '18 min low intensity upper & lower mix' or 'Quick 15 minute core workout' or '30 min intense full body'"
                    className="w-full h-32 bg-gray-800 border-gray-700 border text-white rounded-lg p-3 resize-none"
                    disabled={isGenerating}
                  />
                </div>
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

      {/* ── BUILD Bar — sticky bottom, isolated from scroll grid ── */}
      <AnimatePresence>
        {selectedExercises.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="sticky bottom-0 z-50 px-3 pt-2 bg-gradient-to-t from-[#020817] via-[#020817]/95 to-transparent"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
          >
            <div className="container mx-auto max-w-2xl">
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-400 border border-blue-300/60 rounded-xl shadow-2xl shadow-blue-500/50 px-3 py-2.5">
                <div className="min-w-0 flex-1 mr-3">
                  <span className="font-bold text-white text-sm">
                    {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {selectedExercises.slice(0, 2).map(ex => (
                      <Badge key={ex.id} variant="secondary" className="text-[10px] bg-white/25 text-white font-semibold truncate max-w-[90px]">
                        {ex.name}
                      </Badge>
                    ))}
                    {selectedExercises.length > 2 && (
                      <Badge variant="secondary" className="text-[10px] bg-white/25 text-white font-semibold">
                        +{selectedExercises.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Link to={`${createPageUrl("WorkoutBuilder")}?exercises=${selectedExercises.map(ex => ex.id).join(',')}`}>
                  <button className="flex items-center gap-1.5 bg-white text-blue-600 font-bold text-sm px-4 py-2.5 rounded-lg active:scale-95 transition-transform shadow-md flex-shrink-0">
                    BUILD <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}