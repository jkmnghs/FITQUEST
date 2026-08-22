import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon } from 'lucide-react';
import { EXERCISES } from '../data/gameData';
import { getPhase, convertWeight } from '../utils/gameLogic';
import { formatForCoach } from '../utils/coachExport';
import { EX_CATALOG } from '../data/exerciseCatalog';
import { filterCatalogForEquipment, EQUIPMENT_DESC } from '../utils/programGenerator';
import { authPostJSON } from '../lib/authFetch';

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
  { id: 'pep',      icon: '⚡', label: 'Pre-Workout',    color: 'var(--fire2)',   bg: 'rgba(255,109,0,0.08)',   border: 'rgba(255,109,0,0.2)' },
  { id: 'analysis', icon: '📊', label: 'Post-Session',   color: 'var(--cyan)',    bg: 'var(--cyan-glow)',       border: 'rgba(0,229,255,0.2)' },
  { id: 'overload', icon: '📈', label: 'Overload Plan',  color: 'var(--green)',   bg: 'var(--green-glow)',      border: 'rgba(0,230,118,0.2)' },
  { id: 'form',     icon: '🎯', label: 'Form Tips',      color: 'var(--purple)',  bg: 'var(--purple-glow)',     border: 'rgba(179,136,255,0.2)' },
  { id: 'checkin',  icon: '📋', label: 'Check-in Review',color: 'var(--gold)',    bg: 'var(--gold-glow)',       border: 'rgba(255,214,0,0.2)' },
  { id: 'build',    icon: '🗓️', label: 'Program Builder', color: '#b3ff5e',       bg: 'rgba(179,255,94,0.07)', border: 'rgba(179,255,94,0.25)' },
  { id: 'physique', icon: '🔬', label: 'Physique Analysis', color: '#ff6f91',     bg: 'rgba(255,111,145,0.07)', border: 'rgba(255,111,145,0.25)' },
];

// One-shot modes don't benefit from conversation history — each call is independent
const ONE_SHOT_MODES = ['pep', 'analysis', 'overload', 'form'];

