/**
 * ContentAudit.jsx — READ-ONLY admin tool. Finds content gaps in Exercise records.
 *
 * Answers "what's missing before a new user sees this?" by checking every live
 * Exercise record for the gaps that actually break the user experience:
 *
 *   P1  ARTP-trackable but no photo   → AI rep tracking shows a blank card (Pro feature)
 *   P1  Isometric hold not metric:"time" → shows a REP COUNTER instead of a timer (Round 16 bug)
 *   P2  No photo                       → grey box / emoji in every list
 *   P2  No instructions                → exercise screen has no "how to do this"
 *   P3  No video link                  → no VIDEO button
 *
 * This page NEVER writes. It only reads Exercise.list() and reports. Safe to run
 * against live data any time. Fix things in /ExerciseImages and /ExerciseSeed.
 *
 * Export CSV to merge into Exercise_Media_Audit.xlsx.
 */

import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import * as tracking from "@/lib/exerciseTracking";
import {
  ChevronLeft, ClipboardCheck, RefreshCw, Search, Download,
  ImageOff, FileText, Youtube, Timer, Camera, CheckCircle2,
} from "lucide-react";

const CAT_LABEL = {
  upper_body: "Upper Body", lower_body: "Lower Body",
  core: "Core", full_body: "Full Body", mobility: "Mobility",
};

/* Isometric holds must be metric:"time" or ActiveWorkout defaults them to reps.
   Values = the target_time seeded in ExerciseSeed.jsx (Round 16). */
const ISOMETRIC_HOLDS = {
  "wall sit": 45, "plank": 60, "side plank": 30, "hollow body hold": 30,
  "l-sit": 20, "bar hang": 30, "handstand hold": 30,
};

const norm = (s) => (s || "").toLowerCase().trim();

/* Base44 stores some fields as arrays (step lists), some as strings.
   Coerce either shape to plain text so .trim() is always safe. */
const textOf = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean).join(" ").trim();
  if (typeof v === "string") return v.trim();
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

/* exerciseTracking's matchExercise shape varies by entry — read it defensively
   so a library change can never crash the audit. */
function getTrackInfo(name) {
  try {
    const m = tracking.matchExercise?.(name);
    if (!m) return null;
    const t = m.trackable;
    if (!t) return null;
    return { experimental: t === "experimental" };
  } catch {
    return null;
  }
}

function auditExercise(ex) {
  const issues = [];
  const track = getTrackInfo(ex.name);
  const hold = ISOMETRIC_HOLDS[norm(ex.name)];

  if (track && !ex.image_url) {
    issues.push({
      p: 1, code: "ARTP_NO_PHOTO", icon: Camera,
      label: "AI-tracked, no photo",
      detail: "ARTP shows a blank card for this exercise. Pro users see it.",
    });
  }
  if (hold && ex.metric !== "time") {
    issues.push({
      p: 1, code: "HOLD_NOT_TIMED", icon: Timer,
      label: "Hold shows rep counter",
      detail: `Needs metric:"time" + target_time:${hold}. Run /ExerciseSeed → Fix Stretch Records.`,
    });
  }
  if (!ex.image_url && !track) {
    issues.push({
      p: 2, code: "NO_PHOTO", icon: ImageOff,
      label: "No photo",
      detail: "Falls back to a grey box in every list.",
    });
  }
  if (!textOf(ex.instructions)) {
    issues.push({
      p: 2, code: "NO_INSTRUCTIONS", icon: FileText,
      label: "No instructions",
      detail: "Exercise screen has no how-to text. New users are guessing.",
    });
  }
  if (!textOf(ex.youtube_url)) {
    issues.push({
      p: 3, code: "NO_VIDEO", icon: Youtube,
      label: "No video link",
      detail: "VIDEO button won't appear.",
    });
  }

  return { ...ex, issues, track, worst: issues.length ? Math.min(...issues.map(i => i.p)) : 99 };
}

const P_STYLE = {
  1: { ring: "border-red-500/40 bg-red-950/20",    dot: "bg-red-500",    text: "text-red-300",    tag: "Fix first" },
  2: { ring: "border-amber-500/40 bg-amber-950/15", dot: "bg-amber-500",  text: "text-amber-300",  tag: "Fix soon" },
  3: { ring: "border-sky-500/30 bg-sky-950/10",     dot: "bg-sky-500",    text: "text-sky-300",    tag: "Nice to have" },
};

