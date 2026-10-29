/**
 * AutoTrack.jsx (2026-10-29)
 *
 * JT: "I want a button 'Auto Track' ... enable the camera as soon as the
 * exercises come up as well as when the exercises start."
 *
 *   getAutoTrack / setAutoTrack   the remembered on/off (one setting for AiRTP
 *                                 and program workouts)
 *   <AutoTrackCamera>             live camera on the "get ready" card. Once the
 *                                 whole body has been in frame and steady for
 *                                 1.5 s it calls onReady() — the countdown
 *                                 starts without a tap. The camera and pose
 *                                 model it opens are the shared ones, so the
 *                                 rep tracker that follows starts instantly.
 *   <ClipTray>                    recordings whose set already ended, with
 *                                 Save buttons (see trackingSession.js).
 */
import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Video, Download, X } from "lucide-react";
import {
  acquireCamera, getSharedLandmarker, nextVideoTs, preferredFacing, rememberFacing,
  subscribeClips, getPendingClips, removePendingClip, saveClipFile,
} from "./trackingSession";

const KEY = "rns_auto_track";
export function getAutoTrack() {
  try { return localStorage.getItem(KEY) === "1"; } catch (_) { return false; }
}
export function setAutoTrack(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (_) {}
}

// Shoulders and hips must be seen, plus a knee or an ankle, all inside the frame.
const CORE = [11, 12, 23, 24];
const LOWER = [25, 26, 27, 28];
function bodyInFrame(lm) {
  if (!lm) return false;
  const ok = (i) => {
    const p = lm[i];
    return p && (p.visibility ?? 1) > 0.5 && p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
  };
  return CORE.every(ok) && LOWER.some(ok);
}

export function AutoTrackCamera({ onReady, armed = true, holdMs = 1500 }) {
  const videoRef = useRef(null);
  const [facing, setFacing] = useState(() => preferredFacing("user"));
  const [status, setStatus] = useState("starting"); // starting | searching | holding | ready | error
  const [error, setError] = useState(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const armedRef = useRef(armed);
  useEffect(() => { armedRef.current = armed; }, [armed]);

  useEffect(() => {
    let stop = false;
    let timer = null;
    let since = 0;
    let fired = false;
    (async () => {
      try {
        setStatus("starting");
        setError(null);
        const stream = await acquireCamera(facing);
        if (stop) return;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await new Promise((res) => { if (v.readyState >= 1) res(); else v.onloadedmetadata = res; });
          try { await v.play(); } catch (_) {}
        }
        setStatus("searching");
        const lm = await getSharedLandmarker();
        if (stop) return;
        // ~8 checks a second is plenty to tell "in position" and keeps the
        // phone cool before the real tracking starts.
        const tick = () => {
          if (stop) return;
          const vid = videoRef.current;
          if (vid && vid.readyState >= 2 && !fired) {
            let seen = false;
            try { seen = bodyInFrame(lm.detectForVideo(vid, nextVideoTs())?.landmarks?.[0]); } catch (_) {}
            const now = performance.now();
            if (seen && armedRef.current) {
              if (!since) since = now;
              if (now - since >= holdMs) {
                fired = true;
                setStatus("ready");
                onReadyRef.current?.();
                return;
              }
              setStatus("holding");
            } else {
              since = 0;
              setStatus("searching");
            }
          }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (e) {
        if (stop) return;
        setStatus("error");
        setError(e?.name === "NotAllowedError"
          ? "Camera permission is off. iPhone: Settings → Safari → Camera → Allow."
          : "Camera unavailable — tap START NOW to go without Auto Track.");
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      // Detach only. The stream is shared and the rep tracker picks it up next.
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facing, holdMs]);

  const flip = () => {
    const next = facing === "user" ? "environment" : "user";
    rememberFacing(next);
    setFacing(next);
  };

  const label = {
    starting: "Opening camera…",
    searching: "Step back until your whole body is in the frame",
    holding: "Hold still — starting…",
    ready: "In position!",
    error: error,
  }[status];
  const ring = status === "holding" || status === "ready" ? "border-green-400" : status === "error" ? "border-red-500/60" : "border-[#00a9ff]/60";

  return (
    <div className={`relative w-full max-w-xs rounded-2xl overflow-hidden border-2 ${ring} bg-black z-10`} style={{ aspectRatio: "3 / 4", maxHeight: "42vh" }}>
      {/* contain, not cover: what you see is exactly what the model sees */}
      <video ref={videoRef} muted playsInline autoPlay
        className="absolute inset-0 w-full h-full object-contain"
        style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }} />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 rounded-full px-2.5 py-1">
        <span className={`w-2 h-2 rounded-full ${status === "error" ? "bg-red-500" : "bg-green-400 animate-pulse"}`} />
        <span className="text-[10px] font-black text-white tracking-wider">AUTO TRACK</span>
      </div>
      <button onClick={flip} aria-label={`Switch to ${facing === "user" ? "rear" : "front"} camera`}
        className="absolute top-2 right-2 bg-black/70 rounded-full px-2.5 py-1 flex items-center gap-1 text-white text-[10px] font-bold"
        style={{ minHeight: 32 }}>
        <RefreshCw className="w-3 h-3" /> {facing === "user" ? "FRONT" : "REAR"}
      </button>
      <div className="absolute bottom-0 inset-x-0 bg-black/75 px-3 py-2">
        <p className={`text-xs font-bold text-center ${status === "holding" || status === "ready" ? "text-green-300" : status === "error" ? "text-red-300" : "text-white"}`}>{label}</p>
      </div>
    </div>
  );
}

/** Recordings from sets that already ended. Renders nothing when empty. */
export function ClipTray({ className = "" }) {
  const [clips, setClips] = useState(() => getPendingClips());
  useEffect(() => subscribeClips(setClips), []);
  if (!clips.length) return null;
  return (
    <div className={`w-full max-w-xs rounded-2xl border border-red-500/40 bg-[#111]/95 p-3 z-10 ${className}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Video className="w-4 h-4 text-red-400" />
        <p className="text-white text-xs font-bold">{clips.length} recording{clips.length > 1 ? "s" : ""} ready</p>
      </div>
      <div className="space-y-1.5">
        {clips.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 truncate text-[11px] text-gray-300">{c.name.replace(/^repsandsteps-/, "")}</span>
            <button onClick={async () => { const r = await saveClipFile(c); if (r !== "cancelled") removePendingClip(c.id); }}
              className="px-2.5 rounded-lg bg-red-600 text-white text-[11px] font-black flex items-center gap-1" style={{ minHeight: 32 }}>
              <Download className="w-3 h-3" /> Save
            </button>
            <button onClick={() => removePendingClip(c.id)} aria-label="Discard recording"
              className="w-8 rounded-lg border border-gray-700 text-gray-400 flex items-center justify-center" style={{ minHeight: 32 }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
