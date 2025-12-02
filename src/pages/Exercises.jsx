import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowRight, Zap, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-8 md:py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Choose Your Exercises</h1>
          <p className="text-lg md:text-xl text-white/90 mb-6">
            Build a workout or let our AI create one for you.
          </p>

          {/* Pro Randomizer Feature */}
          {!isUserLoading && isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Link to={createPageUrl("RandomWorkout")}>
                <Button 
                  size="lg" 
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-full font-bold backdrop-blur-sm touch-manipulation"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  GENERATE AI WORKOUT
                </Button>
              </Link>
            </motion.div>
          )}

          {!isUserLoading && !isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-block bg-background/20 backdrop-blur-sm rounded-full p-1 border border-white/20"
            >
              <div className="flex items-center gap-4">
                 <p className="text-sm md:text-base ml-4">🚀 Unlock AI-powered random workouts!</p>
                  <Link to={createPageUrl("Pricing")}>
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:opacity-90 font-bold rounded-full"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      UPGRADE
                    </Button>
                  </Link>
              </div>
            </motion.div>
          )}
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
    </div>
  );
}