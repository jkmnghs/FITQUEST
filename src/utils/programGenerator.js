import { EX_CATALOG } from '../data/exerciseCatalog';

const BARBELL_IDS = new Set(['squat','bench','deadlift','rdl','cgbench','bbohp','bbrow','incbench','skullcrush']);
const CABLE_IDS   = new Set(['pulldown','cablerow','facepull','cablefly','cablelat','cablecurl','cablecrnch','tricpush','ohtriext']);
const MACHINE_IDS = new Set(['legpress','legcurl','legext','hipthrust','pecdeck','machohp']);

export const EQUIPMENT_DESC = {
  full_gym:       'Full gym: barbells, dumbbells, cables, all machines available',
  dumbbells:      'Dumbbells and resistance bands ONLY — no barbells, no cables, no machines',
  dumbbells_only: 'Dumbbells only — no other equipment at all',
  barbell_home:   'Home setup: barbell + dumbbells, NO cables or machines',
  bodyweight:     'Bodyweight ONLY — zero equipment',
};

export function filterCatalogForEquipment(equipment) {
  return EX_CATALOG.filter(e => {
    if (equipment === 'bodyweight')     return !!e.isBodyweight;
    if (equipment === 'dumbbells_only') return e.isBodyweight || (!BARBELL_IDS.has(e.id) && !CABLE_IDS.has(e.id) && !MACHINE_IDS.has(e.id));
    if (equipment === 'dumbbells')      return e.isBodyweight || (!BARBELL_IDS.has(e.id) && !MACHINE_IDS.has(e.id));
    if (equipment === 'barbell_home')   return e.isBodyweight || (!CABLE_IDS.has(e.id) && !MACHINE_IDS.has(e.id));
    return true; // full_gym — everything
  });
}

/**
 * Silently generates a per-day training program using Claude, based on the user's
 * assessment. Returns a dayTemplates object or null on failure.
 */
export async function generateProgramFromAssessment(assessment, userId) {
  const trainingDays = assessment.trainingDays || ['mon', 'wed', 'fri'];
  if (!trainingDays.length) return null;

  const equipment      = assessment.equipment      || 'full_gym';
  const goal           = assessment.goal           || 'recomp';
  const level          = assessment.level          || 'intermediate';
  const mins           = assessment.sessionLength  || 60;
  const injuries       = assessment.injuries       || 'none';
  const splitPref      = assessment.splitPreference || 'full_body';
  const numDays        = trainingDays.length;

  // For "No Preference" or beginners (null), pick the most appropriate split by day count
  const effectiveSplit = (splitPref === 'no_preference' || splitPref === null)
    ? (numDays <= 3 ? 'full_body' : numDays === 4 ? 'upper_lower' : 'ppl')
    : splitPref;

  const catalog = filterCatalogForEquipment(equipment)
    .map(e => `${e.id}="${e.name}"${e.isBodyweight ? '[BW,0kg]' : `[${e.startKg}kg]`}`)
    .join(', ');

  const goalStyle = {
    recomp:   'Balanced hypertrophy: 3-4 sets, 8-12 reps, moderate rest 90-120s',
    fat_loss: 'Higher reps/supersets: 3-4 sets, 12-15 reps, shorter rest 60-90s',
    muscle:   'Progressive overload: 4-5 sets, 6-12 reps, longer rest 120-180s',
    strength: 'Strength focus: 4-5 sets, 3-6 reps, long rest 180-300s',
  }[goal] || 'Balanced hypertrophy: 3-4 sets, 8-12 reps';

  const UPPER_LOWER_TYPES = [
    { title: 'UPPER BODY', muscles: 'chest, back, shoulders, and arms ONLY — bench press, rows, overhead press, pulldowns, curls, tricep work. NO leg or glute exercises.' },
    { title: 'LOWER BODY', muscles: 'quads, hamstrings, glutes, and calves ONLY — squats, deadlifts, lunges, leg press, leg curls, calf raises. NO upper body exercises.' },
  ];
  const PPL_TYPES = [
    { title: 'PUSH — CHEST + SHOULDERS + TRIS', muscles: 'chest, shoulders, and triceps ONLY — bench press, overhead press, dips, flyes, tricep work. NO back, biceps, or leg exercises.' },
    { title: 'PULL — BACK + BICEPS',             muscles: 'back, biceps, and rear delts ONLY — rows, pulldowns, pull-ups, curls, face pulls. NO chest, pressing, or leg exercises.' },
    { title: 'LEGS — QUADS + HAMSTRINGS + GLUTES', muscles: 'legs and glutes ONLY — squats, deadlifts, lunges, leg press, leg curls, calf raises. NO upper body exercises.' },
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
    const pgHeaders = { 'Content-Type': 'application/json' };
    if (userId) pgHeaders['x-user-id'] = userId;
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: pgHeaders,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: 'You are a training program generator. Output only valid JSON.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const valid = {};
    for (const [day, prog] of Object.entries(parsed)) {
      if (trainingDays.includes(day) && Array.isArray(prog.exercises) && prog.exercises.length > 0) {
        valid[day] = {
          title:          prog.title || '',
          sessionMinutes: prog.sessionMinutes || mins,
          exercises:      prog.exercises,
        };
      }
    }
    return Object.keys(valid).length > 0 ? valid : null;
  } catch {
    return null;
  }
}
