import { describe, it, expect } from 'vitest';
import {
  getLastPerformance, estimate1RM, best1RM, platesPerSide,
} from '../exerciseHistory';

function sessionEntry({ week, dateStr, details }) {
  return { type: 'session', week, dateStr, exerciseDetails: details };
}

describe('getLastPerformance', () => {
  it('returns null when there is no log', () => {
    expect(getLastPerformance({}, 'squat')).toBeNull();
    expect(getLastPerformance({ log: [] }, 'squat')).toBeNull();
    expect(getLastPerformance(null, 'squat')).toBeNull();
    expect(getLastPerformance({ log: [] }, null)).toBeNull();
  });

  it('reads the most recent session containing the exercise', () => {
    const state = {
      log: [
        sessionEntry({ week: 1, dateStr: 'Mon, Jan 1', details: { squat: { setsCompleted: 3, maxWeight: 60, repsPerSet: [8, 8, 8] } } }),
        sessionEntry({ week: 2, dateStr: 'Wed, Jan 10', details: { squat: { setsCompleted: 3, maxWeight: 65, repsPerSet: [8, 7, 6] } } }),
      ],
    };
    const last = getLastPerformance(state, 'squat');
    expect(last.maxWeight).toBe(65);
    expect(last.repsPerSet).toEqual([8, 7, 6]);
    expect(last.week).toBe(2);
    expect(last.dateStr).toBe('Wed, Jan 10');
  });

  it('skips sessions where the exercise was prescribed but never logged', () => {
    const state = {
      log: [
        sessionEntry({ week: 1, details: { squat: { setsCompleted: 3, maxWeight: 60, repsPerSet: [8, 8, 8] } } }),
        sessionEntry({ week: 2, details: { squat: { setsCompleted: 0, maxWeight: 0, repsPerSet: [] } } }),
      ],
    };
    expect(getLastPerformance(state, 'squat').maxWeight).toBe(60);
  });

  it('ignores non-session log entries', () => {
    const state = {
      log: [
        sessionEntry({ week: 1, details: { squat: { setsCompleted: 3, maxWeight: 60, repsPerSet: [5] } } }),
        { type: 'exercise', name: 'squat (3/3 sets)', week: 2 },
      ],
    };
    expect(getLastPerformance(state, 'squat').maxWeight).toBe(60);
  });

  it('drops zero-rep entries from repsPerSet', () => {
    const state = {
      log: [sessionEntry({ week: 1, details: { bench: { setsCompleted: 2, maxWeight: 40, repsPerSet: [10, 0, 8] } } })],
    };
    expect(getLastPerformance(state, 'bench').repsPerSet).toEqual([10, 8]);
  });

  it('returns null for an exercise that has never been logged', () => {
    const state = {
      log: [sessionEntry({ week: 1, details: { squat: { setsCompleted: 3, maxWeight: 60, repsPerSet: [8] } } })],
    };
    expect(getLastPerformance(state, 'deadlift')).toBeNull();
  });
});

describe('estimate1RM', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('applies the Epley formula', () => {
    // 100 × (1 + 5/30) = 116.67
    expect(estimate1RM(100, 5)).toBeCloseTo(116.7, 1);
  });

  it('refuses rep counts where the estimate stops being meaningful', () => {
    expect(estimate1RM(100, 13)).toBeNull();
    expect(estimate1RM(100, 0)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(undefined, 5)).toBeNull();
  });
});

describe('best1RM', () => {
  it('takes the best estimate across completed sets only', () => {
    const sets = [
      { done: true,  weightKg: 60, reps: 10 }, // 80
      { done: true,  weightKg: 80, reps: 5 },  // 93.3
      { done: false, weightKg: 200, reps: 1 }, // skipped — not completed
    ];
    expect(best1RM(sets)).toBeCloseTo(93.3, 1);
  });

  it('returns null when nothing is logged', () => {
    expect(best1RM([])).toBeNull();
    expect(best1RM([{ done: false, weightKg: 100, reps: 5 }])).toBeNull();
    expect(best1RM(null)).toBeNull();
  });
});

describe('platesPerSide', () => {
  it('breaks a load into the heaviest plates first', () => {
    // 100 kg on a 20 kg bar = 40 per side = 25 + 15
    expect(platesPerSide(100).plates).toEqual([
      { kg: 25, count: 1 },
      { kg: 15, count: 1 },
    ]);
  });

  it('reports an empty bar when the target is the bar weight', () => {
    expect(platesPerSide(20)).toEqual({ plates: [], remainderKg: 0 });
  });

  it('returns null below the bar weight', () => {
    expect(platesPerSide(15)).toBeNull();
    expect(platesPerSide(0)).toBeNull();
  });

  it('honours a non-standard bar', () => {
    // 60 kg on a 10 kg bar = 25 per side = 25
    expect(platesPerSide(60, 10).plates).toEqual([{ kg: 25, count: 1 }]);
  });

  it('handles fractional plates exactly', () => {
    // 62.5 on a 20 kg bar = 21.25 per side = 20 + 1.25
    expect(platesPerSide(62.5).plates).toEqual([
      { kg: 20, count: 1 },
      { kg: 1.25, count: 1 },
    ]);
    expect(platesPerSide(62.5).remainderKg).toBe(0);
  });

  it('surfaces a remainder that no plate combination can make', () => {
    // 21 kg → 0.5 per side, below the smallest 1.25 plate
    const result = platesPerSide(21);
    expect(result.plates).toEqual([]);
    expect(result.remainderKg).toBe(0.5);
  });

  it('stacks multiples of the same plate', () => {
    // 140 kg on a 20 kg bar = 60 per side = 25 + 25 + 10
    expect(platesPerSide(140).plates).toEqual([
      { kg: 25, count: 2 },
      { kg: 10, count: 1 },
    ]);
  });
});
