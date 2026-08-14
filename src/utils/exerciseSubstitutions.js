/**
 * Pain- and competency-based exercise substitution.
 *
 * Rules name a target exercise *id* and the coaching reason; the prescription
 * (name, sets, reps, rest, RPE, starting weight) comes from the shared catalog.
 * Rules used to carry their own inline copies, which drifted: the same id was
 * "Push-Up" here and "Push-up" in the catalog, "Hip Thrust" vs "Barbell Hip
 * Thrust", "DB Single-Arm Row" vs "DB Bent-Over Row" — so a card and its own PR
 * toast could disagree about what the exercise was called.
 */

import { EX_CATALOG_MAP, buildPrescription } from '../data/exerciseCatalog';

const SUBSTITUTION_RULES = [
  // Knee pain
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'squat',    substitute: 'legpress', note: 'Knee-friendly: stop at parallel' },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'bwsquat',  substitute: 'legpress', note: 'Knee-friendly alternative' },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'lunge',    substitute: 'stepup',   note: 'Low box — reduce knee stress' },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'dblunge',  substitute: 'stepup',   note: 'Low box — reduce knee stress' },
  { region: 'knees', minSeverity: 'moderate', exerciseId: 'dbsquat',  substitute: 'legpress', note: 'Knee-friendly alternative' },

  // Shoulder pain
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'ohp',      substitute: 'landmine',   note: 'Shoulder-friendly pressing' },
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'dbohp',    substitute: 'landmine',   note: 'Shoulder-friendly pressing' },
  { region: 'shoulders', minSeverity: 'severe',   exerciseId: 'bench',    substitute: 'floorpress', note: 'Reduced shoulder ROM' },
  { region: 'shoulders', minSeverity: 'severe',   exerciseId: 'dbbench',  substitute: 'floorpress', note: 'Reduced shoulder ROM' },
  { region: 'shoulders', minSeverity: 'moderate', exerciseId: 'dipbench', substitute: 'pushup',     note: 'Less shoulder impingement risk' },

  // Lower back pain
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'rdl',      substitute: 'hipthrust', note: 'Lower-back-friendly hip hinge' },
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'dbrdl',    substitute: 'hipthrust', note: 'Lower-back-friendly hip hinge' },
  { region: 'lowerBack', minSeverity: 'severe',   exerciseId: 'squat',    substitute: 'legpress',  note: 'Removes spinal loading' },
  { region: 'lowerBack', minSeverity: 'moderate', exerciseId: 'hingerow', substitute: 'dbrow',     note: 'Supported row — no spinal loading' },

  // Wrist/elbow pain
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'bench',   substitute: 'dbbench_neut', note: 'Neutral grip reduces wrist strain' },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'dbbench', substitute: 'dbbench_neut', note: 'Neutral grip reduces wrist strain' },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'ohp',     substitute: 'landmine',     note: 'Neutral wrist position throughout' },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'dbohp',   substitute: 'landmine',     note: 'Neutral wrist position throughout' },
  { region: 'wrists', minSeverity: 'moderate', exerciseId: 'pushup',  substitute: 'floorpress',   note: 'Neutral grip avoids wrist extension' },

  // Hip pain
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'rdl',     substitute: 'glutebridge', note: 'Hip-friendly posterior chain' },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'dbrdl',   substitute: 'glutebridge', note: 'Hip-friendly posterior chain' },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'lunge',   substitute: 'stepup',      note: 'Reduced hip ROM' },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'dblunge', substitute: 'stepup',      note: 'Reduced hip ROM' },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'squat',   substitute: 'legpress',    note: 'Fixed hip angle reduces impingement' },
  { region: 'hips', minSeverity: 'moderate', exerciseId: 'bwsquat', substitute: 'legpress',    note: 'Fixed hip angle reduces impingement' },

  // Neck pain — overhead & cervical-loading exercises are the primary concern.
  // OHP/DBOHP → Landmine (NOT flat bench): landmine keeps anterior deltoid as primary target,
  // the diagonal press path eliminates the overhead lockout that forces cervical hyperextension.
  // Swapping to flat bench would train pecs instead of deltoids — wrong muscle group.
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'ohp',      substitute: 'landmine',   note: 'Diagonal press — same shoulder target, no overhead cervical extension' },
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'dbohp',    substitute: 'landmine',   note: 'Diagonal press — same shoulder target, no overhead cervical extension' },
  { region: 'neck', minSeverity: 'moderate', exerciseId: 'squat',    substitute: 'legpress',   note: 'Removes bar from traps/cervical spine — same quad stimulus' },
  { region: 'neck', minSeverity: 'severe',   exerciseId: 'bench',    substitute: 'floorpress', note: 'Same horizontal push pattern, neutral neck throughout' },
  { region: 'neck', minSeverity: 'severe',   exerciseId: 'hingerow', substitute: 'dbrow',      note: 'Same lat/rhomboid target — supported position avoids neck hyperextension' },
];

const SEVERITY_RANK = { none: 0, mild: 1, moderate: 2, severe: 3 };

/** Exposed for tests: every id a rule can target or produce. */
export function substitutionExerciseIds() {
  const ids = new Set();
  for (const r of SUBSTITUTION_RULES) { ids.add(r.exerciseId); ids.add(r.substitute); }
  for (const swaps of Object.values(COMPETENCY_SWAPS)) {
    for (const id of Object.values(swaps)) ids.add(id);
  }
  return [...ids];
}

/** Builds the replacement exercise for a rule, from the catalog. */
function buildSubstitute(substituteId, note) {
  const entry = EX_CATALOG_MAP[substituteId];
  const prescription = buildPrescription(substituteId);
  return {
    id: substituteId,
    name: entry?.name ?? substituteId,
    ...prescription,
    note: note || prescription.note,
  };
}

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
        result[idx] = buildSubstitute(rule.substitute, rule.note);
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

// 'never tried' barbell squat → Goblet Squat, etc.
const COMPETENCY_SWAPS = {
  squat: {
    never: 'dbsquat',
  },
  deadlift: {
    never: 'dbrdl',
    unsure: 'rdl',
  },
  pullUp: {
    never: 'pulldown',
  },
};

const COMPETENCY_NOTES = {
  dbsquat:  'Build squat pattern before barbell',
  dbrdl:    'Build hinge pattern before barbell',
  rdl:      'Start light — build form confidence',
  pulldown: 'Build pulling strength for pull-ups',
};

// Which exercise ids each movement pattern maps onto
const COMPETENCY_TARGETS = {
  squat: ['squat'],
  deadlift: ['rdl'],
  pullUp: ['pullup', 'chinup'],
};

/**
 * Apply movement competency substitutions.
 */
export function applyCompetencySubstitutions(exercises, movementCompetency) {
  if (!movementCompetency || !exercises) return exercises;

  let result = [...exercises];
  for (const [movement, level] of Object.entries(movementCompetency)) {
    const substituteId = COMPETENCY_SWAPS[movement]?.[level];
    if (!substituteId) continue;

    for (const targetId of COMPETENCY_TARGETS[movement] || []) {
      const idx = result.findIndex(e => e.id === targetId);
      if (idx !== -1) {
        result[idx] = buildSubstitute(substituteId, COMPETENCY_NOTES[substituteId]);
      }
    }
  }

  return result;
}
