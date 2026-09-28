import { midnightOf } from './gameLogic';

const LOG_RETENTION_DAYS = 90;

function unionArrays(arr1, arr2, keyFn) {
  const map = new Map();
  (arr1 || []).forEach(item => {
    const k = keyFn(item);
    if (k !== undefined) map.set(k, item);
  });
  (arr2 || []).forEach(item => {
    const k = keyFn(item);
    if (k !== undefined) map.set(k, item); // arr2 (local) wins on collision
    else map.set(Symbol(), item);
  });
  return [...map.values()];
}

/** Day the state was last trained, as a timestamp; 0 when unknown. */
function lastActive(state) {
  const ms = midnightOf(state?.lastDate);
  return isNaN(ms) ? 0 : ms;
}

/**
 * Union two workout logs.
 *
 * Entries are the same entry when type, name and timestamp all match. Keying
 * on the minute-resolution dateStr alone dropped every other exercise logged
 * in the same minute. The result keeps the same 90-day window the app prunes
 * to — the old hard cut at 200 entries threw away roughly a month of history
 * for a regular lifter on every load.
 */
function mergeLogs(cloudLog, localLog) {
  const seen = new Set();
  const merged = [...(cloudLog || []), ...(localLog || [])].filter(e => {
    const key = `${e.type || ''}|${e.name || ''}|${e.dateStr || ''}|${e.date || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const cutoff = Date.now() - LOG_RETENTION_DAYS * 864e5;
  return merged
    .map((e, i) => ({ e, i, t: midnightOf(e.date) }))
    .filter(({ t }) => isNaN(t) || t >= cutoff)
    .sort((a, b) => ((a.t || 0) - (b.t || 0)) || (a.i - b.i))
    .map(({ e }) => e);
}

function mergeWeek(base, other) {
  const sessions = new Map();
  [...(base.sessions || []), ...(other.sessions || [])].forEach(s => {
    const key = `${s.dayKey || ''}-${s.date || ''}`;
    if (!sessions.has(key)) sessions.set(key, s);
  });
  const completedDays = [...new Set([...(base.completedDays || []), ...(other.completedDays || [])])];
  return {
    ...base,
    count: Math.max(base.count || 0, other.count || 0),
    completedDays,
    // A day trained on either device is no longer a skip.
    skippedDays: [...new Set([...(base.skippedDays || []), ...(other.skippedDays || [])])]
      .filter(d => !completedDays.includes(d)),
    dates: [...new Set([...(base.dates || []), ...(other.dates || [])])],
    completed: !!(base.completed || other.completed),
    sessions: [...sessions.values()],
  };
}

/**
 * True when the cloud copy holds nothing this device doesn't already show —
 * the common case on returning to the app, where a merge would be churn.
 */
export function sameProgress(a, b) {
  const sig = s => [
    Number(s?.totalSessions) || 0, s?.currentWeek || 1, s?.lastDate || '',
    s?.log?.length || 0, s?.weeklyCheckins?.length || 0, s?.mealLogs?.length || 0,
    Object.keys(s?.weekProgress || {}).length, Number(s?.totalXp) || 0,
  ].join('|');
  return sig(a) === sig(b);
}

/**
 * Merge this device's state with the cloud copy. Pure; no defaults, no day
 * reset — the caller runs those on the result, *after* the merge.
 *
 * Running the day reset first (as both merge paths used to) meant the week
 * rollover it performs was overwritten by the raw currentWeek and
 * weekProgress of the two inputs, so a week closed on load was reopened by
 * the merge that followed.
 *
 * The base copy (settings, program, lift weights) is whichever trained more
 * recently. lastDate is a toDateString(), so comparing it as a string ranked
 * "Sun Sep 27" above "Mon Sep 28" and picked the older copy.
 */
export function mergeCloudAndLocal(localData, cloudData) {
  const cloudIsBase = lastActive(cloudData) >= lastActive(localData);
  const base = cloudIsBase ? cloudData : localData;
  const other = cloudIsBase ? localData : cloudData;

  const merged = { ...base };
  merged.log = mergeLogs(cloudData.log, localData.log);

  merged.totalXp = Math.max(cloudData.totalXp || 0, localData.totalXp || 0);
  merged.level = Math.max(cloudData.level || 1, localData.level || 1);
  merged.totalSessions = Math.max(cloudData.totalSessions || 0, localData.totalSessions || 0);
  merged.checkins = Math.max(cloudData.checkins || 0, localData.checkins || 0);

  // The week never regresses, and its start date travels with it.
  const weekWinner = (cloudData.currentWeek || 1) >= (localData.currentWeek || 1) ? cloudData : localData;
  merged.currentWeek = weekWinner.currentWeek || 1;
  merged.currentWeekStartDate = weekWinner.currentWeekStartDate || base.currentWeekStartDate;

  merged.achDone = [...new Set([...(cloudData.achDone || []), ...(localData.achDone || [])])];

  // Check-ins by week — local wins for any given week (most recent edit).
  const checkins = new Map();
  (cloudData.weeklyCheckins || []).forEach(c => checkins.set(c.week, c));
  (localData.weeklyCheckins || []).forEach(c => checkins.set(c.week, c));
  merged.weeklyCheckins = [...checkins.values()].sort((a, b) => a.week - b.week);

  // weekProgress — never drop a session from either source.
  const weekProgress = { ...(base.weekProgress || {}) };
  for (const [week, wp] of Object.entries(other.weekProgress || {})) {
    weekProgress[week] = weekProgress[week] ? mergeWeek(weekProgress[week], wp) : wp;
  }
  merged.weekProgress = weekProgress;

  merged.mealLogs = unionArrays(cloudData.mealLogs, localData.mealLogs, m => m.id).slice(-500);
  merged.aiEpisodic = unionArrays(cloudData.aiEpisodic, localData.aiEpisodic, e => e.id);
  merged.recoveryScores = unionArrays(cloudData.recoveryScores, localData.recoveryScores, r => r.date).slice(-90);
  merged.aiCoachHistory = (localData.aiCoachHistory || []).length >= (cloudData.aiCoachHistory || []).length
    ? (localData.aiCoachHistory || [])
    : (cloudData.aiCoachHistory || []);

  return merged;
}