// Mode-specific system prompts — only send data relevant to each mode
function buildSystemPrompt(state, mode) {
  const phase = getPhase(state.currentWeek);
  const unit = state.unit;
  const name = state.name || 'Athlete';
  const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;

  const base = `You are Coach AI for FitQuest — a hyper-personalized fitness coach for ${name}'s 12-week body recomposition program.
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
STATS: Lv ${state.level} | Wk ${state.currentWeek} | ${state.totalSessions} sessions | ${state.assessment?.level || 'intermediate'} | Goal: ${state.assessment?.goal || 'recomp'}

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
    const checkins = state.weeklyCheckins || [];
    const lastCheckin = checkins[checkins.length - 1];
    const currentWeight = lastCheckin?.weight || 0;
    const height = state.assessment?.height || 0;
    const waist = lastCheckin?.waist || 0;
    const bmi = (height > 0 && currentWeight > 0)
      ? (currentWeight / Math.pow(height / 100, 2)).toFixed(1)
      : null;
    const whr = (height > 0 && waist > 0) ? (waist / height).toFixed(2) : null;
    const weightTrend = checkins.slice(-8)
      .map(c => `Wk${c.week}: ${c.weight}${unit}${c.waist > 0 ? ` w${c.waist}cm` : ''}`)
      .join(', ') || 'No check-ins yet';
    const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;
    return `${base}
You are ${name}'s physique analyst. Objectively assess body composition data and recommend the optimal training focus: recomp, fat loss, muscle building, or strength. Be direct and data-driven.

BODY DATA:
- Current weight: ${currentWeight > 0 ? currentWeight + unit : 'not set'}
- Height: ${height > 0 ? height + 'cm' : 'not set'}
- BMI: ${bmi || 'n/a'}${bmi ? (bmi < 18.5 ? ' (underweight)' : bmi < 25 ? ' (normal)' : bmi < 30 ? ' (overweight)' : ' (obese)') : ''}
- Waist: ${waist > 0 ? waist + 'cm' : 'not measured'}
${whr ? `- Waist-to-height ratio: ${whr} (healthy <0.50, elevated risk >0.55)` : ''}
- Stated goal: ${state.assessment?.goal || 'not set'}
- Training level: ${state.assessment?.level || 'intermediate'}

WEIGHT TREND (last 8 check-ins): ${weightTrend}
TRAINING: ${state.totalSessions} sessions total | ${state.perfectWeeks} perfect weeks | ${weekSessions}/${state.sessionsPerWeek || 3} this week | Streak: ${state.streak}d

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
PHASE: Week ${state.currentWeek}/12 — ${phase.name}: ${phase.desc}`;
  }

  const sug = state.overloadSuggestions || {};
  const exercises = getExercises(state);
  const liftSummary = exercises.filter(e => !e.isPlank).map(ex => {
    const wt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    const s = sug[ex.id];
    return `  ${ex.name}: ${wt}${unit}${s ? ` [${s === 'increase' ? '↑ ready' : s === 'repeat' ? '= repeat' : '↓ deload'}]` : ''}`;
  }).join('\n');

  const statusLine = `${name} | Lv ${state.level} | Wk ${state.currentWeek}/12 | ${phase.name} | Streak: ${state.streak}d | Sessions this week: ${weekSessions}/${state.sessionsPerWeek || 3}`;

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
LIFTS:\n${liftSummary}
${todayPlan}`;
  }

  // checkin — needs weight trend + training stats
  const checkins = state.weeklyCheckins || [];
  const last = checkins[checkins.length - 1];
  const prev = checkins.length > 1 ? checkins[checkins.length - 2] : null;
  const weightTrend = last
    ? `${last.weight}${unit}${prev ? `, prev: ${prev.weight}${unit}, Δ${(last.weight - prev.weight).toFixed(1)}${unit}` : ''}`
    : 'No check-ins yet';

  return `${base}
STATUS: ${statusLine}
BODY WEIGHT: ${weightTrend}
TRAINING: ${state.totalSessions} sessions total | ${state.perfectWeeks} perfect weeks`;
}

