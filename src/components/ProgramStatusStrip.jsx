/**
 * ProgramStatusStrip.jsx - Round 30
 *
 * "What day am I on?" answered on the Home screen without opening anything.
 *
 * COLLAPSED BY DEFAULT and deliberately one line tall - Jace asked for a small
 * card on the existing Home screen, not another panel competing with the hero.
 * Tapping it expands to today's plan + a Start button; the choice is remembered
 * per device. It is never dismissed away entirely: collapsing IS the dismiss.
 *
 * Renders NOTHING when there's no active program, so Home is unchanged for
 * anyone not enrolled.
 *
 * Data is already there - no new tracking:
 *   user.active_program      { program_id, current_day }
 *   PresetProgram            name, duration_days, daily_plans[]
 *   ProgramEnrollment        completed_days[] (for the accurate done count)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Moon, Play, CheckCircle2, Calendar } from "lucide-react";

const OPEN_KEY = "rns_program_strip_open";

export default function ProgramStatusStrip() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);   // { name, day, totalDays, todayPlan, isRest, done, complete }
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch { /* not fatal */ }
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        const ap = user?.active_program;
        if (!ap?.program_id) return;

        const programs = await base44.entities.PresetProgram.filter({ id: ap.program_id });
        const program = programs?.[0];
        if (!program || !alive) return;

        const totalDays = program.duration_days || (program.daily_plans?.length ?? 0);
        const day = ap.current_day || 1;
        const plan = program.daily_plans?.[day - 1];

        // Rest days are stored as a plan with no exercises (same test Layout uses).
        const isRest = !!plan && (!plan.exercises || plan.exercises.length === 0);

        // Prefer the enrollment's real completed count; fall back to day-1.
        let done = Math.max(0, day - 1);
        try {
          const enr = await base44.entities.ProgramEnrollment.filter({ program_id: ap.program_id });
          const active = enr?.find((e) => e.status !== "completed") || enr?.[0];
          if (active?.days_completed_count != null) done = active.days_completed_count;
          else if (Array.isArray(active?.completed_days)) done = active.completed_days.length;
        } catch { /* enrollment is optional - the strip still works without it */ }

        if (!alive) return;
        setData({
          name: program.name || "Program",
          day,
          totalDays,
          todayPlan: plan?.name || plan?.title || null,
          isRest,
          done,
          complete: totalDays > 0 && done >= totalDays,
        });
      } catch {
        // Not logged in, or no program. Strip simply doesn't render.
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!data) return null;

  const pct = data.totalDays > 0
    ? Math.min(100, Math.round((data.done / data.totalDays) * 100))
    : 0;

  const accent = data.complete ? "#3DDC7A" : data.isRest ? "#F5A524" : "#00a9ff";

  return (
    <div className="mx-4 mb-4">
      <div className="rounded-xl bg-[#0d1524] border border-gray-800 overflow-hidden">

        {/* ── the one-line strip (always visible) ─────────────────────────── */}
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-label={`${data.name}, day ${data.day} of ${data.totalDays}. ${open ? "Collapse" : "Expand"} program status`}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-white/5 transition-colors"
        >
          {data.complete ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: accent }} aria-hidden="true" />
          ) : (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
              aria-hidden="true"
            />
          )}

          <span className="min-w-0 flex-1 truncate text-[12px] text-gray-400">
            <span className="text-white font-semibold">{data.name}</span>
            {data.complete
              ? <span style={{ color: accent }}> · Complete</span>
              : <> · Day {data.day} of {data.totalDays}</>}
            {data.isRest && !data.complete && <span className="text-amber-400"> · Rest</span>}
          </span>

          <span className="text-[11px] font-bold flex-shrink-0" style={{ color: accent }}>
            {data.complete ? "100%" : `${pct}%`}
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />}
        </button>

        {/* ── expanded detail ────────────────────────────────────────────── */}
        {open && (
          <div className="px-3 pb-3 pt-0.5 border-t border-gray-800/80">
            <div className="h-1.5 rounded-full bg-[#1E293B] overflow-hidden mt-2.5 mb-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${data.complete ? 100 : pct}%`, background: accent }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mb-2.5">
              {data.done} of {data.totalDays} days done
              {!data.complete && ` · ${Math.max(0, data.totalDays - data.done)} to go`}
            </p>

            {data.complete ? (
              <button
                onClick={() => navigate(createPageUrl("PresetPrograms"))}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold text-white active:scale-[0.99] transition-transform"
                style={{ background: "linear-gradient(135deg,#16A34A,#15803D)" }}
              >
                <Calendar className="w-4 h-4" /> Pick your next program
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2.5">
                  {data.isRest
                    ? <Moon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
                    : <Play className="w-3.5 h-3.5 text-[#00a9ff] flex-shrink-0" aria-hidden="true" />}
                  <span className="text-[12px] text-gray-300 truncate">
                    {data.isRest
                      ? "Rest day — steps still count"
                      : (data.todayPlan || `Day ${data.day} workout`)}
                  </span>
                </div>
                <button
                  onClick={() => navigate(createPageUrl("ProgramProgress"))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold text-white active:scale-[0.99] transition-transform border-2 border-white/85"
                  style={{
                    background: data.isRest
                      ? "linear-gradient(135deg,#B45309,#D97706)"
                      : "linear-gradient(135deg,#2563EB,#7C3AED)",
                  }}
                >
                  {data.isRest ? "Open program" : `Start Day ${data.day}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
