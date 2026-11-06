import { EX_CATALOG_MAP, getExerciseGroup, filterCatalogForEquipment } from '../data/exerciseCatalog';
import { authPostJSON } from '../lib/authFetch';
import { blockedExerciseIds, applySubstitutions, applyCompetencySubstitutions } from './exerciseSubstitutions';

// Fewer than this and a day isn't a usable session.
const MIN_EXERCISES_PER_DAY = 3;

/**
 * Fill in the fields the UI reads but the model isn't asked for.
 *
 * The prompt requests restSec but not the human-readable `rest`, so every
 * AI-generated card rendered a blank rest tag and "Rest: " in the modal. Missing
 * sets produced zero logging rows in the exercise modal, and a missing startKg
 * rendered "NaN kg" on the card.
 */
function normalizeGeneratedExercise(raw) {
  const entry = EX_CATALOG_MAP[raw.id];
  const restSec = Number(raw.restSec) > 0 ? Math.round(Number(raw.restSec))
    : entry?.defaults.restSec ?? 120;
  const sets = Number(raw.sets) > 0 ? Math.round(Number(raw.sets))
    : entry?.defaults.sets ?? 3;
  const reps = Number.isFinite(Number(raw.reps)) ? Number(raw.reps)
    : entry?.defaults.reps ?? 10;
  const startKg = Number.isFinite(Number(raw.startKg)) ? Number(raw.startKg)
    : entry?.startKg ?? 0;

  return {
    ...raw,
    name: raw.name || entry?.name || raw.id,
    sets,
    reps,
    restSec,
    rest: raw.rest || formatRest(restSec),
    rpe: Number.isFinite(Number(raw.rpe)) ? Number(raw.rpe) : entry?.defaults.rpe ?? 8,
    startKg,
    isBodyweight: raw.isBodyweight ?? entry?.isBodyweight ?? false,
    isPlank: raw.isPlank ?? entry?.isPlank ?? false,
  };
}

/**
 * Seconds → the wording used everywhere else in the app: "45 sec", "90 sec",
 * "2 min", "2.5 min". Mirrors REST_OPTIONS in ProgramEditorTab.
 */
