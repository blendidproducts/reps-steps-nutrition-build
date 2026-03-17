import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer, Play, Pause, SkipForward, RotateCcw, X,
  Search, ChevronDown, ChevronUp, Calendar,
  Zap, Trophy, ArrowRight, CheckCircle, Info,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// All known stretch names in the database
const STRETCH_NAMES = [
  "Toe Touches", "Hip Circles", "Arm Circles Forward", "Arm Circles Backward",
  "Tricep Overhead Stretch", "Cross-Body Arm Stretch", "Chest Opener Stretch",
  "Quad Stretch", "Cat-Cow Stretch",
  "Standing Hamstring Stretch", "Standing Quad Stretch", "Hip Flexor Lunge Stretch",
  "Seated Spinal Twist", "Child's Pose", "Doorway Chest Stretch", "Neck Side Stretch",
  "Shoulder Cross-Body Stretch", "Tricep Overhead Stretch", "Seated Butterfly Stretch",
  "Lying Glute Stretch (Figure-4)", "World's Greatest Stretch", "Pigeon Pose",
  "Downward Dog", "Shoulder Thread the Needle", "Side Lying Quad Stretch",
  "Kneeling Hip Flexor Stretch with Reach", "Supine Spinal Twist", "Wall Calf Stretch",
  "Seated Forward Fold", "Cobra Pose", "Standing IT Band Stretch",
  "Wrist and Forearm Stretch", "Overhead Lat Stretch"
];

const STRETCH_PROGRAMS = [
  {
    id: "beginner",
    name: "Beginner Flexibility Foundation",
    emoji: "🌱",
    color: "from-green-600 to-emerald-700",
    border: "border-green-500/40",
    badge: "bg-green-600",
    days: 7,
    description: "Gentle 7-day program to build foundational flexibility and reduce daily tension.",
    stretches: [
      { name: "Neck Side Stretch", duration: 30, sets: 2 },
      { name: "Shoulder Cross-Body Stretch", duration: 30, sets: 2 },
      { name: "Tricep Overhead Stretch", duration: 30, sets: 2 },
      { name: "Doorway Chest Stretch", duration: 30, sets: 2 },
      { name: "Standing Hamstring Stretch", duration: 30, sets: 2 },
      { name: "Standing Quad Stretch", duration: 30, sets: 2 },
      { name: "Cat-Cow Stretch", duration: 45, sets: 2 },
      { name: "Child's Pose", duration: 45, sets: 2 },
    ]
  },
  {
    id: "intermediate",
    name: "Intermediate Mobility Builder",
    emoji: "🔥",
    color: "from-orange-600 to-amber-700",
    border: "border-orange-500/40",
    badge: "bg-orange-600",
    days: 10,
    description: "10-day program progressing into deeper stretches and dynamic mobility work.",
    stretches: [
      { name: "World's Greatest Stretch", duration: 45, sets: 2 },
      { name: "Pigeon Pose", duration: 60, sets: 2 },
      { name: "Kneeling Hip Flexor Stretch with Reach", duration: 45, sets: 2 },
      { name: "Shoulder Thread the Needle", duration: 45, sets: 2 },
      { name: "Seated Forward Fold", duration: 45, sets: 2 },
      { name: "Seated Spinal Twist", duration: 45, sets: 2 },
      { name: "Downward Dog", duration: 45, sets: 2 },
      { name: "Supine Spinal Twist", duration: 45, sets: 2 },
    ]
  },
  {
    id: "advanced",
    name: "Advanced Flexibility Mastery",
    emoji: "⚡",
    color: "from-purple-600 to-violet-800",
    border: "border-purple-500/40",
    badge: "bg-purple-600",
    days: 14,
    description: "14-day deep flexibility program for athletes targeting full range of motion.",
    stretches: [
      { name: "World's Greatest Stretch", duration: 60, sets: 3 },
      { name: "Pigeon Pose", duration: 90, sets: 3 },
      { name: "Kneeling Hip Flexor Stretch with Reach", duration: 60, sets: 3 },
      { name: "Shoulder Thread the Needle", duration: 60, sets: 3 },
      { name: "Seated Forward Fold", duration: 60, sets: 2 },
      { name: "Side Lying Quad Stretch", duration: 60, sets: 2 },
      { name: "Seated Spinal Twist", duration: 60, sets: 2 },
      { name: "Supine Spinal Twist", duration: 60, sets: 2 },
      { name: "Downward Dog", duration: 60, sets: 3 },
      { name: "Child's Pose", duration: 60, sets: 2 },
    ]
  }
];

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "upper_body", label: "Upper" },
  { value: "lower_body", label: "Lower" },
  { value: "core", label: "Core / Spine" },
  { value: "full_body", label: "Full Body" },
];

