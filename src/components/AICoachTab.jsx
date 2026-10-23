import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Sparkles, Inbox, ArrowRight, Loader2, CalendarRange, Check, Zap, ChartColumn, TrendingUp, Target, ClipboardCheck, ScanSearch } from 'lucide-react';
import { EXERCISES } from '../data/gameData';
import { getPhase, convertWeight } from '../utils/gameLogic';
import { formatForCoach } from '../utils/coachExport';
import { EX_CATALOG } from '../data/exerciseCatalog';
import { filterCatalogForEquipment, EQUIPMENT_DESC } from '../utils/programGenerator';
import { authPostJSON } from '../lib/authFetch';
import {
  getRecentPerformances, sessionEstimated1RM, getStrengthTrend,
  sessionsInLastDays, lastSessionDate,
} from '../utils/exerciseHistory';
import { getBodyMetrics, formatBodyData, formatCheckinTrend, getHeightCm } from '../utils/bodyMetrics';

const DAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

// Tool Claude calls to write exercises directly into the user's day template
const SAVE_PROGRAM_TOOL = {
  name: 'save_day_program',
  description: 'Save or replace the exercise list for one training day. Call this whenever the user asks to set up, build, add to, or redesign their workout for a specific day.',
  input_schema: {
    type: 'object',
    properties: {
      day: { type: 'string', enum: ['mon','tue','wed','thu','fri','sat','sun'], description: 'Training day key' },
      title: { type: 'string', description: 'Session label, e.g. PUSH + SHOULDERS + ABS' },
      sessionMinutes: { type: 'number', description: 'Estimated duration in minutes' },
      exercises: {
        type: 'array',
        description: 'Ordered list of exercises for the session',
        items: {
          type: 'object',
          properties: {
            id:          { type: 'string',  description: 'Exact ID from the exercise catalog' },
            name:        { type: 'string',  description: 'Display name' },
            sets:        { type: 'number' },
            reps:        { type: 'number',  description: 'Mid-range target reps' },
            repMin:      { type: 'number' },
            repMax:      { type: 'number' },
            startKg:     { type: 'number',  description: 'Starting weight in kg; 0 for bodyweight' },
            restSec:     { type: 'number',  description: 'Rest in seconds (e.g. 90, 120, 180)' },
            rpe:         { type: 'number',  description: 'Target RPE 5-10' },
            note:        { type: 'string',  description: 'Optional coaching cue' },
            isBodyweight:{ type: 'boolean' },
            isPlank:     { type: 'boolean' },
          },
          required: ['id', 'name', 'sets', 'reps', 'restSec', 'rpe'],
        },
      },
    },
    required: ['day', 'exercises'],
  },
};

// Helper: get the user's active exercise list, falling back to the default barbell set
function getExercises(state) {
  return state.activeExercises?.length ? state.activeExercises : EXERCISES;
}

const COACH_MODES = [
  { id: 'pep',      icon: Zap, label: 'Pre-Workout',    color: 'var(--fire2)',   bg: 'rgba(255,109,0,0.08)',   border: 'rgba(255,109,0,0.2)' },
  { id: 'analysis', icon: ChartColumn, label: 'Post-Session',   color: 'var(--cyan)',    bg: 'var(--cyan-glow)',       border: 'rgba(0,229,255,0.2)' },
  { id: 'overload', icon: TrendingUp, label: 'Overload Plan',  color: 'var(--green)',   bg: 'var(--green-glow)',      border: 'rgba(0,230,118,0.2)' },
  { id: 'form',     icon: Target, label: 'Form Tips',      color: 'var(--purple)',  bg: 'var(--purple-glow)',     border: 'rgba(179,136,255,0.2)' },
  { id: 'checkin',  icon: ClipboardCheck, label: 'Check-in Review',color: 'var(--gold)',    bg: 'var(--gold-glow)',       border: 'rgba(255,214,0,0.2)' },
  { id: 'build',    icon: CalendarRange, label: 'Program Builder', color: '#b3ff5e',       bg: 'rgba(179,255,94,0.07)', border: 'rgba(179,255,94,0.25)' },
  { id: 'physique', icon: ScanSearch, label: 'Physique Analysis', color: '#ff6f91',     bg: 'rgba(255,111,145,0.07)', border: 'rgba(255,111,145,0.25)' },
];

// One-shot modes don't benefit from conversation history — each call is independent
const ONE_SHOT_MODES = ['pep', 'analysis', 'overload', 'form'];

// Mode-specific system prompts — only send data relevant to each mode
// What the user actually signed up for. The base prompt used to assert a
// "12-week body recomposition program" for everybody, so a user who picked
// Strength got told they were doing recomp — and then, in physique mode, saw
// `Stated goal: strength` a few lines later in the same prompt. The model was
// being handed a contradiction and left to pick a side.
const GOAL_DESC = {
  recomp:   'body recomposition',
  fat_loss: 'fat loss',
  muscle:   'muscle building',
  strength: 'strength',
};

/**
 * Where the user is in the training cycle.
 *
 * The phase structure repeats every 12 weeks (getPhase maps any week into the
 * 1-12 cycle), so a user in week 15 is in their second cycle — printing
 * "Wk 15/12" told the model something impossible.
 */
function cyclePosition(week) {
  const w = Number(week) || 1;
  const inCycle = ((w - 1) % 12) + 1;
  const cycle = Math.floor((w - 1) / 12) + 1;
  return cycle > 1
    ? `Wk ${w} (cycle ${cycle}, week ${inCycle}/12)`
    : `Wk ${w}/12`;
}

