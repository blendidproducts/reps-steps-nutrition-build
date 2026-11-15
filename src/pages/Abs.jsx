/**
 * Abs.jsx — Abs & Core section (2026-11-15)
 *
 * JT: "We should have a whole ab section. Stretches section is good. Now have
 * programs for the stretches, and we have programs for the abs."
 *
 * Mirrors /Stretches: a Library tab and a Programs tab. Unlike stretches
 * (timed holds), ab work is reps, so every Start goes to AiRTP:
 *   program -> /ARTPWorkout?abs=<id>   (moves + 3 sets + mode preloaded)
 *   one move -> /ARTPWorkout?ex=<name>  (that move, 3 sets)
 * Programs and moves live in lib/absPrograms.js so AiRTP reads the same list.
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Play, ChevronDown, ChevronUp, Camera, Hand, Timer, ChevronRight } from "lucide-react";
import { optImg } from "@/lib/imgOpt";
import { AB_MOVES, AB_PROGRAMS } from "@/lib/absPrograms";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "bar", label: "Pull-up Bar" },
  { id: "floor", label: "Floor" },
  { id: "ai", label: "AI Tracked" },
];

const difficultyColor = { beginner: "bg-green-600", intermediate: "bg-yellow-600", advanced: "bg-red-600" };

function TrackingBadge({ tracking }) {
  if (tracking === "manual") return (
    <span className="text-[10px] font-semibold text-gray-300 bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
      <Hand className="w-3 h-3" /> Tap / type reps
    </span>
  );
  return (
    <span className="text-[10px] font-semibold text-[#00a9ff] bg-[#00a9ff]/15 rounded-full px-2 py-0.5 flex items-center gap-1">
      <Camera className="w-3 h-3" /> AI rep count{tracking === "beta" ? " · beta" : ""}
    </span>
  );
}

export default function Abs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("programs"); // programs | library
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [images, setImages] = useState({}); // lower-case name -> image_url

  useEffect(() => {
    base44.entities.Exercise.list().then(list => {
      const map = {};
      (list || []).forEach(ex => { if (ex.name && ex.image_url) map[ex.name.toLowerCase()] = ex.image_url; });
      setImages(map);
    }).catch(() => {});
  }, []);

  const startProgram = (p) => navigate(`${createPageUrl("ARTPWorkout")}?abs=${encodeURIComponent(p.id)}`);
  const startMove = (m) => navigate(`${createPageUrl("ARTPWorkout")}?ex=${encodeURIComponent(m.name)}`);

  const moves = AB_MOVES.filter(m =>
    filter === "all" ? true :
    filter === "bar" ? m.equipment === "Pull-up bar" :
    filter === "floor" ? m.equipment === "Floor" :
    m.tracking !== "manual");

  const moveByName = Object.fromEntries(AB_MOVES.map(m => [m.name, m]));

  return (
    <div style={{ backgroundColor: "#020817", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#3a2a05] to-[#020817] border-b border-white/10 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Target className="w-6 h-6 text-yellow-400" /> Abs & Core
          </h1>
          <p className="text-gray-400 text-sm">3-set ab programs with AI rep counting. Bar moves count from the camera.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1 mb-5 border border-white/10">
          {[["programs", "Ab Programs"], ["library", "Ab Library"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "text-gray-400 hover:text-gray-200"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* PROGRAMS */}
        {tab === "programs" && (
          <div className="space-y-4">
            {AB_PROGRAMS.map(p => (
              <div key={p.id} className="bg-[#0e1525] border border-white/10 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${p.color} p-4`}>
                  <h3 className="text-white font-bold text-base">{p.name}</h3>
                  <p className="text-white/80 text-xs mt-0.5">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={`${difficultyColor[p.difficulty]} text-white text-xs`}>{p.difficulty}</Badge>
                    <Badge className="bg-white/20 text-white text-xs">{p.sets} sets</Badge>
                    <Badge className="bg-white/20 text-white text-xs">{p.exercises.length} moves</Badge>
                    <Badge className="bg-white/20 text-white text-xs">
                      {p.mode === "time" ? `${p.timePerEx}s each` : `${p.repGoal} reps each`}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="flex items-center gap-2 text-gray-400 text-xs hover:text-white mb-3">
                    {expanded === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expanded === p.id ? "Hide moves" : "Preview moves"}
                  </button>
                  <AnimatePresence>
                    {expanded === p.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <div className="space-y-2">
                          {p.exercises.map((n, i) => (
                            <div key={n} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                              <span className="text-gray-200 text-sm">{i + 1}. {moveByName[n]?.emoji} {n}</span>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {moveByName[n]?.tracking === "manual" ? "tap ✋" : "AI 📷"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={() => startProgram(p)}
                    className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Play className="w-4 h-4 fill-black" /> Start in AI Rep Tracking
                  </button>
                </div>
              </div>
            ))}

            {/* Cool-down: point at the stretch programs */}
            <button onClick={() => navigate(createPageUrl("Stretches"))}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#0e1525] border border-[#00a9ff]/30 text-left active:scale-[0.99]">
              <div className="w-10 h-10 rounded-xl bg-[#00a9ff]/15 flex items-center justify-center flex-shrink-0">
                <Timer className="w-5 h-5 text-[#00a9ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Cool down with a stretch program</p>
                <p className="text-gray-400 text-xs">Guided holds for hips, back and hamstrings</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* LIBRARY */}
        {tab === "library" && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === f.id ? "bg-yellow-500 text-black" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {moves.map(m => {
                const img = images[m.name.toLowerCase()];
                return (
                  <div key={m.name} className="bg-[#0e1525] rounded-2xl border border-white/10 flex items-center gap-3 p-3">
                    {img ? (
                      <img src={optImg(img, 200)} alt={m.name} loading="lazy" decoding="async"
                        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                        className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-3xl">
                        {m.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base leading-tight">
                        {m.name}{m.alias ? <span className="text-gray-400 font-normal text-xs"> ({m.alias})</span> : null}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{m.cue}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <TrackingBadge tracking={m.tracking} />
                        <span className="text-[10px] text-gray-400 bg-white/5 rounded-full px-2 py-0.5">{m.equipment}</span>
                      </div>
                    </div>
                    <button onClick={() => startMove(m)} aria-label={`Start ${m.name}`}
                      className="shrink-0 w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/30 active:scale-95">
                      <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
