/**
 * useAndroidBackButton
 *
 * Intercepts the Android hardware back button (popstate event fired when the
 * WebView's history stack is popped) and maps it to React Router's navigate(-1).
 *
 * Strategy:
 * - We push a dummy history entry on mount so there is always something for the
 *   OS back button to pop before we consume it ourselves.
 * - On each popstate (back press) we call navigate(-1) via React Router so the
 *   in-app navigation stack is respected, then push another dummy entry to keep
 *   the sentinel in place.
 * - On unmount we clean up the listener.
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Push a sentinel so Android always has something to pop
    window.history.pushState({ __rns_sentinel: true }, "");

    const handlePopState = (event) => {
      // If the popped state is our sentinel (or anything else), treat it as
      // a back-navigation request and handle it in React Router.
      navigate(-1);

      // Re-push the sentinel so the next back press is also intercepted
      window.history.pushState({ __rns_sentinel: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, location.key]); // re-run on route changes to keep sentinel fresh
}