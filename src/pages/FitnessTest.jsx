/**
 * FitnessTest.jsx — pick a battery, run it, see where you stand.
 *
 * Three phases: setup -> running -> results.
 *
 * The runner hands each event to the machinery that already exists — the ARTP
 * camera tracker for rep events, a count-up timer for holds, the step counter
 * for the step burst — so there is no new tracking code here, only the frame
 * around it.
 *
 * Results are persisted to the FitnessTest entity when it exists in Base44, and
 * to localStorage either way. The local copy is what makes the "since your last
 * test" delta work on day one, before the entity has been created.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import RepTracker, { releaseSharedCamera } from "@/components/workout/RepTracker";
import StepTracker from "@/components/StepTracker";
import BuildStamp from "@/components/BuildStamp";
import {
  BATTERIES, BATTERY_LIST, batteryMinutes, scorePrtTest, lineScore, tierFor,
  compareToPrevious, ageBand, TEST_GROUPS, batteriesInGroup,
  CUSTOM_EVENT_POOL, buildCustomBattery,
  MILITARY_BRANCHES, batteriesInBranch,
} from "@/lib/fitnessTests";
import {
  PENDING, scoreAftTest, aftBand, scorePstTest, PST_PROGRAMS, PST_MINIMUMS,
} from "@/lib/militaryStandards";
import {
  ChevronLeft, Shield, Zap, Flame, Dumbbell, Play, Square, Timer as TimerIcon,
  CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, RotateCcw, Footprints,
  SlidersHorizontal, ChevronDown, Plus, Check, Lock,
} from "lucide-react";

const ICONS = {
  shield: Shield, zap: Zap, flame: Flame, dumbbell: Dumbbell,
  sliders: SlidersHorizontal,
};
const STORE_KEY = "rns_fitness_tests";

const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// "sec10" is a short sprint timed to a tenth — a pro-agility run or a farmer's
// carry. Rendering 4.7 seconds as "0:05" would throw away the digit the whole
// event turns on, so it keeps its decimal instead of becoming mm:ss.
const fmtValue = (v, unit) =>
  unit === "secs" ? fmtSecs(v)
  : unit === "sec10" ? `${Number(v).toFixed(1)}s`
  : unit === "mi100" ? `${(Number(v) / 100).toFixed(2)} mi`
  : unit === "in" ? `${v}"`
  : `${v}`;
const isTimeUnit = (unit) => unit === "secs" || unit === "sec10";

/* ── local history ─────────────────────────────────────────────────────────── */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; }
}
function saveLocal(record) {
  try {
    const all = [record, ...loadHistory()].slice(0, 50);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch { /* storage full or blocked — the on-screen result is still correct */ }
}
const lastOfBattery = (key) => loadHistory().find((r) => r.battery === key) || null;

/** Profile for the military battery, remembered so it's asked once. */
function loadProfile() {
  try { return JSON.parse(localStorage.getItem("rns_test_profile") || "null"); } catch { return null; }
}
function saveProfile(p) {
  try { localStorage.setItem("rns_test_profile", JSON.stringify(p)); } catch {}
}

export default function FitnessTest() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState("setup");       // setup | running | results
  const [batteryKey, setBatteryKey] = useState(null);
  const [profile, setProfile] = useState(() => loadProfile() || { sex: "", age: "" });
  const [eventIndex, setEventIndex] = useState(0);
  const [values, setValues] = useState({});          // key -> measured value
  const [resting, setResting] = useState(0);         // seconds left between events

  // Which of the three groups is expanded. ?group=military|private|custom comes
  // from the Home card's chips, so a tap there lands on the open group instead
  // of a page the user has to go hunting through.
  const groupParam = params.get("group");
  const [openGroup, setOpenGroup] = useState(
    TEST_GROUPS.some((g) => g.key === groupParam) ? groupParam : "military"
  );
  // Which branch is open inside MILITARY. Navy first because it's the test the
  // app has scored longest, not for any grander reason.
  const [openBranch, setOpenBranch] = useState("navy");

  // Army only: the combat-arms standard is sex-neutral (everyone is scored on
  // the male-normed column) and needs 350 total rather than just 60 per event.
  // Which one applies is the soldier's MOS, so it's a question, not a guess.
  const [aftCombat, setAftCombat] = useState(false);

  // PST only: which pipeline you're screening for. The PST has no age bands and
  // no sex norming — the program IS the standard, so it has to be chosen.
  const [pstProgram, setPstProgram] = useState("seal");

  // Custom battery: the picked event keys, assembled on demand. Memoised so the
  // battery object keeps its identity between renders - finishEvent closes over
  // it, and a fresh object every render would re-fire its effects.
  const [customKeys, setCustomKeys] = useState([]);
  const battery = useMemo(() => {
    if (!batteryKey) return null;
    if (batteryKey === "custom") {
      return customKeys.length ? buildCustomBattery(customKeys) : null;
    }
    return BATTERIES[batteryKey] || null;
  }, [batteryKey, customKeys]);

  const event = battery?.events[eventIndex] || null;

  /* ── rest between events ─────────────────────────────────────────────── */
  useEffect(() => {
    if (resting <= 0) return;
    const t = setTimeout(() => setResting((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resting]);

  useEffect(() => () => releaseSharedCamera(), []);

  // Arriving from a different Home chip while already on this page changes the
  // query string without remounting, so the open group has to follow it.
  useEffect(() => {
    if (TEST_GROUPS.some((g) => g.key === groupParam)) setOpenGroup(groupParam);
  }, [groupParam]);

  /** Record an event's result and move on (or finish). */
  const finishEvent = useCallback((value) => {
    const key = battery.events[eventIndex].key;
    const next = { ...values, [key]: value };
    setValues(next);
    const rest = battery.events[eventIndex].restAfter || 0;
    if (eventIndex + 1 >= battery.events.length) {
      finishTest(next);
    } else {
      setEventIndex((i) => i + 1);
      setResting(rest);
    }
  }, [battery, eventIndex, values]); // eslint-disable-line

  function finishTest(finalValues) {
    const events = battery.events.map((e) => ({
      key: e.key, name: e.name, unit: e.unit, value: finalValues[e.key] ?? 0,
    }));
    const record = {
      id: `local-${Date.now()}`,
      battery: battery.key,
      taken_at: new Date().toISOString(),
      sex: profile.sex || null,
      age: profile.age ? Number(profile.age) : null,
      // Stored on the record, not recomputed later: which standard you were
      // held to is part of what the result MEANS, so a past test has to keep it.
      combat: battery.hasCombatStandard ? aftCombat : false,
      program: battery.needsProgram ? pstProgram : null,
      events,
    };
    saveLocal(record);
    setResult(record);
    setPhase("results");
    releaseSharedCamera();

    // Mirror to Base44 when the entity exists. It may not yet — the local copy
    // above is the one the results screen actually reads, so a missing entity
    // costs nothing but cross-device history.
    (async () => {
      try { await base44.entities.FitnessTest?.create?.(record); } catch (_) {}
    })();
  }

  const [result, setResult] = useState(null);

  function restart() {
    setPhase("setup"); setBatteryKey(null); setEventIndex(0);
    setValues({}); setResting(0); setResult(null);
  }

  /* ── SETUP ───────────────────────────────────────────────────────────── */
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-[#020817] text-white pb-28">
        <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => navigate(createPageUrl("Home"))} className="text-gray-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black tracking-tight">FITNESS TEST</h1>
            <p className="text-[11px] text-gray-500 tracking-wide">
              Military · Reps and Steps · Custom — measure, don't guess
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
          {/* One section per kind of test. Collapsed by default except the one
              you arrived at, because three open lists of batteries is a long
              scroll on a phone and the choice of KIND is the real first
              decision - what you're scored against. */}
          {TEST_GROUPS.map((g) => {
            const GroupIcon = ICONS[g.icon] || Shield;
            const open = openGroup === g.key;
            const members = batteriesInGroup(g.key);
            return (
              <div key={g.key} className="rounded-2xl border border-gray-800 bg-[#0d0d0d] overflow-hidden">
                <button
                  onClick={() => setOpenGroup(open ? null : g.key)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${g.accent}22`, border: `1px solid ${g.accent}55` }}>
                    <GroupIcon className="w-5 h-5" style={{ color: g.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm tracking-wider" style={{ color: g.accent }}>
                      {g.label}
                    </p>
                    <p className="text-[11px] text-gray-500">{g.sub}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div className="px-3 pb-3 space-y-3">
                    <p className="text-[11px] text-gray-400 leading-snug px-1">{g.detail}</p>

                    {/* MILITARY opens into branches, each of which opens into
                        its own tests. Two taps to any service test, and no
                        level of the list ever gets long enough to scroll. */}
                    {g.key === "military" ? MILITARY_BRANCHES.map((br) => {
                      const live = batteriesInBranch(br.key);
                      const pending = PENDING.filter((p) => p.branch === br.key);
                      const brOpen = openBranch === br.key;
                      if (!live.length && !pending.length) return null;
                      return (
                        <div key={br.key} className="rounded-xl border border-gray-800/80 bg-[#0a0a0a] overflow-hidden">
                          <button
                            onClick={() => setOpenBranch(brOpen ? null : br.key)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                          >
                            <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: br.accent }} />
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-black tracking-wider text-white">{br.label}</span>
                              <span className="block text-[10px] text-gray-500">{br.sub}</span>
                            </span>
                            <span className="text-[10px] text-gray-600 tabular-nums">
                              {live.length || pending.length}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-500 transition-transform ${brOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                          {brOpen && (
                            <div className="px-2 pb-2 space-y-2">
                              {live.map((b) => (
                                <BatteryCard key={b.key} b={b}
                                  selected={batteryKey === b.key}
                                  onSelect={() => setBatteryKey(b.key)} />
                              ))}
                              {pending.map((p) => <PendingCard key={p.key} p={p} />)}
                            </div>
                          )}
                        </div>
                      );
                    }) : members.map((b) => (
                      <BatteryCard
                        key={b.key}
                        b={b}
                        selected={batteryKey === b.key}
                        onSelect={() => setBatteryKey(b.key)}
                      />
                    ))}
                    {g.key === "custom" && (
                      <CustomPicker
                        selectedKeys={customKeys}
                        active={batteryKey === "custom"}
                        onToggle={(k) => {
                          setBatteryKey("custom");
                          setCustomKeys((ks) =>
                            ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]
                          );
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* The PST asks a different question from every other scored test.
              There are no age bands and no sex norming in MILPERSMAN — the
              pipeline you're screening for IS the standard, and the gap between
              them is wide (SEAL wants 10 pull-ups, a rescue swimmer 4). */}
          {battery?.needsProgram && (
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Which pipeline?
              </p>
              <p className="text-[11px] text-gray-500 leading-snug">
                The PST has no age or sex bands — one set of minimums per program.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PST_PROGRAMS.map((p) => (
                  <button key={p.key} onClick={() => setPstProgram(p.key)}
                    className={`min-h-[52px] rounded-xl border px-2.5 py-1.5 text-left ${
                      pstProgram === p.key
                        ? "bg-[#f59e0b]/20 border-[#f59e0b] text-white"
                        : "border-gray-700 text-gray-400"
                    }`}>
                    <span className="block text-sm font-bold">{p.label}</span>
                    <span className="block text-[10px] text-gray-500 leading-tight">{p.sub}</span>
                  </button>
                ))}
              </div>
              <div className="pt-1 space-y-1 border-t border-white/10">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide pt-2">
                  Minimums for {PST_PROGRAMS.find((p) => p.key === pstProgram)?.label}
                </p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    ["Swim", fmtSecs(PST_MINIMUMS[pstProgram].swim500)],
                    ["Push", PST_MINIMUMS[pstProgram].pushups],
                    ["Curl", PST_MINIMUMS[pstProgram].curlups],
                    ["Pull", PST_MINIMUMS[pstProgram].pullups],
                    ["Run", fmtSecs(PST_MINIMUMS[pstProgram].run15)],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[9px] text-gray-600 uppercase">{l}</p>
                      <p className="text-xs font-bold tabular-nums text-gray-300">{v}</p>
                    </div>
                  ))}
                </div>
                {pstProgram === "eod" && (
                  <p className="text-[10px] text-amber-300/90 leading-snug pt-1">
                    EOD is scored on the combined swim + run: under 21:00 total, with neither
                    over 12:30. A slower swim can be made up by a faster run.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Age and sex — only the military battery needs them, because only it
              scores against age- and sex-normed standards. Asking everyone for
              them would be collecting data we have no use for. */}
          {battery?.needsProfile && (
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Required for scoring
              </p>
              <p className="text-[11px] text-gray-500 leading-snug">
                Service standards are set per age group and sex. Without these the test can be
                run but not scored.
              </p>

              {battery.hasCombatStandard && (
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1.5">Which standard applies to you?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      [false, "General", "60 pts per event"],
                      [true, "Combat arms", "60 pts + 350 total"],
                    ].map(([v, l, sub]) => (
                      <button key={String(v)} onClick={() => setAftCombat(v)}
                        className={`min-h-[52px] rounded-xl border px-2 py-1.5 text-left ${
                          aftCombat === v
                            ? "bg-[#84cc16]/20 border-[#84cc16] text-white"
                            : "border-gray-700 text-gray-400"
                        }`}>
                        <span className="block text-sm font-semibold">{l}</span>
                        <span className="block text-[10px] text-gray-500">{sub}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5 leading-snug">
                    The combat-arms standard is sex-neutral — everyone is scored on the
                    male-normed column. It applies to 24 combat specialties.
                  </p>
                </div>
              )}
              <div>
                <label className="text-[11px] text-gray-400 block mb-1.5">Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["male", "Male"], ["female", "Female"]].map(([v, l]) => (
                    <button key={v}
                      onClick={() => { const p = { ...profile, sex: v }; setProfile(p); saveProfile(p); }}
                      className={`min-h-[44px] rounded-xl border text-sm font-semibold ${
                        profile.sex === v
                          ? "bg-[#00a9ff]/20 border-[#00a9ff] text-white"
                          : "border-gray-700 text-gray-400"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1.5">Age</label>
                <input
                  type="number" inputMode="numeric" min="17" max="99"
                  value={profile.age}
                  onChange={(e) => { const p = { ...profile, age: e.target.value }; setProfile(p); saveProfile(p); }}
                  placeholder="e.g. 34"
                  className="w-full min-h-[44px] bg-[#0a0a0a] border border-gray-700 rounded-xl px-3 text-white text-sm"
                />
                {profile.age && !(battery.scoring === "aft" ? aftBand(profile.age) : ageBand(profile.age)) && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    The service tables start at 17 — the test will run but won't be scored.
                  </p>
                )}
              </div>
            </div>
          )}

          <BuildStamp />
        </div>

        {battery && createPortal(
          <div className="fixed left-0 right-0 px-4 pb-3 pt-3 bg-gradient-to-t from-[#020817] via-[#020817] to-transparent"
            style={{ bottom: "calc(var(--nav-h, 68px) + env(safe-area-inset-bottom, 0px))", zIndex: 60 }}>
            <button onClick={() => { setPhase("running"); setEventIndex(0); setValues({}); }}
              className="w-full min-h-[56px] rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 active:scale-95 transition"
              style={{ background: `linear-gradient(135deg, ${battery.accent}, ${battery.accent}cc)` }}>
              <Play className="w-5 h-5 fill-white" /> START {battery.name.toUpperCase()}
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  }

  /* ── RUNNING ─────────────────────────────────────────────────────────── */
  if (phase === "running" && event) {
    if (resting > 0) {
      return <RestBetween secs={resting} next={event} onSkip={() => setResting(0)}
        index={eventIndex} total={battery.events.length} accent={battery.accent} />;
    }
    return (
      <EventRunner
        key={`${battery.key}-${event.key}`}
        event={event}
        index={eventIndex}
        total={battery.events.length}
        accent={battery.accent}
        onDone={finishEvent}
        onAbort={() => { releaseSharedCamera(); restart(); }}
      />
    );
  }

  /* ── RESULTS ─────────────────────────────────────────────────────────── */
  if (phase === "results" && result) {
    return <Results record={result} onRestart={restart}
      onExit={() => navigate(createPageUrl("Home"))} />;
  }

  return null;
}

/* ── A branch whose standards aren't loaded yet ─────────────────────────────
   Listed, named, and deliberately not runnable. The alternative was to ship the
   events with invented thresholds, and a test that tells you you passed a
   standard nobody verified is worse than no test at all. Each card says which
   document is missing, so this is a to-do list rather than an apology. */
function PendingCard({ p }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4 opacity-80">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-900 border border-gray-800">
          <Lock className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-400">{p.name}</p>
          <p className="text-[10px] text-gray-600 uppercase tracking-wide">Standards not loaded</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2.5 leading-snug">{p.events}</p>
      <p className="text-[10px] text-gray-600 mt-2 leading-snug">{p.why}</p>
    </div>
  );
}

/* ── One preset battery ─────────────────────────────────────────────────────
   Collapsed it is a name and a one-liner; selected it opens to show every event
   with its time cap, so nobody starts a 20-minute test expecting 5 minutes. */
function BatteryCard({ b, selected, onSelect }) {
  const Icon = ICONS[b.icon] || Shield;
  const prev = lastOfBattery(b.key);
  return (
    <button onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        selected ? "border-2 bg-white/5" : "border-gray-800 bg-[#111]"
      }`}
      style={selected ? { borderColor: b.accent } : undefined}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${b.accent}22`, border: `1px solid ${b.accent}55` }}>
          <Icon className="w-5 h-5" style={{ color: b.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm">{b.name}</p>
            {/* The one distinction that changes how to read your result. A
                scored test tells you pass or fail against the service's own
                table; a record-only one is an accurate scoresheet and a
                history, because we don't hold that service's table yet. */}
            {b.standardsPending ? (
              <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "#78350f", color: "#fcd34d" }}>
                RECORD ONLY
              </span>
            ) : (
              <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "#064e3b", color: "#6ee7b7" }}>
                SCORED
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {b.events.length} events · about {batteryMinutes(b)} min
            {prev && ` · last ${new Date(prev.taken_at).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2.5 leading-snug">{b.blurb}</p>

      {selected && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {b.events.map((e, i) => (
            <div key={e.key} className="flex items-center gap-2 text-[11px]">
              <span className="w-4 text-gray-600 font-bold">{i + 1}</span>
              <span className="text-gray-300 flex-1">{e.name}</span>
              <span className="text-gray-500">
                {e.fixedSeconds ? fmtSecs(e.fixedSeconds)
                  : e.seconds ? fmtSecs(e.seconds)
                  : e.how === "hold" ? "max hold" : "to failure"}
              </span>
            </div>
          ))}
          {b.disclaimer && (
            <div className="flex gap-2 mt-2 bg-amber-950/30 border border-amber-500/30 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200/90 leading-snug">{b.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/* ── Build your own ─────────────────────────────────────────────────────────
   Pick events from the pool the presets are built from. Scored against your own
   last custom test, event by event, so a changed list still gives you deltas on
   the events that overlap. */
function CustomPicker({ selectedKeys, active, onToggle }) {
  const picked = active ? selectedKeys : [];
  const preview = picked.length ? buildCustomBattery(picked) : null;
  return (
    <div className={`rounded-2xl border p-4 ${
      active && picked.length ? "border-2 border-[#f97316] bg-white/5" : "border-gray-800 bg-[#111]"
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#f9731622", border: "1px solid #f9731655" }}>
          <SlidersHorizontal className="w-5 h-5" style={{ color: "#f97316" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Build Your Own</p>
          <p className="text-[11px] text-gray-500">
            {picked.length
              ? `${picked.length} event${picked.length === 1 ? "" : "s"} · about ${batteryMinutes(preview)} min`
              : "Tap the events you want to be tested on"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {CUSTOM_EVENT_POOL.map((e) => {
          const on = picked.includes(e.key);
          return (
            <button key={e.key} onClick={() => onToggle(e.key)}
              className={`flex items-start gap-2 rounded-xl px-2.5 py-2 min-h-[48px] text-left border text-[11px] ${
                on ? "border-[#f97316] bg-[#f97316]/15 text-white" : "border-gray-700 bg-[#0a0a0a] text-gray-400"
              }`}>
              {on ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#f97316]" />
                  : <Plus className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-600" />}
              <span className="leading-tight">
                {e.name}
                <span className="block text-[10px] text-gray-500">
                  {e.fixedSeconds ? fmtSecs(e.fixedSeconds)
                    : e.seconds ? fmtSecs(e.seconds)
                    : e.how === "hold" ? "max hold" : "to failure"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rest between events ─────────────────────────────────────────────────────
   Rest is part of the test, not a courtesy: every event is max effort and an
   unrested second event measures your recovery, not the thing it claims to. */
function RestBetween({ secs, next, onSkip, index, total, accent }) {
  return createPortal(
    <div className="fixed inset-0 bg-[#020817] flex flex-col items-center justify-center px-6 text-center"
      style={{ zIndex: 99995 }}>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Rest</p>
      <div className="text-8xl font-black tabular-nums my-3" style={{ color: accent }}>{secs}</div>
      <p className="text-gray-400 text-sm">Event {index + 1} of {total} coming up</p>
      <p className="text-white font-bold text-xl mt-4">{next.name}</p>
      <p className="text-gray-500 text-xs mt-2 max-w-xs leading-snug">{next.cue}</p>
      <button onClick={onSkip}
        className="mt-8 min-h-[48px] px-6 rounded-xl border border-gray-700 text-gray-300 text-sm font-bold active:scale-95">
        Skip rest — I'm ready
      </button>
    </div>,
    document.body
  );
}

/* ── One event ───────────────────────────────────────────────────────────────
   Four shapes, all reusing machinery that already exists:
     reps   -> RepTracker (camera)
     hold   -> count-up timer
     run    -> stopwatch, or a distance entry for the Cooper run
     steps  -> StepTracker over a fixed window
     manual -> tap counter, for burpees the pose model can't count */
function EventRunner({ event, index, total, accent, onDone, onAbort }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [taps, setTaps] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState("");
  // Hand-entered results: `entryA` is the whole number (pounds, or minutes) and
  // `entryB` the seconds half of a mm:ss time.
  const [entryA, setEntryA] = useState("");
  const [entryB, setEntryB] = useState("");
  const stepBase = useRef(null);

  const cap = event.fixedSeconds ?? event.seconds ?? null;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Auto-stop at the cap for capped events.
  useEffect(() => {
    if (cap && running && elapsed >= cap) {
      setRunning(false);
      if (event.how === "reps" || event.how === "manual") {
        // handled by the finish button so the number can be checked first
      }
    }
  }, [elapsed, cap, running, event.how]);

  const remaining = cap ? Math.max(0, cap - elapsed) : null;

  /* Rep events hand straight off to the existing camera tracker. */
  if (event.how === "reps") {
    return (
      <RepTracker
        exerciseName={event.exercise}
        targetReps={0}
        defaultFacingMode="user"
        keepCameraAlive={true}
        timedMode={!!event.seconds}
        secondsLeft={event.seconds ? remaining : null}
        onComplete={(reps) => onDone(reps)}
        onClose={onAbort}
      />
    );
  }

  const Shell = ({ children, hint }) => createPortal(
    <div className="fixed inset-0 bg-[#020817] flex flex-col text-white" style={{ zIndex: 99995 }}>
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),20px)] pb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Event {index + 1} of {total}
        </span>
        <button onClick={onAbort} className="text-[11px] text-red-400 font-bold border border-red-500/40 rounded-full px-3 py-1.5">
          Abandon
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-2xl font-black">{event.name}</h2>
        <p className="text-gray-500 text-xs mt-2 max-w-xs leading-snug">{event.cue}</p>
        {children}
      </div>
      {hint && <p className="text-center text-[11px] text-gray-600 pb-[max(env(safe-area-inset-bottom),20px)] px-6">{hint}</p>}
    </div>,
    document.body
  );

  /* Count-up hold: plank, wall sit. */
  if (event.how === "hold") {
    return (
      <Shell hint="The timer counts up. Your score is how long you lasted.">
        <div className="text-7xl font-black tabular-nums my-8" style={{ color: accent }}>
          {fmtSecs(elapsed)}
        </div>
        {!running ? (
          <button onClick={() => setRunning(true)}
            className="min-h-[56px] px-10 rounded-2xl font-black text-base text-black flex items-center gap-2 active:scale-95"
            style={{ background: accent }}>
            <Play className="w-5 h-5 fill-black" /> START HOLD
          </button>
        ) : (
          <button onClick={() => { setRunning(false); onDone(elapsed); }}
            className="min-h-[56px] px-10 rounded-2xl font-black text-base bg-red-600 text-white flex items-center gap-2 active:scale-95">
            <Square className="w-5 h-5" /> I DROPPED
          </button>
        )}
      </Shell>
    );
  }

  /* Hand-entered result — the deadlift and the sprint-drag-carry.
     These need a hex bar, a sled and a measured lane. The phone can't watch any
     of it, and pretending otherwise would mean swapping the event for something
     camera-friendly and still calling the result an AFT score. So: do the event
     properly, then type what you got. */
  if (event.how === "entry") {
    const isTime = event.entryKind === "time";
    // Everything that isn't mm:ss is one number; only the label and the step
    // change. Decimal seconds matter for the sprint events, where a tenth is
    // the difference between two rows of a scoring chart.
    const SINGLE = {
      weight:   { label: "POUNDS",  step: "5",   mode: "numeric" },
      reps:     { label: "REPS",    step: "1",   mode: "numeric" },
      distance: { label: "INCHES",  step: "1",   mode: "numeric" },
      seconds:  { label: "SECONDS", step: "0.1", mode: "decimal" },
    };
    const single = SINGLE[event.entryKind] || SINGLE.weight;
    const value = isTime
      ? (Number(entryA) || 0) * 60 + (Number(entryB) || 0)
      : Number(entryA) || 0;
    const ready = value > 0;
    return (
      <Shell hint={event.equipment ? `Needs: ${event.equipment}` : undefined}>
        {isTime ? (
          <div className="flex items-end gap-2 my-8">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 text-left">MIN</label>
              <input type="number" inputMode="numeric" min="0" max="59" value={entryA}
                onChange={(e) => setEntryA(e.target.value)} placeholder="0"
                className="w-24 min-h-[64px] bg-[#0a0a0a] border border-gray-700 rounded-xl text-white text-center text-3xl font-black tabular-nums" />
            </div>
            <span className="text-3xl font-black text-gray-600 pb-4">:</span>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 text-left">SEC</label>
              <input type="number" inputMode="numeric" min="0" max="59" value={entryB}
                onChange={(e) => setEntryB(e.target.value)} placeholder="00"
                className="w-24 min-h-[64px] bg-[#0a0a0a] border border-gray-700 rounded-xl text-white text-center text-3xl font-black tabular-nums" />
            </div>
          </div>
        ) : (
          <div className="my-8">
            <label className="text-[10px] text-gray-500 block mb-1">{single.label}</label>
            <input type="number" inputMode={single.mode} min="0" step={single.step} value={entryA}
              onChange={(e) => setEntryA(e.target.value)} placeholder="0"
              className="w-40 min-h-[64px] bg-[#0a0a0a] border border-gray-700 rounded-xl text-white text-center text-3xl font-black tabular-nums" />
          </div>
        )}
        <button disabled={!ready} onClick={() => onDone(value)}
          className="min-h-[56px] px-10 rounded-2xl font-black text-base text-black disabled:opacity-40 active:scale-95"
          style={{ background: accent }}>
          SAVE RESULT
        </button>
      </Shell>
    );
  }

  /* Run: a stopwatch for a fixed distance, or a fixed clock for the Cooper. */
  if (event.how === "run") {
    const isCooper = !!event.fixedSeconds;
    return (
      <Shell hint={isCooper
        ? "Run for 12 minutes, then enter how far you got."
        : "Start the clock as you set off. Tap STOP as you finish."}>
        <div className="text-6xl font-black tabular-nums my-6" style={{ color: accent }}>
          {isCooper && running ? fmtSecs(remaining) : fmtSecs(elapsed)}
        </div>
        <p className="text-gray-500 text-xs mb-6">{event.distanceLabel}</p>

        {isCooper && (!running && elapsed > 0) ? (
          <div className="w-full max-w-xs space-y-3">
            <label className="text-xs text-gray-400 block">Distance covered (miles)</label>
            <input type="number" step="0.01" inputMode="decimal" value={distance}
              onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 1.42"
              className="w-full min-h-[48px] bg-[#0a0a0a] border border-gray-700 rounded-xl px-3 text-white text-center text-lg" />
            <button disabled={!distance}
              onClick={() => onDone(Math.round(Number(distance) * 100))}
              className="w-full min-h-[52px] rounded-2xl font-black text-black disabled:opacity-40"
              style={{ background: accent }}>
              SAVE DISTANCE
            </button>
          </div>
        ) : !running ? (
          <button onClick={() => setRunning(true)}
            className="min-h-[56px] px-10 rounded-2xl font-black text-base text-black flex items-center gap-2 active:scale-95"
            style={{ background: accent }}>
            <Play className="w-5 h-5 fill-black" /> START
          </button>
        ) : (
          <button onClick={() => { setRunning(false); if (!isCooper) onDone(elapsed); }}
            className="min-h-[56px] px-10 rounded-2xl font-black text-base bg-red-600 text-white flex items-center gap-2 active:scale-95">
            <Square className="w-5 h-5" /> STOP
          </button>
        )}
      </Shell>
    );
  }

  /* Step burst — the native counter over a fixed window. */
  if (event.how === "steps") {
    return (
      <Shell hint="Any pace. Steps feed your output score directly.">
        <StepTracker isActive={running} onStepUpdate={(c) => {
          if (stepBase.current === null) stepBase.current = c;
          setSteps(Math.max(0, c - stepBase.current));
        }} />
        <div className="text-7xl font-black tabular-nums mt-8" style={{ color: accent }}>{steps}</div>
        <p className="text-gray-500 text-xs mb-6">steps</p>
        <div className="text-2xl font-bold tabular-nums text-gray-400 mb-6">
          {running ? fmtSecs(remaining) : fmtSecs(cap)}
        </div>
        {!running ? (
          <button onClick={() => setRunning(true)}
            className="min-h-[56px] px-10 rounded-2xl font-black text-base text-black flex items-center gap-2 active:scale-95"
            style={{ background: accent }}>
            <Footprints className="w-5 h-5" /> START
          </button>
        ) : (
          <button onClick={() => { setRunning(false); onDone(steps); }}
            className={`min-h-[56px] px-10 rounded-2xl font-black text-base flex items-center gap-2 active:scale-95 ${
              remaining === 0 ? "bg-green-500 text-black" : "bg-red-600 text-white"
            }`}>
            {remaining === 0 ? <><CheckCircle className="w-5 h-5" /> DONE</> : <><Square className="w-5 h-5" /> STOP EARLY</>}
          </button>
        )}
      </Shell>
    );
  }

  /* Manual tap — burpees. */
  return (
    <Shell hint="Tap anywhere on the big number for each rep.">
      <button onClick={() => running && setTaps((t) => t + 1)}
        className="my-6 w-56 h-56 rounded-full flex flex-col items-center justify-center active:scale-95 transition"
        style={{ background: `${accent}22`, border: `3px solid ${accent}` }}>
        <span className="text-7xl font-black tabular-nums" style={{ color: accent }}>{taps}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide mt-1">tap to count</span>
      </button>
      <div className="text-2xl font-bold tabular-nums text-gray-400 mb-6">
        {running ? fmtSecs(remaining) : fmtSecs(cap)}
      </div>
      {!running ? (
        <button onClick={() => setRunning(true)}
          className="min-h-[56px] px-10 rounded-2xl font-black text-base text-black active:scale-95"
          style={{ background: accent }}>
          START
        </button>
      ) : (
        <button onClick={() => { setRunning(false); onDone(taps); }}
          className={`min-h-[56px] px-10 rounded-2xl font-black text-base active:scale-95 ${
            remaining === 0 ? "bg-green-500 text-black" : "bg-red-600 text-white"
          }`}>
          {remaining === 0 ? "DONE" : "STOP EARLY"}
        </button>
      )}
    </Shell>
  );
}

/* ── Results ─────────────────────────────────────────────────────────────────
   Three ways to present a result, because the three kinds of battery mean
   genuinely different things:
     standards -> Navy pass/fail with per-event points
     line      -> one output number and a plate tier
     baseline  -> per-event change since your last test */
function Results({ record, onRestart, onExit }) {
  // A hand-built battery isn't in BATTERIES, and a record from an older build
  // may name one that no longer exists. Either way the record carries its own
  // events, so fall back to a descriptor good enough to render them rather than
  // crashing on a result the user just earned.
  const battery = BATTERIES[record.battery] || {
    key: record.battery,
    name: record.battery === "custom" ? "Custom Test" : "Fitness Test",
    scoring: "baseline",
    accent: "#f97316",
    disclaimer: null,
  };
  const previous = loadHistory().find(
    (r) => r.battery === record.battery && r.id !== record.id
  ) || null;

  const prt = battery.scoring === "standards"
    ? scorePrtTest(record.events, record.sex, record.age)
    : null;

  // The AFT scores the same shape as the PRT — points per event, pass/fail
  // overall — but its own tables and its own "did you clear the total" rule.
  const aft = battery.scoring === "aft"
    ? scoreAftTest(record.events, record.sex, record.age, record.combat)
    : null;

  // The PST is pass/fail against one program's minimums — no points at all.
  const pst = battery.scoring === "pst"
    ? scorePstTest(record.events, record.program)
    : null;

  // The Line needs its three terms separated out of the events: rep-scored
  // events are reps, held events are time under load, the step burst is steps.
  const line = battery.scoring === "line" ? (() => {
    const reps = record.events.filter((e) => e.unit === "reps").reduce((s, e) => s + e.value, 0);
    const steps = record.events.filter((e) => e.unit === "steps").reduce((s, e) => s + e.value, 0);
    const secs = record.events.filter((e) => e.unit === "secs").reduce((s, e) => s + e.value, 0);
    const score = lineScore({ cleanReps: reps, steps, activeMinutes: secs / 60 });
    return { reps, steps, secs, score, tier: tierFor(score) };
  })() : null;

  const deltas = compareToPrevious(record.events, previous);

  return (
    <div className="min-h-screen bg-[#020817] text-white pb-28">
      <div className="max-w-lg mx-auto px-4 pt-[max(env(safe-area-inset-top),24px)] space-y-5">

        <div className="text-center space-y-1">
          <div className="text-5xl">
            {prt ? (prt.passed ? "🎖️" : "📋")
              : aft ? (aft.passed ? "🎖️" : "📋")
              : pst ? (pst.passed ? "🎖️" : "📋")
              : "📊"}
          </div>
          <h1 className="text-2xl font-black">{battery.name}</h1>
          <p className="text-gray-500 text-xs">
            {new Date(record.taken_at).toLocaleString()}
          </p>
        </div>

        {/* ── Navy result ──────────────────────────────────────────────── */}
        {prt && (
          prt.overall ? (
            <div className="rounded-2xl border-2 p-5 text-center"
              style={{ borderColor: prt.overall.color, background: `${prt.overall.color}18` }}>
              <p className="text-xs uppercase tracking-widest text-gray-400">Overall</p>
              <p className="text-3xl font-black mt-1" style={{ color: prt.overall.color }}>
                {prt.overall.label}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {prt.average} points average · {prt.passed ? "PASS" : "FAIL"}
              </p>
              {!prt.passed && (
                <p className="text-[11px] text-red-300 mt-2 leading-snug">
                  Failing any single event fails the whole test — that's the real rule.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90 leading-snug">
                Your results are saved, but there's no standards table for this age and sex, so
                nothing was scored. Add them on the setup screen and retest to see where you land.
              </p>
            </div>
          )
        )}

        {/* ── Army AFT result ──────────────────────────────────────────── */}
        {aft && (
          aft.overall ? (
            <div className="rounded-2xl border-2 p-5 text-center"
              style={{ borderColor: aft.overall.color, background: `${aft.overall.color}18` }}>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                {record.combat ? "Combat arms standard" : "General standard"}
              </p>
              <p className="text-3xl font-black mt-1" style={{ color: aft.overall.color }}>
                {aft.overall.label}
              </p>
              <p className="text-5xl font-black tabular-nums mt-2">{aft.total}</p>
              <p className="text-sm text-gray-400 mt-1">{aft.overall.detail}</p>
              {!aft.everyEventPassed && (
                <p className="text-[11px] text-red-300 mt-2 leading-snug">
                  60 points on every event is a hard floor — the total can't make up for a
                  single event below it.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90 leading-snug">
                Your results are saved, but there's no AFT table for this age and sex, so
                nothing was scored. Add them on the setup screen and retest.
              </p>
            </div>
          )
        )}

        {/* ── PST result ───────────────────────────────────────────────── */}
        {pst && pst.overall && (
          <div className="rounded-2xl border-2 p-5 text-center"
            style={{ borderColor: pst.overall.color, background: `${pst.overall.color}18` }}>
            <p className="text-xs uppercase tracking-widest text-gray-400">
              {PST_PROGRAMS.find((p) => p.key === record.program)?.label || "PST"} minimums
            </p>
            <p className="text-2xl font-black mt-1" style={{ color: pst.overall.color }}>
              {pst.overall.label}
            </p>
            <p className="text-sm text-gray-400 mt-1">{pst.overall.detail}</p>
            {pst.cardioNote && (
              <p className="text-[11px] text-amber-200/90 mt-2 leading-snug">{pst.cardioNote}</p>
            )}
            <p className="text-[11px] text-gray-500 mt-3 leading-snug">
              These are minimums, not competitive scores. Clearing them is the floor for a
              contract — candidates who get selected are well past it.
            </p>
          </div>
        )}

        {/* ── The Line ─────────────────────────────────────────────────── */}
        {line && (
          <>
            <div className="rounded-2xl border-2 p-5 text-center"
              style={{ borderColor: line.tier.color, background: `${line.tier.color}18` }}>
              <p className="text-xs uppercase tracking-widest text-gray-400">Output score</p>
              <p className="text-6xl font-black tabular-nums mt-1">{line.score}</p>
              <p className="text-sm font-bold mt-1" style={{ color: line.tier.color }}>
                {line.tier.name} tier
              </p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-4">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">How it was built</p>
              <div className="space-y-1.5 text-xs">
                <Row label="Reps" value={`${line.reps}`} contrib={line.reps} />
                <Row label="Steps" value={`${line.steps}`} contrib={Math.round(line.steps / 100)} />
                <Row label="Time under load" value={fmtSecs(line.secs)}
                  contrib={Math.round((line.secs / 60) * 2)} />
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-800 font-bold">
                  <span className="text-gray-300">Output</span>
                  <span className="text-white tabular-nums">{line.score}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Per event ────────────────────────────────────────────────── */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-semibold">Events</p>
          </div>
          <div className="divide-y divide-gray-800">
            {record.events.map((e, i) => {
              // Both scored tests produce points + a pass line per event, but
              // in different shapes. Normalise here so the row doesn't care
              // which service's table it came from.
              const raw = (prt || aft || pst)?.scored.find((s) => s.key === e.key)?.result;
              const scored = !raw ? null : prt ? {
                points: raw.points, label: raw.category.label, color: raw.category.color,
                min: raw.min, max: raw.max,
              } : aft ? {
                points: raw.points, label: raw.pass ? "Pass" : "Below standard",
                color: raw.pass ? "#4ade80" : "#ef4444",
                min: raw.passValue, max: raw.maxValue,
              } : {
                // The PST has no points at all — just the minimum and whether
                // you cleared it. Showing a fabricated score here would be
                // inventing a number the Navy doesn't publish.
                points: null, label: raw.pass ? "Meets minimum" : "Below minimum",
                color: raw.pass ? "#4ade80" : "#ef4444",
                min: raw.minimum, max: null,
              };
              const d = deltas?.find((x) => x.key === e.key);
              return (
                <div key={e.key} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{e.name}</span>
                    <span className="font-bold tabular-nums">{fmtValue(e.value, e.unit)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {scored && (
                      <span className="text-[11px] font-bold" style={{ color: scored.color }}>
                        {scored.points != null ? `${scored.points} pts · ` : ""}{scored.label}
                      </span>
                    )}
                    {scored && (
                      <span className="text-[10px] text-gray-600">
                        {scored.max != null
                          ? `pass ${fmtValue(scored.min, e.unit)} · max ${fmtValue(scored.max, e.unit)}`
                          : `minimum ${fmtValue(scored.min, e.unit)}`}
                      </span>
                    )}
                    {d?.delta != null && d.delta !== 0 && (
                      <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
                        d.improved ? "text-green-400" : "text-amber-400"}`}>
                        {d.improved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {d.delta > 0 ? "+" : ""}
                        {isTimeUnit(e.unit) ? `${Number(d.delta).toFixed(e.unit === "sec10" ? 1 : 0)}s` : d.delta}
                      </span>
                    )}
                    {d && d.delta === 0 && (
                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                        <Minus className="w-3 h-3" /> same
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!previous && battery.scoring === "baseline" && (
          <p className="text-[11px] text-gray-500 text-center leading-snug px-4">
            This is your baseline. Retest in 4–6 weeks and every event will show its change.
          </p>
        )}

        {battery.disclaimer && (
          <p className="text-[10px] text-gray-600 leading-snug px-1">{battery.disclaimer}</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onRestart}
            className="min-h-[52px] rounded-xl border border-gray-700 text-gray-300 font-bold text-sm active:scale-95">
            <RotateCcw className="w-4 h-4 inline mr-1.5" /> Another test
          </button>
          <button onClick={onExit}
            className="min-h-[52px] rounded-xl bg-[#00a9ff] text-white font-bold text-sm active:scale-95">
            Done
          </button>
        </div>

        <BuildStamp />
      </div>
    </div>
  );
}

function Row({ label, value, contrib }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-300">
        {value} <span className="text-gray-600">→ +{contrib}</span>
      </span>
    </div>
  );
}
