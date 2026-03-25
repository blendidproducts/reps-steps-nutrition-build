/**
 * useOptimisticMutation — Fire-and-forget mutations with a background-sync indicator.
 *
 * Performance contract (Android WebView):
 *   • The optimistic local update runs synchronously on the current frame so
 *     the UI responds instantly (≤16 ms, no jank).
 *   • The async network call is scheduled via MessageChannel (a macrotask that
 *     yields to the renderer) so the main thread is never blocked by I/O.
 *   • All mutations are wrapped in a global counter that drives SyncIndicator.
 *
 * Usage:
 *   const { mutate } = useOptimisticMutation();
 *   mutate(
 *     () => MealLog.create(data),            // async background fn (yielded)
 *     () => setMeals(prev => [...prev, data]) // optimistic local update (instant)
 *   );
 */
import { useState, useCallback, useEffect } from "react";

// ── Module-level sync counter (shared across all hook instances) ─────────────
let _count = 0;
const _subs = new Set();

export function _getSyncCount() { return _count; }

function _setCount(n) {
  _count = n;
  _subs.forEach(fn => fn(_count));
}

/** Subscribe to sync count changes. Returns unsubscribe fn. */
export function subscribeSyncStatus(fn) {
  _subs.add(fn);
  return () => _subs.delete(fn);
}

/** Returns true when any mutation is in-flight */
export function useSyncActive() {
  const [active, setActive] = useState(() => _count > 0);
  useEffect(() => subscribeSyncStatus(n => setActive(n > 0)), []);
  return active;
}

// ── Yield helper: schedule work after the renderer has had a chance to paint ──
function yieldToMain(fn) {
  // MessageChannel tasks are macrotasks — they let the browser render a frame
  // before running, which keeps the WebView responsive during bursts of mutations.
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = () => fn();
  port2.postMessage(null);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useOptimisticMutation() {
  const mutate = useCallback((asyncFn, optimisticUpdate) => {
    // 1. Apply optimistic update immediately (current synchronous frame)
    if (optimisticUpdate) optimisticUpdate();

    // 2. Increment sync counter right away so SyncIndicator appears instantly
    _setCount(_count + 1);

    // 3. Yield to the renderer, then run the network call off the critical path
    yieldToMain(async () => {
      try {
        await asyncFn();
      } catch (err) {
        console.error("[sync] Background mutation failed:", err);
      } finally {
        _setCount(Math.max(0, _count - 1));
      }
    });
  }, []);

  return { mutate };
}