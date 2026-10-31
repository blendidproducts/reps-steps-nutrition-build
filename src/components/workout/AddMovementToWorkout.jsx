/**
 * AddMovementToWorkout (2026-10-30) — put a Movement Trainer recording into a
 * saved workout (an existing one or a new one), then optionally onto a day in
 * a weekly program. When that workout runs, the camera counts the movement
 * against the recording, exactly as Movement Trainer does.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Plus, Check, ListPlus } from "lucide-react";
import { toast } from "sonner";
import SaveWorkoutPanel from "@/components/workout/SaveWorkoutPanel";
import { addMovementToSavedWorkout } from "@/lib/savedWorkouts";

export default function AddMovementToWorkout({ movement }) {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState(null);
  const [pick, setPick] = useState("new");
  const [newName, setNewName] = useState(movement.name);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);       // the saved workout it went into

  useEffect(() => {
    base44.entities.SavedWorkout.list("-created_date")
      .then((w) => setWorkouts(w || []))
      .catch(() => setWorkouts([]));
  }, []);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const target = pick === "new" ? null : workouts.find((w) => w.id === pick);
      if (target && (target.exercises || []).some((e) => (e.exercise_name || "").toLowerCase() === movement.name.toLowerCase())) {
        toast("Already in that workout");
        setBusy(false);
        return;
      }
      const rec = await addMovementToSavedWorkout({ movement, workout: target, newName, sets, reps });
      setDone(rec);
      toast.success(target ? `Added to "${target.name}"` : `Saved "${rec.name}" to My Workouts`);
    } catch (e) {
      toast.error("Couldn't add it — check your connection and try again");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-300 text-xs font-bold">
          <Check className="w-4 h-4" /> In "{done.name}"
          <button onClick={() => navigate(createPageUrl("SavedWorkouts"))} className="ml-auto text-blue-300 underline font-semibold">My Workouts</button>
        </div>
        <SaveWorkoutPanel saved={done} compact />
      </div>
    );
  }

  const num = "w-16 rounded-lg bg-black/40 border border-gray-700 text-center text-white font-bold";
  return (
    <div className="rounded-xl bg-[#111] border border-purple-500/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <ListPlus className="w-4 h-4 text-purple-300" />
        <p className="text-white font-bold text-sm">Add to a workout</p>
      </div>
      {workouts === null ? (
        <p className="text-xs text-gray-500 py-2">Loading your workouts…</p>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap mb-2">
            <button onClick={() => setPick("new")}
              className={`px-3 rounded-lg text-xs font-bold border flex items-center gap-1 ${pick === "new" ? "bg-purple-600 border-purple-400 text-white" : "bg-black/30 border-gray-700 text-gray-300"}`}
              style={{ minHeight: 36 }}>
              <Plus className="w-3 h-3" /> New workout
            </button>
            {workouts.map((w) => (
              <button key={w.id} onClick={() => setPick(w.id)}
                className={`px-3 rounded-lg text-xs font-bold border ${pick === w.id ? "bg-purple-600 border-purple-400 text-white" : "bg-black/30 border-gray-700 text-gray-300"}`}
                style={{ minHeight: 36 }}>
                {w.name}
              </button>
            ))}
          </div>
          {pick === "new" && (
            <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60}
              placeholder="Workout name" aria-label="New workout name"
              className="w-full mb-2 rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm" style={{ minHeight: 44 }} />
          )}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-300">
            <input type="number" inputMode="numeric" min="1" max="20" value={sets} onChange={(e) => setSets(Number(e.target.value) || 1)}
              aria-label="Sets" className={num} style={{ minHeight: 40 }} />
            <span>sets ×</span>
            <input type="number" inputMode="numeric" min="0" max="200" value={reps} onChange={(e) => setReps(Number(e.target.value) || 0)}
              aria-label="Target reps" className={num} style={{ minHeight: 40 }} />
            <span>reps</span>
          </div>
          <button onClick={add} disabled={busy}
            className="w-full rounded-xl bg-purple-600 text-white font-black text-sm disabled:opacity-60" style={{ minHeight: 44 }}>
            {busy ? "Adding…" : pick === "new" ? "Create workout" : "Add to workout"}
          </button>
          <p className="text-[10px] text-gray-500 mt-1.5">
            It runs as a guided workout; tap AI REP TRACKING (or turn AUTO on) and keep the phone where you recorded the demo.
          </p>
        </>
      )}
    </div>
  );
}
