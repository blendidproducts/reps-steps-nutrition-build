import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { PresetProgram } from "@/entities/PresetProgram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Star, Dumbbell, Apple, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import FitnessQuiz from "@/components/FitnessQuiz";

export default function Home() {
  const navigate = useNavigate();
  const [isPro, setIsPro] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showQuiz, setShowQuiz] = React.useState(false);
  const [recommendedProgram, setRecommendedProgram] = React.useState(null);
  const [activeProgram, setActiveProgram] = React.useState(null);
  const [user, setUser] = React.useState(null);

  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPro(currentUser.subscription_status === 'pro' || currentUser.role === 'admin');
      
      // Check for active program
      if (currentUser.active_program) {
        setActiveProgram(currentUser.active_program);
      }

      // Check if user needs to complete quiz
      if (!currentUser.quiz_completed) {
        setShowQuiz(true);
      }
    } catch (error) {
      console.log('User not logged in');
    }
    setIsLoading(false);
  };

  const handleQuizComplete = async (answers) => {
    try {
      // Find recommended program based on answers
      const programs = await PresetProgram.list();
      let recommended = null;

      if (answers.fitness_level === 'beginner' && answers.fitness_goals === 'weight_loss') {
        recommended = programs.find(p => p.name.toLowerCase().includes('beginner') || p.difficulty === 'beginner');
      } else if (answers.fitness_level === 'intermediate' || answers.fitness_level === 'advanced') {
        recommended = programs.find(p => p.difficulty === answers.fitness_level);
      }

      // Update user with quiz results
      await base44.auth.updateMe({
        fitness_level: answers.fitness_level,
        age: parseInt(answers.age),
        fitness_goals: answers.fitness_goals,
        quiz_completed: true,
        recommended_program_id: recommended?.id
      });

      setRecommendedProgram(recommended);
      setShowQuiz(false);
      loadUser();
    } catch (error) {
      console.error('Failed to save quiz results:', error);
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Fitness Quiz Modal */}
      {showQuiz && <FitnessQuiz onComplete={handleQuizComplete} />}

      {/* Hero Section */}
      <section style={{ backgroundColor: '#0a0a0a' }} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo and Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex justify-center mb-4">
                <img src={logoUrl} alt="RepsAndSteps Logo" className="w-24 h-24" />
              </div>
              <img src={bannerUrl} alt="RepsAndSteps" className="h-10 mx-auto mb-4" />
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Your ultimate calisthenics companion to track every rep and count every step.
              </p>
            </motion.div>

            {/* Continue Program Banner */}
            {activeProgram && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                onClick={() => navigate(createPageUrl("PresetPrograms"))}
                className="mb-8 cursor-pointer"
              >
                <Card className="gradient-bg border-none hover:opacity-90 transition-opacity">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-lg">CONTINUE PROGRAM</div>
                        <div className="text-white/80 text-sm">
                          Day {activeProgram.current_day} of {activeProgram.total_days} - {activeProgram.program_name}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-full px-4 py-2">
                      <div className="text-white font-bold text-xl">{activeProgram.current_day}</div>
                      <div className="text-white/80 text-xs">DAY</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recommended Program Banner */}
            {recommendedProgram && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="w-6 h-6 text-yellow-400" />
                      <h3 className="text-xl font-bold text-white">Recommended For You</h3>
                    </div>
                    <p className="text-gray-300 mb-4">{recommendedProgram.name}</p>
                    <Button
                      onClick={() => navigate(createPageUrl("PresetPrograms"))}
                      className="w-full gradient-bg text-white font-bold"
                    >
                      View Program
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Main Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="grid gap-4 mb-8"
            >
              {/* AI Workouts */}
              <Card 
                className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-orange-500/30 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(createPageUrl("AIWorkoutGenerator"))}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold text-white mb-1">AI Workouts</h3>
                        <p className="text-gray-300 text-sm">Generate custom workouts instantly</p>
                      </div>
                    </div>
                    <ArrowRight className="w-8 h-8 text-white/50" />
                  </div>
                </CardContent>
              </Card>

              {/* Programs */}
              <Card 
                className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(createPageUrl("PresetPrograms"))}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold text-white mb-1">Programs</h3>
                        <p className="text-gray-300 text-sm">Structured workout plans</p>
                      </div>
                    </div>
                    <ArrowRight className="w-8 h-8 text-white/50" />
                  </div>
                </CardContent>
              </Card>

              {/* Nutrition */}
              <Card 
                className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(createPageUrl("Nutrition"))}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
                        <Apple className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold text-white mb-1">Nutrition</h3>
                        <p className="text-gray-300 text-sm">Track meals & calories</p>
                      </div>
                    </div>
                    <ArrowRight className="w-8 h-8 text-white/50" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Start Here Button */}
            {user && !user.quiz_completed && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mb-8"
              >
                <Button
                  onClick={() => setShowQuiz(true)}
                  className="w-full gradient-bg text-white font-bold h-16 text-xl rounded-2xl"
                >
                  <Target className="w-6 h-6 mr-3" />
                  START HERE - Take Fitness Quiz
                </Button>
              </motion.div>
            )}

            {/* Pro Upgrade Banner */}
            {!isPro && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mb-8"
              >
                <Card className="gradient-bg border-none">
                  <CardContent className="p-6 text-center">
                    <Star className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-white mb-2">Unlock Pro Features</h3>
                    <p className="text-white/80 mb-4">Get unlimited AI workouts, all programs, and more</p>
                    <Button
                      onClick={() => navigate(createPageUrl("Pricing"))}
                      className="bg-white text-brand-blue hover:bg-gray-100 font-bold px-8"
                    >
                      View Pricing
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}