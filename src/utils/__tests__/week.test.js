import { describe, it, expect } from 'vitest';
import { closeElapsedWeek, resolveWeekDays } from '../week';

const DAYS = ['mon', 'wed', 'fri'];
// Monday 2026-09-21 .. Sunday 2026-09-27; next Monday 2026-09-28.
const at = (y, m, d) => new Date(y, m - 1, d, 10, 0, 0);

function stuckWeek() {
  return {
    currentWeek: 3,
    sessionsPerWeek: 3,
    currentWeekStartDate: at(2026, 9, 21).toDateString(),
    weekProgress: {
      3: {
        count: 2, completed: false, completedDays: ['mon', 'fri'],
        sessions: [{ dayKey: 'mon', date: 'x' }, { dayKey: 'fri', date: 'x' }],
      },
    },
  };
}

describe('closeElapsedWeek', () => {
  it('leaves a week alone while its seven days are still running', () => {
    const s = stuckWeek();
    expect(closeElapsedWeek(s, DAYS, at(2026, 9, 27))).toBe(s);
  });

  it('closes a week with a missed day once it has elapsed', () => {
    const next = closeElapsedWeek(stuckWeek(), DAYS, at(2026, 9, 28));
    expect(next.currentWeek).toBe(4);
    expect(next.currentWeekStartDate).toBe(at(2026, 9, 28).toDateString());
    expect(next.weekProgress[3]).toMatchObject({
      completed: true, autoClosed: true, skippedDays: ['wed'], count: 2,
    });
  });

  it('does not show the new week as missed', () => {
    const next = closeElapsedWeek(stuckWeek(), DAYS, at(2026, 9, 28));
    const days = resolveWeekDays(next, 4, DAYS, at(2026, 9, 28));
    expect(days.every(d => !d.skipped)).toBe(true);
    expect(days.find(d => d.current)?.dayKey).toBe('mon');
  });

  it('anchors to the current calendar window after a long absence, advancing one week', () => {
    const next = closeElapsedWeek(stuckWeek(), DAYS, at(2026, 10, 14)); // Wed, 3 weeks later
    expect(next.currentWeek).toBe(4);
    expect(next.currentWeekStartDate).toBe(at(2026, 10, 12).toDateString());
    const days = resolveWeekDays(next, 4, DAYS, at(2026, 10, 14));
    expect(days.map(d => d.skipped)).toEqual([true, false, false]);
  });

  it('rolls over on Monday even when the week started mid-week', () => {
    // Previous week finished early and anchored this one to a Tuesday.
    const s = { ...stuckWeek(), currentWeek: 36, weekProgress: {}, currentWeekStartDate: at(2026, 9, 22).toDateString() };
    expect(closeElapsedWeek(s, DAYS, at(2026, 9, 27))).toBe(s);
    const next = closeElapsedWeek(s, DAYS, at(2026, 9, 28));
    expect(next.currentWeek).toBe(37);
    expect(next.currentWeekStartDate).toBe(at(2026, 9, 28).toDateString());
  });

  it('gives a week anchored after its last training day the following calendar week', () => {
    const s = { ...stuckWeek(), weekProgress: {}, currentWeekStartDate: at(2026, 9, 26).toDateString() }; // Saturday
    expect(closeElapsedWeek(s, DAYS, at(2026, 9, 28))).toBe(s);
    const next = closeElapsedWeek(s, DAYS, at(2026, 10, 5));
    expect(next.currentWeek).toBe(4);
    expect(next.currentWeekStartDate).toBe(at(2026, 10, 5).toDateString());
  });

  it('skips every training day of an untouched week', () => {
    const s = { ...stuckWeek(), weekProgress: {} };
    const next = closeElapsedWeek(s, DAYS, at(2026, 9, 28));
    expect(next.weekProgress[3]).toMatchObject({ completed: true, count: 0, skippedDays: DAYS });
  });

  it('ignores completed weeks and missing start dates', () => {
    const done = stuckWeek();
    done.weekProgress[3].completed = true;
    expect(closeElapsedWeek(done, DAYS, at(2026, 10, 30))).toBe(done);
    const noStart = { ...stuckWeek(), currentWeekStartDate: null };
    expect(closeElapsedWeek(noStart, DAYS, at(2026, 10, 30))).toBe(noStart);
  });
});

describe('resolveWeekDays', () => {
  it('shows the stuck week (the old bug) as all missed', () => {
    // Documents what users saw before the rollover: week never advanced, so
    // Monday of the next calendar week read every day as behind us.
    const days = resolveWeekDays(stuckWeek(), 3, DAYS, at(2026, 9, 28));
    expect(days.find(d => d.dayKey === 'wed').skipped).toBe(true);
  });
});
