/**
 * Decides when the Quest agent should be woken, and remembers what it was
 * already woken for.
 *
 * This logic used to live inline in useAgentMessages, where two things went
 * wrong at once: the "already fired" set was a useRef, so it emptied on every
 * app launch, and PRs were compared with JSON.stringify, which reports a
 * difference whenever key order changes even though nothing was actually
 * lifted. Between them the agent sent a fresh "NEW PR" message every time the
 * app was opened, about a record set weeks earlier.
 */

/**
 * Lifts that genuinely improved between two snapshots.
 *
 * Returns ids only for records that are new or heavier. A record that
 * disappeared, or got lighter (a correction, a cleared day), is not a PR and
 * must not wake the agent.
 */
export function improvedLifts(prevRecords, nextRecords) {
  const prev = prevRecords || {};
  const next = nextRecords || {};
  const weightOf = (pr) => {
    const w = typeof pr === 'object' ? pr?.weight : pr;
    return Number(w) || 0;
  };

  return Object.keys(next)
    .filter(id => weightOf(next[id]) > weightOf(prev[id]))
    .sort();
}

/**
 * Key identifying one trigger-worthy event.
 *
 * Content-addressed rather than time-addressed: the old key was
 * `${trigger}_${today}`, so the same PR could fire again tomorrow, while a
 * genuinely different PR on the same day was suppressed. Keying on what
 * happened gets both cases right.
 */
export function triggerKey(trigger, detail = '') {
  return detail ? `${trigger}:${detail}` : trigger;
}

// Fired keys are kept per user and pruned to this many, newest last. The agent
// only ever needs the recent past — an unbounded list would grow forever in
// localStorage for a long-running account.
const MAX_REMEMBERED = 50;
const STORE_PREFIX = 'fitquest_agent_fired_';

const storeKey = (userId) => `${STORE_PREFIX}${userId || 'anon'}`;

/**
 * Keys already fired for this user, across app launches.
 *
 * The previous implementation held these in a useRef, which is memory: closing
 * the PWA or letting iOS evict the tab reset it to empty, and the next launch
 * treated every past event as new. localStorage is the right lifetime for
 * "have I already reacted to this?".
 */
export function loadFiredKeys(userId) {
  try {
    const raw = localStorage.getItem(storeKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    // A private window, cleared site data, or a corrupt entry. Starting empty
    // is safe: the server-side cooldown still prevents a duplicate message.
    return new Set();
  }
}

export function saveFiredKey(userId, key) {
  try {
    const existing = [...loadFiredKeys(userId)].filter(k => k !== key);
    existing.push(key);
    const pruned = existing.slice(-MAX_REMEMBERED);
    localStorage.setItem(storeKey(userId), JSON.stringify(pruned));
  } catch {
    /* storage unavailable — the server-side cooldown is the backstop */
  }
}

export function forgetFiredKey(userId, key) {
  try {
    const remaining = [...loadFiredKeys(userId)].filter(k => k !== key);
    localStorage.setItem(storeKey(userId), JSON.stringify(remaining));
  } catch {
    /* storage unavailable */
  }
}
