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

function buildSystemPrompt(state) {
  const phase = getPhase(state.currentWeek);
  const sug = state.overloadSuggestions || {};
  const prs = state.personalRecords || {};
  const unit = state.unit;

  const liftSummary = EXERCISES.filter(e => !e.isPlank).map(ex => {
    const wt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    const pr = prs[ex.id] ? convertWeight(prs[ex.id].weight, unit) : null;
    const s = sug[ex.id];
    return `  - ${ex.name}: ${wt}${unit}${pr ? ` (PR: ${pr}${unit})` : ''}${s ? ` [${s === 'increase' ? '↑ ready to progress' : s === 'repeat' ? '= repeat weight' : '↓ deload recommended'}]` : ''}`;
  }).join('\n');

  const recentCheckin = state.weeklyCheckins?.length > 0
    ? state.weeklyCheckins[state.weeklyCheckins.length - 1]
    : null;
  const prevCheckin = state.weeklyCheckins?.length > 1
    ? state.weeklyCheckins[state.weeklyCheckins.length - 2]
    : null;

  const weightTrend = recentCheckin
    ? `Current: ${recentCheckin.weight}${unit}${prevCheckin ? `, previous: ${prevCheckin.weight}${unit}, change: ${(recentCheckin.weight - prevCheckin.weight).toFixed(1)}${unit}` : ''}`
    : 'No check-ins yet';

  const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;

  return `You are Coach AI for FitQuest — a hyper-personalized fitness coach for Jake's 12-week body recomposition program.

JAKE'S CURRENT STATUS:
- Name: ${state.name}
- Level: ${state.level} | Streak: ${state.streak} days | Best streak: ${state.bestStreak}
- Week: ${state.currentWeek}/12 | Phase: ${phase.name} — ${phase.desc}
- Sessions this week: ${weekSessions}/3 | Total sessions: ${state.totalSessions}
- Perfect weeks: ${state.perfectWeeks}
- Unit preference: ${unit}

CURRENT LIFTS & PROGRESSION:
${liftSummary}

BODY WEIGHT TREND:
${weightTrend}

PROGRAM STRUCTURE:
- 3x/week full body (Mon/Wed/Fri): Squat, Bench, RDL, Lat Pulldown, OHP, Leg Curl, Plank
- Phase 1 (Wk 1-2): RPE 8 baseline finding
- Phase 2 (Wk 3-8): Linear +2.5kg/week when RPE ≤8
- Phase 3 (Wk 9): Deload at 80% weight, 2 sets
- Phase 4 (Wk 10-12): Continued progression

COACHING STYLE:
- Be direct, energetic, and motivating — like a knowledgeable gym coach who knows Jake personally
- Use Jake's actual numbers and data; never be generic
- Keep responses concise (150-250 words max) — Jake is reading this at the gym or before/after training
- Use formatting (bullet points, bold) sparingly but effectively
- Occasionally use intensity language, but don't be over-the-top cheesy
- Always ground advice in the program structure above`;
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
      return `Give me a focused pre-workout pep talk for today's session.
Context:
- It's Week ${state.currentWeek}, ${phase.name}
- Session ${weekSessions + 1}/3 this week
- Streak: ${state.streak} days
${increases.length > 0 ? `- Ready to increase weight on: ${increases.join(', ')}` : '- Maintaining current weights today'}
${userMessage ? `\nJake's note: "${userMessage}"` : ''}

Give me energy and tell me exactly what to focus on today. Be specific to my numbers.`;
    }

    case 'analysis': {
      if (todayDone.length === 0) {
        return `Jake hasn't completed any exercises yet today. Give a brief motivating message to get started, referencing Week ${state.currentWeek} and what's on the program today.`;
      }
      const summary = todayDone.map(id => {
        const ex = EXERCISES.find(e => e.id === id);
        const det = details[id];
        if (!det || !ex) return `  - ${id}: completed`;
        return `  - ${ex.name}: ${det.setsCompleted}/${det.setsPrescribed} sets${det.maxRPE > 0 ? `, max RPE ${det.maxRPE}` : ''}${det.volume > 0 ? `, ${Math.round(det.volume)}${unit} volume` : ''}`;
      }).join('\n');
      const missed = EXERCISES.filter(e => !todayDone.includes(e.id)).map(e => e.name);
      return `Analyze my session for Week ${state.currentWeek}:

Exercises completed:
${summary}
${missed.length > 0 ? `\nSkipped: ${missed.join(', ')}` : '\nAll exercises completed!'}
${userMessage ? `\nMy note: "${userMessage}"` : ''}

Give me a concise post-session analysis: what went well, what to watch, and what this means for next session.`;
    }

    case 'overload': {
      const increases = Object.entries(sug).filter(([,v]) => v === 'increase');
      const repeats = Object.entries(sug).filter(([,v]) => v === 'repeat');
      const deloads = Object.entries(sug).filter(([,v]) => v === 'deload');

      if (Object.keys(sug).length === 0) {
        return `I'm in Week ${state.currentWeek} of my program but haven't logged enough sessions yet to have overload data. Explain the progressive overload approach for this phase (${phase.name}: ${phase.desc}) and what RPE targets I should be aiming for.`;
      }

      const formatList = (arr) => arr.map(([k]) => {
        const ex = EXERCISES.find(e => e.id === k);
        const cur = convertWeight(state.liftWeights?.[k] ?? 0, unit);
        const next = convertWeight((state.liftWeights?.[k] ?? 0) + 2.5, unit);
        return ex ? `  - ${ex.name}: ${cur}${unit} → ${next}${unit}` : k;
      }).join('\n');

      return `Give me my progressive overload plan for next session (Week ${state.currentWeek}, ${phase.name}):

Ready to increase (RPE ≤8):
${increases.length > 0 ? formatList(increases) : '  - None yet'}

Repeat weight (RPE 9):
${repeats.length > 0 ? repeats.map(([k]) => `  - ${EXERCISES.find(e=>e.id===k)?.name || k}`).join('\n') : '  - None'}

Consider deload (RPE 10):
${deloads.length > 0 ? deloads.map(([k]) => `  - ${EXERCISES.find(e=>e.id===k)?.name || k}`).join('\n') : '  - None'}
${userMessage ? `\nQuestion: "${userMessage}"` : ''}

Explain the strategy and any key things to watch for.`;
    }

    case 'form': {
      const exId = userMessage?.toLowerCase();
      const matchedEx = EXERCISES.find(e =>
        e.name.toLowerCase().includes(exId || '') ||
        e.id === exId
      );
      if (matchedEx) {
        return `Give me detailed form coaching for ${matchedEx.name}. 
My current weight: ${convertWeight(state.liftWeights?.[matchedEx.id] ?? matchedEx.startKg, unit)}${unit}
Target: RPE ${matchedEx.rpe}, ${matchedEx.reps} reps × ${matchedEx.sets} sets

Cover: setup, key cues, most common mistakes at my weight level, and one thing that will immediately improve the lift.`;
      }
      const exerciseList = EXERCISES.map(e => e.name).join(', ');
      return `Jake wants form tips. Available exercises: ${exerciseList}.
${userMessage ? `Jake asked about: "${userMessage}"` : 'Jake didn\'t specify an exercise.'}

${!matchedEx ? 'Ask which exercise they want tips on, then provide coaching.' : ''}`;
    }

    case 'checkin': {
      const checkins = state.weeklyCheckins || [];
      if (checkins.length === 0) {
        return `Jake hasn't done any Sunday check-ins yet (Week ${state.currentWeek}). Explain what the weekly check-in is for and what metrics matter for a recomp program. Motivate them to do their first one this Sunday.`;
      }
      const recent = checkins.slice(-4);
      const trend = recent.map((c, i) => `  Week ${c.week}: ${c.weight}${unit}${c.waist > 0 ? `, waist ${c.waist}cm` : ''}`).join('\n');
      const totalSessions = state.totalSessions;
      const perfectWeeks = state.perfectWeeks;

      return `Review my check-in data and overall recomp progress:

Recent check-ins:
${trend}

Training stats:
  - Total sessions: ${totalSessions}
  - Perfect weeks: ${perfectWeeks}
  - Current week: ${state.currentWeek}/12
  - Streak: ${state.streak} days
${userMessage ? `\nJake's question: "${userMessage}"` : ''}

