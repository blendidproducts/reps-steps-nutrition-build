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
  // Re-entrancy guard: prevents a second popstate from firing while we're
  // already handling one (can happen in iOS WKWebView on fast swipe-back).
  const isHandlingBackRef = useRef(false);

  useEffect(() => {
    // ── Strategy: no sentinel manipulation ──────────────────────────────────
    // Instead of pushing dummy history entries, we listen for popstate and
    // call navigate(-1) for in-app back navigation, or simply re-push one
    // entry only when the user is already at a root so the app cannot close.
    //
    // One single dummy entry is pushed only at mount (and on resume) so
    // pressing back at a root page fires a popstate we can swallow rather
    // than letting the WebView close the app. This is the minimum viable
    // sentinel approach — one entry, re-pushed only when needed.

    // Push one guard entry at mount so root-page back-press is interceptable.
    window.history.pushState({ __rns_guard: true }, "");

    const handlePopState = () => {
      const now = Date.now();
      // Debounce rapid double-fires (iOS WKWebView, some Android WebViews).
      if (now - lastBackRef.current < 350) return;
      lastBackRef.current = now;

      // Re-entrancy guard.
      if (isHandlingBackRef.current) return;
      isHandlingBackRef.current = true;

      const currentPath = location.pathname;

      try {
        // 1. Custom interceptors (modals, wizards, etc.) take highest priority.
        if (_interceptors.length > 0) {
          _interceptors[_interceptors.length - 1].handler();
          // Re-push guard so the next back press is also interceptable.
          window.history.pushState({ __rns_guard: true }, "");
          return;
        }

        // 2. At a root/home page: swallow the back press to keep app open.
        if (ROOT_PATHS.has(currentPath) || currentPath === "/") {
          window.history.pushState({ __rns_guard: true }, "");
          return;
        }

        // 3. Inside a sub-page: use React Router to go back.
        // Re-push the guard after a tick so it sits on top of wherever
        // React Router lands us.
        navigate(-1);
        setTimeout(() => {
          window.history.pushState({ __rns_guard: true }, "");
        }, 50);
      } finally {
        setTimeout(() => { isHandlingBackRef.current = false; }, 400);
      }
    };

    // Re-push the guard when the WebView is resumed (Android/iOS background→foreground).
    // The OS sometimes discards our extra history entry while backgrounded.
    const handleVisibility = () => {
      if (!document.hidden) window.history.pushState({ __rns_guard: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.key]);

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