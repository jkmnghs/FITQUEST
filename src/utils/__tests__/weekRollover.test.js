import { describe, it, expect } from 'vitest';
import {
  rollElapsedWeeks, weekForToday, startOfProgramWeek, commitUnfinishedSession, addDays,
} from '../gameLogic';

// A fixed Monday, built from local components so the weekday is the same in
// every timezone the suite might run in.
const NOW = new Date(2026, 8, 14, 9, 0, 0); // Mon 14 Sep 2026

/** `n` days before NOW, as the toDateString() form the app stores. */
function day(n) {
  return addDays(NOW, n).toDateString();
}

function session(dayKey, offset, completion = 100) {
  return { date: day(offset), dayKey, exercisesDone: ['squat'], completion };
}

function stateWith(overrides = {}) {
  return {
    currentWeek: 3,
    sessionsPerWeek: 3,
    trainingDays: ['mon', 'wed', 'fri'],
    currentWeekStartDate: day(-7), // last Monday — this week's window is over
    weekProgress: {},
    ...overrides,
  };
}

describe('rollElapsedWeeks — a missed day no longer pins the program week', () => {
  it('leaves a week that still has calendar days left alone', () => {
    const state = stateWith({
      currentWeekStartDate: day(-3),
      weekProgress: { 3: { count: 1, dates: [day(-3)], completedDays: ['fri'], sessions: [session('fri', -3)] } },
    });
    expect(rollElapsedWeeks(state, NOW)).toBe(state);
  });

  it('closes a week whose seven days ran out, even though a day was missed', () => {
    const state = stateWith({
      weekProgress: {
        3: {
          count: 2,
          dates: [day(-7), day(-5)],
          completedDays: ['mon', 'wed'],
          sessions: [session('mon', -7), session('wed', -5)],
        },
      },
    });
    const next = rollElapsedWeeks(state, NOW);
    expect(next.currentWeek).toBe(4);
    expect(next.currentWeekStartDate).toBe(day(0));
    // The unfinished week keeps its record — the missed Friday is still there
    // to be backfilled or marked skipped.
    expect(next.weekProgress[3].count).toBe(2);
    expect(next.weekProgress[3].completed).toBe(false);
    expect(next.weekProgress[3].completedDays).toEqual(['mon', 'wed']);
  });

  it('moves sessions logged after the window closed onto the week they belong to', () => {
    // The stuck-week symptom: the app never rolled, so Monday of the new
    // calendar week was recorded against the old week.
    const state = stateWith({
      currentWeekStartDate: day(-8),
      weekProgress: {
        3: {
          count: 3,
          dates: [day(-8), day(-6), day(0)],
          completedDays: ['sun', 'tue', 'mon'],
          sessions: [session('sun', -8), session('tue', -6), session('mon', 0)],
        },
      },
    });
    const next = rollElapsedWeeks(state, NOW);
    expect(next.currentWeek).toBe(4);
    expect(next.weekProgress[3].count).toBe(2);
    expect(next.weekProgress[3].completedDays).toEqual(['sun', 'tue']);
    expect(next.weekProgress[3].dates).toEqual([day(-8), day(-6)]);
    expect(next.weekProgress[4].count).toBe(1);
    expect(next.weekProgress[4].completedDays).toEqual(['mon']);
    expect(next.weekProgress[4].sessions).toEqual([session('mon', 0)]);
  });

  it('recomputes completion after moving a session out of the closing week', () => {
    const state = stateWith({
      sessionsPerWeek: 3,
      currentWeekStartDate: day(-8),
      weekProgress: {
        3: {
          count: 3, completed: true,
          dates: [day(-8), day(-6), day(0)],
          completedDays: ['sun', 'tue', 'mon'],
          sessions: [session('sun', -8), session('tue', -6), session('mon', 0)],
        },
      },
    });
    const next = rollElapsedWeeks(state, NOW);
    expect(next.weekProgress[3].completed).toBe(false);
    expect(next.weekProgress[4].completed).toBe(false);
  });

  it('counts an explicitly skipped day as a record, so the week still closes', () => {
    const state = stateWith({
      weekProgress: { 3: { count: 0, dates: [], completedDays: [], sessions: [], skippedDays: ['mon'] } },
    });
    expect(rollElapsedWeeks(state, NOW).currentWeek).toBe(4);
  });

  it('does not march an untouched week forward — it slides its anchor instead', () => {
    // Someone who stopped training for a month comes back to the week they
    // left, not to the peaking block they never trained.
    const state = stateWith({ currentWeekStartDate: day(-30), weekProgress: {} });
    const next = rollElapsedWeeks(state, NOW);
    expect(next.currentWeek).toBe(3);
    // The anchor is now within the last seven days, so the strip shows days
    // ahead of the user rather than a row of misses.
    const startMs = new Date(next.currentWeekStartDate).getTime();
    const diffDays = Math.round((addDays(NOW, 0).getTime() - startMs) / 864e5);
    expect(diffDays).toBeGreaterThanOrEqual(0);
    expect(diffDays).toBeLessThan(7);
  });

  it('closes each trained week in turn across a long gap', () => {
    const state = stateWith({
      currentWeek: 1,
      currentWeekStartDate: day(-21),
      weekProgress: {
        1: { count: 1, dates: [day(-21)], completedDays: ['mon'], sessions: [session('mon', -21)] },
        2: { count: 1, dates: [day(-14)], completedDays: ['mon'], sessions: [session('mon', -14)] },
      },
    });
    const next = rollElapsedWeeks(state, NOW);
    expect(next.currentWeek).toBe(3); // weeks 1 and 2 closed; week 3 is empty
    expect(next.currentWeekStartDate).toBe(day(0));
  });

  it('is idempotent', () => {
    const state = stateWith({
      weekProgress: { 3: { count: 2, dates: [day(-7), day(-5)], completedDays: ['mon', 'wed'], sessions: [session('mon', -7), session('wed', -5)] } },
    });
    const once = rollElapsedWeeks(state, NOW);
    expect(rollElapsedWeeks(once, NOW)).toBe(once);
  });

  it('leaves state untouched when the anchor is unreadable', () => {
    expect(rollElapsedWeeks(stateWith({ currentWeekStartDate: 'not a date' }), NOW))
      .toEqual(stateWith({ currentWeekStartDate: 'not a date' }));
    // `new Date(null)` is the epoch — a missing anchor must not be read as 1970.
    const noAnchor = stateWith({ currentWeekStartDate: null });
    expect(rollElapsedWeeks(noAnchor, NOW)).toBe(noAnchor);
    expect(rollElapsedWeeks(stateWith({ currentWeekStartDate: undefined }), NOW).currentWeek).toBe(3);
  });
});

