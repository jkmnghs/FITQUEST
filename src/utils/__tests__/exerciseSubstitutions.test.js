import { describe, it, expect } from 'vitest';
import { applySubstitutions, applyCompetencySubstitutions } from '../exerciseSubstitutions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeExercises() {
  return [
    { id: 'squat', name: 'Barbell Squat', sets: 3, reps: 8 },
    { id: 'bench', name: 'Bench Press', sets: 3, reps: 8 },
    { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: 10 },
    { id: 'ohp', name: 'Overhead Press', sets: 2, reps: 10 },
    { id: 'lunge', name: 'Lunge', sets: 3, reps: 10 },
  ];
}

// ---------------------------------------------------------------------------
// applySubstitutions — pain-based
// ---------------------------------------------------------------------------
describe('applySubstitutions', () => {
  it('no pain regions returns exercises unchanged', () => {
    const exercises = makeExercises();
    const result = applySubstitutions(exercises, { shoulders: 'none', knees: 'none', lowerBack: 'none' });
    expect(result.map(e => e.id)).toEqual(['squat', 'bench', 'rdl', 'ohp', 'lunge']);
  });

  it('null painRegions returns exercises unchanged', () => {
    const result = applySubstitutions(makeExercises(), null);
    expect(result).toEqual(makeExercises());
  });

  it('moderate knee pain replaces squat with legpress', () => {
    const result = applySubstitutions(makeExercises(), { knees: 'moderate' });
    expect(result.find(e => e.id === 'legpress')).toBeTruthy();
    expect(result.find(e => e.id === 'squat')).toBeFalsy();
  });

  it('moderate knee pain replaces lunge with step-up', () => {
    const result = applySubstitutions(makeExercises(), { knees: 'moderate' });
    expect(result.find(e => e.id === 'stepup')).toBeTruthy();
    expect(result.find(e => e.id === 'lunge')).toBeFalsy();
  });

  it('mild knee pain does NOT trigger substitution', () => {
    const result = applySubstitutions(makeExercises(), { knees: 'mild' });
    expect(result.find(e => e.id === 'squat')).toBeTruthy();
  });

  it('moderate shoulder pain replaces ohp with landmine press', () => {
    const result = applySubstitutions(makeExercises(), { shoulders: 'moderate' });
    expect(result.find(e => e.id === 'landmine')).toBeTruthy();
    expect(result.find(e => e.id === 'ohp')).toBeFalsy();
  });

  it('severe shoulder pain also replaces bench with floor press', () => {
    const result = applySubstitutions(makeExercises(), { shoulders: 'severe' });
    expect(result.find(e => e.id === 'floorpress')).toBeTruthy();
    expect(result.find(e => e.id === 'bench')).toBeFalsy();
  });

  it('moderate lower back pain replaces rdl with hip thrust', () => {
    const result = applySubstitutions(makeExercises(), { lowerBack: 'moderate' });
    expect(result.find(e => e.id === 'hipthrust')).toBeTruthy();
    expect(result.find(e => e.id === 'rdl')).toBeFalsy();
  });

  it('severe lower back also replaces squat with legpress', () => {
    const result = applySubstitutions(makeExercises(), { lowerBack: 'severe' });
    expect(result.find(e => e.id === 'legpress')).toBeTruthy();
    expect(result.find(e => e.id === 'squat')).toBeFalsy();
  });

  it('moderate wrist pain replaces bench with neutral grip bench', () => {
    const result = applySubstitutions(makeExercises(), { wrists: 'moderate' });
    expect(result.find(e => e.id === 'dbbench_neut')).toBeTruthy();
    expect(result.find(e => e.id === 'bench')).toBeFalsy();
  });

  it('moderate hip pain replaces rdl with glute bridge', () => {
    const result = applySubstitutions(makeExercises(), { hips: 'moderate' });
    expect(result.find(e => e.id === 'glutebridge')).toBeTruthy();
  });

  it('multiple pain regions apply all applicable substitutions', () => {
    const result = applySubstitutions(makeExercises(), {
      knees: 'moderate',
      shoulders: 'moderate',
    });
    expect(result.find(e => e.id === 'squat')).toBeFalsy();
    expect(result.find(e => e.id === 'ohp')).toBeFalsy();
    expect(result.find(e => e.id === 'legpress')).toBeTruthy();
    expect(result.find(e => e.id === 'landmine')).toBeTruthy();
  });

  it('does not mutate original exercises array', () => {
    const original = makeExercises();
    const copy = JSON.parse(JSON.stringify(original));
    applySubstitutions(original, { knees: 'severe' });
    expect(original).toEqual(copy);
  });

  it('preserves exercises that have no matching substitution rule', () => {
    const result = applySubstitutions(makeExercises(), { knees: 'moderate' });
    expect(result.find(e => e.id === 'bench')).toBeTruthy();
    expect(result.find(e => e.id === 'rdl')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// applyCompetencySubstitutions
// ---------------------------------------------------------------------------
describe('applyCompetencySubstitutions', () => {
  it('null competency returns exercises unchanged', () => {
    const result = applyCompetencySubstitutions(makeExercises(), null);
    expect(result).toEqual(makeExercises());
  });

  it('"never" squat competency replaces squat with goblet squat', () => {
    const result = applyCompetencySubstitutions(makeExercises(), { squat: 'never' });
    expect(result.find(e => e.id === 'dbsquat')).toBeTruthy();
    expect(result.find(e => e.id === 'squat')).toBeFalsy();
  });

  it('"confident" squat competency does NOT replace squat', () => {
    const result = applyCompetencySubstitutions(makeExercises(), { squat: 'confident' });
    expect(result.find(e => e.id === 'squat')).toBeTruthy();
  });

  it('"never" deadlift competency replaces rdl with DB RDL', () => {
    const result = applyCompetencySubstitutions(makeExercises(), { deadlift: 'never' });
    expect(result.find(e => e.id === 'dbrdl')).toBeTruthy();
    expect(result.find(e => e.id === 'rdl')).toBeFalsy();
  });

  it('"unsure" deadlift replaces rdl with lighter barbell rdl', () => {
    const result = applyCompetencySubstitutions(makeExercises(), { deadlift: 'unsure' });
    const replaced = result.find(e => e.id === 'rdl');
    expect(replaced).toBeTruthy();
    expect(replaced.note).toContain('form confidence');
  });

  it('does not mutate original exercises array', () => {
    const original = makeExercises();
    const copy = JSON.parse(JSON.stringify(original));
    applyCompetencySubstitutions(original, { squat: 'never' });
    expect(original).toEqual(copy);
  });
});
