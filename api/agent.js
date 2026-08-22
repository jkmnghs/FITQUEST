/**
 * Quest Agent — POST /api/agent
 *
 * The proactive AI agent. Receives a trigger event, reads user state,
 * reasons with Claude using tools, and writes back to Supabase.
 *
 * Trigger payload:
 *   { trigger: 'post_workout' | 'reengagement' | 'pr_milestone' | 'onboarding' | 'weekly_review', userId }
 *
 * Protected by AGENT_SECRET header (set same value in n8n + Vercel env).
 */

import { createClient } from '@supabase/supabase-js';
import { PROGRAMS, getProgramById, buildInitialWeights } from './_programs.js';

// ── Rate limiting: max 10 agent calls per user per hour (in-memory) ──
const agentRateLimitMap = new Map();
const AGENT_RATE_WINDOW_MS = 3600_000;
const AGENT_RATE_MAX = 10;

function checkAgentRateLimit(userId) {
  const now = Date.now();
  const entry = agentRateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > AGENT_RATE_WINDOW_MS) {
    agentRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= AGENT_RATE_MAX;
}

// ── Request body validation ──
function validateAgentRequest(body) {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object';
  if (typeof body.trigger !== 'string' || !body.trigger.trim()) return 'trigger must be a non-empty string';
  if (typeof body.userId !== 'string' || !body.userId.trim()) return 'userId must be a non-empty string';
  // UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.userId)) return 'userId must be a valid UUID';
  return null;
}

// ── Supabase admin client (service role — bypasses RLS) ─────────────────────
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

// ── Tool definitions — what Claude can call ──────────────────────────────────
const AGENT_TOOLS = [
  {
    name: 'get_user_state',
    description: 'Read the full current state for a user from Supabase.',
    input_schema: {
      type: 'object',
      properties: { userId: { type: 'string', description: 'Supabase user UUID' } },
      required: ['userId'],
    },
  },
  {
    name: 'add_episodic_note',
    description: 'Save a coaching observation or insight to the user\'s episodic memory. Use this to record patterns, plateaus, breakthroughs, or injury notes that future coaching should consider.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        note: { type: 'string', description: 'Concise coaching note (max 200 chars)' },
        category: { type: 'string', enum: ['plateau', 'progress', 'injury', 'motivation', 'nutrition', 'general'] },
      },
      required: ['userId', 'note', 'category'],
    },
  },
  {
    name: 'send_coach_message',
    description: 'Push a proactive message into the user\'s Quest inbox. They will see it as a notification bubble and in the Coach tab.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        message: { type: 'string', description: 'The message to display to the user (markdown supported, max 400 chars)' },
        trigger: { type: 'string', description: 'The trigger type that caused this message' },
        emoji: { type: 'string', description: 'Single emoji for the message bubble (optional)' },
      },
      required: ['userId', 'message', 'trigger'],
    },
  },
  {
    name: 'adjust_nutrition',
    description: 'Update the user\'s macro targets. Use when body weight trend or training load warrants a calorie/macro adjustment.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        calories: { type: 'number', description: 'New daily calorie target' },
        protein: { type: 'number', description: 'New daily protein target in grams' },
        carbs: { type: 'number', description: 'New daily carbs target in grams' },
        fat: { type: 'number', description: 'New daily fat target in grams' },
        reason: { type: 'string', description: 'Why the adjustment was made (shown to user)' },
      },
      required: ['userId', 'calories', 'protein', 'reason'],
    },
  },
  {
    name: 'suggest_deload',
    description: 'Flag the user for a deload week by sending a message and setting a flag in their state. Use when detecting overtraining signals (RPE consistently 9-10, volume dropping, missed sessions).',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        reason: { type: 'string', description: 'Clinical reasoning for the deload recommendation' },
      },
      required: ['userId', 'reason'],
    },
  },
  {
    name: 'update_lift_weight',
    description: 'Adjust a specific lift\'s working weight up or down. Use conservatively — only when a clear plateau or excessive RPE is detected over multiple sessions.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        exerciseId: { type: 'string', description: 'The exercise id from the user\'s activeExercises (e.g. squat, db_bench, db_goblet — use exact id from get_user_state result)' },
        newWeightKg: { type: 'number', description: 'New working weight in kg' },
        reason: { type: 'string' },
      },
      required: ['userId', 'exerciseId', 'newWeightKg', 'reason'],
    },
  },
  {
    name: 'switch_program',
    description: 'Propose a program switch for the user. This creates a pending switch that requires user confirmation — the switch is NOT applied immediately. The user will see a confirmation dialog. Only use at phase boundaries (week 4, 8, 12) unless user explicitly requests. Available programs: fullbody_3x, fullbody_2x, fullbody_4x, dumbbell_only_3x, dumbbell_3x, dumbbell_4x, bodyweight_3x.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        newProgramId: { type: 'string', enum: ['fullbody_3x', 'fullbody_2x', 'fullbody_4x', 'dumbbell_only_3x', 'dumbbell_3x', 'dumbbell_4x', 'bodyweight_3x'] },
        reason: { type: 'string', description: 'Coaching reasoning shown to the user' },
      },
      required: ['userId', 'newProgramId', 'reason'],
    },
  },
];

