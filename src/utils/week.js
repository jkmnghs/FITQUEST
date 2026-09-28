import { midnightOf } from './gameLogic';
import { DAY_ORDER } from './session';

const DAY_SHORT = { mon: 'M', tue: 'Tu', wed: 'W', thu: 'Th', fri: 'F', sat: 'Sa', sun: 'Su' };
const DAY_MS = 864e5;

/** Calendar days trained in a week, from completedDays and session records. */
function trainedDays(wp) {
  const fromSessions = (wp?.sessions || [])
    .map(s => s.dayKey || (s.date ? DAY_ORDER[new Date(s.date).getDay()] : null))
    .filter(Boolean);
  if (fromSessions.length === 0) return wp?.completedDays || null;
  return [...new Set([...(wp.completedDays || []), ...fromSessions])];
}

/**
 * Resolves each training day in the viewed week to done / skipped / current.
 *
 * Skipped is calendar-aware: a day only counts as missed once its actual date
 * has passed, anchored to `state.currentWeekStartDate` rather than re-inferred
 * from session data (inferring it pushed earlier skipped days into next week
 * whenever the first training day of a week was missed).
 */
export function resolveWeekDays(state, viewingWeek, sortedTrainingDays, now = new Date()) {
  const wp = state.weekProgress?.[viewingWeek] || { count: 0, sessions: [] };
  const isCurrentWeek = viewingWeek === state.currentWeek;
  const resolvedDays = trainedDays(wp);

  const todayOrd = now.getDay();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const weekStartDate = new Date(todayMidnight);
  const startMs = state.currentWeekStartDate ? midnightOf(state.currentWeekStartDate) : NaN;
  if (!isNaN(startMs)) weekStartDate.setTime(startMs);
  const weekStartOrd = weekStartDate.getDay();

  // Cursor = first undone training day at or after today, so skipped past days
  // don't hold it hostage.
  const currentDayId = (isCurrentWeek && !wp.completed)
    ? sortedTrainingDays.find(d => {
        const done = resolvedDays ? resolvedDays.includes(d) : false;
        return DAY_ORDER.indexOf(d) >= todayOrd && !done;
      }) ?? null
    : null;

  const explicitlySkipped = new Set(wp.skippedDays || []);
  const weekIsPast = viewingWeek < state.currentWeek;

  return sortedTrainingDays.map((dayKey, i) => {
    const done = resolvedDays ? resolvedDays.includes(dayKey) : i < wp.count;
    const daysFromStart = (DAY_ORDER.indexOf(dayKey) - weekStartOrd + 7) % 7;
    const trainingDayDate = new Date(weekStartDate);
    trainingDayDate.setDate(weekStartDate.getDate() + daysFromStart);
    return {
      dayKey,
      label: DAY_SHORT[dayKey] || dayKey,
      done,
      // A training day counts as missed when the user said so, or when the
      // week it belongs to is behind us. The old rule was gated on
      // isCurrentWeek alone, so last week's missed Wednesday rendered as a
      // plain grey pill — indistinguishable from a day still to come, and
      // with nothing to tap.
      skipped: !done && (
        explicitlySkipped.has(dayKey)
        || weekIsPast
        || (isCurrentWeek && trainingDayDate < todayMidnight)
      ),
      markedSkipped: explicitlySkipped.has(dayKey),
      current: dayKey === currentDayId,
    };
  });
}

/**
 * Close the current program week once its seven calendar days are over.
 *
 * A week only advanced when enough sessions (or skips) were logged. Miss one
 * day and the week never closed: currentWeek and currentWeekStartDate stayed
 * put, so the following calendar week was still read against the old start
 * date — every training day in it resolved to a date already behind us and
 * rendered as ✗ before the user had a chance to train, and whatever they did
 * log landed in the old week.
 *
 * Now the untrained days of an elapsed week are recorded as skipped (no
 * session, XP or streak credited — the same honest close markDaySkipped
 * offers) and the program moves on by exactly one week. The new week is
 * anchored to the start of the seven-day window today falls in, so its days
 * line up with the real calendar even after a long absence, instead of
 * burning several program weeks the user never trained.
 */
export function closeElapsedWeek(state, sortedTrainingDays, now = new Date()) {
  const week = state.currentWeek;
  const wp = state.weekProgress?.[week];
  if (wp?.completed) return state;

  const startMs = state.currentWeekStartDate ? midnightOf(state.currentWeekStartDate) : NaN;
  if (isNaN(startMs)) return state;

  const todayMs = midnightOf(now);
  const daysElapsed = Math.round((todayMs - startMs) / DAY_MS);
  if (daysElapsed < 7) return state;

  const trained = trainedDays(wp) || [];
  const skippedDays = [...new Set([
    ...(wp?.skippedDays || []),
    ...sortedTrainingDays.filter(d => !trained.includes(d)),
  ])];

  const newStart = new Date(startMs);
  newStart.setDate(newStart.getDate() + Math.floor(daysElapsed / 7) * 7);

  return {
    ...state,
    weekProgress: {
      ...state.weekProgress,
      [week]: {
        count: 0, dates: [], sessions: [], completedDays: [],
        ...wp,
        skippedDays,
        completed: true,
        autoClosed: true,
      },
    },
    currentWeek: week + 1,
    currentWeekStartDate: newStart.toDateString(),
  };
}
