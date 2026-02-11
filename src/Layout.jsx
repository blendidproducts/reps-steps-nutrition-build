import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Dumbbell, Settings, History, HelpCircle, Star, BookmarkPlus, Calendar, Camera, Apple, Play, Timer, Trophy, Ruler, Gift, Box } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PresetProgram } from "@/entities/PresetProgram";
import { Exercise } from "@/entities/Exercise";
import { Workout } from "@/entities/Workout";
import ProgramDayPopup from "@/components/ProgramDayPopup";
import MobileHeader from "@/components/MobileHeader";
import MobileRouteTransition from "@/components/MobileRouteTransition";
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
  { title: "Exercises", url: createPageUrl("Exercises"), icon: Dumbbell },
  { title: "Stretches", url: createPageUrl("Stretches"), icon: Timer },
  { title: "Nutrition", url: createPageUrl("Nutrition"), icon: Apple },
  { title: "Saved Workouts", url: createPageUrl("SavedWorkouts"), icon: BookmarkPlus },
  { title: "Preset Programs", url: createPageUrl("PresetPrograms"), icon: Calendar },
  { title: "History", url: createPageUrl("History"), icon: History },
  { title: "Progress", url: createPageUrl("Progress"), icon: Camera },
  { title: "Achievements", url: createPageUrl("Achievements"), icon: Trophy },
  { title: "Measurements", url: createPageUrl("BodyMeasurements"), icon: Ruler },
  { title: "Referrals", url: createPageUrl("Referrals"), icon: Gift },
  { title: "Upload 3D Models", url: createPageUrl("Upload3DModels"), icon: Box },
  { title: "Help", url: createPageUrl("Help"), icon: HelpCircle },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = React.useRef(null);

  // Prevent scroll to top on navigation
  React.useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent && location.state?.preventScroll !== true) {
      // Only reset scroll if it's a new navigation (not a back button)
      const isNavigatingForward = !location.state?.fromBack;
      if (isNavigatingForward) {
        mainContent.scrollTop = 0;
      }
    }
  }, [location.pathname]);
  const [hasActiveWorkout, setHasActiveWorkout] = React.useState(false);
  const [workoutTimer, setWorkoutTimer] = React.useState(0);
  const [showProgramPopup, setShowProgramPopup] = React.useState(false);
  const [activeProgram, setActiveProgram] = React.useState(null);
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  React.useEffect(() => {
    document.documentElement.classList.add('dark');
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
          setHasActiveWorkout(true);
          setWorkoutTimer(state.timer || 0);
        } catch (error) {
          setHasActiveWorkout(false);
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
          }
          
          html, body {
            background-color: #020817 !important;
            color: #f9fafb !important;
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
        <Sidebar className="border-r border-[#0a0e1a] bg-[#0a0e1a]">
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
                        <Link to={item.url} className="flex items-center gap-3 px-5 py-3">
                          <item.icon className="w-4 h-4" />
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

        <main className="flex-1 flex flex-col" style={{ backgroundColor: 'transparent' }}>
          {/* Program Day Popup */}
          {showProgramPopup && activeProgram && (
            <ProgramDayPopup
              program={activeProgram}
              onStart={startProgramDay}
              onIgnore={() => setShowProgramPopup(false)}
            />
          )}

          {/* Mobile Header with Smart Back Button */}
          <MobileHeader currentPageName={currentPageName} />

          {/* Active Workout Banner */}
          {hasActiveWorkout && !location.pathname.includes('/ActiveWorkout') && (
            <div 
              onClick={resumeWorkout}
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
            className="flex-1 overflow-auto" 
            style={{ 
              backgroundColor: 'transparent',
              overscrollBehaviorY: 'none',
              WebkitOverflowScrolling: 'touch'
            }} 
            id="main-content"
          >
            {/* Mobile: Animated route transitions */}
            <div className="md:hidden">
              <MobileRouteTransition>
                {children}
              </MobileRouteTransition>
            </div>
            {/* Desktop: No animation */}
            <div className="hidden md:block">
              {children}
            </div>
          </div>

          {/* Bottom Navigation Bar - Mobile Only */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a1628]/95 backdrop-blur-lg border-t border-brand-blue/30 z-50 select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around px-2 py-2">
              <Link to={createPageUrl("Home")} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${location.pathname === createPageUrl("Home") ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400'}`}>
                <Home className="w-5 h-5" />
                <span className="text-[10px] font-medium">Home</span>
              </Link>
              <Link to={createPageUrl("Exercises")} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${location.pathname === createPageUrl("Exercises") ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400'}`}>
                <Dumbbell className="w-5 h-5" />
                <span className="text-[10px] font-medium">Exercises</span>
              </Link>
              <Link to={createPageUrl("Nutrition")} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${location.pathname === createPageUrl("Nutrition") ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400'}`}>
                <Apple className="w-5 h-5" />
                <span className="text-[10px] font-medium">Nutrition</span>
              </Link>
              <Link to={createPageUrl("History")} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${location.pathname === createPageUrl("History") ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400'}`}>
                <History className="w-5 h-5" />
                <span className="text-[10px] font-medium">History</span>
              </Link>
              <Link to={createPageUrl("Settings")} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${location.pathname === createPageUrl("Settings") ? 'text-brand-blue bg-brand-blue/10' : 'text-gray-400'}`}>
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-medium">Settings</span>
              </Link>
            </div>
          </nav>
        </main>
      </div>
    </SidebarProvider>
  );
}