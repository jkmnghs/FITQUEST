import { describe, it, expect } from 'vitest';
import { getSetsForWeek, getWeightForExercise, isDeloadWeek, DEFAULT_SETS } from '../gameLogic';

const SQUAT = { id: 'squat', sets: 4, startKg: 60 };

describe('deload weeks have one definition', () => {
  it('treats weeks 4, 8 and 12 of every cycle as deload', () => {
    for (const w of [4, 8, 12, 16, 20, 24]) expect(isDeloadWeek(w), `week ${w}`).toBe(true);
  });

  it('does not treat week 9 as deload', () => {
    // ExerciseModal hardcoded `week === 9`, so the card and the modal disagreed
    // about RPE targets and set counts on every real deload week.
    expect(isDeloadWeek(9)).toBe(false);
  });

  it('drops one set and 20% of the load on a deload week', () => {
    expect(getSetsForWeek(SQUAT, 3)).toBe(4);
    expect(getSetsForWeek(SQUAT, 4)).toBe(3);
    expect(getWeightForExercise(SQUAT, 3, {})).toBe(60);
    expect(getWeightForExercise(SQUAT, 4, {})).toBe(48);
  });

  it('never drops below one set', () => {
    expect(getSetsForWeek({ id: 'plank', sets: 1 }, 4)).toBe(1);
  });
});

describe('templates with missing fields stay usable', () => {
  it('falls back to a default set count when sets is absent', () => {
    // A template without `sets` used to produce an exercise modal with zero
    // rows, so the session could not be logged at all.
    expect(getSetsForWeek({ id: 'x' }, 1)).toBe(DEFAULT_SETS);
    expect(getSetsForWeek({ id: 'x', sets: 0 }, 1)).toBe(DEFAULT_SETS);
    expect(getSetsForWeek({ id: 'x', sets: '4' }, 1)).toBe(4);
  });

  it('never returns NaN for a weight', () => {
    // A missing startKg rendered "NaN kg" on the card.
    expect(getWeightForExercise({ id: 'x' }, 1, {})).toBe(0);
    expect(getWeightForExercise({ id: 'x', startKg: null }, 1, {})).toBe(0);
    expect(getWeightForExercise({ id: 'x' }, 4, {})).toBe(0);
    expect(getWeightForExercise({ id: 'x', startKg: 20 }, 1, undefined)).toBe(20);
  });

  it('prefers the user’s logged working weight over the template default', () => {
    expect(getWeightForExercise(SQUAT, 1, { squat: 80 })).toBe(80);
  });
});