export default function ContentAudit() {
  const navigate = useNavigate();

  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | p1 | p2 | p3 | clean

  useEffect(() => { loadExercises(); }, []);

  const loadExercises = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await base44.entities.Exercise.list();
      const list = (data || []).filter(e => !e.is_deleted);
      setExercises(list.map(auditExercise));
    } catch (err) {
      setLoadError(err.message || "Could not load exercises.");
    }
    setIsLoading(false);
  };

  const stats = useMemo(() => {
    const s = { total: exercises.length, p1: 0, p2: 0, p3: 0, clean: 0, byCode: {} };
    exercises.forEach(ex => {
      if (!ex.issues.length) s.clean++;
      else if (ex.worst === 1) s.p1++;
      else if (ex.worst === 2) s.p2++;
      else s.p3++;
      ex.issues.forEach(i => { s.byCode[i.code] = (s.byCode[i.code] || 0) + 1; });
    });
    return s;
  }, [exercises]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return exercises
      .filter(ex => (ex.name || "").toLowerCase().includes(q))
      .filter(ex => {
        if (filter === "all")   return ex.issues.length > 0;
        if (filter === "clean") return ex.issues.length === 0;
        return ex.worst === Number(filter.slice(1));
      })
      .sort((a, b) => a.worst - b.worst
        || b.issues.length - a.issues.length
        || (a.name || "").localeCompare(b.name || ""));
  }, [exercises, search, filter]);

  const exportCsv = () => {
    const rows = [["Name", "Category", "Priority", "Issues", "Has photo", "Has video", "Has instructions", "Metric", "AI tracked"]];
    exercises
      .slice()
      .sort((a, b) => a.worst - b.worst || (a.name || "").localeCompare(b.name || ""))
      .forEach(ex => rows.push([
        ex.name || "",
        CAT_LABEL[ex.category] ?? ex.category ?? "",
        ex.issues.length ? `P${ex.worst}` : "OK",
        ex.issues.map(i => i.label).join(" | "),
        ex.image_url ? "yes" : "NO",
        textOf(ex.youtube_url) ? "yes" : "NO",
        textOf(ex.instructions) ? "yes" : "NO",
        ex.metric || "(unset)",
        ex.track ? (ex.track.experimental ? "beta" : "yes") : "no",
      ]));

    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CHIPS = [
    { id: "p1",    label: "Fix first",    n: stats.p1 },
    { id: "p2",    label: "Fix soon",     n: stats.p2 },
    { id: "p3",    label: "Nice to have", n: stats.p3 },
    { id: "all",   label: "All gaps",     n: stats.p1 + stats.p2 + stats.p3 },
    { id: "clean", label: "Complete",     n: stats.clean },
  ];

  return (
    <div className="min-h-screen bg-[#020817] text-white pb-24">

      <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(createPageUrl("Exercises"))} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <ClipboardCheck className="w-5 h-5 text-blue-400" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">Content Audit</h1>
          <p className="text-xs text-gray-500">Read-only — finds gaps a new user would hit</p>
        </div>
        <button onClick={loadExercises} className="text-gray-600 hover:text-white" title="Reload">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm">Checking exercises…</span>
          </div>
        )}

        {loadError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm font-semibold">Could not load exercises</p>
            <p className="text-red-400/70 text-xs mt-0.5">{loadError}</p>
            <button onClick={loadExercises} className="text-blue-400 text-xs underline mt-2">Try again</button>
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            {/* Scoreboard */}
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-white font-semibold">
                  {stats.clean} / {stats.total} exercises complete
                </p>
                <button
                  onClick={exportCsv}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>

              <div className="mt-3 h-2 rounded-full bg-gray-900 overflow-hidden flex">
                {stats.total > 0 && (
                  <>
                    <div className="bg-green-500" style={{ width: `${(stats.clean / stats.total) * 100}%` }} />
                    <div className="bg-sky-500"   style={{ width: `${(stats.p3 / stats.total) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(stats.p2 / stats.total) * 100}%` }} />
                    <div className="bg-red-500"   style={{ width: `${(stats.p1 / stats.total) * 100}%` }} />
                  </>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-400">
                <span>AI-tracked, no photo: <b className="text-red-300">{stats.byCode.ARTP_NO_PHOTO || 0}</b></span>
                <span>Holds shown as reps: <b className="text-red-300">{stats.byCode.HOLD_NOT_TIMED || 0}</b></span>
                <span>Missing photo: <b className="text-amber-300">{stats.byCode.NO_PHOTO || 0}</b></span>
                <span>Missing instructions: <b className="text-amber-300">{stats.byCode.NO_INSTRUCTIONS || 0}</b></span>
                <span>Missing video: <b className="text-sky-300">{stats.byCode.NO_VIDEO || 0}</b></span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CHIPS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                    filter === c.id
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {c.label} <span className="opacity-70">{c.n}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                className="bg-[#111] border-gray-700 text-white pl-9"
              />
            </div>

            {/* Results */}
            <div className="space-y-2">
              {visible.map(ex => {
                const style = P_STYLE[ex.worst] || {};
                return (
                  <div key={ex.id} className={`rounded-xl border px-4 py-3 ${ex.issues.length ? style.ring : "bg-[#111] border-green-900/40"}`}>
                    <div className="flex items-center gap-3">
                      {ex.image_url ? (
                        <img src={ex.image_url} alt="" loading="lazy" decoding="async"
                             className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                          <ImageOff className="w-4 h-4 text-gray-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                          {ex.track && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">
                              {ex.track.experimental ? "AI BETA" : "AI"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">{CAT_LABEL[ex.category] ?? ex.category}</p>
                      </div>

                      {ex.issues.length ? (
                        <span className={`text-[10px] font-semibold shrink-0 ${style.text}`}>{style.tag}</span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>

                    {ex.issues.length > 0 && (
                      <div className="mt-2.5 space-y-1.5 pl-1">
                        {ex.issues.map(iss => {
                          const Icon = iss.icon;
                          return (
                            <div key={iss.code} className="flex gap-2">
                              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${P_STYLE[iss.p].text}`} />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-200">{iss.label}</p>
                                <p className="text-[11px] text-gray-500 leading-snug">{iss.detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {visible.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">
                  {filter === "clean"
                    ? "No fully-complete exercises yet."
                    : "Nothing in this group. Try another filter."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
