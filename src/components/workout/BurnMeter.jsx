/* Live burn meter (2026-11-18). Estimated active calories (MET-based, see
   src/lib/burnEstimate.js for sources) plus an intensity bar that switches to
   real heart-rate zones when a Bluetooth HR strap is connected.

   - useBurnTracker  — accumulates kcal while `running`, wall-clock based.
   - useHeartRate    — module-level strap connection, so a strap paired on one
                       screen keeps reporting on the next (same idea as the
                       shared camera in RepTracker).
   - <BurnMeter/>    — the card (ActiveWorkout, ARTP rest screen).
   - <BurnChip/>     — a one-line pill for the ARTP camera top bar. Tap it to
                       connect a strap when none is live (2026-11-19).
   - <HeartRateGraph/> — live scrolling BPM line over zone bands (2026-11-19).
   - <HeartRateMini/> — slim graph that sits beside the exercise name in the
                       ARTP camera top bar (no extra height, so nothing under
                       the bar moves); nothing until a strap has sent a reading.

   Web Bluetooth exists in Chrome on Android/desktop (and the Android TWA),
   NOT in iOS Safari or most WebViews. Where it's missing the connect button
   simply doesn't render. */

import React, { useEffect, useReducer, useRef, useState } from "react";
import { Flame, Heart, Bluetooth } from "lucide-react";
import {
  activeKcalPerMin, getBodyStats, hrZone, hrMax, metBand, HR_ZONES,
  lbsToKg, DEFAULT_WEIGHT_LBS, DEFAULT_AGE,
} from "@/lib/burnEstimate";

/* ── body stats ───────────────────────────────────────────────────────────── */
export function useBodyStats() {
  const [stats, setStats] = useState({ weightLbs: DEFAULT_WEIGHT_LBS, age: DEFAULT_AGE, weightIsDefault: true });
  useEffect(() => {
    let alive = true;
    getBodyStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);
  return stats;
}

/* ── calorie accumulator ──────────────────────────────────────────────────── */
export function useBurnTracker({ running, met, weightLbs }) {
  const totalRef = useRef(0);
  const lastRef = useRef(null);
  const metRef = useRef(met);
  const kgRef = useRef(lbsToKg(weightLbs));
  metRef.current = met;
  kgRef.current = lbsToKg(weightLbs);
  const [kcal, setKcal] = useState(0);

  useEffect(() => {
    if (!running) { lastRef.current = null; return; }
    lastRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      // Wall-clock delta so a throttled tab still counts; capped so a long
      // suspend (phone locked mid-rest) can't dump minutes of burn at once.
      const dt = Math.min(30, (now - lastRef.current) / 1000);
      lastRef.current = now;
      totalRef.current += (activeKcalPerMin(metRef.current, kgRef.current) * dt) / 60;
      setKcal(totalRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = () => { totalRef.current = 0; setKcal(0); };
  const rate = running ? activeKcalPerMin(met, lbsToKg(weightLbs)) : 0;
  return { kcal, rate, totalRef, reset };
}

/* ── heart-rate strap (module singleton) ──────────────────────────────────── */
const hr = { bpm: null, status: "idle", name: "", device: null, at: 0, history: [], listeners: new Set() };
const HISTORY_MS = 15 * 60 * 1000; // keep 15 min of readings for the graphs

function recordBpm(bpm, now = Date.now()) {
  const h = hr.history;
  // Straps send about once a second; collapse bursts so the line stays smooth.
  if (h.length && now - h[h.length - 1].t < 800) h[h.length - 1] = { t: now, bpm };
  else h.push({ t: now, bpm });
  while (h.length && now - h[0].t > HISTORY_MS) h.shift();
}

/** Test/demo hook: feed a reading as if a strap sent it. */
export function _pushHeartRateForTest(bpm, t = Date.now()) {
  hr.bpm = bpm; hr.at = t; hr.status = "live"; recordBpm(bpm, t); emit();
}
const emit = () => hr.listeners.forEach((f) => f());

export const hrSupported = () =>
  typeof navigator !== "undefined" && !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === "function";

export async function connectHeartRate() {
  if (!hrSupported() || hr.status === "connecting") return;
  hr.status = "connecting"; emit();
  try {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] });
    hr.device = device;
    hr.name = device.name || "HR strap";
    device.addEventListener("gattserverdisconnected", () => { hr.status = "idle"; hr.bpm = null; emit(); });
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService("heart_rate");
    const ch = await svc.getCharacteristic("heart_rate_measurement");
    ch.addEventListener("characteristicvaluechanged", (e) => {
      // Bluetooth SIG Heart Rate Measurement: bit 0 of the flags byte says
      // whether the value is UINT8 or UINT16 (little-endian).
      const v = e.target.value;
      const bpm = (v.getUint8(0) & 1) ? v.getUint16(1, true) : v.getUint8(1);
      if (bpm > 0) { const now = Date.now(); hr.bpm = bpm; hr.at = now; hr.status = "live"; recordBpm(bpm, now); emit(); }
    });
    await ch.startNotifications();
    hr.status = "live"; emit();
  } catch (e) {
    // NotFoundError = the person closed the device chooser. Not an error.
    hr.status = e?.name === "NotFoundError" ? "idle" : "error";
    emit();
  }
}

export function disconnectHeartRate() {
  try { hr.device?.gatt?.disconnect(); } catch { /* already gone */ }
  hr.bpm = null; hr.status = "idle"; emit();
}

export function useHeartRate() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    hr.listeners.add(force);
    // A strap that stops sending (out of range, battery) shouldn't leave a
    // frozen number on screen.
    const id = setInterval(() => {
      if (hr.bpm && Date.now() - hr.at > 6000) { hr.bpm = null; emit(); }
    }, 2000);
    return () => { hr.listeners.delete(force); clearInterval(id); };
  }, []);
  return { bpm: hr.bpm, status: hr.status, name: hr.name, history: hr.history, supported: hrSupported() };
}