function buildSystemPrompt(state, mode) {
  const phase = getPhase(state.currentWeek);
  const unit = state.unit;
  const name = state.name || 'Athlete';
  const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;
  const goal = state.assessment?.goal;
  const goalDesc = GOAL_DESC[goal] || 'general fitness';
  const weekLabel = cyclePosition(state.currentWeek);

  const base = `You are Coach AI for FitQuest — a hyper-personalized fitness coach for ${name}, whose stated training goal is ${goalDesc}.
COACHING STYLE: Direct, energetic, motivating. Use ${name}'s actual numbers — never be generic. Keep responses concise (150-200 words max). Use formatting sparingly.
EXERCISE SUBSTITUTIONS: If the user asks to swap or skip an exercise, suggest the best available alternative based on their equipment. Common swaps: Bench Press → DB Bench Press or Push-ups; Barbell Squat → DB Goblet Squat or Bodyweight Squat; Lat Pulldown → DB Bent-Over Row or Inverted Row; Leg Curl → DB Romanian Deadlift or Nordic Curl. Always match the muscle group. If they have no replacement, give a bodyweight option.`;

  if (mode === 'build') {
    const equipment = state.assessment?.equipment || 'full_gym';
    const equipmentDesc = EQUIPMENT_DESC[equipment] || EQUIPMENT_DESC.full_gym;
    const trainingDays = (state.assessment?.trainingDays || state.trainingDays || ['mon', 'wed', 'fri'])
      .map(d => DAY_FULL[d] || d).join(', ');
    const currentProgram = Object.entries(state.dayTemplates || {})
      .map(([d, t]) => `${DAY_FULL[d] || d}: ${t.title || 'Untitled'} (${(t.exercises || []).length} exercises)`)
      .join('; ') || 'None set yet';
    const availableCatalog = filterCatalogForEquipment(equipment);
    const catalog = availableCatalog.map(e =>
      `${e.id}="${e.name}"${e.isBodyweight ? '[BW]' : e.isPlank ? '[Plank]' : `[${e.startKg}kg]`}`
    ).join(', ');
    return `${base}
You are ${name}'s personal program designer. You build and save evidence-based workout programs directly into their training schedule.

TRAINING DAYS: ${trainingDays}
EQUIPMENT: ${equipmentDesc}
CURRENT PROGRAM: ${currentProgram}
STATS: Lv ${state.level} | ${weekLabel} | ${state.totalSessions} sessions | ${state.assessment?.level || 'intermediate'} | Goal: ${goal || 'not set'}

EXERCISE CATALOG — ONLY exercises available for this user's equipment (use exact IDs): ${catalog}

CRITICAL RULES — FOLLOW EXACTLY:
1. NEVER write out exercise lists as plain text. The save_day_program tool IS the only way to give the user a program.
2. Call save_day_program IMMEDIATELY when you have exercises ready. Do NOT say "I'll save this now" or "I'm locking this in" — just call the tool.
3. For multi-day programs, call save_day_program MULTIPLE TIMES in the SAME response — one call per day. Do not wait for confirmation between days.
4. If the user pastes or describes a program they want saved, convert it to tool calls immediately.
5. ONLY after all tool calls are made, add a brief 1-2 sentence summary of what was saved.
6. Use ONLY exercise IDs from the catalog — never suggest exercises requiring unavailable equipment.
7. Set isBodyweight: true and startKg: 0 for bodyweight moves.
8. Use evidence-based standards: 3-5 sets, 6-15 rep ranges, 90-180s rest for compounds, 60-90s for accessories.
9. Keep sessions to 6-10 exercises max.`;
  }

  if (mode === 'physique') {
    const weightTrend = formatCheckinTrend(state, unit, 8);
    const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;
    // Program-week count and calendar-week count are different numbers, and
    // only one of them answers "have they trained lately". See sessionsInLastDays.
    const last7 = sessionsInLastDays(state, 7);
    const lastSession = lastSessionDate(state);
    return `${base}
You are ${name}'s physique analyst. Objectively assess body composition data and recommend the optimal training focus: recomp, fat loss, muscle building, or strength. Be direct and data-driven.

BODY DATA:
${formatBodyData(state, unit)}
- Stated goal: ${goal || 'not set'}
- Training level: ${state.assessment?.level || 'intermediate'}

WEIGHT TREND (last 8 check-ins): ${weightTrend}
TRAINING: ${state.totalSessions} sessions total | ${state.perfectWeeks} perfect weeks | Streak: ${state.streak}d
SESSIONS IN THE LAST 7 DAYS: ${last7} (target ${state.sessionsPerWeek || 3}/week) | Last session: ${lastSession || 'never'}
PROGRAM WEEK PROGRESS: ${weekSessions}/${state.sessionsPerWeek || 3} logged since the current program week began — this resets to 0 whenever a program week completes, so a low number here does NOT mean they have stopped training. Judge consistency on the last-7-days figure above.

RECOMMENDATION FRAMEWORK:
- Recomp: best for intermediates at moderate BF, eating at maintenance, training 3-4x/week consistently
- Fat loss priority: waist-to-height >0.55, high BMI, health markers are the goal, visible progress for motivation
- Muscle building: lean trainees (BF <18% men, <25% women), solid base, ready for progressive overload and slight surplus
- Strength: established muscle base, wants performance over aesthetics, handles heavier loading

Analyze the data honestly. If data is sparse, say so and ask for check-ins. Give a clear recommendation with reasoning.`;
  }

  if (mode === 'form') {
    const exercises = getExercises(state);
    // Form mode only needs exercise context, not full lift data
    return `${base}
PROGRAM: ${exercises.map(e => e.name).join(', ')}
PHASE: ${weekLabel} — ${phase.name}: ${phase.desc}`;
  }

  const sug = state.overloadSuggestions || {};
  const exercises = getExercises(state);
  const liftSummary = exercises.filter(e => !e.isPlank).map(ex => {
    const wt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    const s = sug[ex.id];
    return `  ${ex.name}: ${wt}${unit}${s ? ` [${s === 'increase' ? '↑ ready' : s === 'repeat' ? '= repeat' : '↓ deload'}]` : ''}`;
  }).join('\n');

  // Actual performance, not just the current working weight.
  //
  // This block used to be one line per lift — weight plus a one-word flag the
  // app had already computed — so the model was asked for progressive-overload
  // advice while being shown none of the inputs overload is derived from. It
  // could only paraphrase the flag. Reps, RPE and set completion across the
  // last few sessions are what distinguish "add weight" from "you missed reps
  // twice running, hold".
  const liftHistory = exercises.filter(e => !e.isPlank).map(ex => {
    const perfs = getRecentPerformances(state, ex.id, 3);
    if (perfs.length === 0) return `  ${ex.name}: no logged sessions yet`;

    const lines = perfs.map(pf => {
      const reps = pf.repsPerSet.length > 0 ? pf.repsPerSet.join('/') : '—';
      const wt = convertWeight(pf.maxWeight, unit);
      const missed = pf.setsPrescribed > 0 && pf.setsCompleted < pf.setsPrescribed
        ? ` MISSED ${pf.setsPrescribed - pf.setsCompleted} set(s)`
        : '';
      return `Wk${pf.week ?? '?'}: ${wt}${unit} × ${reps} reps`
        + `${pf.maxRPE > 0 ? ` @RPE${pf.maxRPE}` : ''}${missed}`;
    });

    const e1rm = sessionEstimated1RM(perfs[0]);
    const trend = getStrengthTrend(perfs);
    // Labelled for what it actually measures. An athlete grinding the same
    // weight for fewer reps at a higher RPE can still show a "rising" Epley
    // estimate, so calling this a bare "trend" would overstate it — the reps,
    // RPE and missed-set data on the lines above are what qualify it.
    const tail = [
      e1rm != null ? `est1RM ~${convertWeight(e1rm, unit)}${unit}` : null,
      trend ? `est1RM trend ${trend}` : null,
    ].filter(Boolean).join(', ');

    return `  ${ex.name} (newest first): ${lines.join(' | ')}${tail ? ` — ${tail}` : ''}`;
  }).join('\n');

  const statusLine = `${name} | Lv ${state.level} | ${weekLabel} | ${phase.name} | Streak: ${state.streak}d`
    + ` | Last 7 days: ${sessionsInLastDays(state, 7)} sessions (target ${state.sessionsPerWeek || 3}/wk)`
    + ` | This program week: ${weekSessions}/${state.sessionsPerWeek || 3}`;

  if (mode === 'pep' || mode === 'analysis' || mode === 'overload') {
    const DAY_ORD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = DAY_ORD[new Date().getDay()];
    const todayTemplate = state.dayTemplates?.[todayKey];
    const todayPlan = todayTemplate
      ? `TODAY'S WORKOUT (${todayKey.toUpperCase()} — ${todayTemplate.title || 'Session'}):\n` +
        (todayTemplate.exercises || []).map(ex => {
          const wt = ex.isBodyweight ? 'bodyweight' : `${convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg ?? 0, unit)}${unit}`;
          return `  ${ex.name}: ${ex.sets}×${ex.reps} @ ${wt}`;
        }).join('\n')
      : 'No workout scheduled today (rest day or no program set).';
    return `${base}
STATUS: ${statusLine}
CURRENT WORKING WEIGHTS:\n${liftSummary}
RECENT PERFORMANCE (last 3 logged sessions per lift):\n${liftHistory}
NOTE: est1RM is an Epley estimate from logged weight and reps, not a tested max — never prescribe directly from it. It can rise while the athlete is actually stalling, so weigh it against missed sets and rising RPE, which are the stronger signals.
${todayPlan}`;
  }

  // checkin — weight trend, training stats, and the same body data physique
  // gets. This branch used to send weight alone, so the model could not compute
  // a BMI and asked the user to log a height they had entered at onboarding and
  // which was sitting in state the whole time.
  const checkins = state.weeklyCheckins || [];
  const last = checkins[checkins.length - 1];
  const prev = checkins.length > 1 ? checkins[checkins.length - 2] : null;
  const weightTrend = last
    ? `${last.weight}${unit}${prev ? `, prev: ${prev.weight}${unit}, Δ${(last.weight - prev.weight).toFixed(1)}${unit}` : ''}`
    : 'No check-ins yet';

  return `${base}
STATUS: ${statusLine}
BODY DATA:
${formatBodyData(state, unit)}
BODY WEIGHT: ${weightTrend}
CHECK-IN HISTORY: ${formatCheckinTrend(state, unit, 8)}
TRAINING: ${state.totalSessions} sessions total | ${state.perfectWeeks} perfect weeks
Do not ask for data that appears above — if a figure is present, use it.`;
}

