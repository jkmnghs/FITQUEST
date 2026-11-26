import { describe, it, expect } from 'vitest';
import { currentWeekStamp, weeklyCount, chargePatch } from '../coach.js';

describe('weekly coach quota', () => {
  const thu = new Date(Date.UTC(2026, 10, 26, 12)); // Thu 2026-11-26
  const week = currentWeekStamp(thu);

  it('stamps the Monday of the week (UTC)', () => {
    expect(week).toBe('2026-11-23');
    expect(currentWeekStamp(new Date(Date.UTC(2026, 10, 23, 0, 30)))).toBe('2026-11-23');
    expect(currentWeekStamp(new Date(Date.UTC(2026, 10, 29, 23)))).toBe('2026-11-23');
  });

  it('counts this week only — a stale or missing stamp is zero (the lockout bug)', () => {
    expect(weeklyCount({ questMessagesThisWeek: 5, questMessagesWeekStart: week }, 'questMessagesThisWeek', week)).toBe(5);
    expect(weeklyCount({ questMessagesThisWeek: 5, questMessagesWeekStart: '2026-11-09' }, 'questMessagesThisWeek', week)).toBe(0);
    expect(weeklyCount({ questMessagesThisWeek: 5 }, 'questMessagesThisWeek', week)).toBe(0);
  });

  it('charges within the week without touching the other counter', () => {
    const state = { questMessagesThisWeek: 2, programGenerationsThisWeek: 4, questMessagesWeekStart: week };
    expect(chargePatch(state, 'questMessagesThisWeek', week))
      .toEqual({ questMessagesThisWeek: 3, questMessagesWeekStart: week });
  });

  it('starts a new week from one and zeroes the other counter', () => {
    const state = { questMessagesThisWeek: 5, programGenerationsThisWeek: 9, questMessagesWeekStart: '2026-11-16' };
    expect(chargePatch(state, 'questMessagesThisWeek', week))
      .toEqual({ questMessagesThisWeek: 1, questMessagesWeekStart: week, programGenerationsThisWeek: 0 });
  });
});
