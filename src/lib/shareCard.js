/**
 * shareCard.js - Round 27
 * Builds a shareable workout-summary PNG with the Canvas 2D API.
 *
 * WHY CANVAS AND NOT html-to-image / dom-to-image:
 *  - Those libraries serialise the DOM into <svg><foreignObject>. On iOS Safari
 *    that silently drops webfonts and cross-origin images, and sometimes yields
 *    a blank frame. Canvas draws identically everywhere.
 *  - This repo has no working node_modules and package.json is owned by Base44
 *    (it is NOT in the sync folder), so adding a dependency is a bad trade.
 *  => Zero dependencies. Everything below is hand-drawn.
 *
 * Variants:
 *   'feed'   1080x1350 (4:5)  full per-exercise breakdown. Default.
 *   'square' 1080x1080 (1:1)  one hero number + three stats.
 *
 * Nothing is uploaded. The PNG is produced on-device and handed straight to
 * the native share sheet - which is what keeps the website's privacy claim true.
 */

const C = {
  ink: "#060B14",
  surface: "#0E1826",
  line: "#22334C",
  hair: "rgba(34,51,76,0.55)",
  text: "#E9F0F8",
  soft: "#DCE7F3",
  muted: "#8398B3",
  white: "#FFFFFF",
  blue: "#00A9FF",
  cyan: "#00E5FF",
  green: "#3DDC7A",
  amber: "#F5A524",
};

const W = 1080;
const PAD = 72;

// Canvas cannot use font-variant-numeric, so digits that must line up are set
// in a monospace face. Display face is a heavy system stack - no webfont load,
// so there is never a race between document.fonts and the draw call.
const display = (s) =>
  `900 ${s}px "Arial Black","Helvetica Neue",Impact,system-ui,sans-serif`;
