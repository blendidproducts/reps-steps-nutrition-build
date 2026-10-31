/**
 * My Workouts (SavedWorkouts) — rebuilt 2026-10-29.
 *
 * Every workout saved from AiRTP, Workout Complete or History lands here.
 *   Start          AiRTP ones reopen AiRTP with the same exercises + settings;
 *                  the rest start as a normal guided workout.
 *   Add to program put it on a day of a weekly program (My Programs).
 *   Rename / Delete (delete asks twice on the card — no window.confirm, which
 *                  the app shell blocks).
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, Trash2, CalendarPlus, CalendarDays, Camera, Dumbbell, Pencil, Check, X, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import SaveWorkoutPanel from "@/components/workout/SaveWorkoutPanel";
import { startSavedWorkout, isCustomExercise } from "@/lib/savedWorkouts";
import { syncCustomMovements } from "@/lib/customMovements";
import { fmtNum, getWeightUnit, convert } from "@/lib/weights";

// ── Exercise history from logged sessions (2026-10-29) ────────────────────────
// JT: "see the complete workout, not just +5 … show the last completed totals
// for each exercise, or the cumulative total". Built from WorkoutSession rows,
// matched by exercise name (case-insensitive), newest session first.
const key = (n) => String(n || "").trim().toLowerCase();
function buildHistory(sessions) {
  const map = new Map();
  for (const s of sessions || []) {
    const when = s.start_time || s.created_date;
    for (const ex of s.exercises_completed || []) {
      const k = key(ex.exercise_name);
      if (!k) continue;
      const reps = Number(ex.reps_completed) || 0;
      const secs = Number(ex.time_spent) || 0;
      if (!reps && !secs) continue;
      let h = map.get(k);
      if (!h) {
        // First hit = most recent session (list is newest first).
        h = { last: { reps, secs, sets: ex.sets || null, date: when }, totalReps: 0, totalSecs: 0, times: 0 };
        map.set(k, h);
      }
      h.totalReps += reps;
      h.totalSecs += secs;
      h.times += 1;
    }
  }
  return map;
}
const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (_) { return ""; } };
function lastLabel(h) {
  if (!h) return null;
  const l = h.last;
  if (l.sets?.length) {
    const u = getWeightUnit();
    const parts = l.sets.map((st) => st.weight > 0 ? `${st.reps}×${fmtNum(convert(st.weight, st.unit === "kg" ? "kg" : "lb", u))}` : `${st.reps}`);
    return parts.join(" · ") + (l.sets.some((st) => st.weight > 0) ? ` ${u}` : "");
  }
  return l.reps ? `${l.reps} reps` : fmtSecs(l.secs);
}

export default function SavedWorkouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [starting, setStarting] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [history, setHistory] = useState(() => new Map());

  // Recorded movements are matched by name; sync them so a new device knows them.
  const [, setMvReady] = useState(0);
  useEffect(() => { loadWorkouts(); loadHistory(); syncCustomMovements().then(() => setMvReady((n) => n + 1)).catch(() => {}); }, []);

  const loadHistory = async () => {
    try { setHistory(buildHistory(await base44.entities.WorkoutSession.list("-created_date", 300))); }
    catch (_) { /* totals just stay blank */ }
  };
  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const loadWorkouts = async () => {
    setIsLoading(true);
    try { setWorkouts(await base44.entities.SavedWorkout.list("-created_date")); }
    catch (_) { setWorkouts([]); }
    setIsLoading(false);
  };

  const del = async (w) => {
    if (confirmDel !== w.id) { setConfirmDel(w.id); setTimeout(() => setConfirmDel((c) => (c === w.id ? null : c)), 4000); return; }
    await base44.entities.SavedWorkout.delete(w.id);
    toast.success("Workout deleted");
    setConfirmDel(null);
    loadWorkouts();
  };

  const saveName = async (w) => {
    const nm = editName.trim();
    if (!nm) return;
    await base44.entities.SavedWorkout.update(w.id, { name: nm });
    setEditing(null);
    loadWorkouts();
  };

  const start = async (w) => {
    if (starting) return;
    setStarting(w.id);
    try { await startSavedWorkout(w, navigate); }
    catch (_) { toast.error("Couldn't start that workout"); setStarting(null); }
  };

  return (
    <div style={{ backgroundColor: "#020817", minHeight: "100vh", color: "#f9fafb" }} className="pb-28">
      <div className="gradient-bg text-white py-7">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-bold mb-1">My Workouts</h1>
          <p className="text-white/90">Workouts you've saved — start one, or put it on a day in a program.</p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => navigate(createPageUrl("Programs"))}
              className="px-4 rounded-xl bg-white/20 text-white font-bold text-sm flex items-center gap-2" style={{ minHeight: 44 }}>
              <CalendarDays className="w-4 h-4" /> My Programs
            </button>
            <button onClick={() => navigate(createPageUrl("ARTPWorkout"))}
              className="px-4 rounded-xl bg-white/10 text-white font-bold text-sm flex items-center gap-2" style={{ minHeight: 44 }}>
              <Plus className="w-4 h-4" /> New AiRTP workout
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 max-w-3xl">
        {isLoading ? (
          <p className="text-gray-400 text-center py-10">Loading…</p>
        ) : workouts.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0d1524] p-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <h3 className="text-lg font-semibold mb-1">Nothing saved yet</h3>
            <p className="text-gray-400 text-sm">
              Finish a workout and tap <b className="text-white">Save this workout</b> on the summary screen,
              or save one from History.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {workouts.map((w) => {
              const isArtp = w.source === "artp";
              const ex = w.exercises || [];
              const sets = ex[0]?.sets;
              return (
                <li key={w.id} className="rounded-2xl border border-gray-800 bg-[#0d1524] p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isArtp ? "bg-green-500/15" : "bg-blue-500/15"}`}>
                      {isArtp ? <Camera className="w-5 h-5 text-green-400" /> : <Dumbbell className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editing === w.id ? (
                        <div className="flex gap-1.5">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus maxLength={60}
                            className="flex-1 min-w-0 rounded-lg bg-black/40 border border-gray-700 px-2 text-white text-sm" style={{ minHeight: 40 }} />
                          <button onClick={() => saveName(w)} aria-label="Save name" className="w-10 rounded-lg bg-blue-600 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(null)} aria-label="Cancel" className="w-10 rounded-lg border border-gray-700 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p className="font-bold text-base truncate">{w.name}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isArtp ? "AiRTP camera workout" : "Guided workout"} · {ex.length} exercise{ex.length !== 1 ? "s" : ""}{sets ? ` · ${sets} set${sets !== 1 ? "s" : ""}` : ""}
                      </p>
                      {!expanded.has(w.id) && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {ex.slice(0, 5).map((e, i) => (
                            <span key={i} className="text-[11px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">{e.exercise_name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full workout, as a dropdown: every exercise with its plan,
                      the last time you did it, and your all-time total. */}
                  <button onClick={() => toggle(w.id)} aria-expanded={expanded.has(w.id)}
                    className="mt-2 w-full flex items-center justify-between rounded-lg bg-black/30 border border-gray-800 px-3 text-xs font-bold text-gray-300"
                    style={{ minHeight: 40 }}>
                    <span>{expanded.has(w.id) ? "Hide workout" : `Show full workout · ${ex.length} exercise${ex.length !== 1 ? "s" : ""}`}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded.has(w.id) ? "rotate-180" : ""}`} />
                  </button>
                  {expanded.has(w.id) && (() => {
                    const rows = ex.map((e) => ({ e, h: history.get(key(e.exercise_name)) }));
                    const lastTotal = rows.reduce((a, r) => a + (r.h?.last.reps || 0), 0);
                    const allTotal = rows.reduce((a, r) => a + (r.h?.totalReps || 0), 0);
                    return (
                      <div className="mt-2 rounded-lg border border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-black/40 text-[10px] uppercase tracking-wide text-gray-500">
                          <span>Exercise · plan</span><span className="text-right">Last time</span><span className="text-right">All-time</span>
                        </div>
                        <ol className="divide-y divide-gray-800">
                          {rows.map(({ e, h }, i) => {
                            const plan = [
                              e.sets ? `${e.sets} set${e.sets !== 1 ? "s" : ""}` : null,
                              e.target_reps ? `${e.target_reps} reps` : e.target_time ? fmtSecs(e.target_time) : null,
                            ].filter(Boolean).join(" × ");
                            return (
                              <li key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 items-center">
                                <span className="min-w-0">
                                  <span className="block text-sm text-white truncate"><span className="text-gray-500 mr-1.5">{i + 1}</span>{e.exercise_name}{e.superset_with_next ? <span className="text-purple-300 text-[10px] ml-1">🔗</span> : null}{isCustomExercise(e) ? <span className="ml-1.5 text-[9px] font-black bg-purple-500/25 text-purple-200 rounded px-1 py-0.5 align-middle">RECORDED</span> : null}</span>
                                  {plan && <span className="block text-[11px] text-gray-500">{plan}</span>}
                                </span>
                                <span className="text-right">
                                  {h ? <>
                                    <span className="block text-xs font-bold text-white tabular-nums">{lastLabel(h)}</span>
                                    <span className="block text-[10px] text-gray-500">{fmtDate(h.last.date)}</span>
                                  </> : <span className="text-[11px] text-gray-600">—</span>}
                                </span>
                                <span className="text-right">
                                  {h ? <>
                                    <span className="block text-xs font-bold text-[#00a9ff] tabular-nums">{h.totalReps ? `${fmtNum(h.totalReps)} reps` : fmtSecs(h.totalSecs)}</span>
                                    <span className="block text-[10px] text-gray-500">{h.times}×</span>
                                  </> : <span className="text-[11px] text-gray-600">—</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 bg-black/40 text-xs font-black">
                          <span className="text-gray-300">Total reps</span>
                          <span className="text-right text-white tabular-nums">{lastTotal ? fmtNum(lastTotal) : "—"}</span>
                          <span className="text-right text-[#00a9ff] tabular-nums">{allTotal ? fmtNum(allTotal) : "—"}</span>
                        </div>
                        <p className="px-3 pb-2 bg-black/40 text-[10px] text-gray-500">
                          From your History: the most recent session with each exercise, and every rep you've logged of it (any workout).
                        </p>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 mt-3">
                    <button onClick={() => start(w)} disabled={starting === w.id}
                      className="rounded-xl gradient-bg text-white font-black text-sm flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ minHeight: 44 }}>
                      <Play className="w-4 h-4 fill-white" /> {starting === w.id ? "Starting…" : "Start"}
                    </button>
                    <button onClick={() => setOpenAdd(openAdd === w.id ? null : w.id)} aria-label="Add to a program day"
                      className={`px-3 rounded-xl border text-xs font-bold flex items-center gap-1 ${openAdd === w.id ? "border-indigo-400 bg-indigo-500/20 text-indigo-200" : "border-gray-700 text-gray-300"}`} style={{ minHeight: 44 }}>
                      <CalendarPlus className="w-4 h-4" /> <span className="hidden sm:inline">Program</span>
                    </button>
                    <button onClick={() => { setEditing(w.id); setEditName(w.name); }} aria-label="Rename"
                      className="w-11 rounded-xl border border-gray-700 text-gray-400 flex items-center justify-center" style={{ minHeight: 44 }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(w)} aria-label={confirmDel === w.id ? "Tap again to delete" : "Delete"}
                      className={`rounded-xl border flex items-center justify-center gap-1 text-xs font-bold ${confirmDel === w.id ? "px-3 border-red-500 bg-red-500/20 text-red-300" : "w-11 border-gray-700 text-gray-400"}`} style={{ minHeight: 44 }}>
                      <Trash2 className="w-4 h-4" />{confirmDel === w.id && "Delete?"}
                    </button>
                  </div>

                  {openAdd === w.id && (
                    <div className="mt-3">
                      <SaveWorkoutPanel saved={w} compact onDone={() => {}} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
