import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from '../../lib/apiError';

const res = (status, body) => ({ status, json: async () => body });

describe('apiErrorMessage', () => {
  it('shows our routes\' own message as written', async () => {
    expect(await apiErrorMessage(res(429, { error: 'Weekly quest message limit reached (5/5). Resets Monday.' })))
      .toBe('Weekly quest message limit reached (5/5). Resets Monday.');
  });

  it('unwraps an Anthropic error object instead of showing [object Object]', async () => {
    const msg = await apiErrorMessage(res(400, { type: 'error', error: { type: 'invalid_request_error', message: 'bad schema' } }), 'Food analysis failed');
    expect(msg).toBe('Food analysis failed: bad schema');
  });

  it('falls back to the status when there is no body', async () => {
    expect(await apiErrorMessage({ status: 502, json: async () => { throw new Error(); } }, 'Coach unavailable'))
      .toBe('Coach unavailable (502). Try again.');
  });
});
