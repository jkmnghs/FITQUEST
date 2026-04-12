import { describe, it, expect } from 'vitest';
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
  it('adds stateVersion = 2', () => {
    const migrated = migrateState(makeV1State());
    expect(migrated.stateVersion).toBe(2);
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
  it('does not modify state already at v2', () => {
    const v2State = makeV1State({ stateVersion: 2 });
    const migrated = migrateState(v2State);
    expect(migrated.stateVersion).toBe(2);
    expect(migrated).toEqual(v2State);
  });
});

// ---------------------------------------------------------------------------
// migrateState: idempotent
// ---------------------------------------------------------------------------
describe('migrateState idempotency', () => {
  it('running migration twice gives same result', () => {
    const first = migrateState(makeV1State());
    const second = migrateState(first);
    expect(second).toEqual(first);
  });
});
