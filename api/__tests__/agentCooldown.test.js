import { describe, it, expect } from 'vitest';
import { msSinceTrigger, isTriggerOnCooldown } from '../agent.js';

const NOW = Date.parse('2026-08-22T12:00:00Z');
const agoMs = (ms) => new Date(NOW - ms).toISOString();
const HOUR = 60 * 60 * 1000;

const msg = (trigger, ms) => ({ trigger, createdAt: agoMs(ms), message: 'x' });

describe('msSinceTrigger', () => {
  it('returns null when this trigger has never spoken', () => {
    expect(msSinceTrigger([], 'pr_milestone', NOW)).toBeNull();
    expect(msSinceTrigger([msg('post_workout', HOUR)], 'pr_milestone', NOW)).toBeNull();
    expect(msSinceTrigger(null, 'pr_milestone', NOW)).toBeNull();
  });

  it('measures from the newest matching message, not the first found', () => {
    const messages = [msg('pr_milestone', 10 * HOUR), msg('pr_milestone', 2 * HOUR)];
    expect(msSinceTrigger(messages, 'pr_milestone', NOW)).toBe(2 * HOUR);
  });

  it('ignores entries with an unparseable timestamp', () => {
    const messages = [{ trigger: 'pr_milestone', createdAt: 'sometime' }, msg('pr_milestone', 3 * HOUR)];
    expect(msSinceTrigger(messages, 'pr_milestone', NOW)).toBe(3 * HOUR);
  });
});

/**
 * Reproduces the reported failure: three near-identical "NEW PR" messages
 * about one lift, minutes apart, because each app launch re-fired the trigger.
 */
describe('isTriggerOnCooldown', () => {
  it('blocks a second PR message minutes after the first', () => {
    const messages = [msg('pr_milestone', 3 * 60 * 1000)];
    expect(isTriggerOnCooldown(messages, 'pr_milestone', NOW)).toBe(true);
  });

  it('blocks the third one too', () => {
    const messages = [msg('pr_milestone', 6 * 60 * 1000), msg('pr_milestone', 2 * 60 * 1000)];
    expect(isTriggerOnCooldown(messages, 'pr_milestone', NOW)).toBe(true);
  });

  it('allows a PR message once the next training day comes round', () => {
    expect(isTriggerOnCooldown([msg('pr_milestone', 7 * HOUR)], 'pr_milestone', NOW)).toBe(false);
  });

  it('never blocks the first message of a kind', () => {
    expect(isTriggerOnCooldown([], 'pr_milestone', NOW)).toBe(false);
    expect(isTriggerOnCooldown([msg('post_workout', 60 * 1000)], 'pr_milestone', NOW)).toBe(false);
  });

  it('keeps triggers independent — a workout message does not mute a PR', () => {
    const messages = [msg('post_workout', 60 * 1000)];
    expect(isTriggerOnCooldown(messages, 'post_workout', NOW)).toBe(true);
    expect(isTriggerOnCooldown(messages, 'pr_milestone', NOW)).toBe(false);
  });

  it('never blocks onboarding, which has no cooldown', () => {
    expect(isTriggerOnCooldown([msg('onboarding', 1000)], 'onboarding', NOW)).toBe(false);
  });

  it('holds reengagement for a full day so nobody is nagged twice', () => {
    expect(isTriggerOnCooldown([msg('reengagement', 20 * HOUR)], 'reengagement', NOW)).toBe(true);
    expect(isTriggerOnCooldown([msg('reengagement', 25 * HOUR)], 'reengagement', NOW)).toBe(false);
  });
});
