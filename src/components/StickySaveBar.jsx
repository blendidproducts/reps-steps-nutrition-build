/**
 * StickySaveBar — a big save button pinned just above the bottom tab bar.
 * (2026-11-13, JT: "the save button on nutrition / body weight is hard to see
 * at the bottom of the screen, hard to hit save.")
 *
 * Same pattern as the ARTP START bar (Round 28): position: fixed, portaled to
 * document.body so Layout's page-transition transform can't trap it, sitting
 * at calc(var(--nav-h) + safe-area). NOT sticky — sticky is bounded by
 * min-h-screen parents and iOS 100vh, which pushed buttons below the fold.
 *
 * Renders a spacer in place so the end of the page can still scroll clear of
 * the bar. Pass `form="<form id>"` to submit a form from outside it.
 */
import React from "react";
import { createPortal } from "react-dom";

export default function StickySaveBar({ children, onClick, disabled, form, type = "button", icon = null }) {
  const bar = (
    <div
      style={{
        position: "fixed", left: 0, right: 0, zIndex: 60,
        bottom: "calc(var(--nav-h, 68px) + env(safe-area-inset-bottom, 0px))",
      }}
      className="px-4 pt-3 pb-3 bg-[#020817]/95 backdrop-blur border-t border-white/10"
    >
      <div className="max-w-2xl mx-auto">
        <button
          type={type}
          form={form}
          onClick={onClick}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 rounded-2xl font-black text-lg text-white active:scale-[0.98] disabled:opacity-50"
          style={{
            minHeight: 58,
            background: "linear-gradient(135deg,#00a9ff,#0066ff)",
            boxShadow: "0 0 0 2px rgba(255,255,255,.85), 0 8px 24px rgba(0,169,255,.45)",
          }}
        >
          {icon}{children}
        </button>
      </div>
    </div>
  );
  return (
    <>
      <div aria-hidden style={{ height: 90 }} />
      {typeof document !== "undefined" ? createPortal(bar, document.body) : bar}
    </>
  );
}