export function formatRest(sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return '—';
  if (s < 120) return `${Math.round(s)} sec`;
  const mins = s / 60;
  return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`;
}

/**
 * Replace exercises the user cannot actually perform.
 *
 * The prompt says "use ONLY these exact IDs" and nothing checked that it was
 * obeyed. On a split, `filterToSplitDay` dropped unknown ids by accident —
 * `getExerciseGroup` returns null for them — but full-body runs no split
 * filter at all, and full-body is exactly what bodyweight-only users are
 * always given. So the one group that cannot improvise a substitute was the
 * one receiving unvalidated equipment.
 *
 * A rejected exercise is swapped for the closest same-group exercise the user
 * *can* do, rather than dropped, so the session keeps its shape.
 */
export function reconcileWithCatalog(exercises, allowedIds, catalogById) {
  const used = new Set();
  const out = [];

  for (const ex of exercises) {
    if (allowedIds.has(ex.id) && !used.has(ex.id)) {
      used.add(ex.id);
      out.push(ex);
      continue;
    }
    if (used.has(ex.id)) continue; // model repeated an exercise within a day

    // Prefer a replacement training the same thing. `group` is undefined for a
    // hallucinated id, in which case any unused allowed exercise beats nothing.
    const wantGroup = getExerciseGroup(ex.id);
    const candidates = [...allowedIds].filter(id => !used.has(id));
    const sameGroup = wantGroup
      ? candidates.filter(id => getExerciseGroup(id) === wantGroup)
      : [];
    const pick = (sameGroup.length > 0 ? sameGroup : candidates)[0];
    if (!pick) continue;

    used.add(pick);
    const entry = catalogById[pick];
    out.push(normalizeGeneratedExercise({
      id: pick,
      name: entry?.name || pick,
      sets: ex.sets,
      reps: ex.reps,
      restSec: ex.restSec,
      rpe: ex.rpe,
      isBodyweight: entry?.isBodyweight,
      isPlank: entry?.isPlank,
    }));
  }
  return out;
}

export const EQUIPMENT_DESC = {
  full_gym:       'Full gym: barbells, dumbbells, cables, all machines available',
  dumbbells:      'Dumbbells and resistance bands ONLY — no barbells, no cables, no machines',
  dumbbells_only: 'Dumbbells only — no other equipment at all',
  barbell_home:   'Home setup: barbell + dumbbells, NO cables or machines',
  bodyweight:     'Bodyweight ONLY — zero equipment',
};

// Re-exported so existing importers (AICoachTab) keep working; the equipment
// rules now live with the catalog data they describe.
export { filterCatalogForEquipment };

// ── Generation inputs ─────────────────────────────────────────────────────────

const PROGRAM_MODEL = 'claude-sonnet-5-5';
const MAX_ATTEMPTS = 2;

/**
 * Exercises per session for a session length. Six to eight exercises does not
 * fit in 30 minutes, and a 90-minute session with five leaves time unused.
 */
export function exerciseRange(sessionMinutes) {
  const m = Number(sessionMinutes) || 60;
  if (m <= 30) return { min: 3, max: 4 };
  if (m <= 45) return { min: 4, max: 5 };
  if (m <= 60) return { min: 5, max: 6 };
  if (m <= 75) return { min: 5, max: 7 };
  return { min: 6, max: 8 };
}

/** Minimum hard sets per week for each major group, by experience. */
const WEEKLY_SET_FLOOR = { beginner: 6, intermediate: 9, advanced: 10 };
const MAJOR_GROUPS = ['push', 'pull', 'legs'];

/**
 * How each catalog lift relates to the four maxes asked for in onboarding.
 * Ratios are of the barbell 1RM; dumbbell entries are per dumbbell. Only lifts
 * with a well-established relationship are listed — anything else falls back
 * to the catalog default scaled for the user.
 */
const MAX_RATIOS = {
  squat:    { squat: 1, dbsquat: 0.25, dbsumosq: 0.25 },
  bench:    { bench: 1, incbench: 0.8, decbench: 1, cgbench: 0.85, dbbench: 0.35, incdbench: 0.3, dbbench_neut: 0.35, floorpress: 0.33 },
  deadlift: { deadlift: 1, rdl: 0.7, dbrdl: 0.3 },
  ohp:      { bbohp: 1, ohp: 0.35, dbohp: 0.33, arnoldpress: 0.3, machohp: 0.8 },
};

const roundTo = (x, step) => Math.round(x / step) * step;

/**
 * A working weight for `reps` at RPE ~8 from the user's maxes when one applies,
 * otherwise the catalog default scaled for level and sex. Returns kg.
 */
export function estimateStartKg(exId, reps, assessment = {}) {
  const entry = EX_CATALOG_MAP[exId];
  if (!entry || entry.isBodyweight || entry.isPlank) return 0;
  const step = entry.equipment === 'dumbbell' ? 1 : 2.5;

  const maxes = assessment.estimatedMaxes || {};
  for (const [maxKey, ratios] of Object.entries(MAX_RATIOS)) {
    const max = Number(maxes[maxKey]);
    if (ratios[exId] && max > 0 && max < 500) {
      // Epley, leaving ~2 reps in reserve.
      const r = Math.max(1, Number(reps) || 10);
      const pct = 1 / (1 + (r + 2) / 30);
      return Math.max(step, roundTo(max * ratios[exId] * pct, step));
    }
  }

  const levelFactor = { beginner: 0.8, intermediate: 1, advanced: 1.25 }[assessment.level] ?? 1;
  const sexFactor = assessment.sex === 'female' ? 0.7 : 1;
  return Math.max(entry.startKg > 0 ? step : 0, roundTo(entry.startKg * levelFactor * sexFactor, step));
}

/**
 * Everything the generator needs from the assessment, resolved once: the
 * session slots, split, the exercise pool the user can safely do, and limits.
 */
export function buildGenerationPlan(assessment = {}, { trainingDays } = {}) {
  const slots = trainingDays?.length ? trainingDays
    : (assessment.trainingDays?.length ? assessment.trainingDays : ['mon', 'wed', 'fri']);
  const equipment = assessment.equipment || 'full_gym';
  const level = assessment.level || 'intermediate';
  const mins = assessment.sessionLength || 60;
  const numDays = slots.length;
  const splitPref = assessment.splitPreference || 'full_body';

  // Bodyweight-only users always get full body — no split programs exist for it.
  // For "No Preference" or null, auto-select split by day count.
  const split = equipment === 'bodyweight'
    ? 'full_body'
    : (splitPref === 'no_preference' || splitPref === null)
      ? (numDays <= 3 ? 'full_body' : numDays === 4 ? 'upper_lower' : 'ppl')
      : splitPref;

  const blocked = blockedExerciseIds(assessment.painRegions, assessment.movementCompetency);
  const pool = filterCatalogForEquipment(equipment).filter(e => !blocked.has(e.id));

  const dayTypes = slots.map((_, i) => (
    split === 'ppl' ? (numDays >= 3 ? ['push', 'pull', 'legs'][i % 3] : ['push', 'pull_legs'][i % 2])
      : split === 'upper_lower' ? ['upper', 'lower'][i % 2]
      : 'full'
  ));

  return {
    slots, equipment, level, mins, split, dayTypes, pool, blocked,
    goal: assessment.goal || 'recomp',
    range: exerciseRange(mins),
    weeklyFloor: WEEKLY_SET_FLOOR[level] ?? 9,
  };
}

// Which groups each split-day type may contain.
const DAY_TYPE_GROUPS = {
  full: ['push', 'pull', 'legs', 'core'],
  push: ['push', 'core'], pull: ['pull', 'core'], legs: ['legs', 'core'],
  pull_legs: ['pull', 'legs', 'core'],
  upper: ['push', 'pull', 'core'], lower: ['legs', 'core'],
};

const DAY_TYPE_BRIEF = {
  full: 'FULL BODY — push, pull and legs every session; vary the exercises across sessions',
  push: 'PUSH — chest, shoulders, triceps only',
  pull: 'PULL — back, biceps only',
  legs: 'LEGS — quads, hamstrings, glutes, calves only',
  pull_legs: 'PULL + LEGS — back, biceps, hamstrings, glutes',
  upper: 'UPPER BODY — chest, back, shoulders, arms only',
  lower: 'LOWER BODY — quads, hamstrings, glutes, calves only',
};

const GOAL_STYLE = {
  recomp:   'Balanced hypertrophy: 3-4 sets, 8-12 reps, rest 90-120s',
  fat_loss: 'Higher reps: 3-4 sets, 12-15 reps, rest 60-90s',
  muscle:   'Hypertrophy with progressive overload: 3-5 sets, 6-12 reps, rest 120-180s',
  strength: 'Strength: compounds 4-5 sets of 3-6 reps with 180-300s rest; accessories 3 sets of 8-12',
};

const PAIN_LABEL = { shoulders: 'shoulders', lowerBack: 'lower back', knees: 'knees', hips: 'hips', wrists: 'wrists/elbows', neck: 'neck' };

function buildPrompt(plan, assessment) {
  const pain = Object.entries(assessment.painRegions || {})
    .filter(([, v]) => v && v !== 'none')
    .map(([k, v]) => `${PAIN_LABEL[k] || k} (${v})`);
  const maxes = Object.entries(assessment.estimatedMaxes || {})
    .filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k} ${v} kg`);
  const profile = [
    assessment.age && `age ${assessment.age}`,
    assessment.sex && assessment.sex,
    assessment.weightKg && `${assessment.weightKg} kg bodyweight`,
  ].filter(Boolean).join(', ');

  const catalog = plan.pool
    .map(e => `${e.id}="${e.name}"[${e.group}${e.isBodyweight ? ',BW' : ''}]`)
    .join(', ');

  const sessions = plan.slots
    .map((slot, i) => `  Session ${i + 1} (day key "${slot}"): ${DAY_TYPE_BRIEF[plan.dayTypes[i]]}`)
    .join('\n');

  return `Design one training week of ${plan.slots.length} sessions. The user trains on any days they choose — sessions are numbered, never tied to weekdays, so don't mention weekdays.

Goal: ${plan.goal} — ${GOAL_STYLE[plan.goal] || GOAL_STYLE.recomp}
Level: ${plan.level}${profile ? `\nProfile: ${profile}` : ''}
Equipment: ${EQUIPMENT_DESC[plan.equipment] || EQUIPMENT_DESC.full_gym}
Session length: ${plan.mins} min → ${plan.range.min}-${plan.range.max} exercises per session
Pain / limitations: ${pain.length ? pain.join(', ') : 'none reported'}${assessment.injuries ? ` — notes: ${assessment.injuries}` : ''}
Known maxes: ${maxes.length ? maxes.join(', ') : 'not given'}

Sessions:
${sessions}

Exercises you may use (exact ids; anything unsafe for this user is already removed): ${catalog}

Rules:
- One entry per session above, using its day key.
- ${plan.range.min}-${plan.range.max} exercises per session, compound lifts first.
- Across the week, give push, pull and legs each at least ${plan.weeklyFloor} hard sets.
- Don't repeat an exercise within a session.
- reps is the target; repMin/repMax the range (use reps for both on a fixed target). For timed holds, reps 0.
- note: one short coaching cue, or empty.
- Titles must reflect the session's focus (e.g. "PUSH — CHEST + SHOULDERS", "FULL BODY — A").`;
}

