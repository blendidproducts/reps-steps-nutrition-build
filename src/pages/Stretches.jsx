import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Play, Timer, ChevronDown, ChevronUp, X, SkipForward, RotateCcw, Youtube, Box, Lightbulb, CheckCircle2, Video, ChevronLeft } from "lucide-react";
import Exercise3DViewer from "@/components/Exercise3DViewer";
import { optImg } from "@/lib/imgOpt";
// The built-in stretch catalogue. Moved out of this file so /ContentAudit can
// read it too — it reports the entries with no Exercise record, which can never
// be given a photo or a video.
import { STRETCH_LIBRARY } from "@/lib/stretchLibrary";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "upper_body", label: "Upper Body" },
  { id: "lower_body", label: "Lower Body" },
  { id: "core", label: "Core" },
  { id: "full_body", label: "Full Body" },
  { id: "mobility", label: "Mobility" },
];

const STRETCH_PROGRAMS = [
  {
    id: "beginner",
    name: "Beginner Flexibility Foundation",
    description: "Gentle 7-day routine to build baseline flexibility",
    duration_days: 7,
    difficulty: "beginner",
    color: "from-green-600 to-emerald-700",
    stretches: [
      { name: "Standing Hamstring Stretch", hold: 30, sets: 2 },
      { name: "Hip Flexor Lunge Stretch", hold: 30, sets: 2 },
      { name: "Seated Butterfly Stretch", hold: 30, sets: 2 },
      { name: "Chest Opener Stretch", hold: 20, sets: 2 },
      { name: "Neck Side Stretch", hold: 20, sets: 2 },
      { name: "Child's Pose", hold: 45, sets: 2 },
    ]
  },
  {
    id: "intermediate",
    name: "Intermediate Mobility Flow",
    description: "10-day deep-tissue mobility program",
    duration_days: 10,
    difficulty: "intermediate",
    color: "from-blue-600 to-indigo-700",
    stretches: [
      { name: "Pigeon Pose", hold: 45, sets: 2 },
      { name: "World's Greatest Stretch", hold: 30, sets: 3 },
      { name: "Downward Dog", hold: 40, sets: 3 },
      { name: "Seated Spinal Twist", hold: 30, sets: 2 },
      { name: "Figure-4 Glute Stretch", hold: 40, sets: 2 },
      { name: "Doorway Chest Stretch", hold: 30, sets: 3 },
      { name: "Hip Flexor Lunge Stretch", hold: 45, sets: 3 },
    ]
  },
  {
    id: "advanced",
    name: "Advanced Performance Recovery",
    description: "14-day advanced program for athletes",
    duration_days: 14,
    difficulty: "advanced",
    color: "from-red-600 to-orange-700",
    stretches: [
      { name: "Pigeon Pose", hold: 60, sets: 3 },
      { name: "World's Greatest Stretch", hold: 45, sets: 3 },
      { name: "Cobra Stretch", hold: 60, sets: 3 },
      { name: "Supine Spinal Twist", hold: 60, sets: 3 },
      { name: "Standing Quadriceps Stretch", hold: 45, sets: 3 },
      { name: "Shoulder Cross-Body Stretch", hold: 45, sets: 3 },
      { name: "Downward Dog", hold: 60, sets: 3 },
      { name: "Seated Butterfly Stretch", hold: 60, sets: 3 },
    ]
  },
  {
    id: "mobility-extras",
    name: "Mobility Extras",
    description: "Targeted stretches for grip, IT band, lats, and wrists not covered by the core programs",
    duration_days: 7,
    difficulty: "beginner",
    color: "from-teal-600 to-cyan-700",
    stretches: [
      { name: "Calf Stretch (wall)", hold: 30, sets: 2 },
      { name: "IT Band Stretch", hold: 30, sets: 2 },
      { name: "Thread the Needle", hold: 30, sets: 2 },
      { name: "Seated Forward Fold", hold: 30, sets: 2 },
      { name: "Overhead Lat Stretch", hold: 30, sets: 2 },
      { name: "Overhead Tricep Stretch", hold: 30, sets: 2 },
      { name: "Knees to Chest", hold: 30, sets: 2 },
      { name: "Forearm Stretch", hold: 20, sets: 2 },
    ]
  }
];

// Only render images that will actually load. Google Drive view/thumbnail links
// do not hotlink reliably, so we skip them and show a clean card instead.
const isUsableImg = (u) => !!u;

