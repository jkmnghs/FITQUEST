/**
 * The single exercise catalog.
 *
 * There used to be three lists that disagreed with each other: this file (PR
 * name lookup, program editor search, AI prompt), WorkoutTab's EXERCISE_LIBRARY
 * (the swap/add picker), and gameData's EXERCISES — plus ids that existed only
 * inside exerciseSubstitutions.js. The consequences were visible: swapping to a
 * picker-only exercise showed a raw id like "Widepushup" in PR toasts and Stats,
 * split filtering silently dropped exercises with no group tag, and the picker
 * offered a bodyweight-only user a 45 kg barbell squat.
 *
 * Every entry carries what all four consumers need:
 *   group     — push | pull | legs | core   (split-day filtering)
 *   equipment — barbell | dumbbell | cable | machine | bodyweight
 *   category  — display grouping for the picker
 *   defaults  — the prescription used when this exercise is added or swapped in
 */

const CHEST = 'Chest', BACK = 'Back', LEGS = 'Legs',
      SHOULDERS = 'Shoulders', ARMS = 'Arms', CORE = 'Core', CARDIO = 'Cardio';

export const CATEGORY_ICONS = {
  [CHEST]: '🫁', [BACK]: '↩️', [LEGS]: '🦵',
  [SHOULDERS]: '⚡', [ARMS]: '💪', [CORE]: '🔥', [CARDIO]: '🏃',
};

export const CATEGORY_ORDER = [CHEST, BACK, LEGS, SHOULDERS, ARMS, CORE, CARDIO];

// Prescription presets — most exercises fall into one of these shapes.
const COMPOUND  = { sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8 };
const HEAVY     = { sets: 3, reps: 8,  rest: '2.5 min', restSec: 150, rpe: 8 };
const ACCESSORY = { sets: 3, reps: 12, rest: '90 sec',  restSec: 90,  rpe: 7 };
const ISOLATION = { sets: 3, reps: 15, rest: '60 sec',  restSec: 60,  rpe: 7 };
const BODYWEIGHT= { sets: 3, reps: 12, rest: '60 sec',  restSec: 60,  rpe: 7 };
const PLANK     = { sets: 2, reps: 0,  rest: '60 sec',  restSec: 60,  rpe: 0 };

function ex(id, name, category, group, equipment, startKg, defaults, extra = {}) {
  const isBodyweight = equipment === 'bodyweight';
  return {
    id, name, category, group, equipment, startKg,
    isBodyweight,
    isPlank: !!extra.isPlank,
    defaults: { ...defaults },
    note: extra.note || '',
  };
}

