import React, { useState } from 'react';
import { Bot, History, Dumbbell, Calendar, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import WorkoutTab from './WorkoutTab';
import AICoachTab from './AICoachTab';

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

const DAY_LABEL = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

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
          Next workout: <span style={{ color: 'var(--color-text-primary)' }}>{next.title || next.name || DAY_LABEL[nextDayKey] || 'Upcoming'}</span>
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
  state, exercises, currentDayName, isRestDay, nextTrainingDayKey, sessionDayKey,
  onCompleteExercise, onFinishSession, onStartSession,
  onModalChange, onChangeProgram, onSwapExercise, onDeleteExercise, onBackfillWeek,
  unreadAgentCount, onMarkAgentRead, onOpenInbox, agentMessages, onSaveHistory,
  onSaveProgram, onQuestMessageSent, userId,
}) {
  const [coachOpen, setCoachOpen] = useState(false);

  function openCoach() {
    setCoachOpen(true);
    if (onMarkAgentRead) onMarkAgentRead();
    if (onOpenInbox) onOpenInbox();
  }

  return (
    <div className="tab-enter" style={{ padding: '0 var(--space-4)' }}>
      {/* Coach entry point. Kept to a single row: the old version was a 76px
          card stacked under a 60px phase banner, which pushed the actual
          session below the fold on a 667px-tall phone. */}
      <button
        onClick={openCoach}
        aria-label="Open AI Coach"
        className="fq-press"
        style={{
          width: '100%', minHeight: 'var(--tap-target)',
          marginBottom: 'var(--space-3)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: '10px var(--space-4)',
          background: 'linear-gradient(135deg, rgba(179,136,255,0.12), rgba(0,229,255,0.07))',
          border: '1px solid rgba(179,136,255,0.2)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'left',
        }}
      >
        <span style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
          <Bot size={19} color="var(--color-accent-purple)" />
          {unreadAgentCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -6,
              background: 'var(--color-destructive)', color: '#fff',
              borderRadius: 'var(--radius-full)', minWidth: 14, height: 14, padding: '0 3px',
              fontSize: 8, fontWeight: 700, lineHeight: '14px', textAlign: 'center',
            }}>{unreadAgentCount > 9 ? '9+' : unreadAgentCount}</span>
          )}
        </span>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)',
        }}>
          AI Coach
          <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
            {' '}· {unreadAgentCount > 0 ? 'new message' : 'form tips & overload plan'}
          </span>
        </span>
        <ChevronRight size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
      </button>

      {/* Workout content — the session hero inside WorkoutTab now carries the
          phase, week and day, so the standalone phase banner that used to sit
          here was saying the same thing twice before the fold. */}
      <WorkoutTab
        state={state}
        exercises={exercises}
        currentDayName={currentDayName}
        isRestDay={isRestDay}
        nextTrainingDayKey={nextTrainingDayKey}
        sessionDayKey={sessionDayKey}
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
