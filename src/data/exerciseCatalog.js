// Shared exercise catalog — same IDs as EXERCISES in gameData.js plus all EX_CATALOG entries.
// Used by ProgramEditorTab (exercise search) and StatsTab (PR name lookup).
export const EX_CATALOG = [
  // Chest
  { id: 'bench',       name: 'Bench Press',              startKg: 42.5 },
  { id: 'incbench',    name: 'Incline Barbell Press',    startKg: 35   },
  { id: 'incdbench',   name: 'Incline Dumbbell Press',   startKg: 14   },
  { id: 'dbbench',     name: 'DB Bench Press',           startKg: 16   },
  { id: 'chestdip',    name: 'Chest Dip',                startKg: 0,   isBodyweight: true },
  { id: 'cablefly',    name: 'Cable Chest Fly',          startKg: 10   },
  { id: 'pecdeck',     name: 'Pec Deck',                 startKg: 35   },
  { id: 'pushup',      name: 'Push-up',                  startKg: 0,   isBodyweight: true },
  // Back
  { id: 'rdl',         name: 'Romanian Deadlift',        startKg: 55   },
  { id: 'pulldown',    name: 'Lat Pulldown',             startKg: 47.5 },
  { id: 'cablerow',    name: 'Seated Cable Row',         startKg: 40   },
  { id: 'bbrow',       name: 'Barbell Row',              startKg: 50   },
  { id: 'dbrow',       name: 'DB Bent-Over Row',         startKg: 14   },
  { id: 'dbpullover', name: 'DB Pullover',              startKg: 12   },
  { id: 'facepull',   name: 'Face Pull',                startKg: 15   },
  { id: 'pullup',      name: 'Pull-up',                  startKg: 0,   isBodyweight: true },
  { id: 'chinup',      name: 'Chin-up',                  startKg: 0,   isBodyweight: true },
  { id: 'deadlift',    name: 'Conventional Deadlift',    startKg: 60   },
  // Legs
  { id: 'squat',       name: 'Barbell Squat',            startKg: 45   },
  { id: 'legpress',    name: 'Leg Press',                startKg: 80   },
  { id: 'legcurl',     name: 'Leg Curl Machine',         startKg: 40   },
  { id: 'legext',      name: 'Leg Extension',            startKg: 35   },
  { id: 'hipthrust',   name: 'Barbell Hip Thrust',       startKg: 40   },
  { id: 'bulgsplit',   name: 'Bulgarian Split Squat',    startKg: 10   },
  { id: 'calfraise',   name: 'Standing Calf Raise',      startKg: 20   },
  { id: 'dbsquat',     name: 'DB Goblet Squat',          startKg: 16   },
  { id: 'dbsumosq',   name: 'DB Sumo Squat',            startKg: 16   },
  { id: 'bwsquat',    name: 'Bodyweight Squat',         startKg: 0,   isBodyweight: true },
  { id: 'dbrdl',       name: 'DB Romanian Deadlift',     startKg: 16   },
  { id: 'dblunge',     name: 'DB Reverse Lunge',         startKg: 10   },
  // Shoulders
  { id: 'machohp',     name: 'Machine Shoulder Press',   startKg: 30   },
  { id: 'ohp',         name: 'DB Overhead Press',        startKg: 15   },
  { id: 'bbohp',       name: 'Barbell Overhead Press',   startKg: 30   },
  { id: 'dbohp',       name: 'Seated DB Press',          startKg: 12   },
  { id: 'lateraise',   name: 'Lateral Raise',            startKg: 6    },
  { id: 'frontraise',  name: 'Front Raise',              startKg: 6    },
  { id: 'reardelt',    name: 'Rear Delt Fly',            startKg: 6    },
  { id: 'arnoldpress', name: 'Arnold Press',             startKg: 10   },
  { id: 'cablelat',    name: 'Cable Lateral Raise',      startKg: 5    },
  // Arms
  { id: 'bbcurl',      name: 'Barbell Curl',             startKg: 20   },
  { id: 'dbcurl',      name: 'DB Bicep Curl',            startKg: 10   },
  { id: 'hammercurl',  name: 'Hammer Curl',              startKg: 10   },
  { id: 'cablecurl',   name: 'Cable Curl',               startKg: 15   },
  { id: 'preachcurl',  name: 'Preacher Curl',            startKg: 15   },
  { id: 'ohtriext',    name: 'Overhead Tricep Ext.',     startKg: 12   },
  { id: 'tricpush',    name: 'Tricep Pushdown',          startKg: 20   },
  { id: 'cgbench',     name: 'Close-Grip Bench Press',   startKg: 35   },
  { id: 'skullcrush',  name: 'Skull Crushers',           startKg: 20   },
  { id: 'dipbench',    name: 'Tricep Dip',               startKg: 0,   isBodyweight: true },
  // Core
  { id: 'cablecrnch',  name: 'Cable Crunch',             startKg: 20   },
  { id: 'hanglegrise', name: 'Hanging Leg Raise',        startKg: 0,   isBodyweight: true },
  { id: 'plank',       name: 'Plank',                    startKg: 0,   isBodyweight: true, isPlank: true },
  { id: 'crunch',      name: 'Crunch',                   startKg: 0,   isBodyweight: true },
  { id: 'rustwist',    name: 'Russian Twist',            startKg: 0,   isBodyweight: true },
  { id: 'abrollout',   name: 'Ab Wheel Rollout',         startKg: 0,   isBodyweight: true },
  { id: 'legrise',     name: 'Lying Leg Raise',          startKg: 0,   isBodyweight: true },
  { id: 'mtnclimp',    name: 'Mountain Climbers',        startKg: 0,   isBodyweight: true },
];

// Fast name lookup by exercise ID
export const EX_CATALOG_MAP = Object.fromEntries(EX_CATALOG.map(e => [e.id, e]));

export function lookupExName(exId) {
  return EX_CATALOG_MAP[exId]?.name
    ?? exId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
