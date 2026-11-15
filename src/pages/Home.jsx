import React, { useState, useEffect, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Star, Dumbbell, Apple, Calendar, ArrowRight, Brain, Timer, Info, TrendingUp, Activity, CheckCircle2, Moon, ChevronRight, MoreVertical, ClipboardCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import ProgramStatusStrip from "@/components/ProgramStatusStrip";
import { featuredChallenge } from "@/lib/fitnessTests";
import { todaysRoutine, LEVELS, LEVEL_LABEL } from "@/lib/quickWorkouts";
import { createQuickWorkout } from "@/lib/programDay";
const FitnessQuiz = React.lazy(() => import("@/components/FitnessQuiz"));
const MuscleRecovery = React.lazy(() => import("@/components/recovery/MuscleRecovery"));

/* The three main actions share one card design (2026-11-13, JT: "it should
   be the same three major buttons: generate AI workout, fitness tests, and AI
   rep tracking"). Same size, icon tile, kicker, title, line and CTA; only the
   colour and icon change, so they read as a set. */
function AirtpGlyph({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.4V5.8A2.8 2.8 0 0 1 5.8 3h2.6" />
      <path d="M15.6 3h2.6A2.8 2.8 0 0 1 21 5.8v2.6" />
      <path d="M21 15.6v2.6a2.8 2.8 0 0 1-2.8 2.8h-2.6" />
      <path d="M8.4 21H5.8A2.8 2.8 0 0 1 3 18.2v-2.6" />
      <circle cx="12" cy="9.6" r="2.3" fill="#fff" stroke="none" />
      <path d="M7.9 17.6c0-2.3 1.8-3.9 4.1-3.9s4.1 1.6 4.1 3.9z" fill="#fff" stroke="none" />
    </svg>
  );
}
function MajorCard({ color, dark, icon, kicker, title, line, cta, onClick, children }) {
  return (
    <div className="px-6 mb-4">
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform p-5"
        style={{
          background: `linear-gradient(135deg, ${dark[0]} 0%, ${dark[1]} 45%, ${dark[2]} 100%)`,
          border: `2px solid ${color}8c`,
          boxShadow: `0 0 40px ${color}2e, 0 8px 32px rgba(0,0,0,0.45)`,
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${dark[0]})`, boxShadow: `0 0 22px ${color}66` }}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color }}>{kicker}</p>
            <h2 className="text-2xl font-black text-white leading-tight">{title}</h2>
            <p className="text-gray-300 text-sm mt-1 leading-snug">{line}</p>
          </div>
        </div>
        {children}
        <button
          className="w-full mt-4 py-3.5 rounded-xl font-black text-sm tracking-wide text-white flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${color}, ${dark[0]})`, boxShadow: `0 4px 15px ${color}59` }}
        >
          {cta} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* START NOW — one tap to a workout (2026-11-13, JT: "I'm a beginner, I'm
   intermediate, I'm advanced … they just click a button to start the
   workout"). Each button opens today's routine for that level (it rotates
   daily) straight into ActiveWorkout. Stretch buttons do the same. */
const LEVEL_STYLE = {
  beginner: { color: "#22c55e", emoji: "🌱", hint: "New, or getting back into it" },
  intermediate: { color: "#00a9ff", emoji: "💪", hint: "You work out most weeks" },
  advanced: { color: "#f97316", emoji: "🔥", hint: "Pull-ups, pistols, burpees" },
};
const routineMinutes = (rt, kind) => Math.max(5, Math.round(rt.exercises.reduce((m, e) =>
  m + e.sets * ((e.target_reps ? e.target_reps * 3 : e.target_time) + (kind === "stretch" ? 10 : 45)), 0) / 60 + (kind === "stretch" ? 0 : 3)));

function QuickStart({ navigate }) {
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const go = async (kind, level) => {
    if (busy) return;
    setBusy(`${kind}-${level}`); setErr(null);
    try {
      const id = await createQuickWorkout(todaysRoutine(kind, level), level, kind);
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${id}`);
    } catch (e) {
      setErr(e?.message || "Couldn't start — try again."); setBusy(null);
    }
  };
  return (
    <div className="px-6 mb-6">
      <div className="rounded-2xl p-5" style={{ background: "#0a0e1a", border: "2px solid rgba(255,255,255,0.14)" }}>
        <h2 className="text-2xl font-black text-white leading-none">START NOW</h2>
        <p className="text-gray-400 text-sm mt-1.5">Tap your level — today's workout opens right away. Not sure? Pick Beginner.</p>
        <div className="space-y-2.5 mt-4">
          {LEVELS.map((lv) => {
            const st = LEVEL_STYLE[lv], rt = todaysRoutine("workout", lv), on = busy === `workout-${lv}`;
            return (
              <button key={lv} onClick={() => go("workout", lv)} disabled={!!busy}
                className="w-full flex items-center gap-3 rounded-xl px-4 text-left active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ minHeight: 68, background: `${st.color}1f`, border: `2px solid ${st.color}99` }}>
                <span className="text-2xl" aria-hidden="true">{st.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-black text-white leading-tight">I'm {lv === "advanced" || lv === "intermediate" ? "" : "a "}{LEVEL_LABEL[lv]}</span>
                  <span className="block text-[12px] text-gray-300 truncate">
                    {on ? "Building your workout…" : `${rt.name} · ~${routineMinutes(rt, "workout")} min · ${st.hint}`}
                  </span>
                </span>
                <Play className="w-6 h-6 flex-shrink-0" style={{ color: st.color, fill: st.color }} />
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mt-5 mb-2">Just want to stretch?</p>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((lv) => {
            const rt = todaysRoutine("stretch", lv), on = busy === `stretch-${lv}`;
            return (
              <button key={lv} onClick={() => go("stretch", lv)} disabled={!!busy}
                className="rounded-xl px-2 py-2.5 text-center active:scale-[0.97] disabled:opacity-60"
                style={{ minHeight: 60, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.45)" }}>
                <span className="block text-sm font-black text-white">{on ? "Opening…" : { beginner: "Easy", intermediate: "Medium", advanced: "Deep" }[lv]}</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">~{routineMinutes(rt, "stretch")} min stretch</span>
              </button>
            );
          })}
        </div>
        {err && <p className="text-sm text-red-400 mt-3">{err}</p>}
      </div>
    </div>
  );
}

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
      
      // Notify admins
      try {
        await base44.functions.invoke("notifyQuizCompleted", { answers });
      } catch (err) {
        console.error("Failed to notify admins:", err);
      }

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
          <img src="https://media.base44.com/images/public/69b0d8a7555cbcc1f5fe3154/850e6f723_RnS_worlds_Greatest_Stretch.png" alt="Workout Background" className="w-full h-full object-cover" />
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
            <div />

            {/* AI Match Score Card */}
            <div className="bg-[#0a0e1a]/95 backdrop-blur-md border border-gray-800 rounded-2xl p-3 shadow-2xl z-20 w-36 transform translate-y-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-300 font-medium">AI Match Score</span>
                <Info className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-[#00E5FF] mb-0.5">92%</div>
              <div className="flex items-center gap-1 text-[#00E5FF] text-[10px] mb-2 font-medium">
                <TrendingUp className="w-3 h-3" />
                Excellent Fit
              </div>
              <div className="flex gap-1">
                 <div className="h-1 w-full bg-[#00E5FF] rounded-full"></div>
                 <div className="h-1 w-full bg-[#00E5FF] rounded-full"></div>
                 <div className="h-1 w-full bg-[#00E5FF] rounded-full"></div>
                 <div className="h-1 w-full bg-[#00E5FF] rounded-full"></div>
                 <div className="h-1 w-full bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Round 30: program status. Sits directly under the hero so "what day am
          I on" is answered without opening anything. One line tall by default,
          taps open for today's plan + Start. Renders nothing when the user has
          no active program, so Home is untouched for everyone else. */}
      <ProgramStatusStrip />

      <QuickStart navigate={navigate} />

      {/* ── HOLIDAY CHALLENGE (2026-11-09) ───────────────────────────────
          Veterans Day Murph. Shows only while featuredChallenge() says it's in
          season (Nov 1 – Nov 12); renders nothing the rest of the year. */}
      {(() => {
        const f = featuredChallenge();
        if (!f) return null;
        const when = f.today ? "TODAY" : f.daysLeft > 0 ? `${f.daysLeft} DAY${f.daysLeft === 1 ? "" : "S"} TO GO` : "THIS WEEK";
        const go = () => navigate(`${createPageUrl("FitnessTest")}?test=${f.battery.key}`);
        return (
          <div className="px-6 mb-4">
            <div onClick={go} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && go()}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{
                background: "linear-gradient(135deg, #3b0a0a 0%, #1a0b24 50%, #071a2e 100%)",
                border: "2px solid rgba(239,68,68,0.7)",
                boxShadow: "0 0 36px rgba(239,68,68,0.22)",
              }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-red-300">
                  🇺🇸 {f.battery.holiday.name.toUpperCase()} · NOV {f.battery.holiday.day}
                </span>
                <span className="ml-auto text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-white text-[#7f1d1d]">
                  {when}
                </span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight mt-1.5 leading-none">VETERANS DAY MURPH</p>
              <p className="text-gray-300 text-[13px] mt-1.5 leading-snug">
                1 mile · 100 pull-ups · 200 push-ups · 300 squats · 1 mile. For time.
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">In honor of LT Michael P. Murphy</span>
                <span className="text-[12px] font-black text-white flex items-center gap-1">
                  Take it <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── THE THREE MAIN ACTIONS (2026-11-13) ─────────────────────────── */}
      <MajorCard
        color="#a855f7" dark={["#2a0f4a", "#1a0a30", "#0b0418"]}
        icon={<Sparkles className="w-8 h-8 text-white" />}
        kicker="Takes 30 seconds"
        title="Generate AI Workout"
        line="Pick your level, focus and time — get a full workout built for you."
        cta="GENERATE AI WORKOUT"
        onClick={() => navigate(createPageUrl("AIWorkoutGenerator"))}
      />

      <MajorCard
        color="#00a9ff" dark={["#0b2742", "#071a2e", "#03101c"]}
        icon={<ClipboardCheck className="w-8 h-8 text-white" />}
        kicker="Military · first responder · custom"
        title="Fitness Tests"
        line="Find out where you actually stand. Scored, timed, recorded."
        cta="TAKE A FITNESS TEST"
        onClick={() => navigate(createPageUrl("FitnessTest"))}
      >
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { key: "military", label: "MILITARY", sub: "Every branch + heroes" },
            { key: "repsandsteps", label: "REPS & STEPS", sub: "Your output score" },
            { key: "custom", label: "CUSTOM", sub: "Build your own" },
          ].map((g) => (
            <button
              key={g.key}
              onClick={(e) => { e.stopPropagation(); navigate(`${createPageUrl("FitnessTest")}?group=${g.key}`); }}
              className="text-left rounded-xl px-2.5 py-2 min-h-[52px] transition-colors hover:bg-white/10"
              style={{ background: "rgba(0,169,255,0.10)", border: "1px solid rgba(0,169,255,0.30)" }}
            >
              <span className="block text-[11px] font-bold tracking-widest text-[#7fd4ff]">{g.label}</span>
              <span className="block text-[10px] text-gray-400 leading-tight mt-0.5">{g.sub}</span>
            </button>
          ))}
        </div>
      </MajorCard>

      <MajorCard
        color="#22c55e" dark={["#0f3d24", "#0a2818", "#041209"]}
        icon={<AirtpGlyph className="w-8 h-8" />}
        kicker="AiRTP · main feature"
        title="AI Rep Tracking"
        line="Your camera counts the reps. Guided sets, rest and steps."
        cta="START AI REP TRACKING"
        onClick={() => navigate(createPageUrl("ARTPWorkout"))}
      >
        <div className="flex flex-wrap gap-2 mt-4">
          {["Auto Rep Count", "Step Tracker", "AMRAP + Timed", "Front or side camera"].map((tag) => (
            <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
              {tag}
            </span>
          ))}
        </div>
      </MajorCard>

      {/* ── Go Pro promo ($9.99/mo) — hidden for existing Pro members ── */}
      {!isPro && (
        <div className="px-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="relative rounded-2xl overflow-hidden border border-[#00a9ff]/40"
            style={{ background: "linear-gradient(135deg, #0a1f3c 0%, #0a0e1a 100%)" }}
          >
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-[#00a9ff] to-indigo-500 text-white text-[10px] font-bold">
                BEST VALUE
              </Badge>
            </div>
            <div className="p-5">
              <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: "#00a9ff" }}>
                Go Pro
              </p>
              <h2 className="text-2xl font-black text-white leading-tight">
                WorkoutGENIE Pro — <span style={{ color: "#00a9ff" }}>$9.99</span>
                <span className="text-base font-normal text-gray-400">/mo</span>
              </h2>
              <p className="text-gray-300 text-sm mt-1 leading-snug">
                Build your own workouts with the AI Builder, generate instant routines with WorkoutGenie, and unlock every workout program, nutrition plan, and stretch.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["AI Workout Builder", "🧞 WorkoutGenie", "All Programs", "All Stretches"].map((f) => (
                  <span key={f} className="text-[11px] font-semibold text-gray-200 bg-white/10 rounded-full px-2.5 py-1">
                    {f}
                  </span>
                ))}
              </div>
              <Button
                onClick={() => window.open("https://buy.stripe.com/cNi4gzdWmdT09q460BbQY0q", "_blank")}
                className="w-full mt-4 bg-gradient-to-r from-[#00a9ff] to-indigo-500 hover:opacity-90 text-white font-bold py-3"
              >
                <Zap className="w-5 h-5 mr-2" /> Get Pro — $9.99/mo
              </Button>
              <button
                onClick={() => window.open("https://buy.stripe.com/7sY6oH7xYg18dGkgFfbQY0s", "_blank")}
                className="w-full text-xs text-green-400 hover:text-green-300 mt-2 font-semibold"
              >
                Or go Annual — $99/yr · save ~17% + 14-day free trial
              </button>
              <button
                onClick={() => navigate(createPageUrl("Pricing"))}
                className="w-full text-xs text-gray-400 hover:text-white mt-2"
              >
                See all plans &amp; the AI add-ons
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
            <img src="https://media.base44.com/images/public/69b0d8a7555cbcc1f5fe3154/850e6f723_RnS_worlds_Greatest_Stretch.png" alt="Workout" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
