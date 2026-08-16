import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, Play, Flag, MoreHorizontal, Repeat, Trash2,
  Bot, Moon, Check, Timer, CalendarDays, Trophy,
} from 'lucide-react';
import { getSetsForWeek, getWeightForExercise, convertWeight, getPhase, isDeloadWeek } from '../utils/gameLogic';
import ExerciseModal from './ExerciseModal';
import ProgramCompleteModal from './ProgramCompleteModal';
import { getProgramExercisesForDay } from './OtherTabs';
import { getPickerCategories } from '../data/exerciseCatalog';
import { useConfirm } from './ui/ConfirmDialog';
import { haptic } from '../utils/haptics';
import { getLastPerformance } from '../utils/exerciseHistory';

// Ceiling from calculateAdherenceXP: 10 (training day) + 8 (RPE) + 20 (overload).
const MAX_EXERCISE_XP = 38;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_SHORT = { mon: 'M', tue: 'Tu', wed: 'W', thu: 'Th', fri: 'F', sat: 'Sa', sun: 'Su' };

/**
 * Resolves each training day in the viewed week to done / skipped / current.
 *
 * Skipped is calendar-aware: a day only counts as missed once its actual date
 * has passed, anchored to `state.currentWeekStartDate` rather than re-inferred
 * from session data (inferring it pushed earlier skipped days into next week
 * whenever the first training day of a week was missed).
 */
function resolveWeekDays(state, viewingWeek, sortedTrainingDays) {
  const wp = state.weekProgress?.[viewingWeek] || { count: 0, sessions: [] };
  const isCurrentWeek = viewingWeek === state.currentWeek;

  const daysFromSessions = (wp.sessions || [])
    .map(s => s.dayKey || (s.date ? DAY_KEYS[new Date(s.date).getDay()] : null))
    .filter(Boolean);
  const resolvedDays = daysFromSessions.length > 0
    ? [...new Set([...(wp.completedDays || []), ...daysFromSessions])]
    : wp.completedDays || null;

  const todayOrd = new Date().getDay();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const weekStartDate = new Date();
  weekStartDate.setHours(0, 0, 0, 0);
  if (state.currentWeekStartDate) {
    const parsed = new Date(state.currentWeekStartDate);
    if (!isNaN(parsed)) {
      weekStartDate.setTime(parsed.getTime());
      weekStartDate.setHours(0, 0, 0, 0);
    }
  }
  const weekStartOrd = weekStartDate.getDay();

  // Cursor = first undone training day at or after today, so skipped past days
  // don't hold it hostage.
  const currentDayId = (isCurrentWeek && !wp.completed)
    ? sortedTrainingDays.find(d => {
        const done = resolvedDays ? resolvedDays.includes(d) : false;
        return DAY_KEYS.indexOf(d) >= todayOrd && !done;
      }) ?? null
    : null;

  const explicitlySkipped = new Set(wp.skippedDays || []);
  const weekIsPast = viewingWeek < state.currentWeek;

  return sortedTrainingDays.map((dayKey, i) => {
    const done = resolvedDays ? resolvedDays.includes(dayKey) : i < wp.count;
    const daysFromStart = (DAY_KEYS.indexOf(dayKey) - weekStartOrd + 7) % 7;
    const trainingDayDate = new Date(weekStartDate);
    trainingDayDate.setDate(weekStartDate.getDate() + daysFromStart);
    return {
      dayKey,
      label: DAY_SHORT[dayKey] || dayKey,
      done,
      // A training day counts as missed when the user said so, or when the
      // week it belongs to is behind us. The old rule was gated on
      // isCurrentWeek alone, so last week's missed Wednesday rendered as a
      // plain grey pill — indistinguishable from a day still to come, and
      // with nothing to tap.
      skipped: !done && (
        explicitlySkipped.has(dayKey)
        || weekIsPast
        || (isCurrentWeek && trainingDayDate < todayMidnight)
      ),
      markedSkipped: explicitlySkipped.has(dayKey),
      current: dayKey === currentDayId,
    };
  });
}

/** Donut showing how much of today's session is logged. */
function ProgressRing({ done, total, size = 62, restDay = false }) {
  const r = (size - 7) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const complete = total > 0 && done >= total;
  const color = restDay ? 'var(--color-accent-purple)'
    : complete ? 'var(--color-success)'
    : 'var(--color-action)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s var(--transition-slow), stroke 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        {restDay ? (
          <Moon size={20} color="var(--color-accent-purple)" />
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color,
            }}>{done}</span>
            <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              of {total}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Live elapsed-time readout for an in-progress session. */
