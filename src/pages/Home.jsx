import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { PresetProgram } from "@/entities/PresetProgram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Star, Dumbbell, Apple, Calendar, ArrowRight, Mic } from "lucide-react";
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
    <div style={{ backgroundColor: 'transparent', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Fitness Quiz Modal */}
      {showQuiz && <FitnessQuiz onComplete={handleQuizComplete} />}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo and Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 md:mb-12"
            >
              <div className="flex justify-center mb-4 md:mb-6">
                <img src={logoUrl} alt="RepsAndSteps Logo" className="w-20 h-20 md:w-32 md:h-32 drop-shadow-2xl" />
              </div>
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4">
                Welcome to <span className="text-brand-blue">REPSANDSTEPS</span>
              </h1>
              <p className="text-sm md:text-xl text-gray-300 max-w-3xl mx-auto px-4">
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
                <Card className="gradient-bg border-2 border-brand-blue/50 hover:border-brand-blue transition-all shadow-lg shadow-brand-blue/30">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-lg">CONTINUE PROGRAM</div>
                        <div className="text-white/80 text-sm">
                          {activeProgram.completed_days && activeProgram.completed_days.length > 0 && (
                            <span className="text-green-400">✓ Day {Math.max(...activeProgram.completed_days)} completed • </span>
                          )}
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
              className="grid gap-3 md:gap-6 mb-6 md:mb-8"
            >
              {/* AI Workouts */}
              <Card 
                className="bg-gradient-to-r from-brand-blue/20 to-blue-600/20 border-2 border-brand-blue/50 cursor-pointer hover:border-brand-blue hover:shadow-lg hover:shadow-brand-blue/30 transition-all backdrop-blur-sm"
                onClick={() => navigate(createPageUrl("Exercises"))}
              >
                <CardContent className="p-4 md:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-brand-blue rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-brand-blue/50">
                        <Zap className="w-6 h-6 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg md:text-3xl font-bold text-white mb-0 md:mb-2">AI Workouts</h3>
                        <p className="text-gray-300 text-xs md:text-base">Generate custom workouts</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 md:w-10 md:h-10 text-brand-blue" />
                  </div>
                </CardContent>
              </Card>

              {/* Programs */}
              <Card 
                className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 cursor-pointer hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/30 transition-all backdrop-blur-sm"
                onClick={() => navigate(createPageUrl("PresetPrograms"))}
              >
                <CardContent className="p-4 md:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/50">
                        <Calendar className="w-6 h-6 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg md:text-3xl font-bold text-white mb-0 md:mb-2">Programs</h3>
                        <p className="text-gray-300 text-xs md:text-base">Structured plans</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 md:w-10 md:h-10 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Nutrition */}
              <Card 
                className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-2 border-emerald-500/50 cursor-pointer hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 transition-all backdrop-blur-sm"
                onClick={() => navigate(createPageUrl("Nutrition"))}
              >
                <CardContent className="p-4 md:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/50">
                        <Apple className="w-6 h-6 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg md:text-3xl font-bold text-white mb-0 md:mb-2">Nutrition</h3>
                        <p className="text-gray-300 text-xs md:text-base">Track meals & calories</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 md:w-10 md:h-10 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Voice Control Fitness System (VCFS) - Small Bonus Feature Button */}
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => navigate(createPageUrl("Help") + "?section=vcfs")}
                  size="sm"
                  variant="outline"
                  className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 hover:border-purple-400 text-white font-medium px-4 py-2 rounded-lg shadow transition-all relative select-none text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  <span>🎤 Voice Control</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">NEW</span>
                </Button>
              </div>
            </motion.div>

            {/* Start Here Button */}
            {user && !user.quiz_completed && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mb-6 md:mb-8"
              >
                <Button
                  onClick={() => setShowQuiz(true)}
                  className="w-full gradient-bg text-white font-bold h-12 md:h-16 text-base md:text-xl rounded-xl md:rounded-2xl"
                >
                  <Target className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
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
                className="mb-6 md:mb-8"
              >
                <Card className="gradient-bg border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/30">
                  <CardContent className="p-4 md:p-8 text-center">
                    <Star className="w-10 h-10 md:w-16 md:h-16 text-yellow-400 mx-auto mb-3 md:mb-4 drop-shadow-lg" />
                    <h3 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3">Unlock Pro Features</h3>
                    <p className="text-white/90 mb-4 md:mb-6 text-sm md:text-lg">Get unlimited AI workouts, all programs, and more</p>
                    <Button
                      onClick={() => navigate(createPageUrl("Pricing"))}
                      className="bg-white text-brand-blue hover:bg-gray-100 font-bold px-6 md:px-10 py-4 md:py-6 text-base md:text-lg shadow-lg"
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