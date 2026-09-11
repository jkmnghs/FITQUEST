import { describe, it, expect } from 'vitest';
import { resolveWeekDays } from '../../components/WorkoutTab';
import { addDays, weekForToday } from '../gameLogic';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const day = (n) => addDays(new Date(), n).toDateString();
const keyOf = (n) => DAY_KEYS[addDays(new Date(), n).getDay()];

describe('resolveWeekDays', () => {
  it('keeps today ticked on the week its session just closed', () => {
    // finishSession advances the week and anchors the new one to tomorrow.
    // The strip must still show the week today's session belongs to, or the
    // session the user just banked reads as never logged.
    const todayKey = keyOf(0);
    const state = {
      currentWeek: 4,
      sessionsPerWeek: 1,
      currentWeekStartDate: day(1),
      weekProgress: {
        3: {
          count: 1, completed: true,
          dates: [day(0)], completedDays: [todayKey],
          sessions: [{ date: day(0), dayKey: todayKey, exercisesDone: ['a'], completion: 67 }],
        },
      },
    };
    const todayWeek = weekForToday(state);
    expect(todayWeek).toBe(3);
    const days = resolveWeekDays(state, todayWeek, [todayKey], todayWeek);
    expect(days[0].done).toBe(true);
    expect(days[0].skipped).toBe(false);
  });

  it('marks a day of the current week that has already passed as missed', () => {
    const state = {
      currentWeek: 2,
      sessionsPerWeek: 3,
      currentWeekStartDate: day(-3),
      weekProgress: { 2: { count: 0, dates: [], completedDays: [], sessions: [] } },
    };
    const passed = keyOf(-1);
    const upcoming = keyOf(2);
    const days = resolveWeekDays(state, 2, [passed, upcoming], 2);
    expect(days.find(d => d.dayKey === passed).skipped).toBe(true);
    expect(days.find(d => d.dayKey === upcoming).skipped).toBe(false);
  });

  it('anchors each week to its own seven days, so an earlier week reads as past', () => {
    const state = {
      currentWeek: 3,
      sessionsPerWeek: 3,
      currentWeekStartDate: day(0),
      weekProgress: { 2: { count: 1, dates: [day(-7)], completedDays: ['mon'], sessions: [] } },
    };
    const days = resolveWeekDays(state, 2, ['mon', 'wed'], 3);
    expect(days.find(d => d.dayKey === 'mon').done).toBe(true);
    expect(days.find(d => d.dayKey === 'wed').skipped).toBe(true);
  });
});