function buildUserPrompt(mode, state, userMessage) {
  const phase = getPhase(state.currentWeek);
  const goalDesc = GOAL_DESC[state.assessment?.goal] || 'general fitness';
  const sug = state.overloadSuggestions || {};
  const unit = state.unit;
  const todayDone = state.todayExDone || [];
  const details = state.todayExDetails || {};

  switch (mode) {
    case 'pep': {
      const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;
      const increases = Object.entries(sug).filter(([,v]) => v === 'increase').map(([k]) => {
        const exercises = getExercises(state);
        const ex = exercises.find(e => e.id === k);
        const wt = convertWeight((state.liftWeights?.[k] ?? 0) + 2.5, unit);
        return ex ? `${ex.name} → ${wt}${unit}` : k;
      });
      const userName = state.name || 'Athlete';
      return `Pre-workout pep talk for Week ${state.currentWeek}, Session ${weekSessions + 1}/${state.sessionsPerWeek || 3}. Streak: ${state.streak} days.
${increases.length > 0 ? `Weight increases today: ${increases.join(', ')}` : 'Maintaining current weights.'}
${userMessage ? `${userName}'s note: "${userMessage}"` : ''}
Be specific and energetic.`;
    }

    case 'analysis': {
      // Fall back to most recent session log if todayExDone already cleared
      const recentLog = (state.log || [])
        .filter(e => e.type === 'session' && e.exerciseDetails && Object.keys(e.exerciseDetails).length > 0)
        .at(-1);
      const activeDone = todayDone.length > 0 ? todayDone : (recentLog?.exercisesDone || []);
      const activeDetails2 = todayDone.length > 0 ? details : (recentLog?.exerciseDetails || {});
      const sessionDateLabel = recentLog && todayDone.length === 0
        ? ` (${recentLog.dateStr || recentLog.date})` : '';

      if (activeDone.length === 0) {
        const DAY_ORD2 = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayKey2 = DAY_ORD2[new Date().getDay()];
        const tmpl = state.dayTemplates?.[todayKey2];
        const planStr = tmpl
          ? `Today's plan (${tmpl.title || todayKey2}):\n` +
            (tmpl.exercises || []).map(ex => {
              const wt = ex.isBodyweight ? 'bodyweight' : `${convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg ?? 0, unit)}${unit}`;
              return `  ${ex.name}: ${ex.sets}×${ex.reps} @ ${wt}`;
            }).join('\n')
          : 'No program set for today.';
        return `${state.name || 'Athlete'} hasn't started today (Week ${state.currentWeek}).\n${planStr}\n${userMessage ? `They said: "${userMessage}"\n` : ''}Give specific advice about today's workout — weights to use, cues, what to focus on.`;
      }
      const summary = activeDone.map(id => {
        const exercises = getExercises(state);
        const ex = exercises.find(e => e.id === id);
        const det = activeDetails2[id];
        if (!det || !ex) return `  ${id}: done`;
        const compliance = det.setsCompleted >= det.setsPrescribed ? 'completed as programmed' : `only ${det.setsCompleted} of ${det.setsPrescribed} prescribed sets`;
        const rpeStr = det.maxRPE > 0 ? `, RPE ${det.maxRPE}` : '';
        const wtStr = det.maxWeight > 0 ? `, ${convertWeight(det.maxWeight, unit)}${unit}` : '';
        return `  ${ex.name}: ${compliance}${wtStr}${rpeStr}`;
      }).join('\n');
      const missed = getExercises(state).filter(e => !activeDone.includes(e.id)).map(e => e.name);
      return `Post-session analysis Week ${state.currentWeek}${sessionDateLabel}:
Note: set counts vary per exercise by program design (compounds are 3 sets, accessories are 2 sets — this is intentional).
${summary}
${missed.length > 0 ? `Skipped: ${missed.join(', ')}` : 'All exercises done!'}
${userMessage ? `Note: "${userMessage}"` : ''}
What went well, what to watch, what it means for next session. Do not reference raw volume numbers.`;
    }

    case 'overload': {
      if (Object.keys(sug).length === 0) {
        return `Week ${state.currentWeek}, ${phase.name}: ${phase.desc}. Explain progressive overload approach and RPE targets for this phase.`;
      }
      const fmt = (arr) => arr.map(([k]) => {
        const ex = getExercises(state).find(e => e.id === k);
        const cur = convertWeight(state.liftWeights?.[k] ?? 0, unit);
        const next = convertWeight((state.liftWeights?.[k] ?? 0) + 2.5, unit);
        return ex ? `  ${ex.name}: ${cur} → ${next}${unit}` : k;
      }).join('\n');
      const increases = Object.entries(sug).filter(([,v]) => v === 'increase');
      const repeats = Object.entries(sug).filter(([,v]) => v === 'repeat');
      const deloads = Object.entries(sug).filter(([,v]) => v === 'deload');
      return `Overload plan Week ${state.currentWeek}, ${phase.name}:
Increase: ${increases.length ? '\n' + fmt(increases) : 'none'}
Repeat: ${repeats.length ? repeats.map(([k]) => getExercises(state).find(e=>e.id===k)?.name||k).join(', ') : 'none'}
Deload: ${deloads.length ? deloads.map(([k]) => getExercises(state).find(e=>e.id===k)?.name||k).join(', ') : 'none'}
${userMessage ? `Question: "${userMessage}"` : ''}
Explain the strategy concisely.`;
    }

    case 'form': {
      const exercises = getExercises(state);
      const exId = userMessage?.toLowerCase();
      const matched = exercises.find(e =>
        e.name.toLowerCase().includes(exId || '') || e.id === exId
      );
      if (matched) {
        return `Form coaching for ${matched.name}. My weight: ${convertWeight(state.liftWeights?.[matched.id] ?? matched.startKg, unit)}${unit}. Target: RPE ${matched.rpe}, ${matched.reps} reps × ${matched.sets} sets.
Cover: setup, key cues, most common mistakes, one immediate improvement.`;
      }
      return `${state.name || 'Athlete'} wants form tips${userMessage ? ` on: "${userMessage}"` : ''}. Available: ${getExercises(state).map(e=>e.name).join(', ')}. Ask which exercise, then give coaching.`;
    }

    case 'checkin': {
      const checkins = state.weeklyCheckins || [];
      if (checkins.length === 0) {
        return `No Sunday check-ins yet (Week ${state.currentWeek}). Explain check-in purpose and what metrics matter for ${goalDesc}. Motivate first check-in.`;
      }
      const trend = checkins.slice(-4).map(c => `  Wk ${c.week}: ${c.weight}${unit}${c.waist > 0 ? `, waist ${c.waist}cm` : ''}`).join('\n');
      return `Analyze progress toward ${goalDesc}:
${trend}
Sessions: ${state.totalSessions} | Perfect weeks: ${state.perfectWeeks} | ${cyclePosition(state.currentWeek)} | Streak: ${state.streak}d
${userMessage ? `Question: "${userMessage}"` : ''}
Analyze the weight trend against that goal. Are the trends appropriate? What should they focus on?`;
    }

    case 'build':
      return userMessage || 'Help me set up my training program.';

    case 'physique': {
      const checkins = state.weeklyCheckins || [];
      if (checkins.length === 0 && !getHeightCm(state)) {
        return `${state.name || 'Athlete'} has no check-in data yet. Ask them to log their first Sunday check-in (weight + waist), explain why those metrics matter for physique analysis, and tell them what you'll be able to recommend once you have data.`;
      }
      return userMessage || 'Analyze my physique data and recommend what I should focus on — recomp, fat loss, muscle, or strength.';
    }

    default:
      return userMessage || 'General coaching advice for my program.';
  }
}