/** JSON schema for structured output — ids and day keys are enums, so they can't be invented. */
function programSchema(plan) {
  const exercise = {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'sets', 'reps', 'repMin', 'repMax', 'restSec', 'rpe', 'note'],
    properties: {
      id: { type: 'string', enum: plan.pool.map(e => e.id) },
      sets: { type: 'integer' },
      reps: { type: 'integer' },
      repMin: { type: 'integer' },
      repMax: { type: 'integer' },
      restSec: { type: 'integer' },
      rpe: { type: 'number' },
      note: { type: 'string' },
    },
  };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['sessions'],
    properties: {
      sessions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['day', 'title', 'exercises'],
          properties: {
            day: { type: 'string', enum: plan.slots },
            title: { type: 'string' },
            exercises: { type: 'array', items: exercise },
          },
        },
      },
    },
  };
}

// ── Post-processing ───────────────────────────────────────────────────────────

const clampInt = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Model output for one exercise → the shape the app stores, with our weights. */
function finishExercise(raw, assessment) {
  const entry = EX_CATALOG_MAP[raw.id];
  const isPlank = !!entry?.isPlank;
  const reps = isPlank ? 0 : clampInt(raw.reps, 1, 30, entry?.defaults.reps ?? 10);
  const repMin = isPlank ? 0 : clampInt(raw.repMin, 1, 30, reps);
  const repMax = isPlank ? 0 : Math.max(repMin, clampInt(raw.repMax, 1, 30, reps));
  return normalizeGeneratedExercise({
    id: raw.id,
    name: entry?.name,
    sets: clampInt(raw.sets, 1, 6, entry?.defaults.sets ?? 3),
    reps, repMin, repMax,
    restSec: clampInt(raw.restSec, 30, 300, entry?.defaults.restSec ?? 120),
    rpe: Number.isFinite(Number(raw.rpe)) ? Math.min(10, Math.max(5, Number(raw.rpe))) : (entry?.defaults.rpe ?? 8),
    note: (raw.note || entry?.note || '').slice(0, 120),
    startKg: estimateStartKg(raw.id, reps, assessment),
  });
}

