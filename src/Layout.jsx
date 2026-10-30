import React, { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNavigationManager, resolveTabForPath, TAB_ROOTS, pushTabPath } from "@/lib/NavigationManager";
import { createPageUrl } from "@/utils";
import rnsLogo from "@/assets/RnS_LOGO.png";
import { Home, Dumbbell, Settings, History, HelpCircle, Star, BookmarkPlus, Calendar, Camera, Apple, Play, Timer, Trophy, Ruler, Gift, Box, Users, Clock, Brain, Watch, ShoppingBag, ListTodo, FileText, ClipboardCheck, ScanLine, CalendarDays } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { base44 } from "@/api/base44Client";
import { loadProgram, isRestPlan, completeRestDay, createProgramDayWorkout } from "@/lib/programDay";
import ProgramDayPopup from "@/components/ProgramDayPopup";
import MobileHeader from "@/components/MobileHeader";
import MobileRouteTransition from "@/components/MobileRouteTransition";
import Chatbot from "@/components/Chatbot";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Home", url: createPageUrl("Home"), icon: Home },
  { title: "Fitness Tests", url: createPageUrl("FitnessTest"), icon: ClipboardCheck },
  { title: "Movement Trainer", url: createPageUrl("MovementTrainer"), icon: ScanLine },
  { title: "AI Fitness Brain", url: createPageUrl("FitnessBrain"), icon: Brain },
  { title: "Exercises", url: createPageUrl("Exercises"), icon: Dumbbell },
  { title: "Stretches", url: createPageUrl("Stretches"), icon: Timer },
  { title: "Nutrition", url: createPageUrl("Nutrition"), icon: Apple },
  { title: "My Workouts", url: createPageUrl("SavedWorkouts"), icon: BookmarkPlus },
  { title: "My Programs", url: createPageUrl("Programs"), icon: CalendarDays },
  { title: "Preset Programs", url: createPageUrl("PresetPrograms"), icon: Calendar },
  { title: "Program Guides", url: createPageUrl("Guides"), icon: FileText },
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
  { title: "Missing Assets", url: createPageUrl("MissingAssets"), icon: ListTodo },
  { title: "Help", url: createPageUrl("Help"), icon: HelpCircle },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

