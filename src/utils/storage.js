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
  'programGenerationsThisWeek',
  'nutritionCallsToday',
  'nutritionCallsDate',
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

/** How long a cold-start cloud read may block the app before we give up. */
export const CLOUD_GET_TIMEOUT_MS = 8000;

/**
 * Resolve to `fallback` if `promise` hasn't settled within `ms`.
 *
 * A request that hangs is not the same as one that fails. On a stalled mobile
 * connection the socket stays open and the Supabase client never rejects, so
 * `await` here simply never returns — which left the splash screen up forever
 * with no way out but force-quitting the app.
 */
function withTimeout(promise, ms, fallback) {
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Reads the user's state from Supabase, distinguishing "there is nothing
 * there" from "we could not find out".
 *
 * This distinction is the whole point. The old version returned null for
 * both, and the caller read null as "cloud is empty" — so a network timeout
 * on a slow connection looked exactly like a brand-new account, the app
 * offered onboarding, and the resulting fresh state was written over real
 * progress. A read that failed must never be treated as an empty account.
 *
 * @returns {Promise<{ok: true, data: object|null} | {ok: false, reason: string}>}
 *   ok:true with data:null means the account genuinely has no saved state.
 */
export async function cloudGetResult(userId) {
  if (!supabase) return { ok: false, reason: 'no-client' };
  if (!userId) return { ok: false, reason: 'no-user' };
  return withTimeout(
    cloudGetInner(userId),
    CLOUD_GET_TIMEOUT_MS,
    { ok: false, reason: 'timeout' },
  );
}

/**
 * Back-compat wrapper: the state object, or null for empty *or* failed.
 * Prefer cloudGetResult — callers that cannot tell the two apart are exactly
 * how the data loss happened.
 */
export async function cloudGet(userId) {
  const res = await cloudGetResult(userId);
  return res.ok ? res.data : null;
}

export { withTimeout as _withTimeout };

async function cloudGetInner(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();
    // PGRST116 = no row matched, which is a real "new account" answer.
    if (error) {
      if (error.code === 'PGRST116') return { ok: true, data: null };
      console.warn('[FitQuest] cloudGet error:', error.message);
      return { ok: false, reason: error.code || 'query-error' };
    }
    if (!data) return { ok: true, data: null };
    const state = data.state && Object.keys(data.state).length > 0 ? data.state : null;
    return { ok: true, data: state };
  } catch (e) {
    console.warn('[FitQuest] cloudGet threw:', e);
    return { ok: false, reason: 'exception' };
  }
}

/**
 * True when `state` carries nothing worth persisting.
 *
 * Used as a last line of defence before a cloud write: a state with no
 * sessions, no log and no check-ins is either a brand-new account or the
 * in-memory default that appears while a load is in flight. Writing that over
 * a populated row is never correct.
 */
export function isEmptyState(state) {
  if (!state) return true;
  return (Number(state.totalSessions) || 0) === 0
    && (state.log?.length || 0) === 0
    && (state.weeklyCheckins?.length || 0) === 0
    && (state.totalXp || 0) === 0;
}

/**
 * Merges the user's client-owned state into Supabase.
 *
 * Uses the merge_user_state RPC so server-owned keys survive; falls back to a
 * plain upsert of the stripped state if the RPC is unavailable (e.g. the
 * migration hasn't been applied yet), which is still safer than the previous
 * full-blob write because the server-owned keys are excluded either way.
 */
/**
 * Set once the cloud load for the current user has actually resolved.
 *
 * Until then no write may leave the client. The auto-save effect fires on
 * mount with whatever is in memory — the default state, when localStorage is
 * empty — and its 3-second debounce beat a cloud read that took longer than
 * that. The empty default was written over a populated row before the read
 * even came back, which is how a user lost 79 sessions.
 */
let _loadSettledFor = null;

export function markCloudLoadSettled(userId) {
  _loadSettledFor = userId || null;
}

export function resetCloudLoadGate() {
  _loadSettledFor = null;
}

export async function cloudSet(userId, state, { force = false } = {}) {
  if (!supabase || !userId) return;

  if (!force && _loadSettledFor !== userId) {
    console.warn('[FitQuest] refusing cloud write before the load settled — this is the guard that prevents overwriting saved progress');
    return;
  }
  // Never let an empty state replace a populated row. A legitimate wipe goes
  // through cloudClear, which is explicit about it.
  if (!force && isEmptyState(state)) {
    const existing = await cloudGetResult(userId);
    if (!existing.ok) {
      console.warn('[FitQuest] refusing to write empty state — cannot confirm what is stored:', existing.reason);
      return;
    }
    if (existing.data && !isEmptyState(existing.data)) {
      console.warn('[FitQuest] refusing to overwrite saved progress with an empty state');
      return;
    }
  }

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

// ── Server-side shrink snapshot ─────────────────────────────────────────────
// A database trigger copies the previous state into user_profiles.state_backup
// whenever an update would reduce totalSessions or the log length. It is
// enforced in Postgres rather than here on purpose: a cached bundle, an old app
// version or a direct API call all go through it.

/**
 * The snapshot waiting for this user, if any, described rather than returned in
 * full — the settings screen only needs to say what is in it.
 */
export async function getBackupInfo(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('state_backup, state_backup_at')
      .eq('id', userId)
      .single();
    if (error || !data?.state_backup) return null;
    const s = data.state_backup;
    return {
      takenAt: data.state_backup_at,
      totalSessions: Number(s.totalSessions) || 0,
      level: Number(s.level) || 1,
      currentWeek: Number(s.currentWeek) || 1,
      logEntries: Array.isArray(s.log) ? s.log.length : 0,
    };
  } catch (e) {
    console.warn('[FitQuest] getBackupInfo failed:', e);
    return null;
  }
}

/**
 * Put the snapshot back. Returns the restored state, or null.
 *
 * The trigger also fires on this write, so whatever is being replaced becomes
 * the new snapshot — restoring is itself reversible.
 */
export async function restoreFromBackup(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase.rpc('restore_state_backup');
    if (error) {
      console.warn('[FitQuest] restoreFromBackup failed:', error.message);
      return null;
    }
    markCloudLoadSettled(userId);
    return data || null;
  } catch (e) {
    console.warn('[FitQuest] restoreFromBackup threw:', e);
    return null;
  }
}
