/**
 * BuildStamp.jsx — which build am I looking at?
 *
 * Added 2026-10-06, after two separate test sessions were spent chasing bugs
 * that had already been fixed and pushed but never published. There was no way
 * to tell a stale build from a current one by looking at it, so "it's still
 * broken" and "you're on Monday's code" were indistinguishable.
 *
 * `BUILD.stamp` is written by push-reps-updates.ps1 on every deploy and carries
 * the same timestamp as that deploy's commit message, so whatever shows here can
 * be found verbatim in git log. If the app shows an older stamp than the last
 * deploy printed, the build on screen is stale — Base44 hasn't published.
 *
 * Deliberately quiet: small, muted, bottom of the screen. It only needs to be
 * readable when someone goes looking for it.
 */
import React, { useState } from "react";
// Static import, not require() — this is an ESM/Vite build and require is not
// defined in the browser. buildInfo.js is committed with a placeholder so the
// build can never fail on a missing module; the deploy script overwrites it.
import { BUILD } from "@/buildInfo";

/** Age of the build in whole days, or null if we can't tell. */
function ageDays(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export default function BuildStamp({ className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const days = ageDays(BUILD.iso);

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className={`w-full text-center text-[10px] text-gray-600 py-2 active:text-gray-400 ${className}`}
      aria-label="Build version"
    >
      Build {BUILD.stamp}
      {days !== null && days > 0 && ` · ${days}d old`}
      {expanded && (
        <span className="block text-[9px] text-gray-700 mt-1 px-6 leading-snug">
          This is the build Base44 is serving. If it's older than the deploy you
          just ran, the publish hasn't gone through yet.
        </span>
      )}
    </button>
  );
}
