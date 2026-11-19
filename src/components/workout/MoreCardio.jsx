/**
 * "+ Bike / Swim" (2026-11-19). Sits under the Walk / Jog / Sprint buttons on
 * every cardio picker. Collapsed by default so walk/jog/sprint stay the main
 * choice; tap to show Mountain Bike, Road Bike and Swim.
 */
import React, { useState } from "react";
import { CARDIO_TYPES, MORE_CARDIO } from "@/lib/cardioTypes";

export default function MoreCardio({ onPick, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-[11px] font-bold text-gray-300 border border-gray-600 rounded-xl py-2 active:scale-95 transition-transform"
        style={{ minHeight: 36 }}>
        {open ? "− Hide bike / swim" : "＋ Bike / Swim"}
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-2 mt-2" role="group" aria-label="More cardio options">
          {MORE_CARDIO.map((t) => {
            const c = CARDIO_TYPES[t];
            return (
              <button key={t} type="button" onClick={() => onPick(t)} aria-label={`Start ${c.verb.toLowerCase()}`}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 active:scale-95 transition-transform ${c.tw}`}>
                <span className="text-xl leading-none" aria-hidden="true">{c.emoji}</span>
                <span className="text-[10px] font-black uppercase leading-tight text-center">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
