/**
 * useAxeDev — runs axe-core accessibility checks in development builds only.
 *
 * Violations are printed to the browser console with element references so
 * developers can locate and fix contrast / ARIA issues immediately.
 *
 * axe-core is dynamically imported so it is NEVER included in production bundles.
 * The check runs 1.5 s after each route change to let the DOM settle.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useAxeDev() {
  const location = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    // Only in dev — Vite exposes import.meta.env.DEV
    if (!import.meta.env.DEV) return;

    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const axe = (await import("axe-core")).default;
        const results = await axe.run(document.body, {
          runOnly: {
            type: "tag",
            // Focus on contrast and ARIA rules that affect dynamic content
            values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
          },
          rules: {
            // Ensure color-contrast is always checked even for dynamic elements
            "color-contrast": { enabled: true },
            "color-contrast-enhanced": { enabled: true },
          },
        });

        if (results.violations.length === 0) {
          console.info(
            `%c✅ axe: 0 accessibility violations on ${location.pathname}`,
            "color: #22c55e; font-weight: bold;"
          );
          return;
        }

        console.groupCollapsed(
          `%c⚠️ axe: ${results.violations.length} violation(s) on ${location.pathname}`,
          "color: #f97316; font-weight: bold;"
        );
        results.violations.forEach((v) => {
          console.groupCollapsed(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
          console.info("Help:", v.helpUrl);
          v.nodes.forEach((node) => {
            console.warn("Element:", node.target.join(", "));
            console.info("Fix:", node.failureSummary);
          });
          console.groupEnd();
        });
        console.groupEnd();
      } catch (err) {
        // axe-core not installed — silently skip
        if (err.message?.includes("Cannot find module") || err.message?.includes("Failed to fetch")) return;
        console.warn("[axe-dev] Unexpected error:", err);
      }
    }, 1500);

    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);
}