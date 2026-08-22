import { describe, it, expect, beforeEach } from 'vitest';
import {
  improvedLifts, triggerKey, loadFiredKeys, saveFiredKey, forgetFiredKey,
} from '../agentTriggers';

// Minimal localStorage for the node test environment
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
});

const pr = (weight, date = '2026-08-22') => ({ weight, date });

describe('improvedLifts', () => {
  it('reports nothing when the records are unchanged', () => {
    const recs = { incline_db: pr(22.5), bench: pr(57.5) };
    expect(improvedLifts(recs, recs)).toEqual([]);
  });

  it('ignores key order — the same records rebuilt are not a new PR', () => {
    // This is the bug: JSON.stringify({a,b}) !== JSON.stringify({b,a}), so a
    // cloud merge that re-serialized identical records read as a fresh PR.
    const before = { incline_db: pr(22.5), bench: pr(57.5) };
    const after  = { bench: pr(57.5), incline_db: pr(22.5) };
    expect(improvedLifts(before, after)).toEqual([]);
  });

  it('reports a lift that actually went up', () => {
    expect(improvedLifts({ incline_db: pr(20) }, { incline_db: pr(22.5) }))
      .toEqual(['incline_db']);
  });

  it('reports a brand-new lift', () => {
    expect(improvedLifts({ bench: pr(57.5) }, { bench: pr(57.5), squat: pr(80) }))
      .toEqual(['squat']);
  });

  it('does not celebrate a record corrected downward', () => {
    expect(improvedLifts({ incline_db: pr(25) }, { incline_db: pr(22.5) })).toEqual([]);
  });

  it('does not celebrate a record that was removed', () => {
    expect(improvedLifts({ bench: pr(57.5), squat: pr(80) }, { bench: pr(57.5) })).toEqual([]);
  });

  it('handles bare numbers as well as record objects', () => {
    expect(improvedLifts({ bench: 50 }, { bench: 55 })).toEqual(['bench']);
    expect(improvedLifts({ bench: 55 }, { bench: 50 })).toEqual([]);
  });

  it('treats missing input as empty rather than throwing', () => {
    expect(improvedLifts(null, null)).toEqual([]);
    expect(improvedLifts(undefined, { bench: pr(50) })).toEqual(['bench']);
  });

  it('returns every improved lift, sorted', () => {
    const before = { bench: pr(55), squat: pr(80), row: pr(40) };
    const after  = { bench: pr(57.5), squat: pr(85), row: pr(40) };
    expect(improvedLifts(before, after)).toEqual(['bench', 'squat']);
  });
});

describe('triggerKey', () => {
  it('is content-addressed, so the same event maps to the same key', () => {
    expect(triggerKey('pr_milestone', 'incline_db@22.5'))
      .toBe(triggerKey('pr_milestone', 'incline_db@22.5'));
  });

  it('separates different events of the same type', () => {
    expect(triggerKey('pr_milestone', 'incline_db@22.5'))
      .not.toBe(triggerKey('pr_milestone', 'bench@60'));
  });

  it('falls back to the bare trigger with no detail', () => {
    expect(triggerKey('onboarding')).toBe('onboarding');
  });
});

describe('fired-key persistence', () => {
  it('remembers a fired key across a simulated app restart', () => {
    // The original bug: this lived in a useRef, so every launch started empty
    // and re-fired every past event.
    saveFiredKey('u1', 'pr_milestone:incline_db@22.5');
    expect(loadFiredKeys('u1').has('pr_milestone:incline_db@22.5')).toBe(true);
  });

  it('keeps users separate', () => {
    saveFiredKey('u1', 'pr_milestone:bench@60');
    expect(loadFiredKeys('u2').has('pr_milestone:bench@60')).toBe(false);
  });

  it('lets a failed trigger be retried', () => {
    saveFiredKey('u1', 'post_workout:12');
    forgetFiredKey('u1', 'post_workout:12');
    expect(loadFiredKeys('u1').has('post_workout:12')).toBe(false);
  });

  it('prunes old keys instead of growing without bound', () => {
    for (let i = 0; i < 80; i++) saveFiredKey('u1', `post_workout:${i}`);
    const keys = loadFiredKeys('u1');
    expect(keys.size).toBeLessThanOrEqual(50);
    expect(keys.has('post_workout:79')).toBe(true); // newest survives
    expect(keys.has('post_workout:0')).toBe(false); // oldest pruned
  });

  it('degrades to empty rather than throwing when storage is unavailable', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(() => saveFiredKey('u1', 'x')).not.toThrow();
    expect(loadFiredKeys('u1').size).toBe(0);
  });

  it('survives a corrupt stored value', () => {
    localStorage.setItem('fitquest_agent_fired_u1', 'not json');
    expect(loadFiredKeys('u1').size).toBe(0);
  });
});
