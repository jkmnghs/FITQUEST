import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  xpForLevel,
  xpToLevel,
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
} from '../gameLogic';

// ---------------------------------------------------------------------------
// xpForLevel
// ---------------------------------------------------------------------------
describe('xpForLevel', () => {
  it('level 1 requires 80 XP', () => {
    expect(xpForLevel(1)).toBe(80);
  });

  it('level 2 requires 115 XP', () => {
    expect(xpForLevel(2)).toBe(115);
  });

  it('level 10 requires 395 XP (matches in-app display)', () => {
    expect(xpForLevel(10)).toBe(395);
  });

  it('level 20 requires 745 XP', () => {
    expect(xpForLevel(20)).toBe(745);
  });

  it('each level costs exactly 35 more XP than the previous', () => {
    for (let l = 2; l <= 15; l++) {
      expect(xpForLevel(l) - xpForLevel(l - 1)).toBe(35);
    }
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
    expect(xpToLevel(2)).toBe(xpForLevel(1)); // 80
  });

  it('xpToLevel(3) equals sum of levels 1 and 2', () => {
    expect(xpToLevel(3)).toBe(xpForLevel(1) + xpForLevel(2)); // 195
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
// getRank
// ---------------------------------------------------------------------------
describe('getRank', () => {
  it('level 1 → Novice (E)', () => {
    expect(getRank(1)).toMatchObject({ l: 'E', name: 'Novice' });
  });

  it('level 2 → still Novice (below threshold of 3)', () => {
    expect(getRank(2)).toMatchObject({ l: 'E', name: 'Novice' });
  });

  it('level 3 → Apprentice (D)', () => {
    expect(getRank(3)).toMatchObject({ l: 'D', name: 'Apprentice' });
  });

  it('level 5 → still Apprentice (below threshold of 6)', () => {
    expect(getRank(5)).toMatchObject({ l: 'D', name: 'Apprentice' });
  });

  it('level 6 → Warrior (C)', () => {
    expect(getRank(6)).toMatchObject({ l: 'C', name: 'Warrior' });
  });

  it('level 10 → Champion (B) — matches Jake screenshot', () => {
    expect(getRank(10)).toMatchObject({ l: 'B', name: 'Champion' });
  });

  it('level 14 → still Champion (below Elite threshold of 15)', () => {
    expect(getRank(14)).toMatchObject({ l: 'B', name: 'Champion' });
  });

  it('level 15 → Elite (A)', () => {
    expect(getRank(15)).toMatchObject({ l: 'A', name: 'Elite' });
  });

  it('level 20 → Legendary (S)', () => {
    expect(getRank(20)).toMatchObject({ l: 'S', name: 'Legendary' });
  });

  it('level 99 → still Legendary (no cap)', () => {
    expect(getRank(99)).toMatchObject({ l: 'S', name: 'Legendary' });
  });
});

// ---------------------------------------------------------------------------
// getPhase
// ---------------------------------------------------------------------------
describe('getPhase', () => {
  it('week 1 → PHASE 1', () => {
    expect(getPhase(1).name).toBe('PHASE 1');
  });

  it('week 2 → PHASE 1', () => {
    expect(getPhase(2).name).toBe('PHASE 1');
  });

  it('week 3 → PHASE 2', () => {
    expect(getPhase(3).name).toBe('PHASE 2');
  });

  it('week 8 → PHASE 2 (last week of linear progression)', () => {
    expect(getPhase(8).name).toBe('PHASE 2');
  });

  it('week 9 → PHASE 3 (deload)', () => {
    expect(getPhase(9).name).toBe('PHASE 3');
  });

  it('week 10 → PHASE 4', () => {
    expect(getPhase(10).name).toBe('PHASE 4');
  });

  it('week 12 → PHASE 4 (final week)', () => {
    expect(getPhase(12).name).toBe('PHASE 4');
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
    const result = applyXP({ xp: 70, totalXp: 70, level: 1 }, 20); // 70+20=90 > 80
    expect(result.level).toBe(2);
    expect(result.xp).toBe(10); // 90 - 80 = 10 remaining
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

  it('week 9 (deload) returns 80% of base weight rounded to nearest 0.5', () => {
    const result = getWeightForExercise(ex, 9, { squat: 100 });
    expect(result).toBe(80); // 100 * 0.8 = 80
  });

  it('week 9 deload rounds to nearest 0.5 kg', () => {
    const result = getWeightForExercise(ex, 9, { squat: 75 });
    expect(result % 0.5).toBe(0); // must be a 0.5 multiple
    expect(result).toBeCloseTo(75 * 0.8, 0);
  });

  it('week 8 is not deload', () => {
    expect(getWeightForExercise(ex, 8, { squat: 100 })).toBe(100);
  });

  it('week 10 is not deload', () => {
    expect(getWeightForExercise(ex, 10, { squat: 100 })).toBe(100);
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

  it('week 9 (deload) always returns 2', () => {
    expect(getSetsForWeek({ sets: 3 }, 9)).toBe(2);
    expect(getSetsForWeek({ sets: 2 }, 9)).toBe(2);
    expect(getSetsForWeek({ sets: 4 }, 9)).toBe(2);
  });

  it('week 8 returns normal sets', () => {
    expect(getSetsForWeek(ex, 8)).toBe(3);
  });

  it('week 10 returns normal sets', () => {
    expect(getSetsForWeek(ex, 10)).toBe(3);
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
