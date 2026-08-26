import { describe, it, expect } from 'vitest';

/**
 * The nudge rule, kept as a pure function here so it can be asserted without a
 * DOM. Mirrors ExportNudge in components/BackupCard.jsx.
 *
 * The point of the rule is restraint: nagging someone with nothing to lose, or
 * who backed up yesterday, trains them to ignore it — and then it is not there
 * when it matters.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 14;

function shouldNudge(state, now = Date.now()) {
  const sessions = Number(state?.totalSessions) || 0;
  if (sessions === 0) return false;
  const last = state?.lastExportAt;
  if (!last) return true;
  return Math.floor((now - last) / DAY_MS) >= STALE_DAYS;
}

const NOW = Date.parse('2026-08-26T00:00:00Z');
const daysAgo = n => NOW - n * DAY_MS;

describe('export nudge', () => {
  it('stays quiet for an account with nothing to lose', () => {
    expect(shouldNudge({ totalSessions: 0, lastExportAt: null }, NOW)).toBe(false);
  });

  it('appears for a user with progress who has never exported', () => {
    expect(shouldNudge({ totalSessions: 79, lastExportAt: null }, NOW)).toBe(true);
  });

  it('stays quiet just after a backup', () => {
    expect(shouldNudge({ totalSessions: 79, lastExportAt: daysAgo(1) }, NOW)).toBe(false);
    expect(shouldNudge({ totalSessions: 79, lastExportAt: daysAgo(13) }, NOW)).toBe(false);
  });

  it('appears once the backup is stale', () => {
    expect(shouldNudge({ totalSessions: 79, lastExportAt: daysAgo(14) }, NOW)).toBe(true);
    expect(shouldNudge({ totalSessions: 79, lastExportAt: daysAgo(90) }, NOW)).toBe(true);
  });

  it('appears after a single session rather than waiting for a milestone', () => {
    expect(shouldNudge({ totalSessions: 1, lastExportAt: null }, NOW)).toBe(true);
  });

  it('treats an unparseable timestamp as never backed up', () => {
    expect(shouldNudge({ totalSessions: 79, lastExportAt: undefined }, NOW)).toBe(true);
  });
});
