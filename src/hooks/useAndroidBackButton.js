/**
 * useAndroidBackButton
 *
 * Intercepts the Android hardware back button (popstate) and maps it to
 * React Router's navigate(-1), with these additional safeguards:
 *
 * 1. ROOT GUARD — if the current path is a root tab or "/", pressing back
 *    does NOT navigate (it lets the OS minimise the app naturally).
 * 2. MODAL GUARD — any component can register an open modal via the
 *    exported `pushBackInterceptor` / `popBackInterceptor` helpers.
 *    Back will call the modal's close handler instead of navigating.
 * 3. SENTINEL — a dummy history entry is kept at all times so the OS
 *    always fires popstate before it would close / minimise the app.
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ── Root paths where back should NOT navigate (let OS minimise app) ──────────
const ROOT_PATHS = new Set([
  "/", "/Home", "/Exercises", "/Nutrition", "/History", "/Settings",
  "/Community", "/Achievements", "/Progress",
]);

// ── Global interceptor stack (LIFO) ─────────────────────────────────────────
// Each entry: { id: string, handler: () => void }
const _interceptors = [];

let _idCounter = 0;

/**
 * Push a back-press interceptor (e.g. to close a modal).
 * Returns a cleanup function that removes the interceptor.
 */
export function pushBackInterceptor(handler) {
  const id = ++_idCounter;
  _interceptors.push({ id, handler });
  return () => {
    const idx = _interceptors.findIndex(e => e.id === id);
    if (idx !== -1) _interceptors.splice(idx, 1);
  };
}

// ── Hook (mounted once in App.jsx inside <Router>) ───────────────────────────
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Always keep a sentinel so the OS fires popstate first
    window.history.pushState({ __rns_sentinel: true }, "");

    const handlePopState = () => {
      // 1. Let top interceptor (modal) handle back first
      if (_interceptors.length > 0) {
        const top = _interceptors[_interceptors.length - 1];
        top.handler();
        // Re-push sentinel so next back is still caught
        window.history.pushState({ __rns_sentinel: true }, "");
        return;
      }

      // 2. Root guard — don't navigate away from root tabs
      const currentPath = location.pathname;
      if (ROOT_PATHS.has(currentPath)) {
        // Re-push sentinel; the OS will minimise on a real second press
        window.history.pushState({ __rns_sentinel: true }, "");
        return;
      }

      // 3. Normal in-app back navigation
      navigate(-1);
      window.history.pushState({ __rns_sentinel: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.key]);
}