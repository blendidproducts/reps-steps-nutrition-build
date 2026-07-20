/**
 * nativeShell.jsx — detect the mobile app wrapper (Round 17)
 *
 * App/Play stores reject direct web checkout links for digital goods, so the
 * pricing pages hide Stripe buttons inside the native/WebView shell and point
 * users to the website instead. Detection is deliberately conservative — a
 * normal mobile BROWSER must never be classified as a shell.
 */
import React from "react";

export function isNativeShell() {
  try {
    if (window.isNativeApp === true) return true;                    // custom flag any wrapper can set
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;                      // Capacitor 3+
    if (cap && cap.platform && cap.platform !== "web") return true;  // Capacitor 2
    const ua = navigator.userAgent || "";
    if (/Android/i.test(ua) && /\bwv\b/.test(ua)) return true;       // Android System WebView ("; wv)")
    if (/iPhone|iPad|iPod/i.test(ua) && !/Safari\//i.test(ua)) return true; // iOS WKWebView (Safari UA always contains "Safari/")
    return false;
  } catch (_) {
    return false;
  }
}

export function WebUpgradeNotice({ compact = false }) {
  return (
    <div className={`w-full bg-[#0a1628] border border-[#00a9ff]/40 rounded-2xl text-center ${compact ? "p-4" : "p-6"}`}>
      <div className="text-3xl mb-2">🌐</div>
      <p className="text-white font-bold mb-1">Upgrade on the web</p>
      <p className="text-gray-300 text-sm leading-relaxed">
        To upgrade, please visit{" "}
        <span className="text-[#00a9ff] font-semibold">repsandsteps.com</span>{" "}
        on your desktop or mobile browser. Your Pro / Add-On status will
        instantly sync here.
      </p>
    </div>
  );
}
