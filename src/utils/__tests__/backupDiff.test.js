import { describe, it, expect } from 'vitest';
import { summariseState, diffStates } from '../storage';

/**
 * The card that prompted this showed "79 sessions · week 27 · level 21" and a
 * green RESTORE button, while the live account was level 22 with 201 logged
 * workouts and 20 personal records. The snapshot held a *higher* session count
 * and nothing else — it was a bad reconstruction that a correct restore had
 * just replaced — and the card presented it as the better copy.
 *
 * A session count alone cannot rank two states. These are the real two.
 */
const BAD_SNAPSHOT = {
  totalSessions: 79, level: 21, currentWeek: 27,
  log: [], personalRecords: { bench: {}, incdbench: {} },
  weeklyCheckins: [{}, {}], weekProgress: {}, dayTemplates: { mon: {}, wed: {}, fri: {} },
};
const REAL_ACCOUNT = {
  totalSessions: 74, level: 22, currentWeek: 30,
  log: new Array(201).fill({}),
  personalRecords: Object.fromEntries(new Array(20).fill(0).map((_, i) => [`ex${i}`, {}])),
  weeklyCheckins: new Array(12).fill({}),
  weekProgress: Object.fromEntries(new Array(25).fill(0).map((_, i) => [i, {}])),
  dayTemplates: { mon: {}, wed: {}, fri: {} },
};

describe('summariseState', () => {
  it('counts everything a restore could destroy, not just sessions', () => {
    expect(summariseState(REAL_ACCOUNT)).toEqual({
      totalSessions: 74, level: 22, currentWeek: 30,
      logEntries: 201, personalRecords: 20, checkins: 12,
      weeksTracked: 25, programDays: 3,
    });
  });

  it('handles an absent or empty state without throwing', () => {
    expect(summariseState(null).logEntries).toBe(0);
    expect(summariseState({}).level).toBe(1);
  });
});

describe('diffStates', () => {
  const current = summariseState(REAL_ACCOUNT);
  const snapshot = summariseState(BAD_SNAPSHOT);

  it('flags every count the snapshot holds less of', () => {
    const { losses } = diffStates(current, snapshot);
    const lost = Object.fromEntries(losses.map(l => [l.key, [l.now, l.after]]));
    expect(lost.logEntries).toEqual([201, 0]);
    expect(lost.personalRecords).toEqual([20, 2]);
    expect(lost.checkins).toEqual([12, 2]);
    expect(lost.weeksTracked).toEqual([25, 0]);
    expect(lost.level).toEqual([22, 21]);
  });

  it('does not treat the higher session count as a reason to restore', () => {
    const { rows, losses } = diffStates(current, snapshot);
    const sessions = rows.find(r => r.key === 'totalSessions');
    expect(sessions).toEqual({ key: 'totalSessions', label: 'Sessions', now: 74, after: 79 });
    // It goes up, so it is not a loss — but losses elsewhere still make this risky
    expect(losses.some(l => l.key === 'totalSessions')).toBe(false);
    expect(losses.length).toBeGreaterThan(0);
  });

  it('reports no losses for a snapshot that is genuinely richer', () => {
    const emptied = summariseState({ totalSessions: 0, log: [], personalRecords: {}, weeklyCheckins: [], weekProgress: {}, dayTemplates: {} });
    const { losses } = diffStates(emptied, current);
    expect(losses).toHaveLength(0);
  });

  it('returns no rows when the two states match, so the card can hide', () => {
    expect(diffStates(current, current).rows).toHaveLength(0);
  });

  it('omits unchanged fields from the comparison', () => {
    const { rows } = diffStates(current, snapshot);
    expect(rows.some(r => r.key === 'programDays')).toBe(false); // 3 in both
  });
});
