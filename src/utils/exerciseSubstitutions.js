/**
 * Exercise Substitution Map — Pain-based exercise swaps (Phase 3.3)
 * Each rule: { region, minSeverity, removeExerciseId, substitute }
 */

const SUBSTITUTION_RULES = [
  // Knee pain
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'squat',    substitute: { id: 'legpress',  name: 'Leg Press',           sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 80, note: 'Knee-friendly: stop at parallel' } },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'bwsquat',  substitute: { id: 'legpress',  name: 'Leg Press',           sets: 3, reps: 12, rest: '90 sec', restSec: 90,  rpe: 7, startKg: 60, note: 'Knee-friendly alternative' } },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'lunge',    substitute: { id: 'stepup',    name: 'Step-Up (low box)',   sets: 3, reps: 10, rest: '60 sec', restSec: 60,  rpe: 7, startKg: 0,  note: 'Low box — reduce knee stress', isBodyweight: true } },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'dblunge',  substitute: { id: 'stepup',    name: 'Step-Up (low box)',   sets: 3, reps: 10, rest: '60 sec', restSec: 60,  rpe: 7, startKg: 0,  note: 'Low box — reduce knee stress', isBodyweight: true } },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'dbsquat',  substitute: { id: 'legpress',  name: 'Leg Press',           sets: 3, reps: 12, rest: '90 sec', restSec: 90,  rpe: 7, startKg: 60, note: 'Knee-friendly alternative' } },

  // Shoulder pain
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'ohp',     substitute: { id: 'landmine', name: 'Landmine Press',       sets: 2, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 15, note: 'Shoulder-friendly pressing' } },
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'dbohp',   substitute: { id: 'landmine', name: 'Landmine Press',       sets: 2, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 15, note: 'Shoulder-friendly pressing' } },
  { region: 'shoulders', minSeverity: 'severe',   exerciseId: 'bench',   substitute: { id: 'floorpress', name: 'DB Floor Press',     sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 16, note: 'Reduced shoulder ROM' } },
  { region: 'shoulders', minSeverity: 'severe',   exerciseId: 'dbbench', substitute: { id: 'floorpress', name: 'DB Floor Press',     sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 16, note: 'Reduced shoulder ROM' } },
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'dipbench',substitute: { id: 'pushup',     name: 'Push-Up',            sets: 3, reps: 12, rest: '60 sec', restSec: 60,  rpe: 7, startKg: 0,  note: 'Less shoulder impingement risk', isBodyweight: true } },

  // Lower back pain
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'rdl',     substitute: { id: 'hipthrust',  name: 'Hip Thrust',        sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8, startKg: 40, note: 'Lower-back-friendly hip hinge' } },
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'dbrdl',   substitute: { id: 'hipthrust',  name: 'Hip Thrust',        sets: 3, reps: 10, rest: '2 min',   restSec: 120, rpe: 8, startKg: 30, note: 'Lower-back-friendly hip hinge' } },
  { region: 'lowerBack', minSeverity: 'severe',   exerciseId: 'squat',   substitute: { id: 'legpress',   name: 'Leg Press',         sets: 3, reps: 10, rest: '2.5 min', restSec: 150, rpe: 8, startKg: 80, note: 'Removes spinal loading' } },
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'hingerow',substitute: { id: 'dbrow',      name: 'DB Single-Arm Row', sets: 3, reps: 10, rest: '90 sec',  restSec: 90,  rpe: 7, startKg: 16, note: 'Supported row — no spinal loading' } },

  // Wrist/elbow pain
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'bench',    substitute: { id: 'dbbench_neut', name: 'DB Bench (neutral grip)', sets: 3, reps: 10, rest: '2 min', restSec: 120, rpe: 8, startKg: 16, note: 'Neutral grip reduces wrist strain' } },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'dbbench',  substitute: { id: 'dbbench_neut', name: 'DB Bench (neutral grip)', sets: 3, reps: 10, rest: '2 min', restSec: 120, rpe: 8, startKg: 16, note: 'Neutral grip reduces wrist strain' } },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'ohp',      substitute: { id: 'landmine',     name: 'Landmine Press',          sets: 2, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 15, note: 'Neutral wrist position throughout' } },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'dbohp',    substitute: { id: 'landmine',     name: 'Landmine Press',          sets: 2, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 15, note: 'Neutral wrist position throughout' } },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'pushup',   substitute: { id: 'floorpress',   name: 'DB Floor Press',          sets: 3, reps: 10, rest: '90 sec', restSec: 90, rpe: 7, startKg: 12, note: 'Neutral grip avoids wrist extension' } },

  // Hip pain
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'rdl',      substitute: { id: 'glutebridge', name: 'Glute Bridge',      sets: 3, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 0, note: 'Hip-friendly posterior chain', isBodyweight: true } },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'dbrdl',    substitute: { id: 'glutebridge', name: 'Glute Bridge',      sets: 3, reps: 12, rest: '90 sec', restSec: 90, rpe: 7, startKg: 0, note: 'Hip-friendly posterior chain', isBodyweight: true } },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'lunge',    substitute: { id: 'stepup',      name: 'Step-Up',           sets: 3, reps: 10, rest: '60 sec', restSec: 60, rpe: 7, startKg: 0, note: 'Reduced hip ROM', isBodyweight: true } },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'dblunge',  substitute: { id: 'stepup',      name: 'Step-Up',           sets: 3, reps: 10, rest: '60 sec', restSec: 60, rpe: 7, startKg: 0, note: 'Reduced hip ROM', isBodyweight: true } },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'squat',    substitute: { id: 'legpress',    name: 'Leg Press',         sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 7, startKg: 70, note: 'Fixed hip angle reduces impingement' } },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'bwsquat',  substitute: { id: 'legpress',    name: 'Leg Press',         sets: 3, reps: 12, rest: '90 sec', restSec: 90,  rpe: 7, startKg: 50, note: 'Fixed hip angle reduces impingement' } },

  // Neck pain — overhead & cervical-loading exercises are the primary concern
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'ohp',      substitute: { id: 'dbbench',  name: 'DB Bench Press',      sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 16, note: 'Horizontal press — no cervical extension under load' } },
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'dbohp',    substitute: { id: 'dbbench',  name: 'DB Bench Press',      sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 14, note: 'Horizontal press — no cervical extension under load' } },
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'squat',    substitute: { id: 'legpress', name: 'Leg Press',           sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8, startKg: 80, note: 'Removes bar from traps/cervical spine' } },
  { region: 'neck', minSeverity: 'severe',   exerciseId: 'bench',    substitute: { id: 'floorpress', name: 'DB Floor Press',    sets: 3, reps: 10, rest: '90 sec', restSec: 90,  rpe: 7, startKg: 14, note: 'Neutral neck throughout' } },
  { region: 'neck', minSeverity: 'severe',   exerciseId: 'hingerow', substitute: { id: 'dbrow',    name: 'DB Single-Arm Row',   sets: 3, reps: 10, rest: '90 sec', restSec: 90,  rpe: 7, startKg: 16, note: 'Supported — avoids neck hyperextension' } },
];