/**
 * Patch only the keys this agent owns into user_profiles.state.
 *
 * A full `.update({ state })` would overwrite whatever the browser has written
 * since we read the row — the shallow-merge RPC leaves the client's keys alone.
 */
async function mergeState(supabase, userId, patch) {
  const { error } = await supabase.rpc('admin_merge_user_state', {
    p_user_id: userId,
    p_patch: patch,
  });
  if (error) throw new Error(`state merge failed: ${error.message}`);
}

// ── Tool execution ───────────────────────────────────────────────────────────
async function executeTool(toolName, input, supabase, agentLog) {
  agentLog.push({ tool: toolName, input, timestamp: new Date().toISOString() });

  switch (toolName) {
    case 'get_user_state': {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (error || !data) return { error: 'User not found' };
      return { state: data.state };
    }

    case 'add_episodic_note': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const note = {
        id: `ep_${Date.now()}`,
        note: input.note,
        category: input.category,
        source: 'agent',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const aiEpisodic = [...(state.aiEpisodic || []), note];
      await mergeState(supabase, input.userId, { aiEpisodic });
      return { ok: true, noteId: note.id };
    }

    case 'send_coach_message': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const msg = {
        id: `agent_${Date.now()}`,
        message: input.message,
        trigger: input.trigger,
        emoji: input.emoji || '🤖',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), msg]; // keep last 50
      await mergeState(supabase, input.userId, { agentMessages });
      return { ok: true, messageId: msg.id };
    }

    case 'adjust_nutrition': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const nutritionGoals = {
        ...state.nutritionGoals,
        calories: Math.round(input.calories),
        protein: Math.round(input.protein),
        ...(input.carbs != null ? { carbs: Math.round(input.carbs) } : {}),
        ...(input.fat != null ? { fat: Math.round(input.fat) } : {}),
      };
      // Also send a coach message about the change
      const nutritionMsg = {
        id: `agent_nut_${Date.now()}`,
        message: `**Nutrition targets updated** — ${input.reason}\n\nNew targets: ${nutritionGoals.calories} kcal · ${nutritionGoals.protein}g protein${nutritionGoals.carbs ? ` · ${nutritionGoals.carbs}g carbs` : ''}${nutritionGoals.fat ? ` · ${nutritionGoals.fat}g fat` : ''}`,
        trigger: 'nutrition_adjustment',
        emoji: '🥗',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), nutritionMsg];
      await mergeState(supabase, input.userId, { nutritionGoals, agentMessages });
      return { ok: true, newGoals: nutritionGoals };
    }

    case 'suggest_deload': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const deloadMsg = {
        id: `agent_dl_${Date.now()}`,
        message: `**Deload recommendation** — ${input.reason}\n\nNext session: drop to 80% weight, 2 sets per exercise. Your body needs recovery to grow.`,
        trigger: 'deload_suggestion',
        emoji: '🧘',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), deloadMsg];
      await mergeState(supabase, input.userId, { agentMessages, agentDeloadSuggested: true });
      return { ok: true };
    }

    case 'switch_program': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const newProgram = getProgramById(input.newProgramId);
      if (!newProgram) return { error: `Unknown program: ${input.newProgramId}` };

      // Store as pending switch — requires user confirmation (Phase 4.7)
      const switchMsg = {
        id: `agent_sw_${Date.now()}`,
        message: `**Program switch suggested: ${newProgram.name}** — ${input.reason}\n\n_This change requires your confirmation. Check your settings to review and accept._`,
        trigger: 'program_switch_proposal',
        emoji: '🔄',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), switchMsg];

      // Add episodic note about the switch proposal
      const switchNote = {
        id: `ep_sw_${Date.now()}`,
        note: `Proposed switch to ${newProgram.id}: ${input.reason}`,
        category: 'general',
        source: 'agent',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const aiEpisodic = [...(state.aiEpisodic || []), switchNote];

      await mergeState(supabase, input.userId, {
        agentMessages,
        aiEpisodic,
        pendingProgramSwitch: {
          newProgramId: input.newProgramId,
          reason: input.reason,
          proposedAt: new Date().toISOString(),
        },
      });
      return { ok: true, pending: true, newProgram: newProgram.id, message: 'Switch proposed — awaiting user confirmation' };
    }

    case 'update_lift_weight': {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', input.userId)
        .single();
      if (!data) return { error: 'User not found' };
      const state = data.state || {};
      const liftWeights = { ...state.liftWeights, [input.exerciseId]: input.newWeightKg };
      // Log the change
      const weightMsg = {
        id: `agent_wt_${Date.now()}`,
        message: `**Weight adjusted** — ${input.exerciseId} set to ${input.newWeightKg}kg\n${input.reason}`,
        trigger: 'weight_adjustment',
        emoji: '⚖️',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), weightMsg];
      await mergeState(supabase, input.userId, { liftWeights, agentMessages });
      return { ok: true, newWeight: input.newWeightKg };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Build context payload for Claude based on trigger ───────────────────────
