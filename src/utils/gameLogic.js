import { PHASES, RANKS, ACHIEVEMENTS } from '../data/gameData';

export function today() {
  return new Date().toDateString();
}

export function getPhase(week) {
  if (week <= 2) return PHASES[0];
  if (week <= 8) return PHASES[1];
  if (week === 9) return PHASES[2];
  return PHASES[3];
}

export function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) rank = r;
  return rank;
}

export function xpForLevel(level) {
  return 80 + (level - 1) * 35;
}

export function getWeightForExercise(ex, week, liftWeights) {
  const base = liftWeights[ex.id] ?? ex.startKg;
  if (week === 9) return Math.round(base * 0.8 * 2) / 2; // deload
  return base;
}

export function getSetsForWeek(ex, week) {
  if (week === 9) return 2; // deload
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
