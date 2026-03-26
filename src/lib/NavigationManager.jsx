/**
 * NavigationManager
 *
 * Single provider that unifies:
 *   - Android hardware back-button interception
 *   - Tab-based navigation with independent per-tab history stacks
 *
 * Back-button strategy (v3 — sentinel-free where possible):
 *   React Router v6 exposes `navigate` and `location`. We track our own
 *   in-app history depth via a module-level counter that increments on every
 *   push and decrements on every pop. When the counter reaches 0 the user is
 *   at the "root" of the SPA and we push ONE guard entry so the next hardware
 *   back press fires a popstate we can swallow (preventing the WebView from
 *   closing the app). At all other depths we let React Router handle back
 *   navigation normally via `navigate(-1)`, keeping the browser history stack
 *   clean and predictable.
 *
 * Backward-compat re-exports keep every existing call-site unchanged.
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
// In-app navigation depth tracker (module-level, survives re-renders)
// ─────────────────────────────────────────────────────────────────────────────
// We count how many SPA pushes have happened since mount. When depth === 0 we
// are at the entry page and need the guard entry to prevent app close. Every
// navigate(-1) decrements the counter; every forward navigation increments it.
// This means we never push more than ONE guard entry — the browser history
// stays clean except for that single defensive entry at depth-0.

let _navDepth = 0;
const _GUARD_STATE = "__rns_guard";

function pushGuard() {
  window.history.pushState({ [_GUARD_STATE]: true }, "");
}

function isAtRoot(pathname) {
  return ROOT_PATHS.has(pathname) || pathname === "/";
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
  const navigate   = useNavigate();
  const location   = useLocation();

  const lastBackRef      = useRef(0);
  const isHandlingRef    = useRef(false);
  // Track the pathname we saw on the previous render so we can detect
  // whether a location change was a push (+1) or pop (-1).
  const prevPathnameRef  = useRef(location.pathname);
  // Remember the history.length at mount to calibrate depth.
  const baseHistoryLen   = useRef(window.history.length);

  // ── Back button handling ─────────────────────────────────────────────────
  useEffect(() => {
    // Push one guard at mount so the very first back-press on a root page
    // fires a popstate we can intercept instead of closing the WebView.
    pushGuard();

    const handlePopState = (e) => {
      const now = Date.now();
      // 350 ms debounce — collapses double-fires on Android WebViews.
      if (now - lastBackRef.current < 350) return;
      lastBackRef.current = now;

      // Re-entrancy guard.
      if (isHandlingRef.current) return;
      isHandlingRef.current = true;

      const currentPath = location.pathname;

      try {
        // 1. Modal / wizard interceptors take highest priority.
        if (_interceptors.length > 0) {
          _interceptors[_interceptors.length - 1].handler();
          pushGuard(); // keep a guard on top for the next press
          return;
        }

        // 2. At a root page: swallow the back press — keep the app alive.
        if (isAtRoot(currentPath)) {
          pushGuard();
          return;
        }

        // 3. Sub-page: let React Router navigate back.
        // Decrement depth so we know where we are after the transition.
        _navDepth = Math.max(0, _navDepth - 1);
        navigate(-1);

        // After the navigation settles, re-push the guard only if we
        // landed back at depth-0 (i.e. a root page). At depth > 0 the
        // browser's own forward entry already acts as a guard, so we
        // avoid cluttering history with extra pushes.
        setTimeout(() => {
          if (_navDepth === 0 || isAtRoot(window.location.pathname)) {
            pushGuard();
          }
        }, 80);
      } finally {
        setTimeout(() => { isHandlingRef.current = false; }, 400);
      }
    };

    // Re-push guard on WebView resume — Android/iOS can discard extra
    // history entries when the app is backgrounded.
    const handleVisibility = () => {
      if (!document.hidden) pushGuard();
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // Re-run when location.key changes so `location.pathname` closure is fresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.key]);

  // ── Depth tracker — runs after every location change ────────────────────
  useEffect(() => {
    const prev = prevPathnameRef.current;
    const curr = location.pathname;

    if (prev !== curr) {
      // Heuristic: if history.length grew the user pushed; if it stayed the
      // same or shrank they navigated back or replaced. This is the most
      // reliable signal available without patching history.pushState globally.
      const histLen = window.history.length;
      const grew = histLen > (baseHistoryLen.current + _navDepth);

      if (grew) {
        _navDepth += 1;
        baseHistoryLen.current = histLen;
      }
      // (Back navigation decrements in handlePopState before navigate(-1))

      prevPathnameRef.current = curr;
    }
  }, [location.pathname]);

  // ── Track current path into its tab stack ────────────────────────────────
  useEffect(() => {
    const tab = resolveTabForPath(location.pathname);
    if (tab) pushTabPath(tab, location.pathname + location.search);
  }, [location.pathname, location.search]);

  // ── Tab navigation helpers ───────────────────────────────────────────────
  const navigateToTab = useCallback((tab) => {
    const currentTab = resolveTabForPath(location.pathname);
    if (currentTab === tab) return;
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
export function useAndroidBackButton() {}