const body = (s, w = 600) =>
  `${w} ${s}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
const mono = (s, w = 500) =>
  `${w} ${s}px ui-monospace,"SF Mono",Menlo,Consolas,monospace`;

/* ---------- small drawing helpers ---------- */

function rr(ctx, x, y, w, h, r) {
  // ctx.roundRect is not in older iOS Safari - draw the path by hand.
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r, fill, stroke) {
  rr(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function text(ctx, str, x, y, { font, color, align = "left", baseline = "alphabetic" }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}

/** Trim to fit maxW, appending an ellipsis. Returns the string actually drawn. */
function ellipsize(ctx, str, maxW, font) {
  ctx.font = font;
  if (ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) {
    s = s.slice(0, -1);
  }
  return s + "…";
}

/** Letter-spaced uppercase label - canvas has no letter-spacing in Safari. */
function tracked(ctx, str, x, y, { font, color, spacing = 3, align = "left" }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const chars = String(str).split("");
  const total =
    chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) +
    spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return total;
}

/* ---------- shared card furniture ---------- */

function drawBrandRow(ctx, y, dateLabel, dim) {
  const s = 34; // logo tile
  const g = ctx.createLinearGradient(PAD, y, PAD + s, y + s);
  g.addColorStop(0, C.cyan);
  g.addColorStop(1, C.blue);
  fillRR(ctx, PAD, y, s, s, 10, g);

  // lightning bolt
  ctx.save();
  ctx.translate(PAD + s / 2, y + s / 2);
  ctx.scale(s / 34, s / 34);
  ctx.beginPath();
  ctx.moveTo(2, -11); ctx.lineTo(-7, 1); ctx.lineTo(-1, 1);
  ctx.lineTo(-2, 11); ctx.lineTo(7, -1); ctx.lineTo(1, -1);
  ctx.closePath();
  ctx.fillStyle = "#04121F";
  ctx.fill();
  ctx.restore();

  const tx = PAD + s + 16;
  const by = y + s - 8;
  ctx.font = body(27, 700);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = C.white; ctx.fillText("REPS", tx, by);
  let w = ctx.measureText("REPS").width;
  ctx.fillStyle = C.cyan; ctx.fillText("&", tx + w, by);
  w += ctx.measureText("&").width;
  ctx.fillStyle = C.white; ctx.fillText("STEPS", tx + w, by);

  if (dateLabel) {
    tracked(ctx, dateLabel.toUpperCase(), W - PAD, by, {
      font: mono(21), color: dim ? "#C6D8EC" : C.muted, spacing: 1.4, align: "right",
    });
  }
}

function drawStatTiles(ctx, y, tiles) {
  const gap = 18;
  const tw = (W - PAD * 2 - gap * 3) / 4;
  const th = 132;
  tiles.forEach((t, i) => {
    const x = PAD + i * (tw + gap);
    fillRR(ctx, x, y, tw, th, 16, C.surface, C.line);
    text(ctx, String(t.n), x + tw / 2, y + 74, {
      font: display(t.small ? 44 : 52), color: t.color, align: "center",
    });
    tracked(ctx, t.l.toUpperCase(), x + tw / 2, y + 108, {
      font: body(17, 600), color: C.muted, spacing: 2.2, align: "center",
    });
  });
  return y + th;
}

function drawFooter(ctx, top, h, tagline) {
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, "rgba(0,169,255,0)");
  g.addColorStop(1, "rgba(0,169,255,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, h);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();

  const cy = top + h / 2;
  text(ctx, "repsandsteps.com", PAD, cy - 6, { font: body(27, 700), color: C.cyan });
  text(ctx, tagline, PAD, cy + 30, { font: body(23, 400), color: C.muted });
}

/* ---------- variant A: 1080x1350 feed card ---------- */

function drawFeed(ctx, d) {
  const H = 1350;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);

  drawBrandRow(ctx, 74, `${d.dateLabel} · ${d.timeLabel}`);

  // Headline
  text(ctx, "AI REP", PAD, 250, { font: display(92), color: C.white });
  ctx.font = display(92);
  const w1 = ctx.measureText("TRACKING ").width;
  text(ctx, "TRACKING ", PAD, 336, { font: display(92), color: C.white });
  text(ctx, "DONE", PAD + w1, 336, { font: display(92), color: C.green });

  text(ctx, d.subline, PAD, 386, { font: body(25, 400), color: C.muted });

  const afterTiles = drawStatTiles(ctx, 424, [
    { n: d.totalReps, l: "Reps", color: C.blue },
    { n: d.durationLabel, l: "Time", color: C.cyan, small: true },
    { n: d.stepsLabel, l: "Steps", color: C.green, small: true },
    { n: d.kcal, l: "Kcal", color: C.amber },
  ]);

  // Exercise table
  let y = afterTiles + 54;
  tracked(ctx, "EXERCISE", PAD, y, { font: body(17, 600), color: C.muted, spacing: 2.4 });
  tracked(ctx, "SETS · REPS", W - PAD, y, {
    font: body(17, 600), color: C.muted, spacing: 2.4, align: "right",
  });
  y += 18;
  ctx.strokeStyle = C.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

  const footerH = 148;
  const footerTop = H - footerH;
  const available = footerTop - 28 - y;
  const BASE_ROW = 62;
  const room = Math.max(1, Math.floor(available / BASE_ROW));

  // Short workouts used to leave a dead band above the footer. When every
  // exercise fits, stretch the rows to fill the space instead (capped so a
  // 2-exercise session doesn't become comically airy). Long workouts keep the
  // tight row height and spend the last row on a "+ n more" line.
  let shown, hidden, rowH;
  if (d.exercises.length && d.exercises.length <= room) {
    shown = d.exercises;
    hidden = 0;
    rowH = Math.min(96, Math.floor(available / d.exercises.length));
  } else {
    rowH = BASE_ROW;
    shown = d.exercises.slice(0, Math.max(0, room - 1));
    hidden = d.exercises.length - shown.length;
  }

  for (const ex of shown) {
    y += rowH;
    const totalStr = String(ex.total);
    const setsStr = ex.sets && ex.sets.length ? ex.sets.join("/") : "";
    ctx.font = body(29, 700);
    const totalW = ctx.measureText(totalStr).width;
    ctx.font = mono(24);
    const setsW = setsStr ? ctx.measureText(setsStr).width : 0;
    const nameMax = W - PAD * 2 - totalW - setsW - 60;

    text(ctx, ellipsize(ctx, ex.name, nameMax, body(29, 500)), PAD, y - 20, {
      font: body(29, 500), color: C.soft,
    });
    if (setsStr) {
      text(ctx, setsStr, W - PAD - totalW - 28, y - 20, {
        font: mono(24), color: C.muted, align: "right",
      });
    }
    text(ctx, totalStr, W - PAD, y - 20, {
      font: body(29, 700), color: C.blue, align: "right",
    });
    ctx.strokeStyle = C.hair; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  }

  if (hidden > 0) {
    y += 44;
    text(ctx, `+ ${hidden} more exercise${hidden !== 1 ? "s" : ""}`, PAD, y, {
      font: body(24, 500), color: C.muted,
    });
  }

  drawFooter(ctx, footerTop, footerH, "Your camera counts your reps.");
  return H;
}

/* ---------- variant C: 1080x1080 square / story card ---------- */

function drawSquare(ctx, d) {
  const H = 1080;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);

  drawBrandRow(ctx, 74, d.dateLabel);

  text(ctx, String(d.totalReps), PAD, 470, { font: display(280), color: C.white });
  tracked(ctx, "REPS COUNTED BY CAMERA", PAD, 528, {
    font: body(26, 600), color: C.muted, spacing: 3.4,
  });

  const gap = 20;
  const tw = (W - PAD * 2 - gap * 2) / 3;
  const th = 168;
  const ty = 600;
  [
    { n: d.durationLabel, l: "Time", color: C.cyan },
    { n: d.stepsLabel, l: "Steps", color: C.green },
    { n: d.kcal, l: "Kcal", color: C.amber },
  ].forEach((t, i) => {
    const x = PAD + i * (tw + gap);
    fillRR(ctx, x, ty, tw, th, 18, C.surface, C.line);
    text(ctx, String(t.n), x + tw / 2, ty + 94, {
      font: display(60), color: t.color, align: "center",
    });
    tracked(ctx, t.l.toUpperCase(), x + tw / 2, ty + 136, {
      font: body(19, 600), color: C.muted, spacing: 2.4, align: "center",
    });
  });

  text(ctx, d.subline, PAD, ty + th + 66, { font: body(25, 400), color: C.muted });

  drawFooter(ctx, H - 148, 148, "Counted, not guessed.");
  return H;
}

/* ---------- data normalisation ---------- */

function pad2(n) { return String(n).padStart(2, "0"); }

export function formatDuration(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`;
}

