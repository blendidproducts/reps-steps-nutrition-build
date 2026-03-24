/**
 * useOptimisticMutation — Fire-and-forget mutations with a subtle background-sync indicator.
 *
 * Usage:
 *   const { mutate } = useOptimisticMutation();
 *   mutate(
 *     () => MealLog.create(data),            // async background fn
 *     () => setMeals(prev => [...prev, data]) // optimistic local update (runs immediately)
 *   );
 */
import { useState, useCallback, useEffect } from "react";

// Module-level sync counter shared across all hook instances and SyncIndicator
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

export function useOptimisticMutation() {
  const mutate = useCallback(async (asyncFn, optimisticUpdate) => {
    if (optimisticUpdate) optimisticUpdate();

    _setCount(_count + 1);
    try {
      await asyncFn();
    } catch (err) {
      console.error("[sync] Background mutation failed:", err);
    } finally {
      _setCount(Math.max(0, _count - 1));
    }
  }, []);

  return { mutate };
}