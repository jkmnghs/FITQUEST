import { PHASES, RANKS, ACHIEVEMENTS } from '../data/gameData';
import { DAY_ORDER, exercisesForDay } from './session';

export function today() {
  return new Date().toDateString();
}

/**
 * The day after today, in the same format as today().
 *
 * A program week that ends because its last session was just logged must begin
 * the *following* day. Anchoring the new week to the same day stamped a
 * training day as the week's start, so from the next day onward that weekday
 * sat in the past with nothing recorded against it and the week strip showed
 * it as missed — for a session the user had actually completed.
 */
export function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toDateString();
}

/** Midnight timestamp for a date in any of the formats the log has used. */
export function midnightOf(value) {
  // `new Date(null)` is the epoch, not an error. Letting that through would
  // hand the week roll-over a 1970 anchor and march it through five decades
  // of weeks, so an absent date is unreadable rather than very old.
  if (value == null || value === '') return NaN;
  const d = new Date(value);
  if (isNaN(d)) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Program week calendar ────────────────────────────────────────────────
//
// A program week is seven calendar days long, anchored to
// `state.currentWeekStartDate`. Completing the prescribed number of sessions
// closes a week early; running out of days closes it too. Before
// `rollElapsedWeeks` existed only the first of those happened, so a single
// missed training day pinned the user to a week for ever: the calendar moved
// on, the week strip kept showing the old week's sessions, and the day the
// user was actually training read as one that had already been trained.
export const WEEK_LENGTH_DAYS = 7;

/** `date` shifted by `n` days, normalised to local midnight (DST-safe). */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight on which the given program week starts. */
export function startOfProgramWeek(state, week, now = new Date()) {
  const startMs = midnightOf(state?.currentWeekStartDate);
  const base = Number.isNaN(startMs) ? midnightOf(now) : startMs;
  return addDays(base, (week - (state?.currentWeek || 1)) * WEEK_LENGTH_DAYS);
}

/**
 * The program week today's training belongs to.
 *
 * A week that closes mid-day anchors the next one to *tomorrow*, so until that
 * date arrives today still belongs to the week that just closed. Showing the
 * new (empty) week instead is what made a session vanish the moment it
 * completed a week — the ring went back to zero and the day lost its tick, so
 * a session that had just been banked read as never logged.
 */
export function weekForToday(state, now = new Date()) {
  const week = state?.currentWeek || 1;
  const startMs = midnightOf(state?.currentWeekStartDate);
  const todayMs = midnightOf(now);
  if (Number.isNaN(startMs) || Number.isNaN(todayMs)) return week;
  return todayMs < startMs && week > 1 ? week - 1 : week;
}

/** Remove a single occurrence of `value`, leaving parallel history intact. */
function removeOnce(arr, value) {
  const out = [...(arr || [])];
  const i = out.lastIndexOf(value);
  if (i !== -1) out.splice(i, 1);
  return out;
}

function emptyWeek() {
  return { count: 0, dates: [], completedDays: [], skippedDays: [], sessions: [], completed: false };
}

/**
 * Close every program week whose seven calendar days have run out.
 *
 * Two rules, both deliberate:
 *
 * - A week that holds something (a session, or a day written off as skipped)
 *   is closed as it stands — incomplete if the user missed a day — and the
 *   program moves to the next week. The missed day stays on the closed week,
 *   where it can still be backfilled or marked skipped.
 * - A week with nothing recorded at all is *not* advanced past. Someone who
 *   stops training for a month should come back to the week they left, not be
 *   marched through the deload and peaking blocks they never trained. Its
 *   anchor slides forward instead, so the strip shows the days ahead of them
 *   rather than a row of misses.
 *
 * Sessions logged after a week's window closed are moved onto the week they
 * actually belong to. Without that, a week the app failed to roll carries two
 * calendar weeks of sessions, and the new week opens looking untrained.
 */
export function rollElapsedWeeks(state, now = new Date()) {
  const todayMs = midnightOf(now);
  let startMs = midnightOf(state?.currentWeekStartDate);
  if (Number.isNaN(todayMs) || Number.isNaN(startMs)) return state;

  const sessionsNeeded = state?.sessionsPerWeek || 3;
  let currentWeek = state?.currentWeek || 1;
  let weekProgress = state?.weekProgress || {};
  let changed = false;

  // Bounded so a corrupt anchor can never spin: 520 weeks is ten years.
  for (let guard = 0; guard < 520; guard++) {
    const nextStartMs = addDays(startMs, WEEK_LENGTH_DAYS).getTime();
    if (todayMs < nextStartMs) break;

    const wp = weekProgress[currentWeek];
    const hasRecord = (wp?.count || 0) > 0
      || (wp?.sessions?.length || 0) > 0
      || (wp?.skippedDays?.length || 0) > 0;

    if (!hasRecord) {
      startMs = nextStartMs;
      changed = true;
      continue;
    }

    const sessions = wp.sessions || [];
    const carried = sessions.filter(s => {
      const ms = midnightOf(s?.date);
      return !Number.isNaN(ms) && ms >= nextStartMs;
    });
    const closing = { ...emptyWeek(), ...wp, sessions: sessions.filter(s => !carried.includes(s)) };
    carried.forEach(s => {
      closing.dates = removeOnce(closing.dates, s.date);
      if (s.dayKey) closing.completedDays = removeOnce(closing.completedDays, s.dayKey);
    });
    closing.count = Math.max(0, (wp.count || 0) - carried.length);
    closing.completed = closing.count + (closing.skippedDays?.length || 0) >= sessionsNeeded;

    weekProgress = { ...weekProgress, [currentWeek]: closing };

    if (carried.length > 0) {
      const nextWp = { ...emptyWeek(), ...(weekProgress[currentWeek + 1] || {}) };
      nextWp.count = (nextWp.count || 0) + carried.length;
      nextWp.dates = [...nextWp.dates, ...carried.map(s => s.date).filter(Boolean)];
      nextWp.completedDays = [...nextWp.completedDays, ...carried.map(s => s.dayKey).filter(Boolean)];
      nextWp.sessions = [...nextWp.sessions, ...carried];
      nextWp.completed = nextWp.count + (nextWp.skippedDays?.length || 0) >= sessionsNeeded;
      weekProgress = { ...weekProgress, [currentWeek + 1]: nextWp };
    }

    currentWeek += 1;
    startMs = nextStartMs;
    changed = true;
  }

  if (!changed) return state;
  return {
    ...state,
    currentWeek,
    weekProgress,
    currentWeekStartDate: new Date(startMs).toDateString(),
  };
}

/**
 * Bank a session the user logged but never tapped FINISH on.
 *
 * The logged sets are the source of truth that the session happened. Until
 * now the day rollover simply threw them away: someone who worked through a
 * session, left one or two exercises out and closed the app came back to a
 * training day recorded as never logged, and — because the week counts
 * sessions, not exercises — to a program week that could never complete.
 *
 * Missed exercises do not make a session unfinished. The session is recorded
 * with the completion percentage it actually reached, exactly as FINISH would
 * have recorded it. Only the finish bonus is withheld: per-exercise XP was
 * already granted as each exercise was logged, and the bonus is paid for
 * closing the session out.
 */
export function commitUnfinishedSession(state, now = new Date()) {
  const done = state?.todayExDone || [];
  if (done.length === 0 || state?.todaySessionFinished) return state;

  const dayMs = midnightOf(state?.todayExDate);
  const todayMs = midnightOf(now);
  // Only once the day is actually over — an in-progress session is not late.
  if (Number.isNaN(dayMs) || Number.isNaN(todayMs) || dayMs >= todayMs) return state;

  const week = state.currentWeek || 1;
  const dayDate = new Date(dayMs);
  const dayKey = DAY_ORDER[dayDate.getDay()];
  const dateStr = dayDate.toDateString();

  const wp = { ...emptyWeek(), ...(state.weekProgress?.[week] || {}) };
  // Never record the same day twice — it may already have been backfilled.
  if ((wp.sessions || []).some(s => s?.date === dateStr)) return state;

  const totalEx = exercisesForDay(state, dayKey).length || done.length;
  const completion = Math.round((done.length / totalEx) * 100);
  const sessionsNeeded = state.sessionsPerWeek || 3;

  const count = (wp.count || 0) + 1;
  const nextWp = {
    ...wp,
    count,
    dates: [...wp.dates, dateStr],
    completedDays: [...wp.completedDays, dayKey],
    sessions: [...wp.sessions, { date: dateStr, dayKey, exercisesDone: [...done], completion }],
    completed: count + (wp.skippedDays?.length || 0) >= sessionsNeeded,
  };

  const logEntry = {
    name: `Session ${count}/${sessionsNeeded} • ${done.length}/${totalEx} exercises (${completion}%) [auto-recorded]`,
    xp: 0,
    date: dateStr,
    type: 'session',
    week,
    dateStr: dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    exerciseDetails: { ...(state.todayExDetails || {}) },
    exercisesDone: [...done],
    dayKey,
  };

  return {
    ...state,
    weekProgress: { ...state.weekProgress, [week]: nextWp },
    totalSessions: (state.totalSessions || 0) + 1,
    perfectWeeks: nextWp.completed && !wp.completed
      ? (state.perfectWeeks || 0) + 1
      : state.perfectWeeks,
    log: [...(state.log || []), logEntry],
  };
}

export function getPhase(week) {
  const w = ((week - 1) % 12) + 1; // map any week into the 1-12 cycle
  if (w <= 3) return PHASES[0];
  if (w === 4) return PHASES[1]; // Deload
  if (w <= 7) return PHASES[2];
  if (w === 8) return PHASES[3]; // Deload
  if (w <= 11) return PHASES[4];
  return PHASES[5]; // Deload/Review
}

/** Check if a given week is a deload week */
export function isDeloadWeek(week) {
  const w = ((week - 1) % 12) + 1;
  return w === 4 || w === 8 || w === 12;
}

export function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) rank = r;
  return rank;
}

