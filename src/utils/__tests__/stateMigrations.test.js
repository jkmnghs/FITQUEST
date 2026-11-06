import { describe, it, expect, vi, afterEach } from 'vitest';
import { migrateState } from '../stateMigrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeV1State(overrides = {}) {
  return {
    name: 'TestUser',
    level: 3,
    xp: 50,
    totalXp: 250,
    streak: 2,
    bestStreak: 5,
    lastDate: 'Mon Jan 01 2024',
    currentWeek: 4,
    unit: 'kg',
    totalSessions: 10,
    totalVolume: 5000,
    totalMinutes: 300,
    perfectWeeks: 1,
    checkins: 2,
    deloadDone: false,
    log: [],
    achDone: ['first'],
    weekProgress: {},
    liftWeights: { squat: 80 },
    liftHistory: {},
    weeklyRPE: {},
    overloadSuggestions: {},
    consecutiveCompletions: {},
    personalRecords: {},
    weeklyCheckins: [],
    aiCoachHistory: [],
    aiEpisodic: [],
    mealLogs: [],
    nutritionGoals: { calories: 2200, protein: 170, carbs: 200, fat: 65 },
    questMessagesThisWeek: 0,
    questMessagesWeekStart: null,
    assessment: { completed: true, goal: 'muscle', level: 'intermediate' },
    // No stateVersion field — this is implicitly v1
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// migrateState: v1 → v2
// ---------------------------------------------------------------------------
describe('migrateState from v1 to v2', () => {
  it('migrates all the way to the current version', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.stateVersion).toBe(3);
  });

  it('adds lifestyle defaults', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.lifestyle).toEqual({
      dailyActivity: 'sedentary',
      sleepHours: '7-8',
      stressLevel: 'moderate',
    });
  });

  it('adds dietary defaults', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.dietary).toEqual({
      restrictions: [],
      trackingExperience: 'never',
      mealsPerDay: 3,
    });
  });

  it('adds motivation defaults', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.motivation).toEqual({
      primaryMotivation: null,
      previousQuitReason: null,
    });
  });

  it('adds assessment sub-fields (painRegions, movementCompetency, estimatedMaxes)', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.assessment.painRegions).toEqual({
      shoulders: 'none', lowerBack: 'none', knees: 'none',
      hips: 'none', wrists: 'none', neck: 'none',
    });
    expect(migrated.assessment.movementCompetency).toEqual({});
    expect(migrated.assessment.estimatedMaxes).toEqual({
      squat: null, bench: null, deadlift: null, ohp: null,
    });
    expect(migrated.assessment.splitPreference).toBeNull();
  });

  it('adds daily XP tracking fields', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.dailyXPEarned).toBe(0);
    expect(migrated.dailySessionCount).toBe(0);
    expect(migrated.lastDayReset).toBeNull();
  });

  it('adds recoveryScores and dailyHabits', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.recoveryScores).toEqual([]);
    expect(migrated.dailyHabits).toEqual({
      waterGlasses: 0,
      vegetablesEaten: false,
      fruitEaten: false,
      supplementsTaken: false,
    });
  });

  it('preserves original v1 fields', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.name).toBe('TestUser');
    expect(migrated.level).toBe(3);
    expect(migrated.xp).toBe(50);
    expect(migrated.liftWeights).toEqual({ squat: 80 });
    expect(migrated.achDone).toEqual(['first']);
    expect(migrated.assessment.completed).toBe(true);
    expect(migrated.assessment.goal).toBe('muscle');
  });

  it('preserves existing v2 fields if provided', () => {
    const state = makeV1State({
      lifestyle: { dailyActivity: 'very_active', sleepHours: '8+', stressLevel: 'low' },
    });
    const migrated = migrateState(state);
    expect(migrated.lifestyle.dailyActivity).toBe('very_active');
    expect(migrated.lifestyle.sleepHours).toBe('8+');
  });
});

// ---------------------------------------------------------------------------
// migrateState: already at v2
// ---------------------------------------------------------------------------
describe('migrateState with current version', () => {
  it('does not modify state already at v3', () => {
    const v3State = makeV1State({ stateVersion: 3 });
    const migrated = migrateState(v3State);
    expect(migrated.stateVersion).toBe(3);
    expect(migrated).toEqual(v3State);
  });
});

// ---------------------------------------------------------------------------
// migrateState: v2 → v3 — streak recovered under the weekly rule
// ---------------------------------------------------------------------------
describe('migrateState from v2 to v3 (weekly streak recovery)', () => {
  afterEach(() => vi.useRealTimers());

  const ds = (m, d) => new Date(2026, m - 1, d, 10).toDateString();
  // Three sessions a week on varying days, with 4–5 day gaps the old rule
  // treated as a break: Mon/Tue/Wed, then Sat/Sun... across two weeks.
  const history = {
    1: { dates: [ds(10, 5), ds(10, 6), ds(10, 7)], sessions: [] },
    2: { dates: [ds(10, 12), ds(10, 17), ds(10, 18)], sessions: [] },
    3: { dates: [ds(10, 23)], sessions: [] },
  };

  it('rebuilds a streak the old 3-day rule broke', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 10)); // Sat of week 3
    const migrated = migrateState(makeV1State({
      stateVersion: 2, sessionsPerWeek: 3, weekProgress: history,
      streak: 1, bestStreak: 3, lastDate: ds(10, 23),
    }));
    expect(migrated.stateVersion).toBe(3);
    expect(migrated.streak).toBe(7);
    expect(migrated.bestStreak).toBe(7);
    expect(migrated.streakGraceFrom).toBe(new Date(2026, 9, 24, 10).toDateString());
  });

  it('never lowers an existing streak', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 10));
    const migrated = migrateState(makeV1State({
      stateVersion: 2, sessionsPerWeek: 3, weekProgress: history,
      streak: 20, bestStreak: 25, lastDate: ds(10, 23),
    }));
    expect(migrated.streak).toBe(20);
    expect(migrated.bestStreak).toBe(25);
  });
});