function dedupe(exercises) {
  const seen = new Set();
  return exercises.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

/** Sets per major group across the week. */
export function weeklyGroupSets(templates) {
  const sets = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const t of Object.values(templates)) {
    for (const ex of t.exercises || []) {
      const g = getExerciseGroup(ex.id);
      if (g && g in sets) sets[g] += Number(ex.sets) || 0;
    }
  }
  return sets;
}

/**
 * Top up any major group that falls below the weekly floor, adding exercises
 * from the safe pool to sessions that allow that group and still have room.
 * Returns human-readable notes of what was added.
 */
export function balanceWeeklyVolume(templates, plan, assessment) {
  const notes = [];
  for (const group of MAJOR_GROUPS) {
    let guard = 0;
    while (weeklyGroupSets(templates)[group] < plan.weeklyFloor && guard++ < 6) {
      const target = plan.slots
        .map((slot, i) => ({ slot, type: plan.dayTypes[i] }))
        .filter(({ slot, type }) => templates[slot]
          && DAY_TYPE_GROUPS[type].includes(group)
          && templates[slot].exercises.length < plan.range.max)
        .sort((a, b) => templates[a.slot].exercises.length - templates[b.slot].exercises.length)[0];
      if (!target) break;
      const day = templates[target.slot];
      const pick = plan.pool.find(e => e.group === group && !e.isPlank
        && !day.exercises.some(x => x.id === e.id));
      if (!pick) break;
      day.exercises.push(finishExercise({ id: pick.id, ...pick.defaults, note: pick.note }, assessment));
      notes.push(`Added ${pick.name} to ${target.slot} for ${group} volume`);
    }
  }
  return notes;
}

/**
 * Turn the model's sessions into dayTemplates: equipment/safety check,
 * split check, safety substitutions, exercise count bounds, our weights.
 * Throws when a session can't be salvaged, so the caller can retry.
 */
