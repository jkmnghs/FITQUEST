import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/authFetch', () => ({ authPostJSON: vi.fn() }));
import { authPostJSON } from '../../lib/authFetch';
import {
  exerciseRange, estimateStartKg, buildGenerationPlan, buildTemplates,
  weeklyGroupSets, generateProgram,
} from '../programGenerator';

const base = { equipment: 'full_gym', level: 'intermediate', sessionLength: 60, goal: 'muscle', trainingDays: ['mon', 'wed', 'fri'] };
const ex = (id, sets = 3, reps = 10) => ({ id, sets, reps, repMin: reps, repMax: reps, restSec: 120, rpe: 8, note: '' });

function fullBodyWeek() {
  return {
    sessions: ['mon', 'wed', 'fri'].map(day => ({
      day, title: 'FULL BODY',
      exercises: [ex('squat'), ex('bench'), ex('bbrow'), ex('rdl'), ex('ohp'), ex('pulldown')],
    })),
  };
}

describe('exerciseRange', () => {
  it('scales the exercise count with session length', () => {
    expect(exerciseRange(30)).toEqual({ min: 3, max: 4 });
    expect(exerciseRange(60).max).toBe(6);
    expect(exerciseRange(90).max).toBe(8);
  });
});

describe('estimateStartKg', () => {
  it('derives working weight from a known max', () => {
    // 100 kg squat, 10 reps at ~2 RIR → 1/(1+12/30) ≈ 71.4% → 72.5 kg
    expect(estimateStartKg('squat', 10, { estimatedMaxes: { squat: 100 } })).toBe(72.5);
    // Lower reps → heavier
    expect(estimateStartKg('squat', 5, { estimatedMaxes: { squat: 100 } })).toBeGreaterThan(72.5);
  });

  it('maps related lifts by ratio, rounding dumbbells to whole kg', () => {
    const kg = estimateStartKg('dbbench', 10, { estimatedMaxes: { bench: 100 } });
    expect(kg).toBe(25); // 100 × 0.35 × 0.714
    expect(Number.isInteger(kg)).toBe(true);
  });

  it('falls back to the catalog default scaled by level and sex', () => {
    const inter = estimateStartKg('legpress', 10, { level: 'intermediate' });
    const beg = estimateStartKg('legpress', 10, { level: 'beginner' });
    const female = estimateStartKg('legpress', 10, { level: 'intermediate', sex: 'female' });
    expect(beg).toBeLessThan(inter);
    expect(female).toBeLessThan(inter);
  });

  it('is zero for bodyweight moves', () => {
    expect(estimateStartKg('pushup', 12, { estimatedMaxes: { bench: 100 } })).toBe(0);
  });
});

describe('buildGenerationPlan', () => {
  it('removes exercises that pain or competency rule out', () => {
    const plan = buildGenerationPlan({
      ...base,
      painRegions: { shoulders: 'moderate', knees: 'none' },
      movementCompetency: { squat: 'never', deadlift: 'never' },
    });
    const ids = plan.pool.map(e => e.id);
    expect(ids).not.toContain('ohp');
    expect(ids).not.toContain('squat');
    expect(ids).not.toContain('rdl');
    expect(ids).not.toContain('deadlift');
    expect(ids).toContain('landmine');
  });

  it('keeps rdl when the user is only unsure about deadlifting', () => {
    const plan = buildGenerationPlan({ ...base, movementCompetency: { deadlift: 'unsure' } });
    expect(plan.pool.map(e => e.id)).toContain('rdl');
  });

  it('respects equipment and picks a split by day count', () => {
    const bw = buildGenerationPlan({ ...base, equipment: 'bodyweight' });
    expect(bw.pool.every(e => e.isBodyweight)).toBe(true);
    expect(bw.split).toBe('full_body');
    const four = buildGenerationPlan({ ...base, splitPreference: 'no_preference', trainingDays: ['mon', 'tue', 'thu', 'fri'] });
    expect(four.dayTypes).toEqual(['upper', 'lower', 'upper', 'lower']);
  });

  it('uses explicit slot keys over the assessment', () => {
    expect(buildGenerationPlan(base, { trainingDays: ['mon', 'thu'] }).slots).toEqual(['mon', 'thu']);
  });
});

