/**
 * My Programs (Programs) — rebuilt 2026-10-29.
 *
 * Weekly programs made of saved workouts. This page existed but wasn't in the
 * menu, so a program created from "Add to Program" could never be found again.
 * Now it's in the sidebar ("My Programs"), linked from My Workouts, History and
 * Preset Programs, and every day is startable:
 *   - TODAY is highlighted; "Start today" runs the workout on today's day.
 *   - Tap any day to start that day's workout.
 *   - Edit sets each day to a saved workout or rest.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays, Plus, Play, Trash2, CheckCircle2, Pencil, Check, X, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { DAYS, DAY_SHORT, dayKey, startSavedWorkout } from "@/lib/savedWorkouts";

function DayPicker({ value, onChange, workouts, label }) {
  return (
    <select value={value || "rest"} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white text-sm px-2" style={{ minHeight: 40 }}>
      <option value="rest">Rest day</option>
      {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  );
}

export default function Programs() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", goal: "", schedule: {} });
  const [editing, setEditing] = useState(null);       // program id
  const [editSchedule, setEditSchedule] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);
  const [starting, setStarting] = useState(null);
  const today = dayKey();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        base44.entities.WeeklyProgram.list("-created_date"),
        base44.entities.SavedWorkout.list("-created_date"),
      ]);
      // Active program first.
      setPrograms([...(p || [])].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)));
      setWorkouts(w || []);
    } catch (_) { /* leave empty */ }
    setLoading(false);
  };

  const wById = (id) => workouts.find((w) => w.id === id);

  const createProgram = async () => {
    if (!draft.name.trim()) { toast.error("Give the program a name"); return; }
    await base44.entities.WeeklyProgram.create({
      name: draft.name.trim(),
      goal: draft.goal,
      schedule: draft.schedule,
      start_date: new Date().toISOString().split("T")[0],
      is_active: programs.length === 0,
    });
    toast.success("Program created");
    setCreating(false);
    setDraft({ name: "", goal: "", schedule: {} });
    loadData();
  };

  const saveEdit = async (p) => {
    await base44.entities.WeeklyProgram.update(p.id, { schedule: editSchedule });
    setEditing(null);
    toast.success("Schedule updated");
    loadData();
  };

  const activate = async (id) => {
    await Promise.all(programs.map((p) => base44.entities.WeeklyProgram.update(p.id, { is_active: p.id === id })));
    toast.success("Program activated");
    loadData();
  };

  const del = async (p) => {
    if (confirmDel !== p.id) { setConfirmDel(p.id); setTimeout(() => setConfirmDel((c) => (c === p.id ? null : c)), 4000); return; }
    await base44.entities.WeeklyProgram.delete(p.id);
    setConfirmDel(null);
    toast.success("Program deleted");
    loadData();
  };

  const startDay = async (p, day) => {
    const w = wById(p.schedule?.[day]);
    if (!w) { toast("Rest day — or tap Edit to put a workout here"); return; }
    if (starting) return;
    setStarting(`${p.id}-${day}`);
    try { await startSavedWorkout(w, navigate); }
    catch (_) { toast.error("Couldn't start that workout"); setStarting(null); }
  };

  return (
    <div style={{ backgroundColor: "#020817", minHeight: "100vh", color: "#f9fafb" }} className="pb-28">
      <div className="gradient-bg text-white py-7">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-1">My Programs</h1>
          <p className="text-white/90">Your week, built from your saved workouts. Tap a day to start it.</p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setCreating((v) => !v)}
              className="px-4 rounded-xl bg-white/20 text-white font-bold text-sm flex items-center gap-2" style={{ minHeight: 44 }}>
              {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {creating ? "Cancel" : "New program"}
            </button>
            <button onClick={() => navigate(createPageUrl("SavedWorkouts"))}
              className="px-4 rounded-xl bg-white/10 text-white font-bold text-sm flex items-center gap-2" style={{ minHeight: 44 }}>
              <BookmarkPlus className="w-4 h-4" /> My Workouts ({workouts.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 max-w-4xl space-y-4">
        {creating && (
          <div className="rounded-2xl border border-blue-500/40 bg-[#0d1524] p-4 space-y-3">
            <p className="font-bold">New weekly program</p>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name, e.g. My 4-Day Split"
              className="w-full rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm" style={{ minHeight: 44 }} />
            <input value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="Goal (optional)"
              className="w-full rounded-xl bg-black/40 border border-gray-700 px-3 text-white text-sm" style={{ minHeight: 44 }} />
            {workouts.length === 0 && (
              <p className="text-xs text-amber-300">You have no saved workouts yet — create the program now and add days later from any workout's "Save this workout".</p>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {DAYS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-bold text-gray-400">{DAY_SHORT[d]}</span>
                  <DayPicker value={draft.schedule[d]} workouts={workouts} label={`${d} workout`}
                    onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, [d]: v } })} />
                </div>
              ))}
            </div>
            <button onClick={createProgram} className="w-full rounded-xl gradient-bg text-white font-black" style={{ minHeight: 48 }}>Create program</button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Loading…</p>
        ) : programs.length === 0 && !creating ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0d1524] p-8 text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <h3 className="text-lg font-semibold mb-1">No programs yet</h3>
            <p className="text-gray-400 text-sm mb-4">Save a workout, then add it to a day — or build a week here.</p>
            <button onClick={() => setCreating(true)} className="px-5 rounded-xl gradient-bg text-white font-black" style={{ minHeight: 44 }}>Create a program</button>
          </div>
        ) : (
          programs.map((p) => {
            const todayW = wById(p.schedule?.[today]);
            const isEdit = editing === p.id;
            return (
              <div key={p.id} className={`rounded-2xl border-2 bg-[#0d1524] p-4 ${p.is_active ? "border-[#00a9ff]" : "border-gray-800"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-lg truncate">{p.name}</p>
                      {p.is_active && <span className="text-[10px] font-black bg-[#00a9ff] text-white rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ACTIVE</span>}
                    </div>
                    {p.goal && <p className="text-xs text-[#00a9ff] mt-0.5">Goal: {p.goal}</p>}
                  </div>
                  {!p.is_active && (
                    <button onClick={() => activate(p.id)} className="px-3 rounded-lg bg-green-600 text-white text-xs font-bold" style={{ minHeight: 36 }}>Make active</button>
                  )}
                  <button onClick={() => { if (isEdit) setEditing(null); else { setEditing(p.id); setEditSchedule({ ...(p.schedule || {}) }); } }}
                    aria-label="Edit schedule" className="w-9 rounded-lg border border-gray-700 text-gray-300 flex items-center justify-center" style={{ minHeight: 36 }}>
                    {isEdit ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button onClick={() => del(p)} aria-label={confirmDel === p.id ? "Tap again to delete" : "Delete program"}
                    className={`rounded-lg border flex items-center justify-center gap-1 text-xs font-bold ${confirmDel === p.id ? "px-2 border-red-500 bg-red-500/20 text-red-300" : "w-9 border-gray-700 text-gray-400"}`} style={{ minHeight: 36 }}>
                    <Trash2 className="w-4 h-4" />{confirmDel === p.id && "Delete?"}
                  </button>
                </div>

                {!isEdit && (
                  <button onClick={() => startDay(p, today)} disabled={!todayW}
                    className={`mt-3 w-full rounded-xl font-black text-sm flex items-center justify-center gap-2 ${todayW ? "gradient-bg text-white" : "bg-gray-800 text-gray-400"}`}
                    style={{ minHeight: 48 }}>
                    {todayW ? <><Play className="w-4 h-4 fill-white" /> Start today · {todayW.name}</> : "Today is a rest day"}
                  </button>
                )}

                {isEdit ? (
                  <div className="mt-3 space-y-2">
                    {DAYS.map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <span className={`w-10 text-xs font-bold ${d === today ? "text-[#00a9ff]" : "text-gray-400"}`}>{DAY_SHORT[d]}</span>
                        <DayPicker value={editSchedule[d]} workouts={workouts} label={`${d} workout`}
                          onChange={(v) => setEditSchedule({ ...editSchedule, [d]: v })} />
                      </div>
                    ))}
                    <button onClick={() => saveEdit(p)} className="w-full rounded-xl bg-blue-600 text-white font-black flex items-center justify-center gap-1.5" style={{ minHeight: 44 }}>
                      <Check className="w-4 h-4" /> Save schedule
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5 mt-3">
                    {DAYS.map((d) => {
                      const w = wById(p.schedule?.[d]);
                      const isToday = d === today;
                      return (
                        <button key={d} onClick={() => startDay(p, d)}
                          className={`rounded-lg border p-1.5 text-left min-h-[64px] flex flex-col ${w ? "bg-[#00a9ff]/10 border-[#00a9ff]/40" : "bg-gray-800/40 border-gray-700"} ${isToday ? "ring-2 ring-[#00a9ff]" : ""}`}
                          aria-label={`${d}: ${w ? `start ${w.name}` : "rest"}`}>
                          <span className={`text-[10px] font-black ${isToday ? "text-[#00a9ff]" : "text-gray-400"}`}>{isToday ? "TODAY" : DAY_SHORT[d].toUpperCase()}</span>
                          <span className="text-[11px] leading-tight mt-0.5 text-white line-clamp-3 break-words">{w ? w.name : "Rest"}</span>
                          {starting === `${p.id}-${d}` && <span className="text-[9px] text-[#00a9ff] mt-auto">Starting…</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
