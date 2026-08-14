import React, { useState } from 'react';
import { Bot, History, Dumbbell, Play, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import WorkoutTab from './WorkoutTab';
import AICoachTab from './AICoachTab';
import { getPhase } from '../utils/gameLogic';

// Recent session history from log (last 5 sessions)
function SessionHistory({ log }) {
  const sessions = [...(log || [])]
    .reverse()
    .filter(l => l.type === 'session')
    .slice(0, 5);

  if (sessions.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'var(--space-10) var(--space-4)',
        gap: 'var(--space-3)',
      }}>
        <Dumbbell size={48} color="var(--color-text-tertiary)" style={{ opacity: 0.5 }} />
        <p style={{
          fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 260, margin: 0,
        }}>No sessions logged yet. Your journey starts now.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {sessions.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--color-accent-purple)',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 'var(--text-base)', fontWeight: 500,
              color: 'var(--color-text-primary)', lineHeight: 1.3,
            }}>{s.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {s.dateStr || s.date}{s.week ? ` · Wk ${s.week}` : ''}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700,
            color: 'var(--color-success)',
            background: 'rgba(0,230,118,0.08)',
            padding: '3px 8px', borderRadius: 'var(--radius-sm)',
          }}>+{s.xp}</div>
        </div>
      ))}
    </div>
  );
}

function NextWorkoutCard({ state }) {
  const [open, setOpen] = useState(false);

  const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = DAY_ORDER[new Date().getDay()];
  const tdays = state.trainingDays || ['mon', 'wed', 'fri'];
  const sortedTdays = [...tdays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const todayOrdinal = DAY_ORDER.indexOf(dayKey);
  const nextDayKey = sortedTdays.find(d => DAY_ORDER.indexOf(d) > todayOrdinal) || sortedTdays[0];

  // Prefer dayTemplates; fall back to activeTemplates keyed by original tdays index
  const nextFromDayTemplates = state.dayTemplates?.[nextDayKey];
  const nextOrigIdx = tdays.indexOf(nextDayKey);
  const nextFromActiveTemplates = state.activeTemplates?.[nextOrigIdx >= 0 ? nextOrigIdx : 0];
  const next = (nextFromDayTemplates?.exercises?.length ? nextFromDayTemplates : null)
    ?? (nextFromActiveTemplates?.exercises?.length ? nextFromActiveTemplates : null);

  if (!next?.exercises?.length) return null;

  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: open ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Calendar size={15} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
        <span style={{
          flex: 1, fontFamily: 'var(--font-primary)', fontSize: 'var(--text-sm)',
          fontWeight: 600, color: 'var(--color-text-secondary)',
        }}>
          Next workout: <span style={{ color: 'var(--color-text-primary)' }}>{next.name}</span>
        </span>
        {open
          ? <ChevronUp size={15} color="var(--color-text-tertiary)" />
          : <ChevronDown size={15} color="var(--color-text-tertiary)" />}
      </button>

      {open && (
        <div style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-subtle)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          overflow: 'hidden',
        }}>
          {next.exercises.map((ex, i) => (
            <div key={ex.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: '10px var(--space-4)',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-border-subtle)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                background: 'rgba(179,136,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Dumbbell size={11} color="var(--color-accent-purple)" />
              </div>
              <span style={{
                flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)',
              }}>{ex.name}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}>
                {ex.isPlank
                  ? `${ex.sets} × ${ex.duration ?? '30s'}`
                  : `${ex.sets} × ${ex.reps}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainTab({
  state, exercises, currentDayName, isRestDay, nextTrainingDayKey,
  onCompleteExercise, onFinishSession, onStartSession,
  onModalChange, onChangeProgram, onSwapExercise, onDeleteExercise, onBackfillWeek,
  unreadAgentCount, onMarkAgentRead, onOpenInbox, agentMessages, onSaveHistory,
  onSaveProgram, onQuestMessageSent, userId,
}) {
  const [coachOpen, setCoachOpen] = useState(false);
  const phase = getPhase(state.currentWeek);

  function openCoach() {
    setCoachOpen(true);
    if (onMarkAgentRead) onMarkAgentRead();
    if (onOpenInbox) onOpenInbox();
  }

  return (
    <div className="tab-enter" style={{ padding: '0 var(--space-4)' }}>
      {/* Phase banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-4)',
        background: 'rgba(179,136,255,0.08)',
        borderLeft: '3px solid var(--color-accent-purple)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      }}>
        <span style={{ fontSize: 16 }}>{phase.icon}</span>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700,
            color: 'var(--color-accent-purple)', letterSpacing: '0.04em',
          }}>
            {isRestDay ? 'REST DAY' : phase.name}
            {!isRestDay && currentDayName ? ` · ${currentDayName}` : ''}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {isRestDay ? 'Recovery — your next session is previewed below' : phase.desc}
          </div>
        </div>
      </div>

      {/* AI Coach access card */}
      <button
        onClick={openCoach}
        aria-label="Open AI Coach"
        style={{
          width: '100%', marginBottom: 'var(--space-4)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          padding: 'var(--space-4)',
          background: 'linear-gradient(135deg, rgba(179,136,255,0.12), rgba(0,229,255,0.08))',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-lg)',
          cursor: 'pointer', textAlign: 'left',
          transition: 'transform var(--transition-fast), box-shadow var(--transition-normal)',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: 'rgba(179,136,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <Bot size={22} color="var(--color-accent-purple)" />
          {unreadAgentCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--color-destructive)', color: '#fff',
              borderRadius: '50%', width: 14, height: 14,
              fontSize: 8, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unreadAgentCount > 9 ? '9+' : unreadAgentCount}</span>
          )}
        </div>
        <div>
          <div style={{
            fontSize: 'var(--text-md)', fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>AI Coach</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Pre-workout pep, form tips, analysis
          </div>
        </div>
      </button>

      {/* Workout content */}
      <WorkoutTab
        state={state}
        exercises={exercises}
        currentDayName={currentDayName}
        isRestDay={isRestDay}
        nextTrainingDayKey={nextTrainingDayKey}
        onCompleteExercise={onCompleteExercise}
        onFinishSession={onFinishSession}
        onStartSession={onStartSession}
        onModalChange={onModalChange}
        onChangeProgram={onChangeProgram}
        onSwapExercise={onSwapExercise}
        onDeleteExercise={onDeleteExercise}
        onBackfillWeek={onBackfillWeek}
        onOpenCoach={openCoach}
      />

      {/* Next workout preview */}
      <NextWorkoutCard state={state} />

      {/* Session history */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}>
          <History size={16} color="var(--color-text-tertiary)" />
          <span style={{
            fontFamily: 'var(--font-primary)', fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>Recent Sessions</span>
        </div>
        <SessionHistory log={state.log} />
      </div>

      {/* AI Coach overlay */}
      {coachOpen && (
        <AICoachTab
          isOpen={coachOpen}
          onClose={() => setCoachOpen(false)}
          state={state}
          onSaveHistory={onSaveHistory}
          onSaveProgram={onSaveProgram}
          onQuestMessageSent={onQuestMessageSent}
          agentMessages={agentMessages}
          userId={userId}
        />
      )}
    </div>
  );
}
