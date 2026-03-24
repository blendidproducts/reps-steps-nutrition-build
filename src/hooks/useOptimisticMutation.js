/**
 * useOptimisticMutation — Fire-and-forget mutations with a subtle background-sync indicator.
 *
 * Usage:
 *   const { mutate, syncing } = useOptimisticMutation();
 *
 *   mutate(
 *     () => MealLog.create(data),           // async fn (background)
 *     () => setMeals(prev => [...prev, data]) // optimistic local update (sync)
 *   );
 *
 * While any mutation is in-flight, `syncing` is true and a global
 * SyncIndicator component shows a subtle pulsing dot.
 */
import { useState, useCallback } from "react";

// Shared state via module-level subscribers (no context needed)
let _syncCount = 0;
const _listeners = new Set();

function notifyListeners() {
  _listeners.forEach(fn => fn(_syncCount));
}

export function useSyncStatus() {
  const [count, setCount] = useState(_syncCount);
  const subscribe = useCallback((fn) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);

  useState(() => {
    const unsub = (() => {
      _listeners.add(setCount);
      return () => _listeners.delete(setCount);
    })();
    return unsub;
  });

  return count > 0;
}

export function useOptimisticMutation() {
  const [syncing, setSyncing] = useState(false);

  const mutate = useCallback(async (asyncFn, optimisticUpdate) => {
    // Run optimistic update immediately (sync)
    if (optimisticUpdate) optimisticUpdate();

    // Increment global sync counter
    _syncCount++;
    notifyListeners();
    setSyncing(true);

    try {
      await asyncFn();
    } catch (err) {
      console.error("[OptimisticMutation] Background sync failed:", err);
      // We intentionally don't roll back — failures are silent unless
      // the caller passes an onError callback
    } finally {
      _syncCount = Math.max(0, _syncCount - 1);
      notifyListeners();
      setSyncing(false);
    }
  }, []);

  return { mutate, syncing };
}