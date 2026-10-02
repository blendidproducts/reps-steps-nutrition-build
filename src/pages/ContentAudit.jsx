/**
 * ContentAudit.jsx — READ-ONLY admin tool. Every content gap a user can hit.
 *
 * Rewritten 2026-09-30. The previous version checked 5 things on Exercise
 * records only. Three problems with that:
 *
 *   1. STRETCHES WERE INVISIBLE. Stretches aren't a separate entity — they're
 *      Exercise rows with metric:"time". But the Stretches page merges in a
 *      hardcoded STRETCH_LIBRARY for any stretch the DB doesn't have, so those
 *      show up for users while having no DB row at all. No row means no photo
 *      and no video can ever be attached to them in /ExerciseImages. The audit
 *      could not see them, so "all stretches missing video" never showed up.
 *
 *   2. "NO VIDEO" WAS SCORED AS COSMETIC. It isn't. When an exercise has no
 *      youtube_url and no video_url, ExerciseModal falls back to a hardcoded
 *      name→video-id map and, failing that, to a single default id. So the user
 *      is shown a confident instruction video OF A DIFFERENT EXERCISE. That is
 *      worse than an empty slot, and it's a P1.
 *
 *   3. IT ONLY CHECKED FIELDS, NOT THE SCREENS. Tips, muscle groups, hold
 *      duration and the 3D model are all rendered conditionally somewhere, so
 *      each one silently disappears when empty. They're all checked now, each
 *      against the screen it actually affects.
 *
 * This page NEVER writes. Fix things in /ExerciseImages and /ExerciseSeed.
 * CSV export covers every record and every field, for Exercise_Media_Audit.xlsx.
 */

