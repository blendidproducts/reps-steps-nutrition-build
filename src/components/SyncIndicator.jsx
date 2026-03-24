/**
 * SyncIndicator — Subtle global background-sync status dot.
 * Shows a small pulsing indicator when any optimistic mutation is in-flight.
 * Rendered once in Layout.jsx.
 */
import React, { useState, useEffect } from "react";

let _syncCount = 0;
const _listeners = new Set();

// Share state with useOptimisticMutation via the same module pattern
// We re-export a subscribe function so both can stay in sync
export function _notifySyncListeners(count) {
  _syncCount = count;
  _listeners.forEach(fn => fn(count));
}

export default function SyncIndicator() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (count) => setActive(count > 0);
    _listeners.add(handler);
    return () => _listeners.delete(handler);
  }, []);

  if (!active) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Syncing data in background"
      className="fixed bottom-24 md:bottom-4 right-4 z-50 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1.5 rounded-full shadow-lg pointer-events-none"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      syncing…
    </div>
  );
}