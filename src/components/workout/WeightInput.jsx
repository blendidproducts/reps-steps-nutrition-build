import React, { useEffect, useState } from "react";
import { Minus, Plus, Dumbbell } from "lucide-react";
import { parseWeight, fmtNum } from "@/lib/weights";

/**
 * Added-weight entry for one set. Blank = bodyweight.
 *   value   number (0 = bodyweight)
 *   unit    'lb' | 'kg'
 *   onChange(weight, unit)
 *
 * ± steps 5 lb / 2.5 kg. Typing is allowed too (inputMode="decimal" brings up
 * the number pad on phones). Text is committed on blur / Enter so a half-typed
 * "2" never becomes the weight.
 */
export default function WeightInput({ value = 0, unit = "lb", onChange, compact = false, label = "Added weight" }) {
  const [text, setText] = useState(value > 0 ? String(value) : "");
  useEffect(() => { setText(value > 0 ? String(value) : ""); }, [value]);

  const step = unit === "kg" ? 2.5 : 5;
  const commit = (w, u = unit) => onChange && onChange(w, u);
  const bump = (d) => {
    const next = Math.max(0, Math.round(((Number(value) || 0) + d) * 2) / 2);
    commit(next);
  };

  const h = compact ? 36 : 44;
  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-gray-300">{label}</span>
          <span className="text-[10px] text-gray-500 ml-auto">blank = bodyweight</span>
        </div>
      )}
      <div className="flex items-stretch gap-1.5">
        <button type="button" onClick={() => bump(-step)} aria-label={`Minus ${step} ${unit}`}
          className="rounded-xl border border-gray-700 bg-black/40 text-gray-300 flex items-center justify-center active:scale-95"
          style={{ width: h, minHeight: h }}>
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="text" inputMode="decimal" enterKeyHint="done"
          aria-label={`${label} in ${unit}`}
          value={text}
          placeholder="Bodyweight"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit(parseWeight(text))}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="flex-1 min-w-0 rounded-xl bg-black/40 border border-gray-700 text-center text-white font-black tabular-nums placeholder:text-gray-500 placeholder:font-semibold placeholder:text-sm"
          style={{ minHeight: h, fontSize: compact ? 15 : 18 }}
        />
        <button type="button" onClick={() => bump(step)} aria-label={`Plus ${step} ${unit}`}
          className="rounded-xl border border-gray-700 bg-black/40 text-amber-300 flex items-center justify-center active:scale-95"
          style={{ width: h, minHeight: h }}>
          <Plus className="w-4 h-4" />
        </button>
        <div role="radiogroup" aria-label="Weight unit" className="flex rounded-xl border border-gray-700 overflow-hidden">
          {["lb", "kg"].map((u) => (
            <button key={u} type="button" role="radio" aria-checked={unit === u}
              onClick={() => { if (u !== unit) commit(Number(value) || 0, u); }}
              className={`px-2.5 text-xs font-bold ${unit === u ? "bg-amber-500 text-black" : "bg-black/40 text-gray-400"}`}
              style={{ minHeight: h }}>
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** "25 lb" or "BW" — for chips and summaries. */
export function weightLabel(weight, unit) {
  return weight > 0 ? `${fmtNum(weight)} ${unit}` : "BW";
}
