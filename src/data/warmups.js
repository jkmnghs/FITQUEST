/**
 * Warm-up data — general and exercise-specific warm-ups (Phase 4.2)
 */

export const GENERAL_WARMUP = {
  duration: '3-5 minutes',
  options: [
    'Jumping jacks — 2 min',
    'Brisk walking — 3 min',
    'Rowing machine — 3 min (light effort)',
    'Jump rope — 2 min',
    'High knees in place — 1 min',
  ],
};

/**
 * Specific warm-up: ramp-up sets at 50% and 75% of working weight.
 */
export function getWarmupSets(workingWeight) {
  if (!workingWeight || workingWeight <= 0) return [];
  return [
    { pct: 50, weight: Math.round(workingWeight * 0.5 * 2) / 2, reps: 10, label: 'Light warm-up (50%)' },
    { pct: 75, weight: Math.round(workingWeight * 0.75 * 2) / 2, reps: 5, label: 'Working warm-up (75%)' },
  ];
}

/**
 * Mobility suggestions based on pain regions.
 */
export const MOBILITY_BY_REGION = {
  knees: [
    'Bodyweight squats to parallel — 10 reps (slow)',
    'Ankle circles — 10 each direction',
    'Hip circles (standing) — 10 each direction',
  ],
  shoulders: [
    'Arm circles — 10 forward, 10 backward',
    'Band pull-aparts — 15 reps',
    'Wall slides — 10 reps',
  ],
  lowerBack: [
    'Cat-cow stretch — 10 reps',
    'Bird-dog — 8 each side',
    'Dead bug — 8 each side',
  ],
  hips: [
    '90/90 hip stretch — 30s each side',
    'Hip circles (standing) — 10 each direction',
    'Pigeon stretch — 30s each side',
  ],
  wrists: [
    'Wrist circles — 10 each direction',
    'Prayer stretch — 20s',
    'Wrist flexor/extensor stretches — 15s each',
  ],
  neck: [
    'Neck circles — 5 each direction (slow)',
    'Chin tucks — 10 reps',
    'Neck side stretch — 15s each side',
  ],
};