function useElapsed(startTime) {
  const [elapsed, setElapsed] = useState(() =>
    startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const FULL_DAY = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

/**
 * One card answering "what am I doing right now, and what do I press?".
 *
 * This replaces five separately stacked blocks — week stepper, session-dot
 * tracker, phase label, session timer and start button — that between them
 * showed the phase twice and pushed the first exercise most of a screen down.
 */
function SessionHero({
  state, viewingWeek, isCurrentWeek, sessionTitle, isRestDay, nextTrainingDayKey,
  weekDays, doneCount, totalExercises, sessionFinished,
  onPrevWeek, onNextWeek, onJumpToCurrent, onStartSession, onFinish,
  onMakeUpDay, onOpenCoach, onTrainAnyway,
}) {
  const phase = getPhase(viewingWeek);
  const elapsed = useElapsed(state.sessionStartTime);
  const sessionRunning = !!state.sessionStartTime && !sessionFinished;
  const wp = state.weekProgress?.[viewingWeek] || { count: 0 };
  const sessionsThisWeek = wp.count || 0;

  // Exactly one primary action, chosen by where the user actually is.
  let cta = null;
  if (!isCurrentWeek) {
    cta = { label: `BACK TO WEEK ${state.currentWeek}`, onClick: onJumpToCurrent, tone: 'ghost', Icon: CalendarDays };
  } else if (isRestDay) {
    cta = { label: 'ASK YOUR COACH', onClick: onOpenCoach, tone: 'purple', Icon: Bot };
  } else if (sessionFinished) {
    cta = { label: 'SESSION COMPLETE', onClick: null, tone: 'done', Icon: Check };
  } else if (doneCount > 0) {
    cta = { label: `FINISH SESSION · ${doneCount}/${totalExercises}`, onClick: onFinish, tone: 'fire', Icon: Flag };
  } else if (!state.sessionStartTime) {
    cta = { label: 'START SESSION', onClick: onStartSession, tone: 'action', Icon: Play };
  } else {
    cta = { label: 'TAP AN EXERCISE TO LOG', onClick: null, tone: 'ghost', Icon: Timer };
  }

  const toneStyles = {
    action: { background: 'linear-gradient(135deg, var(--color-action-hover), var(--color-action))', color: 'var(--color-bg-primary)', border: 'none', boxShadow: '0 4px 18px rgba(0,229,255,0.22)' },
    fire:   { background: 'linear-gradient(135deg, var(--color-fire), var(--color-warning))', color: 'var(--color-bg-primary)', border: 'none', boxShadow: '0 4px 18px rgba(255,109,0,0.22)' },
    purple: { background: 'linear-gradient(135deg, rgba(179,136,255,0.22), rgba(0,229,255,0.16))', color: 'var(--color-accent-purple)', border: '1px solid rgba(179,136,255,0.3)', boxShadow: 'none' },
    done:   { background: 'rgba(0,230,118,0.1)', color: 'var(--color-success)', border: '1px solid rgba(0,230,118,0.3)', boxShadow: 'none' },
    ghost:  { background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-medium)', boxShadow: 'none' },
  }[cta.tone];

  return (
    <section
      aria-label="Today's session"
      style={{
        background: 'linear-gradient(160deg, var(--color-surface-1), rgba(15,21,40,0.75))',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}
    >
      {/* Week stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
      }}>
        <button
          onClick={onPrevWeek}
          disabled={viewingWeek <= 1}
          aria-label="Previous week"
          style={{
            width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0,
            border: '1px solid var(--color-border-medium)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--color-text-secondary)', opacity: viewingWeek <= 1 ? 0.3 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><ChevronLeft size={17} /></button>

        <div style={{ textAlign: 'center', minWidth: 0, padding: '0 var(--space-2)' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700,
            color: isCurrentWeek ? 'var(--color-action)' : 'var(--color-accent-purple)',
            letterSpacing: '0.06em',
          }}>
            WEEK {viewingWeek}{!isCurrentWeek ? ' · VIEWING' : ''}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {phase.icon} {phase.name}
          </div>
        </div>

        <button
          onClick={onNextWeek}
          disabled={viewingWeek >= state.currentWeek}
          aria-label="Next week"
          style={{
            width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0,
            border: '1px solid var(--color-border-medium)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--color-text-secondary)',
            opacity: viewingWeek >= state.currentWeek ? 0.3 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><ChevronRight size={17} /></button>
      </div>

      {/* Session identity + completion ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <ProgressRing done={doneCount} total={totalExercises} restDay={isRestDay} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700,
            color: 'var(--color-text-primary)', lineHeight: 1.25, letterSpacing: '0.02em',
          }}>
            {isRestDay ? 'REST DAY' : (sessionTitle || "TODAY'S SESSION")}
          </h2>
          <div style={{
            fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
            marginTop: 3, lineHeight: 1.4,
          }}>
            {isRestDay
              ? <>Recovery — next up {FULL_DAY[nextTrainingDayKey] || 'soon'}</>
              : <>{totalExercises} exercise{totalExercises === 1 ? '' : 's'} · session {Math.min(sessionsThisWeek + (sessionFinished ? 0 : 1), state.sessionsPerWeek || weekDays.length)} of {state.sessionsPerWeek || weekDays.length}</>}
          </div>
          {sessionRunning && !isRestDay && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
              padding: '3px 9px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,109,0,0.1)', border: '1px solid rgba(255,109,0,0.22)',
            }}>
              <Timer size={12} color="var(--color-warning)" />
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                color: 'var(--color-warning)',
              }}>{elapsed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Week's training days — tap a missed one to make it up */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)', flexWrap: 'wrap',
      }}>
        {weekDays.map(({ dayKey, label, done, skipped, markedSkipped, current }) => {
          const interactive = skipped && !!onMakeUpDay;
          let borderColor = 'var(--color-border-medium)';
          let bg = 'transparent';
          let fg = 'var(--color-text-tertiary)';
          if (done)            { borderColor = 'var(--color-success)'; bg = 'var(--color-success)'; fg = 'var(--color-bg-primary)'; }
          // A miss the user has consciously written off reads as settled, not
          // as an outstanding problem — only unresolved misses stay red.
          else if (markedSkipped) { borderColor = 'var(--color-border-medium)'; bg = 'rgba(255,255,255,0.04)'; fg = 'var(--color-text-tertiary)'; }
          else if (skipped)    { borderColor = 'rgba(255,23,68,0.6)';  bg = 'rgba(255,23,68,0.1)'; fg = 'var(--color-destructive)'; }
          else if (current)    { borderColor = 'var(--color-action)';  fg = 'var(--color-action)'; }

          const label_ = done ? `${FULL_DAY[dayKey]} complete`
            : markedSkipped ? `${FULL_DAY[dayKey]} marked as skipped`
            : skipped ? `${FULL_DAY[dayKey]} missed — resolve it`
            : `${FULL_DAY[dayKey]} upcoming`;

          return (
            <button
              key={dayKey}
              onClick={interactive ? () => onMakeUpDay(dayKey) : undefined}
              disabled={!interactive}
              aria-label={label_}
              title={label_}
              style={{
                width: 38, height: 38, borderRadius: 'var(--radius-full)',
                border: `2px solid ${borderColor}`, background: bg, color: fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                cursor: interactive ? 'pointer' : 'default',
                animation: current ? 'rankPulse 2s infinite' : 'none',
              }}
            >{done ? '✓' : skipped ? '✗' : label}</button>
          );
        })}
        <span style={{
          fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto',
          fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {wp.completed ? 'WEEK DONE' : `${sessionsThisWeek}/${weekDays.length}`}
        </span>
      </div>

      {/* Single primary action */}
      <button
        onClick={cta.onClick || undefined}
        disabled={!cta.onClick}
        style={{
          width: '100%', minHeight: 50, padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700,
          letterSpacing: '0.05em', cursor: cta.onClick ? 'pointer' : 'default',
          ...toneStyles,
        }}
      >
        <cta.Icon size={17} />
        {cta.label}
      </button>

      {/* Rest-day escape hatch — deliberately quieter than the coach button */}
      {isRestDay && isCurrentWeek && (
        <button
          onClick={onTrainAnyway}
          style={{
            width: '100%', marginTop: 'var(--space-2)', padding: '10px',
            minHeight: 'var(--tap-target)', border: 'none', background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >TRAIN ANYWAY →</button>
      )}
    </section>
  );
}

export default function WorkoutTab({ state, exercises, currentDayName, isRestDay, nextTrainingDayKey, sessionDayKey, onCompleteExercise, onFinishSession, onStartSession, onModalChange, onChangeProgram, onSwapExercise, onDeleteExercise, onOpenCoach, onBackfillWeek, onMarkDaySkipped }) {
  const [viewingWeek, setViewingWeek] = useState(state.currentWeek);
  const [activeExId, setActiveExId] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showProgramComplete, setShowProgramComplete] = useState(false);
  // Which skipped training day (dayKey) the user tapped to make up, or null
  const [makeUpDay, setMakeUpDay] = useState(null);
  const [inProgressSets, setInProgressSets] = useState({});
  const [showRestWarning, setShowRestWarning] = useState(false);
  const [overrideRestDay, setOverrideRestDay] = useState(false);
  // Swipe state: tracks which card is swiped open
  const [swipedId, setSwipedId] = useState(null);
  // Which card's overflow (⋯) menu is open — the keyboard/mouse-reachable
  // equivalent of swiping, since swipe alone hid swap and delete from anyone
  // not on a touchscreen.
  const [menuOpenId, setMenuOpenId] = useState(null);
  // 12-week cycle map is collapsed until asked for
  const [showWeekMap, setShowWeekMap] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  // Swap picker: which exercise is being swapped
  const [swapTargetId, setSwapTargetId] = useState(null);
  // Program switcher panel
  const [showProgramSwitcher, setShowProgramSwitcher] = useState(false);
  // Picker filter state
  const [pickerCategory, setPickerCategory] = useState('All');
  const [pickerSearch, setPickerSearch] = useState('');
  // Touch/mouse tracking refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const mouseStartX = useRef(null);

  // Keep viewingWeek in sync when the program advances to a new week
  useEffect(() => {
    setViewingWeek(state.currentWeek);
  }, [state.currentWeek]);

  // Tell App when any modal/overlay is open so it can hide the tab bar
  useEffect(() => {
    onModalChange?.(!!activeExId || showFinishConfirm || !!swapTargetId || showProgramSwitcher || !!makeUpDay);
  }, [activeExId, showFinishConfirm, swapTargetId, showProgramSwitcher, makeUpDay]);

  // Reset picker filters whenever the picker opens
  useEffect(() => {
    if (swapTargetId) { setPickerCategory('All'); setPickerSearch(''); }
  }, [swapTargetId]);

  const w = viewingWeek;
  const isCurrentWeek = w === state.currentWeek;
  const isDeload = isDeloadWeek(w);
  const { unit, liftWeights, todayExDone, todayExDetails, todaySessionFinished, weekProgress, overloadSuggestions } = state;

  const wp = weekProgress?.[w] || { count: 0, dates: [], completed: false, sessions: [] };

  const sortedTrainingDays = state.trainingDays?.length
    ? [...state.trainingDays].sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b))
    : ['mon', 'wed', 'fri'];
  const totalSessions = sortedTrainingDays.length;
  const weekDays = resolveWeekDays(state, w, sortedTrainingDays);

  function jumpToWeek(n) { setViewingWeek(n); }

  // On rest days (unless user chose to train), nothing is "done" — it's a preview
  const activeRestDay = isRestDay && !overrideRestDay;
  const todayDone = (activeRestDay || !isCurrentWeek) ? [] : (todayExDone || []);

  return (
    <div>
      {confirmDialog}

      <SessionHero
        state={state}
        viewingWeek={w}
        isCurrentWeek={isCurrentWeek}
        sessionTitle={currentDayName}
        isRestDay={activeRestDay}
        nextTrainingDayKey={nextTrainingDayKey}
        weekDays={weekDays}
        doneCount={todayDone.length}
        totalExercises={exercises.length}
        sessionFinished={!!todaySessionFinished}
        onPrevWeek={() => setViewingWeek(v => Math.max(1, v - 1))}
        onNextWeek={() => setViewingWeek(v => Math.min(state.currentWeek, v + 1))}
        onJumpToCurrent={() => jumpToWeek(state.currentWeek)}
        onStartSession={() => { haptic('tap'); onStartSession?.(); }}
        onFinish={() => setShowFinishConfirm(true)}
        onMakeUpDay={(onBackfillWeek || onMarkDaySkipped) ? (dayKey) => setMakeUpDay(dayKey) : null}
        onOpenCoach={onOpenCoach}
        onTrainAnyway={() => setShowRestWarning(true)}
      />

      {/* Overtraining warning — only surfaced once the user reaches for
          "train anyway", so a normal rest day stays calm. */}
      {activeRestDay && showRestWarning && (
        <div style={{
          background: 'rgba(255,214,0,0.06)',
          border: '1px solid rgba(255,214,0,0.25)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
            ⚠️ <strong style={{ color: 'var(--color-premium)' }}>Rest days are when muscle is built.</strong>{' '}
            Training through one usually costs more than it earns, and raises injury risk.
            Your coach can tell you whether today is an exception.
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => { setShowRestWarning(false); onOpenCoach?.(); }}
              style={{
                flex: 2, minHeight: 'var(--tap-target)', padding: '11px 8px',
                borderRadius: 'var(--radius-md)', border: '1px solid rgba(179,136,255,0.3)',
                background: 'rgba(179,136,255,0.14)', color: 'var(--color-accent-purple)',
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              }}
            >ASK COACH FIRST</button>
            <button
              onClick={() => { setOverrideRestDay(true); setShowRestWarning(false); }}
              style={{
                flex: 1, minHeight: 'var(--tap-target)', padding: '11px 8px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-medium)',
                background: 'transparent', color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              }}
            >TRAIN</button>
          </div>
        </div>
      )}

      {/* 12-week cycle map — collapsed by default. It is a navigation aid, not
          something you need on screen while logging sets. */}
      {(() => {
        const cycleStart = Math.floor((state.currentWeek - 1) / 12) * 12 + 1;
        const cycleWeek = state.currentWeek - cycleStart + 1;
        return (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <button
              onClick={() => setShowWeekMap(o => !o)}
              aria-expanded={showWeekMap}
              style={{
                width: '100%', minHeight: 42,
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: '10px var(--space-4)',
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: showWeekMap ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                textAlign: 'left',
              }}
            >
              <CalendarDays size={15} color="var(--color-text-tertiary)" />
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Week {cycleWeek} of 12
              </span>
              {showWeekMap
                ? <ChevronRight size={15} color="var(--color-text-tertiary)" style={{ transform: 'rotate(90deg)' }} />
                : <ChevronRight size={15} color="var(--color-text-tertiary)" />}
            </button>

            {showWeekMap && (
              <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
                padding: 'var(--space-3)',
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-subtle)', borderTop: 'none',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const wn = cycleStart + i;
                  const wkp = weekProgress?.[wn];
                  let bg = 'rgba(255,255,255,0.02)', border = 'var(--color-border-medium)', color = 'var(--color-text-tertiary)';
                  if (wkp?.completed) { bg = 'var(--green-glow)'; border = 'rgba(0,230,118,0.3)'; color = 'var(--color-success)'; }
                  else if (wkp?.count > 0) { bg = 'var(--gold-glow)'; border = 'rgba(255,214,0,0.3)'; color = 'var(--color-premium)'; }
                  if (wn === state.currentWeek) { bg = 'var(--cyan-glow)'; border = 'rgba(0,229,255,0.35)'; color = 'var(--color-action)'; }
                  const isViewing = wn === viewingWeek && wn !== state.currentWeek;
                  return (
                    <button
                      key={wn}
                      onClick={() => jumpToWeek(wn)}
                      aria-label={`Week ${wn}`}
                      aria-current={wn === viewingWeek ? 'true' : undefined}
                      style={{
                        width: 38, height: 38, borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                        background: bg, border: `1px solid ${border}`, color,
                        boxShadow: isViewing ? '0 0 0 2px var(--color-accent-purple)' : 'none',
                        transition: 'all var(--transition-normal)',
                      }}
                    >{i + 1}</button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Deload week banner */}
      {isDeload && isCurrentWeek && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 14
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 5, letterSpacing: 0.8 }}>
            🧘 DELOAD WEEK — RECOVERY MODE
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            80% weight, one less set per exercise. This week <strong style={{ color: 'var(--text)' }}>rebuilds your tendons and CNS</strong> — lighter loads now unlock stronger lifts next block. Don't skip it.
          </div>
        </div>
      )}

      {/* Exercise cards */}
      {exercises.map(ex => {
        const isDone = todayDone.includes(ex.id);
        const sug = overloadSuggestions?.[ex.id];
        const wt = getWeightForExercise(ex, w, liftWeights);
        const convWt = convertWeight(wt, unit);
        const setsCount = getSetsForWeek(ex, w);
        const isSwiped = swipedId === ex.id;
        const menuOpen = menuOpenId === ex.id;
        const canEdit = !isDone && isCurrentWeek && !todaySessionFinished;
        const tappable = isCurrentWeek && !todaySessionFinished;
        const last = getLastPerformance(state, ex.id);
        const pr = state.personalRecords?.[ex.id];

        function openSwap(e) {
          e?.stopPropagation();
          setSwipedId(null);
          setMenuOpenId(null);
          setSwapTargetId(ex.id);
        }

        async function requestDelete(e) {
          e?.stopPropagation();
          setMenuOpenId(null);
          const ok = await confirm({
            title: `Remove ${ex.name}?`,
            message: 'It comes off this training day. You can add it back any time from + ADD EXERCISE.',
            confirmLabel: 'REMOVE',
            destructive: true,
          });
          if (ok) {
            onDeleteExercise?.(ex.id, sessionDayKey);
            setSwipedId(null);
          }
        }

        return (
          <div key={ex.id} style={{ position: 'relative', marginBottom: 10 }}>
            {/* Swipe-revealed actions (touch) */}
            {canEdit && (
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'stretch', zIndex: 2,
                borderRadius: 'var(--radius-lg)',
              }} aria-hidden={!isSwiped}>
                <button
                  onClick={openSwap}
                  tabIndex={isSwiped ? 0 : -1}
                  style={{
                    width: 72, border: 'none', background: 'rgba(0,229,255,0.18)',
                    color: 'var(--color-action)', borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                  }}
                ><Repeat size={17} />SWAP</button>
                <button
                  onClick={requestDelete}
                  tabIndex={isSwiped ? 0 : -1}
                  style={{
                    width: 72, border: 'none', background: 'rgba(255,23,68,0.2)',
                    color: 'var(--color-destructive)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                  }}
                ><Trash2 size={17} />DELETE</button>
              </div>
            )}

            {/* Card — zIndex above the actions so it slides away to reveal them */}
            <div
              role={tappable ? 'button' : undefined}
              tabIndex={tappable ? 0 : undefined}
              aria-label={tappable ? `Log sets for ${ex.name}` : undefined}
              onTouchStart={e => {
                if (!canEdit) return;
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={e => {
                if (!canEdit) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
                if (dy > 30) return;
                if (dx < -40) { setSwipedId(ex.id); haptic('light'); }
                else if (dx > 20) setSwipedId(null);
              }}
              onMouseDown={e => {
                if (!canEdit || e.button !== 0) return;
                mouseStartX.current = e.clientX;
              }}
              onMouseUp={e => {
                if (!canEdit || mouseStartX.current === null) return;
                const dx = e.clientX - mouseStartX.current;
                mouseStartX.current = null;
                if (dx < -40) setSwipedId(ex.id);
                else if (dx > 20) setSwipedId(null);
              }}
              onMouseLeave={() => { mouseStartX.current = null; }}
              onKeyDown={e => {
                if (!tappable) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveExId(ex.id); }
              }}
              onClick={() => {
                if (isSwiped) { setSwipedId(null); return; }
                if (!tappable) return;
                setActiveExId(ex.id);
              }}
              style={{
                background: isDone ? 'rgba(0,230,118,0.05)' : 'var(--color-surface-1)',
                border: `1px solid ${isDone ? 'rgba(0,230,118,0.18)' : isSwiped ? 'rgba(0,229,255,0.25)' : 'var(--color-border-subtle)'}`,
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                cursor: tappable ? 'pointer' : 'default',
                opacity: isDone ? 0.75 : 1,
                position: 'relative', zIndex: 3,
                transform: isSwiped ? 'translateX(-144px)' : 'translateX(0)',
                transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                  }}>
                    {isDone && <Check size={15} color="var(--color-success)" strokeWidth={3} />}
                    <span>{ex.name}</span>
                    {!isDone && sug === 'increase' && <Badge color="var(--green)" bg="rgba(0,230,118,0.12)" border="rgba(0,230,118,0.2)">↑ +2.5</Badge>}
                    {!isDone && sug === 'repeat' && <Badge color="var(--gold)" bg="rgba(255,214,0,0.1)" border="rgba(255,214,0,0.2)">= SAME</Badge>}
                    {!isDone && sug === 'deload' && <Badge color="var(--red)" bg="rgba(255,23,68,0.1)" border="rgba(255,23,68,0.2)">↓ DELOAD</Badge>}
                  </div>
                  {ex.note && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 3 }}>{ex.note}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {isDone ? (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                      color: 'var(--color-success)', background: 'var(--green-glow)',
                      padding: '4px 9px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
                      border: '1px solid rgba(0,230,118,0.25)',
                    }}>DONE</span>
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                      color: 'var(--color-warning)', background: 'var(--fire-glow)',
                      padding: '4px 9px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
                    }}>+{isDeload ? 10 : MAX_EXERCISE_XP} XP</span>
                  )}

                  {/* Overflow menu — the non-swipe route to swap/delete, so the
                      actions are reachable with a mouse, a keyboard, or a
                      screen reader rather than by discovering a hidden gesture. */}
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : ex.id); }}
                      aria-label={`Actions for ${ex.name}`}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                        border: '1px solid var(--color-border-medium)',
                        background: menuOpen ? 'var(--color-action-muted)' : 'rgba(255,255,255,0.04)',
                        color: menuOpen ? 'var(--color-action)' : 'var(--color-text-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    ><MoreHorizontal size={16} /></button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {ex.isPlank ? (
                  <Tag type="sets">{setsCount} × 45-60s</Tag>
                ) : (
                  <Tag type="sets">{setsCount} × {ex.reps} @ {convWt} {unit}</Tag>
                )}
                {!ex.isPlank && <Tag type="rpe">RPE {isDeload ? '5-6' : ex.rpe}</Tag>}
                <Tag type="rest">{ex.rest}</Tag>
              </div>

              {/* What you did last time, and your best ever — the two numbers
                  you actually want before picking today's weight. */}
              {!isDone && (last?.repsPerSet.length > 0 || pr?.weight > 0) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
                  marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--color-border-subtle)',
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                }}>
                  {last?.repsPerSet.length > 0 && (
                    <span>
                      Last:{' '}
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {last.maxWeight > 0 ? `${convertWeight(last.maxWeight, unit)}${unit} × ` : ''}
                        {last.repsPerSet.join(', ')}
                      </span>
                    </span>
                  )}
                  {pr?.weight > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Trophy size={11} color="var(--color-premium)" />
                      <span style={{ color: 'var(--color-premium)', fontWeight: 600 }}>
                        PR {convertWeight(pr.weight, unit)}{unit}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Inline action menu */}
              {menuOpen && (
                <div
                  role="menu"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex', gap: 'var(--space-2)',
                    marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={openSwap}
                    style={{
                      flex: 1, minHeight: 40, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 7,
                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,229,255,0.2)',
                      background: 'rgba(0,229,255,0.08)', color: 'var(--color-action)',
                      fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                    }}
                  ><Repeat size={14} /> SWAP</button>
                  <button
                    role="menuitem"
                    onClick={requestDelete}
                    style={{
                      flex: 1, minHeight: 40, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 7,
                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,23,68,0.22)',
                      background: 'rgba(255,23,68,0.08)', color: 'var(--color-destructive)',
                      fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                    }}
                  ><Trash2 size={14} /> REMOVE</button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Tap anywhere else to close swipe */}
      {swipedId && (
        <div
          onClick={() => setSwipedId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1 }}
        />
      )}

      {/* Add Exercise button — hidden on rest day previews */}
      {!activeRestDay && (
      <button
        onClick={() => setSwapTargetId('__add__')}
        style={{
          width: '100%', padding: '11px 0', marginBottom: 10, borderRadius: 13,
          border: '1px dashed rgba(0,229,255,0.25)',
          background: 'rgba(0,229,255,0.04)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 7,
        }}
      >
        <span style={{ fontSize: 14 }}>＋</span> ADD EXERCISE
      </button>
      )}

      {/* Finish session area */}
      {!activeRestDay && isCurrentWeek && !todaySessionFinished && todayDone.length > 0 && (
        <FinishArea
          state={state}
          exercises={exercises}
          onFinish={() => setShowFinishConfirm(true)}
        />
      )}

      {/* Already done or not current week */}
      {!activeRestDay && isCurrentWeek && todaySessionFinished && (
        <div style={{ textAlign: 'center', padding: 16, fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--green)', letterSpacing: 1 }}>
          ✓ SESSION COMPLETE — GREAT WORK!
        </div>
      )}
      {!isCurrentWeek && (
        <div style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text3)' }}>
          Viewing Week {w} —{' '}
          <span style={{ color: 'var(--cyan)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => jumpToWeek(state.currentWeek)}>
            Go to current week ({state.currentWeek})
          </span>
        </div>
      )}

      {/* Exercise modal */}
      {activeExId && (
        <ExerciseModal
          state={state}
          exId={activeExId}
          exercises={exercises}
          week={state.currentWeek}
          unit={unit}
          liftWeights={liftWeights}
          todayExDone={todayExDone || []}
          todayExDetails={todayExDetails || {}}
          savedSets={inProgressSets[activeExId] || null}
          onSetsChange={(exId, sets) =>
            setInProgressSets(prev => ({ ...prev, [exId]: sets }))
          }
          onClose={() => setActiveExId(null)}
          onComplete={(id, sets) => {
            onCompleteExercise(id, sets, sessionDayKey);
            setInProgressSets(prev => { const n = { ...prev }; delete n[id]; return n; });
            setActiveExId(null);
          }}
        />
      )}

      {/* Finish confirm */}
      {showFinishConfirm && createPortal(
        <FinishConfirmModal
          state={state}
          exercises={exercises}
          onCancel={() => setShowFinishConfirm(false)}
          onConfirm={() => {
            setShowFinishConfirm(false);
            const sessionsNeeded = state.sessionsPerWeek || 3;
            const cycleWeek = ((state.currentWeek - 1) % 12) + 1;
            const weekSessions = state.weekProgress?.[state.currentWeek]?.count || 0;
            const isLastSession = cycleWeek === 12 && weekSessions >= sessionsNeeded - 1;
            onFinishSession(sessionDayKey);
            if (isLastSession) setTimeout(() => setShowProgramComplete(true), 2000);
          }}
        />,
        document.body
      )}

      {/* Resolve a training day that wasn't trained */}
      {makeUpDay && createPortal(
        <MissedDayModal
          // The viewed week, not state.currentWeek. Tapping a missed day while
          // looking at week 2 used to record the make-up against whatever week
          // was current, silently crediting the wrong one.
          week={w}
          dayId={makeUpDay}
          isCurrentWeek={isCurrentWeek}
          isMarkedSkipped={weekDays.find(d => d.dayKey === makeUpDay)?.markedSkipped ?? false}
          onCancel={() => setMakeUpDay(null)}
          onMakeUp={() => {
            const dayExercises = getProgramExercisesForDay(state, makeUpDay);
            const customSets = {};
            const customWeights = {};
            dayExercises.forEach(ex => {
              customSets[ex.id] = ex.isPlank ? 2 : 3;
              customWeights[ex.id] = state.liftWeights?.[ex.id] ?? 0;
            });
            onBackfillWeek(w, makeUpDay, 100, customWeights, customSets, 50);
            setMakeUpDay(null);
          }}
          onSkip={() => { onMarkDaySkipped?.(w, makeUpDay, true); setMakeUpDay(null); }}
          onUnskip={() => { onMarkDaySkipped?.(w, makeUpDay, false); setMakeUpDay(null); }}
        />,
        document.body
      )}

      {/* Program complete celebration */}
      {showProgramComplete && createPortal(
        <ProgramCompleteModal
          onClose={() => setShowProgramComplete(false)}
          onChangeProgram={(id) => { onChangeProgram?.(id); setShowProgramComplete(false); }}
          state={state}
        />,
        document.body
      )}

      {/* Swap / Add exercise picker */}
      {swapTargetId && (() => {
        const isAdd = swapTargetId === '__add__';
        const currentIds = new Set(exercises.map(e => e.id));
        // Only what this user's equipment supports — the picker used to offer a
        // bodyweight-only user a 45 kg barbell squat.
        const categories = getPickerCategories(state.assessment?.equipment || 'full_gym');
        const allExercises = categories.flatMap(cat =>
          cat.exercises.map(ex => ({ ...ex, category: cat.category, icon: cat.icon }))
        );
        const filtered = allExercises.filter(ex => {
          if (isAdd && currentIds.has(ex.id)) return false;
          if (!isAdd && ex.id === swapTargetId) return false;
          if (pickerCategory !== 'All' && ex.category !== pickerCategory) return false;
          if (pickerSearch && !ex.name.toLowerCase().includes(pickerSearch.toLowerCase())) return false;
          return true;
        });
        return (
          <div
            className="fq-sheet-backdrop"
            style={{
              zIndex: 100,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={() => setSwapTargetId(null)}
          >
            <div
              className="fq-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={isAdd ? 'Add exercise' : 'Swap exercise'}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid rgba(0,229,255,0.15)',
                padding: '20px 16px 0',
                display: 'flex', flexDirection: 'column',
                overscrollBehavior: 'contain',
              }}
            >
              {/* Header */}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 4 }}>
                {isAdd ? 'ADD EXERCISE' : `SWAP — ${exercises.find(e => e.id === swapTargetId)?.name}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                {isAdd ? 'Choose an exercise to add:' : 'Choose a replacement:'}
              </div>
              {/* Search */}
              <input
                placeholder="Search exercises..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                  borderRadius: 9, border: '1px solid rgba(0,229,255,0.15)',
                  background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
                  fontSize: 13, marginBottom: 10, outline: 'none', fontFamily: 'inherit',
                }}
              />
              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 4, flexShrink: 0 }}>
                {['All', ...categories.map(c => c.category)].map(cat => (
                  <button key={cat} onClick={() => setPickerCategory(cat)} style={{
                    padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700,
                    letterSpacing: 0.5, flexShrink: 0,
                    background: pickerCategory === cat ? 'rgba(0,229,255,0.18)' : 'rgba(255,255,255,0.05)',
                    color: pickerCategory === cat ? 'var(--cyan)' : 'var(--text3)',
                  }}>
                    {cat === 'All' ? 'ALL' : cat}
                  </button>
                ))}
              </div>
              {/* Exercise list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>No exercises found</div>
                )}
                {filtered.map(sub => (
                  <button key={sub.id} onClick={() => {
                    onSwapExercise?.(isAdd ? '__add__' : swapTargetId, sub, sessionDayKey);
                    setSwapTargetId(null);
                  }} style={{
                    padding: '11px 14px', borderRadius: 11, textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: 'var(--text)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 600, flex: 1 }}>{sub.name}</span>
                    {(sub.isBodyweight || sub.isPlank) && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>BW</span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => setSwapTargetId(null)} style={{
                // Bottom gap was a flat 28px, which on a home-indicator phone
                // left the button sitting in the swipe-up area.
                margin: '10px 0 calc(var(--safe-area-bottom) + 16px)',
                width: '100%', minHeight: 'var(--tap-target)', padding: 12,
                borderRadius: 'var(--radius-md)', border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0,
              }}>CANCEL</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Sub-components

function Tag({ type, children }) {
  const styles = {
    sets:  { bg: 'var(--cyan-glow)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.12)' },
    rpe:   { bg: 'var(--purple-glow)', color: 'var(--purple)', border: 'rgba(179,136,255,0.12)' },
    rest:  { bg: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: 'rgba(255,255,255,0.05)' }
  };
  const s = styles[type] || styles.rest;
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 600, letterSpacing: 0.3,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`
    }}>{children}</span>
  );
}

function Badge({ color, bg, border, children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700,
      padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3,
      color, background: bg, border: `1px solid ${border}`
    }}>{children}</span>
  );
}