/**
 * Normalise whatever the caller has into one shape.
 * Every field below already exists on a WorkoutSession or in ARTP state -
 * this adds no new tracking.
 */
export function buildShareData({
  date, durationSecs, totalReps, steps, kcal, exercises = [], exerciseCount, setCount,
}) {
  const d = date instanceof Date ? date : date ? new Date(date) : new Date();
  const exCount = exerciseCount != null ? exerciseCount : exercises.length;
  const bits = [];
  if (exCount) bits.push(`${exCount} exercise${exCount !== 1 ? "s" : ""}`);
  if (setCount) bits.push(`${setCount} set${setCount !== 1 ? "s" : ""}`);
  bits.push("every rep counted by camera");

  return {
    date: d,
    dateLabel: d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    timeLabel: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    durationLabel: formatDuration(durationSecs),
    durationSecs: Math.round(durationSecs || 0),
    totalReps: Math.round(totalReps || 0),
    steps: Math.round(steps || 0),
    stepsLabel: Math.round(steps || 0).toLocaleString(),
    kcal: Math.round(kcal || 0),
    exerciseCount: exCount,
    setCount: setCount || 0,
    exercises: exercises.map((e) => ({
      name: e.name,
      total: Math.round(e.total || 0),
      sets: Array.isArray(e.sets) ? e.sets : [],
    })),
    subline: bits.join(" · "),
  };
}

/* ---------- text variants ---------- */

/** Short line for the share sheet body / a quick paste. */
export function buildShortText(d) {
  return `${d.totalReps} reps in ${d.durationLabel} with RepsAndSteps. Every rep counted by camera. #RepsAndSteps`;
}

