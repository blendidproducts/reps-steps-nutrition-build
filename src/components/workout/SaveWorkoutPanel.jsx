/**
 * SaveWorkoutPanel (2026-10-29) — "Save this workout" → name it → it's in
 * My Workouts → optionally put it on a day of a weekly program (existing or
 * new), which shows in My Programs. Used on the AiRTP completion screen, the
 * regular Workout Complete screen, History rows and My Workouts cards.
 *
 * Props
 *   defaultName   prefilled name
 *   getTemplate() → { exercises, source, artpSettings, difficulty }  (save mode)
 *   saved         an existing SavedWorkout → skips straight to scheduling
 *   compact       smaller chrome for list rows
 *   onDone()      called after it's saved / scheduled (optional)
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { BookmarkPlus, Check, CalendarPlus, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DAYS, DAY_SHORT, dayKey, saveWorkoutTemplate, addToProgramDay, createProgramWithDay } from "@/lib/savedWorkouts";

export default function SaveWorkoutPanel({ defaultName = "", getTemplate, saved: savedProp = null, compact = false, onDone }) {
  const navigate = useNavigate();
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(savedProp);
  const [busy, setBusy] = useState(false);
  const [programs, setPrograms] = useState(null);
  const [pick, setPick] = useState(null);        // program id | 'new'
  const [day, setDay] = useState(dayKey());
  const [newName, setNewName] = useState("");
  const [scheduled, setScheduled] = useState(null);

  useEffect(() => { setName(defaultName); }, [defaultName]);

  useEffect(() => {
    if (!saved || programs) return;
    base44.entities.WeeklyProgram.list("-created_date").then((p) => {
      setPrograms(p || []);
      setPick((p && p[0]?.id) || "new");
    }).catch(() => { setPrograms([]); setPick("new"); });
  }, [saved, programs]);

  const doSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const t = getTemplate();
      const rec = await saveWorkoutTemplate({ name, ...t });
      setSaved(rec);
      toast.success(`Saved "${rec.name}" to My Workouts`);
      onDone?.(rec);
    } catch (e) {
      toast.error(e?.message || "Couldn't save the workout");
    } finally { setBusy(false); }
  };

  const doSchedule = async () => {
    if (busy || !saved) return;
    setBusy(true);
    try {
      let progName;
      if (pick === "new") {
        const p = await createProgramWithDay(newName, day, saved.id);
        progName = p?.name || newName || "My Program";
      } else {
        const p = programs.find((x) => x.id === pick);
        await addToProgramDay(p, day, saved.id);
        progName = p?.name;
      }
      setScheduled({ progName, day });
      toast.success(`On ${DAY_SHORT[day]} in "${progName}"`);
      onDone?.(saved);
    } catch (e) {
      toast.error("Couldn't add it to the program");
    } finally { setBusy(false); }
  };

  const box = compact ? "rounded-xl p-3" : "rounded-2xl p-4";

  // ── Step 1: name + save ────────────────────────────────────────────────
  if (!saved) {
    return (
      <div className={`bg-[#111] border border-blue-500/30 ${box}`}>
        <div className="flex items-center gap-2 mb-2">
          <BookmarkPlus className="w-4 h-4 text-blue-400" />
          <p className="text-white font-bold text-sm">Save this workout</p>
          <span className="ml-auto text-[10px] text-gray-500">do it again anytime</span>
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
            placeholder="Name it, e.g. Monday Push"
            aria-label="Workout name"
            className="flex-1 min-w-0 rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm placeholder:text-gray-500"
            style={{ minHeight: 44 }} />
          <button onClick={doSave} disabled={busy}
            className="px-4 rounded-xl bg-blue-600 text-white font-black text-sm active:scale-95 disabled:opacity-60"
            style={{ minHeight: 44 }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  if (scheduled) {
    return (
      <div className={`bg-green-500/10 border border-green-500/30 ${box}`}>
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <p className="text-green-300 text-sm font-bold flex-1">
            "{saved.name}" is on {DAY_SHORT[scheduled.day]} in {scheduled.progName}
          </p>
        </div>
        <button onClick={() => navigate(createPageUrl("Programs"))}
          className="mt-2 w-full rounded-xl border border-green-500/40 text-green-300 text-xs font-bold flex items-center justify-center gap-1"
          style={{ minHeight: 40 }}>
          Open My Programs <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Step 2: add to a program day ───────────────────────────────────────
  return (
    <div className={`bg-[#111] border border-indigo-500/30 ${box}`}>
      {!savedProp && (
        <div className="flex items-center gap-2 mb-3 text-green-300 text-xs font-bold">
          <Check className="w-4 h-4" /> Saved to My Workouts
          <button onClick={() => navigate(createPageUrl("SavedWorkouts"))} className="ml-auto text-blue-300 underline font-semibold">View</button>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <CalendarPlus className="w-4 h-4 text-indigo-300" />
        <p className="text-white font-bold text-sm">Add to a weekly program</p>
        <span className="ml-auto text-[10px] text-gray-500">optional</span>
      </div>

      {programs === null ? (
        <p className="text-xs text-gray-500 py-2">Loading your programs…</p>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {programs.map((p) => (
              <button key={p.id} onClick={() => setPick(p.id)}
                className={`px-3 rounded-lg text-xs font-bold border ${pick === p.id ? "bg-indigo-500 border-indigo-400 text-white" : "bg-black/30 border-gray-700 text-gray-300"}`}
                style={{ minHeight: 36 }}>
                {p.name}{p.is_active ? " ★" : ""}
              </button>
            ))}
            <button onClick={() => setPick("new")}
              className={`px-3 rounded-lg text-xs font-bold border flex items-center gap-1 ${pick === "new" ? "bg-green-600 border-green-500 text-white" : "bg-black/30 border-gray-700 text-gray-300"}`}
              style={{ minHeight: 36 }}>
              <Plus className="w-3 h-3" /> New program
            </button>
          </div>
          {pick === "new" && (
            <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={50}
              placeholder="Program name, e.g. My Weekly Split" aria-label="New program name"
              className="w-full mb-2 rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm placeholder:text-gray-500"
              style={{ minHeight: 44 }} />
          )}
          <p className="text-[11px] text-gray-400 mb-1">Day</p>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS.map((d) => {
              const taken = pick !== "new" && programs.find((p) => p.id === pick)?.schedule?.[d];
              const isTaken = taken && taken !== "rest";
              return (
                <button key={d} onClick={() => setDay(d)}
                  className={`rounded-lg text-[11px] font-black border ${day === d ? "bg-indigo-500 border-indigo-400 text-white" : isTaken ? "bg-gray-800 border-gray-600 text-gray-400" : "bg-black/30 border-gray-700 text-gray-300"}`}
                  style={{ minHeight: 36 }} title={isTaken ? "Has a workout — this replaces it" : undefined}>
                  {DAY_SHORT[d]}{isTaken ? "•" : ""}
                </button>
              );
            })}
          </div>
          <button onClick={doSchedule} disabled={busy}
            className="w-full rounded-xl bg-indigo-600 text-white font-black text-sm active:scale-95 disabled:opacity-60"
            style={{ minHeight: 44 }}>
            {busy ? "Adding…" : `Add to ${DAY_SHORT[day]}`}
          </button>
          <p className="text-[10px] text-gray-500 mt-1.5">• = that day already has a workout; adding replaces it.</p>
        </>
      )}
    </div>
  );
}
