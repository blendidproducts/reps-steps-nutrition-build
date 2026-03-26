/**
 * NavigationManager
 *
 * Single provider that unifies:
 *   - Android hardware back-button interception (formerly useAndroidBackButton)
 *   - Tab-based navigation with independent per-tab history stacks (formerly useTabNavigator)
 *
 * Backward-compat re-exports keep every existing call-site working unchanged.
 * Mount <NavigationManager> once inside <Router>, replacing the two separate hooks.
 */
import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROOT_PATHS = new Set([
  "/", "/Home", "/Exercises", "/Nutrition", "/History", "/Settings",
  "/Community", "/Achievements", "/Progress",
]);

export const TAB_ROOTS = {
  Home:           "/Home",
  Exercises:      "/Exercises",
  PresetPrograms: "/PresetPrograms",
  Nutrition:      "/Nutrition",
  History:        "/History",
  Settings:       "/Settings",
};

const TAB_SUBTREES = {
  Home:           ["/Home", "/FitnessBrain", "/Achievements", "/Progress", "/BodyMeasurements", "/Community", "/Referrals", "/Pricing"],
  Exercises:      ["/Exercises", "/AIWorkoutGenerator", "/WorkoutBuilder", "/ActiveWorkout", "/WorkoutComplete", "/WorkoutDetail", "/SavedWorkouts", "/WatchMode", "/SmartWatchHub", "/Stretches", "/RandomWorkout", "/Programs"],
  PresetPrograms: ["/PresetPrograms", "/ProgramProgress"],
  Nutrition:      ["/Nutrition", "/NutritionGoals", "/NutritionHistory", "/NutritionPrograms", "/FoodDatabase", "/MealPlans", "/FoodPhotoAnalyzer", "/LinkMealBuilder", "/NutritionPricing"],
  History:        ["/History"],
  Settings:       ["/Settings", "/Upload3DModels", "/Help", "/Pricing", "/AddOns", "/Disclaimer", "/Privacy", "/Terms"],
};

const STORAGE_KEY = "rns_tab_stacks";

// ─────────────────────────────────────────────────────────────────────────────
// Tab-stack helpers (module-level, no React dependency)
// ─────────────────────────────────────────────────────────────────────────────

