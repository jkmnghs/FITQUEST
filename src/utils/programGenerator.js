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
export async function generateProgramFromAssessment(assessment) {
  const trainingDays = assessment.trainingDays || ['mon', 'wed', 'fri'];
  if (!trainingDays.length) return null;

  const equipment = assessment.equipment || 'full_gym';
  const goal      = assessment.goal      || 'recomp';
  const level     = assessment.level     || 'intermediate';
  const mins      = assessment.sessionLength || 60;
  const injuries  = assessment.injuries  || 'none';

  const catalog = filterCatalogForEquipment(equipment)
    .map(e => `${e.id}="${e.name}"${e.isBodyweight ? '[BW,0kg]' : `[${e.startKg}kg]`}`)
    .join(', ');

  const goalStyle = {
    recomp:    'Balanced hypertrophy: 3-4 sets, 8-12 reps, moderate rest 90-120s',
    fat_loss:  'Higher reps/supersets: 3-4 sets, 12-15 reps, shorter rest 60-90s',
    muscle:    'Progressive overload: 4-5 sets, 6-12 reps, longer rest 120-180s',
    strength:  'Strength focus: 4-5 sets, 3-6 reps, long rest 180-300s',
  }[goal] || 'Balanced hypertrophy: 3-4 sets, 8-12 reps';

  const prompt = `Design a complete ${trainingDays.length}-day training split for:
Goal: ${goal} — ${goalStyle}
Level: ${level}
Equipment: ${EQUIPMENT_DESC[equipment] || EQUIPMENT_DESC.full_gym}
Session length: ${mins} min
Training days: ${trainingDays.join(', ')}
Injuries/limitations: ${injuries}

Available exercises (use ONLY these exact IDs): ${catalog}

Return ONLY valid JSON — no markdown, no explanation:
{
  "<day>": {
    "title": "SESSION TYPE (e.g. PUSH + SHOULDERS + ABS)",
    "sessionMinutes": ${mins},
    "exercises": [
      {"id":"<id>","name":"<name>","sets":<n>,"reps":<n>,"repMin":<n>,"repMax":<n>,"startKg":<n>,"restSec":<n>,"rpe":<n>,"note":"<optional cue>","isBodyweight":<bool>,"isPlank":<bool>}
    ]
  }
}

Rules:
- Include exactly these days: ${trainingDays.join(', ')}
- 6-8 exercises per day maximum
- isBodyweight: true and startKg: 0 for all bodyweight moves
- isPlank: true only for plank
- startKg should be realistic for ${level} level
- Balance muscle groups across the week
- Don't repeat the same primary muscle group on consecutive days`;

  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
