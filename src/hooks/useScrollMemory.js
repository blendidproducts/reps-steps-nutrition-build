/**
 * useScrollMemory — Robust scroll position preservation using sessionStorage.
 *
 * Saves each route's scroll position to sessionStorage on scroll,
 * and restores it when navigating back to that route.
 * SessionStorage persists across tab switches but clears on session end.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "rns_scroll_positions";

function getPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePosition(path, y) {
  try {
    const positions = getPositions();
    positions[path] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {}
}

export function useScrollMemory(scrollContainerId = "main-content") {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    // Restore saved position for this route
    const saved = getPositions()[location.pathname] ?? 0;
    container.scrollTop = saved;

    // Track scroll for the current route
    const handleScroll = () => {
      savePosition(location.pathname, container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    lastPathRef.current = location.pathname;

    return () => container.removeEventListener("scroll", handleScroll);
  }, [location.pathname, scrollContainerId]);
}