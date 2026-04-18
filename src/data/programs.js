/**
 * FitQuest Program Library
 * Each program defines: id, name, description, sessionsPerWeek, phases, exercises, startingWeights
 * All programs share the same 12-week / 4-phase structure so getPhase() in gameLogic works unchanged.
 */

// ── Shared phase structure with deload weeks (Phase 4.1) ──────────────────
export const SHARED_PHASES = [
  { weeks: [1, 3],   name: 'PHASE 1', desc: 'Adaptation — Build foundations',          icon: '🔍' },
  { weeks: [4, 4],   name: 'DELOAD',  desc: 'Deload — Recovery week (reduced volume)', icon: '🧘' },
  { weeks: [5, 7],   name: 'PHASE 2', desc: 'Hypertrophy — Progressive overload',      icon: '📈' },
  { weeks: [8, 8],   name: 'DELOAD',  desc: 'Deload — Recovery week (reduced volume)', icon: '🧘' },
  { weeks: [9, 11],  name: 'PHASE 3', desc: 'Strength/Peak — Intensity focus',         icon: '⚡' },
  { weeks: [12, 12], name: 'DELOAD',  desc: 'Deload + Program Review',                 icon: '🏆' },
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

const DUMBBELL_ONLY_3X = {
  id: 'dumbbell_only_3x',
  name: 'Dumbbells Only 3×/week',
  description: 'True dumbbells-only program — no machines, no barbell. Perfect for home gyms.',
  sessionsPerWeek: 3,
  targetGoals: ['recomp', 'fat_loss', 'muscle'],
  targetLevels: ['beginner', 'intermediate'],
  targetEquipment: ['dumbbells_only'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'dbsquat',  name: 'DB Goblet Squat',      sets: 3, reps: 12, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Hold DB at chest — sit deep, knees out' },
    { id: 'dbbench',  name: 'DB Bench Press',        sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Full range — touch chest, lock out top' },
    { id: 'dbrdl',    name: 'DB Romanian Deadlift',  sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Hinge at hips — feel hamstring stretch' },
    { id: 'dbrow',    name: 'DB Bent-Over Row',      sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 14,   note: 'Chest parallel to floor — pull to hip, not chest' },
    { id: 'dbohp',    name: 'DB Overhead Press',     sets: 2, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 12,   note: 'Seated or standing — control negative' },
    { id: 'dblunge',  name: 'DB Reverse Lunge',      sets: 2, reps: 10, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 10,   note: '10 reps each leg — knee above floor on back leg' },
    { id: 'plank',    name: 'Plank',                 sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const DUMBBELL_3X = {
  id: 'dumbbell_3x',
  name: 'Dumbbell 3×/week',
  description: 'Full-body program using dumbbells and machines only. No barbell required.',
  sessionsPerWeek: 3,
  targetGoals: ['recomp', 'fat_loss', 'muscle'],
  targetLevels: ['beginner', 'intermediate'],
  targetEquipment: ['dumbbells'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'dbsquat',  name: 'DB Goblet Squat',      sets: 3, reps: 12, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Hold DB at chest — sit deep, knees out' },
    { id: 'dbbench',  name: 'DB Bench Press',        sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Full range — touch chest, lock out top' },
    { id: 'dbrdl',    name: 'DB Romanian Deadlift',  sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 16,   note: 'Hinge at hips — feel hamstring stretch' },
    { id: 'pulldown', name: 'Lat Pulldown',          sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 47.5, note: 'Full stretch top, squeeze bottom' },
    { id: 'dbohp',    name: 'DB Overhead Press',     sets: 2, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 12,   note: 'Seated or standing — control negative' },
    { id: 'legcurl',  name: 'Leg Curl',              sets: 2, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 40,   note: 'Hips FLAT on pad — slow controlled reps' },
    { id: 'plank',    name: 'Plank',                 sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const DUMBBELL_4X = {
  id: 'dumbbell_4x',
  name: 'Dumbbell 4×/week',
  description: 'Higher frequency dumbbell program for intermediate lifters without barbell access.',
  sessionsPerWeek: 4,
  targetGoals: ['muscle', 'strength', 'recomp'],
  targetLevels: ['intermediate', 'advanced'],
  targetEquipment: ['dumbbells'],
  phases: SHARED_PHASES,
  exercises: [
    { id: 'dbsquat',  name: 'DB Goblet Squat',      sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 20,   note: 'Hold DB at chest — sit deep, knees out' },
    { id: 'dbbench',  name: 'DB Bench Press',        sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 20,   note: 'Full range — touch chest, lock out top' },
    { id: 'dbrdl',    name: 'DB Romanian Deadlift',  sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 20,   note: 'Hinge at hips — feel hamstring stretch' },
    { id: 'pulldown', name: 'Lat Pulldown',          sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 55,   note: 'Full stretch top, squeeze bottom' },
    { id: 'dbohp',    name: 'DB Overhead Press',     sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 15,   note: 'Seated or standing — control negative' },
    { id: 'legcurl',  name: 'Leg Curl',              sets: 3, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 45,   note: 'Hips FLAT on pad — slow controlled reps' },
    { id: 'plank',    name: 'Plank',                 sets: 3, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true }
  ]
};

const UPPER_LOWER_4X = {
  id: 'upper_lower_4x',
  name: 'Upper / Lower Split — 4x/Week',
  description: 'Alternate upper and lower body days for balanced strength and hypertrophy.',
  sessionsPerWeek: 4,
  targetGoals: ['recomp', 'muscle', 'strength'],
  targetLevels: ['intermediate', 'advanced'],
  targetEquipment: ['full_gym', 'barbell_home'],
  phases: SHARED_PHASES,
  templates: [
    {
      id: 'upper_a', name: 'Upper A — Strength',
      exercises: [
        { id: 'bench',    name: 'Bench Press',       sets: 4, reps: 6,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 55,   note: 'Control descent — 2s down, drive up' },
        { id: 'pulldown', name: 'Lat Pulldown',      sets: 4, reps: 6,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 57.5, note: 'Full stretch at top, squeeze at bottom' },
        { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 8,  rest: '2 min',   restSec: 120, rpe: 8,   startKg: 20,   note: 'Seated or standing — brace core' },
        { id: 'dbrow',    name: 'DB Bent-Over Row',  sets: 3, reps: 8,  rest: '2 min',   restSec: 120, rpe: 8,   startKg: 24,   note: 'Pull to hip, not chest — chest parallel to floor' },
        { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s — stop if lower back sags', isPlank: true },
      ],
    },
    {
      id: 'lower_a', name: 'Lower A — Strength',
      exercises: [
        { id: 'squat',   name: 'Barbell Squat',      sets: 4, reps: 6,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 65,   note: 'Prioritize depth — break parallel' },
        { id: 'rdl',     name: 'Romanian Deadlift',  sets: 4, reps: 6,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 75,   note: 'Hinge at hips — feel hamstring stretch' },
        { id: 'legcurl', name: 'Leg Curl',           sets: 3, reps: 10, rest: '90 sec',  restSec: 90,  rpe: 8,   startKg: 45,   note: 'Hips FLAT on pad — slow controlled reps' },
        { id: 'plank',   name: 'Plank',              sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
    {
      id: 'upper_b', name: 'Upper B — Volume',
      exercises: [
        { id: 'bench',    name: 'Bench Press',       sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 7.5, startKg: 47.5, note: 'Controlled reps — feel the chest work' },
        { id: 'pulldown', name: 'Lat Pulldown',      sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 7.5, startKg: 50,   note: 'Full stretch at top, squeeze at bottom' },
        { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 17.5, note: 'Seated or standing — control negative' },
        { id: 'dbrow',    name: 'DB Bent-Over Row',  sets: 3, reps: 12, rest: '2 min',   restSec: 120, rpe: 7.5, startKg: 22,   note: 'Pull to hip — squeeze at top' },
        { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
    {
      id: 'lower_b', name: 'Lower B — Volume',
      exercises: [
        { id: 'squat',   name: 'Barbell Squat',      sets: 4, reps: 10, rest: '2.5 min', restSec: 150, rpe: 7.5, startKg: 57.5, note: 'Controlled descent — sit back slightly' },
        { id: 'rdl',     name: 'Romanian Deadlift',  sets: 4, reps: 10, rest: '2.5 min', restSec: 150, rpe: 7.5, startKg: 65,   note: 'Hinge at hips — feel hamstring stretch' },
        { id: 'legcurl', name: 'Leg Curl',           sets: 3, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 40,   note: 'Hips FLAT on pad — slow controlled reps' },
        { id: 'plank',   name: 'Plank',              sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
  ],
};
UPPER_LOWER_4X.exercises = UPPER_LOWER_4X.templates[0].exercises;

const UPPER_LOWER_3X = {
  id: 'upper_lower_3x',
  name: 'Upper / Lower Split — 3x/Week',
  description: 'Alternate upper and lower body each session for full-body coverage at 3 days/week.',
  sessionsPerWeek: 3,
  targetGoals: ['recomp', 'muscle', 'strength'],
  targetLevels: ['beginner', 'intermediate'],
  targetEquipment: ['full_gym', 'barbell_home'],
  phases: SHARED_PHASES,
  templates: [
    {
      id: 'upper', name: 'Upper Body',
      exercises: [
        { id: 'bench',    name: 'Bench Press',       sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 47.5, note: 'Control descent — chest to touch' },
        { id: 'pulldown', name: 'Lat Pulldown',      sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 50,   note: 'Full stretch at top, squeeze at bottom' },
        { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 17.5, note: 'Seated or standing — control negative' },
        { id: 'dbrow',    name: 'DB Bent-Over Row',  sets: 3, reps: 12, rest: '2 min',   restSec: 120, rpe: 7.5, startKg: 22,   note: 'Pull to hip, not chest' },
        { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
    {
      id: 'lower', name: 'Lower Body',
      exercises: [
        { id: 'squat',   name: 'Barbell Squat',      sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 55,   note: 'Prioritize depth — break parallel' },
        { id: 'rdl',     name: 'Romanian Deadlift',  sets: 3, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 65,   note: 'Hinge at hips — feel hamstring stretch' },
        { id: 'legcurl', name: 'Leg Curl',           sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 42.5, note: 'Hips FLAT on pad — slow controlled reps' },
        { id: 'ohp',     name: 'DB Overhead Press',  sets: 2, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 15,   note: 'Shoulder accessory on leg day' },
        { id: 'plank',   name: 'Plank',              sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
  ],
};
UPPER_LOWER_3X.exercises = UPPER_LOWER_3X.templates[0].exercises;

const PPL_3X = {
  id: 'ppl_3x',
  name: 'Push / Pull / Legs — 3x/Week',
  description: 'Rotate Push, Pull, and Legs each session. Best for intermediate lifters wanting muscle.',
  sessionsPerWeek: 3,
  targetGoals: ['muscle', 'recomp', 'strength'],
  targetLevels: ['intermediate', 'advanced'],
  targetEquipment: ['full_gym', 'barbell_home'],
  phases: SHARED_PHASES,
  templates: [
    {
      id: 'push', name: 'Push — Chest & Shoulders',
      exercises: [
        { id: 'bench',    name: 'Bench Press',       sets: 4, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 52.5, note: 'Control descent — drive up explosively' },
        { id: 'ohp',      name: 'DB Overhead Press', sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 18,   note: 'Seated or standing — full extension at top' },
        { id: 'dbbench',  name: 'DB Bench Press',    sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7.5, startKg: 18,   note: 'Flare elbows 45° — stretch at bottom' },
        { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
    {
      id: 'pull', name: 'Pull — Back & Biceps',
      exercises: [
        { id: 'pulldown', name: 'Lat Pulldown',      sets: 4, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 52.5, note: 'Full stretch at top, squeeze lats at bottom' },
        { id: 'dbrow',    name: 'DB Bent-Over Row',  sets: 4, reps: 10, rest: '2 min',   restSec: 120, rpe: 8,   startKg: 24,   note: 'Pull to hip — chest parallel to floor' },
        { id: 'rdl',      name: 'Romanian Deadlift', sets: 3, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8,   startKg: 65,   note: 'Hinge hips back — feel hamstring stretch' },
        { id: 'plank',    name: 'Plank',             sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
    {
      id: 'legs', name: 'Legs — Quads & Hamstrings',
      exercises: [
        { id: 'squat',   name: 'Barbell Squat',      sets: 4, reps: 8,  rest: '3 min',   restSec: 180, rpe: 8,   startKg: 62.5, note: 'Break parallel — drive knees out' },
        { id: 'legcurl', name: 'Leg Curl',           sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 8,   startKg: 45,   note: 'Hips FLAT on pad — slow reps' },
        { id: 'dbsquat', name: 'DB Goblet Squat',    sets: 3, reps: 15, rest: '90 sec',  restSec: 90,  rpe: 7,   startKg: 20,   note: 'Hold DB at chest — sit deep, knees out' },
        { id: 'plank',   name: 'Plank',              sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0,   startKg: 0,    note: 'Hold 45-60s', isPlank: true },
      ],
    },
  ],
};
PPL_3X.exercises = PPL_3X.templates[0].exercises;

export const PROGRAMS = [FULLBODY_3X, FULLBODY_2X, FULLBODY_4X, UPPER_LOWER_3X, UPPER_LOWER_4X, PPL_3X, DUMBBELL_ONLY_3X, DUMBBELL_3X, DUMBBELL_4X, BODYWEIGHT_3X];

export function getProgramById(id) {
  return PROGRAMS.find(p => p.id === id) ?? FULLBODY_3X;
}

/**
 * Goal alignment scoring for program selection (Phase 3.8)
 */
function goalAlignmentScore(program, goal) {
  if (!goal) return 0;
  return (program.targetGoals || []).includes(goal) ? 10 : 0;
}
function levelScore(program, level) {
  if (!level) return 0;
  return (program.targetLevels || []).includes(level) ? 5 : 0;
}
function sessionLengthScore(program, sessionLength) {
  if (!sessionLength) return 0;
  const exCount = (program.exercises || []).length;
  if (sessionLength <= 30 && exCount <= 5) return 3;
  if (sessionLength >= 60 && exCount >= 6) return 3;
  if (sessionLength === 45 && exCount >= 5 && exCount <= 7) return 3;
  return 1;
}

/**
 * Selects the best program given an assessment object (Phase 3.8 — enhanced).
 * Returns the program id string.
 */
export function selectProgram(assessment) {
  const { equipment, daysPerWeek, level, goal, splitPreference, sessionLength } = assessment;

  if (equipment === 'bodyweight') return 'bodyweight_3x';
  if (equipment === 'dumbbells_only') return 'dumbbell_only_3x';

  // Step 1: Filter by equipment
  let candidates = PROGRAMS.filter(p =>
    (p.targetEquipment || []).includes(equipment)
  );
  if (candidates.length === 0) candidates = [...PROGRAMS];

  // Step 2: Filter by frequency
  const freqCandidates = candidates.filter(p => p.sessionsPerWeek === daysPerWeek);
  if (freqCandidates.length > 0) candidates = freqCandidates;

  // Step 3: Filter by split preference (if provided)
  if (splitPreference && splitPreference !== 'no_preference') {
    const splitMap = { full_body: 'fullbody', upper_lower: 'upper_lower', ppl: 'ppl' };
    const splitKey = splitMap[splitPreference];
    if (splitKey) {
      const splitCandidates = candidates.filter(p => p.id.includes(splitKey));
      if (splitCandidates.length > 0) candidates = splitCandidates;
    }
  }

  // Step 4: Score remaining by goal/level/session-length alignment
  candidates = candidates.map(p => ({
    ...p,
    _score: goalAlignmentScore(p, goal)
          + levelScore(p, level)
          + sessionLengthScore(p, sessionLength)
  }));

  // Step 5: Select highest scoring program
  candidates.sort((a, b) => b._score - a._score);
  return candidates[0]?.id || 'fullbody_3x';
}

/**
 * Builds the initial liftWeights and liftHistory for a given program.
 * If assessment provides estimatedMaxes, use 65% of stated max as starting weight.
 */
export function buildInitialWeights(program, assessment) {
  const liftWeights = {};
  const liftHistory = {};

  // Map max IDs to exercise IDs
  const maxToExercise = {
    squat: ['squat', 'dbsquat'],
    bench: ['bench', 'dbbench'],
    deadlift: ['rdl', 'dbrdl'],
    ohp: ['ohp', 'dbohp'],
  };

  const estimatedMaxes = assessment?.estimatedMaxes || {};

  for (const ex of program.exercises) {
    let startWeight = ex.startKg;

    // Check if we have an estimated max for this exercise
    for (const [maxKey, exIds] of Object.entries(maxToExercise)) {
      if (exIds.includes(ex.id) && estimatedMaxes[maxKey]) {
        const max = parseFloat(estimatedMaxes[maxKey]);
        if (max > 0 && max < 500) {
          startWeight = Math.round(max * 0.65 * 2) / 2; // 65% of max, round to 2.5
        }
      }
    }

    liftWeights[ex.id] = startWeight;
    liftHistory[ex.id] = [];
  }
  return { liftWeights, liftHistory };
}
