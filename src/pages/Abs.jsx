/**
 * Abs.jsx — Abs & Core section (2026-11-15)
 *
 * JT: "We should have a whole ab section... 3 levels of app workouts:
 * beginner, intermediate, advanced. Those are individual programs."
 *
 * Programs tab = three researched levels from lib/quickWorkouts.js (ABS). Each
 * level is its own 4-week program (seeded as a Preset Program by /ProgramSeed)
 * made of three sessions, A/B/C. Every session can start two ways:
 *   Guided  -> createQuickWorkout -> /ActiveWorkout   (runs the holds too)
 *   AI reps -> /ARTPWorkout?abs=<level>-<i>           (camera rep counting;
 *              holds are skipped there because AiRTP counts reps)
 * Library tab = single moves -> /ARTPWorkout?ex=<name>.
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Target, Play, Camera, Hand, Timer, ChevronRight, TrendingUp, Calendar } from "lucide-react";
import { optImg } from "@/lib/imgOpt";
import { AB_MOVES, abSessionId } from "@/lib/absPrograms";
import { ABS, AB_LEVEL_UP, AB_PROGRAMS_4WK, LEVELS, LEVEL_LABEL } from "@/lib/quickWorkouts";
import { createQuickWorkout } from "@/lib/programDay";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "bar", label: "Pull-up Bar" },
  { id: "floor", label: "Floor" },
  { id: "ai", label: "AI Tracked" },
];

const LEVEL_STYLE = {
  beginner:     { color: "#22c55e", grad: "from-green-600 to-emerald-700", emoji: "🌱" },
  intermediate: { color: "#eab308", grad: "from-yellow-500 to-orange-600", emoji: "🔥" },
  advanced:     { color: "#ef4444", grad: "from-red-600 to-rose-800",      emoji: "⚡" },
};

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

const dose = (e) => e.target_reps > 0 ? `${e.sets} × ${e.target_reps}` : `${e.sets} × ${e.target_time}s`;

export default function Abs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("programs"); // programs | library
  const [level, setLevel] = useState("beginner");
  const [filter, setFilter] = useState("all");
  const [images, setImages] = useState({}); // lower-case name -> image_url
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    base44.entities.Exercise.list().then(list => {
      const map = {};
      (list || []).forEach(ex => { if (ex.name && ex.image_url) map[ex.name.toLowerCase()] = ex.image_url; });
      setImages(map);
    }).catch(() => {});
  }, []);

  const startGuided = async (session, lv, key) => {
    setErr(""); setBusy(key);
    try {
      const id = await createQuickWorkout(session, lv, "workout");
      navigate(`${createPageUrl("ActiveWorkout")}?workoutId=${id}`);
    } catch (e) {
      setErr(e?.message || "Couldn't start — try again."); setBusy(null);
    }
  };
  const startAi = (lv, i) => navigate(`${createPageUrl("ARTPWorkout")}?abs=${encodeURIComponent(abSessionId(lv, i))}`);
  const startMove = (m) => navigate(`${createPageUrl("ARTPWorkout")}?ex=${encodeURIComponent(m.name)}`);

  const moves = AB_MOVES.filter(m =>
    filter === "all" ? true :
    filter === "bar" ? m.equipment === "Pull-up bar" :
    filter === "floor" ? m.equipment === "Floor" :
    m.tracking !== "manual");
  const moveByName = Object.fromEntries(AB_MOVES.map(m => [m.name, m]));
  const program = AB_PROGRAMS_4WK[LEVELS.indexOf(level)];
  const st = LEVEL_STYLE[level];

  return (
    <div style={{ backgroundColor: "#020817", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#3a2a05] to-[#020817] border-b border-white/10 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Target className="w-6 h-6 text-yellow-400" /> Abs & Core
          </h1>
          <p className="text-gray-400 text-sm">Calisthenics core in three levels. 3 sets of everything, 3 days a week.</p>
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

        {/* PROGRAMS — one level at a time */}
        {tab === "programs" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map(lv => (
                <button key={lv} onClick={() => setLevel(lv)}
                  className="rounded-xl py-2.5 text-center font-black text-sm active:scale-[0.97]"
                  style={level === lv
                    ? { background: LEVEL_STYLE[lv].color, color: "#000" }
                    : { background: `${LEVEL_STYLE[lv].color}1a`, border: `1px solid ${LEVEL_STYLE[lv].color}66`, color: "#fff" }}>
                  {LEVEL_STYLE[lv].emoji} {LEVEL_LABEL[lv]}
                </button>
              ))}
            </div>

            <div className="bg-[#0e1525] border border-white/10 rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${st.grad} p-4`}>
                <h2 className="text-white font-black text-lg">{program.name}</h2>
                <p className="text-white/85 text-xs mt-1">{program.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-[11px] font-bold">
                  <span className="bg-black/25 rounded-full px-2 py-0.5">4 weeks</span>
                  <span className="bg-black/25 rounded-full px-2 py-0.5">Mon · Wed · Fri</span>
                  <span className="bg-black/25 rounded-full px-2 py-0.5">3 sets each</span>
                  <span className="bg-black/25 rounded-full px-2 py-0.5">+10% a week, easy week 4</span>
                </div>
              </div>
              <div className="px-4 py-3 flex gap-2 items-start border-b border-white/10">
                <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: st.color }} />
                <p className="text-gray-300 text-xs leading-snug">{AB_LEVEL_UP[level]}</p>
              </div>
              <button onClick={() => navigate(createPageUrl("PresetPrograms"))}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm text-white font-semibold">Follow the full 4-week program</span>
                <span className="text-[11px] text-gray-400">Preset Programs</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {err && <p className="text-red-400 text-xs text-center">{err}</p>}

            {/* Sessions A / B / C */}
            {ABS[level].map((s, i) => {
              const key = `${level}-${i}`;
              return (
                <div key={key} className="bg-[#0e1525] border border-white/10 rounded-2xl p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-white font-black text-base">{s.name}</h3>
                    <span className="text-[11px] text-gray-400">{s.focus}</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {s.exercises.map(e => (
                      <div key={e.exercise_name} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-gray-200 text-sm truncate">
                          {moveByName[e.exercise_name]?.emoji || (e.target_time ? "⏱️" : "•")} {e.exercise_name}
                        </span>
                        <span className="text-xs font-bold tabular-nums whitespace-nowrap" style={{ color: st.color }}>{dose(e)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={() => startGuided(s, level, key)} disabled={!!busy}
                      className="h-11 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60"
                      style={{ background: st.color }}>
                      <Play className="w-4 h-4 fill-black" /> {busy === key ? "Opening…" : "Guided session"}
                    </button>
                    <button onClick={() => startAi(level, i)} disabled={!!busy}
                      className="h-11 rounded-xl font-bold text-sm text-white bg-[#00a9ff]/15 border border-[#00a9ff]/50 flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60">
                      <Camera className="w-4 h-4 text-[#00a9ff]" /> AI rep count
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 text-center">Guided runs the holds too · AI rep count does the rep moves on camera</p>
                </div>
              );
            })}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-400 leading-relaxed">
              <p className="text-white font-bold text-sm mb-1">How to train it</p>
              Every rep strict: start from a still hang, tilt the pelvis up, lower over 2–3 seconds, no swinging.
              Stop each set 1–2 reps before your form breaks. Rest a day between ab sessions.
            </div>

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