const COOLDOWN_MS = 8000; // 8s between API calls
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache

function getCached(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { text, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { sessionStorage.removeItem(key); return null; }
    return text;
  } catch { return null; }
}

function setCached(key, text) {
  try { sessionStorage.setItem(key, JSON.stringify({ text, ts: Date.now() })); } catch {}
}

// ── Agent Inbox ──────────────────────────────────────────────────────────────
function AgentInbox({ messages, onMarkAllRead }) {
  if (!messages || messages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
        <div className="fq-hex" aria-hidden="true" style={{
          width: 64, height: 72, margin: '0 auto 14px',
          background: 'rgba(179,136,255,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Inbox size={28} color="var(--color-accent-purple)" /></div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', color: '#fff' }}>NO MESSAGES YET</div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6, color: 'var(--text2)' }}>
          Quest will message you automatically after workouts, milestones, and on Mondays.
        </div>
      </div>
    );
  }

  const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread = sorted.filter(m => !m.read).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: 'var(--color-accent-purple)' }}>
          QUEST INBOX{unread > 0 ? ` · ${unread} NEW` : ''}
        </div>
        {unread > 0 && (
          <button onClick={onMarkAllRead} style={{
            minHeight: 36, padding: '0 12px',
            border: '1px solid rgba(0,229,255,0.35)', background: 'rgba(0,229,255,0.06)', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
            cursor: 'pointer',
          }}>MARK ALL READ</button>
        )}
      </div>
      {sorted.map(msg => {
        const escaped = (msg.message || '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const formatted = escaped
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        const accent = msg.read ? 'rgba(255,255,255,0.12)' : 'var(--color-accent-purple)';
        return (
          <div key={msg.id} className="fq-rise" style={{
            marginBottom: 12, opacity: msg.read ? 0.65 : 1, transition: 'opacity 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="fq-hex" aria-hidden="true" style={{
                width: 24, height: 27, flexShrink: 0, fontSize: 13,
                background: msg.read ? 'rgba(255,255,255,0.06)' : 'rgba(179,136,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{msg.emoji || <Sparkles size={13} color="var(--color-accent-purple)" />}</span>
              <span style={{
                flex: 1, minWidth: 0,
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800,
                color: msg.read ? 'var(--text3)' : 'var(--color-accent-purple)', letterSpacing: '0.18em',
                textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>[ {msg.trigger?.replace(/_/g, ' ') || 'QUEST'} ]</span>
              {!msg.read && (
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 900, letterSpacing: '0.14em',
                  padding: '2px 6px', background: 'var(--cyan)', color: '#05070f',
                  boxShadow: '0 0 10px rgba(0,229,255,0.5)',
                }}>NEW</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
            </div>
            <div style={{
              padding: '12px 14px',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              background: '#121a36', boxShadow: `inset 0 0 0 1px ${msg.read ? 'rgba(255,255,255,0.08)' : 'rgba(179,136,255,0.35)'}`,
              borderTop: `2px solid ${accent}`,
              fontSize: 14, color: '#d5d9f0', lineHeight: 1.65,
            }} dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
          </div>
        );
      })}
    </div>
  );
}

export default function AICoachTab({ state, onSaveHistory, onSaveProgram, unreadAgentCount, onMarkAgentRead, onOpenInbox, agentMessages, isOpen, onClose, userId, onQuestMessageSent }) {
  const [activeMode, setActiveMode] = useState('pep');
  const [showInbox, setShowInbox] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState(() => state.aiCoachHistory || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [copyLabel, setCopyLabel] = useState('COPY FOR AI');

  function handleCopyReport() {
    const text = formatForCoach(state);
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel('COPIED!');
      setTimeout(() => setCopyLabel('COPY FOR AI'), 2000);
    }).catch(() => {
      // fallback for browsers that block clipboard
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyLabel('COPIED!');
      setTimeout(() => setCopyLabel('COPY FOR AI'), 2000);
    });
  }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastSendRef = useRef({ prompt: '', ts: 0 });
  // Refs for modal-mode scroll management
  const modalScrollRef = useRef(null);
  const modalMsgCountRef = useRef(messages.length);

  // Warn on mount if API key is not configured
  useEffect(() => {
    fetch('/api/coach', { method: 'GET' })
      .then(r => { if (r.status === 500) setApiKeyMissing(true); })
      .catch(() => {});
  }, []);

  // Tick down the cooldown counter
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  // When the modal opens, scroll to the top so mode selectors are visible,
  // and reset the message counter so the arrival-scroll doesn't fire immediately.
  useEffect(() => {
    if (isOpen && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalMsgCountRef.current = messages.length;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages.
  // In modal mode: scroll the modal container directly (prevents outer page scroll).
  // In standalone tab mode: use scrollIntoView as before.
  useEffect(() => {
    if (isOpen && onClose && modalScrollRef.current) {
      if (messages.length > modalMsgCountRef.current) {
        modalMsgCountRef.current = messages.length;
        const el = modalScrollRef.current;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const mode = COACH_MODES.find(m => m.id === activeMode);

  async function sendMessage(overrideMessage) {
    if (loading) return;
    if (cooldownLeft > 0) return;

    const text = (overrideMessage ?? userMessage).trim();
    const systemPrompt = buildSystemPrompt(state, activeMode);
    const isBuildMode = activeMode === 'build';

    const priorModeAIResponses = messages.filter(m => m.mode === activeMode && m.role === 'assistant');
    const isFollowUp = ONE_SHOT_MODES.includes(activeMode) && priorModeAIResponses.length > 0 && text.length > 0;

    const userPrompt = isFollowUp ? text : buildUserPrompt(activeMode, state, text);

    if (userPrompt === lastSendRef.current.prompt && Date.now() - lastSendRef.current.ts < 5000) return;
    lastSendRef.current = { prompt: userPrompt, ts: Date.now() };

    const cacheKey = `fq-ai-${activeMode}-wk${state.currentWeek}-s${state.weekProgress?.[state.currentWeek]?.count || 0}-${text ? text.slice(0, 80) : userPrompt.slice(0, 80)}`;
    if (!isFollowUp && !isBuildMode) {
      const cached = getCached(cacheKey);
      if (cached) {
        const newMessages = [
          ...messages,
          { role: 'user', content: userPrompt, mode: activeMode, displayText: text || mode.label, ts: Date.now() },
          { role: 'assistant', content: cached, mode: activeMode, ts: Date.now() }
        ];
        setMessages(newMessages);
        setUserMessage('');
        onSaveHistory(newMessages.slice(-20));
        return;
      }
    }

    const newMessages = [
      ...messages,
      { role: 'user', content: userPrompt, mode: activeMode, displayText: text || mode.label, ts: Date.now() }
    ];
    setMessages(newMessages);
    setUserMessage('');
    setLoading(true);
    setError(null);

    const modeHistory = (ONE_SHOT_MODES.includes(activeMode) && !isFollowUp)
      ? [{ role: 'user', content: userPrompt }]
      : newMessages
          .filter(m => m.mode === activeMode && (m.role === 'user' || m.role === 'assistant'))
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));

    try {
      const requestBody = {
        model: 'claude-haiku-4-5',
        max_tokens: isBuildMode ? 4000 : 500,
        system: systemPrompt,
        messages: modeHistory,
      };
      if (isBuildMode) {
        requestBody.tools = [SAVE_PROGRAM_TOOL];
        requestBody.tool_choice = { type: 'auto' };
      }

      const response = await authPostJSON('/api/coach', requestBody);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = response.status === 429
          ? (errData.error || 'Too many requests — wait a moment and try again.')
          : response.status === 401
          ? 'Session expired — please refresh the page.'
          : (errData.error || `API error: ${response.status}`);
        throw new Error(msg);
      }
      const data = await response.json();

      // The server increments the weekly quest quota on its own copy of the
      // state; mirror it locally so the client's next auto-save agrees instead
      // of writing a stale count back.
      onQuestMessageSent?.();

      // ── Handle tool_use (Program Builder) — supports multiple days in one response ──
      const toolCalls = (data.content || []).filter(b => b.type === 'tool_use' && b.name === 'save_day_program');
      if (toolCalls.length > 0) {
        const textPart = data.content?.find(b => b.type === 'text')?.text || '';
        // Show one preview card with all days — user confirms before anything is saved
        const finalMessages = [
          ...newMessages,
          {
            role: 'assistant',
            type: 'program_preview',
            toolInputs: toolCalls.map(t => t.input),
            content: textPart,
            mode: activeMode,
            ts: Date.now(),
          },
        ];
        setMessages(finalMessages);
        onSaveHistory(finalMessages.slice(-20));
        setCooldownLeft(Math.ceil(COOLDOWN_MS / 1000));
        return;
      }

      // ── Normal text response ──
      const assistantText = data.content?.find(b => b.type === 'text')?.text || 'No response';
      if (!isBuildMode) setCached(cacheKey, assistantText);

      const finalMessages = [
        ...newMessages,
        { role: 'assistant', content: assistantText, mode: activeMode, ts: Date.now() }
      ];
      setMessages(finalMessages);
      onSaveHistory(finalMessages.slice(-20));
      setCooldownLeft(Math.ceil(COOLDOWN_MS / 1000));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmProgramSave(msg) {
    if (!onSaveProgram || !msg) return;
    const inputs = msg.toolInputs || (msg.toolInput ? [msg.toolInput] : []);
    if (!inputs.length) return;
    const updated = { ...(state.dayTemplates || {}) };
    for (const { day, title, sessionMinutes, exercises } of inputs) {
      if (day) updated[day] = { title: title || '', sessionMinutes: sessionMinutes || 75, exercises: exercises || [] };
    }
    onSaveProgram(updated);
    setMessages(prev => prev.map(m =>
      m === msg ? { ...m, type: 'program_saved' } : m
    ));
  }

  function clearHistory() {
    setMessages([]);
    onSaveHistory([]);
  }

  const modeMessages = messages.filter(m => m.mode === activeMode);

  const headerSection = (
    <div className="fq-cut" style={{
      background: 'linear-gradient(160deg, #141b36, #0c1226)',
      border: '1px solid rgba(179,136,255,0.28)',
      '--fq-cut-border': 'rgba(179,136,255,0.28)',
      padding: '14px 16px', marginBottom: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <div className="fq-hex" aria-hidden="true" style={{
          width: 38, height: 42, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-accent-purple), var(--color-action))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Sparkles size={18} color="#05070f" strokeWidth={2.4} /></div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
            AI COACH
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-success)' }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} />
            Powered by Claude · Knows your data
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => {
              const opening = !showInbox;
              setShowInbox(opening);
              if (opening) {
                if (onOpenInbox) onOpenInbox();
                if (onMarkAgentRead) setTimeout(onMarkAgentRead, 1000);
              }
            }}
            title="Quest inbox — proactive messages from your agent"
            style={{
              position: 'relative', padding: '4px 10px', minHeight: 36,
              border: showInbox ? '1px solid rgba(179,136,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: showInbox ? 'rgba(179,136,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: showInbox ? 'var(--purple)' : 'var(--text3)',
              fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
            }}>
            <Inbox size={13} aria-hidden="true" /> INBOX
            {unreadAgentCount > 0 && (
              <span style={{
                background: 'var(--red)', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadAgentCount > 9 ? '9+' : unreadAgentCount}</span>
            )}
          </button>
          <button onClick={handleCopyReport} title="Copy a human-readable training report to paste into any AI coach" style={{
            padding: '4px 10px', minHeight: 36,
            border: `1px solid ${copyLabel === 'COPIED!' ? 'rgba(0,230,118,0.4)' : 'rgba(0,229,255,0.25)'}`,
            background: copyLabel === 'COPIED!' ? 'rgba(0,230,118,0.1)' : 'rgba(0,229,255,0.06)',
            color: copyLabel === 'COPIED!' ? 'var(--green)' : 'var(--cyan)',
            fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s'
          }}>{copyLabel}</button>
          {messages.length > 0 && (
            <button onClick={clearHistory} style={{
              padding: '4px 10px', minHeight: 36,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-display)',
              fontWeight: 700, cursor: 'pointer'
            }}>CLEAR</button>
          )}
        </div>
      </div>
      <div role="group" aria-label="Coach mode" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 10 }}>
        {COACH_MODES.map(m => {
          const on = activeMode === m.id;
          const ModeIcon = m.icon;
          return (
            <button key={m.id} onClick={() => setActiveMode(m.id)} aria-pressed={on} className="fq-press" style={{
              padding: '6px 10px', minHeight: 44, cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${on ? m.color : 'rgba(255,255,255,0.08)'}`,
              background: on ? m.bg : 'rgba(5,7,15,0.4)',
              boxShadow: on ? `0 0 14px ${m.border}, inset 0 0 0 1px ${m.border}` : 'none',
              color: on ? m.color : 'var(--text2)',
              fontFamily: 'var(--font-primary)', fontSize: 13, fontWeight: 700,
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
            }}>
              <span aria-hidden="true" style={{
                width: 24, height: 27, flexShrink: 0,
                clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                background: on ? m.color : m.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ModeIcon size={13} strokeWidth={2.4} color={on ? '#05070f' : m.color} />
              </span>
              <span style={{ minWidth: 0, lineHeight: 1.2 }}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const messagesSection = (
    <div style={{ marginBottom: 14 }}>
      {modeMessages.length === 0 && (
        <ModePrompt mode={COACH_MODES.find(m => m.id === activeMode)} state={state} />
      )}
      {modeMessages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} onConfirmProgram={confirmProgramSave} />
      ))}
      {loading && <ThinkingBubble />}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 10,
          background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)',
          fontSize: 12, color: 'var(--red)'
        }}>
          Error: {error}. Make sure your API key is configured.
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const inputSection = (
    <div style={{
      background: 'rgba(14,20,40,0.92)', border: '1px solid rgba(179,136,255,0.22)',
      padding: 14, backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--font-primary)', lineHeight: 1.5 }}>
        {getInputHint(activeMode)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={userMessage}
          onChange={e => setUserMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={getPlaceholder(activeMode)}
          style={{
            flex: 1, minWidth: 0, height: 48,
            border: '1px solid rgba(179,136,255,0.3)',
            background: '#05070f',
            color: 'var(--text)', fontFamily: 'var(--font-primary)',
            fontSize: 14, fontWeight: 600, padding: '0 12px'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || cooldownLeft > 0}
          aria-label={loading ? 'Sending' : cooldownLeft > 0 ? `Wait ${cooldownLeft} seconds` : 'Send'}
          style={{
            width: 48, height: 48, border: 'none',
            background: (loading || cooldownLeft > 0) ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${mode.color}, var(--color-action))`,
            boxShadow: (loading || cooldownLeft > 0) ? 'none' : `0 0 16px ${mode.color}66`,
            color: (loading || cooldownLeft > 0) ? 'var(--text3)' : 'var(--bg)',
            fontSize: cooldownLeft > 0 ? 11 : 18,
            fontFamily: 'var(--font-display)', fontWeight: 700,
            cursor: (loading || cooldownLeft > 0) ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0
          }}
        >
          {loading
            ? <Loader2 size={18} style={{ animation: 'fqSpin 1s linear infinite' }} aria-hidden="true" />
            : cooldownLeft > 0 ? `${cooldownLeft}s` : <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
        </button>
      </div>
      <div style={{
        display: 'flex', gap: 6, marginTop: 8,
        overflowX: 'auto', flexWrap: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        paddingBottom: 2,
      }}>
        {getQuickPrompts(activeMode).map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} style={{
            padding: '6px 12px', minHeight: 36, flexShrink: 0,
            border: '1px solid rgba(179,136,255,0.35)',
            background: 'transparent',
            color: '#c5b3ff', fontSize: 12, fontFamily: 'var(--font-primary)',
            fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}>{q}</button>
        ))}
      </div>
    </div>
  );

  // Modal overlay mode (when triggered from TrainTab)
  if (isOpen && onClose) {
    return createPortal(
      <div
        className="fq-sheet-backdrop"
        onClick={onClose}
        style={{
          zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <div
          className="fq-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="AI Coach"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, rgba(14,20,42,0.98), rgba(7,10,20,0.98))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(179,136,255,0.25)',
            borderBottom: 'none',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overscrollBehavior: 'contain',
          }}
        >
          {/* Drag handle + close — never scrolls.
              The handle was laid out with space-between against the close
              button, which parked it against the left edge instead of centring
              it. It is now positioned independently of the button. */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '12px 16px 0', flexShrink: 0,
          }}>
            <div
              className="fq-sheet__handle"
              style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)',
              }}
            />
            <button
              onClick={onClose}
              aria-label="Close AI Coach"
              style={{
                width: 44, height: 44, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Single scrollable area: header + messages + sticky input */}
          <div
            ref={modalScrollRef}
            style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}
          >
            <div style={{ padding: '12px 16px 0' }}>
              {headerSection}
              {apiKeyMissing && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12, marginBottom: 14,
                  background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)',
                  fontSize: 12, color: 'var(--gold)', lineHeight: 1.6,
                }}>
                  <strong>API key not configured.</strong> Add <code>ANTHROPIC_API_KEY</code> to your Vercel environment variables and redeploy.
                </div>
              )}
            </div>

            <div style={{
              padding: '0 16px',
              // The inbox has no sticky input beneath it, so without this its
              // last message sat under the home indicator.
              paddingBottom: showInbox ? 'calc(var(--safe-area-bottom) + 16px)' : 0,
            }}>
              {showInbox
                ? <AgentInbox messages={agentMessages || []} onMarkAllRead={onMarkAgentRead} />
                : messagesSection
              }
            </div>

            {/* Input — sticky to bottom of scroll container */}
            {!showInbox && (
              <div style={{
                position: 'sticky', bottom: 0,
                padding: '8px 16px',
                paddingBottom: 'calc(var(--safe-area-bottom) + 16px)',
                background: 'linear-gradient(180deg, rgba(7,10,20,0), rgba(7,10,20,0.97) 20%)',
              }}>
                {inputSection}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {headerSection}
      {apiKeyMissing && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 14,
          background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)',
          fontSize: 12, color: 'var(--gold)', lineHeight: 1.6
        }}>
          <strong>API key not configured.</strong> Add <code>ANTHROPIC_API_KEY</code> to your Vercel environment variables and redeploy.
        </div>
      )}
      {showInbox
        ? <AgentInbox messages={agentMessages || []} onMarkAllRead={onMarkAgentRead} />
        : <>{messagesSection}{inputSection}</>
      }
    </div>
  );
}

function ModePrompt({ mode, state }) {
  return (
    <div className="fq-cut" style={{
      padding: '22px 16px', textAlign: 'center',
      background: `linear-gradient(160deg, ${mode.bg}, rgba(12,18,38,0.9))`,
      border: `1px solid ${mode.border}`, '--fq-cut-border': mode.border,
      marginBottom: 14
    }}>
      <div className="fq-hex" aria-hidden="true" style={{
        width: 56, height: 62, margin: '0 auto 12px',
        background: mode.bg, boxShadow: `inset 0 0 0 1px ${mode.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><mode.icon size={26} color={mode.color} strokeWidth={2} /></div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, letterSpacing: '0.16em', color: mode.color, marginBottom: 8 }}>
        {mode.label.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
        {getModeDescription(mode.id, state)}
      </div>
    </div>
  );
}

function ExerciseList({ exercises }) {
  return (
    <div style={{ padding: '6px 0' }}>
      {exercises.map((ex, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <div aria-hidden="true" style={{
            width: 22, height: 25, flexShrink: 0,
            clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            background: 'rgba(0,229,255,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 900, color: 'var(--cyan)',
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflowWrap: 'anywhere' }}>{ex.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {ex.isBodyweight ? 'BW' : `${ex.startKg ?? 0}kg`}
              {' · '}{ex.sets}×{ex.repMin && ex.repMax && ex.repMin !== ex.repMax ? `${ex.repMin}–${ex.repMax}` : ex.reps}
              {' · '}{ex.restSec >= 60 ? `${Math.round(ex.restSec / 60)}min` : `${ex.restSec}s`}
              {' · '}RPE {ex.rpe}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgramPreviewBubble({ msg, onConfirm }) {
  const { content } = msg;
  const isSaved = msg.type === 'program_saved';
  // Support both new multi-day (toolInputs[]) and legacy single-day (toolInput)
  const inputs = msg.toolInputs || (msg.toolInput ? [msg.toolInput] : []);
  const totalExercises = inputs.reduce((n, t) => n + (t.exercises?.length || 0), 0);
  const isMultiDay = inputs.length > 1;
  const accent = isSaved ? 'var(--green)' : 'var(--cyan)';
  const accentLine = isSaved ? 'rgba(0,230,118,0.45)' : 'rgba(0,229,255,0.4)';

  return (
    <div className="fq-rise" style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.24em',
        color: 'var(--color-accent-purple)',
      }}>[ SYSTEM ] PROGRAM BUILDER</div>
      {content ? (
        <div style={{
          padding: '12px 14px', marginBottom: 10,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          background: '#121a36', boxShadow: 'inset 0 0 0 1px rgba(179,136,255,0.3)',
          fontSize: 14, color: '#d5d9f0', lineHeight: 1.65,
        }}>{content}</div>
      ) : null}
      <div className="fq-cut" style={{
        overflow: 'hidden',
        border: `1px solid ${accentLine}`, '--fq-cut-border': accentLine,
        background: isSaved ? 'linear-gradient(160deg, rgba(0,230,118,0.08), #0c1226)' : 'linear-gradient(160deg, #141b36, #0c1226)',
        boxShadow: isSaved ? 'none' : 'inset 0 0 30px rgba(0,229,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="fq-hex" aria-hidden="true" style={{
            width: 30, height: 34, flexShrink: 0,
            background: isSaved ? 'var(--green)' : 'rgba(0,229,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSaved
              ? <Check size={16} strokeWidth={3} color="#05070f" />
              : <CalendarRange size={16} color="var(--cyan)" />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 900, color: accent, letterSpacing: '0.14em' }}>
              {isSaved
                ? 'PROGRAM SAVED'
                : `${isMultiDay ? `${inputs.length}-DAY` : (DAY_FULL[inputs[0]?.day] || inputs[0]?.day || '?').toUpperCase()} PROGRAM PROPOSAL`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {isSaved
                ? inputs.map(t => DAY_FULL[t.day] || t.day || '').join(' · ')
                : `${totalExercises} exercise${totalExercises === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>

        {/* Day sections */}
        {inputs.map((t, di) => {
          const dayLabel = DAY_FULL[t.day] || t.day || '?';
          return (
            <div key={di}>
              {isMultiDay && (
                <div style={{
                  padding: '10px 14px 4px',
                  borderTop: di > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 900, color: accent, letterSpacing: '0.2em' }}>
                    {dayLabel.toUpperCase()}
                  </div>
                  {t.title && <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'right' }}>{t.title}</div>}
                </div>
              )}
              {!isMultiDay && t.title && (
                <div style={{ padding: '8px 14px 0', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{t.title}</div>
              )}
              <ExerciseList exercises={t.exercises || []} />
            </div>
          );
        })}

        {!isSaved && (
          <div style={{ padding: '12px 14px 14px' }}>
            <button onClick={() => onConfirm(msg)} className="fq-press fq-skew" style={{
              width: '100%', minHeight: 50, border: 'none',
              background: 'linear-gradient(90deg, var(--cyan), #00b8d4)',
              boxShadow: '0 0 22px rgba(0,229,255,0.4)',
              color: '#05070f', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 900,
              cursor: 'pointer', letterSpacing: '0.14em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Check size={15} strokeWidth={3} aria-hidden="true" />
              {isMultiDay ? `SAVE ALL ${inputs.length} DAYS TO MY PROGRAM` : 'SAVE TO MY PROGRAM'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, onConfirmProgram }) {
  if (msg.type === 'program_preview' || msg.type === 'program_saved') {
    return <ProgramPreviewBubble msg={msg} onConfirm={onConfirmProgram} />;
  }
  const isUser = msg.role === 'user';
  const mode = COACH_MODES.find(m => m.id === msg.mode);

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div className="fq-rise" style={{
          maxWidth: '78%', padding: '10px 14px',
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.08))',
          boxShadow: 'inset 0 0 0 1px rgba(0,229,255,0.4)',
          fontSize: 14, color: '#fff', lineHeight: 1.5
        }}>
          {msg.displayText || msg.content}
        </div>
      </div>
    );
  }

  const escaped = msg.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const formatted = escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  return (
    <div className="fq-rise" style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.24em',
        color: mode?.color || 'var(--color-accent-purple)',
      }}>
        {mode?.icon && <mode.icon size={12} strokeWidth={2.6} aria-hidden="true" />} [ SYSTEM ]
      </div>
      <div style={{
        padding: '12px 14px',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
        background: '#121a36', boxShadow: 'inset 0 0 0 1px rgba(179,136,255,0.3)',
        fontSize: 14, color: '#d5d9f0', lineHeight: 1.65,
      }}
        dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div role="status" aria-label="Coach is thinking" style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.24em',
        color: 'var(--color-accent-purple)', marginBottom: 6,
      }}>[ SYSTEM ] ANALYZING</div>
      <div style={{
        display: 'inline-block', padding: '12px 16px',
        background: '#121a36', boxShadow: 'inset 0 0 0 1px rgba(179,136,255,0.25)',
      }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} style={{
              width: 7, height: 7, background: 'var(--color-accent-purple)',
              animation: `shimmer 1.2s ${d}s infinite`
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function getInputHint(modeId) {
  switch (modeId) {
    case 'pep':      return 'Optional: add a note (feeling tired? had a bad week?) or just hit →';
    case 'analysis': return 'Optional: add context about today\'s session';
    case 'overload': return 'Optional: ask a specific question about progression';
    case 'form':     return 'Type an exercise name for detailed cues';
    case 'checkin':  return 'Optional: ask a specific question about your progress';
    case 'build':    return 'Describe the session you want — the AI will design and save it';
    case 'physique': return 'Optional: ask something specific, or just hit → for a full analysis';
    default:         return 'Ask your coach';
  }
}

function getPlaceholder(modeId) {
  switch (modeId) {
    case 'pep':      return 'Feeling a bit tired today...';
    case 'analysis': return 'My squat felt heavy today...';
    case 'overload': return 'Should I add 2.5kg to everything?';
    case 'form':     return 'squat  (or bench, rdl, etc.)';
    case 'checkin':  return 'Am I on track for my goal?';
    case 'build':    return 'e.g. Build me a Monday push session';
    case 'physique': return 'Should I focus on fat loss or muscle?';
    default:         return 'Ask anything...';
  }
}

function getQuickPrompts(modeId) {
  switch (modeId) {
    case 'pep':      return ['Fire me up!', 'I\'m feeling strong', 'Rough day, help'];
    case 'analysis': return ['How\'d I do?', 'What to focus on next?'];
    case 'overload': return ['What increases next?', 'Explain the logic', 'Am I progressing well?'];
    case 'form':     return ['Squat', 'Bench', 'RDL', 'Lat Pulldown', 'OHP', 'Leg Curl'];
    case 'checkin':  return ['Am I on track?', 'Weight trend ok?', 'Halfway check'];
    case 'build':    return ['Build my Monday push session', 'Set up Wednesday pull day', 'Add lateral raises to Friday', 'Design a full body day'];
    case 'physique': return ['Analyze my physique', 'Should I cut or bulk?', 'Am I recomping?', 'What does my BMI say?'];
    default:         return [];
  }
}

function getModeDescription(modeId, state) {
  const week = state.currentWeek;
  const sessions = state.totalSessions;
  switch (modeId) {
    case 'pep':      return `Hit the button below to get a fired-up pre-workout pep talk tailored to Week ${week} and your current progress. Or add a note about how you're feeling.`;
    case 'analysis': return `Get an AI breakdown of today's session. Works best after completing some exercises. ${sessions === 0 ? 'Complete your first workout to unlock full analysis.' : `You've done ${sessions} sessions total.`}`;
    case 'overload': return 'Get your exact progressive overload plan for next session, based on your RPE data. Shows which lifts to increase, repeat, or back off.';
    case 'form':     return 'Ask for form tips on any exercise: Squat, Bench, RDL, Lat Pulldown, OHP, Leg Curl, or Plank. Type the exercise name or hit a quick button.';
    case 'checkin':  return `Review your progress across ${state.weeklyCheckins?.length || 0} check-ins. Get an honest assessment of your weight trend and what it means.`;
    case 'build':    return 'Tell the AI what kind of session you want and it will design a full exercise program for that day — sets, reps, rest, RPE — then show you a preview to confirm before saving.';
    case 'physique': return `Get an honest, data-driven assessment of your body composition. Based on your weight trend, BMI, and waist measurements, the AI will tell you whether you should focus on recomp, fat loss, muscle building, or strength — with specific reasoning. ${state.weeklyCheckins?.length ? `You have ${state.weeklyCheckins.length} check-in(s) to analyze.` : 'Log your first Sunday check-in to unlock full analysis.'}`;
    default:         return 'Ask your coach anything.';
  }
}