/** Full detail - the "Copy details" button. Monospaced columns line up in most chat apps. */
export function buildDetailText(d) {
  const lines = [];
  lines.push("RepsAndSteps - AI Rep Tracking");
  lines.push(`${d.dateLabel}, ${d.timeLabel}`);
  lines.push("");
  lines.push(
    `  ${d.durationLabel}  ·  ${d.totalReps} reps  ·  ${d.stepsLabel} steps  ·  ~${d.kcal} kcal`
  );
  lines.push(`  ${d.subline}`);
  if (d.exercises.length) {
    lines.push("");
    const nameW = Math.min(
      22,
      d.exercises.reduce((m, e) => Math.max(m, e.name.length), 0)
    );
    for (const e of d.exercises) {
      const name = e.name.length > nameW ? e.name.slice(0, nameW - 1) + "…" : e.name;
      const sets = e.sets.length ? "   " + e.sets.join("/") : "";
      lines.push(`  ${name.padEnd(nameW)}  ${String(e.total).padStart(4)}${sets}`);
    }
  }
  lines.push("");
  lines.push("Counted, not guessed. repsandsteps.com");
  lines.push("#RepsAndSteps #Calisthenics");
  return lines.join("\n");
}

/* ---------- render + share ---------- */

/** Draw the card and resolve with a PNG Blob. */
export function renderShareCard(data, variant = "feed") {
  return new Promise((resolve, reject) => {
    try {
      const H = variant === "square" ? 1080 : 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D unavailable"));
      if (variant === "square") drawSquare(ctx, data);
      else drawFeed(ctx, data);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    } catch (err) {
      reject(err);
    }
  });
}

/* ---------- remembered variant preference ---------- */

const VARIANT_KEY = "rns_share_variant";
export const SHARE_VARIANTS = [
  { id: "feed", label: "Feed", hint: "4:5" },
  { id: "square", label: "Square", hint: "1:1" },
];

/** Last variant the user picked. Falls back to 'feed' on any storage failure. */
export function getShareVariant() {
  try {
    const v = localStorage.getItem(VARIANT_KEY);
    return v === "square" ? "square" : "feed";
  } catch {
    return "feed"; // private mode / storage blocked - not an error worth surfacing
  }
}

export function setShareVariant(v) {
  try {
    localStorage.setItem(VARIANT_KEY, v === "square" ? "square" : "feed");
  } catch {
    /* preference just won't persist; sharing still works */
  }
}

function fileStamp(d) {
  const x = d.date;
  return `repsandsteps-${x.getFullYear()}${pad2(x.getMonth() + 1)}${pad2(x.getDate())}.png`;
}

/**
 * Share the card image.
 * Returns one of: 'shared' | 'saved' | 'copied' | 'cancelled'
 * so the caller can show an honest toast instead of guessing.
 *
 * navigator.canShare({files}) is the ONLY reliable gate - plenty of browsers
 * expose navigator.share but reject files. Order: native sheet -> save the PNG
 * -> copy the text. Never claim success we did not get.
 */
export async function shareWorkoutCard(data, variant = "feed") {
  let blob;
  try {
    blob = await renderShareCard(data, variant);
  } catch (err) {
    console.error("[shareCard] render failed", err);
    return copyDetails(data);
  }

  const file = new File([blob], fileStamp(data), { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: buildShortText(data) });
      return "shared";
    } catch (err) {
      // AbortError = the user closed the sheet. That is not a failure and must
      // not trigger a fallback download they did not ask for.
      if (err && err.name === "AbortError") return "cancelled";
      console.warn("[shareCard] navigator.share failed, saving instead", err);
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "saved";
  } catch (err) {
    console.warn("[shareCard] save failed, copying text instead", err);
    return copyDetails(data);
  }
}

/** Copy the full detail text. Returns 'copied' or 'cancelled'. */
export async function copyDetails(data) {
  const txt = buildDetailText(data);
  try {
    await navigator.clipboard.writeText(txt);
    return "copied";
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return "copied";
    } catch {
      return "cancelled";
    }
  }
}
