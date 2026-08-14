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
function templateForDay(state, dayKey) {
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
 * The single source of truth for "which workout is on screen right now".
 *
 * App renders from this, and passes the returned `dayKey` into every mutation
 * so they act on the same list. Previously the UI resolved the session one way
 * and useGameState's swap/delete/complete/finish each re-derived it from
 * `new Date().getDay()`. On a rest day the UI shows the *next* training day's
 * template and "SKIP & TRAIN" lets the user train it — but the mutations looked
 * up today's (empty) template and silently fell through to activeExercises, so
 * swap and delete appeared to do nothing and completion % was scored against a
 * different list than the one displayed.
 *
 * @param {object}  state
 * @param {object}  opts
 * @param {boolean} opts.overrideRestDay  user chose to train on a rest day
 * @param {Date}    opts.now              injectable for tests
 */
export function resolveSession(state, { overrideRestDay = false, now = new Date() } = {}) {
  const today = todayDayKey(now);
  const trainingDays = state?.trainingDays?.length ? state.trainingDays : ['mon', 'wed', 'fri'];
  const isTrainingDay = trainingDays.includes(today);

  // On a rest day we preview (or, with the override, train) the next session.
  const isRestDay = !isTrainingDay;
  const dayKey = isTrainingDay ? today : nextTrainingDayAfter(state, today);

  const template = templateForDay(state, dayKey);

  // Legacy fallback: users from before templates existed only have a flat list.
  const exercises = template?.exercises?.length
    ? template.exercises
    : (state?.activeExercises?.length ? state.activeExercises : EXERCISES);

  const title = template?.title
    ?? (isRestDay ? `NEXT SESSION — ${DAY_ABBR[dayKey]}` : null);

  return {
    dayKey,
    exercises,
    title,
    source: template?.source ?? (state?.activeExercises?.length ? 'activeExercises' : 'default'),
    isRestDay,
    // Whether logging is currently allowed against this session.
    isTrainable: isTrainingDay || overrideRestDay,
    nextTrainingDayKey: nextTrainingDayAfter(state, today),
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