/* ── visuals ──────────────────────────────────────────────────────────────── */
const RING_GOAL = 100; // the ring fills once per 100 kcal, then starts a new lap

function FlameRing({ kcal, intensity, size = 72 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const lap = (kcal % RING_GOAL) / RING_GOAL;
  const laps = Math.floor(kcal / RING_GOAL);
  const gid = "burnGrad";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        {laps > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeOpacity="0.25" strokeWidth="7" />
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - lap)} style={{ transition: "stroke-dashoffset 0.9s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <Flame className="w-4 h-4 mb-0.5"
          style={{ color: HR_ZONES[intensity].color, fill: HR_ZONES[intensity].color,
            animation: intensity >= 3 ? "burnPulse 0.9s ease-in-out infinite" : "none" }} />
        <span className="text-lg font-black text-white tabular-nums">{Math.round(kcal)}</span>
        <span className="text-[9px] font-bold text-gray-400 tracking-wider">KCAL</span>
      </div>
    </div>
  );
}

function IntensityBar({ active }) {
  return (
    <div className="flex gap-1 mt-1.5" aria-hidden="true">
      {HR_ZONES.map((z, i) => (
        <div key={z.key} className="h-2 flex-1 rounded-full transition-all duration-500"
          style={{
            background: z.color,
            opacity: i === active ? 1 : i < active ? 0.45 : 0.14,
            boxShadow: i === active ? `0 0 10px ${z.color}` : "none",
          }} />
      ))}
    </div>
  );
}

const KEYFRAMES = "@keyframes burnPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}";

/**
 * Full card. `met` is the MET of what's happening right now; `kcal`/`rate`
 * come from useBurnTracker so the page owns the total (it saves it).
 */
export function BurnMeter({ kcal, rate, met, age, weightIsDefault, compact = false, className = "" }) {
  const { bpm, status, supported } = useHeartRate();
  const zone = hrZone(bpm, age || DEFAULT_AGE);
  const intensity = zone ? zone.index : metBand(rate > 0 ? met : 1);
  const label = zone ? zone.label : rate > 0 ? HR_ZONES[intensity].label : "Paused";

  return (
    <div className={`rounded-2xl ${compact ? "p-2.5" : "p-3"} ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(236,72,153,0.10) 50%, rgba(168,85,247,0.12) 100%)",
        border: "1px solid rgba(249,115,22,0.35)",
      }}>
      <style>{KEYFRAMES}</style>
      <div className="flex items-center gap-3">
        <FlameRing kcal={kcal} intensity={intensity} size={compact ? 60 : 72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-black tracking-widest text-orange-300">ACTIVE BURN <span className="text-gray-500 font-bold">· EST.</span></span>
            <span className="text-[11px] font-bold text-gray-300 tabular-nums">{rate.toFixed(1)} kcal/min</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-black" style={{ color: HR_ZONES[intensity].color }}>{label}</span>
            {bpm && (
              <span className="flex items-center gap-1 text-sm font-black text-white tabular-nums">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" style={{ animation: "burnPulse 0.8s ease-in-out infinite" }} />
                {bpm}<span className="text-[10px] text-gray-400 font-bold">BPM</span>
                {zone && <span className="text-[10px] text-gray-500 font-bold">{zone.pct}%</span>}
              </span>
            )}
          </div>
          <IntensityBar active={intensity} />
          <HeartRateGraph age={age} height={compact ? 44 : 56} className="mt-2" />
          {(supported && status !== "live") || (weightIsDefault && !compact) ? (
            <div className="flex items-center justify-between gap-2 mt-1.5">
              {weightIsDefault && !compact
                ? <span className="text-[10px] text-gray-500 truncate">Based on {DEFAULT_WEIGHT_LBS} lb — add your weight in Body Measurements</span>
                : <span />}
              {supported && status !== "live" && (
                <button onClick={connectHeartRate} disabled={status === "connecting"}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#00e5ff] border border-[#00e5ff]/40 rounded-full px-2.5 py-1.5 disabled:opacity-60">
                  <Bluetooth className="w-3 h-3" />
                  {status === "connecting" ? "Connecting…" : status === "error" ? "Retry HR" : "Connect HR"}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One-line pill for tight HUDs (ARTP camera top bar). */
export function BurnChip({ kcal }) {
  const { bpm, status, supported } = useHeartRate();
  // No strap yet → tapping the chip opens the Bluetooth chooser (it needs a
  // tap anyway; Web Bluetooth only opens from a user gesture).
  const canConnect = supported && status !== "live";
  return (
    <button type="button" onClick={canConnect ? connectHeartRate : undefined}
      className="flex items-center gap-1 text-[9px] font-bold rounded-full px-1.5 py-0.5 tabular-nums"
      style={{ color: "#fdba74", border: "1px solid rgba(249,115,22,0.45)", background: "rgba(249,115,22,0.12)", minHeight: 22 }}
      aria-label={`${Math.round(kcal)} estimated active calories${bpm ? `, heart rate ${bpm}` : canConnect ? ". Tap to connect a heart-rate strap" : ""}`}>
      <Flame className="w-2.5 h-2.5" style={{ fill: "#f97316", color: "#f97316" }} />
      {Math.round(kcal)}
      {bpm
        ? (<><Heart className="w-2.5 h-2.5 ml-0.5 text-red-500 fill-red-500" />{bpm}</>)
        : canConnect && (<><Heart className="w-2.5 h-2.5 ml-0.5 text-red-400" />{status === "connecting" ? "…" : "+"}</>)}
    </button>
  );
}

/* ── live heart-rate graph ───────────────────────────────────────────────── */
function useTick(ms) {
  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => { const id = setInterval(tick, ms); return () => clearInterval(id); }, [ms]);
}

/**
 * Scrolling BPM line for the last `windowSec`, drawn over the five zone bands
 * (same colours as the intensity bar). Gaps over 5 s (strap dropped out) break
 * the line instead of drawing a straight bridge. Renders nothing until the
 * strap has sent at least one reading in the window.
 */
export function HeartRateGraph({ age, windowSec = 120, height = 56, slim = false, className = "" }) {
  const { bpm, history } = useHeartRate();
  useTick(1000);
  const now = Date.now();
  const from = now - windowSec * 1000;
  const pts = history.filter((p) => p.t >= from);
  if (!pts.length) return null;

  const max = hrMax(age || DEFAULT_AGE);
  const vals = pts.map((p) => p.bpm);
  const hi = Math.max(...vals), lo = Math.min(...vals);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  // Headroom on top for the BPM label, a little below the lowest reading.
  const span = hi - lo;
  let yMin = Math.max(30, Math.floor((lo - Math.max(6, span * 0.15)) / 5) * 5);
  let yMax = Math.ceil((hi + Math.max(16, span * 0.6)) / 5) * 5;
  if (yMax - yMin < 40) yMax = yMin + 40;

  const W = 300, H = 100;
  const x = (t) => ((t - from) / (windowSec * 1000)) * W;
  const y = (v) => H - ((v - yMin) / (yMax - yMin)) * H;

  // Zone bands, clipped to the visible bpm range.
  const bands = HR_ZONES.map((z, i) => {
    const b0 = (z.min / 100) * max;
    const b1 = i + 1 < HR_ZONES.length ? (HR_ZONES[i + 1].min / 100) * max : Infinity;
    const top = Math.min(b1, yMax), bot = Math.max(b0, yMin);
    return top > bot ? { color: z.color, yTop: y(top), h: y(bot) - y(top) } : null;
  }).filter(Boolean);

  // Runs of same-zone colour; a gap > 5 s (strap dropped out) breaks the line.
  const ageN = age || DEFAULT_AGE;
  const segs = [];
  pts.forEach((p, i) => {
    const xy = `${x(p.t).toFixed(1)},${y(p.bpm).toFixed(1)}`;
    const c = hrZone(p.bpm, ageN)?.color || "#ef4444";
    const gap = !i || p.t - pts[i - 1].t > 5000;
    const cur = segs[segs.length - 1];
    if (gap) segs.push({ c, pts: [xy] });
    else if (cur.c !== c) { cur.pts.push(xy); segs.push({ c, pts: [cur.pts[cur.pts.length - 2], xy] }); }
    else cur.pts.push(xy);
  });
  const last = pts[pts.length - 1];
  const zone = hrZone(last.bpm, age || DEFAULT_AGE);
  const color = zone?.color || "#ef4444";
  const stale = !bpm;

  return (
    <div className={`relative ${className}`} style={{ height }}
      role="img" aria-label={`Heart rate graph, last ${Math.round(windowSec / 60 * 10) / 10} minutes: now ${bpm || "no signal"}, average ${avg}, max ${hi}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        className="absolute inset-0 rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.35)" }} aria-hidden="true">
        {bands.map((b, i) => (
          <rect key={i} x="0" y={b.yTop} width={W} height={b.h} fill={b.color} opacity={slim ? 0.12 : 0.17} />
        ))}
        {segs.map((s, i) => (
          <polyline key={i} points={s.pts.join(" ")} fill="none" stroke={s.c} strokeWidth={slim ? 2.5 : 2.2}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            opacity={stale ? 0.45 : 1} />
        ))}
      </svg>
      {/* live dot at the newest reading (HTML so it stays round when stretched) */}
      {!stale && (
        <span className="absolute rounded-full" style={{
          width: 7, height: 7, background: color, boxShadow: `0 0 8px ${color}`,
          left: `calc(${(x(last.t) / W) * 100}% - 3.5px)`, top: `calc(${(y(last.bpm) / H) * 100}% - 3.5px)`,
        }} />
      )}
      <div className="absolute top-0.5 left-1.5 flex items-baseline gap-1 pointer-events-none">
        <Heart className="w-3 h-3 self-center text-red-500 fill-red-500"
          style={{ animation: stale ? "none" : "burnPulse 0.8s ease-in-out infinite" }} />
        <span className={`${slim ? "text-xs" : "text-sm"} font-black tabular-nums text-white`} style={{ textShadow: "0 1px 3px #000" }}>
          {stale ? "--" : bpm}
        </span>
        {!slim && (
          <span className="text-[9px] font-bold text-gray-300" style={{ textShadow: "0 1px 3px #000" }}>
            {stale ? "no signal" : `BPM${zone ? ` · ${zone.label}` : ""}`}
          </span>
        )}
      </div>
      {!slim && (
        <div className="absolute top-0.5 right-1.5 text-[9px] font-bold text-gray-300 tabular-nums pointer-events-none" style={{ textShadow: "0 1px 3px #000" }}>
          avg {avg} · max {hi}
        </div>
      )}
      {!slim && (
        <div className="absolute bottom-0.5 left-1.5 text-[8px] text-gray-500 pointer-events-none">
          {windowSec >= 60 ? `${Math.round(windowSec / 60)} min` : `${windowSec}s`}
        </div>
      )}
    </div>
  );
}

/** Slim graph for the ARTP camera top bar. Nothing until a strap reads. */
export function HeartRateMini({ className = "" }) {
  const { history } = useHeartRate();
  const { age } = useBodyStats();
  if (!history.length || Date.now() - history[history.length - 1].t > 60000) return null;
  return (
    <div className={className}>
      <style>{KEYFRAMES}</style>
      <HeartRateGraph age={age} windowSec={90} height={28} slim />
    </div>
  );
}

export default BurnMeter;
