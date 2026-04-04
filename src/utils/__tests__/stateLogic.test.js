import { describe, it, expect } from 'vitest';

// pruneOldEntries is a private function inside useGameState.js.
// We duplicate the implementation here to test it in isolation —
// if the implementation ever changes, update this copy too.
const PRUNE_DAYS = 90;
function pruneOldEntries(arr, dateKey = 'date') {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PRUNE_DAYS);
  return (arr || []).filter(e => new Date(e[dateKey]) >= cutoff);
}

// Helper: create an entry N days ago
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// pruneOldEntries
// ---------------------------------------------------------------------------
describe('pruneOldEntries', () => {
  it('empty array returns empty array', () => {
    expect(pruneOldEntries([])).toEqual([]);
  });

  it('null/undefined returns empty array', () => {
    expect(pruneOldEntries(null)).toEqual([]);
    expect(pruneOldEntries(undefined)).toEqual([]);
  });

  it('all recent entries are kept', () => {
    const arr = [
      { date: daysAgo(0), name: 'today' },
      { date: daysAgo(30), name: '30d ago' },
      { date: daysAgo(89), name: '89d ago' },
    ];
    expect(pruneOldEntries(arr)).toHaveLength(3);
  });

  it('all old entries are removed', () => {
    const arr = [
      { date: daysAgo(91), name: '91d ago' },
      { date: daysAgo(180), name: '180d ago' },
      { date: daysAgo(365), name: '1yr ago' },
    ];
    expect(pruneOldEntries(arr)).toHaveLength(0);
  });

  it('mixed: keeps only entries within 90 days', () => {
    const arr = [
      { date: daysAgo(10), name: 'recent' },
      { date: daysAgo(89), name: 'edge recent' },
      { date: daysAgo(91), name: 'just over' },
      { date: daysAgo(200), name: 'old' },
    ];
    const result = pruneOldEntries(arr);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name)).toContain('recent');
    expect(result.map(e => e.name)).toContain('edge recent');
  });

  it('entry exactly at the 90-day boundary is kept', () => {
    const arr = [{ date: daysAgo(90), name: 'exactly 90d' }];
    // cutoff = today - 90 days; entry = today - 90 days → entry >= cutoff ✓
    expect(pruneOldEntries(arr)).toHaveLength(1);
  });

  it('entry 91 days old is removed', () => {
    const arr = [{ date: daysAgo(91), name: '91d ago' }];
    expect(pruneOldEntries(arr)).toHaveLength(0);
  });

  it('works with a custom dateKey', () => {
    const arr = [
      { timestamp: daysAgo(5),  name: 'recent' },
      { timestamp: daysAgo(100), name: 'old' },
    ];
    const result = pruneOldEntries(arr, 'timestamp');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('recent');
  });

  it('preserves the full structure of kept entries', () => {
    const entry = { date: daysAgo(1), calories: 500, protein: 30, meal: 'lunch' };
    const result = pruneOldEntries([entry]);
    expect(result[0]).toEqual(entry);
  });

  it('does not mutate the original array', () => {
    const arr = [
      { date: daysAgo(5), name: 'recent' },
      { date: daysAgo(200), name: 'old' },
    ];
    const original = [...arr];
    pruneOldEntries(arr);
    expect(arr).toEqual(original);
  });

  it('handles 1000 entries efficiently — only keeps entries within 90 days', () => {
    // 500 entries at 10 days ago (recent), 500 at 200 days ago (old)
    const recent = Array.from({ length: 500 }, (_, i) => ({ date: daysAgo(10), name: `recent-${i}` }));
    const old = Array.from({ length: 500 }, (_, i) => ({ date: daysAgo(200), name: `old-${i}` }));
    const result = pruneOldEntries([...recent, ...old]);
    expect(result).toHaveLength(500);
    result.forEach(e => expect(e.name.startsWith('recent')).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// mergeState logic (tested via behaviour, not import)
// Verifies DEFAULT_STATE fields are present after merge
// ---------------------------------------------------------------------------
describe('mergeState behaviour', () => {
  const DEFAULT_STATE = {
    level: 1, xp: 0, totalXp: 0, streak: 0, bestStreak: 0,
    currentWeek: 1, totalSessions: 0, totalVolume: 0, totalMinutes: 0,
    perfectWeeks: 0, checkins: 0, deloadDone: false,
    log: [], achDone: [], mealLogs: [],
    nutritionGoals: { calories: 2000, protein: 155, carbs: 190, fat: 60 },
  };

  function mergeState(saved) {
    return { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...saved };
  }

  it('merging empty saved state returns all defaults', () => {
    const merged = mergeState({});
    expect(merged.level).toBe(1);
    expect(merged.xp).toBe(0);
    expect(merged.log).toEqual([]);
  });

  it('saved fields override defaults', () => {
    const merged = mergeState({ level: 10, xp: 200, totalXp: 2364 });
    expect(merged.level).toBe(10);
    expect(merged.xp).toBe(200);
    expect(merged.totalXp).toBe(2364);
  });

  it('missing saved fields fall back to defaults', () => {
    const merged = mergeState({ level: 5 }); // no streak field
    expect(merged.streak).toBe(0);
    expect(merged.totalSessions).toBe(0);
  });

  it('nutritionGoals defaults are present', () => {
    const merged = mergeState({});
    expect(merged.nutritionGoals.calories).toBe(2000);
    expect(merged.nutritionGoals.protein).toBe(155);
  });

  it('custom nutritionGoals override defaults', () => {
    const merged = mergeState({ nutritionGoals: { calories: 2500, protein: 180, carbs: 200, fat: 70 } });
    expect(merged.nutritionGoals.calories).toBe(2500);
  });

  it('mergeState does not mutate DEFAULT_STATE', () => {
    const before = JSON.stringify(DEFAULT_STATE);
    mergeState({ level: 99, log: ['a', 'b'] });
    expect(JSON.stringify(DEFAULT_STATE)).toBe(before);
  });
});
