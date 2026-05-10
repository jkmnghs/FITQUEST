import { describe, it, expect } from 'vitest';
import { validateState, repairState } from '../stateSchema';
import { DEFAULT_STATE } from '../../data/gameData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeValidState(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    name: 'TestUser',
    lastDate: null,
    questMessagesWeekStart: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateState — valid inputs
// ---------------------------------------------------------------------------
describe('validateState — valid states', () => {
  it('default state with name passes validation', () => {
    const { success } = validateState(makeValidState());
    expect(success).toBe(true);
  });

  it('state with all v2 fields passes', () => {
    const state = makeValidState({
      stateVersion: 2,
      dailyXPEarned: 50,
      dailySessionCount: 1,
      lastDayReset: new Date().toDateString(),
      lifestyle: { dailyActivity: 'moderately_active', sleepHours: '7-8', stressLevel: 'low' },
      dietary: { restrictions: ['vegetarian'], trackingExperience: 'regular', mealsPerDay: 3 },
      motivation: { primaryMotivation: 'health', previousQuitReason: null },
      recoveryScores: [{ date: '2024-01-01', sleep: 4, bodyFeel: 3, energy: 5 }],
      dailyHabits: { waterGlasses: 8, vegetablesEaten: true, fruitEaten: false, supplementsTaken: true },
    });
    const { success } = validateState(state);
    expect(success).toBe(true);
  });

  it('state with assessment painRegions passes', () => {
    const state = makeValidState({
      assessment: {
        completed: true,
        painRegions: { shoulders: 'moderate', knees: 'none', lowerBack: 'mild', hips: 'none', wrists: 'none', neck: 'none' },
        movementCompetency: { squat: 'confident', deadlift: 'unsure' },
        estimatedMaxes: { squat: 100, bench: 80, deadlift: 120, ohp: 50 },
      },
    });
    const { success } = validateState(state);
    expect(success).toBe(true);
  });

  it('extra fields are allowed (passthrough)', () => {
    const state = makeValidState({ customField: 'hello', extraData: 42 });
    const { success } = validateState(state);
    expect(success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateState — invalid inputs
// ---------------------------------------------------------------------------
describe('validateState — invalid states', () => {
  it('missing name fails', () => {
    const state = makeValidState();
    delete state.name;
    const { success, error } = validateState(state);
    expect(success).toBe(false);
    expect(error.length).toBeGreaterThan(0);
  });

  it('negative level fails', () => {
    const { success } = validateState(makeValidState({ level: -1 }));
    expect(success).toBe(false);
  });

  it('negative xp fails', () => {
    const { success } = validateState(makeValidState({ xp: -5 }));
    expect(success).toBe(false);
  });

  it('invalid unit fails', () => {
    const { success } = validateState(makeValidState({ unit: 'stones' }));
    expect(success).toBe(false);
  });

  it('currentWeek > 52 fails', () => {
    const { success } = validateState(makeValidState({ currentWeek: 53 }));
    expect(success).toBe(false);
  });

  it('invalid pain severity fails', () => {
    const state = makeValidState({
      assessment: { completed: true, painRegions: { knees: 'extreme' } },
    });
    const { success } = validateState(state);
    expect(success).toBe(false);
  });

  it('recovery score out of range fails', () => {
    const state = makeValidState({
      recoveryScores: [{ date: '2024-01-01', sleep: 6, bodyFeel: 3, energy: 5 }],
    });
    const { success } = validateState(state);
    expect(success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// repairState
// ---------------------------------------------------------------------------
describe('repairState', () => {
  it('null level repaired to 1', () => {
    const repaired = repairState({ level: null });
    expect(repaired.level).toBe(1);
  });

  it('negative xp repaired to 0', () => {
    const repaired = repairState({ xp: -10 });
    expect(repaired.xp).toBe(0);
  });

  it('null arrays repaired to empty arrays', () => {
    const repaired = repairState({ log: null, achDone: null, mealLogs: null });
    expect(repaired.log).toEqual([]);
    expect(repaired.achDone).toEqual([]);
    expect(repaired.mealLogs).toEqual([]);
  });

  it('null objects repaired to empty objects', () => {
    const repaired = repairState({ weekProgress: null, liftWeights: null });
    expect(repaired.weekProgress).toEqual({});
    expect(repaired.liftWeights).toEqual({});
  });

  it('missing name repaired to empty string', () => {
    const repaired = repairState({});
    expect(repaired.name).toBe('');
  });

  it('missing unit repaired to kg', () => {
    const repaired = repairState({});
    expect(repaired.unit).toBe('kg');
  });

  it('null assessment repaired to { completed: false }', () => {
    const repaired = repairState({ assessment: null });
    expect(repaired.assessment).toEqual({ completed: false });
  });

  it('missing nutritionGoals repaired with defaults', () => {
    const repaired = repairState({ nutritionGoals: null });
    expect(repaired.nutritionGoals.calories).toBe(2000);
    expect(repaired.nutritionGoals.protein).toBe(155);
  });

  it('valid fields are preserved during repair', () => {
    const repaired = repairState({ level: 5, xp: 100, name: 'Jake', unit: 'lbs' });
    expect(repaired.level).toBe(5);
    expect(repaired.xp).toBe(100);
    expect(repaired.name).toBe('Jake');
    expect(repaired.unit).toBe('lbs');
  });
});
