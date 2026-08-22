import { describe, it, expect } from 'vitest';
import { _withTimeout as withTimeout, CLOUD_GET_TIMEOUT_MS } from '../storage';

const later = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));

/**
 * A hanging request is not a failing one: on a stalled mobile connection the
 * socket stays open and the Supabase client never rejects, so the cloud read
 * never settled and the sync splash stayed up with no way out.
 */
describe('withTimeout', () => {
  it('passes through a result that arrives in time', async () => {
    await expect(withTimeout(later(5, 'data'), 200, null)).resolves.toBe('data');
  });

  it('resolves to the fallback when the promise hangs', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, null)).resolves.toBeNull();
  });

  it('resolves to the fallback when the promise is merely slow', async () => {
    await expect(withTimeout(later(200, 'late'), 20, null)).resolves.toBeNull();
  });

  it('still surfaces a rejection rather than masking it as a timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 200, null)).rejects.toThrow('boom');
  });

  it('gives up well inside a user\'s patience', () => {
    expect(CLOUD_GET_TIMEOUT_MS).toBeGreaterThan(0);
    expect(CLOUD_GET_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});