Analyze my progress toward recomposition (simultaneous fat loss + muscle gain). Are the weight trends appropriate? What should I be thinking about for the remaining weeks?`;
    }

    default:
      return userMessage || 'Give me general coaching advice for my program.';
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const mode = COACH_MODES.find(m => m.id === activeMode);

  async function sendMessage() {
    if (loading) return;

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('No API key found. Create a .env.local file in the project root and add:\nVITE_ANTHROPIC_API_KEY=sk-ant-...\nThen restart the dev server.');
      return;
    }

    const systemPrompt = buildSystemPrompt(state);
    const userPrompt = buildUserPrompt(activeMode, state, userMessage.trim());

    const newMessages = [
      ...messages,
      { role: 'user', content: userPrompt, mode: activeMode, displayText: userMessage.trim() || mode.label, ts: Date.now() }
    ];
    setMessages(newMessages);
    setUserMessage('');
    setLoading(true);
    setError(null);

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: newMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const assistantText = data.content?.find(b => b.type === 'text')?.text || 'No response';

      const finalMessages = [
        ...newMessages,
        { role: 'assistant', content: assistantText, mode: activeMode, ts: Date.now() }
      ];
      setMessages(finalMessages);
      onSaveHistory(finalMessages.slice(-20)); // save last 20
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
            onClick={sendMessage}
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
            <button key={i} onClick={() => { setUserMessage(q); setTimeout(sendMessage, 50); }} style={{
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

  // Format assistant markdown-lite: bold and bullets
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