describe('buildTemplates', () => {
  it('builds every session with our weights instead of the model\'s', () => {
    const plan = buildGenerationPlan(base);
    const { templates } = buildTemplates(fullBodyWeek(), plan, { ...base, estimatedMaxes: { squat: 100 } });
    expect(Object.keys(templates)).toEqual(['mon', 'wed', 'fri']);
    const squat = templates.mon.exercises.find(e => e.id === 'squat');
    expect(squat.startKg).toBe(72.5);
    expect(squat.name).toBe('Barbell Squat');
    expect(squat.rest).toBe('2 min');
  });

  it('trims a session to the length the user has', () => {
    const plan = buildGenerationPlan({ ...base, sessionLength: 30 });
    const { templates } = buildTemplates(fullBodyWeek(), plan, base);
    expect(templates.mon.exercises.length).toBeLessThanOrEqual(4);
  });

  it('strips exercises from the wrong split group', () => {
    const plan = buildGenerationPlan({ ...base, splitPreference: 'upper_lower', trainingDays: ['mon', 'tue', 'thu', 'fri'] });
    const week = {
      sessions: ['mon', 'tue', 'thu', 'fri'].map((day, i) => ({
        day, title: i % 2 ? 'LOWER' : 'UPPER',
        exercises: i % 2
          ? [ex('squat'), ex('rdl'), ex('legcurl'), ex('bench'), ex('calfraise')]
          : [ex('bench'), ex('bbrow'), ex('ohp'), ex('squat'), ex('pulldown')],
      })),
    };
    const { templates } = buildTemplates(week, plan, base);
    expect(templates.mon.exercises.map(e => e.id)).not.toContain('squat');
    expect(templates.tue.exercises.map(e => e.id)).not.toContain('bench');
  });

  it('swaps a blocked lift that slips through for its safe substitute', () => {
    const assessment = { ...base, painRegions: { knees: 'moderate' } };
    const plan = buildGenerationPlan(assessment);
    plan.pool.push({ id: 'squat', group: 'legs' }); // simulate a stale pool
    const { templates } = buildTemplates(fullBodyWeek(), plan, assessment);
    const ids = templates.mon.exercises.map(e => e.id);
    expect(ids).not.toContain('squat');
    expect(ids).toContain('legpress');
  });

  it('turns a blocked pick into its safe swap, not a random same-group lift', () => {
    const assessment = { ...base, painRegions: { shoulders: 'moderate' } };
    const plan = buildGenerationPlan(assessment);
    const { templates } = buildTemplates(fullBodyWeek(), plan, assessment); // contains ohp
    const ids = templates.mon.exercises.map(e => e.id);
    expect(ids).toContain('landmine');
    expect(ids).not.toContain('ohp');
    expect(templates.mon.exercises.find(e => e.id === 'landmine')).toMatchObject({ sets: 3, reps: 10 });
  });

  it('tops up a muscle group the model under-dosed', () => {
    const plan = buildGenerationPlan(base);
    const week = {
      sessions: ['mon', 'wed', 'fri'].map(day => ({
        day, title: 'FULL BODY',
        exercises: [ex('squat'), ex('bench'), ex('rdl'), ex('ohp')], // no pulling at all
      })),
    };
    const { templates, notes } = buildTemplates(week, plan, base);
    expect(weeklyGroupSets(templates).pull).toBeGreaterThanOrEqual(plan.weeklyFloor);
    expect(notes.length).toBeGreaterThan(0);
  });

  it('throws when a session is missing so the caller can retry', () => {
    const plan = buildGenerationPlan(base);
    const week = fullBodyWeek();
    week.sessions.pop();
    expect(() => buildTemplates(week, plan, base)).toThrow(/missing fri/);
  });
});

describe('generateProgram', () => {
  const reply = (obj, init = {}) => ({
    ok: true, status: 200,
    json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(obj) }] }),
    ...init,
  });

  beforeEach(() => authPostJSON.mockReset());

  it('sends a structured-output request on the program budget', async () => {
    authPostJSON.mockResolvedValueOnce(reply(fullBodyWeek()));
    const res = await generateProgram(base); console.log('RES', JSON.stringify(res), authPostJSON.mock.calls.length);
    expect(res.ok).toBe(true);
    const body = authPostJSON.mock.calls[0][1];
    expect(body.purpose).toBe('program_generation');
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.messages[0].content).not.toMatch(/Monday|Wednesday/);
  });

  it('retries once after an unusable reply', async () => {
    const broken = fullBodyWeek(); broken.sessions = broken.sessions.slice(0, 1);
    authPostJSON
      .mockResolvedValueOnce(reply(broken))
      .mockResolvedValueOnce(reply(fullBodyWeek()));
    const res = await generateProgram(base); console.log('RES', JSON.stringify(res), authPostJSON.mock.calls.length);
    expect(res.ok).toBe(true);
    expect(authPostJSON).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the weekly limit is reached', async () => {
    authPostJSON.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'Weekly program generation limit reached (15/15).' }) });
    const res = await generateProgram(base); console.log('RES', JSON.stringify(res), authPostJSON.mock.calls.length);
    expect(res).toMatchObject({ ok: false, error: 'quota' });
    expect(authPostJSON).toHaveBeenCalledTimes(1);
  });

  it('gives up after two failures', async () => {
    authPostJSON.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    const res = await generateProgram(base);
    expect(res).toMatchObject({ ok: false, error: 'network' });
    expect(authPostJSON).toHaveBeenCalledTimes(2);
  });
});
