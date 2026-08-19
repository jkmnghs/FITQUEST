import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  xpForLevel,
  xpToLevel,
  removeXP,
  today,
  tomorrow,
  midnightOf,
  getRank,
  getPhase,
  applyXP,
  updateStreak,
  checkAchievements,
  convertWeight,
  kgFromDisplay,
  getWeightForExercise,
  getSetsForWeek,
  formatElapsed,
  calculateSessionXP,
  calculateAdherenceXP,
  overtrainingCheck,
  isDeloadWeek,
  calculateRestDayXP,
  DAILY_XP_CAP,
} from '../gameLogic';

// ---------------------------------------------------------------------------
// xpForLevel — new exponential curve (Phase 2.3)
// ---------------------------------------------------------------------------
describe('xpForLevel', () => {
  it('level 1 ~ 71 XP (exponential curve)', () => {
    expect(xpForLevel(1)).toBe(Math.round(60 * Math.pow(1.18, 1)));
  });

  it('each level requires more XP than the previous (exponential)', () => {
    for (let l = 2; l <= 20; l++) {
      expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
    }
  });

  it('level 20 ~ 1720 XP (requires sustained effort)', () => {
    const xp20 = xpForLevel(20);
    expect(xp20).toBeGreaterThan(1500);
    expect(xp20).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// xpToLevel
// ---------------------------------------------------------------------------
describe('xpToLevel', () => {
  it('xpToLevel(1) is 0 — no XP needed to be at level 1', () => {
    expect(xpToLevel(1)).toBe(0);
  });

  it('xpToLevel(2) equals xpForLevel(1)', () => {
    expect(xpToLevel(2)).toBe(xpForLevel(1));
  });

  it('xpToLevel(3) equals sum of levels 1 and 2', () => {
    expect(xpToLevel(3)).toBe(xpForLevel(1) + xpForLevel(2));
  });

  it('xpToLevel is strictly cumulative', () => {
    let cumulative = 0;
    for (let l = 1; l <= 10; l++) {
      expect(xpToLevel(l)).toBe(cumulative);
      cumulative += xpForLevel(l);
    }
  });
});

// ---------------------------------------------------------------------------
// getRank — updated thresholds (Phase 2.3)
// ---------------------------------------------------------------------------
describe('getRank', () => {
  it('level 1 → Novice (E)', () => {
    expect(getRank(1)).toMatchObject({ l: 'E', name: 'Novice' });
  });

  it('level 3 → still Novice (below threshold of 4)', () => {
    expect(getRank(3)).toMatchObject({ l: 'E', name: 'Novice' });
  });

  it('level 4 → Apprentice (D)', () => {
    expect(getRank(4)).toMatchObject({ l: 'D', name: 'Apprentice' });
  });

  it('level 7 → Warrior (C)', () => {
    expect(getRank(7)).toMatchObject({ l: 'C', name: 'Warrior' });
  });

  it('level 11 → Champion (B)', () => {
    expect(getRank(11)).toMatchObject({ l: 'B', name: 'Champion' });
  });

  it('level 16 → Elite (A)', () => {
    expect(getRank(16)).toMatchObject({ l: 'A', name: 'Elite' });
  });

  it('level 20 → Legendary (S)', () => {
    expect(getRank(20)).toMatchObject({ l: 'S', name: 'Legendary' });
  });

  it('level 99 → still Legendary (no cap)', () => {
    expect(getRank(99)).toMatchObject({ l: 'S', name: 'Legendary' });
  });
});

// ---------------------------------------------------------------------------
// getPhase — new deload schedule (Phase 4.1)
// ---------------------------------------------------------------------------
describe('getPhase', () => {
  it('weeks 1-3 → PHASE 1 (Adaptation)', () => {
    expect(getPhase(1).name).toBe('PHASE 1');
    expect(getPhase(3).name).toBe('PHASE 1');
  });

  it('week 4 → DELOAD', () => {
    expect(getPhase(4).name).toBe('DELOAD');
  });

  it('weeks 5-7 → PHASE 2 (Hypertrophy)', () => {
    expect(getPhase(5).name).toBe('PHASE 2');
    expect(getPhase(7).name).toBe('PHASE 2');
  });

  it('week 8 → DELOAD', () => {
    expect(getPhase(8).name).toBe('DELOAD');
  });

  it('weeks 9-11 → PHASE 3 (Strength/Peak)', () => {
    expect(getPhase(9).name).toBe('PHASE 3');
    expect(getPhase(11).name).toBe('PHASE 3');
  });

  it('week 12 → DELOAD (final)', () => {
    expect(getPhase(12).name).toBe('DELOAD');
  });
});

// ---------------------------------------------------------------------------
// isDeloadWeek
// ---------------------------------------------------------------------------
describe('isDeloadWeek', () => {
  it('weeks 4, 8, 12 are deload weeks', () => {
    expect(isDeloadWeek(4)).toBe(true);
    expect(isDeloadWeek(8)).toBe(true);
    expect(isDeloadWeek(12)).toBe(true);
  });

  it('other weeks are not deload weeks', () => {
    expect(isDeloadWeek(1)).toBe(false);
    expect(isDeloadWeek(3)).toBe(false);
    expect(isDeloadWeek(5)).toBe(false);
    expect(isDeloadWeek(9)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateSessionXP (Phase 2.1)
// ---------------------------------------------------------------------------
describe('calculateSessionXP', () => {
  it('first session of the day gets full XP', () => {
    const xp = calculateSessionXP({ setsCompleted: 6 }, 1);
    expect(xp).toBe(Math.min(150, 50 + 6 * 5)); // 80
  });

  it('second session of the day gets 50% XP', () => {
    const xp = calculateSessionXP({ setsCompleted: 6 }, 2);
    expect(xp).toBe(Math.round((50 + 30) * 0.5)); // 40
  });

  it('third+ session gets 10% XP', () => {
    const xp = calculateSessionXP({ setsCompleted: 6 }, 3);
    expect(xp).toBe(Math.round((50 + 30) * 0.1)); // 8
  });

  it('daily XP never exceeds the cap', () => {
    const xp = calculateSessionXP({ setsCompleted: 50 }, 1);
    expect(xp).toBeLessThanOrEqual(DAILY_XP_CAP);
  });
});

// ---------------------------------------------------------------------------
// calculateAdherenceXP (Phase 2.2)
// ---------------------------------------------------------------------------
describe('calculateAdherenceXP', () => {
  it('prescribed session on target RPE with overload = 38 XP', () => {
    const { xp, reasons } = calculateAdherenceXP(
      { matchesPrescribedDay: true, avgRPE: 7, overloadAchieved: true },
      { completedSessions: 1 },
      { sessionsPerWeek: 3 }
    );
    // Per-exercise award: 10 (training day) + 8 (RPE) + 20 (overload).
    // Session-level bonuses are added separately in finishSession.
    expect(xp).toBe(38);
    expect(reasons.length).toBe(3);
  });

  it('non-prescribed session with no overload = 0 XP', () => {
    const { xp } = calculateAdherenceXP(
      { matchesPrescribedDay: false, avgRPE: 5, overloadAchieved: false },
      { completedSessions: 1 },
      { sessionsPerWeek: 3 }
    );
    expect(xp).toBe(0);
  });

  it('exceeding prescribed+1 reduces XP to 10%', () => {
    const { xp, reasons } = calculateAdherenceXP(
      { matchesPrescribedDay: true, avgRPE: 7, overloadAchieved: true },
      { completedSessions: 5 }, // 5 sessions when prescribed is 3
      { sessionsPerWeek: 3 }
    );
    expect(xp).toBe(Math.round(38 * 0.1)); // 4
    expect(reasons).toContainEqual(expect.stringContaining('reduced'));
  });

  it('XP capped at 150', () => {
    const { xp } = calculateAdherenceXP(
      { matchesPrescribedDay: true, avgRPE: 7, overloadAchieved: true },
      { completedSessions: 0 },
      { sessionsPerWeek: 3 }
    );
    expect(xp).toBeLessThanOrEqual(150);
  });
});

// ---------------------------------------------------------------------------
// overtrainingCheck (Phase 2.4)
// ---------------------------------------------------------------------------
describe('overtrainingCheck', () => {
  it('at or below prescribed sessions = ok', () => {
    const result = overtrainingCheck({ completedSessions: 3 }, 3);
    expect(result.status).toBe('ok');
    expect(result.xpMultiplier).toBe(1.0);
  });

  it('prescribed+1 = caution with 0.75x', () => {
    const result = overtrainingCheck({ completedSessions: 4 }, 3);
    expect(result.status).toBe('caution');
    expect(result.xpMultiplier).toBe(0.75);
  });

  it('prescribed+2 = warning with 0.5x', () => {
    const result = overtrainingCheck({ completedSessions: 5 }, 3);
    expect(result.status).toBe('warning');
    expect(result.xpMultiplier).toBe(0.5);
  });

  it('prescribed+3 = blocked with 0x', () => {
    const result = overtrainingCheck({ completedSessions: 6 }, 3);
    expect(result.status).toBe('blocked');
    expect(result.xpMultiplier).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateRestDayXP
// ---------------------------------------------------------------------------
describe('calculateRestDayXP', () => {
  it('rest day honored awards 15 XP', () => {
    const { xp } = calculateRestDayXP(false, false);
    expect(xp).toBe(15);
  });

  it('working out on non-training day = 0 rest XP', () => {
    const { xp } = calculateRestDayXP(false, true);
    expect(xp).toBe(0);
  });

  it('training day = 0 rest XP', () => {
    const { xp } = calculateRestDayXP(true, false);
    expect(xp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyXP
// ---------------------------------------------------------------------------
describe('applyXP', () => {
  const baseState = { xp: 0, totalXp: 0, level: 1 };

  it('adding 0 XP changes nothing', () => {
    const result = applyXP(baseState, 0);
    expect(result).toMatchObject({ xp: 0, totalXp: 0, level: 1, leveledUp: false });
  });

  it('adding XP below threshold does not level up', () => {
    const result = applyXP(baseState, 50);
    expect(result).toMatchObject({ xp: 50, totalXp: 50, level: 1, leveledUp: false });
  });

  it('adding exact threshold XP levels up with 0 overflow', () => {
    const result = applyXP(baseState, xpForLevel(1)); // 80
    expect(result).toMatchObject({ xp: 0, level: 2, leveledUp: true });
  });

  it('XP overflows correctly into the next level', () => {
    const threshold = xpForLevel(1); // ~71
    const result = applyXP({ xp: threshold - 1, totalXp: threshold - 1, level: 1 }, 20);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(19); // (threshold-1)+20 - threshold = 19
    expect(result.leveledUp).toBe(true);
  });

  it('multi-level up: adding 500 XP from level 1 jumps several levels', () => {
    const result = applyXP(baseState, 500);
    expect(result.level).toBeGreaterThan(3);
    expect(result.leveledUp).toBe(true);
  });

  it('totalXp always increases by the exact amount regardless of level-ups', () => {
    const result = applyXP({ xp: 0, totalXp: 1000, level: 5 }, 250);
    expect(result.totalXp).toBe(1250);
  });

  it('totalXp accumulates across sequential calls', () => {
    let state = baseState;
    state = applyXP(state, 40);
    state = applyXP(state, 40);
    expect(state.totalXp).toBe(80);
  });

  it('leveledUp is false when not enough XP to cross threshold', () => {
    const result = applyXP(baseState, xpForLevel(1) - 1);
    expect(result.leveledUp).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateStreak
// ---------------------------------------------------------------------------
describe('updateStreak', () => {
  let dateSpy;

  function setFakeDate(dateStr) {
    const fakeDate = new Date(dateStr);
    dateSpy = vi.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) return fakeDate;
      return new (vi.importActual('global').Date)(...args);
    });
    // Ensure toDateString() works on the fake date
    fakeDate.toDateString = () => fakeDate.toString().split(' ').slice(0, 4).join(' ');
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calling updateStreak twice on the same day does not change streak', () => {
    const state = { streak: 3, bestStreak: 3, lastDate: new Date().toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(3);
  });

  it('first ever session sets streak to 1', () => {
    const state = { streak: 0, bestStreak: 0, lastDate: null };
    const result = updateStreak(state);
    expect(result.streak).toBe(1);
  });

  it('gap of 1 day increments streak', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const state = { streak: 5, bestStreak: 5, lastDate: yesterday.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(6);
  });

  it('gap of 2 days increments streak (within grace period)', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const state = { streak: 4, bestStreak: 4, lastDate: twoDaysAgo.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(5);
  });

  it('gap of 3 days increments streak (edge of grace period)', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const state = { streak: 2, bestStreak: 2, lastDate: threeDaysAgo.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(3);
  });

  it('gap of 4 days resets streak to 1', () => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const state = { streak: 10, bestStreak: 10, lastDate: fourDaysAgo.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(1);
  });

  it('gap of 30 days resets streak to 1', () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 30);
    const state = { streak: 8, bestStreak: 8, lastDate: longAgo.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(1);
  });

  it('bestStreak updates when new streak exceeds it', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const state = { streak: 9, bestStreak: 9, lastDate: yesterday.toDateString() };
    const result = updateStreak(state);
    expect(result.bestStreak).toBe(10);
  });

  it('bestStreak never decreases after a streak reset', () => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const state = { streak: 5, bestStreak: 15, lastDate: fourDaysAgo.toDateString() };
    const result = updateStreak(state);
    expect(result.streak).toBe(1);
    expect(result.bestStreak).toBe(15); // unchanged
  });

  it('lastDate is updated to today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const state = { streak: 1, bestStreak: 1, lastDate: yesterday.toDateString() };
    const result = updateStreak(state);
    expect(result.lastDate).toBe(new Date().toDateString());
  });
});

// ---------------------------------------------------------------------------
// checkAchievements
// ---------------------------------------------------------------------------
describe('checkAchievements', () => {
  const baseState = {
    achDone: [],
    totalSessions: 0,
    totalVolume: 0,
    bestStreak: 0,
    perfectWeeks: 0,
    level: 1,
    totalMinutes: 0,
    checkins: 0,
    deloadDone: false,
  };

  it('returns empty array when no achievements are newly qualified', () => {
    expect(checkAchievements(baseState)).toEqual([]);
  });

  it('unlocks "first" when totalSessions reaches 1', () => {
    const state = { ...baseState, totalSessions: 1 };
    expect(checkAchievements(state)).toContain('first');
  });

  it('does not re-unlock "first" when already in achDone', () => {
    const state = { ...baseState, totalSessions: 1, achDone: ['first'] };
    expect(checkAchievements(state)).not.toContain('first');
  });

  it('unlocks "w5" at 5 sessions', () => {
    const state = { ...baseState, totalSessions: 5 };
    expect(checkAchievements(state)).toContain('w5');
  });

  it('unlocks "w15" at 15 sessions', () => {
    const state = { ...baseState, totalSessions: 15 };
    expect(checkAchievements(state)).toContain('w15');
  });

  it('unlocks "w36" at 36 sessions (full program)', () => {
    const state = { ...baseState, totalSessions: 36 };
    expect(checkAchievements(state)).toContain('w36');
  });

  it('unlocks "s3" at bestStreak 3', () => {
    const state = { ...baseState, bestStreak: 3 };
    expect(checkAchievements(state)).toContain('s3');
  });

  it('unlocks "s7" at 1 perfect week', () => {
    const state = { ...baseState, perfectWeeks: 1 };
    expect(checkAchievements(state)).toContain('s7');
  });

  it('unlocks "s4w" at 4 perfect weeks', () => {
    const state = { ...baseState, perfectWeeks: 4 };
    expect(checkAchievements(state)).toContain('s4w');
  });

  it('unlocks "v5k" at 5000kg total volume', () => {
    const state = { ...baseState, totalVolume: 5000 };
    expect(checkAchievements(state)).toContain('v5k');
  });

  it('unlocks "v25k" at 25000kg total volume', () => {
    const state = { ...baseState, totalVolume: 25000 };
    expect(checkAchievements(state)).toContain('v25k');
  });

  it('unlocks "l5" at level 5', () => {
    const state = { ...baseState, level: 5 };
    expect(checkAchievements(state)).toContain('l5');
  });

  it('unlocks "l10" at level 10', () => {
    const state = { ...baseState, level: 10 };
    expect(checkAchievements(state)).toContain('l10');
  });

  it('unlocks "hrs5" at 300 minutes (5 hours)', () => {
    const state = { ...baseState, totalMinutes: 300 };
    expect(checkAchievements(state)).toContain('hrs5');
  });

  it('unlocks "ci" at 4 check-ins', () => {
    const state = { ...baseState, checkins: 4 };
    expect(checkAchievements(state)).toContain('ci');
  });

  it('unlocks "deload" when deloadDone is true', () => {
    const state = { ...baseState, deloadDone: true };
    expect(checkAchievements(state)).toContain('deload');
  });

  it('unlocks multiple achievements at once when several thresholds are met', () => {
    const state = { ...baseState, totalSessions: 5, level: 5, bestStreak: 3 };
    const unlocked = checkAchievements(state);
    expect(unlocked).toContain('first');
    expect(unlocked).toContain('w5');
    expect(unlocked).toContain('l5');
    expect(unlocked).toContain('s3');
  });

  it('does not unlock achievements already in achDone', () => {
    const state = { ...baseState, totalSessions: 5, achDone: ['first', 'w5'] };
    const unlocked = checkAchievements(state);
    expect(unlocked).not.toContain('first');
    expect(unlocked).not.toContain('w5');
  });
});

// ---------------------------------------------------------------------------
// convertWeight / kgFromDisplay
// ---------------------------------------------------------------------------
describe('convertWeight', () => {
  it('kg → kg returns the same value', () => {
    expect(convertWeight(100, 'kg')).toBe(100);
  });

  it('1 kg → lbs ≈ 2.2', () => {
    expect(convertWeight(1, 'lbs')).toBe(2.2);
  });

  it('100 kg → lbs ≈ 220.5', () => {
    expect(convertWeight(100, 'lbs')).toBe(220.5);
  });

  it('0 kg → 0 lbs', () => {
    expect(convertWeight(0, 'lbs')).toBe(0);
  });
});

describe('kgFromDisplay', () => {
  it('kg unit returns same value', () => {
    expect(kgFromDisplay(100, 'kg')).toBe(100);
  });

  it('lbs → kg round-trip is approximately correct', () => {
    const kg = kgFromDisplay(convertWeight(80, 'lbs'), 'lbs');
    expect(kg).toBeCloseTo(80, 0);
  });

  it('0 lbs → 0 kg', () => {
    expect(kgFromDisplay(0, 'lbs')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getWeightForExercise
// ---------------------------------------------------------------------------
describe('getWeightForExercise', () => {
  const ex = { id: 'squat', startKg: 45 };

  it('normal week returns liftWeights value', () => {
    expect(getWeightForExercise(ex, 5, { squat: 80 })).toBe(80);
  });

  it('falls back to ex.startKg if not in liftWeights', () => {
    expect(getWeightForExercise(ex, 5, {})).toBe(45);
  });

  it('deload week 4 returns 80% of base weight', () => {
    const result = getWeightForExercise(ex, 4, { squat: 100 });
    expect(result).toBe(80); // 100 * 0.8 = 80
  });

  it('deload week 8 returns 80% of base weight', () => {
    const result = getWeightForExercise(ex, 8, { squat: 100 });
    expect(result).toBe(80);
  });

  it('deload week 12 returns 80% of base weight', () => {
    const result = getWeightForExercise(ex, 12, { squat: 100 });
    expect(result).toBe(80);
  });

  it('deload rounds to nearest 0.5 kg', () => {
    const result = getWeightForExercise(ex, 4, { squat: 75 });
    expect(result % 0.5).toBe(0);
    expect(result).toBeCloseTo(75 * 0.8, 0);
  });

  it('week 5 is not deload', () => {
    expect(getWeightForExercise(ex, 5, { squat: 100 })).toBe(100);
  });

  it('week 9 is not deload', () => {
    expect(getWeightForExercise(ex, 9, { squat: 100 })).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// getSetsForWeek
// ---------------------------------------------------------------------------
describe('getSetsForWeek', () => {
  const ex = { sets: 3 };

  it('normal week returns ex.sets', () => {
    expect(getSetsForWeek(ex, 5)).toBe(3);
  });

  it('deload week 4 drops 1 set (min 1)', () => {
    expect(getSetsForWeek({ sets: 3 }, 4)).toBe(2); // 3-1=2
    expect(getSetsForWeek({ sets: 2 }, 4)).toBe(1); // 2-1=1
    expect(getSetsForWeek({ sets: 4 }, 4)).toBe(3); // 4-1=3
    expect(getSetsForWeek({ sets: 1 }, 4)).toBe(1); // max(1, 0)=1
  });

  it('deload week 8 drops 1 set', () => {
    expect(getSetsForWeek({ sets: 3 }, 8)).toBe(2);
  });

  it('deload week 12 drops 1 set', () => {
    expect(getSetsForWeek({ sets: 3 }, 12)).toBe(2);
  });

  it('week 5 returns normal sets', () => {
    expect(getSetsForWeek(ex, 5)).toBe(3);
  });

  it('week 9 returns normal sets', () => {
    expect(getSetsForWeek(ex, 9)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatElapsed
// ---------------------------------------------------------------------------
describe('formatElapsed', () => {
  it('null start time returns 00:00', () => {
    expect(formatElapsed(null)).toBe('00:00');
  });

  it('zero elapsed returns 00:00', () => {
    expect(formatElapsed(Date.now())).toBe('00:00');
  });

  it('65 seconds elapsed returns 01:05', () => {
    expect(formatElapsed(Date.now() - 65000)).toBe('01:05');
  });

  it('3600 seconds (1 hour) returns 60:00', () => {
    expect(formatElapsed(Date.now() - 3600000)).toBe('60:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatElapsed(Date.now() - 9000)).toBe('00:09');
  });
});

describe('removeXP', () => {
  it('exactly undoes an applyXP award', () => {
    let state = { xp: 0, totalXp: 0, level: 1 };
    for (const award of [40, 95, 120, 60, 250, 30, 500, 75]) {
      const before = { ...state };
      const up = applyXP(state, award);
      const down = removeXP({ xp: up.xp, totalXp: up.totalXp, level: up.level }, award);
      expect(down).toEqual(before);
      state = { xp: up.xp, totalXp: up.totalXp, level: up.level };
    }
  });

  it('walks back down through a level-up', () => {
    const base = { xp: 0, totalXp: 1000, level: 5 };
    const award = xpForLevel(5) + 25;           // guaranteed to level up
    const up = applyXP(base, award);
    expect(up.level).toBe(6);
    expect(removeXP(up, award)).toEqual(base);
  });

  it('does not restate a level that totalXp alone would not produce', () => {
    // Accounts created under the previous XP curve hold pairs the current
    // curve would never generate. Removing 0 must be a no-op for them.
    const legacy = { xp: 40, totalXp: 3120, level: 6 };
    expect(removeXP(legacy, 0)).toEqual(legacy);
  });

  it('floors at level 1 rather than going negative', () => {
    expect(removeXP({ xp: 10, totalXp: 10, level: 1 }, 9999)).toEqual({ xp: 0, totalXp: 0, level: 1 });
  });

  it('treats junk amounts as zero', () => {
    const state = { xp: 30, totalXp: 500, level: 3 };
    expect(removeXP(state, undefined)).toEqual(state);
    expect(removeXP(state, NaN)).toEqual(state);
    expect(removeXP(state, -50)).toEqual(state);
  });
});


describe('tomorrow / midnightOf', () => {
  it('tomorrow is exactly one day after today, same format', () => {
    const t = new Date(today());
    const n = new Date(tomorrow());
    expect(Math.round((n - t) / 864e5)).toBe(1);
    expect(tomorrow()).toBe(new Date(Date.now() + 864e5).toDateString());
  });

  it('midnightOf normalises the two date formats the log has used', () => {
    // finishSession writes toDateString(); backfillWeek writes ISO.
    expect(midnightOf('Wed Aug 19 2026')).toBe(midnightOf('2026-08-19T13:45:00'));
    expect(midnightOf('Wed Aug 19 2026')).not.toBe(midnightOf('Thu Aug 20 2026'));
  });

  it('midnightOf rejects junk instead of returning a bogus time', () => {
    expect(Number.isNaN(midnightOf('not a date'))).toBe(true);
    expect(Number.isNaN(midnightOf(undefined))).toBe(true);
  });

  it('a week anchored to tomorrow leaves no training day already in the past', () => {
    // The rollover bug: anchoring the new week to the day its last session was
    // logged put that weekday at daysFromStart 0, i.e. on the start date, so
    // by the next day it read as missed.
    const DAY = ['sun','mon','tue','wed','thu','fri','sat'];
    const start = new Date(tomorrow());
    const startOrd = start.getDay();
    for (const dayKey of DAY) {
      const daysFromStart = (DAY.indexOf(dayKey) - startOrd + 7) % 7;
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + daysFromStart);
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      expect(dayDate.getTime()).toBeGreaterThan(todayMidnight.getTime());
    }
  });
});