function buildUserPrompt(mode, state, userMessage) {
  const phase = getPhase(state.currentWeek);
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
        return `No Sunday check-ins yet (Week ${state.currentWeek}). Explain check-in purpose and what metrics matter for recomp. Motivate first check-in.`;
      }
      const trend = checkins.slice(-4).map(c => `  Wk ${c.week}: ${c.weight}${unit}${c.waist > 0 ? `, waist ${c.waist}cm` : ''}`).join('\n');
      return `Analyze recomp progress:
${trend}
Sessions: ${state.totalSessions} | Perfect weeks: ${state.perfectWeeks} | Week ${state.currentWeek}/12 | Streak: ${state.streak}d
${userMessage ? `Question: "${userMessage}"` : ''}
Analyze weight trend for recomposition. Are trends appropriate? What to focus on?`;
    }

    case 'build':
      return userMessage || 'Help me set up my training program.';

    case 'physique': {
      const checkins = state.weeklyCheckins || [];
      if (checkins.length === 0 && !state.assessment?.height) {
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 1 }}>NO MESSAGES YET</div>
        <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          Quest will message you automatically after workouts, milestones, and on Mondays.
        </div>
      </div>
    );
  }

  const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      {sorted.some(m => !m.read) && (
        <button onClick={onMarkAllRead} style={{
          width: '100%', padding: '8px', borderRadius: 10, border: 'none',
          background: 'rgba(0,229,255,0.06)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          cursor: 'pointer', marginBottom: 12,
        }}>MARK ALL READ</button>
      )}
      {sorted.map(msg => {
        const escaped = (msg.message || '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const formatted = escaped
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <div key={msg.id} style={{
            display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start',
            opacity: msg.read ? 0.6 : 1, transition: 'opacity 0.3s',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: msg.read ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,255,0.08)',
              border: msg.read ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,229,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{msg.emoji || '🤖'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                  color: msg.read ? 'var(--text3)' : 'var(--cyan)', letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>{msg.trigger?.replace(/_/g, ' ') || 'QUEST'}{!msg.read && <span style={{ marginLeft: 6, color: 'var(--cyan)' }}>● NEW</span>}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
              <div style={{
                padding: '10px 12px', borderRadius: '4px 12px 12px 12px',
                background: 'var(--card)', border: '1px solid var(--card-border)',
                fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
                backdropFilter: 'blur(20px)',
              }} dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
            </div>
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
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
      border: '1px solid rgba(0,229,255,0.12)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>🤖</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>
            AI COACH
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
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
              position: 'relative', padding: '4px 10px', borderRadius: 8,
              border: showInbox ? '1px solid rgba(179,136,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: showInbox ? 'rgba(179,136,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: showInbox ? 'var(--purple)' : 'var(--text3)',
              fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
            }}>
            📬 INBOX
            {unreadAgentCount > 0 && (
              <span style={{
                background: 'var(--red)', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadAgentCount > 9 ? '9+' : unreadAgentCount}</span>
            )}
          </button>
          <button onClick={handleCopyReport} title="Copy a human-readable training report to paste into any AI coach" style={{
            padding: '4px 10px', borderRadius: 8,
            border: `1px solid ${copyLabel === 'COPIED!' ? 'rgba(0,230,118,0.4)' : 'rgba(0,229,255,0.25)'}`,
            background: copyLabel === 'COPIED!' ? 'rgba(0,230,118,0.1)' : 'rgba(0,229,255,0.06)',
            color: copyLabel === 'COPIED!' ? 'var(--green)' : 'var(--cyan)',
            fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s'
          }}>{copyLabel}</button>
          {messages.length > 0 && (
            <button onClick={clearHistory} style={{
              padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-display)',
              fontWeight: 700, cursor: 'pointer'
            }}>CLEAR</button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {COACH_MODES.map(m => (
          <button key={m.id} onClick={() => setActiveMode(m.id)} style={{
            padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${activeMode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`,
            background: activeMode === m.id ? m.bg : 'transparent',
            color: activeMode === m.id ? m.color : 'var(--text3)',
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
            letterSpacing: 0.3, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 5
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
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
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 14, padding: 14, backdropFilter: 'blur(20px)'
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
            flex: 1, height: 42, borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text)', fontFamily: 'var(--font-primary)',
            fontSize: 14, fontWeight: 600, padding: '0 12px'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || cooldownLeft > 0}
          style={{
            width: 42, height: 42, borderRadius: 10, border: 'none',
            background: (loading || cooldownLeft > 0) ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${mode.color}, ${mode.color}cc)`,
            color: (loading || cooldownLeft > 0) ? 'var(--text3)' : 'var(--bg)',
            fontSize: cooldownLeft > 0 ? 11 : 18,
            fontFamily: 'var(--font-display)', fontWeight: 700,
            cursor: (loading || cooldownLeft > 0) ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0
          }}
        >
          {loading ? '⏳' : cooldownLeft > 0 ? `${cooldownLeft}s` : '→'}
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
            padding: '4px 10px', borderRadius: 8, flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-primary)',
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
            background: 'rgba(15,21,40,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.06)',
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
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--color-text-tertiary)',
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
                background: 'rgba(15,21,40,0.96)',
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
    <div style={{
      padding: '20px 16px', textAlign: 'center',
      background: mode.bg, border: `1px solid ${mode.border}`,
      borderRadius: 14, marginBottom: 14
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{mode.icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: mode.color, marginBottom: 6 }}>
        {mode.label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
        {getModeDescription(mode.id, state)}
      </div>
    </div>
  );
}

function ExerciseList({ exercises }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {exercises.map((ex, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px',
          borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text3)',
          }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{ex.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
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

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'rgba(179,255,94,0.08)', border: '1px solid rgba(179,255,94,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>🗓️</div>
      <div style={{ flex: 1 }}>
        {content ? (
          <div style={{
            padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
            background: 'var(--card)', border: '1px solid var(--card-border)',
            fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
            marginBottom: 10, backdropFilter: 'blur(20px)',
          }}>{content}</div>
        ) : null}
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: isSaved ? '1px solid rgba(0,230,118,0.4)' : '1px solid rgba(179,255,94,0.3)',
          background: isSaved ? 'rgba(0,230,118,0.06)' : 'rgba(179,255,94,0.05)',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: isSaved ? 'var(--green)' : '#b3ff5e', letterSpacing: 1 }}>
              {isSaved
                ? `✓ SAVED — ${inputs.map(t => (DAY_FULL[t.day] || t.day || '').toUpperCase()).join(' · ')}`
                : `${isMultiDay ? `${inputs.length}-DAY` : (DAY_FULL[inputs[0]?.day] || inputs[0]?.day || '?').toUpperCase()} PROGRAM PROPOSAL`}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text3)' }}>{totalExercises} exercises</div>
          </div>

          {/* Day sections */}
          {inputs.map((t, di) => {
            const dayLabel = DAY_FULL[t.day] || t.day || '?';
            return (
              <div key={di}>
                {isMultiDay && (
                  <div style={{
                    padding: '8px 14px 4px',
                    borderTop: di > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: '#b3ff5e', letterSpacing: 1 }}>
                      {dayLabel.toUpperCase()}
                    </div>
                    {t.title && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t.title}</div>}
                  </div>
                )}
                {!isMultiDay && t.title && (
                  <div style={{ padding: '4px 14px 0', fontSize: 11, color: 'var(--text3)' }}>{t.title}</div>
                )}
                <ExerciseList exercises={t.exercises || []} />
              </div>
            );
          })}

          {!isSaved && (
            <div style={{ padding: '10px 14px' }}>
              <button onClick={() => onConfirm(msg)} style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #b3ff5e, #69e04a)',
                color: '#0a1a0a', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', letterSpacing: 1,
              }}>
                {isMultiDay ? `✓ SAVE ALL ${inputs.length} DAYS TO MY PROGRAM` : '✓ SAVE TO MY PROGRAM'}
              </button>
            </div>
          )}
        </div>
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
        <div style={{
          maxWidth: '75%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.15)',
          fontSize: 13, color: 'var(--text)', lineHeight: 1.5
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
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: mode?.bg || 'var(--cyan-glow)',
        border: `1px solid ${mode?.border || 'rgba(0,229,255,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16
      }}>{mode?.icon || '🤖'}</div>
      <div style={{
        flex: 1, padding: '12px 14px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--card)', border: '1px solid var(--card-border)',
        fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
        backdropFilter: 'blur(20px)'
      }}
        dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'var(--cyan-glow)', border: '1px solid rgba(0,229,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
      }}>🤖</div>
      <div style={{
        padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--card)', border: '1px solid var(--card-border)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)',
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
    case 'checkin':  return 'Am I on track for recomp?';
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
    case 'checkin':  return ['Am I recomping?', 'Weight trend ok?', 'Halfway check'];
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
    case 'checkin':  return `Review your body recomposition progress across ${state.weeklyCheckins?.length || 0} check-ins. Get an honest assessment of your weight trend and what it means.`;
    case 'build':    return 'Tell the AI what kind of session you want and it will design a full exercise program for that day — sets, reps, rest, RPE — then show you a preview to confirm before saving.';
    case 'physique': return `Get an honest, data-driven assessment of your body composition. Based on your weight trend, BMI, and waist measurements, the AI will tell you whether you should focus on recomp, fat loss, muscle building, or strength — with specific reasoning. ${state.weeklyCheckins?.length ? `You have ${state.weeklyCheckins.length} check-in(s) to analyze.` : 'Log your first Sunday check-in to unlock full analysis.'}`;
    default:         return 'Ask your coach anything.';
  }
}
