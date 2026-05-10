import { supabase } from '../lib/supabaseClient';

const SK = 'fitquest-recomp-v2';

export function storageSet(val) {
  const str = JSON.stringify(val);
  try { localStorage.setItem(SK, str); } catch (e) { console.warn('[FitQuest] localStorage write failed:', e); }
  try { sessionStorage.setItem(SK, str); } catch (e) { console.warn('[FitQuest] sessionStorage write failed:', e); }
}

export function storageGet() {
  try {
    const v = localStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] localStorage read failed:', e); }
  try {
    const v = sessionStorage.getItem(SK);
    if (v) return JSON.parse(v);
  } catch (e) { console.warn('[FitQuest] sessionStorage read failed:', e); }
  return null;
}

export function storageClear() {
  try { localStorage.removeItem(SK); } catch (e) {}
  try { sessionStorage.removeItem(SK); } catch (e) {}
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
 * Upserts the user's full state to Supabase.
 */
export async function cloudSet(userId, state) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from('user_profiles')
      .upsert({ id: userId, state }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[FitQuest] cloudSet failed:', e);
  }
}

/**
 * Resets the user's cloud state to an empty object.
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
export function cloudSetDebounced(userId, state) {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => cloudSet(userId, state), 3000);
}
