/**
 * useTabNavigator — Tab-based navigation with independent history stacks.
 *
 * Each tab remembers its last visited path so navigating between tabs
 * always returns you to where you left off within that tab's sub-tree.
 * History stacks per tab are stored in sessionStorage so they survive
 * soft refreshes but clear on session end.
 */
import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "rns_tab_stacks";

// Map each bottom-nav tab to the root path it owns.
// Sub-pages reachable FROM a tab are considered part of its stack.
// Paths must match createPageUrl() output exactly: '/' + PageName
export const TAB_ROOTS = {
  Home:          "/Home",
  Exercises:     "/Exercises",
  PresetPrograms:"/PresetPrograms",
  Nutrition:     "/Nutrition",
  History:       "/History",
  Settings:      "/Settings",
};

// Sub-paths that belong to a specific tab (pages launched FROM that tab)
const TAB_SUBTREES = {
  Home:           ["/Home", "/FitnessBrain", "/Achievements", "/Progress", "/BodyMeasurements", "/Community", "/Referrals"],
  Exercises:      ["/Exercises", "/AIWorkoutGenerator", "/WorkoutBuilder", "/ActiveWorkout", "/WorkoutComplete", "/WorkoutDetail", "/SavedWorkouts", "/WatchMode", "/SmartWatchHub", "/Stretches", "/RandomWorkout", "/Programs"],
  PresetPrograms: ["/PresetPrograms", "/ProgramProgress"],
  Nutrition:      ["/Nutrition", "/NutritionGoals", "/NutritionHistory", "/NutritionPrograms", "/FoodDatabase", "/MealPlans", "/FoodPhotoAnalyzer", "/LinkMealBuilder", "/NutritionPricing"],
  History:        ["/History"],
  Settings:       ["/Settings", "/Upload3DModels", "/Help", "/Pricing", "/AddOns", "/Disclaimer", "/Privacy", "/Terms"],
};

// Which root does a given pathname belong to?
export function resolveTabForPath(pathname) {
  const roots = Object.entries(TAB_ROOTS);
  // Longest-prefix match wins
  let best = null;
  let bestLen = 0;
  for (const [tab, root] of roots) {
    if ((pathname === root || pathname.startsWith(root + "?") || pathname.startsWith(root + "/")) && root.length > bestLen) {
      best = tab;
      bestLen = root.length;
    }
  }
  // Also match the bare "/" as Home
  if (!best && pathname === "/") best = "Home";
  return best;
}

function getStacks() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStack(tab, stack) {
  try {
    const all = getStacks();
    all[tab] = stack;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function getLastTabPath(tab) {
  const stacks = getStacks();
  const stack = stacks[tab];
  return stack && stack.length > 0 ? stack[stack.length - 1] : TAB_ROOTS[tab];
}

export function pushTabPath(tab, path) {
  const stacks = getStacks();
  const stack = stacks[tab] ? [...stacks[tab]] : [];
  // Avoid duplicate consecutive entries
  if (stack[stack.length - 1] !== path) {
    stack.push(path);
    // Keep stack bounded to 20 entries
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

export function useTabNavigator() {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate to a tab — restores last position within that tab
  const navigateToTab = useCallback((tab) => {
    const currentTab = resolveTabForPath(location.pathname);
    if (currentTab === tab) {
      // Already on this tab — scroll to top (handled by bottom nav button)
      return;
    }
    const dest = getLastTabPath(tab);
    navigate(dest);
  }, [navigate, location.pathname]);

  // Navigate within the current tab stack (pushes to tab history)
  const navigateInTab = useCallback((path, options = {}) => {
    const tab = resolveTabForPath(location.pathname) || "Home";
    pushTabPath(tab, path);
    navigate(path, options);
  }, [navigate, location.pathname]);

  return { navigateToTab, navigateInTab };
}