function FinishArea({ state, exercises, onFinish }) {
  const { todayExDone, todayExDetails, currentWeek } = state;
  const totalEx = exercises.length;
  const doneCount = todayExDone.length;
  const missedCount = totalEx - doneCount;
  const completionPct = Math.round((doneCount / totalEx) * 100);
  const bonusXP = Math.max(10, 50 - missedCount * 8);
  const allDone = missedCount === 0;

  return (
    <div style={{
      marginTop: 16, padding: 14,
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 14, backdropFilter: 'blur(20px)'
    }}>
      {/* Exercise list */}
      <div style={{ marginBottom: 12 }}>
        {exercises.map(e => {
          const done = todayExDone.includes(e.id);
          const det = todayExDetails?.[e.id];
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--green)' : 'var(--red)',
                boxShadow: done ? '0 0 6px rgba(0,230,118,0.3)' : '0 0 6px rgba(255,23,68,0.3)'
              }} />
              <div style={{ flex: 1, color: done ? 'var(--text)' : 'var(--text2)' }}>{e.name}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                color: done ? 'var(--green)' : 'var(--text3)'
              }}>
                {done && det ? `${det.setsCompleted}/${det.setsPrescribed}` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center', margin: '10px 0 14px' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
          color: completionPct >= 95 ? 'var(--green)' : completionPct >= 70 ? 'var(--cyan)' : 'var(--fire2)'
        }}>{completionPct}%</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
          {doneCount}/{totalEx} exercises • +{bonusXP} bonus XP
        </div>
      </div>

      <button onClick={onFinish} style={{
        width: '100%', padding: 14, border: 'none', borderRadius: 13,
        background: allDone && completionPct >= 95
          ? 'linear-gradient(135deg, var(--green), #00c853)'
          : 'linear-gradient(135deg, var(--fire), var(--fire2))',
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
        color: 'var(--bg)', letterSpacing: 0.8, cursor: 'pointer',
        boxShadow: allDone ? '0 4px 18px var(--green-glow)' : '0 4px 18px var(--fire-glow)'
      }}>
        {allDone && completionPct >= 95 ? 'FINISH SESSION ⚔️ (PERFECT!)' : 'FINISH SESSION ⚔️'}
      </button>
    </div>
  );
}