const YOUTUBE_MAP = {
  "toe touches": "g_tea8ZNk5A",
  "hip circles": "nmwgirgXLYM",
  "arm circles": "IODxDxX7oi4",
  "quad stretch": "QOVaHwm-Q6U",
  "cat-cow": "pSHjTRCQxIw",
  "tricep": "yN6Q1UI_xkE",
  "chest": "IODxDxX7oi4",
  "hamstring": "g_tea8ZNk5A",
  "hip flexor": "h-MnRqnM7R4",
  "butterfly": "KBf5cBEhbpA",
  "child": "qZ_KaFIBiPM",
  "pigeon": "1sHBgLl4Pqw",
  "downward dog": "j97SSGsnCAQ",
  "cobra": "JDkxCQbBN8Q",
  "spinal twist": "CxiAWZnM0bY",
  "calf": "9cYEuFbBLSY",
  "glute": "PnRlbevmRLI",
  "world": "h-MnRqnM7R4",
  "shoulder": "IODxDxX7oi4",
  "lat stretch": "IODxDxX7oi4",
  "wrist": "yN6Q1UI_xkE",
  "it band": "QOVaHwm-Q6U",
  "forward fold": "g_tea8ZNk5A",
};

function getYouTubeId(name) {
  const lower = name.toLowerCase();
  for (const [key, id] of Object.entries(YOUTUBE_MAP)) {
    if (lower.includes(key)) return id;
  }
  return "g_tea8ZNk5A";
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Active Stretch Session ─────────────────────────────────────────────────
function StretchSession({ queue, onComplete, onExit }) {
  const [idx, setIdx] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [phase, setPhase] = useState("stretch"); // stretch | rest
  const [restCount, setRestCount] = useState(0);
  const intervalRef = useRef(null);

  const current = queue[idx];
  const totalItems = queue.reduce((s, q) => s + q.sets, 0);
  const doneItems = queue.slice(0, idx).reduce((s, q) => s + q.sets, 0) + (setNum - 1);

  useEffect(() => {
    if (!isRunning) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      if (phase === "stretch") {
        setElapsed(e => {
          if (e + 1 >= current.duration) {
            // Set done
            clearInterval(intervalRef.current);
            if (setNum < current.sets) {
              // Rest between sets
              setPhase("rest");
              setRestCount(15);
              setElapsed(0);
            } else {
              // Move to next stretch
              if (idx + 1 < queue.length) {
                setIdx(i => i + 1);
                setSetNum(1);
                setPhase("rest");
                setRestCount(20);
                setElapsed(0);
              } else {
                onComplete?.();
              }
            }
            return 0;
          }
          return e + 1;
        });
      } else {
        // rest countdown
        setRestCount(r => {
          if (r <= 1) {
            setPhase("stretch");
            if (setNum < current.sets && elapsed === 0) {
              setSetNum(s => s + 1);
            }
            return 0;
          }
          return r - 1;
        });
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, phase, idx, setNum, current]);

  const skip = () => {
    clearInterval(intervalRef.current);
    if (idx + 1 < queue.length) {
      setIdx(i => i + 1);
      setSetNum(1);
      setPhase("stretch");
      setElapsed(0);
    } else {
      onComplete?.();
    }
  };

  const progress = phase === "stretch" ? (elapsed / current.duration) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 bg-[#020817] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onExit} className="text-gray-400 hover:text-white p-2">
          <X className="w-5 h-5" />
        </button>
        <div className="text-gray-400 text-sm font-medium">
          {doneItems + 1} / {totalItems} sets
        </div>
        <div className="w-9" />
      </div>

      {/* Overall progress */}
      <Progress value={(doneItems / totalItems) * 100} className="h-1 mx-4 rounded-full" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {phase === "rest" ? (
          <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-6xl mb-4">😮‍💨</div>
            <h2 className="text-white text-2xl font-bold mb-2">Rest</h2>
            <div className="text-7xl font-black text-[#00a9ff] mb-4">{restCount}</div>
            <p className="text-gray-400 text-sm">Next: {idx + 1 < queue.length && setNum >= current.sets ? queue[idx + 1]?.name : `Set ${setNum + 1} of ${current.name}`}</p>
            <Button onClick={() => { setPhase("stretch"); setRestCount(0); setSetNum(s => setNum < current.sets ? s + 1 : s); }}
              className="mt-6 bg-[#00a9ff] hover:bg-[#007fbf] font-bold px-8">
              Skip Rest
            </Button>
          </motion.div>
        ) : (
          <motion.div key={`${idx}-${setNum}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm">
            <Badge className="mb-3 bg-[#00a9ff]/20 text-[#00a9ff] border border-[#00a9ff]/30">
              Set {setNum} of {current.sets}
            </Badge>
            <h2 className="text-white text-3xl font-black mb-2">{current.name}</h2>
            <p className="text-gray-400 text-sm mb-6">Hold for {current.duration}s</p>

            {/* Circular timer */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(0,169,255,0.15)" strokeWidth="10" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="#00a9ff" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-4xl font-black text-white">{current.duration - elapsed}</div>
                  <div className="text-gray-400 text-xs text-center">sec</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setIsRunning(r => !r)}
                className={`w-16 h-16 rounded-full text-white font-bold ${isRunning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}>
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button onClick={skip}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            {/* Instructions preview */}
            {current.instructions && current.instructions.length > 0 && (
              <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">How to do it</p>
                <ol className="space-y-1">
                  {current.instructions.slice(0, 3).map((inst, i) => (
                    <li key={i} className="text-gray-300 text-xs flex gap-2">
                      <span className="text-[#00a9ff] font-bold shrink-0">{i + 1}.</span>
                      {inst}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Queue preview */}
      <div className="px-4 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {queue.map((s, i) => (
            <div key={i} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              i === idx ? "bg-[#00a9ff] text-white border-[#00a9ff]" :
              i < idx ? "bg-green-500/20 text-green-400 border-green-500/30" :
              "bg-white/5 text-gray-500 border-white/10"
            }`}>
              {i < idx ? "✓ " : ""}{s.name.split(" ").slice(0, 2).join(" ")}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function StretchDetailModal({ stretch, onClose, onStart }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-[#0a1628] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-black text-xl">{stretch.name}</h3>
              <div className="flex gap-2 mt-1 flex-wrap">
                {stretch.muscle_groups?.map(m => (
                  <Badge key={m} variant="outline" className="text-xs border-white/20 text-gray-400">{m}</Badge>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* YouTube embed */}
          <div className="w-full aspect-video bg-black rounded-xl mb-4 overflow-hidden">
            <iframe width="100%" height="100%"
              src={`https://www.youtube.com/embed/${getYouTubeId(stretch.name)}?rel=0`}
              title={stretch.name} frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
          </div>

          <p className="text-gray-300 text-sm mb-4">{stretch.description}</p>

          {stretch.instructions?.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#00a9ff]" /> Instructions
              </h4>
              <ol className="space-y-2">
                {stretch.instructions.map((inst, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-[#00a9ff] font-bold shrink-0">{i + 1}.</span>
                    {inst}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {stretch.tips?.length > 0 && (
            <div className="bg-[#00a9ff]/5 border border-[#00a9ff]/20 rounded-xl p-4 mb-4">
              <h4 className="text-[#00a9ff] font-semibold text-sm mb-2">💡 Tips</h4>
              <ul className="space-y-1">
                {stretch.tips.map((tip, i) => (
                  <li key={i} className="text-gray-300 text-sm">• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={() => { onStart(stretch); onClose(); }}
            className="w-full bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold py-3 h-auto rounded-xl">
            <Play className="w-4 h-4 mr-2" /> Start This Stretch
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Stretches() {
  const navigate = useNavigate();
  const [allStretches, setAllStretches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [detailStretch, setDetailStretch] = useState(null);
  const [sessionQueue, setSessionQueue] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [activeTab, setActiveTab] = useState("library"); // library | programs
  const [expandedProgram, setExpandedProgram] = useState(null);

  useEffect(() => { loadStretches(); }, []);

  const loadStretches = async () => {
    setIsLoading(true);
    const exercises = await base44.entities.Exercise.list();
    const stretchExercises = exercises.filter(ex =>
      STRETCH_NAMES.some(n => n.toLowerCase() === ex.name?.toLowerCase()) &&
      !ex.is_deleted
    );
    // Dedupe by name
    const seen = new Set();
    const unique = stretchExercises.filter(ex => {
      if (seen.has(ex.name?.toLowerCase())) return false;
      seen.add(ex.name?.toLowerCase());
      return true;
    });
    setAllStretches(unique);
    setIsLoading(false);
  };

  const filtered = allStretches.filter(s => {
    const matchCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const startSession = (stretches) => {
    // Build queue with instructions merged
    const queue = stretches.map(s => {
      const dbStretch = allStretches.find(a => a.name.toLowerCase() === s.name.toLowerCase());
      return {
        name: s.name,
        duration: s.duration || 30,
        sets: s.sets || 1,
        instructions: dbStretch?.instructions || [],
        tips: dbStretch?.tips || [],
        muscle_groups: dbStretch?.muscle_groups || []
      };
    }).filter(s => {
      // Only include ones we have data for or just use the name
      return true;
    });
    setSessionQueue(queue);
    setSessionDone(false);
  };

  const startSingleStretch = (stretch) => {
    startSession([{ name: stretch.name, duration: 30, sets: 1 }]);
  };

  const startFullLibraryRoutine = () => {
    startSession(filtered.slice(0, 10).map(s => ({ name: s.name, duration: 30, sets: 1 })));
  };

  const difficultyColor = (d) => {
    if (d === "beginner") return "bg-green-600";
    if (d === "intermediate") return "bg-orange-600";
    return "bg-red-600";
  };

  if (sessionDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{ backgroundColor: "#020817" }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-8xl mb-6">🧘</div>
          <h2 className="text-white text-3xl font-black mb-3">Routine Complete!</h2>
          <p className="text-gray-400 mb-8">Great work. Your body will thank you.</p>
          <Button onClick={() => setSessionDone(false)}
            className="bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold px-10 py-3 h-auto rounded-xl">
            Back to Stretches
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Active Session Overlay */}
      <AnimatePresence>
        {sessionQueue && !sessionDone && (
          <StretchSession
            queue={sessionQueue}
            onComplete={() => { setSessionQueue(null); setSessionDone(true); }}
            onExit={() => setSessionQueue(null)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen pb-28" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
        {/* Header */}
        <div className="gradient-bg text-white py-6 px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Stretching & Mobility</h1>
            <p className="text-white/80 text-sm">{allStretches.length} stretches · 3 programs</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-5">
          {/* Quick Start */}
          <Button onClick={startFullLibraryRoutine}
            className="w-full gradient-bg text-white font-bold py-4 h-auto rounded-xl mb-5 gap-2 text-base">
            <Play className="w-5 h-5" /> Start Full Routine ({Math.min(filtered.length, 10)} stretches)
          </Button>

          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-5">
            {[
              { id: "library", label: "Stretch Library", icon: Activity },
              { id: "programs", label: "Programs", icon: Calendar }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t.id ? "bg-[#00a9ff] text-white shadow" : "text-gray-400 hover:text-gray-200"
                  }`}>
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* ── LIBRARY TAB ── */}
              {activeTab === "library" && (
                <div>
                  {/* Search + Category Filter */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search stretches…"
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {CATEGORIES.map(c => (
                        <button key={c.value} onClick={() => setSelectedCategory(c.value)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            selectedCategory === c.value
                              ? "bg-[#00a9ff] text-white border-[#00a9ff]"
                              : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                          }`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Array(8).fill(0).map((_, i) => (
                        <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Timer className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No stretches found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map((stretch, i) => (
                        <motion.div key={stretch.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#00a9ff]/40 transition-all cursor-pointer"
                          onClick={() => setDetailStretch(stretch)}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-white font-semibold text-sm leading-tight">{stretch.name}</h3>
                            <Badge className={`${difficultyColor(stretch.difficulty)} text-white text-[10px] shrink-0 ml-2`}>
                              {stretch.difficulty}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{stretch.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                              {stretch.muscle_groups?.slice(0, 2).map(m => (
                                <span key={m} className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">{m}</span>
                              ))}
                            </div>
                            <Button onClick={e => { e.stopPropagation(); startSingleStretch(stretch); }}
                              size="sm"
                              className="h-7 px-3 text-xs bg-[#00a9ff] hover:bg-[#007fbf] text-white">
                              <Play className="w-3 h-3 mr-1" /> Start
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PROGRAMS TAB ── */}
              {activeTab === "programs" && (
                <div className="space-y-4">
                  {STRETCH_PROGRAMS.map((prog, i) => (
                    <motion.div key={prog.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`border ${prog.border} rounded-2xl overflow-hidden`}>
                      {/* Program Header */}
                      <div className={`bg-gradient-to-r ${prog.color} p-5`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{prog.emoji}</span>
                              <Badge className={`${prog.badge} text-white text-xs capitalize`}>
                                {prog.id}
                              </Badge>
                            </div>
                            <h3 className="text-white font-black text-lg">{prog.name}</h3>
                            <p className="text-white/80 text-xs mt-1">{prog.description}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-white font-black text-2xl">{prog.days}</div>
                            <div className="text-white/70 text-xs">days</div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={() => startSession(prog.stretches)}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold h-auto py-3 rounded-xl gap-2">
                            <Play className="w-4 h-4" /> Start Program
                          </Button>
                          <Button
                            onClick={() => navigate(`${createPageUrl("PresetPrograms")}?tab=stretch`)}
                            variant="ghost"
                            className="text-white/80 hover:bg-white/10 border border-white/20 rounded-xl px-3">
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <button
                            onClick={() => setExpandedProgram(expandedProgram === prog.id ? null : prog.id)}
                            className="text-white/80 hover:text-white p-2">
                            {expandedProgram === prog.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Program Stretch List */}
                      <AnimatePresence>
                        {expandedProgram === prog.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[#0a1628] overflow-hidden">
                            <div className="p-4 space-y-2">
                              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
                                {prog.stretches.length} stretches in this program
                              </p>
                              {prog.stretches.map((s, si) => (
                                <div key={si} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-xs font-mono w-4">{si + 1}.</span>
                                    <span className="text-gray-200 text-sm">{s.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-xs">{s.duration}s × {s.sets}</span>
                                  </div>
                                </div>
                              ))}
                              <Button onClick={() => startSession(prog.stretches)}
                                className="w-full bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold mt-3 rounded-xl">
                                <Zap className="w-4 h-4 mr-2" /> Start Full Program Now
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {/* Tip card */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-400">
                    <p className="font-medium text-gray-300 mb-1">💡 How to use programs</p>
                    <p>Programs pair with the PresetPrograms page — each program has a full 7–14 day schedule with daily stretch routines. Hit "Start Program" here to do today's session, or track your progress in <span className="text-[#00a9ff]">Preset Programs → Workout Programs</span>.</p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Stretch Detail Modal */}
      <AnimatePresence>
        {detailStretch && (
          <StretchDetailModal
            stretch={detailStretch}
            onClose={() => setDetailStretch(null)}
            onStart={startSingleStretch}
          />
        )}
      </AnimatePresence>
    </>
  );
}