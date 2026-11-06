import { describe, it, expect } from 'vitest';
import { describeProgram } from '../coachExport';

describe('describeProgram', () => {
  const state = {
    unit: 'kg',
    trainingDays: ['fri', 'mon'],
    liftWeights: { bench: 62.5 },
    dayTemplates: {
      mon: { title: 'UPPER', exercises: [
        { id: 'bench', name: 'Barbell Bench Press', sets: 3, reps: 8, repMin: 6, repMax: 8, startKg: 50, rest: '2.5 min', rpe: 8 },
        { id: 'pushup', name: 'Push-up', sets: 3, reps: 12, isBodyweight: true },
      ] },
      fri: { title: 'LOWER', exercises: [{ id: 'squat', name: 'Barbell Squat', sets: 4, reps: 5, startKg: 80 }] },
    },
  };

  it('lists every session in order with exercises, sets, reps and weights', () => {
    const text = describeProgram(state);
    expect(text).toMatch(/Session 1 \(day key "mon"\) — UPPER/);
    expect(text).toMatch(/Session 2 \(day key "fri"\) — LOWER/);
    expect(text).toContain('Barbell Bench Press [bench] — 3×6-8 @ 62.5 kg, rest 2.5 min, RPE 8');
    expect(text).toContain('Push-up [pushup] — 3×12 @ bodyweight');
    expect(text).toContain('Barbell Squat [squat] — 4×5 @ 80 kg');
    expect(text).not.toMatch(/Monday|Friday/);
  });

  it('converts weights to the user unit', () => {
    expect(describeProgram({ ...state, unit: 'lbs' })).toContain('@ 137.8 lbs');
  });
});