export const EX_CATALOG = [
  // ── Chest ────────────────────────────────────────────────────────────────
  ex('bench',       'Barbell Bench Press',    CHEST, 'push', 'barbell',    42.5, HEAVY,      { note: 'Barbell or DB — whichever available' }),
  ex('incbench',    'Incline Barbell Press',  CHEST, 'push', 'barbell',    35,   COMPOUND),
  ex('decbench',    'Decline Bench Press',    CHEST, 'push', 'barbell',    45,   COMPOUND),
  ex('dbbench',     'DB Bench Press',         CHEST, 'push', 'dumbbell',   16,   COMPOUND,   { note: 'Full range — touch chest, lock out top' }),
  ex('incdbench',   'Incline DB Press',       CHEST, 'push', 'dumbbell',   14,   COMPOUND),
  ex('dbbench_neut','DB Bench (neutral grip)',CHEST, 'push', 'dumbbell',   16,   COMPOUND,   { note: 'Neutral grip reduces wrist strain' }),
  ex('floorpress',  'DB Floor Press',         CHEST, 'push', 'dumbbell',   16,   COMPOUND,   { note: 'Reduced shoulder ROM' }),
  ex('cablefly',    'Cable Chest Fly',        CHEST, 'push', 'cable',      10,   ACCESSORY),
  ex('pecdeck',     'Pec Deck',               CHEST, 'push', 'machine',    35,   ACCESSORY),
  ex('chestdip',    'Chest Dip',              CHEST, 'push', 'bodyweight', 0,    BODYWEIGHT),
  ex('pushup',      'Push-up',                CHEST, 'push', 'bodyweight', 0,    BODYWEIGHT, { note: 'Chest to floor — full range every rep' }),
  ex('widepushup',  'Wide Push-up',           CHEST, 'push', 'bodyweight', 0,    BODYWEIGHT),
  ex('pikepushup',  'Pike Push-up',           CHEST, 'push', 'bodyweight', 0,    BODYWEIGHT),

  // ── Back ─────────────────────────────────────────────────────────────────
  ex('pulldown',    'Lat Pulldown',           BACK, 'pull', 'cable',      47.5, COMPOUND,   { note: 'Full stretch top, squeeze bottom' }),
  ex('cablerow',    'Seated Cable Row',       BACK, 'pull', 'cable',      40,   COMPOUND),
  ex('bbrow',       'Barbell Row',            BACK, 'pull', 'barbell',    50,   COMPOUND),
  ex('dbrow',       'DB Bent-Over Row',       BACK, 'pull', 'dumbbell',   14,   COMPOUND,   { note: 'Pull to hip, not chest — chest parallel to floor' }),
  ex('singlerow',   'Single-arm DB Row',      BACK, 'pull', 'dumbbell',   14,   COMPOUND),
  ex('dbpullover',  'DB Pullover',            BACK, 'pull', 'dumbbell',   12,   ACCESSORY),
  ex('tbarrow',     'T-Bar Row',              BACK, 'pull', 'machine',    40,   COMPOUND),
  ex('facepull',    'Face Pull',              BACK, 'pull', 'cable',      15,   ISOLATION),
  ex('strtpull',    'Straight-arm Pulldown',  BACK, 'pull', 'cable',      20,   ACCESSORY),
  ex('pullup',      'Pull-up',                BACK, 'pull', 'bodyweight', 0,    BODYWEIGHT),
  ex('chinup',      'Chin-up',                BACK, 'pull', 'bodyweight', 0,    BODYWEIGHT),
  ex('hingerow',    'Inverted Row',           BACK, 'pull', 'bodyweight', 0,    BODYWEIGHT, { note: 'Use a table or bar — chest to hands' }),

  // ── Legs ─────────────────────────────────────────────────────────────────
  ex('squat',       'Barbell Squat',          LEGS, 'legs', 'barbell',    45,   HEAVY,      { note: 'Compound quad/glute — prioritize depth' }),
  ex('deadlift',    'Conventional Deadlift',  LEGS, 'legs', 'barbell',    60,   HEAVY),
  ex('rdl',         'Romanian Deadlift',      LEGS, 'legs', 'barbell',    55,   HEAVY,      { note: 'Hinge pattern — slight knee bend' }),
  ex('legpress',    'Leg Press',              LEGS, 'legs', 'machine',    80,   COMPOUND,   { note: 'Knee-friendly: stop at parallel' }),
  ex('legcurl',     'Leg Curl Machine',       LEGS, 'legs', 'machine',    40,   ISOLATION,  { note: 'Hips FLAT on pad — slow controlled reps' }),
  ex('legext',      'Leg Extension',          LEGS, 'legs', 'machine',    35,   ISOLATION),
  ex('hipthrust',   'Barbell Hip Thrust',     LEGS, 'legs', 'machine',    40,   COMPOUND,   { note: 'Lower-back-friendly hip hinge' }),
  ex('calfraise',   'Standing Calf Raise',    LEGS, 'legs', 'machine',    20,   ISOLATION),
  ex('bulgsplit',   'Bulgarian Split Squat',  LEGS, 'legs', 'dumbbell',   10,   ACCESSORY),
  ex('dblunge',     'DB Reverse Lunge',       LEGS, 'legs', 'dumbbell',   10,   ACCESSORY,  { note: '10 reps each leg — knee above floor on back leg' }),
  ex('dbsquat',     'DB Goblet Squat',        LEGS, 'legs', 'dumbbell',   16,   ACCESSORY,  { note: 'Hold DB at chest — sit deep, knees out' }),
  ex('dbsumosq',    'DB Sumo Squat',          LEGS, 'legs', 'dumbbell',   16,   ACCESSORY),
  ex('dbrdl',       'DB Romanian Deadlift',   LEGS, 'legs', 'dumbbell',   16,   COMPOUND,   { note: 'Hinge at hips — feel hamstring stretch' }),
  ex('bwsquat',     'Bodyweight Squat',       LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 15, rpe: 6 }, { note: 'Feet shoulder-width, drive knees out' }),
  ex('lunge',       'Reverse Lunge',          LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 10 }, { note: '10 reps each leg — step back, knee above floor' }),
  ex('walklunge',   'Walking Lunge',          LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 10 }),
  ex('stepup',      'Step-up',                LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 10 }, { note: 'Low box — reduce knee stress' }),
  ex('glute',       'Glute Bridge',           LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 15, rpe: 6 }, { note: 'Squeeze glutes hard at the top' }),
  ex('glutebridge', 'Glute Bridge (floor)',   LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 12 }, { note: 'Hip-friendly posterior chain' }),
  ex('jumpsquat',   'Jump Squat',             LEGS, 'legs', 'bodyweight', 0,    { ...BODYWEIGHT, reps: 10 }),

  // ── Shoulders ────────────────────────────────────────────────────────────
  ex('bbohp',       'Barbell Overhead Press', SHOULDERS, 'push', 'barbell',    30, COMPOUND),
  ex('ohp',         'DB Overhead Press',      SHOULDERS, 'push', 'dumbbell',   15, { ...ACCESSORY, sets: 2, rpe: 7.5 }, { note: 'Seated or standing — control negative' }),
  ex('dbohp',       'Seated DB Press',        SHOULDERS, 'push', 'dumbbell',   12, { ...ACCESSORY, sets: 2, rpe: 7.5 }, { note: 'Seated or standing — control negative' }),
  ex('landmine',    'Landmine Press',         SHOULDERS, 'push', 'barbell',    15, { ...ACCESSORY, sets: 2 }, { note: 'Diagonal press — neutral wrist, no overhead lockout' }),
  ex('arnoldpress', 'Arnold Press',           SHOULDERS, 'push', 'dumbbell',   10, ACCESSORY),
  ex('machohp',     'Machine Shoulder Press', SHOULDERS, 'push', 'machine',    30, ACCESSORY),
  ex('lateraise',   'DB Lateral Raise',       SHOULDERS, 'push', 'dumbbell',   6,  ISOLATION),
  ex('cablelat',    'Cable Lateral Raise',    SHOULDERS, 'push', 'cable',      5,  ISOLATION),
  ex('frontraise',  'DB Front Raise',         SHOULDERS, 'push', 'dumbbell',   6,  ISOLATION),
  ex('reardelt',    'Rear Delt Fly',          SHOULDERS, 'push', 'dumbbell',   6,  ISOLATION),

  // ── Arms ─────────────────────────────────────────────────────────────────
  ex('bbcurl',      'Barbell Bicep Curl',     ARMS, 'pull', 'barbell',    20, ACCESSORY),
  ex('dbcurl',      'DB Bicep Curl',          ARMS, 'pull', 'dumbbell',   10, ACCESSORY),
  ex('hammercurl',  'Hammer Curl',            ARMS, 'pull', 'dumbbell',   10, ACCESSORY),
  ex('cablecurl',   'Cable Curl',             ARMS, 'pull', 'cable',      15, ACCESSORY),
  ex('preachcurl',  'Preacher Curl',          ARMS, 'pull', 'machine',    15, ACCESSORY),
  ex('cgbench',     'Close-Grip Bench Press', ARMS, 'push', 'barbell',    35, COMPOUND),
  ex('tricpush',    'Tricep Pushdown',        ARMS, 'push', 'cable',      20, ACCESSORY),
  ex('ohtriext',    'Overhead Tricep Ext.',   ARMS, 'push', 'cable',      12, ACCESSORY),
  ex('skullcrush',  'Skull Crushers',         ARMS, 'push', 'barbell',    20, ACCESSORY),
  ex('dipbench',    'Tricep Dip',             ARMS, 'push', 'bodyweight', 0,  BODYWEIGHT, { note: 'Use a chair or bench — elbows back' }),
  ex('diamondpush', 'Diamond Push-up',        ARMS, 'push', 'bodyweight', 0,  BODYWEIGHT),

  // ── Core ─────────────────────────────────────────────────────────────────
  ex('plank',       'Plank',                  CORE, 'core', 'bodyweight', 0,  PLANK, { isPlank: true, note: 'Hold 45-60s — stop if lower back sags' }),
  ex('sideplank',   'Side Plank',             CORE, 'core', 'bodyweight', 0,  PLANK, { isPlank: true }),
  ex('hollowbody',  'Hollow Body Hold',       CORE, 'core', 'bodyweight', 0,  PLANK, { isPlank: true }),
  ex('mtnclimp',    'Mountain Climbers',      CORE, 'core', 'bodyweight', 0,  BODYWEIGHT),
  ex('abrollout',   'Ab Wheel Rollout',       CORE, 'core', 'bodyweight', 0,  BODYWEIGHT),
  ex('hanglegrise', 'Hanging Leg Raise',      CORE, 'core', 'bodyweight', 0,  BODYWEIGHT),
  ex('cablecrnch',  'Cable Crunch',           CORE, 'core', 'cable',      20, ACCESSORY),
  ex('rustwist',    'Russian Twist',          CORE, 'core', 'bodyweight', 0,  { ...BODYWEIGHT, reps: 20 }),
  ex('deadbug',     'Dead Bug',               CORE, 'core', 'bodyweight', 0,  BODYWEIGHT),
  ex('crunch',      'Crunch',                 CORE, 'core', 'bodyweight', 0,  { ...BODYWEIGHT, reps: 15 }),
  ex('biccrnch',    'Bicycle Crunch',         CORE, 'core', 'bodyweight', 0,  { ...BODYWEIGHT, reps: 20 }),
  ex('legrise',     'Lying Leg Raise',        CORE, 'core', 'bodyweight', 0,  { ...BODYWEIGHT, reps: 15 }),
  ex('vup',         'V-Up',                   CORE, 'core', 'bodyweight', 0,  BODYWEIGHT),
  ex('superman',    'Superman Hold',          CORE, 'core', 'bodyweight', 0,  PLANK, { isPlank: true }),

  // ── Cardio ───────────────────────────────────────────────────────────────
  ex('burpees',     'Burpees',                CARDIO, 'core', 'bodyweight', 0, { ...BODYWEIGHT, reps: 15 }),
  ex('jumpjack',    'Jumping Jacks',          CARDIO, 'core', 'bodyweight', 0, { ...BODYWEIGHT, reps: 30 }),
  ex('highnknee',   'High Knees',             CARDIO, 'core', 'bodyweight', 0, { ...BODYWEIGHT, reps: 30 }),
  ex('boxjump',     'Box Jump',               CARDIO, 'core', 'bodyweight', 0, { ...BODYWEIGHT, reps: 10 }),
  ex('ropewave',    'Battle Rope Waves',      CARDIO, 'core', 'machine',    0, { ...BODYWEIGHT, reps: 20 }),
];