// ── New exponential XP curve (Phase 2.3) ──
export function xpForLevel(level) {
  return Math.round(60 * Math.pow(1.18, level));
}

export function xpToLevel(targetLevel) {
  let total = 0;
  for (let l = 1; l < targetLevel; l++) total += xpForLevel(l);
  return total;
}

/**
 * Exact inverse of applyXP: takes back an award that was already banked.
 *
 * Deliberately relative to the caller's current level rather than recomputed
 * from totalXp. The XP curve has changed at least once (see "New exponential
 * XP curve" above), so an account created under the old curve can hold a
 * level and a totalXp that the current curve would never produce together.
 * Re-deriving level from totalXp would silently restate those users' rank —
 * in testing a level 6 / 3120 XP account jumped to level 14 on the first
 * reset. Unwinding only what was added leaves that history untouched.
 */
export function removeXP(state, amount) {
  let { xp, totalXp, level } = state;
  const remove = Math.max(0, Math.round(Number(amount) || 0));
  totalXp = Math.max(0, (totalXp || 0) - remove);
  xp = (xp || 0) - remove;
  // Mirror of applyXP's level-up loop: it consumed xpForLevel(level) to climb,
  // so descending gives the same amount back.
  while (xp < 0 && level > 1) {
    level--;
    xp += xpForLevel(level);
  }
  if (xp < 0) xp = 0;
  return { xp, totalXp, level };
}