const SEVERITY_RANK = { none: 0, mild: 1, moderate: 2, severe: 3 };

/**
 * Apply pain-based exercise substitutions to a program.
 * Returns a new exercises array with swaps applied.
 */
export function applySubstitutions(exercises, painRegions) {
  if (!painRegions || !exercises) return exercises;

  let result = [...exercises];

  for (const rule of SUBSTITUTION_RULES) {
    const userSeverity = painRegions[rule.region] || 'none';
    const minRequired = SEVERITY_RANK[rule.minSeverity] || 2;
    if (SEVERITY_RANK[userSeverity] >= minRequired) {
      const idx = result.findIndex(e => e.id === rule.exerciseId);
      if (idx !== -1) {
        result[idx] = { ...rule.substitute };
      }
    }
  }

  // Warn in dev when an exercise has no substitute for an active injury
  if (process.env.NODE_ENV !== 'production') {
    for (const [region, severity] of Object.entries(painRegions || {})) {
      if (!severity || severity === 'none') continue;
      const coveredIds = new Set(
        SUBSTITUTION_RULES
          .filter(r => r.region === region && SEVERITY_RANK[severity] >= SEVERITY_RANK[r.minSeverity])
          .map(r => r.exerciseId)
      );
      for (const ex of result) {
        if (!coveredIds.has(ex.id)) {
          console.warn(`[substitution] No ${region} substitute for "${ex.name}" (${ex.id}) at severity "${severity}" — kept as-is`);
        }
      }
    }
  }

  return result;
}

/**
 * Apply movement competency substitutions.
 * 'never tried' barbell squat → Goblet Squat, etc.
 */
export function applyCompetencySubstitutions(exercises, movementCompetency) {
  if (!movementCompetency || !exercises) return exercises;

  const COMPETENCY_SWAPS = {
    squat: {
      never: { id: 'dbsquat', name: 'DB Goblet Squat', sets: 3, reps: 12, rest: '2 min', restSec: 120, rpe: 8, startKg: 16, note: 'Build squat pattern before barbell' },
    },
    deadlift: {
      never: { id: 'dbrdl', name: 'DB Romanian Deadlift', sets: 3, reps: 10, rest: '2 min', restSec: 120, rpe: 8, startKg: 16, note: 'Build hinge pattern before barbell' },
      unsure: { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: 8, rest: '2.5 min', restSec: 150, rpe: 7, startKg: 40, note: 'Start light — build form confidence' },
    },
    pullUp: {
      never: { id: 'pulldown', name: 'Lat Pulldown', sets: 3, reps: 10, rest: '2 min', restSec: 120, rpe: 8, startKg: 40, note: 'Build pulling strength for pull-ups' },
    },
  };

  let result = [...exercises];
  for (const [movement, level] of Object.entries(movementCompetency)) {
    const swaps = COMPETENCY_SWAPS[movement];
    if (!swaps || !swaps[level]) continue;

    // Map movement id to exercise ids that match
    const exerciseIds = {
      squat: ['squat'],
      deadlift: ['rdl'],
      pullUp: ['pullup', 'chinup'],
    };
    const targetIds = exerciseIds[movement] || [];
    for (const targetId of targetIds) {
      const idx = result.findIndex(e => e.id === targetId);
      if (idx !== -1) {
        result[idx] = { ...swaps[level] };
      }
    }
  }

  return result;
}
