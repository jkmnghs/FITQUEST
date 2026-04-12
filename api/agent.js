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
    description: 'Switch the user to a different training program. Use when: equipment changes (e.g. got gym access), frequency needs to change, or level progression warrants it. Always send a coach message explaining why. Available programs: fullbody_3x, fullbody_2x, fullbody_4x, dumbbell_only_3x, dumbbell_3x, dumbbell_4x, bodyweight_3x.',
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
      await supabase
        .from('user_profiles')
        .update({ state: { ...state, aiEpisodic } })
        .eq('id', input.userId);
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
      await supabase
        .from('user_profiles')
        .update({ state: { ...state, agentMessages } })
        .eq('id', input.userId);
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
      await supabase
        .from('user_profiles')
        .update({ state: { ...state, nutritionGoals, agentMessages } })
        .eq('id', input.userId);
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
      await supabase
        .from('user_profiles')
        .update({ state: { ...state, agentMessages, agentDeloadSuggested: true } })
        .eq('id', input.userId);
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

      // Build fresh weights for new exercises; preserve weights for exercises that carry over
      const { liftWeights: freshWeights, liftHistory: freshHistory } = buildInitialWeights(newProgram);
      const mergedWeights = { ...freshWeights, ...state.liftWeights };
      // Only keep history for exercises in the new program
      const mergedHistory = {};
      for (const ex of newProgram.exercises) {
        mergedHistory[ex.id] = state.liftHistory?.[ex.id] || [];
      }

      const switchMsg = {
        id: `agent_sw_${Date.now()}`,
        message: `**Program switched to ${newProgram.name}** — ${input.reason}`,
        trigger: 'program_switch',
        emoji: '🔄',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const agentMessages = [...(state.agentMessages || []).slice(-49), switchMsg];

      await supabase
        .from('user_profiles')
        .update({
          state: {
            ...state,
            programId: newProgram.id,
            activeExercises: newProgram.exercises,
            sessionsPerWeek: newProgram.sessionsPerWeek,
            liftWeights: mergedWeights,
            liftHistory: mergedHistory,
            agentMessages,
            // Flag for client to reload exercises
            programSwitchedAt: new Date().toISOString(),
          },
        })
        .eq('id', input.userId);
      return { ok: true, newProgram: newProgram.id, exercises: newProgram.exercises.map(e => e.id) };
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
      await supabase
        .from('user_profiles')
        .update({ state: { ...state, liftWeights, agentMessages } })
        .eq('id', input.userId);
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

  const baseContext = `
USER_ID: ${userId}
USER: ${name} | Wk ${week}/12 | Lv ${state.level || 1} | Streak: ${streak}d | Total sessions: ${sessions}
PROGRAM: ${state.programId || 'unknown'} | EXERCISE IDs (use these for update_lift_weight): ${exerciseIds}
LIFTS: ${liftSummary}
OVERLOAD Status: ${overloadSummary}
WEIGHT TREND: ${weightTrend || 'no check-ins yet'}
SESSIONS this week: ${wp.count || 0}/${sessionsPerWeek}
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

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth check — all calls (cron or webhook) must include the secret
  const secret = process.env.AGENT_SECRET;
  const provided = req.headers['x-agent-secret'] || req.query?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trigger, userId } = req.body || {};
  if (!trigger || !userId) {
    return res.status(400).json({ error: 'trigger and userId are required' });
  }

  const validTriggers = ['post_workout', 'reengagement', 'pr_milestone', 'onboarding', 'weekly_review'];
  if (!validTriggers.includes(trigger)) {
    return res.status(400).json({ error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const agentLog = [];

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
          model: 'claude-haiku-4-5-20251001',
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
    await supabase.from('agent_runs').insert({
      user_id: userId,
      trigger,
      tool_calls: agentLog,
      loop_count: loopCount,
      ran_at: new Date().toISOString(),
    }).select(); // .select() is a no-op if the table doesn't exist — fails silently

    return res.status(200).json({
      ok: true,
      trigger,
      userId,
      toolCallCount: agentLog.length,
      loops: loopCount,
      log: agentLog,
    });

  } catch (err) {
    console.error('[Quest Agent] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
