/**
 * SyncIndicator — Subtle pulsing dot shown while any optimistic mutation is in-flight.
 * Place once in Layout.jsx.
 */
import React from "react";
import { useSyncActive } from "@/hooks/useOptimisticMutation";

export default function SyncIndicator() {
  const active = useSyncActive();
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Syncing data in background"
      className="fixed bottom-24 md:bottom-5 right-4 z-50 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1.5 rounded-full shadow-lg pointer-events-none select-none"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#00a9ff] animate-pulse" />
      syncing…
    </div>
  );
}