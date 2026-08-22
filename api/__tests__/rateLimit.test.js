import { describe, it, expect } from 'vitest';
import { checkRateLimit, consumeDailyQuota } from '../_auth.js';

describe('checkRateLimit', () => {
  it('allows requests up to the max and refuses the next one', () => {
    const user = `u-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('t', user, { max: 5 })).toBe(true);
    }
    expect(checkRateLimit('t', user, { max: 5 })).toBe(false);
  });

  it('keeps buckets separate so one route cannot exhaust another', () => {
    const user = `u-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit('coach', user, { max: 3 });
    expect(checkRateLimit('coach', user, { max: 3 })).toBe(false);
    expect(checkRateLimit('nutrition', user, { max: 3 })).toBe(true);
  });

  it('keeps users separate', () => {
    const a = `a-${Math.random()}`, b = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit('t', a, { max: 3 });
    expect(checkRateLimit('t', a, { max: 3 })).toBe(false);
    expect(checkRateLimit('t', b, { max: 3 })).toBe(true);
  });

  it('starts a fresh window once the old one has elapsed', async () => {
    const user = `u-${Math.random()}`;
    expect(checkRateLimit('t', user, { max: 1, windowMs: 20 })).toBe(true);
    expect(checkRateLimit('t', user, { max: 1, windowMs: 20 })).toBe(false);
    await new Promise(r => setTimeout(r, 30));
    expect(checkRateLimit('t', user, { max: 1, windowMs: 20 })).toBe(true);
  });
});

/** Minimal Supabase stand-in: one row of state, recording RPC patches. */
function fakeSupabase(state) {
  const patches = [];
  return {
    patches,
    state,
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { state } }) }),
      }),
    }),
    rpc: async (_name, args) => {
      patches.push(args.p_patch);
      Object.assign(state, args.p_patch);
      return { error: null };
    },
  };
}

const opts = { countField: 'calls', dateField: 'callsDate', limit: 3 };
const today = () => new Date().toISOString().slice(0, 10);

describe('consumeDailyQuota', () => {
  it('charges a call and stamps the date', async () => {
    const db = fakeSupabase({});
    const res = await consumeDailyQuota(db, 'u1', opts);
    expect(res.ok).toBe(true);
    expect(db.state.calls).toBe(1);
    expect(db.state.callsDate).toBe(today());
  });

  it('refuses once the daily limit is reached', async () => {
    const db = fakeSupabase({ calls: 3, callsDate: today() });
    const res = await consumeDailyQuota(db, 'u1', opts);
    expect(res.ok).toBe(false);
    expect(res.limit).toBe(3);
    expect(db.patches).toHaveLength(0); // nothing charged on refusal
  });

  it('rolls over on a new day rather than trusting a stale count', async () => {
    const db = fakeSupabase({ calls: 99, callsDate: '2020-01-01' });
    const res = await consumeDailyQuota(db, 'u1', opts);
    expect(res.ok).toBe(true);
    expect(db.state.calls).toBe(1);
    expect(db.state.callsDate).toBe(today());
  });

  it('degrades open when the datastore is unreachable', async () => {
    const broken = {
      from: () => ({ select: () => ({ eq: () => ({ single: async () => { throw new Error('down'); } }) }) }),
      rpc: async () => ({ error: null }),
    };
    const res = await consumeDailyQuota(broken, 'u1', opts);
    expect(res.ok).toBe(true);
  });
});
