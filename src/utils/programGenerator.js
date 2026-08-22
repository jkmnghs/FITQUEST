import { EX_CATALOG_MAP, getExerciseGroup, filterCatalogForEquipment } from '../data/exerciseCatalog';
import { authPostJSON } from '../lib/authFetch';

// Muscle-group membership for post-processing split validation comes from the
// catalog itself, so a newly added exercise can never be silently dropped for
// lacking a group tag. 'core' is allowed on any split day; rdl and deadlift are
// tagged 'legs' so they survive both the upper/lower lower-day and PPL leg-day
// filters.

// Which groups are allowed for each split-day label
// Fewer than this and the day isn't a usable session — see the split-filter
// note in generateProgramFromAssessment.
const MIN_EXERCISES_PER_DAY = 3;

const SPLIT_ALLOWED = {
  ppl:         { push: ['push','core'], pull: ['pull','core'], legs: ['legs','core'] },
  upper_lower: { upper: ['push','pull','core'], lower: ['legs','core'] },
};

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

function filterToSplitDay(exercises, dayType, split) {
  const allowed = SPLIT_ALLOWED[split]?.[dayType];
  if (!allowed) return exercises;
  return exercises.filter(ex => allowed.includes(getExerciseGroup(ex.id)));
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

/**
 * Silently generates a per-day training program using Claude, based on the user's
 * assessment. Returns a dayTemplates object or null on failure.
 */
export async function generateProgramFromAssessment(assessment) {
  const trainingDays = assessment.trainingDays || ['mon', 'wed', 'fri'];
  if (!trainingDays.length) return null;

  const equipment      = assessment.equipment      || 'full_gym';
  const goal           = assessment.goal           || 'recomp';
  const level          = assessment.level          || 'intermediate';
  const mins           = assessment.sessionLength  || 60;
  const injuries       = assessment.injuries       || 'none';
  const splitPref      = assessment.splitPreference || 'full_body';
  const numDays        = trainingDays.length;

  // Bodyweight-only users always get full body — no split programs exist for it.
  // For "No Preference" or null, auto-select split by day count.
  const effectiveSplit = equipment === 'bodyweight'
    ? 'full_body'
    : (splitPref === 'no_preference' || splitPref === null)
      ? (numDays <= 3 ? 'full_body' : numDays === 4 ? 'upper_lower' : 'ppl')
      : splitPref;

  const availableCatalog = filterCatalogForEquipment(equipment);
  // Same list the prompt advertises — kept so the response can be checked
  // against it instead of trusted.
  const allowedIds = new Set(availableCatalog.map(e => e.id));
  const catalogById = Object.fromEntries(availableCatalog.map(e => [e.id, e]));
  const catalog = availableCatalog
    .map(e => {
      const weight = e.isBodyweight ? 'BW,0kg' : `${e.startKg}kg`;
      return `${e.id}="${e.name}"[${weight}][${(e.group || 'core').toUpperCase()}]`;
    })
    .join(', ');

  const goalStyle = {
    recomp:   'Balanced hypertrophy: 3-4 sets, 8-12 reps, moderate rest 90-120s',
    fat_loss: 'Higher reps/supersets: 3-4 sets, 12-15 reps, shorter rest 60-90s',
    muscle:   'Progressive overload: 4-5 sets, 6-12 reps, longer rest 120-180s',
    strength: 'Strength focus: 4-5 sets, 3-6 reps, long rest 180-300s',
  }[goal] || 'Balanced hypertrophy: 3-4 sets, 8-12 reps';

  const UPPER_LOWER_TYPES = [
    { title: 'UPPER BODY', muscles: 'chest, back, shoulders, and arms ONLY — bench press, rows, overhead press, pulldowns, curls, tricep work. NO leg or glute exercises.' },
    { title: 'LOWER BODY', muscles: 'quads, hamstrings, glutes, and calves ONLY — squats, Romanian deadlifts, conventional deadlifts, lunges, leg press, leg curls, hip thrusts, calf raises. NO upper body exercises.' },
  ];
  const PPL_TYPES = [
    { title: 'PUSH — CHEST + SHOULDERS + TRIS',    muscles: 'chest, shoulders, and triceps ONLY — bench press, overhead press, dips, flyes, lateral raises, tricep work. NO back, biceps, or leg exercises.' },
    { title: 'PULL — BACK + BICEPS',                muscles: 'back and biceps ONLY — rows, pulldowns, pull-ups, curls, face pulls, pullovers. NO pressing, triceps, deadlifts, or leg exercises.' },
    { title: 'LEGS — QUADS + HAMSTRINGS + GLUTES',  muscles: 'legs and glutes ONLY — squats, Romanian deadlifts, conventional deadlifts, lunges, leg press, leg curls, hip thrusts, calf raises. NO upper body exercises.' },
  ];

  const splitDesc = {
    full_body: `FULL BODY split — every session trains push, pull, AND legs together. Each day is a complete full-body workout. Title each day "FULL BODY" with a short variation note (e.g. "FULL BODY — STRENGTH FOCUS" or "FULL BODY — HYPERTROPHY"). Vary exercise selection across days — don't repeat the same exercises each session.`,
    upper_lower: `UPPER / LOWER split — strict muscle group isolation per session. Day assignments:\n${trainingDays.map((d, i) => `  ${d}: Title="${UPPER_LOWER_TYPES[i % 2].title}" — train ${UPPER_LOWER_TYPES[i % 2].muscles}`).join('\n')}\nEach day must ONLY include exercises for its designated muscle group. Do NOT mix upper and lower body exercises within a session.`,
    ppl: numDays >= 3
      ? `PUSH / PULL / LEGS split — strict muscle group isolation per session. Day assignments:\n${trainingDays.map((d, i) => `  ${d}: Title="${PPL_TYPES[i % 3].title}" — train ${PPL_TYPES[i % 3].muscles}`).join('\n')}\nEach day must ONLY include exercises for its designated muscle group. Do NOT mix muscle groups within a session.`
      : `PUSH / PULL split — with only ${numDays} days, use Day 1 (${trainingDays[0]}): Push (chest, shoulders, triceps ONLY) and Day 2 (${trainingDays[1] || ''}): Pull + Legs combined (back, biceps, hamstrings, glutes).`,
  }[effectiveSplit] || `FULL BODY split — train all major muscle groups each session.`;

  const splitIsolationRule = effectiveSplit === 'full_body'
    ? '- Vary exercise selection across days — don\'t repeat the exact same exercises each session'
    : '- Each session must ONLY contain exercises for its designated muscle group — no cross-group exercises';

  const prompt = `Design a complete ${numDays}-day training program for:
Goal: ${goal} — ${goalStyle}
Level: ${level}
Equipment: ${EQUIPMENT_DESC[equipment] || EQUIPMENT_DESC.full_gym}
Session length: ${mins} min
Training days: ${trainingDays.join(', ')}
Injuries/limitations: ${injuries}
Split style: ${splitDesc}

Available exercises (use ONLY these exact IDs): ${catalog}

Return ONLY valid JSON — no markdown, no explanation:
{
  "<day>": {
    "title": "SESSION NAME matching the split style above",
    "sessionMinutes": ${mins},
    "exercises": [
      {"id":"<id>","name":"<name>","sets":<n>,"reps":<n>,"repMin":<n>,"repMax":<n>,"startKg":<n>,"restSec":<n>,"rpe":<n>,"note":"<optional cue>","isBodyweight":<bool>,"isPlank":<bool>}
    ]
  }
}

Rules:
- Include exactly these days: ${trainingDays.join(', ')}
- 6-8 exercises per day maximum
- Follow the split style instructions above strictly — session titles must reflect the split
- isBodyweight: true and startKg: 0 for all bodyweight moves
- isPlank: true only for plank
- startKg should be realistic for ${level} level
${splitIsolationRule}`;

  try {
    const res = await authPostJSON('/api/coach', {
      // Charged against the program-generation budget, not the user's five
      // weekly coach messages — finishing onboarding shouldn't spend one.
      purpose: 'program_generation',
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: 'You are a training program generator. Output only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const pplDayTypes = ['push', 'pull', 'legs'];
    const ulDayTypes  = ['upper', 'lower'];
    const valid = {};
    for (const [day, prog] of Object.entries(parsed)) {
      if (!trainingDays.includes(day) || !Array.isArray(prog.exercises) || prog.exercises.length === 0) continue;

      // Equipment first: an id the user can't perform is replaced before any
      // split reasoning, so the substitute is what gets split-filtered.
      let exercises = reconcileWithCatalog(
        prog.exercises.map(normalizeGeneratedExercise),
        allowedIds,
        catalogById,
      );

      // Strip exercises that belong to the wrong muscle group for this split day
      if (effectiveSplit === 'ppl') {
        const dayType = pplDayTypes[trainingDays.indexOf(day) % 3];
        exercises = filterToSplitDay(exercises, dayType, 'ppl');
      } else if (effectiveSplit === 'upper_lower') {
        const dayType = ulDayTypes[trainingDays.indexOf(day) % 2];
        exercises = filterToSplitDay(exercises, dayType, 'upper_lower');
      }

      // Split filtering has no floor of its own: a day the model built for the
      // wrong muscle group can come out the other side with one exercise left,
      // which reads as a broken program rather than a short one. Below the
      // floor, treat the day as failed so the caller falls back to a stock
      // program instead of saving a stub.
      if (exercises.length < MIN_EXERCISES_PER_DAY) continue;

      if (exercises.length > 0) {
        valid[day] = {
          title:          prog.title || '',
          sessionMinutes: prog.sessionMinutes || mins,
          exercises,
        };
      }
    }
    return Object.keys(valid).length > 0 ? valid : null;
  } catch {
    return null;
  }
}
