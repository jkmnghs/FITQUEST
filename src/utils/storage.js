import { supabase } from '../lib/supabaseClient';

// Local state is namespaced per account. A single shared key let one user's
// progress merge into the next user's account on the same browser: on a cold
// load useGameState sees prevUserId === null, so it skips the sign-out wipe,
// and the merge path then unions the previous user's log/weekProgress/XP into
// the new account — and writes it to their cloud row.
const SK_PREFIX = 'fitquest-recomp-v2';
const LEGACY_KEY = SK_PREFIX;

function keyFor(userId) {
  return userId ? `${SK_PREFIX}:${userId}` : SK_PREFIX;
}

// Keys the server owns. The browser must never write these back — its copy is
// always at least one poll interval stale, and overwriting them is what used to
// erase proactive agent messages and reset the quest quota.
const SERVER_OWNED_KEYS = [
  'agentMessages',
  'agentDeloadSuggested',
  'pendingProgramSwitch',
  'questMessagesThisWeek',
  'questMessagesWeekStart',
];

function stripServerOwned(state) {
  const out = { ...state };
  for (const key of SERVER_OWNED_KEYS) delete out[key];
  return out;
}

export function storageSet(val, userId) {
  const str = JSON.stringify(val);
  const key = keyFor(userId);
  try { localStorage.setItem(key, str); } catch (e) { console.warn('[FitQuest] localStorage write failed:', e); }
  try { sessionStorage.setItem(key, str); } catch (e) { console.warn('[FitQuest] sessionStorage write failed:', e); }
}

export function storageGet(userId) {
  const key = keyFor(userId);
  try {
    const v = localStorage.getItem(key);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] localStorage read failed:', e); }
  try {
    const v = sessionStorage.getItem(key);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] sessionStorage read failed:', e); }
  return null;
}

export function storageClear(userId) {
  const key = keyFor(userId);
  try { localStorage.removeItem(key); } catch (e) {}
  try { sessionStorage.removeItem(key); } catch (e) {}
}

/**
 * One-time adoption of pre-namespacing local data.
 *
 * Only runs when the signing-in user has no namespaced state yet, so an
 * existing single-account user keeps their offline progress across the upgrade.
 * The legacy key is removed either way — leaving it would let it be adopted a
 * second time by a different account, which is the bug we're fixing.
 */
export function migrateLegacyStorage(userId) {
  if (!userId) return null;
  let legacy = null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) legacy = JSON.parse(raw);
  } catch (e) { /* unreadable legacy blob — drop it */ }

  try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
  try { sessionStorage.removeItem(LEGACY_KEY); } catch (e) {}

  if (!legacy) return null;
  if (storageGet(userId)) return null; // this account already has its own state
  storageSet(legacy, userId);
  return legacy;
}

// ── Cloud sync (Supabase) ────────────────────────────────────────────────────

/**
 * Reads the user's state JSONB from Supabase.
 * Returns the parsed state object, or null if not found / on error.
 */
export async function cloudGet(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data.state && Object.keys(data.state).length > 0 ? data.state : null;
  } catch (e) {
    console.warn('[FitQuest] cloudGet failed:', e);
    return null;
  }
}

/**
 * Merges the user's client-owned state into Supabase.
 *
 * Uses the merge_user_state RPC so server-owned keys survive; falls back to a
 * plain upsert of the stripped state if the RPC is unavailable (e.g. the
 * migration hasn't been applied yet), which is still safer than the previous
 * full-blob write because the server-owned keys are excluded either way.
 */
export async function cloudSet(userId, state) {
  if (!supabase || !userId) return;
  const patch = stripServerOwned(state);
  try {
    const { error } = await supabase.rpc('merge_user_state', { p_patch: patch });
    if (!error) return;
    console.warn('[FitQuest] merge_user_state unavailable, falling back to upsert:', error.message);
  } catch (e) {
    console.warn('[FitQuest] merge_user_state threw, falling back to upsert:', e);
  }
  try {
    await supabase
      .from('user_profiles')
      .upsert({ id: userId, state: patch }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[FitQuest] cloudSet failed:', e);
  }
}

/**
 * Resets the user's cloud state to an empty object. Full replace by design —
 * "reset all progress" should clear the server-owned keys too.
 */
export async function cloudClear(userId) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from('user_profiles')
      .upsert({ id: userId, state: {} }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[FitQuest] cloudClear failed:', e);
  }
}

// Debounced cloud write — used in the hot-path auto-save effect.
// Batches rapid successive state changes into a single write every 3 seconds.
let _syncTimer = null;
let _pendingWrite = null;

export function cloudSetDebounced(userId, state) {
  clearTimeout(_syncTimer);
  _pendingWrite = { userId, state };
  _syncTimer = setTimeout(() => {
    _pendingWrite = null;
    cloudSet(userId, state);
  }, 3000);
}

export function cancelCloudDebounce() {
  clearTimeout(_syncTimer);
  _syncTimer = null;
  _pendingWrite = null;
}

/**
 * Writes any pending debounced state immediately.
 *
 * Sign-out used to call cancelCloudDebounce() and then wipe local storage,
 * silently discarding up to 3 seconds of progress. Callers that tear down state
 * should flush first.
 */
export async function flushCloudDebounce() {
  if (!_pendingWrite) { cancelCloudDebounce(); return; }
  const { userId, state } = _pendingWrite;
  cancelCloudDebounce();
  await cloudSet(userId, state);
}
