import { describe, it, expect } from 'vitest';
import { resolveSession, exercisesForDay, nextTrainingDayAfter, todayDayKey, defaultSlotsFor, slotLabel } from '../session';
import { EXERCISES } from '../../data/gameData';

// Dates chosen so the weekday is unambiguous regardless of the runner's TZ:
// these are constructed with local-time components, not parsed from a string.
const MONDAY    = new Date(2026, 7, 10); // 2026-08-10
const TUESDAY   = new Date(2026, 7, 11);
const WEDNESDAY = new Date(2026, 7, 12);
const THURSDAY  = new Date(2026, 7, 13);
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
    // 'mon' is session 1 and sits at index 1 of trainingDays → template B.
    expect(resolveSession(state, { now: MONDAY }).exercises[0].id).toBe('bench');
    // With session 1 done, 'wed' (index 0 → template A) is next — on any day.
    const done = { ...state, currentWeek: 1, weekProgress: { 1: { count: 1, sessions: [{ dayKey: 'mon', date: MONDAY.toDateString() }] } } };
    expect(resolveSession(done, { now: TUESDAY }).exercises[0].id).toBe('squat');
  });

  it('falls back to activeExercises, then to the built-in list', () => {
    expect(resolveSession(makeState({ activeExercises: [{ id: 'dbrow' }] }), { now: MONDAY }).exercises)
      .toEqual([{ id: 'dbrow' }]);
    expect(resolveSession(makeState(), { now: MONDAY }).exercises).toEqual(EXERCISES);
  });
});

describe('resolveSession — flexible days', () => {
  const week = (sessions, extra = {}) => ({
    currentWeek: 2,
    currentWeekStartDate: MONDAY.toDateString(),
    weekProgress: { 2: { count: sessions.length, completed: false, sessions, ...extra } },
  });

  it('any day of the week is a training day', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY } });
    for (const now of [TUESDAY, THURSDAY, SATURDAY]) {
      const s = resolveSession(state, { now });
      expect(s.isRestDay).toBe(false);
      expect(s.isTrainable).toBe(true);
    }
  });

  it('serves the next session not yet done, whatever the weekday', () => {
    const state = makeState({
      dayTemplates: { mon: PUSH_DAY, wed: PULL_DAY },
      ...week([{ dayKey: 'mon', date: TUESDAY.toDateString() }]),
    });
    const s = resolveSession(state, { now: SATURDAY });
    expect(s.dayKey).toBe('wed');
    expect(s.exercises).toEqual(PULL_DAY.exercises);
  });

  it('a missed Monday is still waiting later in the week', () => {
    const state = makeState({ dayTemplates: { mon: PUSH_DAY }, ...week([]) });
    expect(resolveSession(state, { now: THURSDAY }).dayKey).toBe('mon');
  });

  it('keeps showing the session logged today after it is finished', () => {
    const state = makeState({ ...week([{ dayKey: 'mon', date: THURSDAY.toDateString() }]) });
    expect(resolveSession(state, { now: THURSDAY }).dayKey).toBe('mon');
    expect(resolveSession(state, { now: SATURDAY }).dayKey).toBe('wed');
  });

  it('skips slots marked skipped', () => {
    const state = makeState({ ...week([], { skippedDays: ['mon'] }) });
    expect(resolveSession(state, { now: TUESDAY }).dayKey).toBe('wed');
  });

  it('is a rest day once the week is cleared or has not begun', () => {
    const all = ['mon', 'wed', 'fri'].map(d => ({ dayKey: d, date: MONDAY.toDateString() }));
    const cleared = makeState({ ...week(all) });
    expect(resolveSession(cleared, { now: SATURDAY }).isRestDay).toBe(true);

    const notStarted = makeState({ currentWeek: 3, currentWeekStartDate: new Date(2026, 7, 17).toDateString(), weekProgress: {} });
    const s = resolveSession(notStarted, { now: SATURDAY });
    expect(s.isRestDay).toBe(true);
    expect(s.dayKey).toBe('mon');
    expect(s.isTrainable).toBe(false);
    expect(resolveSession(notStarted, { now: SATURDAY, overrideRestDay: true }).isTrainable).toBe(true);
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

  it('defaults to three sessions when trainingDays is missing', () => {
    expect(resolveSession({}, { now: TUESDAY }).dayKey).toBe('mon');
    expect(resolveSession({}, { now: TUESDAY }).isRestDay).toBe(false);
  });

  it('defaultSlotsFor spreads N sessions as slot keys', () => {
    expect(defaultSlotsFor(3)).toEqual(['mon', 'wed', 'fri']);
    expect(defaultSlotsFor(2)).toHaveLength(2);
    expect(defaultSlotsFor(5)).toHaveLength(5);
    expect(defaultSlotsFor(null)).toEqual(['mon', 'wed', 'fri']);
  });

  it('slotLabel names slots by position, not weekday', () => {
    const state = makeState({ trainingDays: ['fri', 'mon', 'wed'] });
    expect(slotLabel(state, 'mon')).toBe('Session 1');
    expect(slotLabel(state, 'fri')).toBe('Session 3');
  });
});