const FULL_DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

/**
 * What to do about a training day that was not trained.
 *
 * Previously the only offer was "make up", which logs the day as *done* —
 * fine if you actually did the session late, but the only available answer
 * even when you simply missed it. Marking it skipped closes the slot honestly:
 * the week can complete, and no session, XP or volume is invented.
 */
function MissedDayModal({ week, dayId, isMarkedSkipped, isCurrentWeek, onCancel, onMakeUp, onSkip, onUnskip }) {
  const dayName = FULL_DAY_NAMES[dayId] || dayId;
  const btn = (extra) => ({
    width: '100%', minHeight: 'var(--tap-target)', padding: '12px 14px',
    borderRadius: 'var(--radius-lg)', border: 'none',
    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em', textAlign: 'center', ...extra,
  });

  return (
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(var(--safe-area-top) + 20px) 20px calc(var(--safe-area-bottom) + 20px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${dayName}, week ${week}`}
        style={{
          background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-xl)', padding: 'var(--space-6) var(--space-5)',
          width: '100%', maxWidth: 340, textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          animation: 'popIn 0.18s cubic-bezier(0.2,0.9,0.3,1) both',
        }}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700,
          color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)',
        }}>{dayName} · Week {week}</h3>

        <p style={{
          fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
          lineHeight: 1.6, marginBottom: 'var(--space-5)',
        }}>
          {isMarkedSkipped
            ? 'This day is marked as skipped. It counts toward closing the week but earns nothing.'
            : `You didn't train ${dayName}. Log it now, or mark it skipped so the week can close without crediting a session.`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {isMarkedSkipped ? (
            <button onClick={onUnskip} style={btn({
              background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-medium)',
            })}>UNDO SKIP</button>
          ) : (
            <>
              <button onClick={onMakeUp} style={btn({
                background: 'linear-gradient(135deg, var(--color-action-hover), var(--color-action))',
                color: 'var(--color-bg-primary)',
                boxShadow: '0 4px 18px rgba(0,229,255,0.2)',
              })}>
                {isCurrentWeek ? 'I DID IT — LOG IT' : 'LOG IT FOR THAT WEEK'}
              </button>
              <button onClick={onSkip} style={btn({
                background: 'rgba(255,23,68,0.1)', color: 'var(--color-destructive)',
                border: '1px solid rgba(255,23,68,0.25)',
              })}>MARK AS SKIPPED</button>
            </>
          )}
          <button onClick={onCancel} style={btn({
            background: 'transparent', color: 'var(--color-text-tertiary)',
            minHeight: 40,
          })}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

function FinishConfirmModal({ state, exercises, onCancel, onConfirm }) {
  const { todayExDone, currentWeek } = state;
  const total = exercises.length;
  const done = todayExDone.length;
  const missed = exercises.filter(e => !todayExDone.includes(e.id)).map(e => e.name);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--card-border)',
        borderRadius: 18, padding: '24px 20px',
        width: 'calc(100% - 40px)', maxWidth: 340, textAlign: 'center'
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Finish Today's Session?</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{done}/{total} exercises completed</p>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          This will lock in your session for Week {currentWeek}.
          {missed.length > 0 ? `\n\nSkipped: ${missed.join(', ')}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text2)',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700
          }}>CANCEL</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
            color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700
          }}>FINISH ⚔️</button>
        </div>
      </div>
    </div>
  );
}
