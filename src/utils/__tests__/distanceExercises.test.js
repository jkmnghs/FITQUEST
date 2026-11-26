import { describe, it, expect } from 'vitest';
import {
  EX_CATALOG_MAP, isDistanceExercise, formatDistance, formatDuration, parseDuration, formatTarget,
  filterCatalogForEquipment,
} from '../../data/exerciseCatalog';
import { buildGenerationPlan, buildTemplates } from '../programGenerator';

describe('HYROX and cardio catalog', () => {
  it('has every HYROX station', () => {
    for (const id of ['skierg', 'sledpush', 'sledpull', 'burpeebj', 'rowerg', 'farmerscarry', 'sandbaglunge', 'wallball', 'run']) {
      expect(EX_CATALOG_MAP[id], id).toBeTruthy();
    }
  });

  it('logs runs, ergs, sleds and carries by distance; wall balls by reps', () => {
    expect(isDistanceExercise('skierg')).toBe(true);
    expect(isDistanceExercise({ id: 'sledpush' })).toBe(true);
    expect(isDistanceExercise('wallball')).toBe(false);
    expect(isDistanceExercise('bench')).toBe(false);
  });

  it('gives bodyweight users running and burpee broad jumps', () => {
    const ids = filterCatalogForEquipment('bodyweight').map(e => e.id);
    expect(ids).toEqual(expect.arrayContaining(['run', 'burpeebj']));
    expect(ids).not.toContain('skierg');
  });
});

describe('formatting', () => {
  it('formats distance and duration', () => {
    expect(formatDistance(1000)).toBe('1 km');
    expect(formatDistance(2500)).toBe('2.5 km');
    expect(formatDistance(25)).toBe('25 m');
    expect(formatDuration(225)).toBe('3:45');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('parses typed times', () => {
    expect(parseDuration('3:45')).toBe(225);
    expect(parseDuration('1:02:05')).toBe(3725);
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });

  it('formats a set target by kind', () => {
    expect(formatTarget({ id: 'rowerg', reps: 1000 })).toBe('1 km');
    expect(formatTarget({ id: 'bench', reps: 8, repMin: 6, repMax: 8 })).toBe('6–8');
    expect(formatTarget({ id: 'plank', isPlank: true })).toBe('45-60s');
  });
});

describe('program generator with distance work', () => {
  const base = { equipment: 'full_gym', level: 'intermediate', sessionLength: 60, goal: 'fat_loss', trainingDays: ['mon', 'wed', 'fri'] };
  const e = (id, reps = 10) => ({ id, sets: 3, reps, repMin: reps, repMax: reps, restSec: 120, rpe: 8, note: '' });

  it('keeps metre targets instead of clamping them to 30 reps', () => {
    const plan = buildGenerationPlan(base);
    const day = [e('squat'), e('bench'), e('bbrow'), e('rdl'), e('rowerg', 1000), e('sledpush', 25)];
    const { templates } = buildTemplates({ sessions: ['mon', 'wed', 'fri'].map(d => ({ day: d, title: 'X', exercises: day })) }, plan, base);
    const row = templates.mon.exercises.find(x => x.id === 'rowerg');
    expect(row).toMatchObject({ reps: 1000, repMin: 1000, repMax: 1000 });
    expect(templates.mon.exercises.find(x => x.id === 'sledpush').reps).toBe(25);
  });

  it('allows cardio on split days', () => {
    const plan = buildGenerationPlan({ ...base, splitPreference: 'upper_lower', trainingDays: ['mon', 'tue', 'thu', 'fri'] });
    const upper = [e('bench'), e('bbrow'), e('ohp'), e('pulldown'), e('skierg', 1000)];
    const lower = [e('squat'), e('rdl'), e('legcurl'), e('calfraise'), e('run', 3000)];
    const { templates } = buildTemplates({ sessions: ['mon', 'tue', 'thu', 'fri'].map((d, i) => ({ day: d, title: 'X', exercises: i % 2 ? lower : upper })) }, plan, base);
    expect(templates.mon.exercises.map(x => x.id)).toContain('skierg');
    expect(templates.tue.exercises.map(x => x.id)).toContain('run');
  });
});
