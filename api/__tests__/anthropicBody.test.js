import { describe, it, expect } from 'vitest';
import {
  sanitizeAnthropicBody,
  ALLOWED_MODELS,
  LEGACY_MODEL_ALIASES,
  DEFAULT_MODEL,
  MAX_OUTPUT_TOKENS,
} from '../_auth.js';

const messages = [{ role: 'user', content: 'hi' }];

describe('sanitizeAnthropicBody — model gating', () => {
  it('accepts every currently shipped model', () => {
    for (const model of ALLOWED_MODELS) {
      expect(sanitizeAnthropicBody({ model, messages }).model).toBe(model);
    }
  });

  it('only allows alias IDs, never dated snapshots', () => {
    for (const model of ALLOWED_MODELS) {
      expect(model).not.toMatch(/-\d{8}$/);
    }
  });

  it('remaps model IDs from older bundles instead of rejecting them', () => {
    for (const [legacy, current] of Object.entries(LEGACY_MODEL_ALIASES)) {
      expect(sanitizeAnthropicBody({ model: legacy, messages }).model).toBe(current);
      expect(ALLOWED_MODELS.has(current)).toBe(true);
    }
  });

  it('rejects an unknown model rather than silently downgrading it', () => {
    expect(sanitizeAnthropicBody({ model: 'gpt-4', messages })).toBeNull();
    expect(sanitizeAnthropicBody({ model: 'claude-opus-5', messages })).toBeNull();
  });

  it('falls back to the default when no model is given', () => {
    expect(sanitizeAnthropicBody({ messages }).model).toBe(DEFAULT_MODEL);
    expect(ALLOWED_MODELS.has(DEFAULT_MODEL)).toBe(true);
  });
});

describe('sanitizeAnthropicBody — thinking', () => {
  it('disables thinking on Sonnet 5 so it cannot eat a small max_tokens budget', () => {
    const out = sanitizeAnthropicBody({ model: 'claude-sonnet-5', max_tokens: 256, messages });
    expect(out.thinking).toEqual({ type: 'disabled' });
  });

  it('disables thinking for legacy Sonnet IDs too, once remapped', () => {
    const out = sanitizeAnthropicBody({ model: 'claude-sonnet-4-6', messages });
    expect(out.model).toBe('claude-sonnet-5');
    expect(out.thinking).toEqual({ type: 'disabled' });
  });

  it('leaves Haiku requests alone', () => {
    const out = sanitizeAnthropicBody({ model: 'claude-haiku-4-5', messages });
    expect(out.thinking).toBeUndefined();
  });

  it('ignores a client-supplied thinking field', () => {
    const out = sanitizeAnthropicBody({
      model: 'claude-haiku-4-5',
      messages,
      thinking: { type: 'adaptive' },
    });
    expect(out.thinking).toBeUndefined();
  });
});

describe('sanitizeAnthropicBody — payload shape', () => {
  it('clamps max_tokens and drops unknown top-level fields', () => {
    const out = sanitizeAnthropicBody({
      model: 'claude-haiku-4-5',
      max_tokens: 999999,
      messages,
      system: 'be brief',
      temperature: 0.7,
      metadata: { user_id: 'spoofed' },
    });
    expect(out.max_tokens).toBe(MAX_OUTPUT_TOKENS);
    expect(out.system).toBe('be brief');
    expect(out).not.toHaveProperty('temperature');
    expect(out).not.toHaveProperty('metadata');
  });

  it('defaults max_tokens when the value is missing or unusable', () => {
    expect(sanitizeAnthropicBody({ messages }).max_tokens).toBe(1024);
    expect(sanitizeAnthropicBody({ messages, max_tokens: 'lots' }).max_tokens).toBe(1024);
  });

  it('rejects a body with no messages', () => {
    expect(sanitizeAnthropicBody({ messages: [] })).toBeNull();
    expect(sanitizeAnthropicBody(null)).toBeNull();
  });
});
