import { describe, it, expect } from 'vitest';
import { applyCheckin, CHECKIN_XP } from '../checkin';

const base = () => ({
  currentWeek: 3, unit: 'lbs', bmi: 25, checkins: 2,
  assessment: { heightCm: 180 },
  weeklyCheckins: [{ week: 2, weight: 185, waist: 34, sleep: 7, date: '2026-10-10' }],
  log: [],
});

describe('applyCheckin', () => {
  it('awards XP for the first check-in of the week', () => {
    const { state, xp } = applyCheckin(base(), 182, 33, 8);
    expect(xp).toBe(CHECKIN_XP);
    expect(xp).toBe(25);
    expect(state.checkins).toBe(3);
    expect(state.log.at(-1).xp).toBe(25);
    expect(state.weeklyCheckins.filter(c => c.week === 3)).toHaveLength(1);
  });

  it('awards no XP when overwriting the same week', () => {
    const first = applyCheckin(base(), 182, 33, 8).state;
    const { state, xp } = applyCheckin(first, 181, 32, 7);
    expect(xp).toBe(0);
    expect(state.checkins).toBe(3);
    expect(state.log.at(-1).xp).toBe(0);
    const week3 = state.weeklyCheckins.filter(c => c.week === 3);
    expect(week3).toHaveLength(1);
    expect(week3[0].weight).toBe(181);
  });
});
