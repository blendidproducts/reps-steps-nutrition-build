/**
 * Cardio types (2026-11-19). JT: "Need to add mountain biking, swimming, road
 * biking to the list of options when doing cardio, not just walk, jog, sprint.
 * Walk, jog, sprint is the default, but you can choose the other ones if needed."
 *
 * One list for every screen with a cardio choice (AiRTP rest + Active
 * Recovery, RestScreen, ActiveRecoveryScreen, superset transition), so labels
 * and spoken cues stay right ("Swimming", not "swiming"). Calorie METs live in
 * burnEstimate.js with their Compendium codes.
 */
export const CARDIO_TYPES = {
  walk:      { label: "Walk",          verb: "Walking",         emoji: "🚶" },
  jog:       { label: "Jog",           verb: "Jogging",         emoji: "🏃" },
  sprint:    { label: "Sprint",        verb: "Sprinting",       emoji: "⚡" },
  mtb:       { label: "Mountain Bike", verb: "Mountain biking", emoji: "🚵", tw: "border-emerald-500 bg-emerald-600/20 text-emerald-300" },
  road_bike: { label: "Road Bike",     verb: "Road biking",     emoji: "🚴", tw: "border-sky-500 bg-sky-600/20 text-sky-300" },
  swim:      { label: "Swim",          verb: "Swimming",        emoji: "🏊", tw: "border-cyan-500 bg-cyan-600/20 text-cyan-300" },
};

/** Shown as the main buttons everywhere. */
export const DEFAULT_CARDIO = ["walk", "jog", "sprint"];
/** Behind the "+ Bike / Swim" toggle. */
export const MORE_CARDIO = ["mtb", "road_bike", "swim"];

export const cardioLabel = (t) => CARDIO_TYPES[t]?.label || String(t || "");
export const cardioVerb = (t) => CARDIO_TYPES[t]?.verb || `${t}ing`;