function buildTriggerContext(trigger, state, userId) {
  const name = state.name || 'Athlete';
  const week = state.currentWeek || 1;
  const sessions = state.totalSessions || 0;
  const streak = state.streak || 0;
  const wp = state.weekProgress?.[week] || {};
  const checkins = state.weeklyCheckins || [];
  const sug = state.overloadSuggestions || {};
  const prs = state.personalRecords || {};
  const unit = state.unit || 'kg';
  const sessionsPerWeek = state.sessionsPerWeek || 3;
  const lastCheckin = checkins[checkins.length - 1];
  const prevCheckin = checkins.length > 1 ? checkins[checkins.length - 2] : null;

  const liftSummary = Object.entries(state.liftWeights || {})
    .map(([id, kg]) => `${id}: ${kg}${unit}`)
    .join(', ');

  const exerciseIds = (state.activeExercises || [])
    .filter(e => !e.isPlank)
    .map(e => e.id)
    .join(', ') || 'squat, bench, rdl, pulldown, ohp, legcurl';

  const overloadSummary = Object.entries(sug)
    .map(([id, v]) => `${id}: ${v}`)
    .join(', ') || 'none';

  const recentPRs = Object.entries(prs)
    .filter(([, pr]) => {
      const prDate = new Date(pr.date || 0);
      return (Date.now() - prDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
    })
    .map(([id, pr]) => `${id}: ${pr.weight}${unit} (${pr.date})`);

  const weightTrend = checkins.slice(-4)
    .map(c => `Wk${c.week}: ${c.weight}${unit}`)
    .join(' → ');

  // Phase 5.3: Enhanced coach context with new data
  const lifestyle = state.lifestyle || {};
  const motivation = state.motivation || {};
  const painRegions = state.assessment?.painRegions || {};
  const dietary = state.dietary || {};
  const recentRecovery = (state.recoveryScores || []).slice(-7)
    .map(r => `${r.date}: sleep=${r.sleep} body=${r.bodyFeel} energy=${r.energy}`)
    .join(', ');
  const episodicMemory = (state.aiEpisodic || []).slice(-5)
    .map(e => `[${e.category}] ${e.note}`)
    .join(' | ');

  // Overtraining status
  const weeklySessions = wp.count || 0;
  const otStatus = weeklySessions > sessionsPerWeek + 2 ? 'BLOCKED'
    : weeklySessions > sessionsPerWeek + 1 ? 'WARNING'
    : weeklySessions > sessionsPerWeek ? 'CAUTION' : 'OK';

  const painSummary = Object.entries(painRegions)
    .filter(([, v]) => v !== 'none')
    .map(([region, sev]) => `${region}:${sev}`)
    .join(', ') || 'none';

  const baseContext = `
USER_ID: ${userId}
USER: ${name} | Wk ${week}/12 | Lv ${state.level || 1} | Streak: ${streak}d | Total sessions: ${sessions}
PROGRAM: ${state.programId || 'unknown'} | EXERCISE IDs (use these for update_lift_weight): ${exerciseIds}
LIFTS: ${liftSummary}
OVERLOAD Status: ${overloadSummary}
WEIGHT TREND: ${weightTrend || 'no check-ins yet'}
SESSIONS this week: ${wp.count || 0}/${sessionsPerWeek}
OVERTRAINING STATUS: ${otStatus}
LIFESTYLE: activity=${lifestyle.dailyActivity || 'unknown'} sleep=${lifestyle.sleepHours || 'unknown'} stress=${lifestyle.stressLevel || 'unknown'}
MOTIVATION: primary=${motivation.primaryMotivation || 'unknown'} quit_history=${motivation.previousQuitReason || 'none'}
PAIN REGIONS: ${painSummary}
DIETARY: restrictions=${(dietary.restrictions || []).join(',') || 'none'} tracking=${dietary.trackingExperience || 'unknown'}
RECENT RECOVERY (last 7d): ${recentRecovery || 'none logged'}
EPISODIC MEMORY (last 5): ${episodicMemory || 'none'}
`.trim();

  const contextByTrigger = {
    post_workout: `
${baseContext}
TRIGGER: User just completed a workout session.
RECENT PRs: ${recentPRs.length > 0 ? recentPRs.join(', ') : 'none this week'}
TODAY COMPLETED: ${(state.todayExDone || []).join(', ') || 'unknown'}
GOAL: Analyze the session. Celebrate wins, flag concerns, give 1 specific actionable tip for next session.`.trim(),

    reengagement: `
${baseContext}
TRIGGER: User has been absent for 3+ days with no logged session.
LAST SESSION: ${state.lastDate || 'never'}
GOAL: Re-engage without guilt. Acknowledge the break, make returning feel easy and exciting. Keep it to 2-3 sentences.`.trim(),

    pr_milestone: `
${baseContext}
TRIGGER: User just hit a new personal record.
NEW PRs: ${recentPRs.join(', ') || 'unknown lift'}
GOAL: Celebrate with specific context — mention the lift, put the number in context of their journey. 2-3 sentences max, high energy.`.trim(),

    onboarding: `
TRIGGER: User just completed onboarding assessment.
USER_ID: ${userId}
NAME: ${name}
GOAL: ${state.assessment?.goal || 'unknown'}
LEVEL: ${state.assessment?.level || 'unknown'}
EQUIPMENT: ${state.assessment?.equipment || 'unknown'}
DAYS/WEEK: ${state.assessment?.daysPerWeek || 3}
TRAINING DAYS: ${(state.trainingDays || []).join(', ')}
PROGRAM SELECTED: ${state.programId || 'unknown'}
INJURIES: ${state.assessment?.injuries || 'none'}
BODY STATS: Age ${state.assessment?.age}, ${state.assessment?.sex}, ${state.assessment?.weightKg}${unit}, ${state.assessment?.heightCm}cm
BMI: ${state.bmi?.toFixed(1) || 'unknown'} (${state.bmiCategory || 'unknown'})
NUTRITION GOALS: ${state.nutritionGoals?.calories || 0} kcal, ${state.nutritionGoals?.protein || 0}g protein
LIFTS: ${liftSummary}

GOAL: Write a warm, personal welcome. Confirm their program choice with 1-sentence reasoning. Mention their first training day. Tell them what Quest will do for them proactively. Max 4 sentences.`.trim(),

    weekly_review: `
${baseContext}
TRIGGER: Weekly Monday review.
WEEK JUST COMPLETED: ${week > 1 ? week - 1 : 'N/A'}
SESSIONS COMPLETED: ${wp.count || 0}/${sessionsPerWeek} (${wp.completed ? 'PERFECT WEEK' : 'incomplete'})
WEIGHT CHANGE: ${lastCheckin && prevCheckin ? `${(lastCheckin.weight - prevCheckin.weight).toFixed(1)}${unit}` : 'no data'}
RPE TREND: ${Object.entries(state.weeklyRPE || {}).slice(-2).map(([w, r]) => `Wk${w}: RPE ${r}`).join(' → ') || 'no data'}
PERFECT WEEKS: ${state.perfectWeeks || 0}

GOAL: Brief Monday morning prep message. Reference what happened last week (good or not), frame this week clearly, give 1 specific focus. 3-4 sentences. Be a coach, not a cheerleader.`.trim(),
  };

  return contextByTrigger[trigger] || baseContext;
}

// ── Agent system prompt ──────────────────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are Quest — a proactive AI fitness coach embedded in FitQuest.

You have tools to read user data and take real actions on their behalf. You are NOT just answering a question — you are making coaching decisions and executing them.

DECISION FRAMEWORK:
1. Call get_user_state first if you need more data
2. Analyze the situation — detect patterns, not just snapshots
3. Choose the MINIMUM effective intervention:
   - A well-timed message beats unnecessary weight changes
   - Only adjust nutrition/weights when data clearly supports it
   - Leave episodic notes when you observe genuinely useful patterns
4. Always send a coach message — that is your primary output
5. Log an episodic note if you detected something worth remembering

STYLE: Direct, specific, personal. Use their name. Reference actual numbers. Max 3 sentences per message. No generic motivational fluff.

CRITICAL — userId RULES:
- Every tool call requires a userId parameter
- ALWAYS use the exact UUID from USER_ID in the context (e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
- NEVER use the user's name, username, or any other string as userId
- The user's name is for the message text only

CAUTION:
- Never reduce weights without clear overtraining signals (RPE consistently ≥9 across 2+ sessions, or session dropoff)
- Never increase calories by more than 100 kcal per adjustment
- Never decrease calories by more than 150 kcal per adjustment
- One major action per trigger (don't overwhelm the user)

PROGRAM SWITCHING — use switch_program when you detect:
- User's current program doesn't match their equipment (e.g. on dumbbell_only but mentions barbell/machines)
- User has been consistently hitting RPE 10 across all lifts for 3+ sessions at beginner level → suggest progression to intermediate program
- User mentions they now have gym/home access in episodic notes
- Frequency mismatch: user consistently misses sessions because program has too many days
Always send a coach message explaining the switch. Never switch more than once per weekly_review cycle.`;

export const VALID_TRIGGERS = ['post_workout', 'reengagement', 'pr_milestone', 'onboarding', 'weekly_review'];

/**
 * Runs one agent turn for a user. Shared by the secret-gated cron handler below
 * and by api/agent-trigger.js, which authenticates the browser with its Supabase
 * access token instead — so AGENT_SECRET never has to reach the client.
 *
 * Returns { status, body } for the caller to send.
 */
export async function runAgent(trigger, userId) {
  if (!VALID_TRIGGERS.includes(trigger)) {
    return { status: 400, body: { error: `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}` } };
  }

  // ── Rate limiting: max 10 agent calls per user per hour ──
  if (!checkAgentRateLimit(userId)) {
    return { status: 429, body: { error: 'Agent rate limit exceeded. Max 10 calls per hour.' } };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return { status: 500, body: { error: 'ANTHROPIC_API_KEY not set' } };

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return { status: 500, body: { error: e.message } }; }

  const agentLog = [];
  const startTime = new Date().toISOString();
  console.log(`[Quest Agent] ${startTime} | trigger=${trigger} | userId=${userId}`);

  try {
    // --- Step 1: fetch initial state ---
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();

    const userState = profileData?.state || {};
    const context = buildTriggerContext(trigger, userState, userId);

    // --- Step 2: Agentic loop (max 5 tool calls) ---
    const messages = [{ role: 'user', content: context }];
    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          system: AGENT_SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errText}`);
      }

      const claudeResp = await response.json();

      // Add assistant response to message history
      messages.push({ role: 'assistant', content: claudeResp.content });

      // Check if Claude wants to use tools
      const toolUseBlocks = claudeResp.content.filter(b => b.type === 'tool_use');

      if (toolUseBlocks.length === 0 || claudeResp.stop_reason === 'end_turn') {
        // Done — no more tool calls
        break;
      }

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await executeTool(block.name, block.input, supabase, agentLog);
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      // Add tool results back into the conversation
      messages.push({ role: 'user', content: toolResults });
    }

    // --- Step 3: Log agent run ---
    const endTime = new Date().toISOString();
    const toolsCalled = agentLog.map(l => l.tool);
    console.log(`[Quest Agent] ${endTime} | COMPLETE | trigger=${trigger} | userId=${userId} | tools=${toolsCalled.join(',')} | loops=${loopCount}`);

    await supabase.from('agent_runs').insert({
      user_id: userId,
      trigger,
      tool_calls: agentLog,
      loop_count: loopCount,
      ran_at: startTime,
      completed_at: endTime,
    }).select(); // .select() is a no-op if the table doesn't exist — fails silently

    return {
      status: 200,
      body: {
        ok: true,
        trigger,
        userId,
        toolCallCount: agentLog.length,
        loops: loopCount,
        log: agentLog,
      },
    };

  } catch (err) {
    console.error('[Quest Agent] Error:', err);
    return { status: 500, body: { error: err.message } };
  }
}

// ── Main handler — machine-to-machine (Vercel cron, n8n) ────────────────────
// Browser-initiated triggers go through api/agent-trigger.js instead, which
// authenticates with the user's Supabase token rather than the shared secret.
export default async function handler(req, res) {
  const secret = process.env.AGENT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'AGENT_SECRET is not configured' });
  }
  const provided = req.headers['x-agent-secret'] || req.query?.secret;
  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const validationError = validateAgentRequest(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { trigger, userId } = req.body;
  const { status, body } = await runAgent(trigger, userId);
  return res.status(status).json(body);
}