// Fast lookup by exercise ID
export const EX_CATALOG_MAP = Object.fromEntries(EX_CATALOG.map(e => [e.id, e]));

export function lookupExName(exId) {
  return EX_CATALOG_MAP[exId]?.name
    ?? String(exId).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getExerciseGroup(exId) {
  return EX_CATALOG_MAP[exId]?.group ?? null;
}

// ── Equipment availability ──────────────────────────────────────────────────
// Which equipment classes each assessment answer unlocks. Bodyweight is always
// available — every setup can do a push-up.
const EQUIPMENT_ACCESS = {
  full_gym:       ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
  barbell_home:   ['barbell', 'dumbbell', 'bodyweight'],
  dumbbells:      ['dumbbell', 'cable', 'bodyweight'],
  dumbbells_only: ['dumbbell', 'bodyweight'],
  bodyweight:     ['bodyweight'],
};

export function equipmentAllows(equipment, exercise) {
  const allowed = EQUIPMENT_ACCESS[equipment] || EQUIPMENT_ACCESS.full_gym;
  return allowed.includes(exercise.equipment);
}

/** Every catalog entry the user's equipment supports. */
export function filterCatalogForEquipment(equipment) {
  return EX_CATALOG.filter(e => equipmentAllows(equipment, e));
}

/**
 * Catalog grouped into display categories for the swap/add picker, filtered to
 * what the user can actually perform. Empty categories are omitted.
 */
export function getPickerCategories(equipment) {
  return CATEGORY_ORDER
    .map(category => ({
      category,
      icon: CATEGORY_ICONS[category],
      exercises: filterCatalogForEquipment(equipment).filter(e => e.category === category),
    }))
    .filter(c => c.exercises.length > 0);
}

/**
 * The prescription to use when an exercise is added to, or swapped into, a
 * session. Swap used to keep the *previous* exercise's sets/reps/rest, so
 * Plank → Barbell Squat rendered as "3 × 0 reps" with the plank's coaching note.
 *
 * `preserveSets` carries the user's set count across when both exercises are of
 * the same kind (timed vs rep-based); otherwise the new exercise's own default
 * wins, because a set count from a plank means nothing for a squat.
 */
export function buildPrescription(exId, { preserveSets } = {}) {
  const entry = EX_CATALOG_MAP[exId];
  if (!entry) {
    // Custom / AI-authored exercise with no catalog entry — safe generic values.
    return { sets: 3, reps: 10, rest: '2 min', restSec: 120, rpe: 8, startKg: 0, note: '' };
  }
  const sets = Number.isFinite(preserveSets) && preserveSets > 0
    ? preserveSets
    : entry.defaults.sets;
  return {
    ...entry.defaults,
    sets,
    startKg: entry.startKg,
    note: entry.note,
    isBodyweight: entry.isBodyweight,
    isPlank: entry.isPlank,
  };
}
