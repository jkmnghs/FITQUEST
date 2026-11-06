import { EXERCISES } from '../data/gameData';

export const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_ABBR  = { sun: 'SUN', mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT' };
export const DAY_FULL  = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

export function todayDayKey(now = new Date()) {
  return DAY_ORDER[now.getDay()];
}

/** Training days sorted into calendar order. */
export function sortedTrainingDays(state) {
  const days = state?.trainingDays?.length ? state.trainingDays : ['mon', 'wed', 'fri'];
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

/** The next training day at or after today, wrapping to the start of the week. */
export function nextTrainingDayAfter(state, fromKey = todayDayKey()) {
  const sorted = sortedTrainingDays(state);
  const ordinal = DAY_ORDER.indexOf(fromKey);
  return sorted.find(d => DAY_ORDER.indexOf(d) > ordinal) || sorted[0];
}

/**
 * Resolves the workout for a given day key from the layered template sources.
 * Returns null when that day has no template of its own.
 */
export function templateForDay(state, dayKey) {
  const fromDayTemplates = state?.dayTemplates?.[dayKey];
  if (fromDayTemplates?.exercises?.length > 0) {
    return {
      source: 'dayTemplates',
      title: fromDayTemplates.title || null,
      exercises: fromDayTemplates.exercises,
    };
  }

  // activeTemplates is indexed by position in the *unsorted* trainingDays array,
  // which is the order it was built in.
  const origDays = state?.trainingDays || ['mon', 'wed', 'fri'];
  const templates = state?.activeTemplates;
  if (templates?.length > 0) {
    const idx = origDays.indexOf(dayKey);
    const t = templates[(idx >= 0 ? idx : 0) % templates.length];
    if (t?.exercises?.length > 0) {
      return { source: 'activeTemplates', title: t.title || t.name || null, exercises: t.exercises };
    }
  }
  return null;
}

/**
 * Default slot keys for a weekly session count.
 *
 * Training is flexible: the user does N sessions in a week on whatever days
 * suit them. The program still needs a stable key per session (templates,
 * history and week progress are keyed by it), so each session slot keeps a
 * weekday key — it is an identifier and an order, not an appointment.
 */
const DEFAULT_SLOTS = {
  1: ['mon'],
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  7: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
};
export function defaultSlotsFor(sessionsPerWeek) {
  const n = Math.min(7, Math.max(1, Math.round(sessionsPerWeek) || 3));
  return [...DEFAULT_SLOTS[n]];
}

/** 1-based position of a session slot within the week ("Session 2"). */
export function slotNumber(state, dayKey) {
  const i = sortedTrainingDays(state).indexOf(dayKey);
  return i >= 0 ? i + 1 : null;
}

/** "Session 2" for a slot key; falls back to the key itself. */
export function slotLabel(state, dayKey) {
  const n = slotNumber(state, dayKey);
  return n ? `Session ${n}` : (DAY_FULL[dayKey] || dayKey || 'Session');
}

/**
 * Slots trained in a week, from completedDays and session records.
 * Returns null when the week has no per-day record (legacy count-only data).
 */
export function trainedSlots(wp) {
  const fromSessions = (wp?.sessions || [])
    .map(s => s.dayKey || (s.date ? DAY_ORDER[new Date(s.date).getDay()] : null))
    .filter(Boolean);
  if (fromSessions.length === 0) return wp?.completedDays || null;
  return [...new Set([...(wp.completedDays || []), ...fromSessions])];
}

function midnightMs(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * The single source of truth for "which workout is on screen right now".
 *
 * App renders from this, and passes the returned `dayKey` into every mutation
 * so they act on the same list.
 *
 * Training days are not tied to the calendar: any day of the week is a
 * training day until the week's sessions are done. The session on screen is
 * the next slot of the current week that has not been trained or skipped, so
 * missing a Monday just means Session 1 is still waiting on Tuesday.
 *
 * It is a "rest day" (week cleared) only when every session of the current
 * week is in, or the next program week has not begun yet. The user can still
 * choose to train then (`overrideRestDay`).
 *
 * @param {object}  state
 * @param {object}  opts
 * @param {boolean} opts.overrideRestDay  user chose to train after clearing the week
 * @param {Date}    opts.now              injectable for tests
 */
export function resolveSession(state, { overrideRestDay = false, now = new Date() } = {}) {
  const sorted = sortedTrainingDays(state);
  const wp = state?.weekProgress?.[state?.currentWeek];
  const todayStr = now.toDateString();

  // A session already logged today stays on screen for the rest of the day,
  // rather than jumping to the next one the moment it is finished.
  const loggedToday = (wp?.sessions || []).filter(s => s?.date === todayStr && s.dayKey);

  const done = new Set(trainedSlots(wp) || []);
  const skipped = new Set(wp?.skippedDays || []);
  const open = sorted.filter(d => !done.has(d) && !skipped.has(d));

  const startMs = state?.currentWeekStartDate ? midnightMs(state.currentWeekStartDate) : NaN;
  const weekNotStarted = !isNaN(startMs) && startMs > midnightMs(now);

  let dayKey;
  let weekCleared = false;
  if (loggedToday.length) {
    dayKey = loggedToday[loggedToday.length - 1].dayKey;
  } else {
    weekCleared = !!wp?.completed || weekNotStarted || open.length === 0;
    dayKey = open[0] ?? sorted[0];
  }

  const template = templateForDay(state, dayKey);

  // Legacy fallback: users from before templates existed only have a flat list.
  const exercises = template?.exercises?.length
    ? template.exercises
    : (state?.activeExercises?.length ? state.activeExercises : EXERCISES);

  const title = template?.title
    ?? (weekCleared ? `NEXT SESSION — ${slotLabel(state, dayKey).toUpperCase()}` : null);

  return {
    dayKey,
    exercises,
    title,
    source: template?.source ?? (state?.activeExercises?.length ? 'activeExercises' : 'default'),
    isRestDay: weekCleared,
    weekNotStarted,
    // Whether logging is currently allowed against this session.
    isTrainable: !weekCleared || overrideRestDay,
    nextTrainingDayKey: dayKey,
  };
}

/**
 * Exercises for an arbitrary training day — used by the backfill / make-up
 * flows, which log a day other than today.
 */
export function exercisesForDay(state, dayKey) {
  const template = templateForDay(state, dayKey);
  if (template?.exercises?.length) return template.exercises;
  if (state?.activeExercises?.length) return state.activeExercises;
  return EXERCISES;
}