function getStacks() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveStack(tab, stack) {
  try {
    const all = getStacks();
    all[tab] = stack;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function resolveTabForPath(pathname) {
  const path = pathname.split("?")[0];
  if (path === "/") return "Home";
  for (const [tab, subtree] of Object.entries(TAB_SUBTREES)) {
    if (subtree.some(p => path === p || path.startsWith(p + "/"))) return tab;
  }
  let best = null, bestLen = 0;
  for (const [tab, root] of Object.entries(TAB_ROOTS)) {
    if ((path === root || path.startsWith(root + "/")) && root.length > bestLen) {
      best = tab; bestLen = root.length;
    }
  }
  return best;
}

export function getLastTabPath(tab) {
  const stacks = getStacks();
  const stack = stacks[tab];
  return stack?.length > 0 ? stack[stack.length - 1] : TAB_ROOTS[tab];
}

export function pushTabPath(tab, path) {
  const stacks = getStacks();
  const stack = stacks[tab] ? [...stacks[tab]] : [];
  if (stack[stack.length - 1] !== path) {
    stack.push(path);
    if (stack.length > 20) stack.shift();
    saveStack(tab, stack);
  }
}

export function popTabPath(tab) {
  const stacks = getStacks();
  const stack = stacks[tab] ? [...stacks[tab]] : [];
  if (stack.length > 1) {
    stack.pop();
    saveStack(tab, stack);
    return stack[stack.length - 1];
  }
  return TAB_ROOTS[tab];
}

export function resetTabStack(tab) {
  saveStack(tab, [TAB_ROOTS[tab]]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Back-button interceptor stack (global, LIFO)
// ─────────────────────────────────────────────────────────────────────────────

const _interceptors = [];
let _idCounter = 0;

export function pushBackInterceptor(handler) {
  const id = ++_idCounter;
  _interceptors.push({ id, handler });
  return () => {
    const idx = _interceptors.findIndex(e => e.id === id);
    if (idx !== -1) _interceptors.splice(idx, 1);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const NavigationContext = createContext(null);

export function useNavigationManager() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigationManager must be used inside <NavigationManagerProvider>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider — mount once inside <Router>
// ─────────────────────────────────────────────────────────────────────────────

export function NavigationManagerProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Android back button ──────────────────────────────────────────────────
  // We maintain a "sentinel" entry on top of the browser history stack so that
  // pressing the hardware back button triggers a popstate event we can intercept
  // instead of navigating away from the app entirely.
  //
  // Robustness concerns addressed here:
  //   1. Debounce: rapid double-fires (seen on some Android WebViews) are
  //      collapsed via a timestamp guard.
  //   2. Re-push on focus / visibilitychange: Android Chrome sometimes strips
  //      the sentinel when the app is backgrounded and resumed. We re-push it
  //      whenever the document regains focus or becomes visible again.
  //   3. Re-push on location change: existing behaviour, kept as-is.

  const lastBackRef = useRef(0);
  // Track whether we're currently processing a back navigation to prevent
  // re-entrant calls that can cause navigation loops in iOS WKWebView.
  const isHandlingBackRef = useRef(false);
  // Track the sentinel push ID so we can detect genuine user back-presses
  // vs. our own sentinel pops (iOS WKWebView sometimes fires popstate for
  // history entries we push ourselves).
  const sentinelCountRef = useRef(0);

  const pushSentinel = useCallback(() => {
    sentinelCountRef.current += 1;
    window.history.pushState({ __rns_sentinel: true, _sid: sentinelCountRef.current }, "");
  }, []);

  useEffect(() => {
    // Always (re-)push the sentinel whenever the location key changes so
    // navigating forward/backward in-app never leaves us without a sentinel.
    pushSentinel();

    const handlePopState = (e) => {
      // If this popstate was triggered by our own pushState sentinel, ignore it.
      // iOS WKWebView can fire popstate for programmatic pushState calls.
      if (e.state?.__rns_sentinel) {
        // This is a sentinel pop — the user pressed back past our sentinel.
        // Re-push and handle the intent.
      } else {
        // Non-sentinel pop (e.g. browser forward/back controls in desktop preview).
        // Re-push sentinel and let the browser handle it normally.
        pushSentinel();
        return;
      }

      // Debounce: ignore events fired within 350 ms of the previous one.
      // iOS WKWebView can double-fire on rapid swipe-back gestures.
      const now = Date.now();
      if (now - lastBackRef.current < 350) {
        pushSentinel();
        return;
      }
      lastBackRef.current = now;

      // Guard against re-entrant calls (navigation loop prevention).
      if (isHandlingBackRef.current) {
        pushSentinel();
        return;
      }
      isHandlingBackRef.current = true;

      try {
        if (_interceptors.length > 0) {
          _interceptors[_interceptors.length - 1].handler();
          pushSentinel();
          return;
        }
        const currentPath = location.pathname;
        if (ROOT_PATHS.has(currentPath) || currentPath === "/") {
          // At a root page — keep app open, just re-push sentinel.
          pushSentinel();
          return;
        }
        // Navigate back within the SPA, then re-push sentinel after a tick
        // so it lands on top of the new history entry.
        navigate(-1);
        setTimeout(pushSentinel, 0);
      } finally {
        // Release the re-entrancy guard after a short delay to allow
        // the navigation and any synchronous React re-renders to settle.
        setTimeout(() => { isHandlingBackRef.current = false; }, 400);
      }
    };

    // Re-push sentinel when the WebView regains foreground (Android/iOS resume).
    const handleVisibility = () => {
      if (!document.hidden) pushSentinel();
    };

    // Re-push sentinel when the window regains focus (covers edge cases where
    // visibilitychange does not fire on older WebViews).
    const handleFocus = () => { pushSentinel(); };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.key, pushSentinel]);

  // ── Track current path into its tab stack ────────────────────────────────
  useEffect(() => {
    const tab = resolveTabForPath(location.pathname);
    if (tab) pushTabPath(tab, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // ── Tab navigation helpers ───────────────────────────────────────────────
  const navigateToTab = useCallback((tab) => {
    const currentTab = resolveTabForPath(location.pathname);
    if (currentTab === tab) return; // already here — BottomNav scrolls to top
    navigate(getLastTabPath(tab));
  }, [navigate, location.pathname]);

  const navigateInTab = useCallback((path, options = {}) => {
    const tab = resolveTabForPath(location.pathname) || "Home";
    pushTabPath(tab, path);
    navigate(path, options);
  }, [navigate, location.pathname]);

  const activeTab = resolveTabForPath(location.pathname) || (location.pathname === "/" ? "Home" : null);

  const value = { navigateToTab, navigateInTab, activeTab, pushBackInterceptor };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compat hooks — existing imports keep working unchanged
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use useNavigationManager() instead */
export function useTabNavigator() {
  const { navigateToTab, navigateInTab } = useNavigationManager();
  return { navigateToTab, navigateInTab };
}

/** @deprecated Handled automatically by NavigationManagerProvider */
export function useAndroidBackButton() {
  // No-op: the provider mounts the listener once; calling this hook again
  // would duplicate the popstate handler. Safe to leave as a no-op.
}