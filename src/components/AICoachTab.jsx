import React, { useState, useRef, useEffect } from 'react';
import { EXERCISES } from '../data/gameData';
import { getPhase, convertWeight } from '../utils/gameLogic';

const COACH_MODES = [
  { id: 'pep',      icon: '⚡', label: 'Pre-Workout',    color: 'var(--fire2)',   bg: 'rgba(255,109,0,0.08)',   border: 'rgba(255,109,0,0.2)' },
  { id: 'analysis', icon: '📊', label: 'Post-Session',   color: 'var(--cyan)',    bg: 'var(--cyan-glow)',       border: 'rgba(0,229,255,0.2)' },
  { id: 'overload', icon: '📈', label: 'Overload Plan',  color: 'var(--green)',   bg: 'var(--green-glow)',      border: 'rgba(0,230,118,0.2)' },
  { id: 'form',     icon: '🎯', label: 'Form Tips',      color: 'var(--purple)',  bg: 'var(--purple-glow)',     border: 'rgba(179,136,255,0.2)' },
  { id: 'checkin',  icon: '📋', label: 'Check-in Review',color: 'var(--gold)',    bg: 'var(--gold-glow)',       border: 'rgba(255,214,0,0.2)' },
];

// One-shot modes don't benefit from conversation history — each call is independent
const ONE_SHOT_MODES = ['pep', 'analysis', 'overload', 'form'];

// Mode-specific system prompts — only send data relevant to each mode
function buildSystemPrompt(state, mode) {
  const phase = getPhase(state.currentWeek);
  const unit = state.unit;
  const name = state.name;
  const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;

  const base = `You are Coach AI for FitQuest — a hyper-personalized fitness coach for ${name}'s 12-week body recomposition program.
COACHING STYLE: Direct, energetic, motivating. Use ${name}'s actual numbers — never be generic. Keep responses concise (150-200 words max). Use formatting sparingly.`;

  if (mode === 'form') {
    // Form mode only needs exercise context, not full lift data
    return `${base}
PROGRAM: 3×/week full body — Squat, Bench Press, RDL, Lat Pulldown, OHP, Leg Curl, Plank.
PHASE: Week ${state.currentWeek}/12 — ${phase.name}: ${phase.desc}`;
  }

  const sug = state.overloadSuggestions || {};
  const liftSummary = EXERCISES.filter(e => !e.isPlank).map(ex => {
    const wt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    const s = sug[ex.id];
    return `  ${ex.name}: ${wt}${unit}${s ? ` [${s === 'increase' ? '↑ ready' : s === 'repeat' ? '= repeat' : '↓ deload'}]` : ''}`;
  }).join('\n');

  const statusLine = `${name} | Lv ${state.level} | Wk ${state.currentWeek}/12 | ${phase.name} | Streak: ${state.streak}d | Sessions this week: ${weekSessions}/3`;

  if (mode === 'pep' || mode === 'analysis' || mode === 'overload') {
    return `${base}
STATUS: ${statusLine}
LIFTS:\n${liftSummary}`;
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
        const ex = EXERCISES.find(e => e.id === k);
        const wt = convertWeight((state.liftWeights?.[k] ?? 0) + 2.5, unit);
        return ex ? `${ex.name} → ${wt}${unit}` : k;
      });
      return `Pre-workout pep talk for Week ${state.currentWeek}, Session ${weekSessions + 1}/3. Streak: ${state.streak} days.
${increases.length > 0 ? `Weight increases today: ${increases.join(', ')}` : 'Maintaining current weights.'}
${userMessage ? `Jake's note: "${userMessage}"` : ''}
Be specific and energetic.`;
    }

    case 'analysis': {
      if (todayDone.length === 0) {
        return `Jake hasn't started today (Week ${state.currentWeek}). Give a brief motivating push to get going.`;
      }
      const summary = todayDone.map(id => {
        const ex = EXERCISES.find(e => e.id === id);
        const det = details[id];
        if (!det || !ex) return `  ${id}: done`;
        const compliance = det.setsCompleted >= det.setsPrescribed ? 'completed as programmed' : `only ${det.setsCompleted} of ${det.setsPrescribed} prescribed sets`;
        return `  ${ex.name}: ${compliance}${det.maxRPE > 0 ? `, RPE ${det.maxRPE}` : ''}`;
      }).join('\n');
      const missed = EXERCISES.filter(e => !todayDone.includes(e.id)).map(e => e.name);
      return `Post-session analysis Week ${state.currentWeek}:
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
        const ex = EXERCISES.find(e => e.id === k);
        const cur = convertWeight(state.liftWeights?.[k] ?? 0, unit);
        const next = convertWeight((state.liftWeights?.[k] ?? 0) + 2.5, unit);
        return ex ? `  ${ex.name}: ${cur} → ${next}${unit}` : k;
      }).join('\n');
      const increases = Object.entries(sug).filter(([,v]) => v === 'increase');
      const repeats = Object.entries(sug).filter(([,v]) => v === 'repeat');
      const deloads = Object.entries(sug).filter(([,v]) => v === 'deload');
      return `Overload plan Week ${state.currentWeek}, ${phase.name}:
Increase: ${increases.length ? '\n' + fmt(increases) : 'none'}
Repeat: ${repeats.length ? repeats.map(([k]) => EXERCISES.find(e=>e.id===k)?.name||k).join(', ') : 'none'}
Deload: ${deloads.length ? deloads.map(([k]) => EXERCISES.find(e=>e.id===k)?.name||k).join(', ') : 'none'}
${userMessage ? `Question: "${userMessage}"` : ''}
Explain the strategy concisely.`;
    }

    case 'form': {
      const exId = userMessage?.toLowerCase();
      const matched = EXERCISES.find(e =>
        e.name.toLowerCase().includes(exId || '') || e.id === exId
      );
      if (matched) {
        return `Form coaching for ${matched.name}. My weight: ${convertWeight(state.liftWeights?.[matched.id] ?? matched.startKg, unit)}${unit}. Target: RPE ${matched.rpe}, ${matched.reps} reps × ${matched.sets} sets.
Cover: setup, key cues, most common mistakes, one immediate improvement.`;
      }
      return `Jake wants form tips${userMessage ? ` on: "${userMessage}"` : ''}. Available: ${EXERCISES.map(e=>e.name).join(', ')}. Ask which exercise, then give coaching.`;
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

    default:
      return userMessage || 'General coaching advice for my program.';
  }
}

export default function AICoachTab({ state, onSaveHistory }) {
  const [activeMode, setActiveMode] = useState('pep');
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState(() => state.aiCoachHistory || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastSendRef = useRef({ prompt: '', ts: 0 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const mode = COACH_MODES.find(m => m.id === activeMode);

  async function sendMessage(overrideMessage) {
    if (loading) return;

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('No API key found. Create a .env.local file in the project root and add:\nVITE_ANTHROPIC_API_KEY=sk-ant-...\nThen restart the dev server.');
      return;
    }

    const text = (overrideMessage ?? userMessage).trim();
    const systemPrompt = buildSystemPrompt(state, activeMode);
    const userPrompt = buildUserPrompt(activeMode, state, text);

    // Dedup: block same prompt within 5 seconds
    if (userPrompt === lastSendRef.current.prompt && Date.now() - lastSendRef.current.ts < 5000) {
      return;
    }
    lastSendRef.current = { prompt: userPrompt, ts: Date.now() };

    // Cache check for quick prompts (session-scoped)
    // Use user's actual message text as key differentiator so follow-up questions
    // don't collide with prior responses that share the same prompt preamble
    const cacheKey = `fq-ai-${activeMode}-wk${state.currentWeek}-s${state.weekProgress?.[state.currentWeek]?.count || 0}-${text ? text.slice(0, 80) : userPrompt.slice(0, 80)}`;
    const cached = sessionStorage.getItem(cacheKey);
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

    const newMessages = [
      ...messages,
      { role: 'user', content: userPrompt, mode: activeMode, displayText: text || mode.label, ts: Date.now() }
    ];
    setMessages(newMessages);
    setUserMessage('');
    setLoading(true);
    setError(null);

    // One-shot modes: send only the current message (no history = big token savings)
    // Checkin: send last 6 messages for conversational context
    const modeHistory = ONE_SHOT_MODES.includes(activeMode)
      ? [{ role: 'user', content: userPrompt }]
      : newMessages
          .filter(m => m.mode === activeMode && (m.role === 'user' || m.role === 'assistant'))
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: systemPrompt,
          messages: modeHistory
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const assistantText = data.content?.find(b => b.type === 'text')?.text || 'No response';

      // Cache response for reuse within this session
      try { sessionStorage.setItem(cacheKey, assistantText); } catch (e) {}

      const finalMessages = [
        ...newMessages,
        { role: 'assistant', content: assistantText, mode: activeMode, ts: Date.now() }
      ];
      setMessages(finalMessages);
      onSaveHistory(finalMessages.slice(-20));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    onSaveHistory([]);
  }

  const modeMessages = messages.filter(m => m.mode === activeMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>
              AI COACH
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Powered by Claude · Knows your data
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} style={{
              marginLeft: 'auto', padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text3)', fontSize: 10, fontFamily: 'Orbitron',
              fontWeight: 700, cursor: 'pointer'
            }}>CLEAR</button>
          )}
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {COACH_MODES.map(m => (
            <button key={m.id} onClick={() => setActiveMode(m.id)} style={{
              padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${activeMode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`,
              background: activeMode === m.id ? m.bg : 'transparent',
              color: activeMode === m.id ? m.color : 'var(--text3)',
              fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
              letterSpacing: 0.3, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, marginBottom: 14 }}>
        {modeMessages.length === 0 && (
          <ModePrompt mode={COACH_MODES.find(m => m.id === activeMode)} state={state} />
        )}

        {modeMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
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

      {/* Input area */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 14, padding: 14, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontFamily: 'Orbitron', letterSpacing: 0.5 }}>
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
              color: 'var(--text)', fontFamily: 'Rajdhani',
              fontSize: 14, fontWeight: 600, padding: '0 12px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading}
            style={{
              width: 42, height: 42, borderRadius: 10, border: 'none',
              background: loading ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${mode.color}, ${mode.color}cc)`,
              color: loading ? 'var(--text3)' : 'var(--bg)',
              fontSize: 18, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0
            }}
          >
            {loading ? '⏳' : '→'}
          </button>
        </div>

        {/* Quick fire buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {getQuickPrompts(activeMode).map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} style={{
              padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text3)', fontSize: 10, fontFamily: 'Orbitron',
              fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3,
              transition: 'all 0.2s'
            }}>{q}</button>
          ))}
        </div>
      </div>
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
      <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: mode.color, marginBottom: 6 }}>
        {mode.label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
        {getModeDescription(mode.id, state)}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
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

  const formatted = msg.content
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

function getModeDescription(modeId, state) {
  const week = state.currentWeek;
  const sessions = state.totalSessions;
  switch (modeId) {
    case 'pep':      return `Hit the button below to get a fired-up pre-workout pep talk tailored to Week ${week} and your current progress. Or add a note about how you're feeling.`;
    case 'analysis': return `Get an AI breakdown of today's session. Works best after completing some exercises. ${sessions === 0 ? 'Complete your first workout to unlock full analysis.' : `You've done ${sessions} sessions total.`}`;
    case 'overload': return 'Get your exact progressive overload plan for next session, based on your RPE data. Shows which lifts to increase, repeat, or back off.';
    case 'form':     return 'Ask for form tips on any exercise: Squat, Bench, RDL, Lat Pulldown, OHP, Leg Curl, or Plank. Type the exercise name or hit a quick button.';
    case 'checkin':  return `Review your body recomposition progress across ${state.weeklyCheckins?.length || 0} check-ins. Get an honest assessment of your weight trend and what it means.`;
    default:         return 'Ask your coach anything.';
  }
}

function getInputHint(modeId) {
  switch (modeId) {
    case 'pep':      return 'Optional: add a note (feeling tired? had a bad week?) or just hit →';
    case 'analysis': return 'Optional: add context about today\'s session';
    case 'overload': return 'Optional: ask a specific question about progression';
    case 'form':     return 'Type an exercise name for detailed cues';
    case 'checkin':  return 'Optional: ask a specific question about your progress';
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
    default:         return [];
  }
}