import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import * as tracking from "@/lib/exerciseTracking";
import { STRETCH_LIBRARY } from "@/lib/stretchLibrary";
import {
  ChevronLeft, ClipboardCheck, RefreshCw, Search, Download,
  ImageOff, FileText, Youtube, Timer, Camera, CheckCircle2,
  Lightbulb, Target, Box, DatabaseZap, AlertTriangle, Film,
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
const listLen = (v) => (Array.isArray(v) ? v.filter(x => textOf(x)).length : (textOf(v) ? 1 : 0));

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

/* ── The checks ──────────────────────────────────────────────────────────────
   Every entry names the field, the screen the gap shows up on, and where to fix
   it. `kinds` limits a check to stretches or to exercises where the consequence
   differs between them. */
function auditRecord(rec) {
  const issues = [];
  const isStretch = rec.metric === "time";
  const track = getTrackInfo(rec.name);
  const hold = ISOMETRIC_HOLDS[norm(rec.name)];
  const hasVideo = !!(textOf(rec.youtube_url) || textOf(rec.video_url));

  const add = (p, code, icon, label, detail, fix) =>
    issues.push({ p, code, icon, label, detail, fix });

  // ── P1: the user sees something wrong, or a paid feature breaks ───────────

  if (rec.libraryOnly) {
    add(1, "LIB_ONLY", DatabaseZap, "No database record",
      "Shown on /Stretches from the built-in library. There is no Exercise row, so it can never be given a photo or a video.",
      "/ExerciseSeed → Fix Stretch Records");
  }

  if (!isStretch && !hasVideo) {
    // ExerciseModal's getYouTubeVideoId() substring-matches a hardcoded map and
    // falls back to one default id for everything unmatched.
    add(1, "WRONG_VIDEO", Film, "Plays an UNRELATED video",
      "No youtube_url or video_url, so the exercise screen embeds a hardcoded stand-in clip — a video of a different exercise, presented as the instructions.",
      "/ExerciseImages → paste the real YouTube link");
  }

  if (track && !rec.image_url) {
    add(1, "ARTP_NO_PHOTO", Camera, "AI-tracked, no photo",
      "ARTP shows a blank preview card before the camera opens. Pro users see this.",
      "/ExerciseImages → upload photo");
  }

  if (hold && rec.metric !== "time") {
    add(1, "HOLD_NOT_TIMED", Timer, "Hold shows a rep counter",
      `An isometric hold with no metric:"time" gets a rep counter instead of a timer. Needs target_time:${hold}.`,
      "/ExerciseSeed → Fix Stretch Records");
  }

  // ── P2: visibly incomplete ───────────────────────────────────────────────

  if (!rec.image_url && !track) {
    add(2, "NO_PHOTO", ImageOff, "No photo",
      isStretch
        ? "The stretch card shows a grey timer icon instead of the pose."
        : "Falls back to a grey box in every list.",
      "/ExerciseImages → upload photo");
  }

  if (!listLen(rec.instructions)) {
    add(2, "NO_INSTRUCTIONS", FileText, "No instructions",
      isStretch
        ? "Expanding the stretch card shows no \"How to do it\" steps at all."
        : "Exercise screen has no how-to text. New users are guessing.",
      "/ExerciseSeed → reseed, or edit the record");
  }

  if (!textOf(rec.description)) {
    add(2, "NO_DESCRIPTION", FileText, "No description",
      isStretch
        ? "The stretch card's subtitle line renders blank — the list looks broken."
        : "No summary text under the exercise name.",
      "/ExerciseSeed → reseed, or edit the record");
  }

  if (isStretch && !(Number(rec.target_time) > 0)) {
    add(2, "NO_HOLD_TIME", Timer, "No hold duration",
      "Silently falls back to 30s, so the prescribed hold is whatever the default happens to be.",
      "/ExerciseSeed → Fix Stretch Records");
  }

  // ── P3: a card quietly doesn't render ────────────────────────────────────

  if (isStretch && !hasVideo) {
    add(3, "NO_VIDEO", Youtube, "No video link",
      "The red VIDEO badge and the inline player don't appear on the stretch card. (Unlike exercises, stretches show nothing rather than a stand-in.)",
      "/ExerciseImages → paste the YouTube link");
  }

  if (!listLen(rec.tips)) {
    add(3, "NO_TIPS", Lightbulb, "No tips",
      "The Pro Tips / Tips card is skipped entirely.",
      "/ExerciseSeed → reseed, or edit the record");
  }

  if (!listLen(rec.muscle_groups)) {
    add(3, "NO_MUSCLES", Target, "No muscle groups",
      "The Primary Muscles card is skipped, and muscle-based filters can't find it.",
      "/ExerciseSeed → reseed, or edit the record");
  }

  if (!textOf(rec.model_url)) {
    add(3, "NO_3D", Box, "No 3D model",
      "The 3D button has nothing to show.",
      "/Upload3DModels");
  }

  return {
    ...rec,
    isStretch,
    hasVideo,
    issues,
    track,
    worst: issues.length ? Math.min(...issues.map(i => i.p)) : 99,
  };
}

const P_STYLE = {
  1: { ring: "border-red-500/40 bg-red-950/20",    dot: "bg-red-500",   text: "text-red-300",   tag: "Fix first" },
  2: { ring: "border-amber-500/40 bg-amber-950/15", dot: "bg-amber-500", text: "text-amber-300", tag: "Fix soon" },
  3: { ring: "border-sky-500/30 bg-sky-950/10",     dot: "bg-sky-500",   text: "text-sky-300",   tag: "Nice to have" },
};

/* Counted on the scoreboard, in priority order. */
const CODE_SUMMARY = [
  ["WRONG_VIDEO",     "Plays an unrelated video", 1],
  ["LIB_ONLY",        "No database record",       1],
  ["ARTP_NO_PHOTO",   "AI-tracked, no photo",     1],
  ["HOLD_NOT_TIMED",  "Holds shown as reps",      1],
  ["NO_PHOTO",        "Missing photo",            2],
  ["NO_INSTRUCTIONS", "Missing instructions",     2],
  ["NO_DESCRIPTION",  "Missing description",      2],
  ["NO_HOLD_TIME",    "Missing hold duration",    2],
  ["NO_VIDEO",        "Missing video (stretch)",  3],
  ["NO_TIPS",         "Missing tips",             3],
  ["NO_MUSCLES",      "Missing muscle groups",    3],
  ["NO_3D",           "Missing 3D model",         3],
];

export default function ContentAudit() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [capWarning, setCapWarning] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");   // all | p1 | p2 | p3 | clean
  const [kind, setKind] = useState("all");       // all | exercises | stretches

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    setCapWarning(null);
    try {
      // An audit that silently misses rows is worse than no audit, so ask for a
      // page far bigger than the catalogue and then check whether what came back
      // looks like it hit a cap.
      let data;
      try {
        data = await base44.entities.Exercise.list("name", 1000);
      } catch (_) {
        data = await base44.entities.Exercise.list();
      }
      const dbList = (data || []).filter(e => !e.is_deleted);

      if ([25, 50, 100, 200, 500].includes(dbList.length)) {
        setCapWarning(
          `Exactly ${dbList.length} records came back, which is a suspiciously round number — ` +
          `the query may have hit a page limit and this audit may be incomplete.`
        );
      }

      // Stretches that exist only in the Stretches page's built-in library have
      // no row here, yet users see them. Fold them in so they're counted.
      const have = new Set(dbList.map(e => norm(e.name)));
      const libOnly = (STRETCH_LIBRARY || [])
        .filter(s => !have.has(norm(s.name)))
        .map(s => ({ ...s, libraryOnly: true }));

      setRecords([...dbList, ...libOnly].map(auditRecord));
    } catch (err) {
      setLoadError(err.message || "Could not load exercises.");
    }
    setIsLoading(false);
  };

  const inKind = (r) =>
    kind === "all" || (kind === "stretches" ? r.isStretch : !r.isStretch);

  const stats = useMemo(() => {
    const scoped = records.filter(inKind);
    const s = {
      total: scoped.length, p1: 0, p2: 0, p3: 0, clean: 0, byCode: {},
      exercises: records.filter(r => !r.isStretch).length,
      stretches: records.filter(r => r.isStretch).length,
      libOnly: records.filter(r => r.libraryOnly).length,
    };
    scoped.forEach(r => {
      if (!r.issues.length) s.clean++;
      else if (r.worst === 1) s.p1++;
      else if (r.worst === 2) s.p2++;
      else s.p3++;
      r.issues.forEach(i => { s.byCode[i.code] = (s.byCode[i.code] || 0) + 1; });
    });
    return s;
  }, [records, kind]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return records
      .filter(inKind)
      .filter(r => (r.name || "").toLowerCase().includes(q))
      .filter(r => {
        if (filter === "all")   return r.issues.length > 0;
        if (filter === "clean") return r.issues.length === 0;
        return r.worst === Number(filter.slice(1));
      })
      .sort((a, b) => a.worst - b.worst
        || b.issues.length - a.issues.length
        || (a.name || "").localeCompare(b.name || ""));
  }, [records, search, filter, kind]);

  const exportCsv = () => {
    const rows = [[
      "Name", "Type", "Category", "Priority", "Issue codes", "Issues",
      "In database", "Photo", "Video link", "Instructions", "Description",
      "Tips", "Muscle groups", "3D model", "Hold time", "Metric", "AI tracked",
    ]];
    records
      .slice()
      .sort((a, b) => a.worst - b.worst || (a.name || "").localeCompare(b.name || ""))
      .forEach(r => rows.push([
        r.name || "",
        r.isStretch ? "Stretch" : "Exercise",
        CAT_LABEL[r.category] ?? r.category ?? "",
        r.issues.length ? `P${r.worst}` : "OK",
        r.issues.map(i => i.code).join(" "),
        r.issues.map(i => i.label).join(" | "),
        r.libraryOnly ? "NO (library only)" : "yes",
        r.image_url ? "yes" : "NO",
        r.hasVideo ? "yes" : "NO",
        listLen(r.instructions) ? `${listLen(r.instructions)} steps` : "NO",
        textOf(r.description) ? "yes" : "NO",
        listLen(r.tips) ? `${listLen(r.tips)}` : "NO",
        listLen(r.muscle_groups) ? `${listLen(r.muscle_groups)}` : "NO",
        textOf(r.model_url) ? "yes" : "NO",
        Number(r.target_time) > 0 ? `${r.target_time}s` : (r.isStretch ? "NO" : "n/a"),
        r.metric || "(unset)",
        r.track ? (r.track.experimental ? "beta" : "yes") : "no",
      ]));

    const csv = rows
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
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

  const KINDS = [
    { id: "all",       label: "Everything", n: records.length },
    { id: "exercises", label: "Exercises",  n: stats.exercises },
    { id: "stretches", label: "Stretches",  n: stats.stretches },
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
          <p className="text-xs text-gray-500">Read-only — exercises and stretches, every rendered field</p>
        </div>
        <button onClick={load} className="text-gray-600 hover:text-white" title="Reload">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm">Checking every exercise and stretch…</span>
          </div>
        )}

        {loadError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm font-semibold">Could not load exercises</p>
            <p className="text-red-400/70 text-xs mt-0.5">{loadError}</p>
            <button onClick={load} className="text-blue-400 text-xs underline mt-2">Try again</button>
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            {capWarning && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs leading-snug">{capWarning}</p>
              </div>
            )}

            {/* Type filter — stretches have different consequences for the same
                missing field, so they're worth looking at on their own. */}
            <div className="flex gap-2">
              {KINDS.map(k => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`flex-1 text-xs px-3 py-2 rounded-lg border ${
                    kind === k.id
                      ? "bg-gray-700 border-gray-500 text-white"
                      : "border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {k.label} <span className="opacity-60">{k.n}</span>
                </button>
              ))}
            </div>

            {/* Scoreboard */}
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-white font-semibold">
                  {stats.clean} / {stats.total} complete
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

              <div className="mt-3 space-y-0.5">
                {CODE_SUMMARY.filter(([code]) => stats.byCode[code]).map(([code, label, p]) => (
                  <div key={code} className="flex items-baseline justify-between text-[11px]">
                    <span className="text-gray-400">{label}</span>
                    <b className={P_STYLE[p].text}>{stats.byCode[code]}</b>
                  </div>
                ))}
                {!Object.keys(stats.byCode).length && (
                  <p className="text-[11px] text-green-400">Nothing missing in this group.</p>
                )}
              </div>

              {stats.libOnly > 0 && kind !== "exercises" && (
                <p className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-gray-400 leading-snug">
                  <b className="text-red-300">{stats.libOnly}</b> stretches are shown to users
                  from the built-in library with no database row. Until they exist as records,
                  no photo or video can be attached to them.
                </p>
              )}
            </div>

            {/* Priority filters */}
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
                placeholder="Search by name…"
                className="bg-[#111] border-gray-700 text-white pl-9"
              />
            </div>

            {/* Results */}
            <div className="space-y-2">
              {visible.map(r => {
                const style = P_STYLE[r.worst] || {};
                return (
                  <div key={r.id} className={`rounded-xl border px-4 py-3 ${r.issues.length ? style.ring : "bg-[#111] border-green-900/40"}`}>
                    <div className="flex items-center gap-3">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" loading="lazy" decoding="async"
                             className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                          <ImageOff className="w-4 h-4 text-gray-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-white truncate">{r.name}</p>
                          {r.isStretch && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-teal-500/20 text-teal-300 shrink-0">
                              STRETCH
                            </span>
                          )}
                          {r.track && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">
                              {r.track.experimental ? "AI BETA" : "AI"}
                            </span>
                          )}
                          {r.libraryOnly && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 shrink-0">
                              NO RECORD
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">{CAT_LABEL[r.category] ?? r.category}</p>
                      </div>

                      {r.issues.length ? (
                        <span className={`text-[10px] font-semibold shrink-0 ${style.text}`}>{style.tag}</span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>

                    {r.issues.length > 0 && (
                      <div className="mt-2.5 space-y-2 pl-1">
                        {r.issues.map(iss => {
                          const Icon = iss.icon;
                          return (
                            <div key={iss.code} className="flex gap-2">
                              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${P_STYLE[iss.p].text}`} />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-200">{iss.label}</p>
                                <p className="text-[11px] text-gray-500 leading-snug">{iss.detail}</p>
                                {iss.fix && (
                                  <p className="text-[10px] text-blue-400/80 mt-0.5">Fix: {iss.fix}</p>
                                )}
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
                    ? "Nothing in this group is fully complete yet."
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
