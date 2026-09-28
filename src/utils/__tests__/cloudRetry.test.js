import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const rpc = vi.fn();
vi.mock('../../lib/supabaseClient', () => ({ supabase: { rpc: (...a) => rpc(...a), from: vi.fn() } }));

const {
  cloudSet, markCloudLoadSettled, resetCloudLoadGate, getSyncStatus, _resetSyncStatus,
  retryCloudSaveNow, cloudClear,
} = await import('../storage');

const state = (n) => ({ totalSessions: n, log: [{}], totalXp: 10 });
const sent = () => rpc.mock.calls.map(([, args]) => args.p_patch.totalSessions);

describe('cloud save retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rpc.mockReset();
    _resetSyncStatus();
    markCloudLoadSettled('u1');
  });
  afterEach(() => {
    resetCloudLoadGate();
    vi.useRealTimers();
  });

  it('reports a failed save and retries it until it lands', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '500', message: 'boom' } })
       .mockResolvedValue({ error: null });
    await cloudSet('u1', state(5));
    expect(getSyncStatus().status).toBe('error');

    await vi.advanceTimersByTimeAsync(5_000);
    expect(sent()).toEqual([5, 5]);
    expect(getSyncStatus().status).toBe('saved');
  });

  it('never lets a retry of an older state replace a newer one', async () => {
    rpc.mockResolvedValue({ error: { code: '500', message: 'down' } });
    await cloudSet('u1', state(5));
    await cloudSet('u1', state(6));
    rpc.mockResolvedValue({ error: null });
    await vi.advanceTimersByTimeAsync(60_000);
    // Only the newest state is retried.
    expect(sent().slice(2)).toEqual([6]);
    expect(getSyncStatus().status).toBe('saved');
  });

  it('a newer successful save clears the pending retry', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '500', message: 'x' } })
       .mockResolvedValue({ error: null });
    await cloudSet('u1', state(5));
    await cloudSet('u1', state(6));
    expect(getSyncStatus().status).toBe('saved');
    await vi.advanceTimersByTimeAsync(300_000);
    expect(sent()).toEqual([5, 6]);
  });

  it('retry now sends immediately', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '500', message: 'x' } })
       .mockResolvedValue({ error: null });
    await cloudSet('u1', state(5));
    retryCloudSaveNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent()).toEqual([5, 5]);
  });

  it('waits while the write gate is shut instead of dropping the retry', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '500', message: 'x' } })
       .mockResolvedValue({ error: null });
    await cloudSet('u1', state(5));
    resetCloudLoadGate();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(sent()).toEqual([5]);
    markCloudLoadSettled('u1');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sent()).toEqual([5, 5]);
  });

  it('a progress reset discards the queued retry', async () => {
    rpc.mockResolvedValue({ error: { code: '500', message: 'x' } });
    await cloudSet('u1', state(5));
    await cloudClear('u1').catch(() => {});
    await vi.advanceTimersByTimeAsync(300_000);
    expect(sent()).toEqual([5]);
  });
});
