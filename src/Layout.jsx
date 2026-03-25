import React, { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNavigationManager, resolveTabForPath, TAB_ROOTS, pushTabPath } from "@/lib/NavigationManager";
import { createPageUrl } from "@/utils";
import { Home, Dumbbell, Settings, History, HelpCircle, Star, BookmarkPlus, Calendar, Camera, Apple, Play, Timer, Trophy, Ruler, Gift, Box, Users, Clock, Brain, Watch, ShoppingBag } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { base44 } from "@/api/base44Client";
import { PresetProgram } from "@/entities/PresetProgram";
import { Exercise } from "@/entities/Exercise";
import { Workout } from "@/entities/Workout";
import ProgramDayPopup from "@/components/ProgramDayPopup";
import MobileHeader from "@/components/MobileHeader";
import MobileRouteTransition from "@/components/MobileRouteTransition";
import ProgramReminderPopup from "@/components/dashboard/ProgramReminderPopup";
import SyncIndicator from "@/components/SyncIndicator";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Home", url: createPageUrl("Home"), icon: Home },
  { title: "AI Fitness Brain", url: createPageUrl("FitnessBrain"), icon: Brain },
  { title: "Exercises", url: createPageUrl("Exercises"), icon: Dumbbell },
  { title: "Stretches", url: createPageUrl("Stretches"), icon: Timer },
  { title: "Nutrition", url: createPageUrl("Nutrition"), icon: Apple },
  { title: "Saved Workouts", url: createPageUrl("SavedWorkouts"), icon: BookmarkPlus },
  { title: "Preset Programs", url: createPageUrl("PresetPrograms"), icon: Calendar },
  { title: "History", url: createPageUrl("History"), icon: History },
  { title: "Progress", url: createPageUrl("Progress"), icon: Camera },
  { title: "Achievements", url: createPageUrl("Achievements"), icon: Trophy },
  { title: "Measurements", url: createPageUrl("BodyMeasurements"), icon: Ruler },
  { title: "Community", url: createPageUrl("Community"), icon: Users },
  { title: "Watch Mode", url: createPageUrl("WatchMode"), icon: Clock },
  { title: "Smart Watch Hub", url: createPageUrl("SmartWatchHub"), icon: Watch },
  { title: "Add-Ons & Pricing", url: createPageUrl("AddOns"), icon: ShoppingBag },
  { title: "Referrals", url: createPageUrl("Referrals"), icon: Gift },
  { title: "Upload 3D Models", url: createPageUrl("Upload3DModels"), icon: Box },
  { title: "Help", url: createPageUrl("Help"), icon: HelpCircle },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateToTab, activeTab } = useNavigationManager();

  // Robust sessionStorage-based scroll memory for all routes
  useScrollMemory("main-content");
  const [hasActiveWorkout, setHasActiveWorkout] = React.useState(false);
  const [workoutTimer, setWorkoutTimer] = React.useState(0);
  const [showProgramPopup, setShowProgramPopup] = React.useState(false);
  const [activeProgram, setActiveProgram] = React.useState(null);
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  React.useEffect(() => {
    // System-aware theme: respect user's OS preference
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleThemeChange);
    
    document.body.style.backgroundColor = '#020817';
    document.body.style.backgroundImage = 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/1e7ad6a4e_RnS_HomePage_Concept_bg.png)';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    
    // Set viewport meta tag for optimal mobile viewing (including older iPhones)
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimum-scale=1.0';

    // Add safe area support for older devices
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 20px)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 20px)');

    // Check for active program on mount
    checkActiveProgram();
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  const checkActiveProgram = async () => {
    try {
      const user = await base44.auth.me();
      const popupShown = sessionStorage.getItem('programPopupShown');
      
      if (user.active_program && !popupShown) {
        setActiveProgram(user.active_program);
        setShowProgramPopup(true);
        sessionStorage.setItem('programPopupShown', 'true');
      }
    } catch (error) {
      console.log('No user logged in or no active program');
    }
  };

  const startProgramDay = async () => {
    try {
      const programs = await PresetProgram.filter({ id: activeProgram.program_id });
      if (programs.length === 0) return;
      
      const program = programs[0];
      const day = program.daily_plans[activeProgram.current_day - 1];
      
      if (day.is_rest_day) {
        alert(`Day ${activeProgram.current_day} is a rest day.`);
        setShowProgramPopup(false);
        return;
      }

      const allExercises = await Exercise.list();
      const exercises = day.exercises.map(ex => {
        const dbExercise = allExercises.find(e => e.name.toLowerCase() === ex.exercise_name.toLowerCase());
        return {
          exercise_id: dbExercise?.id || 'custom',
          exercise_name: ex.exercise_name,
          target_reps: ex.target_reps,
          sets: ex.sets || 1,
          completed_reps: 0,
          completed_time: 0,
          metric: 'reps',
          category: dbExercise?.category || 'full_body',
          image_url: dbExercise?.image_url,
          instructions: dbExercise?.instructions
        };
      });

      const warmupExercises = [
        { id: 'warmup-1', name: 'Walk in Place', category: 'warmup', metric: 'time', target_time: 60 },
        { id: 'warmup-2', name: 'Arm Circles Forward', category: 'warmup', metric: 'time', target_time: 15 },
        { id: 'warmup-3', name: 'Hip Circles', category: 'warmup', metric: 'time', target_time: 20 }
      ].map(ex => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        target_reps: 0,
        target_time: ex.target_time,
        sets: 1,
        completed_reps: 0,
        completed_time: 0,
        metric: 'time',
        category: 'warmup'
      }));

      const workoutData = {
        name: `${program.name} - Day ${activeProgram.current_day}`,
        exercises: [...warmupExercises, ...exercises],
        workout_type: "rep_based",
        difficulty: program.difficulty,
        rest_time: day.exercises[0]?.rest_after_circuit_seconds || 300,
        program_id: program.id,
        program_day: activeProgram.current_day
      };

      const workout = await Workout.create(workoutData);
      setShowProgramPopup(false);
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workout.id}`);
    } catch (error) {
      console.error('Failed to start program day:', error);
      alert('Failed to start workout');
    }
  };

  // Check for active workout and update timer
  React.useEffect(() => {
    const checkActiveWorkout = () => {
      const savedState = localStorage.getItem('activeWorkoutState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Validate the state has required data
          if (state.workout && state.isActive !== false) {
            setHasActiveWorkout(true);
            setWorkoutTimer(state.timer || 0);
          } else {
            // Invalid or ended workout state
            setHasActiveWorkout(false);
            localStorage.removeItem('activeWorkoutState');
          }
        } catch (error) {
          console.error('[Layout] Invalid workout state, clearing:', error);
          setHasActiveWorkout(false);
          localStorage.removeItem('activeWorkoutState');
        }
      } else {
        setHasActiveWorkout(false);
      }
    };

    checkActiveWorkout();
    const interval = setInterval(checkActiveWorkout, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resumeWorkout = () => {
    const savedState = localStorage.getItem('activeWorkoutState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const workoutId = state.workout?.id;
        if (workoutId) {
          navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workoutId}`);
        } else {
          navigate(createPageUrl("ActiveWorkout"));
        }
      } catch (error) {
        navigate(createPageUrl("ActiveWorkout"));
      }
    } else {
      navigate(createPageUrl("ActiveWorkout"));
    }
  };

  return (
    <SidebarProvider>
      <style>
        {`
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          
          button, a, [role="button"], input[type="submit"] {
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
            cursor: pointer;
            /* Ensure all interactive elements meet 44px minimum */
            min-height: 44px;
          }

          /* Override min-height for inline/icon buttons that deliberately break the rule */
          button.no-min-height {
            min-height: unset;
          }
          
          /* Allow text selection in content areas */
          p, span, h1, h2, h3, h4, h5, h6, li, td, th, label, .selectable-text {
            user-select: text;
            -webkit-user-select: text;
          }
          
          input, textarea, select {
            touch-action: manipulation;
            /* Prevent zoom on focus in iOS Safari — global rule in index.css handles font-size */
          }

          /* Suppress browser outline in favour of our own focus-visible ring */
          *:focus:not(:focus-visible) {
            outline: none;
          }

          /* Prevent horizontal browser swipe-back gesture on scroll containers */
          #main-content {
            touch-action: pan-y;
            overscroll-behavior-x: none;
            overscroll-behavior-y: contain;
          }
          
          html, body {
            background-color: #020817 !important;
            color: #f9fafb !important;
            overflow: hidden;
            height: 100vh;
            position: fixed;
            width: 100%;
            /* Prevent rubber-band scroll bounce */
            overscroll-behavior: none;
          }
          
          :root {
            --brand-blue: #00a9ff;
            --brand-blue-dark: #007fbf;
            --background: #020817;
            --foreground: #f9fafb;
            --card: rgba(10, 20, 40, 0.8);
            --card-foreground: #f9fafb;
            --primary-gradient: linear-gradient(135deg, #00a9ff 0%, #005c8a 100%);
          }
          
          .dark {
            --background: #020817;
            --foreground: #f9fafb;
            --card: rgba(10, 20, 40, 0.8);
            --card-foreground: #f9fafb;
            --popover: rgba(10, 20, 40, 0.95);
            --popover-foreground: #f9fafb;
            --primary: #00a9ff;
            --primary-foreground: #ffffff;
            --secondary: #1e3a5f;
            --secondary-foreground: #ffffff;
            --muted: #1e3a5f;
            --muted-foreground: #d1d5db;
            --accent: #1e3a5f;
            --accent-foreground: #ffffff;
            --destructive: #ef4444;
            --destructive-foreground: #ffffff;
            --border: rgba(0, 169, 255, 0.3);
            --input: rgba(10, 20, 40, 0.8);
            --ring: #00a9ff;
          }
          
          .gradient-bg {
            background: var(--primary-gradient);
          }
          
          .text-brand {
            color: var(--brand-blue);
          }
        `}
      </style>
      <div className="min-h-screen flex w-full dark" style={{ backgroundColor: 'transparent', color: '#f9fafb' }}>
        {/* Program Reminder Popups */}
        <ProgramReminderPopup />
        
        {/* Global background-sync indicator */}
        <SyncIndicator />
        
        <Sidebar className="border-r border-[#0a0e1a] bg-[#0a0e1a] hidden md:flex">
          <SidebarHeader className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="RepsAndSteps Logo" className="w-9 h-9" />
              <img src={bannerUrl} alt="RepsAndSteps" className="h-4" />
            </div>
          </SidebarHeader>
          
          <SidebarContent className="py-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-gray-800/50 transition-all duration-200 rounded-none mb-0 border-0 ${
                          location.pathname === item.url ? 'bg-[#0066cc] text-white' : 'text-gray-300'
                        }`}
                      >
                        <Link
                          to={item.url}
                          aria-label={item.title}
                          aria-current={location.pathname === item.url ? "page" : undefined}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <item.icon className="w-4 h-4" aria-hidden="true" />
                          <span className="font-normal text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="px-3 mt-4">
              <Link to={createPageUrl("Pricing")}>
                <Button className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold py-2 rounded-md">
                  <Star className="w-4 h-4 mr-2" />
                  Go Pro
                </Button>
              </Link>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-800/50 p-4">
            <div className="text-center text-xs text-gray-500">
              Push your limits 💪
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'transparent', height: '100vh' }}>
          {/* Program Day Popup */}
          {showProgramPopup && activeProgram && (
            <ProgramDayPopup
              program={activeProgram}
              onStart={startProgramDay}
              onIgnore={() => setShowProgramPopup(false)}
            />
          )}

          {/* Mobile Menu Bar - hidden on desktop since sidebar handles it */}
          <div
            className="md:hidden sticky top-0 z-50 bg-[#0a1628]/95 backdrop-blur-lg border-b-2 border-brand-blue/40 shadow-lg"
            style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 0px))" }}
          >
            <div className="flex items-center justify-between px-3 py-3">
              {/* Hamburger Menu - Extra large clickable area */}
              <SidebarTrigger aria-label="Open navigation menu" className="tap-target text-white hover:bg-brand-blue/20 rounded-lg transition-all touch-manipulation active:scale-95 -ml-2">
                <div className="flex flex-col gap-2 p-4" aria-hidden="true">
                  <div className="w-8 h-1 bg-current rounded-full"></div>
                  <div className="w-8 h-1 bg-current rounded-full"></div>
                  <div className="w-8 h-1 bg-current rounded-full"></div>
                </div>
              </SidebarTrigger>
              
              {/* Logo - Clickable to Home */}
              <Link to={createPageUrl("Home")} className="flex items-center gap-2 touch-manipulation active:scale-95 py-2 px-3 -mr-2">
                <img src={logoUrl} alt="Logo" className="w-9 h-9" />
                <img src={bannerUrl} alt="RepsAndSteps" className="h-4" />
              </Link>
            </div>
          </div>

          {/* Active Workout Banner */}
          {hasActiveWorkout && !location.pathname.includes('/ActiveWorkout') && (
            <div 
              onClick={resumeWorkout}
              role="button"
              tabIndex={0}
              aria-label="Resume active workout"
              onKeyDown={(e) => e.key === 'Enter' && resumeWorkout()}
              className="bg-gradient-to-r from-brand-blue/95 to-blue-600/95 backdrop-blur-lg text-white px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity sticky top-0 z-50 border-b-2 border-blue-400"
            >
              <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-pulse">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Workout in Progress</p>
                    <p className="text-xs text-white/90">Tap to resume</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <Timer className="w-4 h-4" />
                  <span className="font-mono font-bold">{formatTime(workoutTimer)}</span>
                </div>
              </div>
            </div>
          )}

          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden" 
            style={{ 
              backgroundColor: 'transparent',
              overscrollBehaviorX: 'none',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              // Reserve space for the fixed bottom nav (56px) + safe area on mobile
              paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            }} 
            id="main-content"
          >
            <MobileRouteTransition>
              {children}
            </MobileRouteTransition>
          </div>

          {/* Bottom Navigation Bar - Mobile Only */}
          <BottomNav activeTab={activeTab} navigateToTab={navigateToTab} />
        </main>
      </div>
    </SidebarProvider>
  );
}