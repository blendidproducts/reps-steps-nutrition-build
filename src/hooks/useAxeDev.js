/**
 * useAxeDev — automated accessibility (a11y) checker for development builds.
 *
 * Runs axe-core against the live DOM on every React render cycle and prints
 * any violations to the browser console as collapsible error groups, making
 * contrast failures and ARIA issues visible immediately during development.
 *
 * - Only activates in development mode (import.meta.env.DEV).
 * - Lazily loads axe-core so it is never included in production bundles.
 * - Debounced: waits 1 second after the last render before running, avoiding
 *   noise during rapid state transitions.
 * - Reports violations with element selector, impact level, and a help URL.
 */

import { useEffect, useRef } from "react";

let _axe = null;
let _loadPromise = null;

async function loadAxe() {
  if (_axe) return _axe;
  if (_loadPromise) return _loadPromise;
  // Dynamic import with a string expression prevents Rollup/Vite from
  // treating "axe-core" as a required static dependency at build time.
  // If the package is absent the catch returns null and the hook is a no-op.
  const id = "axe-core";
  _loadPromise = import(/* @vite-ignore */ id).then((mod) => {
    _axe = mod.default ?? mod;
    return _axe;
  }).catch(() => null);
  return _loadPromise;
}

export function useAxeDev() {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const axe = await loadAxe();
      if (!axe) return;

      try {
        const results = await axe.run(document.body, {
          runOnly: {
            type: "tag",
            // Focus on colour-contrast and the most impactful WCAG 2.1 AA rules.
            values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
          },
        });

        if (results.violations.length === 0) return;

        console.group(
          `%c⚠ axe-core: ${results.violations.length} accessibility violation(s)`,
          "color: #f87171; font-weight: bold;"
        );

        results.violations.forEach((v) => {
          console.groupCollapsed(
            `%c[${v.impact?.toUpperCase() ?? "?"}] ${v.id} — ${v.description}`,
            `color: ${v.impact === "critical" || v.impact === "serious" ? "#f87171" : "#fbbf24"}; font-weight: bold;`
          );
          console.info("Help:", v.helpUrl);
          v.nodes.forEach((node) => {
            console.warn("Element:", node.target.join(", "));
            if (node.failureSummary) console.warn(node.failureSummary);
          });
          console.groupEnd();
        });

        console.groupEnd();
      } catch {
        // Silently ignore axe runtime errors
      }
    }, 1000);

    return () => clearTimeout(timerRef.current);
  });
}