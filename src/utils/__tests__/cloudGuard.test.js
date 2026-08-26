import { describe, it, expect } from 'vitest';
import { isEmptyState, _withTimeout as withTimeout } from '../storage';

const populated = {
  totalSessions: 79, totalXp: 12400,
  log: [{ type: 'session', date: 'Mon Aug 17 2026' }],
  weeklyCheckins: [{ week: 18, weight: 64 }],
};
const fresh = { totalSessions: 0, totalXp: 0, log: [], weeklyCheckins: [] };

/**
 * A user opened the app and their 79 logged sessions were gone, replaced by
 * the onboarding questionnaire. The chain: the cloud read was slow, the
 * auto-save debounce (3s) fired first and wrote the in-memory default over the
 * populated row, then the read timed out and returned null — which the caller
 * read as "this account is empty" and offered onboarding.
 *
 * Two independent defects made that possible, and both are covered here: a
 * failed read was indistinguishable from an empty one, and an empty state was
 * allowed to overwrite a populated row.
 */
describe('isEmptyState', () => {
  it('recognises a real account as not empty', () => {
    expect(isEmptyState(populated)).toBe(false);
  });

  it('recognises the in-memory default that appears mid-load', () => {
    expect(isEmptyState(fresh)).toBe(true);
    expect(isEmptyState({})).toBe(true);
    expect(isEmptyState(null)).toBe(true);
  });

  it('treats any single sign of history as worth protecting', () => {
    expect(isEmptyState({ ...fresh, totalSessions: 1 })).toBe(false);
    expect(isEmptyState({ ...fresh, totalXp: 50 })).toBe(false);
    expect(isEmptyState({ ...fresh, log: [{ type: 'session' }] })).toBe(false);
    expect(isEmptyState({ ...fresh, weeklyCheckins: [{ week: 1 }] })).toBe(false);
  });

  it('does not depend on fields a partial load might not have populated', () => {
    // A state carrying only a name and settings is still empty of progress
    expect(isEmptyState({ ...fresh, name: 'Jake', unit: 'kg', level: 1 })).toBe(true);
  });
});

describe('withTimeout, as used by the cloud read', () => {
  it('returns the failure sentinel when the read hangs', async () => {
    const res = await withTimeout(new Promise(() => {}), 20, { ok: false, reason: 'timeout' });
    expect(res).toEqual({ ok: false, reason: 'timeout' });
  });

  it('passes a real answer through untouched', async () => {
    const ok = { ok: true, data: populated };
    await expect(withTimeout(Promise.resolve(ok), 200, { ok: false })).resolves.toBe(ok);
  });

  it('never reports a timeout as an empty account', async () => {
    // The distinction the whole fix rests on: {ok:false} is not {ok:true,data:null}
    const timedOut = await withTimeout(new Promise(() => {}), 10, { ok: false, reason: 'timeout' });
    expect(timedOut.ok).toBe(false);
    expect(timedOut).not.toHaveProperty('data');
  });
});
