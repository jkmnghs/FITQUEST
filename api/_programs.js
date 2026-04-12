/**
 * Shared program definitions for the API layer.
 * Mirrors src/data/programs.js — kept separate because API routes cannot
 * import from src/ (different module resolution context on Vercel).
 */

const PROGRAMS = [
  {
    id: 'fullbody_3x',
    name: 'Full Body 3×/week',
    sessionsPerWeek: 3,
    targetEquipment: ['full_gym', 'barbell_home', 'dumbbells'],
    targetLevels: ['beginner', 'intermediate'],
    exercises: [
      { id: 'squat',    name: 'Barbell Squat',         startKg: 45   },
      { id: 'bench',    name: 'Bench Press',            startKg: 42.5 },
      { id: 'rdl',      name: 'Romanian Deadlift',      startKg: 55   },
      { id: 'pulldown', name: 'Lat Pulldown',           startKg: 47.5 },
      { id: 'ohp',      name: 'DB Overhead Press',      startKg: 15   },
      { id: 'legcurl',  name: 'Leg Curl',               startKg: 40   },
      { id: 'plank',    name: 'Plank',                  startKg: 0,   isPlank: true },
    ],
  },
  {
    id: 'fullbody_2x',
    name: 'Full Body 2×/week',
    sessionsPerWeek: 2,
    targetEquipment: ['full_gym', 'barbell_home', 'dumbbells'],
    targetLevels: ['beginner', 'intermediate'],
    exercises: [
      { id: 'squat',    name: 'Barbell Squat',         startKg: 45   },
      { id: 'bench',    name: 'Bench Press',            startKg: 42.5 },
      { id: 'rdl',      name: 'Romanian Deadlift',      startKg: 55   },
      { id: 'pulldown', name: 'Lat Pulldown',           startKg: 47.5 },
      { id: 'ohp',      name: 'DB Overhead Press',      startKg: 15   },
      { id: 'legcurl',  name: 'Leg Curl',               startKg: 40   },
      { id: 'plank',    name: 'Plank',                  startKg: 0,   isPlank: true },
    ],
  },
  {
    id: 'fullbody_4x',
    name: 'Full Body 4×/week',
    sessionsPerWeek: 4,
    targetEquipment: ['full_gym'],
    targetLevels: ['intermediate', 'advanced'],
    exercises: [
      { id: 'squat',    name: 'Barbell Squat',         startKg: 60   },
      { id: 'bench',    name: 'Bench Press',            startKg: 55   },
      { id: 'rdl',      name: 'Romanian Deadlift',      startKg: 70   },
      { id: 'pulldown', name: 'Lat Pulldown',           startKg: 55   },
      { id: 'ohp',      name: 'DB Overhead Press',      startKg: 20   },
      { id: 'legcurl',  name: 'Leg Curl',               startKg: 45   },
      { id: 'plank',    name: 'Plank',                  startKg: 0,   isPlank: true },
    ],
  },
  {
    id: 'dumbbell_only_3x',
    name: 'Dumbbells Only 3×/week',
    sessionsPerWeek: 3,
    targetEquipment: ['dumbbells_only'],
    targetLevels: ['beginner', 'intermediate'],
    exercises: [
      { id: 'dbsquat',  name: 'DB Goblet Squat',        startKg: 16 },
      { id: 'dbbench',  name: 'DB Bench Press',          startKg: 16 },
      { id: 'dbrdl',    name: 'DB Romanian Deadlift',    startKg: 16 },
      { id: 'dbrow',    name: 'DB Bent-Over Row',        startKg: 14 },
      { id: 'dbohp',    name: 'DB Overhead Press',       startKg: 12 },
      { id: 'dblunge',  name: 'DB Reverse Lunge',        startKg: 10 },
      { id: 'plank',    name: 'Plank',                   startKg: 0,  isPlank: true },
    ],
  },
  {
    id: 'dumbbell_3x',
    name: 'Dumbbell 3×/week',
    sessionsPerWeek: 3,
    targetEquipment: ['dumbbells'],
    targetLevels: ['beginner', 'intermediate'],
    exercises: [
      { id: 'dbsquat',  name: 'DB Goblet Squat',        startKg: 16   },
      { id: 'dbbench',  name: 'DB Bench Press',          startKg: 16   },
      { id: 'dbrdl',    name: 'DB Romanian Deadlift',    startKg: 16   },
      { id: 'pulldown', name: 'Lat Pulldown',            startKg: 47.5 },
      { id: 'dbohp',    name: 'DB Overhead Press',       startKg: 12   },
      { id: 'legcurl',  name: 'Leg Curl',                startKg: 40   },
      { id: 'plank',    name: 'Plank',                   startKg: 0,   isPlank: true },
    ],
  },
  {
    id: 'dumbbell_4x',
    name: 'Dumbbell 4×/week',
    sessionsPerWeek: 4,
    targetEquipment: ['dumbbells'],
    targetLevels: ['intermediate', 'advanced'],
    exercises: [
      { id: 'dbsquat',  name: 'DB Goblet Squat',        startKg: 20   },
      { id: 'dbbench',  name: 'DB Bench Press',          startKg: 20   },
      { id: 'dbrdl',    name: 'DB Romanian Deadlift',    startKg: 20   },
      { id: 'pulldown', name: 'Lat Pulldown',            startKg: 55   },
      { id: 'dbohp',    name: 'DB Overhead Press',       startKg: 15   },
      { id: 'legcurl',  name: 'Leg Curl',                startKg: 45   },
      { id: 'plank',    name: 'Plank',                   startKg: 0,   isPlank: true },
    ],
  },
  {
    id: 'bodyweight_3x',
    name: 'Bodyweight 3×/week',
    sessionsPerWeek: 3,
    targetEquipment: ['bodyweight'],
    targetLevels: ['beginner'],
    exercises: [
      { id: 'pushup',   name: 'Push-up',           startKg: 0, isBodyweight: true },
      { id: 'bwsquat',  name: 'Bodyweight Squat',  startKg: 0, isBodyweight: true },
      { id: 'hingerow', name: 'Inverted Row',       startKg: 0, isBodyweight: true },
      { id: 'lunge',    name: 'Reverse Lunge',      startKg: 0, isBodyweight: true },
      { id: 'glute',    name: 'Glute Bridge',       startKg: 0, isBodyweight: true },
      { id: 'dipbench', name: 'Tricep Dip',         startKg: 0, isBodyweight: true },
      { id: 'plank',    name: 'Plank',              startKg: 0, isPlank: true },
    ],
  },
];

export function getProgramById(id) {
  return PROGRAMS.find(p => p.id === id) ?? PROGRAMS[0];
}

export function buildInitialWeights(program) {
  const liftWeights = {};
  const liftHistory = {};
  for (const ex of program.exercises) {
    liftWeights[ex.id] = ex.startKg;
    liftHistory[ex.id] = [];
  }
  return { liftWeights, liftHistory };
}

export { PROGRAMS };