// 2026-10-29 (JT): "the side bar needs to auto collapse" after an item is
// clicked, on mobile AND desktop. Lives inside SidebarProvider (useSidebar
// needs the context). Any route change closes the mobile drawer and folds the
// desktop sidebar back to its icon rail.
function SidebarAutoCollapse() {
  const location = useLocation();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOpenMobile(false);
    if (!isMobile) setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  return null;
}

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
  const logoUrl = rnsLogo;
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

      // Round 30: this used sessionStorage, which resets with the tab/app - so
      // dismissing the program popup only silenced it until the next launch and
      // it kept re-appearing. Dismiss is now remembered PER DAY: once you've
      // seen today's prompt it stays gone until tomorrow. The permanent status
      // lives in <ProgramStatusStrip /> on Home, so nothing is lost by
      // dismissing this.
      const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local date
      let popupShown = false;
      try {
        popupShown = localStorage.getItem('rns_programPopupDay') === todayKey;
      } catch {
        popupShown = false; // storage blocked - show it, better than never
      }

      if (user.active_program && !popupShown) {
        setActiveProgram(user.active_program);
        setShowProgramPopup(true);
        try { localStorage.setItem('rns_programPopupDay', todayKey); } catch { /* not fatal */ }
      }
    } catch (error) {
      console.log('No user logged in or no active program');
    }
  };

  // 2026-10-14: the builder moved to lib/programDay.js so Home's program strip
  // and the Program page can start a day too — before this, dismissing this
  // popup left no working way to continue a program (JT, day 4).
  const startProgramDay = async () => {
    try {
      const program = await loadProgram(activeProgram.program_id);
      if (!program) return;
      const dayNumber = activeProgram.current_day || 1;
      if (isRestPlan(program.daily_plans?.[dayNumber - 1])) {
        if (window.confirm(`Day ${dayNumber} is a rest day. Would you like to mark it as complete and skip to the next day?`)) {
          await completeRestDay(program, dayNumber);
          setShowProgramPopup(false);
          window.location.reload();
        } else {
          setShowProgramPopup(false);
        }
        return;
      }
      const workoutId = await createProgramDayWorkout(program, dayNumber);
      setShowProgramPopup(false);
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${workoutId}`);
    } catch (error) {
      console.error('Failed to start program day:', error);
      alert(error?.message || 'Failed to start workout');
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

  // Hide chrome (header + bottom nav) on full-screen workout pages.
  //
  // ActiveWorkout is immersive for its whole life. ARTPWorkout is NOT: its
  // setup screen is an ordinary page and must keep the tab bar, otherwise the
  // only way out is the small back chevron. ARTPWorkout dispatches
  // "rns:immersive" when it leaves setup (warm-up / countdown / working /
  // rest / done) and again with false on unmount. Default false = nav shown.
  const [artpImmersive, setArtpImmersive] = React.useState(false);

  React.useEffect(() => {
    const onImmersive = (e) => setArtpImmersive(!!e.detail);
    window.addEventListener("rns:immersive", onImmersive);
    return () => window.removeEventListener("rns:immersive", onImmersive);
  }, []);

  // Failsafe: leaving the ARTP route always restores the chrome, even if the
  // page unmounted without dispatching (crash, hard navigation, back gesture).
  React.useEffect(() => {
    if (!location.pathname.includes('ARTPWorkout')) setArtpImmersive(false);
  }, [location.pathname]);

  // Header: unchanged. Both workout pages draw their own top bar, so Layout's
  // mobile header stays hidden for the whole route -- putting it back on the
  // ARTP setup screen would stack two headers.
  const isFullScreenWorkout =
    location.pathname.includes('ARTPWorkout') ||
    location.pathname.includes('ActiveWorkout');

  // Bottom nav: hidden only while a workout is actually running.
  const hideBottomNav =
    location.pathname.includes('ActiveWorkout') ||
    (location.pathname.includes('ARTPWorkout') && artpImmersive);

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarAutoCollapse />
      <style>
        {`
          /* Height of the mobile tab bar (BottomNav): 56px min-height + 12px of
             py-1.5. SINGLE SOURCE OF TRUTH - #main-content reserves this much
             space, and any page pinning something to the bottom (e.g. the
             ARTPWorkout START bar, which is position:sticky inside #main-content) must
             offset by it or the nav lands on top of the control. 0 on desktop,
             where BottomNav is md:hidden. */
          :root { --nav-h: 68px; }
          @media (min-width: 768px) { :root { --nav-h: 0px; } }

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
        
        {/* collapsible="icon": on desktop it rests as a 48px icon rail and the
            ☰ at the top expands it; picking a page folds it back. */}
        <Sidebar collapsible="icon" className="border-r border-[#0a0e1a] bg-[#0a0e1a] hidden md:flex">
          <SidebarHeader className="p-4 border-b border-gray-800/50 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <SidebarTrigger aria-label="Expand or collapse menu" className="hidden md:inline-flex text-gray-300 hover:text-white hover:bg-gray-800/60 h-8 w-8 flex-shrink-0" />
              <img src={logoUrl} alt="RepsAndSteps Logo" className="w-9 h-9 group-data-[collapsible=icon]:hidden" />
              <img src={bannerUrl} alt="RepsAndSteps" className="h-4 group-data-[collapsible=icon]:hidden" />
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
                        tooltip={item.title}
                        className={`hover:bg-gray-800/50 transition-all duration-200 rounded-none mb-0 border-0 ${
                          location.pathname === item.url ? 'bg-[#0066cc] text-white' : 'text-gray-300'
                        }`}
                      >
                        <Link
                          to={item.url}
                          aria-label={item.title}
                          aria-current={location.pathname === item.url ? "page" : undefined}
                          className="flex items-center gap-3 px-5 py-3 group-data-[collapsible=icon]:justify-center"
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          <span className="font-normal text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="px-3 mt-4 group-data-[collapsible=icon]:hidden">
              <Link to={createPageUrl("Pricing")}>
                <Button className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold py-2 rounded-md">
                  <Star className="w-4 h-4 mr-2" />
                  Go Pro
                </Button>
              </Link>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-800/50 p-4 group-data-[collapsible=icon]:hidden">
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

          {/* Mobile Menu Bar - hidden on desktop and on full-screen workout pages */}
          <div
            className={`md:hidden sticky top-0 z-50 bg-[#0a1628]/95 backdrop-blur-lg border-b-2 border-brand-blue/40 shadow-lg ${isFullScreenWorkout ? 'hidden' : ''}`}
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
              // Reserve space for the fixed bottom nav + safe area on mobile.
              // --nav-h is defined in the style block above (68px mobile, 0 desktop).
              paddingBottom: 'calc(var(--nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
            }} 
            id="main-content"
          >
            <MobileRouteTransition>
              {children}
            </MobileRouteTransition>
          </div>

          {/* Bottom Navigation Bar - Mobile Only (hidden on full-screen workout pages) */}
          {!hideBottomNav && <BottomNav activeTab={activeTab} navigateToTab={navigateToTab} />}
          <Chatbot />
        </main>
      </div>
    </SidebarProvider>
  );
}