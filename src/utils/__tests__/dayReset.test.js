import { describe, it, expect } from 'vitest';
import { checkDayReset } from '../../hooks/useGameState';
import { addDays } from '../gameLogic';

/** `n` days from today, in the toDateString() form the app stores. */
function day(n) {
  return addDays(new Date(), n).toDateString();
}

function baseState(overrides = {}) {
  return {
    currentWeek: 3,
    sessionsPerWeek: 3,
    trainingDays: ['mon', 'wed', 'fri'],
    dayTemplates: { mon: { exercises: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] } },
    currentWeekStartDate: day(-9),
    weekProgress: {},
    log: [],
    totalSessions: 0,
    streak: 0,
    lastDate: null,
    todayExDate: day(0),
    todayExDone: [],
    todayExDetails: {},
    todaySessionFinished: false,
    ...overrides,
  };
}

describe('checkDayReset — a passed week with a missed day', () => {
  it('banks yesterday’s logged session before clearing the day', () => {
    const yesterdayKey = ['sun','mon','tue','wed','thu','fri','sat'][addDays(new Date(), -1).getDay()];
    const next = checkDayReset(baseState({
      currentWeekStartDate: day(-1),
      todayExDate: day(-1),
      todayExDone: ['a', 'b', 'c'],
    }));
    // Recorded against the week it was trained in...
    const banked = Object.values(next.weekProgress).flatMap(wp => wp.sessions || []);
    expect(banked).toHaveLength(1);
    expect(banked[0].dayKey).toBe(yesterdayKey);
    expect(banked[0].date).toBe(day(-1));
    expect(next.totalSessions).toBe(1);
    // ...and only then is today's scratch state cleared.
    expect(next.todayExDone).toEqual([]);
    expect(next.todayExDate).toBe(day(0));
  });

  it('moves on to the next program week once the old one runs out of days', () => {
    const next = checkDayReset(baseState({
      currentWeekStartDate: day(-7),
      weekProgress: {
        3: {
          count: 2, completed: false,
          dates: [day(-7), day(-5)],
          completedDays: ['mon', 'wed'],
          sessions: [
            { date: day(-7), dayKey: 'mon', exercisesDone: ['a'], completion: 75 },
            { date: day(-5), dayKey: 'wed', exercisesDone: ['a'], completion: 100 },
          ],
        },
      },
    }));
    expect(next.currentWeek).toBe(4);
    expect(next.currentWeekStartDate).toBe(day(0));
    expect(next.weekProgress[3].completed).toBe(false);
    expect(next.weekProgress[3].count).toBe(2);
  });

  it('keeps a week that is still inside its seven days', () => {
    const state = baseState({ currentWeekStartDate: day(-2) });
    expect(checkDayReset(state).currentWeek).toBe(3);
    expect(checkDayReset(state).currentWeekStartDate).toBe(day(-2));
  });

  it('is stable when run twice — no session or week is counted again', () => {
    const once = checkDayReset(baseState({
      currentWeekStartDate: day(-7),
      todayExDate: day(-1),
      todayExDone: ['a', 'b'],
    }));
    const twice = checkDayReset(once);
    expect(twice.currentWeek).toBe(once.currentWeek);
    expect(twice.totalSessions).toBe(once.totalSessions);
    expect(Object.values(twice.weekProgress).flatMap(wp => wp.sessions || []))
      .toHaveLength(Object.values(once.weekProgress).flatMap(wp => wp.sessions || []).length);
  });
});
