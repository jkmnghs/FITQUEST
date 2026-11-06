import { PHASES, RANKS, ACHIEVEMENTS } from '../data/gameData';

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

/**
 * The next Monday strictly after `now`, in the same format as today().
 *
 * Program weeks run Monday to Sunday. A week that closes early starts its
 * successor on the coming Monday; anchoring it to tomorrow() drifted every
 * later week off the calendar, so "the week ended" on some Thursday instead
 * of when the user's week actually turned over.
 */
export function nextMonday(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toDateString();
}

/** Monday of the calendar week containing `now`, in the same format as today(). */
export function startOfThisWeek(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toDateString();
}

/** Midnight timestamp for a date in any of the formats the log has used. */
export function midnightOf(value) {
  const d = new Date(value);
  if (isNaN(d)) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
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

/** Midnight timestamp of the Monday of the calendar week containing `value`. */
function mondayMs(value) {
  const d = new Date(midnightOf(value));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Distinct calendar days with a logged session in [fromMs, toMs). */
export function trainingDaysBetween(state, fromMs, toMs) {
  const days = new Set();
  for (const wp of Object.values(state?.weekProgress || {})) {
    for (const d of [...(wp?.dates || []), ...(wp?.sessions || []).map(s => s?.date)]) {
      const t = midnightOf(d);
      if (!isNaN(t) && t >= fromMs && t < toMs) days.add(t);
    }
  }
  const last = state?.lastDate ? midnightOf(state.lastDate) : NaN;
  if (!isNaN(last) && last >= fromMs && last < toMs) days.add(last);
  return days.size;
}

/**
 * Whether the streak has lapsed, judged by the week rather than the day.
 *
 * Training days are flexible: any day counts, as long as the week's sessions
 * (sessionsPerWeek) are in by Sunday. So the streak survives any gap between
 * sessions inside a week, and only breaks when
 * - a whole calendar week (Mon–Sun) went by with no session at all, or
 * - the week of the last session ended short of the weekly target.
 *
 * The week a streak starts in gets a pass: someone who starts on a Saturday
 * can't fit three sessions before Sunday. That is the case when every session
 * in the streak falls inside that week.
 */
export function isStreakBroken(state, now = new Date()) {
  if (!(state?.streak > 0) || !state.lastDate) return false;
  const lastMs = midnightOf(state.lastDate);
  if (isNaN(lastMs)) return false;

  const lastMon = mondayMs(lastMs);
  const weeksSince = Math.round((mondayMs(now) - lastMon) / (7 * 864e5));
  if (weeksSince <= 0) return false;
  if (weeksSince >= 2) return true;

  const weekEnd = new Date(lastMon);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const trained = trainingDaysBetween(state, lastMon, weekEnd.getTime());
  const target = state.sessionsPerWeek || 3;
  const streakStartedThatWeek = state.streak <= trained;
  return trained < target && !streakStartedThatWeek;
}

/**
 * Count a session toward the streak (once per calendar day). The streak counts
 * training days; it keeps going as long as every week hits its sessions.
 */
export function updateStreak(state) {
  const t = today();
  if (state.lastDate === t) return state; // already updated today

  const streak = isStreakBroken(state) ? 1 : (state.streak || 0) + 1;
  const bestStreak = Math.max(streak, state.bestStreak || 0);
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
