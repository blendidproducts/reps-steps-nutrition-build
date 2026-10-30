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
import { Play, Trash2, CalendarPlus, CalendarDays, Camera, Dumbbell, Pencil, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import SaveWorkoutPanel from "@/components/workout/SaveWorkoutPanel";
import { startSavedWorkout } from "@/lib/savedWorkouts";

export default function SavedWorkouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [starting, setStarting] = useState(null);

  useEffect(() => { loadWorkouts(); }, []);

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
                      <div className="flex gap-1 flex-wrap mt-2">
                        {ex.slice(0, 5).map((e, i) => (
                          <span key={i} className="text-[11px] bg-gray-800 px-2 py-0.5 rounded text-gray-300">{e.exercise_name}</span>
                        ))}
                        {ex.length > 5 && <span className="text-[11px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">+{ex.length - 5}</span>}
                      </div>
                    </div>
                  </div>

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