// ── Daily XP Cap ──
// 500 allows a competitive bodybuilder completing 7-8 exercises to earn meaningful XP
// throughout the full session without hitting the cap mid-workout.
export const DAILY_XP_CAP = 500;

export function calculateSessionXP(session, dailySessionCount) {
  const baseXP = 50;
  const setXP = (session.setsCompleted || 0) * 5;
  const raw = baseXP + setXP;
  const multiplier = dailySessionCount === 1 ? 1.0
                   : dailySessionCount === 2 ? 0.5
                   : 0.1;
  return Math.min(DAILY_XP_CAP, Math.round(raw * multiplier));
}

// ── Per-exercise adherence XP (Phase 2.2) ──
// Intentionally small so the daily cap isn't exhausted after 2 exercises.
// Session-level bonuses (prescribed day, RPE) are awarded in finishSession.
export function calculateAdherenceXP(session, weeklyState, program) {
  let xp = 0;
  const reasons = [];

  // Small per-exercise base for showing up on a prescribed day
  if (session.matchesPrescribedDay) {
    xp += 10;
    reasons.push('+10 XP: Training day');
  }

  // RPE quality bonus — per exercise
  if (session.avgRPE >= 6 && session.avgRPE <= 9) {
    xp += 8;
    reasons.push('+8 XP: Good intensity');
  }

  // Progressive overload is per-exercise (you either beat your PR or not)
  if (session.overloadAchieved) {
    xp += 20;
    reasons.push('+20 XP: Progressive overload!');
  }

  // Overtraining penalty
  const sessionsThisWeek = weeklyState.completedSessions || 0;
  const prescribed = program?.daysPerWeek || program?.sessionsPerWeek || 3;
  if (sessionsThisWeek > prescribed + 1) {
    xp = Math.round(xp * 0.1);
    reasons.push('XP reduced: Exceeding prescribed frequency');
  }

  return { xp: Math.min(xp, DAILY_XP_CAP), reasons };
}

