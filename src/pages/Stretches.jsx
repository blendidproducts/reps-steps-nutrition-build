import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Play, Timer, ChevronDown, ChevronUp, X, SkipForward, RotateCcw } from "lucide-react";

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
  const timerRef = useRef(null);

  const current = stretches[idx];
  const totalSets = current?.sets || 2;
  const restTime = 10;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleNext();
            return 0;
          }
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
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Active Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isDone ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-white text-2xl font-bold mb-2">Session Complete!</h3>
            <p className="text-gray-400 mb-6">Great job! You completed all stretches.</p>
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white">Done</Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Stretch {idx + 1} of {stretches.length}</span>
              <span>Set {set} of {totalSets}</span>
            </div>
            <Progress value={(idx / stretches.length) * 100} className="h-1.5 mb-6" />

            {/* Current stretch */}
            <Card className="bg-gray-900 border-gray-700 mb-6">
              <CardContent className="p-6 text-center">
                <Badge className={phase === "rest" ? "bg-yellow-600 mb-3" : "bg-blue-600 mb-3"}>
                  {phase === "rest" ? "REST" : "HOLD"}
                </Badge>
                <h3 className="text-white text-xl font-bold mb-2">
                  {phase === "rest" ? "Rest & Breathe" : current?.name}
                </h3>
                {phase === "rest" && (
                  <p className="text-gray-400 text-sm mb-3">
                    Next: {current?.name} — Set {set + 1}
                  </p>
                )}

                {/* Timer circle */}
                <div className="relative w-36 h-36 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={phase === "rest" ? "#d97706" : "#3b82f6"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">{timeLeft}</span>
                  </div>
                </div>

                <Progress value={progress} className="h-2 mb-4" />
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-3">
              <Button onClick={() => setIsRunning(r => !r)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12">
                {isRunning ? "Pause" : <><Play className="w-4 h-4 mr-2" />Start</>}
              </Button>
              <Button onClick={handleNext} variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 h-12 px-4">
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
      setExercises(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (e) {
      console.error("Failed to load Stretches data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startProgram = (program) => {
    setActiveSession(program.stretches.map(s => ({ name: s.name, hold: s.hold, sets: s.sets })));
  };

  const startLibraryStretch = (exercise) => {
    setActiveSession([{ name: exercise.name, hold: exercise.target_time || 30, sets: 3 }]);
  };

  const difficultyColor = {
    beginner: "bg-green-600",
    intermediate: "bg-yellow-600",
    advanced: "bg-red-600",
  };

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Active Session Overlay */}
      {activeSession && (
        <ActiveSession stretches={activeSession} onClose={() => setActiveSession(null)} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Timer className="w-6 h-6" /> Stretching & Flexibility
          </h1>
          <p className="text-white/80 text-sm">Browse stretches or follow a guided program</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 mb-5">
          {["library", "programs"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
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
                  className="pl-9 bg-gray-900 border-gray-700 text-white" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === c.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Timer className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No stretches found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(exercise => (
                  <motion.div key={exercise.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="bg-gray-900 border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => setSelectedExercise(selectedExercise?.id === exercise.id ? null : exercise)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm truncate">{exercise.name}</h3>
                            <p className="text-gray-400 text-xs mt-0.5">{exercise.description}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <Badge className="bg-blue-600/30 text-blue-300 text-xs">
                              {exercise.target_time || 30}s
                            </Badge>
                            <Button onClick={e => { e.stopPropagation(); startLibraryStretch(exercise); }}
                              size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3">
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {selectedExercise?.id === exercise.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                {exercise.instructions?.length > 0 && (
                                  <ol className="space-y-1 mb-3">
                                    {exercise.instructions.map((step, i) => (
                                      <li key={i} className="text-gray-300 text-xs flex gap-2">
                                        <span className="text-blue-400 font-bold shrink-0">{i+1}.</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                                {exercise.tips?.length > 0 && (
                                  <div className="bg-blue-500/10 rounded-lg p-3">
                                    <p className="text-blue-400 text-xs font-semibold mb-1">Tips</p>
                                    {exercise.tips.map((tip, i) => (
                                      <p key={i} className="text-gray-300 text-xs">• {tip}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PROGRAMS TAB */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            {STRETCH_PROGRAMS.map(program => (
              <Card key={program.id} className="bg-gray-900 border-gray-700 overflow-hidden">
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
                            <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                              <span className="text-gray-200 text-sm">{i+1}. {s.name}</span>
                              <span className="text-gray-400 text-xs">{s.hold}s × {s.sets}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button onClick={() => startProgram(program)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold">
                    <Play className="w-4 h-4 mr-2" /> Start Program
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