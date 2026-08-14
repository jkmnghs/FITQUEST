import { describe, it, expect } from 'vitest';
import { resolveSession, exercisesForDay, nextTrainingDayAfter, todayDayKey } from '../session';
import { EXERCISES } from '../../data/gameData';

// Dates chosen so the weekday is unambiguous regardless of the runner's TZ:
// these are constructed with local-time components, not parsed from a string.
const MONDAY    = new Date(2026, 7, 10); // 2026-08-10
const TUESDAY   = new Date(2026, 7, 11);
const WEDNESDAY = new Date(2026, 7, 12);
const SATURDAY  = new Date(2026, 7, 15);

function makeState(overrides = {}) {
  return {
    trainingDays: ['mon', 'wed', 'fri'],
    dayTemplates: null,
    activeTemplates: null,
    activeExercises: null,
    ...overrides,
  };
}

const PUSH_DAY = { title: 'PUSH', exercises: [{ id: 'bench', name: 'Bench' }] };
const PULL_DAY = { title: 'PULL', exercises: [{ id: 'pulldown', name: 'Pulldown' }] };

describe('resolveSession — training day', () => {
  it('returns today’s template when today is a training day', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY } });
    const s = resolveSession(state, { now: MONDAY });
    expect(s.dayKey).toBe('mon');
    expect(s.title).toBe('PUSH');
    expect(s.exercises).toEqual(PUSH_DAY.exercises);
    expect(s.isRestDay).toBe(false);
    expect(s.isTrainable).toBe(true);
  });

  it('falls back to activeTemplates indexed by the unsorted trainingDays order', () => {
    const state = makeState({
      trainingDays: ['wed', 'mon'], // deliberately not calendar-ordered
      activeTemplates: [
        { name: 'A', exercises: [{ id: 'squat' }] },
        { name: 'B', exercises: [{ id: 'bench' }] },
      ],
    });
    // 'mon' sits at index 1 of trainingDays, so it maps to template B.
    expect(resolveSession(state, { now: MONDAY }).exercises[0].id).toBe('bench');
    expect(resolveSession(state, { now: WEDNESDAY }).exercises[0].id).toBe('squat');
  });

  it('falls back to activeExercises, then to the built-in list', () => {
    expect(resolveSession(makeState({ activeExercises: [{ id: 'dbrow' }] }), { now: MONDAY }).exercises)
      .toEqual([{ id: 'dbrow' }]);
    expect(resolveSession(makeState(), { now: MONDAY }).exercises).toEqual(EXERCISES);
  });
});

describe('resolveSession — rest day', () => {
  it('previews the next training day, not today', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY } });
    const s = resolveSession(state, { now: TUESDAY });
    expect(s.isRestDay).toBe(true);
    expect(s.dayKey).toBe('wed');
    expect(s.exercises).toEqual(PULL_DAY.exercises);
  });

  it('wraps to the first training day of the week after the last one', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY } });
    expect(resolveSession(state, { now: SATURDAY }).dayKey).toBe('mon');
  });

  it('is not trainable on a rest day unless the user overrides', () => {
    const state = makeState({ dayTemplates: { wed: PULL_DAY } });
    expect(resolveSession(state, { now: TUESDAY }).isTrainable).toBe(false);
    expect(resolveSession(state, { now: TUESDAY, overrideRestDay: true }).isTrainable).toBe(true);
  });

  it('reports the same dayKey with and without the override', () => {
    // This is the regression: the UI showed Wednesday's workout while the
    // mutations acted on Tuesday's (empty) template, so swap and delete no-op'd.
    const state = makeState({ dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY } });
    const preview  = resolveSession(state, { now: TUESDAY });
    const training = resolveSession(state, { now: TUESDAY, overrideRestDay: true });
    expect(training.dayKey).toBe(preview.dayKey);
    expect(training.exercises).toEqual(preview.exercises);
  });

  it('the resolved dayKey selects the same list the mutations will edit', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY } });
    const s = resolveSession(state, { now: TUESDAY, overrideRestDay: true });
    expect(exercisesForDay(state, s.dayKey)).toEqual(s.exercises);
  });
});

describe('helpers', () => {
  it('nextTrainingDayAfter skips to the next scheduled day', () => {
    const state = makeState({ trainingDays: ['mon', 'wed', 'fri'] });
    expect(nextTrainingDayAfter(state, 'mon')).toBe('wed');
    expect(nextTrainingDayAfter(state, 'thu')).toBe('fri');
    expect(nextTrainingDayAfter(state, 'sat')).toBe('mon');
  });

  it('todayDayKey maps weekdays correctly', () => {
    expect(todayDayKey(MONDAY)).toBe('mon');
    expect(todayDayKey(SATURDAY)).toBe('sat');
  });

  it('exercisesForDay handles a day with no template', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY }, activeExercises: [{ id: 'squat' }] });
    expect(exercisesForDay(state, 'mon')).toEqual(PUSH_DAY.exercises);
    expect(exercisesForDay(state, 'sat')).toEqual([{ id: 'squat' }]);
  });

  it('defaults to Mon/Wed/Fri when trainingDays is missing', () => {
    expect(resolveSession({}, { now: MONDAY }).isRestDay).toBe(false);
    expect(resolveSession({}, { now: TUESDAY }).isRestDay).toBe(true);
  });
});
