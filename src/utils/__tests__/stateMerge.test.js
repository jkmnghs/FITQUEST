import { describe, it, expect } from 'vitest';
import { mergeCloudAndLocal, sameProgress } from '../stateMerge';

const day = (offset) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toDateString();
};

describe('mergeCloudAndLocal', () => {
  it('picks the base by real date, not by comparing date strings', () => {
    // "Sun …" sorts after "Mon …" as a string, which made the older copy win.
    const cloud = { lastDate: 'Sun Sep 27 2026', unit: 'lb' };
    const local = { lastDate: 'Mon Sep 28 2026', unit: 'kg' };
    expect(mergeCloudAndLocal(local, cloud).unit).toBe('kg');
    expect(mergeCloudAndLocal(cloud, local).unit).toBe('kg');
  });

  it('keeps log history past 200 entries within the retention window', () => {
    const log = Array.from({ length: 300 }, (_, i) => ({
      type: 'exercise', name: `ex${i}`, date: day(-Math.floor(i / 10)), dateStr: 'same minute',
    }));
    const merged = mergeCloudAndLocal({ log }, { log: log.slice(0, 100) });
    expect(merged.log).toHaveLength(300);
  });

  it('keeps distinct exercises logged in the same minute, dedupes true copies', () => {
    const a = { type: 'exercise', name: 'squat', date: day(0), dateStr: 'Mon, 10:01 AM' };
    const b = { type: 'exercise', name: 'bench', date: day(0), dateStr: 'Mon, 10:01 AM' };
    const merged = mergeCloudAndLocal({ log: [a, b] }, { log: [a] });
    expect(merged.log.map(e => e.name)).toEqual(['squat', 'bench']);
  });

  it('drops log entries older than the retention window', () => {
    const old = { type: 'session', name: 'old', date: day(-120) };
    const recent = { type: 'session', name: 'new', date: day(-1) };
    expect(mergeCloudAndLocal({ log: [old, recent] }, { log: [] }).log).toEqual([recent]);
  });

  it('takes the higher week together with its start date', () => {
    const cloud = { currentWeek: 36, currentWeekStartDate: 'Mon Sep 21 2026', lastDate: day(0) };
    const local = { currentWeek: 37, currentWeekStartDate: 'Mon Sep 28 2026', lastDate: day(-1) };
    const merged = mergeCloudAndLocal(local, cloud);
    expect(merged.currentWeek).toBe(37);
    expect(merged.currentWeekStartDate).toBe('Mon Sep 28 2026');
  });

  it('unions skipped days, dropping any that were trained on the other device', () => {
    const cloud = { lastDate: day(0), weekProgress: { 5: { count: 1, completedDays: ['mon'], skippedDays: ['fri'] } } };
    const local = { lastDate: day(-1), weekProgress: { 5: { count: 1, completedDays: ['wed'], skippedDays: ['mon', 'sat'] } } };
    const wp = mergeCloudAndLocal(local, cloud).weekProgress[5];
    expect(wp.completedDays.sort()).toEqual(['mon', 'wed']);
    expect(wp.skippedDays.sort()).toEqual(['fri', 'sat']);
  });
});

describe('sameProgress', () => {
  const base = { totalSessions: 40, currentWeek: 37, lastDate: 'Mon Sep 28 2026', log: [{}, {}], totalXp: 900 };

  it('treats an identical cloud copy as nothing to merge', () => {
    expect(sameProgress(base, { ...base, unit: 'kg' })).toBe(true);
  });

  it('notices a session logged on another device', () => {
    expect(sameProgress(base, { ...base, totalSessions: 41, log: [{}, {}, {}] })).toBe(false);
  });
});
