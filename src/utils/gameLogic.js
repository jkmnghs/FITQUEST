import { PHASES, RANKS, ACHIEVEMENTS } from '../data/gameData';

export function today() {
  return new Date().toDateString();
}

export function getPhase(week) {
  if (week <= 3) return PHASES[0];
  if (week === 4) return PHASES[1]; // Deload
  if (week <= 7) return PHASES[2];
  if (week === 8) return PHASES[3]; // Deload
  if (week <= 11) return PHASES[4];
  return PHASES[5]; // Deload/Review
}

/** Check if a given week is a deload week */
export function isDeloadWeek(week) {
  return week === 4 || week === 8 || week === 12;
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

// ── Daily XP Cap with Diminishing Returns (Phase 2.1) ──
const DAILY_XP_CAP = 150;

export function calculateSessionXP(session, dailySessionCount) {
  const baseXP = 50;
  const setXP = (session.setsCompleted || 0) * 5;
  const raw = baseXP + setXP;
  // Diminishing returns per session
  const multiplier = dailySessionCount === 1 ? 1.0
                   : dailySessionCount === 2 ? 0.5
                   : 0.1;  // 3rd+ session is nearly worthless
  return Math.min(DAILY_XP_CAP, Math.round(raw * multiplier));
}

// ── Adherence-based XP (Phase 2.2) ──
export function calculateAdherenceXP(session, weeklyState, program) {
  let xp = 0;
  const reasons = [];

  // Prescribed session completed
  if (session.matchesPrescribedDay) {
    xp += 40;
    reasons.push('+40 XP: Prescribed session completed');
  }

  // RPE quality (average RPE in target range 6-9)
  if (session.avgRPE >= 6 && session.avgRPE <= 9) {
    xp += 20;
    reasons.push('+20 XP: Training intensity on target');
  }

  // Progressive overload achieved on any exercise
  if (session.overloadAchieved) {
    xp += 30;
    reasons.push('+30 XP: Progressive overload achieved!');
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

export function getWeightForExercise(ex, week, liftWeights) {
  const base = liftWeights[ex.id] ?? ex.startKg;
  if (isDeloadWeek(week)) return Math.round(base * 0.8 * 2) / 2; // deload: 80%
  return base;
}

export function getSetsForWeek(ex, week) {
  if (isDeloadWeek(week)) return Math.max(1, ex.sets - 1); // deload: drop 1 set
  return ex.sets;
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