export function buildTemplates(parsed, plan, assessment = {}) {
  const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
  const allowedIds = new Set(plan.pool.map(e => e.id));
  const catalogById = Object.fromEntries(plan.pool.map(e => [e.id, e]));
  const templates = {};

  for (const session of sessions) {
    const i = plan.slots.indexOf(session?.day);
    if (i === -1 || templates[session.day] || !Array.isArray(session.exercises)) continue;

    // Safety substitutions first: a blocked lift that slips through becomes its
    // intended safe swap (OHP → landmine for sore shoulders) rather than
    // whatever same-group exercise reconcileWithCatalog would pick.
    const original = session.exercises.map(normalizeGeneratedExercise);
    let exercises = applyCompetencySubstitutions(
      applySubstitutions(original, assessment.painRegions),
      assessment.movementCompetency,
    ).map((ex, j) => (ex.id === original[j].id ? ex : {
      // Substitutions replace in place; keep the model's prescription.
      ...ex,
      sets: original[j].sets, reps: original[j].reps, repMin: original[j].repMin,
      repMax: original[j].repMax, restSec: original[j].restSec, rpe: original[j].rpe,
    }));
    exercises = reconcileWithCatalog(exercises, allowedIds, catalogById);
    const groups = DAY_TYPE_GROUPS[plan.dayTypes[i]];
    exercises = exercises.filter(ex => groups.includes(getExerciseGroup(ex.id)));
    exercises = dedupe(exercises).slice(0, plan.range.max).map(ex => finishExercise(ex, assessment));

    if (exercises.length < Math.min(MIN_EXERCISES_PER_DAY, plan.range.min)) continue;
    templates[session.day] = {
      title: (session.title || '').slice(0, 60),
      sessionMinutes: plan.mins,
      exercises,
    };
  }

  const missing = plan.slots.filter(s => !templates[s]);
  if (missing.length) throw new Error(`incomplete program: missing ${missing.join(', ')}`);

  const notes = balanceWeeklyVolume(templates, plan, assessment);
  return { templates, notes };
}

// ── Generation ────────────────────────────────────────────────────────────────

/**
 * Generate a week of sessions for the assessment.
 *
 * Returns { ok: true, templates, notes } or { ok: false, error, message } where
 * error is 'quota' | 'network' | 'invalid'. Structured output guarantees the
 * shape and that ids come from the user's safe pool; anything that still
 * fails validation is retried once.
 *
 * @param {object} assessment
 * @param {object} [opts]
 * @param {string[]} [opts.trainingDays] slot keys; defaults to the assessment's
 */
export async function generateProgram(assessment, opts = {}) {
  const plan = buildGenerationPlan(assessment, opts);
  if (!plan.slots.length || plan.pool.length === 0) {
    return { ok: false, error: 'invalid', message: 'No exercises available for this setup.' };
  }

  const body = {
    // Charged against the program-generation budget, not the user's five
    // weekly coach messages — finishing onboarding shouldn't spend one.
    purpose: 'program_generation',
    model: PROGRAM_MODEL,
    max_tokens: 8192,
    system: 'You are an evidence-based strength coach who designs training programs.',
    messages: [{ role: 'user', content: buildPrompt(plan, assessment) }],
    output_config: { format: { type: 'json_schema', schema: programSchema(plan) } },
  };

  let last = { ok: false, error: 'invalid', message: 'Could not build a program.' };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await authPostJSON('/api/coach', body);
    } catch {
      last = { ok: false, error: 'network', message: 'Could not reach the coach. Check your connection.' };
      continue;
    }
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: 'quota', message: data.error || 'Weekly program generation limit reached.' };
    }
    if (!res.ok) {
      last = { ok: false, error: 'network', message: `Coach unavailable (${res.status}).` };
      continue;
    }
    try {
      const data = await res.json();
      if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') throw new Error(data.stop_reason);
      const text = data.content?.find(b => b.type === 'text')?.text || '';
      const { templates, notes } = buildTemplates(JSON.parse(text), plan, assessment);
      return { ok: true, templates, notes };
    } catch (e) {
      last = { ok: false, error: 'invalid', message: 'The generated program was incomplete.' };
    }
  }
  return last;
}

/**
 * Onboarding entry point: dayTemplates or null (caller falls back to a stock
 * program).
 */
export async function generateProgramFromAssessment(assessment) {
  const result = await generateProgram(assessment);
  return result.ok ? result.templates : null;
}
