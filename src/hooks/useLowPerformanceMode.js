/**
 * useLowPerformanceMode
 *
 * Reads/writes the 'lowPerformanceMode' flag from appSettings in localStorage.
 * Consumers use `isLowPerf` to conditionally reduce 3D quality, disable
 * Framer Motion animations, etc.
 *
 * The flag is also written to window.__RNS_LOW_PERF so Three.js scenes
 * can read it synchronously before React hydrates.
 */
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "appSettings";
const FLAG = "lowPerformanceMode";

function readFlag() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return !!JSON.parse(raw)[FLAG];
  } catch {
    return false;
  }
}

function writeFlag(value) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[FLAG] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    // Make it available synchronously to Three.js / non-React code
    window.__RNS_LOW_PERF = value;
  } catch {
    // ignore
  }
}

// Initialise global flag on module load (before any hook is called)
window.__RNS_LOW_PERF = readFlag();

// Module-level subscriptions so all hook instances stay in sync
const _subs = new Set();
let _current = readFlag();

function _broadcast(value) {
  _current = value;
  window.__RNS_LOW_PERF = value;
  _subs.forEach(fn => fn(value));
}

export function useLowPerformanceMode() {
  const [isLowPerf, setIsLowPerf] = useState(_current);

  useEffect(() => {
    _subs.add(setIsLowPerf);
    return () => _subs.delete(setIsLowPerf);
  }, []);

  const toggle = useCallback((value) => {
    const next = typeof value === "boolean" ? value : !_current;
    writeFlag(next);
    _broadcast(next);
  }, []);

  return { isLowPerf, toggle };
}