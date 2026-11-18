/**
 * SaveWorkoutPanel (2026-10-29, "Save to" dropdown 2026-11-17)
 *
 * JT: "when I have the option to save a workout, it doesn't give me a drop down
 * for the other current saved workouts. I need ability to save it to the current
 * programs or an existing program."
 *
 * One panel: name + a "Save to" dropdown, loaded up front:
 *   • My Workouts (new workout)                      ← default
 *   • Add to a program → each WeeklyProgram (★ active first) + "New program…"
 *   • Replace a saved workout → each SavedWorkout (overwrites its exercises;
 *     program days point at the id, so they pick up the new version)
 * Picking a program shows the day picker. One button does it all.
 *
 * Props
 *   defaultName   prefilled name
 *   getTemplate() → { exercises, source, artpSettings, difficulty }  (save mode)
 *   saved         an existing SavedWorkout → dropdown shows programs only
 *   compact       smaller chrome for list rows
 *   onDone(rec)   called after it's saved / scheduled (optional)
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { BookmarkPlus, Check, CalendarPlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  DAYS, DAY_SHORT, dayKey, saveWorkoutTemplate, replaceWorkoutTemplate,
  addToProgramDay, createProgramWithDay,
} from "@/lib/savedWorkouts";

export default function SaveWorkoutPanel({ defaultName = "", getTemplate, saved = null, compact = false, onDone }) {
  const navigate = useNavigate();
  const scheduleOnly = !!saved;
  const [name, setName] = useState(defaultName);
  const [programs, setPrograms] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [target, setTarget] = useState(scheduleOnly ? "" : "mine"); // mine | prog:<id> | prog:new | replace:<id>
  const [day, setDay] = useState(dayKey());
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { text, to: 'mine' | 'programs' }

  useEffect(() => { setName(defaultName); }, [defaultName]);

  useEffect(() => {
    let alive = true;
    base44.entities.WeeklyProgram.list("-created_date")
      .then((p) => {
        if (!alive) return;
        const list = (p || []).slice().sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
        setPrograms(list);
        if (scheduleOnly) setTarget(list[0] ? `prog:${list[0].id}` : "prog:new");
      })
      .catch(() => { if (alive) { setPrograms([]); if (scheduleOnly) setTarget("prog:new"); } });
    if (!scheduleOnly) {
      base44.entities.SavedWorkout.list("-created_date")
        .then((w) => { if (alive) setWorkouts(w || []); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [scheduleOnly]);

  const [kind, id] = useMemo(() => {
    const i = target.indexOf(":");
    return i < 0 ? [target, null] : [target.slice(0, i), target.slice(i + 1)];
  }, [target]);
  const program = kind === "prog" && id !== "new" ? programs?.find((p) => p.id === id) : null;
  const replacing = kind === "replace" ? workouts.find((w) => w.id === id) : null;

  const onTarget = (v) => {
    setTarget(v);
    if (v.startsWith("replace:")) {
      const w = workouts.find((x) => x.id === v.slice(8));
      if (w?.name) setName(w.name);
    }
  };

  const schedule = async (savedId) => {
    if (id === "new") {
      const p = await createProgramWithDay(newName, day, savedId);
      return p?.name || newName.trim() || "My Program";
    }
    await addToProgramDay(program, day, savedId);
    return program?.name || "your program";
  };

  const go = async () => {
    if (busy) return;
    if (kind === "prog" && id !== "new" && !program) return;
    setBusy(true);
    try {
      if (scheduleOnly) {
        const prog = await schedule(saved.id);
        setDone({ text: `"${saved.name}" is on ${DAY_SHORT[day]} in ${prog}`, to: "programs" });
        toast.success(`On ${DAY_SHORT[day]} in "${prog}"`);
        onDone?.(saved);
        return;
      }
      const t = getTemplate();
      if (kind === "replace" && replacing) {
        const rec = await replaceWorkoutTemplate(replacing, { name, ...t });
        setDone({ text: `Replaced "${rec.name}" in My Workouts`, to: "mine" });
        toast.success(`Replaced "${rec.name}"`);
        onDone?.(rec);
        return;
      }
      const rec = await saveWorkoutTemplate({ name, ...t });
      if (kind === "prog") {
        const prog = await schedule(rec.id);
        setDone({ text: `Saved "${rec.name}" and put it on ${DAY_SHORT[day]} in ${prog}`, to: "programs" });
        toast.success(`Saved + on ${DAY_SHORT[day]} in "${prog}"`);
      } else {
        setDone({ text: `Saved "${rec.name}" to My Workouts`, to: "mine" });
        toast.success(`Saved "${rec.name}" to My Workouts`);
      }
      onDone?.(rec);
    } catch (e) {
      toast.error(e?.message || "Couldn't save the workout");
    } finally { setBusy(false); }
  };

  const box = compact ? "rounded-xl p-3" : "rounded-2xl p-4";
  const field = "w-full rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm placeholder:text-gray-500";

  if (done) {
    return (
      <div className={`bg-green-500/10 border border-green-500/30 ${box}`}>
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-300 text-sm font-bold flex-1">{done.text}</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => navigate(createPageUrl("SavedWorkouts"))}
            className="rounded-xl border border-green-500/40 text-green-300 text-xs font-bold flex items-center justify-center gap-1"
            style={{ minHeight: 40 }}>
            My Workouts <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate(createPageUrl("Programs"))}
            className="rounded-xl border border-green-500/40 text-green-300 text-xs font-bold flex items-center justify-center gap-1"
            style={{ minHeight: 40 }}>
            My Programs <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const label = busy ? "Saving…"
    : scheduleOnly ? `Add to ${DAY_SHORT[day]}`
    : kind === "replace" ? "Replace workout"
    : kind === "prog" ? `Save + add to ${DAY_SHORT[day]}`
    : "Save";

  return (
    <div className={`bg-[#111] border ${scheduleOnly ? "border-indigo-500/30" : "border-blue-500/30"} ${box}`}>
      <div className="flex items-center gap-2 mb-2">
        {scheduleOnly
          ? <CalendarPlus className="w-4 h-4 text-indigo-300" />
          : <BookmarkPlus className="w-4 h-4 text-blue-400" />}
        <p className="text-white font-bold text-sm">{scheduleOnly ? "Add to a weekly program" : "Save this workout"}</p>
      </div>

      {!scheduleOnly && (
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
          placeholder="Name it, e.g. Monday Push" aria-label="Workout name"
          className={`${field} mb-2`} style={{ minHeight: 44 }} />
      )}

      <label className="block text-[11px] text-gray-400 mb-1" htmlFor="save-to">Save to</label>
      <select id="save-to" value={target} onChange={(e) => onTarget(e.target.value)}
        disabled={programs === null}
        className={`${field} mb-2`} style={{ minHeight: 44 }}>
        {!scheduleOnly && <option value="mine">My Workouts (new workout)</option>}
        <optgroup label="Add to a program">
          {(programs || []).map((p) => (
            <option key={p.id} value={`prog:${p.id}`}>{p.is_active ? "★ " : ""}{p.name}</option>
          ))}
          <option value="prog:new">+ New program…</option>
        </optgroup>
        {!scheduleOnly && workouts.length > 0 && (
          <optgroup label="Replace a saved workout">
            {workouts.map((w) => <option key={w.id} value={`replace:${w.id}`}>{w.name}</option>)}
          </optgroup>
        )}
      </select>
      {programs === null && <p className="text-[11px] text-gray-500 -mt-1 mb-2">Loading your programs…</p>}

      {kind === "prog" && id === "new" && (
        <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={50}
          placeholder="Program name, e.g. My Weekly Split" aria-label="New program name"
          className={`${field} mb-2`} style={{ minHeight: 44 }} />
      )}

      {kind === "prog" && (
        <>
          <p className="text-[11px] text-gray-400 mb-1">Day</p>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => {
              const taken = program?.schedule?.[d];
              const isTaken = !!taken && taken !== "rest";
              return (
                <button key={d} type="button" onClick={() => setDay(d)}
                  className={`rounded-lg text-[11px] font-black border ${day === d ? "bg-indigo-500 border-indigo-400 text-white" : isTaken ? "bg-gray-800 border-gray-600 text-gray-400" : "bg-black/30 border-gray-700 text-gray-300"}`}
                  style={{ minHeight: 36 }} title={isTaken ? "Has a workout — this replaces it" : undefined}>
                  {DAY_SHORT[d]}{isTaken ? "•" : ""}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 mb-2">• = that day already has a workout; adding replaces it.</p>
        </>
      )}

      {kind === "replace" && (
        <p className="text-[11px] text-amber-300/80 mb-2">Overwrites that workout's exercises. Any program day using it gets the new version.</p>
      )}

      <button onClick={go} disabled={busy || programs === null}
        className={`w-full rounded-xl text-white font-black text-sm active:scale-95 disabled:opacity-60 ${kind === "prog" || scheduleOnly ? "bg-indigo-600" : kind === "replace" ? "bg-amber-600" : "bg-blue-600"}`}
        style={{ minHeight: 44 }}>
        {label}
      </button>
    </div>
  );
}
