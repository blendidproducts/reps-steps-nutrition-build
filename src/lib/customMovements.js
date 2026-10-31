/**
 * customMovements.js — Movement Trainer recordings saved to your account
 * (2026-10-30).
 *
 * Before: recordings lived only in this browser's localStorage
 * ("rns_custom_movements"), so clearing Safari data, a new phone or the web
 * app on a computer lost them, and nothing else in the app could use them.
 *
 * Now: the Base44 CustomMovement entity is the source of truth. The local list
 * stays as an offline cache (same key and shape, so lib/movementTemplates.js
 * and its tests are untouched), and anything recorded before this change — or
 * while offline — is uploaded the next time the list syncs. The learned
 * template is stored as JSON text so no field of it can be dropped by schema
 * validation.
 *
 * A recorded movement is matched to workout exercises BY NAME
 * (case-insensitive). matchExercise() falls back to Push-Up for an unknown
 * name, so a recorded movement must always be checked first.
 */
import { base44 } from "@/api/base44Client";
import { loadCustomMovements, makeCustomExerciseConfig } from "@/lib/movementTemplates";

const CACHE_KEY = "rns_custom_movements";
const writeCache = (list) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (_) {}
};
const ent = () => base44.entities.CustomMovement;

function fromRow(row) {
  let template = null;
  try { template = JSON.parse(row.template_json || "null"); } catch (_) {}
  if (!template?.signal?.length) return null;
  return {
    id: row.id,
    remote_id: row.id,
    local_id: row.local_id || null,
    name: row.name || "My movement",
    template,
    created_at: row.created_date || row.created_at || null,
  };
}

let syncing = null;
/**
 * Pull the account's movements, upload any local-only ones, refresh the cache.
 * Returns { list, synced }. synced=false means the account couldn't be reached
 * (offline, or the entity isn't live yet) and the list is this device's copy.
 */
export function syncCustomMovements() {
  if (syncing) return syncing;
  syncing = (async () => {
    const local = loadCustomMovements();
    let rows;
    try { rows = await ent().list("-created_date"); }
    catch (_) { return { list: local, synced: false }; }
    const remote = (rows || []).map(fromRow).filter(Boolean);
    const knownLocal = new Set(remote.map((m) => m.local_id).filter(Boolean));
    const knownRemote = new Set(remote.map((m) => m.remote_id));
    // Upload anything that only exists here: recorded before this change,
    // or saved while offline.
    for (const m of local) {
      if (m.remote_id && knownRemote.has(m.remote_id)) continue;
      if (knownLocal.has(m.id)) continue;
      if (m.remote_id && !knownRemote.has(m.remote_id)) continue; // deleted on another device
      try {
        const row = await ent().create({
          name: m.name, template_json: JSON.stringify(m.template),
          local_id: m.id, describe: m.template?.describe || "",
        });
        const mv = fromRow(row);
        if (mv) remote.unshift(mv);
      } catch (_) {
        remote.unshift(m); // keep it locally; try again next sync
      }
    }
    writeCache(remote);
    return { list: remote, synced: true };
  })().finally(() => { syncing = null; });
  return syncing;
}

/** Save a new recording. Falls back to this device if the account is unreachable. */
export async function createCustomMovement({ name, template }) {
  const nm = (name || "My movement").trim().slice(0, 40) || "My movement";
  const localId = `cm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let item = { id: localId, name: nm, template, created_at: new Date().toISOString() };
  let synced = false;
  try {
    const row = await ent().create({ name: nm, template_json: JSON.stringify(template), local_id: localId, describe: template?.describe || "" });
    const mv = fromRow(row);
    if (mv) { item = mv; synced = true; }
  } catch (_) { /* stays local; syncCustomMovements uploads it later */ }
  const list = [item, ...loadCustomMovements().filter((m) => m.id !== item.id)];
  writeCache(list);
  return { item, list, synced };
}

export async function removeCustomMovement(m) {
  if (m?.remote_id) {
    try { await ent().delete(m.remote_id); } catch (_) { /* gone already, or offline */ }
  }
  const list = loadCustomMovements().filter((x) => x.id !== m.id);
  writeCache(list);
  return list;
}

/** The recorded movement with this name, from the cached list (sync). */
export function findCustomMovement(name) {
  const k = String(name || "").trim().toLowerCase();
  if (!k) return null;
  return loadCustomMovements().find((m) => m.name.trim().toLowerCase() === k) || null;
}

/** RepTracker config for a recorded movement, or null if the name isn't one. */
export function customConfigFor(name) {
  const m = findCustomMovement(name);
  return m ? makeCustomExerciseConfig(m.template, { id: m.id, name: m.name }) : null;
}
