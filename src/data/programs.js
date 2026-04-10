/**
 * FitQuest Program Library
 * Each program defines: id, name, description, sessionsPerWeek, phases, exercises, startingWeights
 * All programs share the same 12-week / 4-phase structure so getPhase() in gameLogic works unchanged.
 */

// ── Shared phase structure (same for all programs) ──────────────────────────
export const SHARED_PHASES = [
  { weeks: [1, 2],   name: 'PHASE 1', desc: 'Foundation — Find working baselines',    icon: '🔍' },
  { weeks: [3, 8],   name: 'PHASE 2', desc: 'Linear Progression — +2.5kg/week',        icon: '📈' },
  { weeks: [9, 9],   name: 'PHASE 3', desc: 'Deload — 80% weight, 2 sets',             icon: '🧘' },
  { weeks: [10, 12], name: 'PHASE 4', desc: 'Continued Progression',                   icon: '⚡' }
];

// ── Program definitions ──────────────────────────────────────────────────────

const FULLBODY_3X = {
  id: 'fullbody_3x',
  name: 'Full Body 3×/week',
  description: 'The classic recomposition program. 3 full-body sessions per week with progressive overload.',
  sessionsPerWeek: 3,
  targetGoals: ['recomp', 'muscle', 'strength'],
  targetLevels: ['beginner', 'intermediate'],
  targetEquipment: ['full_gym', 'dumbbells'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'squat',    name: 'Barbell Squat',    sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 45,   note: 'Compound quad/glute — prioritize depth' },
    { id: 'bench',    name: 'Bench Press',       sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 42.5, note: 'Barbell or DB — whichever available' },
    { id: 'rdl',      name: 'Romanian Deadlift', sets: 3, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 55,   note: 'Hinge pattern — slight knee bend' },
    { id: 'pulldown', name: 'Lat Pulldown',      sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 47.5, note: 'Full stretch top, squeeze bottom' },
    { id: 'ohp',      name: 'DB Overhead Press', sets: 2, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 15,   note: 'Seated or standing — control negative' },
    { id: 'legcurl',  name: 'Leg Curl',          sets: 2, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 40,   note: 'Hips FLAT on pad — slow controlled reps' },
    { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const FULLBODY_2X = {
  id: 'fullbody_2x',
  name: 'Full Body 2×/week',
  description: 'High-volume full-body sessions for busy schedules. 2 sessions per week with extra sets to compensate for less frequency.',
  sessionsPerWeek: 2,
  targetGoals: ['recomp', 'fat_loss', 'muscle'],
  targetLevels: ['beginner', 'intermediate'],
  targetEquipment: ['full_gym', 'dumbbells'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'squat',    name: 'Barbell Squat',    sets: 4, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 45,   note: 'Compound quad/glute — prioritize depth' },
    { id: 'bench',    name: 'Bench Press',       sets: 4, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 42.5, note: 'Barbell or DB — whichever available' },
    { id: 'rdl',      name: 'Romanian Deadlift', sets: 4, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 55,   note: 'Hinge pattern — slight knee bend' },
    { id: 'pulldown', name: 'Lat Pulldown',      sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 47.5, note: 'Full stretch top, squeeze bottom' },
    { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 15,   note: 'Seated or standing — control negative' },
    { id: 'legcurl',  name: 'Leg Curl',          sets: 3, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 40,   note: 'Hips FLAT on pad — slow controlled reps' },
    { id: 'plank',    name: 'Plank',             sets: 3, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const FULLBODY_4X = {
  id: 'fullbody_4x',
  name: 'Full Body 4×/week',
  description: 'High-frequency full-body training for faster strength gains. 4 sessions per week, ideal for intermediate lifters.',
  sessionsPerWeek: 4,
  targetGoals: ['muscle', 'strength'],
  targetLevels: ['intermediate', 'advanced'],
  targetEquipment: ['full_gym'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'squat',    name: 'Barbell Squat',    sets: 3, reps: 8,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 60,   note: 'Compound quad/glute — prioritize depth' },
    { id: 'bench',    name: 'Bench Press',       sets: 3, reps: 8,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 55,   note: 'Barbell or DB — whichever available' },
    { id: 'rdl',      name: 'Romanian Deadlift', sets: 3, reps: 6,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 70,   note: 'Hinge pattern — slight knee bend' },
    { id: 'pulldown', name: 'Lat Pulldown',      sets: 3, reps: 8,  rest: '2 min',   restSec: 120, rpe: 8,   startKg: 55,   note: 'Full stretch top, squeeze bottom' },
    { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 7.5, startKg: 20,   note: 'Seated or standing — control negative' },
    { id: 'legcurl',  name: 'Leg Curl',          sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 8,   startKg: 45,   note: 'Hips FLAT on pad — slow controlled reps' },
    { id: 'plank',    name: 'Plank',             sets: 3, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const BODYWEIGHT_3X = {
  id: 'bodyweight_3x',
  name: 'Bodyweight 3×/week',
  description: 'No equipment needed. Full-body sessions using your own bodyweight. Progression through rep increases and harder variations.',
  sessionsPerWeek: 3,
  targetGoals: ['recomp', 'fat_loss'],
  targetLevels: ['beginner'],
  targetEquipment: ['bodyweight'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'pushup',   name: 'Push-up',           sets: 3, reps: 10, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 0, note: 'Chest to floor — full range every rep', isBodyweight: true },
    { id: 'bwsquat',  name: 'Bodyweight Squat',  sets: 3, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 6,   startKg: 0, note: 'Feet shoulder-width, drive knees out', isBodyweight: true },
    { id: 'hingerow', name: 'Inverted Row',       sets: 3, reps: 10, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 0, note: 'Use a table or bar — chest to hands', isBodyweight: true },
    { id: 'lunge',    name: 'Reverse Lunge',      sets: 3, reps: 10, rest: '60 sec',  restSec: 60,  rpe: 7,   startKg: 0, note: '10 reps each leg — step back, knee above floor', isBodyweight: true },
    { id: 'glute',    name: 'Glute Bridge',       sets: 3, reps: 15, rest: '60 sec',  restSec: 60,  rpe: 6,   startKg: 0, note: 'Squeeze glutes hard at the top', isBodyweight: true },
    { id: 'dipbench', name: 'Tricep Dip',         sets: 2, reps: 12, rest: '60 sec',  restSec: 60,  rpe: 7,   startKg: 0, note: 'Use a chair or bench — elbows back', isBodyweight: true },
    { id: 'plank',    name: 'Plank',              sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0, note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

export const PROGRAMS = [FULLBODY_3X, FULLBODY_2X, FULLBODY_4X, BODYWEIGHT_3X];

export function getProgramById(id) {
  return PROGRAMS.find(p => p.id === id) ?? FULLBODY_3X;
}

/**
 * Selects the best program given an assessment object.
 * Returns the program id string.
 */
export function selectProgram(assessment) {
  const { equipment, daysPerWeek, level } = assessment;

  if (equipment === 'bodyweight') return 'bodyweight_3x';
  if (daysPerWeek <= 2) return 'fullbody_2x';
  if (daysPerWeek >= 4 && level !== 'beginner') return 'fullbody_4x';
  return 'fullbody_3x'; // default: 3x/week full body
}

/**
 * Builds the initial liftWeights and liftHistory for a given program.
 * Called when a user completes the assessment and a program is assigned.
 */
export function buildInitialWeights(program) {
  const liftWeights = {};
  const liftHistory = {};
  for (const ex of program.exercises) {
    liftWeights[ex.id] = ex.startKg;
    liftHistory[ex.id] = [];
  }
  return { liftWeights, liftHistory };
}