// Turn a YouTube / Drive / direct video URL into an inline-embeddable player spec.
function videoEmbed(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/.test(url)) {
    const src = url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "www.youtube.com/embed/")
      .split("&")[0];
    return { type: "iframe", src };
  }
  if (/drive\.google\.com/.test(url)) {
    const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
    return m ? { type: "iframe", src: `https://drive.google.com/file/d/${m[1]}/preview` } : null;
  }
  return { type: "video", src: url };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

function ActiveSession({ stretches, onClose }) {
  const [idx, setIdx] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState("stretch"); // stretch | rest
  const [timeLeft, setTimeLeft] = useState(stretches[0]?.hold || 30);
  const [isRunning, setIsRunning] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Web Audio beeps for the timer (no asset files needed)
  const armAudio = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch (_) {}
  };
  const beep = (freq = 880, dur = 0.12, vol = 0.18) => {
    try {
      const ctx = audioCtxRef.current; if (!ctx) return;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq; gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  };

  const current = stretches[idx];
  const currentImg = current?.image_url;
  useEffect(() => { setShow3D(false); setShowVideo(false); }, [idx]);
  const totalSets = current?.sets || 2;
  const restTime = 10;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            beep(phase === "rest" ? 988 : 660, 0.4, 0.25); // transition tone
            handleNext();
            return 0;
          }
          if (t <= 4) beep(880, 0.08, 0.14); // last few-second ticks
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, idx, set, phase]);

  const handleNext = () => {
    clearInterval(timerRef.current);
    if (phase === "stretch") {
      if (set < totalSets) {
        setPhase("rest");
        setTimeLeft(restTime);
      } else {
        if (idx + 1 < stretches.length) {
          setIdx(i => i + 1);
          setSet(1);
          setPhase("stretch");
          setTimeLeft(stretches[idx + 1]?.hold || 30);
        } else {
          setIsRunning(false);
          setPhase("done");
        }
      }
    } else {
      setSet(s => s + 1);
      setPhase("stretch");
      setTimeLeft(current?.hold || 30);
    }
    setIsRunning(true);
  };

  const progress = phase === "stretch"
    ? ((current?.hold - timeLeft) / current?.hold) * 100
    : ((restTime - timeLeft) / restTime) * 100;

  const isDone = phase === "done";

  return (
    <div className="fixed inset-0 bg-[#020817] z-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 pb-10 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-white font-bold text-lg leading-tight">Active Session</h2>
            <p className="text-gray-400 text-xs">{isDone ? "Complete" : `Stretch ${idx + 1} of ${stretches.length}`}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDone ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-white text-2xl font-bold mb-2">Session Complete!</h3>
            <p className="text-gray-400 mb-6">Great job! You completed all stretches.</p>
            <Button onClick={onClose} className="bg-[#00a9ff] hover:bg-[#0090e0] text-white font-bold">Done</Button>
          </div>
        ) : (
          <>
            {/* Progress + set */}
            <div className="flex items-center gap-3 mb-5">
              <Progress value={(idx / stretches.length) * 100} className="h-1.5 flex-1" />
              <span className="text-gray-400 text-xs whitespace-nowrap">Set {set} of {totalSets}</span>
            </div>

            {/* Main card: image + timer side by side */}
            <div className="bg-[#0e1525] border border-white/10 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <Badge className={phase === "rest" ? "bg-amber-500 text-white" : "bg-[#00a9ff] text-white"}>
                  {phase === "rest" ? "REST" : "HOLD"}
                </Badge>
                <h3 className="text-white text-2xl font-bold truncate">
                  {phase === "rest" ? "Rest & Breathe" : current?.name}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                {phase !== "rest" && isUsableImg(currentImg) && (
                  <img src={currentImg} alt={current?.name}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border border-white/10 shrink-0" />
                )}
                <div className="relative flex-1 aspect-square max-w-[170px] mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle cx="50" cy="50" r="44" fill="none"
                      stroke={phase === "rest" ? "#f59e0b" : "#00a9ff"} strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                      strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-4xl font-black leading-none">{timeLeft}</span>
                    <span className="text-gray-400 text-xs font-semibold tracking-wider mt-1">SEC</span>
                  </div>
                </div>
              </div>
              {phase === "rest" && (
                <p className="text-gray-400 text-sm text-center mt-3">Next: {current?.name} — Set {set + 1}</p>
              )}
            </div>

            {/* TIPS */}
            {phase !== "rest" && current?.tips?.length > 0 && (
              <div className="bg-[#0e1525] border border-white/10 rounded-2xl p-4 mb-4">
                <p className="text-[#00a9ff] font-bold text-sm mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> TIPS
                </p>
                <div className="space-y-2.5">
                  {current.tips.map((t, i) => (
                    <div key={i} className="flex gap-2.5 text-gray-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#00a9ff] shrink-0 mt-0.5" /><span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video toggle + embed */}
            {phase !== "rest" && (current?.youtube_url || current?.video_url) && (
              <>
                <button onClick={() => setShowVideo(v => !v)}
                  className="w-full mb-3 h-12 rounded-2xl bg-[#0e1525] border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/5">
                  <Video className="w-5 h-5" /> {showVideo ? "Hide Video" : "Video"}
                </button>
                {showVideo && (() => {
                  const v = videoEmbed(current.youtube_url || current.video_url);
                  if (!v) return null;
                  return (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                      {v.type === "iframe" ? (
                        <iframe src={v.src} title={current?.name} className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      ) : (
                        <video src={v.src} controls className="w-full h-full">Your browser does not support the video tag.</video>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* 3D toggle + viewer */}
            {phase !== "rest" && current?.model_url && (
              <>
                <button onClick={() => setShow3D(v => !v)}
                  className="w-full mb-3 h-12 rounded-2xl bg-[#0e1525] border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/5">
                  <Box className="w-5 h-5" /> {show3D ? "Hide 3D" : "3D Model"}
                </button>
                {show3D && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-white/10" style={{ height: 240 }}>
                    <Exercise3DViewer modelUrl={current.model_url} exerciseName={current.name} />
                  </div>
                )}
              </>
            )}

            {/* Controls */}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => { armAudio(); setIsRunning(r => !r); }}
                className="flex-1 bg-[#3b6fff] hover:bg-[#2f5fe6] text-white font-bold h-14 rounded-2xl text-base">
                {isRunning ? "Pause" : <><Play className="w-5 h-5 mr-2 fill-white" /> Start</>}
              </Button>
              <Button onClick={handleNext} variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 h-14 px-5 rounded-2xl">
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Catches any render/runtime error inside the timed session so the screen
// shows the actual error instead of crashing to black.
class SessionErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Stretch session error:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <h2 className="text-white text-xl font-bold mb-3">Couldn't start this session</h2>
            <p className="text-red-400 text-sm mb-5 break-words">
              {String((this.state.error && this.state.error.message) || this.state.error)}
            </p>
            <Button onClick={this.props.onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Stretches() {
  const [exercises, setExercises] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("library"); // library | programs
  const [expandedProgram, setExpandedProgram] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // array of stretch objects
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    let result = exercises;
    if (category !== "all") result = result.filter(e => e.category === category);
    if (search) result = result.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [exercises, category, search]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Exercise.filter({ metric: "time" });
      const dbList = Array.isArray(data) ? data : [];
      const have = new Set(dbList.map(e => (e.name || "").toLowerCase().trim()));
      const merged = [...dbList, ...STRETCH_LIBRARY.filter(s => !have.has(s.name.toLowerCase().trim()))];
      setExercises(merged.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (e) {
      console.error("Failed to load Stretches data:", e);
      setExercises([...STRETCH_LIBRARY].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } finally {
      setIsLoading(false);
    }
  };

  const startProgram = (program) => {
    setActiveSession(program.stretches.map(s => {
      const ex = exercises.find(e => (e.name || "").toLowerCase() === s.name.toLowerCase()) || {};
      return { ...ex, name: s.name, hold: s.hold, sets: s.sets };
    }));
  };

  const startLibraryStretch = (exercise) => {
    setActiveSession([{ ...exercise, hold: exercise.target_time || 30, sets: 3 }]);
  };

  const difficultyColor = {
    beginner: "bg-green-600",
    intermediate: "bg-yellow-600",
    advanced: "bg-red-600",
  };

  return (
    <div style={{ backgroundColor: "#020817", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Active Session Overlay */}
      {activeSession && (
        <SessionErrorBoundary onClose={() => setActiveSession(null)}>
          <ActiveSession stretches={activeSession} onClose={() => setActiveSession(null)} />
        </SessionErrorBoundary>
      )}

      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1f3c] to-[#020817] border-b border-white/10 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Timer className="w-6 h-6 text-[#00a9ff]" /> Stretching & Flexibility
          </h1>
          <p className="text-gray-400 text-sm">Browse stretches or follow a guided program</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1 mb-5 border border-white/10">
          {["library", "programs"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-[#00a9ff] text-white shadow-lg shadow-[#00a9ff]/20" : "text-gray-400 hover:text-gray-200"
              }`}>
              {tab === "library" ? "Stretch Library" : "Programs"}
            </button>
          ))}
        </div>

        {/* LIBRARY TAB */}
        {activeTab === "library" && (
          <>
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search stretches..."
                  className="pl-9 bg-[#0e1525] border-white/10 text-white rounded-xl" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === c.id ? "bg-[#00a9ff] text-white" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Timer className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No stretches found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(exercise => {
                  const subtitle = (exercise.description || "").split(/Muscles:|\.\s/)[0].trim();
                  const open = selectedExercise?.id === exercise.id;
                  const hasVideo = !!(exercise.youtube_url || exercise.video_url);
                  return (
                  <motion.div key={exercise.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`bg-[#0e1525] rounded-2xl border ${open ? "border-[#00a9ff]/60" : "border-white/10"} overflow-hidden transition-all`}>
                      <div className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => setSelectedExercise(open ? null : exercise)}>
                        {isUsableImg(exercise.image_url) ? (
                          <img src={optImg(exercise.image_url, 200)} alt={exercise.name} loading="lazy" decoding="async"
                            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                            className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Timer className="w-7 h-7 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-base leading-tight truncate">{exercise.name}</h3>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{subtitle}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-semibold text-[#00a9ff] bg-[#00a9ff]/15 rounded-full px-2 py-0.5">
                              {exercise.target_time || 30}s hold
                            </span>
                            {hasVideo && (
                              <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                                <Youtube className="w-3 h-3" /> Video
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); startLibraryStretch(exercise); }}
                          className="shrink-0 w-12 h-12 rounded-full bg-[#00a9ff] hover:bg-[#0090e0] flex items-center justify-center shadow-lg shadow-[#00a9ff]/30 active:scale-95 transition">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-white/10">
                              {exercise.instructions?.length > 0 && (
                                <>
                                  <p className="text-white font-semibold text-xs mt-3 mb-2">How to do it</p>
                                  <ol className="space-y-1.5 mb-3">
                                    {exercise.instructions.map((step, i) => (
                                      <li key={i} className="text-gray-300 text-xs flex gap-2">
                                        <span className="text-[#00a9ff] font-bold shrink-0">{i + 1}.</span><span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </>
                              )}
                              {exercise.tips?.length > 0 && (
                                <div className="bg-[#00a9ff]/10 rounded-xl p-3">
                                  <p className="text-[#00a9ff] text-xs font-semibold mb-2 flex items-center gap-1.5">
                                    <Lightbulb className="w-3.5 h-3.5" /> Tips
                                  </p>
                                  <div className="space-y-1.5">
                                    {exercise.tips.map((tip, i) => (
                                      <p key={i} className="text-gray-300 text-xs flex gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a9ff] shrink-0 mt-0.5" /><span>{tip}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <Button onClick={() => startLibraryStretch(exercise)}
                                className="w-full mt-3 bg-[#00a9ff] hover:bg-[#0090e0] text-white font-bold h-11">
                                <Play className="w-4 h-4 mr-2 fill-white" /> Start Stretch
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* PROGRAMS TAB */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            {STRETCH_PROGRAMS.map(program => (
              <Card key={program.id} className="bg-[#0e1525] border-white/10 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${program.color} p-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base">{program.name}</h3>
                      <p className="text-white/80 text-xs mt-0.5">{program.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={`${difficultyColor[program.difficulty]} text-white text-xs`}>
                          {program.difficulty}
                        </Badge>
                        <Badge className="bg-white/20 text-white text-xs">
                          {program.duration_days} days
                        </Badge>
                        <Badge className="bg-white/20 text-white text-xs">
                          {program.stretches.length} stretches
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <button onClick={() => setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                    className="flex items-center gap-2 text-gray-400 text-xs hover:text-white mb-3 transition-colors">
                    {expandedProgram === program.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedProgram === program.id ? "Hide stretches" : "Preview stretches"}
                  </button>

                  <AnimatePresence>
                    {expandedProgram === program.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <div className="space-y-2">
                          {program.stretches.map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                              <span className="text-gray-200 text-sm">{i+1}. {s.name}</span>
                              <span className="text-gray-400 text-xs">{s.hold}s × {s.sets}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button onClick={() => startProgram(program)}
                    className="w-full bg-[#00a9ff] hover:bg-[#0090e0] text-white font-bold h-11">
                    <Play className="w-4 h-4 mr-2 fill-white" /> Start Program
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}