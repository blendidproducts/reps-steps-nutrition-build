import React, { useState, useEffect, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Star, Dumbbell, Apple, Calendar, ArrowRight, Brain, Timer, Info, TrendingUp, Activity, CheckCircle2, Moon, ChevronRight, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
const FitnessQuiz = React.lazy(() => import("@/components/FitnessQuiz"));
const MuscleRecovery = React.lazy(() => import("@/components/recovery/MuscleRecovery"));

export default function Home() {
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [recommendedProgram, setRecommendedProgram] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [user, setUser] = useState(null);

  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPro(currentUser.is_pro === true || currentUser.subscription_status === 'pro' || currentUser.role === 'admin');
      
      // Check for active program and sync with enrollment
      if (currentUser.active_program) {
        const enrollments = await base44.entities.ProgramEnrollment.filter({ 
          program_id: currentUser.active_program.program_id,
          status: 'active'
        });
        
        if (enrollments.length > 0) {
          const enrollment = enrollments[0];
          setActiveProgram({
            ...currentUser.active_program,
            completed_days: enrollment.completed_days || [],
            current_day: enrollment.current_day,
            days_completed_count: enrollment.days_completed_count || 0
          });
        } else {
          setActiveProgram(currentUser.active_program);
        }
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
      const programs = await base44.entities.PresetProgram.list();
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
    <div style={{ backgroundColor: '#020817', minHeight: '100vh', color: '#f9fafb' }} className="pb-24">
      {/* Fitness Quiz Modal */}
      {showQuiz && (
        <Suspense fallback={null}>
          <FitnessQuiz onComplete={handleQuizComplete} />
        </Suspense>
      )}

      {/* Hero Section */}
      <div className="relative rounded-b-[2rem] overflow-hidden mb-6">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1000&auto=format&fit=crop" alt="Workout Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/40 via-[#020817]/80 to-[#020817]"></div>
        </div>
        
        <div className="relative z-10 pt-16 pb-8 px-6">
          <Badge className="bg-[#4D15A0]/60 text-purple-300 border-none mb-4 tracking-wider text-[10px] font-bold py-1">AI POWERED</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
            AI Workouts <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Made for You</span>
          </h1>
          <p className="text-gray-300 text-sm mb-6 max-w-sm leading-relaxed pr-10">
            Personalized workouts that adapt to your goals, performance and recovery.
          </p>
          
          <div className="flex justify-between items-end">
            <div>
              <Button 
                onClick={() => navigate(createPageUrl("AIWorkoutGenerator"))}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6 py-6 text-base font-semibold shadow-lg shadow-purple-500/20 flex items-center justify-between border-0 w-full sm:w-auto mb-3"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Generate AI Workout
                </div>
                <ArrowRight className="w-5 h-5 ml-4" />
              </Button>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                <Timer className="w-4 h-4" />
                Takes 30 seconds
              </div>
            </div>

            {/* AI Match Score Card */}
            <div className="bg-[#0a0e1a]/95 backdrop-blur-md border border-gray-800 rounded-2xl p-3 shadow-2xl z-20 w-36 transform translate-y-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-300 font-medium">AI Match Score</span>
                <Info className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-0.5">92%</div>
              <div className="flex items-center gap-1 text-green-400 text-[10px] mb-2 font-medium">
                <TrendingUp className="w-3 h-3" />
                Excellent Fit
              </div>
              <div className="flex gap-1">
                 <div className="h-1 w-full bg-green-400 rounded-full"></div>
                 <div className="h-1 w-full bg-green-400 rounded-full"></div>
                 <div className="h-1 w-full bg-green-400 rounded-full"></div>
                 <div className="h-1 w-full bg-green-400 rounded-full"></div>
                 <div className="h-1 w-full bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Readiness */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Your Readiness</h2>
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => navigate(createPageUrl("FitnessBrain"))}>
            View Details <ChevronRight className="w-3 h-3" />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0a0e1a] border border-gray-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-4xl font-bold text-green-400">1</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-green-400 text-xs font-semibold mb-0.5">Ready</div>
              <div className="text-gray-500 text-[10px]">Go for it!</div>
            </div>
          </div>

          <div className="bg-[#0a0e1a] border border-gray-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-4xl font-bold text-orange-400">6</span>
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-orange-400 text-xs font-semibold mb-0.5">Recovering</div>
              <div className="text-gray-500 text-[10px]">Take it easy</div>
            </div>
          </div>

          <div className="bg-[#0a0e1a] border border-gray-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <span className="text-4xl font-bold text-blue-400">1</span>
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-blue-400 text-xs font-semibold mb-0.5">Rested</div>
              <div className="text-gray-500 text-[10px]">Well recovered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent AI Workout */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Recent AI Workout</h2>
          <div className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => navigate(createPageUrl("SavedWorkouts"))}>
            View All <ChevronRight className="w-3 h-3" />
          </div>
        </div>
        
        <div className="bg-[#0a0e1a] border border-gray-800 rounded-2xl overflow-hidden flex flex-col sm:flex-row cursor-pointer hover:border-gray-700 transition-colors shadow-lg group" onClick={() => navigate(createPageUrl("SavedWorkouts"))}>
          <div className="relative w-full sm:w-2/5 h-40 sm:h-auto">
            <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=500&auto=format&fit=crop" alt="Workout" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center backdrop-blur-md bg-black/40">
                <Play className="w-5 h-5 text-white ml-1" />
              </div>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-bold text-base leading-tight pr-4">Full Body Strength & Mobility</h3>
              <MoreVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 font-medium">
              <div className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5"/> 45 min</div>
              <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Intermediate</div>
              <div className="flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5"/> Equipment</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="border-blue-900/50 text-blue-400 bg-blue-900/20 text-[10px] py-0.5 px-2 rounded-full">Strength</Badge>
              <Badge variant="outline" className="border-cyan-900/50 text-cyan-400 bg-cyan-900/20 text-[10px] py-0.5 px-2 rounded-full">Mobility</Badge>
              <Badge variant="outline" className="border-purple-900/50 text-purple-400 bg-purple-900/20 text-[10px] py-0.5 px-2 rounded-full">Core</Badge>
              <Badge variant="outline" className="border-gray-800 text-gray-400 bg-gray-800/50 text-[10px] py-0.5 px-2 rounded-full">Full Body</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-2">
        <h2 className="text-lg font-bold text-white mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div 
            className="bg-[#0a0e1a] border border-blue-900/40 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer hover:bg-blue-900/20 transition-colors shadow-lg"
            onClick={() => navigate(createPageUrl("AIWorkoutGenerator"))}
          >
            <Zap className="w-8 h-8 text-blue-400 mb-3" />
            <div className="text-sm font-bold text-blue-400 mb-1">AI Workouts</div>
            <div className="text-[10px] text-gray-500 font-medium">Generate now</div>
          </div>
          
          <div 
            className="bg-[#0a0e1a] border border-purple-900/40 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer hover:bg-purple-900/20 transition-colors shadow-lg"
            onClick={() => navigate(createPageUrl("PresetPrograms"))}
          >
            <Calendar className="w-8 h-8 text-purple-400 mb-3" />
            <div className="text-sm font-bold text-white mb-1">Programs</div>
            <div className="text-[10px] text-gray-500 font-medium">View plans</div>
          </div>
          
          <div 
            className="bg-[#0a0e1a] border border-green-900/40 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer hover:bg-green-900/20 transition-colors shadow-lg"
            onClick={() => navigate(createPageUrl("Nutrition"))}
          >
            <Apple className="w-8 h-8 text-green-400 mb-3" />
            <div className="text-sm font-bold text-white mb-1">Nutrition</div>
            <div className="text-[10px] text-gray-500 font-medium">Track meals</div>
          </div>
          
          <div 
            className="bg-[#0a0e1a] border border-orange-900/40 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer hover:bg-orange-900/20 transition-colors shadow-lg"
            onClick={() => navigate(createPageUrl("Progress"))}
          >
            <TrendingUp className="w-8 h-8 text-orange-400 mb-3" />
            <div className="text-sm font-bold text-white mb-1">Progress</div>
            <div className="text-[10px] text-gray-500 font-medium">See analytics</div>
          </div>
        </div>
      </div>
    </div>
  );
}