describe('weekForToday', () => {
  it('is the current week once that week has started', () => {
    expect(weekForToday(stateWith({ currentWeekStartDate: day(0) }), NOW)).toBe(3);
    expect(weekForToday(stateWith({ currentWeekStartDate: day(-2) }), NOW)).toBe(3);
  });

  it('is the week that just closed while the new one is still anchored to tomorrow', () => {
    // finishSession anchors the new week to tomorrow, so today's session — the
    // one that closed the old week — still belongs to the old week.
    expect(weekForToday(stateWith({ currentWeek: 4, currentWeekStartDate: day(1) }), NOW)).toBe(3);
  });

  it('never goes below week 1, and survives a missing anchor', () => {
    expect(weekForToday({ currentWeek: 1, currentWeekStartDate: day(1) }, NOW)).toBe(1);
    expect(weekForToday({ currentWeek: 5 }, NOW)).toBe(5);
  });
});

describe('startOfProgramWeek', () => {
  it('walks seven days per week either side of the anchor', () => {
    const state = stateWith({ currentWeek: 3, currentWeekStartDate: day(0) });
    expect(startOfProgramWeek(state, 3, NOW).toDateString()).toBe(day(0));
    expect(startOfProgramWeek(state, 2, NOW).toDateString()).toBe(day(-7));
    expect(startOfProgramWeek(state, 4, NOW).toDateString()).toBe(day(7));
  });
});

describe('commitUnfinishedSession — logged sets are the record', () => {
  const PROGRAM = {
    mon: { title: 'PUSH', exercises: [{ id: 'bench' }, { id: 'ohp' }, { id: 'dips' }, { id: 'fly' }] },
  };

  function loggedState(overrides = {}) {
    return {
      currentWeek: 3,
      sessionsPerWeek: 3,
      trainingDays: ['mon', 'wed', 'fri'],
      dayTemplates: PROGRAM,
      weekProgress: { 3: { count: 0, dates: [], completedDays: [], sessions: [] } },
      totalSessions: 4,
      log: [],
      todayExDate: day(-7),     // last Monday
      todayExDone: ['bench', 'ohp', 'dips'],
      todayExDetails: { bench: { setsCompleted: 3 } },
      todaySessionFinished: false,
      ...overrides,
    };
  }

  it('records a session the user never tapped FINISH on, missed exercises and all', () => {
    const next = commitUnfinishedSession(loggedState(), NOW);
    const wp = next.weekProgress[3];
    expect(wp.count).toBe(1);
    expect(wp.completedDays).toEqual(['mon']);
    expect(wp.sessions[0]).toMatchObject({ date: day(-7), dayKey: 'mon', completion: 75 });
    expect(next.totalSessions).toBe(5);
    expect(next.log).toHaveLength(1);
  });

  it('completes the week when that session is the last one owed', () => {
    const next = commitUnfinishedSession(loggedState({
      weekProgress: { 3: { count: 2, dates: [], completedDays: ['wed', 'fri'], sessions: [] } },
      perfectWeeks: 1,
    }), NOW);
    expect(next.weekProgress[3].completed).toBe(true);
    expect(next.perfectWeeks).toBe(2);
  });

  it('leaves an in-progress session alone until its day is over', () => {
    const state = loggedState({ todayExDate: day(0) });
    expect(commitUnfinishedSession(state, NOW)).toBe(state);
  });

  it('does nothing when the session was already finished, or nothing was logged', () => {
    const finished = loggedState({ todaySessionFinished: true });
    expect(commitUnfinishedSession(finished, NOW)).toBe(finished);
    const empty = loggedState({ todayExDone: [] });
    expect(commitUnfinishedSession(empty, NOW)).toBe(empty);
  });

  it('never records the same day twice', () => {
    const already = loggedState({
      weekProgress: { 3: { count: 1, dates: [day(-7)], completedDays: ['mon'], sessions: [session('mon', -7)] } },
    });
    expect(commitUnfinishedSession(already, NOW)).toBe(already);
  });
});
