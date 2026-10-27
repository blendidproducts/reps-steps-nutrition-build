import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { weeklyVolume, exerciseHistory, sessionVolumeLbs, convert, fmtNum, getWeightUnit } from "@/lib/weights";

/**
 * History → "Lifting Volume". Renders nothing until at least one weighted set
 * exists, so bodyweight-only users see no change.
 *   - this week vs last week
 *   - 8-week bar chart of volume
 *   - per exercise: volume per workout, and the best set at each weight used
 * Everything is converted to the viewer's lb/kg choice.
 */
export default function LiftingVolume({ sessions }) {
  const unit = getWeightUnit();
  const show = (lbs) => convert(lbs, "lb", unit);

  const weighted = useMemo(() => (sessions || []).filter((s) => sessionVolumeLbs(s) > 0), [sessions]);
  const weeks = useMemo(() => weeklyVolume(sessions, 8), [sessions]);
  const exercises = useMemo(() => {
    const set = new Set();
    weighted.forEach((s) => (s.exercises_completed || []).forEach((e) => {
      if ((e.sets || []).some((st) => st.weight > 0 && st.reps > 0)) set.add(e.exercise_name);
    }));
    return [...set].sort();
  }, [weighted]);
  const [pick, setPick] = useState("");
  const ex = exercises.includes(pick) ? pick : exercises[0] || "";
  const hist = useMemo(() => (ex ? exerciseHistory(sessions, ex) : null), [sessions, ex]);

  if (!weighted.length) return null;

  const thisWeek = show(weeks[weeks.length - 1]?.lbs || 0);
  const lastWeek = show(weeks[weeks.length - 2]?.lbs || 0);
  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const chart = weeks.map((w) => ({ week: format(w.start, "MMM d"), volume: Math.round(show(w.lbs)) }));
  const perSession = (hist?.sessions || []).slice(-10).map((p) => ({ date: format(new Date(p.date), "MMM d"), volume: Math.round(show(p.lbs)) }));

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Dumbbell className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold">Lifting Volume</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Weight × counted reps. Bodyweight sets aren't included.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-black/30 p-3 text-center">
          <div className="text-2xl font-black text-amber-400">{fmtNum(Math.round(thisWeek))}</div>
          <div className="text-[11px] text-gray-400">{unit} this week</div>
        </div>
        <div className="rounded-lg bg-black/30 p-3 text-center">
          <div className="text-2xl font-black text-gray-200">{fmtNum(Math.round(lastWeek))}</div>
          <div className="text-[11px] text-gray-400">
            {unit} last week{change !== null && (
              <span className={change >= 0 ? " text-green-400" : " text-red-400"}> · {change >= 0 ? "+" : ""}{change}%</span>
            )}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={1} />
          <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
            formatter={(v) => [`${fmtNum(v)} ${unit}`, "Volume"]} labelFormatter={(l) => `Week of ${l}`} />
          <Bar dataKey="volume" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {exercises.length > 0 && (
        <div className="mt-5">
          <label className="text-xs text-gray-400 block mb-1" htmlFor="vol-ex">Exercise</label>
          <select id="vol-ex" value={ex} onChange={(e) => setPick(e.target.value)}
            className="w-full min-h-[44px] rounded-lg bg-gray-800 border border-gray-700 text-white px-3 text-sm">
            {exercises.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          {perSession.length > 1 && (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={perSession} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                    formatter={(v) => [`${fmtNum(v)} ${unit}`, "Volume"]} />
                  <Bar dataKey="volume" fill="#00a9ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {hist?.bestByWeight?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-300 mb-1.5">Best set at each weight</p>
              <div className="divide-y divide-gray-800 rounded-lg bg-black/30">
                {hist.bestByWeight.slice(0, 8).map((b) => (
                  <div key={b.weightLbs} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-bold text-amber-300">{fmtNum(show(b.weightLbs))} {unit}</span>
                    <span className="text-white font-semibold">{b.reps} reps</span>
                    <span className="text-xs text-gray-500">{b.date ? format(new Date(b.date), "MMM d") : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