// ── Overtraining Detection (Phase 2.4) ──
export function overtrainingCheck(weeklyState, programFrequency) {
  const sessions = weeklyState.completedSessions || 0;
  if (sessions > programFrequency + 2) {
    return {
      status: 'blocked',
      xpMultiplier: 0,
      message: 'Rest is when muscles grow. No XP for extra sessions.'
    };
  }
  if (sessions > programFrequency + 1) {
    return {
      status: 'warning',
      xpMultiplier: 0.5,
      message: 'Your body needs recovery. Reduced XP for extra session.'
    };
  }
  if (sessions > programFrequency) {
    return {
      status: 'caution',
      xpMultiplier: 0.75,
      message: 'One extra session is fine occasionally. Slightly reduced XP.'
    };
  }
  return { status: 'ok', xpMultiplier: 1.0, message: null };
}

// ── Rest Day XP ──
export function calculateRestDayXP(isTrainingDay, didWorkOut) {
  if (!isTrainingDay && !didWorkOut) {
    return { xp: 15, reason: '+15 XP: Rest day honored' };
  }
  return { xp: 0, reason: null };
}

// AI-generated and hand-authored templates can omit fields the UI reads.
// Without these guards a missing startKg rendered "NaN kg" on the card and a
// missing `sets` produced an exercise modal with zero rows to log into.
export const DEFAULT_SETS = 3;

export function getWeightForExercise(ex, week, liftWeights) {
  const raw = liftWeights?.[ex?.id] ?? ex?.startKg;
  const base = Number.isFinite(Number(raw)) ? Number(raw) : 0;
  if (isDeloadWeek(week)) return Math.round(base * 0.8 * 2) / 2; // deload: 80%
  return base;
}

export function getSetsForWeek(ex, week) {
  const raw = Number(ex?.sets);
  const sets = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : DEFAULT_SETS;
  if (isDeloadWeek(week)) return Math.max(1, sets - 1); // deload: drop 1 set
  return sets;
}

export function convertWeight(kg, unit) {
  if (unit === 'lbs') return Math.round(kg * 2.205 * 10) / 10;
  return kg;
}

export function kgFromDisplay(val, unit) {
  if (unit === 'lbs') return val / 2.205;
  return val;
}

export function checkAchievements(state) {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!state.achDone.includes(ach.id) && ach.check(state)) {
      newlyUnlocked.push(ach.id);
    }
  }
  return newlyUnlocked;
}

export function applyXP(state, amount) {
  let { xp, totalXp, level } = state;
  xp += amount;
  totalXp += amount;
  let leveledUp = false;
  let n = xpForLevel(level);
  while (xp >= n) {
    xp -= n;
    level++;
    n = xpForLevel(level);
    leveledUp = true;
  }
  return { xp, totalXp, level, leveledUp };
}

export function updateStreak(state) {
  const t = today();
  if (state.lastDate === t) return state; // already updated today

  // Calculate calendar-day gap between last session and today.
  // Allow up to 3 days so normal rest days (e.g. Mon→Wed, Fri→Mon) don't
  // break the streak. Gap > 3 means a session was genuinely skipped.
  let daysSinceLast = Infinity;
  if (state.lastDate) {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const lastMidnight = new Date(state.lastDate); lastMidnight.setHours(0, 0, 0, 0);
    daysSinceLast = Math.round((todayMidnight - lastMidnight) / 864e5);
  }
  const streak = daysSinceLast <= 3 ? state.streak + 1 : 1;
  const bestStreak = Math.max(streak, state.bestStreak);
  return { ...state, streak, bestStreak, lastDate: t };
}

export function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatElapsed(startTime) {
  if (!startTime) return '00:00';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
