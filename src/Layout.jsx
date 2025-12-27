import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Dumbbell, Settings, History, HelpCircle, Star, BookmarkPlus, Calendar, Camera, Apple, Play, Timer, Trophy, Ruler, Gift } from "lucide-react";
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
  { title: "Programs", url: createPageUrl("Programs"), icon: Calendar },
  { title: "History", url: createPageUrl("History"), icon: History },
  { title: "Progress", url: createPageUrl("Progress"), icon: Camera },
  { title: "Achievements", url: createPageUrl("Achievements"), icon: Trophy },
  { title: "Measurements", url: createPageUrl("BodyMeasurements"), icon: Ruler },
  { title: "Referrals", url: createPageUrl("Referrals"), icon: Gift },
  { title: "Help", url: createPageUrl("Help"), icon: HelpCircle },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasActiveWorkout, setHasActiveWorkout] = React.useState(false);
  const [workoutTimer, setWorkoutTimer] = React.useState(0);
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  React.useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#0a0a0a';
    
    // Set viewport meta tag to allow pinch-to-zoom
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes';
  }, []);

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
            background-color: #0a0a0a !important;
            color: #f9fafb !important;
          }
          
          :root {
            --brand-blue: #00a9ff;
            --brand-blue-dark: #007fbf;
            --background: #0a0a0a;
            --foreground: #f9fafb;
            --card: #1a1a1a;
            --card-foreground: #f9fafb;
            --primary-gradient: linear-gradient(135deg, #00a9ff 0%, #005c8a 100%);
          }
          
          .dark {
            --background: #0a0a0a;
            --foreground: #f9fafb;
            --card: #1a1a1a;
            --card-foreground: #f9fafb;
            --popover: #1a1a1a;
            --popover-foreground: #f9fafb;
            --primary: #00a9ff;
            --primary-foreground: #ffffff;
            --secondary: #27272a;
            --secondary-foreground: #ffffff;
            --muted: #27272a;
            --muted-foreground: #d1d5db;
            --accent: #27272a;
            --accent-foreground: #ffffff;
            --destructive: #ef4444;
            --destructive-foreground: #ffffff;
            --border: #27272a;
            --input: #27272a;
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
      <div className="min-h-screen flex w-full dark" style={{ backgroundColor: '#0a0a0a', color: '#f9fafb' }}>
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="RepsAndSteps Logo" className="w-10 h-10 rounded-lg" />
              <div>
                <img src={bannerUrl} alt="RepsAndSteps" className="h-5" />
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-gray-700/50 hover:text-brand transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-gray-700 text-brand' : 'text-gray-300'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="px-2 mt-4">
              <Link to={createPageUrl("Pricing")}>
                <Button className="w-full gradient-bg text-white font-bold hover:opacity-90">
                  <Star className="w-4 h-4 mr-2" />
                  Go Pro
                </Button>
              </Link>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <div className="text-center text-xs text-gray-500">
              Push your limits 💪
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
          <header className="bg-card border-b border-border px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200" />
              <img src={bannerUrl} alt="RepsAndSteps" className="h-6" />
            </div>
          </header>

          {/* Active Workout Banner */}
          {hasActiveWorkout && !location.pathname.includes('/ActiveWorkout') && (
            <div 
              onClick={resumeWorkout}
              className="bg-gradient-to-r from-brand-blue to-blue-600 text-white px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity sticky top-0 z-50 border-b-2 border-blue-400"
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

          <div className="flex-1 overflow-auto" style={{ backgroundColor: '#0a0a0a' }}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}