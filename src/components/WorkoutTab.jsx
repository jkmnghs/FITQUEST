import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getSetsForWeek, getWeightForExercise, convertWeight, getPhase, isDeloadWeek } from '../utils/gameLogic';
import ExerciseModal from './ExerciseModal';
import ProgramCompleteModal from './ProgramCompleteModal';

// Full categorized exercise library (gym + home)
const EXERCISE_LIBRARY = [
  {
    category: 'Chest', icon: '🫁',
    exercises: [
      { id: 'bench',       name: 'Barbell Bench Press',    startKg: 42.5 },
      { id: 'incbench',    name: 'Incline Barbell Press',  startKg: 35 },
      { id: 'decbench',    name: 'Decline Bench Press',    startKg: 45 },
      { id: 'dbbench',     name: 'DB Bench Press',         startKg: 16 },
      { id: 'incdbench',   name: 'Incline DB Press',       startKg: 14 },
      { id: 'cablefly',    name: 'Cable Chest Fly',        startKg: 10 },
      { id: 'pecdeck',     name: 'Pec Deck',               startKg: 35 },
      { id: 'chestdip',    name: 'Chest Dip',              startKg: 0, isBodyweight: true },
      { id: 'pushup',      name: 'Push-up',                startKg: 0, isBodyweight: true },
      { id: 'widepushup',  name: 'Wide Push-up',           startKg: 0, isBodyweight: true },
      { id: 'pikepushup',  name: 'Pike Push-up',           startKg: 0, isBodyweight: true },
    ],
  },
  {
    category: 'Back', icon: '↩️',
    exercises: [
      { id: 'pulldown',    name: 'Lat Pulldown',           startKg: 47.5 },
      { id: 'cablerow',    name: 'Seated Cable Row',       startKg: 40 },
      { id: 'bbrow',       name: 'Barbell Row',            startKg: 50 },
      { id: 'dbrow',       name: 'DB Bent-Over Row',       startKg: 14 },
      { id: 'singlerow',   name: 'Single-arm DB Row',      startKg: 14 },
      { id: 'tbarrow',     name: 'T-Bar Row',              startKg: 40 },
      { id: 'facepull',    name: 'Face Pull',              startKg: 15 },
      { id: 'strtpull',    name: 'Straight-arm Pulldown',  startKg: 20 },
      { id: 'pullup',      name: 'Pull-up',                startKg: 0, isBodyweight: true },
      { id: 'chinup',      name: 'Chin-up',                startKg: 0, isBodyweight: true },
      { id: 'hingerow',    name: 'Inverted Row',           startKg: 0, isBodyweight: true },
    ],
  },
  {
    category: 'Legs', icon: '🦵',
    exercises: [
      { id: 'squat',       name: 'Barbell Squat',          startKg: 45 },
      { id: 'deadlift',    name: 'Conventional Deadlift',  startKg: 60 },
      { id: 'legpress',    name: 'Leg Press',              startKg: 80 },
      { id: 'rdl',         name: 'Romanian Deadlift',      startKg: 55 },
      { id: 'legcurl',     name: 'Leg Curl Machine',       startKg: 40 },
      { id: 'legext',      name: 'Leg Extension',          startKg: 35 },
      { id: 'hipthrust',   name: 'Barbell Hip Thrust',     startKg: 40 },
      { id: 'calfraise',   name: 'Standing Calf Raise',    startKg: 20 },
      { id: 'bulgsplit',   name: 'Bulgarian Split Squat',  startKg: 10 },
      { id: 'dblunge',     name: 'DB Reverse Lunge',       startKg: 10 },
      { id: 'dbsquat',     name: 'DB Goblet Squat',        startKg: 16 },
      { id: 'dbrdl',       name: 'DB Romanian Deadlift',   startKg: 16 },
      { id: 'bwsquat',     name: 'Bodyweight Squat',       startKg: 0, isBodyweight: true },
      { id: 'lunge',       name: 'Reverse Lunge',          startKg: 0, isBodyweight: true },
      { id: 'walklunge',   name: 'Walking Lunge',          startKg: 0, isBodyweight: true },
      { id: 'stepup',      name: 'Step-up',                startKg: 0, isBodyweight: true },
      { id: 'glute',       name: 'Glute Bridge',           startKg: 0, isBodyweight: true },
      { id: 'jumpsquat',   name: 'Jump Squat',             startKg: 0, isBodyweight: true },
    ],
  },
  {
    category: 'Shoulders', icon: '⚡',
    exercises: [
      { id: 'bbohp',       name: 'Barbell Overhead Press', startKg: 30 },
      { id: 'ohp',         name: 'DB Overhead Press',      startKg: 15 },
      { id: 'dbohp',       name: 'Seated DB Press',        startKg: 12 },
      { id: 'arnoldpress', name: 'Arnold Press',           startKg: 10 },
      { id: 'machohp',     name: 'Machine Shoulder Press', startKg: 30 },
      { id: 'lateraise',   name: 'DB Lateral Raise',       startKg: 6 },
      { id: 'cablelat',    name: 'Cable Lateral Raise',    startKg: 5 },
      { id: 'frontraise',  name: 'DB Front Raise',         startKg: 6 },
      { id: 'reardelt',    name: 'Rear Delt Fly',          startKg: 6 },
    ],
  },
  {
    category: 'Arms', icon: '💪',
    exercises: [
      { id: 'bbcurl',      name: 'Barbell Bicep Curl',     startKg: 20 },
      { id: 'dbcurl',      name: 'DB Bicep Curl',          startKg: 10 },
      { id: 'hammercurl',  name: 'Hammer Curl',            startKg: 10 },
      { id: 'cablecurl',   name: 'Cable Curl',             startKg: 15 },
      { id: 'preachcurl',  name: 'Preacher Curl',          startKg: 15 },
      { id: 'cgbench',     name: 'Close-Grip Bench Press', startKg: 35 },
      { id: 'tricpush',    name: 'Tricep Pushdown',        startKg: 20 },
      { id: 'ohtriext',    name: 'Overhead Tricep Ext.',   startKg: 12 },
      { id: 'skullcrush',  name: 'Skull Crushers',         startKg: 20 },
      { id: 'dipbench',    name: 'Tricep Dip',             startKg: 0, isBodyweight: true },
      { id: 'diamondpush', name: 'Diamond Push-up',        startKg: 0, isBodyweight: true },
    ],
  },
  {
    category: 'Core', icon: '🔥',
    exercises: [
      { id: 'plank',       name: 'Plank',                  startKg: 0, isPlank: true },
      { id: 'sideplank',   name: 'Side Plank',             startKg: 0, isPlank: true },
      { id: 'hollowbody',  name: 'Hollow Body Hold',       startKg: 0, isPlank: true },
      { id: 'mtnclimp',    name: 'Mountain Climbers',      startKg: 0, isBodyweight: true },
      { id: 'abrollout',   name: 'Ab Wheel Rollout',       startKg: 0, isBodyweight: true },
      { id: 'hanglegrise', name: 'Hanging Leg Raise',      startKg: 0, isBodyweight: true },
      { id: 'cablecrnch',  name: 'Cable Crunch',           startKg: 20 },
      { id: 'rustwist',    name: 'Russian Twist',          startKg: 0, isBodyweight: true },
      { id: 'deadbug',     name: 'Dead Bug',               startKg: 0, isBodyweight: true },
      { id: 'crunch',      name: 'Crunch',                 startKg: 0, isBodyweight: true },
      { id: 'biccrnch',    name: 'Bicycle Crunch',         startKg: 0, isBodyweight: true },
      { id: 'legrise',     name: 'Lying Leg Raise',        startKg: 0, isBodyweight: true },
      { id: 'vup',         name: 'V-Up',                   startKg: 0, isBodyweight: true },
      { id: 'superman',    name: 'Superman Hold',          startKg: 0, isBodyweight: true },
    ],
  },
  {
    category: 'Cardio', icon: '🏃',
    exercises: [
      { id: 'burpees',     name: 'Burpees',                startKg: 0, isBodyweight: true },
      { id: 'jumpjack',    name: 'Jumping Jacks',          startKg: 0, isBodyweight: true },
      { id: 'highnknee',   name: 'High Knees',             startKg: 0, isBodyweight: true },
      { id: 'boxjump',     name: 'Box Jump',               startKg: 0, isBodyweight: true },
      { id: 'ropewave',    name: 'Battle Rope Waves',      startKg: 0, isBodyweight: true },
    ],
  },
];

export default function WorkoutTab({ state, exercises, currentDayName, isRestDay, nextTrainingDayKey, onCompleteExercise, onFinishSession, onStartSession, onModalChange, onChangeProgram, onSwapExercise, onDeleteExercise, onOpenCoach }) {
  const [viewingWeek, setViewingWeek] = useState(state.currentWeek);
  const [activeExId, setActiveExId] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showProgramComplete, setShowProgramComplete] = useState(false);
  const [inProgressSets, setInProgressSets] = useState({});
  const [showRestWarning, setShowRestWarning] = useState(false);
  const [overrideRestDay, setOverrideRestDay] = useState(false);
  // Swipe state: tracks which card is swiped open
  const [swipedId, setSwipedId] = useState(null);

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
    onModalChange?.(!!activeExId || showFinishConfirm || !!swapTargetId || showProgramSwitcher);
  }, [activeExId, showFinishConfirm, swapTargetId, showProgramSwitcher]);

  // Reset picker filters whenever the picker opens
  useEffect(() => {
    if (swapTargetId) { setPickerCategory('All'); setPickerSearch(''); }
  }, [swapTargetId]);

  const w = viewingWeek;
  const isCurrentWeek = w === state.currentWeek;
  const isDeload = isDeloadWeek(w);
  const { unit, liftWeights, todayExDone, todayExDetails, todaySessionFinished, weekProgress, overloadSuggestions } = state;

  const wp = weekProgress?.[w] || { count: 0, dates: [], completed: false, sessions: [] };

  const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_LABELS = { mon: 'M', tue: 'Tu', wed: 'W', thu: 'Th', fri: 'F', sat: 'Sa', sun: 'Su' };
  const sortedTrainingDays = state.trainingDays?.length
    ? [...state.trainingDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    : ['mon', 'wed', 'fri'];
  const totalSessions = sortedTrainingDays.length;

  function jumpToWeek(n) { setViewingWeek(n); }

  // On rest days (unless user chose to train), nothing is "done" — it's a preview
  const activeRestDay = isRestDay && !overrideRestDay;
  const todayDone = (activeRestDay || !isCurrentWeek) ? [] : (todayExDone || []);

  return (
    <div>
      {/* Week selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
        <NavBtn onClick={() => viewingWeek > 1 && setViewingWeek(v => v - 1)}>‹</NavBtn>
        <span style={{
          fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
          color: isCurrentWeek ? 'var(--cyan)' : 'var(--purple)', minWidth: 130, textAlign: 'center'
        }}>
          WEEK {w}{!isCurrentWeek ? ' (VIEW)' : ''}
        </span>
        <NavBtn onClick={() => viewingWeek < 12 && setViewingWeek(v => v + 1)}>›</NavBtn>
      </div>

      {/* Session tracker dots */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        marginBottom: 12, padding: '10px 14px',
        background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(() => {
            const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
            const todayIdx = sortedTrainingDays.indexOf(todayKey);
            const curIdx = isCurrentWeek && !wp.completed
              ? (todayIdx >= 0 ? Math.max(wp.count, todayIdx) : wp.count)
              : -1;
            return sortedTrainingDays.map((dayId, i) => {
              const done = i < wp.count;
              const isCur = i === curIdx;
              return (
                <div key={dayId} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: `2px solid ${done ? 'var(--green)' : isCur ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                  background: done ? 'var(--green)' : 'transparent',
                  color: done ? 'var(--bg)' : isCur ? 'var(--cyan)' : 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                  animation: isCur ? 'rankPulse 2s infinite' : 'none'
                }}>{done ? '✓' : DAY_LABELS[dayId]}</div>
              );
            });
          })()}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Week {w} Sessions</div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
            color: wp.completed ? 'var(--green)' : 'var(--cyan)'
          }}>
            {wp.completed ? '✓ COMPLETE' : `${wp.count}/${totalSessions} DONE`}
          </div>
        </div>
      </div>

      {/* Week map — 12 pips for the current cycle */}
      {(() => {
        const cycleStart = Math.floor((state.currentWeek - 1) / 12) * 12 + 1;
        return (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap', padding: '0 10px' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const wn = cycleStart + i;
              const wkp = weekProgress?.[wn];
              let bg = 'rgba(255,255,255,0.02)', border = 'rgba(255,255,255,0.06)', color = 'var(--text3)';
              if (wkp?.completed) { bg = 'var(--green-glow)'; border = 'rgba(0,230,118,0.3)'; color = 'var(--green)'; }
              if (wkp?.count > 0 && !wkp?.completed) { bg = 'var(--gold-glow)'; border = 'rgba(255,214,0,0.3)'; color = 'var(--gold)'; }
              if (wn === state.currentWeek) { bg = 'var(--cyan-glow)'; border = 'rgba(0,229,255,0.3)'; color = 'var(--cyan)'; }
              const isViewing = wn === viewingWeek && wn !== state.currentWeek;
              return (
                <div key={wn} onClick={() => jumpToWeek(wn)} style={{
                  width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700,
                  background: bg, border: `1px solid ${border}`, color,
                  boxShadow: isViewing ? '0 0 0 2px var(--purple)' : 'none',
                  transition: 'all 0.2s'
                }}>{i + 1}</div>
              );
            })}
          </div>
        );
      })()}

      {/* Rest day banner */}
      {activeRestDay && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(179,136,255,0.07), rgba(0,229,255,0.04))',
          border: '1px solid rgba(179,136,255,0.18)',
          borderRadius: 12, marginBottom: 14, overflow: 'hidden',
        }}>
          {/* Main row */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🌙</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 3, letterSpacing: 0.8 }}>
                REST DAY — RECOVERY
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                Next session:{' '}
                <strong style={{ color: 'var(--cyan)' }}>
                  {{ sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' }[nextTrainingDayKey] || 'upcoming'}
                </strong>
                . Preview below.
              </div>
            </div>
            <button
              onClick={() => setShowRestWarning(w => !w)}
              style={{
                padding: '7px 12px', borderRadius: 8, border: 'none', flexShrink: 0,
                background: 'rgba(179,136,255,0.15)', color: 'var(--purple)',
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                cursor: 'pointer',
              }}
            >
              TRAIN TODAY {showRestWarning ? '▲' : '▼'}
            </button>
          </div>

          {/* Expandable warning + action panel */}
          {showRestWarning && (
            <div style={{
              borderTop: '1px solid rgba(179,136,255,0.15)',
              padding: '14px 16px',
              background: 'rgba(0,0,0,0.2)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>
                ⚠️ <strong style={{ color: 'var(--gold)' }}>Overtraining risk.</strong> Rest days are when muscles actually grow.
                Training today may reduce XP and increase injury risk. It is strongly recommended to{' '}
                <strong style={{ color: 'var(--cyan)' }}>consult your AI Coach first.</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { if (onOpenCoach) onOpenCoach(); }}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(179,136,255,0.18))',
                    color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: 0.8,
                  }}
                >
                  🤖 ASK AI COACH
                </button>
                <button
                  onClick={() => { setOverrideRestDay(true); setShowRestWarning(false); }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 9,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                    color: 'var(--text3)', fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: 0.5,
                  }}
                >
                  SKIP & TRAIN
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session timer */}
      {!activeRestDay && state.sessionStartTime && !state.todaySessionFinished && isCurrentWeek && (
        <SessionTimerBar startTime={state.sessionStartTime} />
      )}

      {/* Manual start session button */}
      {!activeRestDay && isCurrentWeek && !state.sessionStartTime && !state.todaySessionFinished && (
        <button onClick={onStartSession} style={{
          width: '100%', padding: '11px 0', marginBottom: 14,
          borderRadius: 12, cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(179,136,255,0.12))',
          border: '1px solid rgba(0,229,255,0.2)',
          fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
          color: 'var(--cyan)', letterSpacing: 0.8
        }}>
          ▶ START SESSION TIMER
        </button>
      )}

      {/* Phase + session label */}
      {(() => {
        const phase = getPhase(w);
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
              color: activeRestDay ? 'var(--purple)' : 'var(--text2)',
              letterSpacing: 1.5, textTransform: 'uppercase'
            }}>
              {currentDayName || (activeRestDay ? 'UPCOMING SESSION' : "TODAY'S SESSION")}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(179,136,255,0.08)', border: '1px solid rgba(179,136,255,0.15)',
              borderRadius: 8, padding: '3px 9px'
            }}>
              <span style={{ fontSize: 12 }}>{phase.icon}</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, color: 'var(--purple)', letterSpacing: 0.8 }}>
                {phase.name}
              </span>
            </div>
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
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 5, letterSpacing: 0.8 }}>
            🧘 DELOAD WEEK — RECOVERY MODE
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            80% weight, 2 sets per exercise. This week <strong style={{ color: 'var(--text)' }}>rebuilds your tendons and CNS</strong> — lighter loads now unlock stronger lifts in Weeks 10-12. Don't skip it.
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

        return (
          <div key={ex.id} style={{ position: 'relative', marginBottom: 10 }}>
            {/* Action buttons — revealed when card slides left (swipe or mouse-drag) */}
            {!isDone && (
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'stretch', zIndex: 2, borderRadius: 16,
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setSwipedId(null); setSwapTargetId(ex.id); }}
                style={{
                  width: 72, border: 'none', background: 'rgba(0,229,255,0.18)',
                  color: 'var(--cyan)', cursor: 'pointer', borderRadius: '16px 0 0 16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                }}
              ><span style={{ fontSize: 18 }}>🔄</span>SWAP</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove ${ex.name} from your program?`)) {
                    onDeleteExercise?.(ex.id);
                    setSwipedId(null);
                  }
                }}
                style={{
                  width: 72, border: 'none', background: 'rgba(255,23,68,0.2)',
                  color: 'var(--red)', cursor: 'pointer', borderRadius: '0 16px 16px 0',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                }}
              ><span style={{ fontSize: 18 }}>🗑️</span>DELETE</button>
            </div>
            )}

            {/* Swipeable card — zIndex above buttons so it slides away to reveal them */}
            <div
              onTouchStart={e => {
                if (isDone) return;
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={e => {
                if (isDone) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
                if (dy > 30) return;
                if (dx < -40) setSwipedId(ex.id);
                else if (dx > 20) setSwipedId(null);
              }}
              onMouseDown={e => {
                if (isDone || e.button !== 0) return;
                mouseStartX.current = e.clientX;
              }}
              onMouseUp={e => {
                if (isDone || mouseStartX.current === null) return;
                const dx = e.clientX - mouseStartX.current;
                mouseStartX.current = null;
                if (dx < -40) setSwipedId(ex.id);
                else if (dx > 20) setSwipedId(null);
              }}
              onMouseLeave={() => { mouseStartX.current = null; }}
              onClick={() => {
                if (isSwiped) { setSwipedId(null); return; }
                if (!isCurrentWeek || todaySessionFinished) return;
                setActiveExId(ex.id);
              }}
              style={{
                background: isDone ? 'rgba(0,230,118,0.04)' : 'var(--card)',
                border: `1px solid ${isDone ? 'rgba(0,230,118,0.15)' : isSwiped ? 'rgba(0,229,255,0.25)' : 'var(--card-border)'}`,
                borderRadius: 16, padding: '14px 16px',
                cursor: isCurrentWeek && !todaySessionFinished ? 'pointer' : 'default',
                filter: isDone ? 'brightness(0.7)' : 'none',
                position: 'relative', overflow: 'hidden',
                backdropFilter: 'blur(20px)', zIndex: 3,
                transform: isSwiped ? 'translateX(-144px)' : 'translateX(0)',
                transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), filter 0.3s, border-color 0.2s',
              }}
            >
            {/* Top line on hover */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg,transparent,var(--cyan),transparent)',
              opacity: isDone ? 1 : 0
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Exo 2, sans-serif', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isDone ? '✅ ' : ''}{ex.name}
                  {!isDone && sug === 'increase' && <Badge color="var(--green)" bg="rgba(0,230,118,0.12)" border="rgba(0,230,118,0.2)">↑ +2.5</Badge>}
                  {!isDone && sug === 'repeat' && <Badge color="var(--gold)" bg="rgba(255,214,0,0.1)" border="rgba(255,214,0,0.2)">= SAME</Badge>}
                  {!isDone && sug === 'deload' && <Badge color="var(--red)" bg="rgba(255,23,68,0.1)" border="rgba(255,23,68,0.2)">↓ DELOAD</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{ex.note}</div>
              </div>
              {isDone ? (
                <div style={{
                  fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--green)',
                  background: 'var(--green-glow)', padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap', marginLeft: 8,
                  border: '1px solid rgba(0,230,118,0.25)'
                }}>
                  ✓ DONE
                </div>
              ) : (
                <div style={{
                  fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--fire2)',
                  background: 'var(--fire-glow)', padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap', marginLeft: 8
                }}>
                  +{isDeload ? 10 : ex.sets * 5 + 10} XP max
                </div>
              )}
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
          fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
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
        <div style={{ textAlign: 'center', padding: 16, fontFamily: 'Orbitron', fontSize: 11, color: 'var(--green)', letterSpacing: 1 }}>
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
            onCompleteExercise(id, sets);
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
            onFinishSession();
            if (isLastSession) setTimeout(() => setShowProgramComplete(true), 2000);
          }}
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
        // Flat list from library, annotated with category/icon, deduplicated by id
        const allExercises = EXERCISE_LIBRARY.flatMap(cat =>
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
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
          }} onClick={() => setSwapTargetId(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '100%', background: 'var(--bg)',
              border: '1px solid rgba(0,229,255,0.15)', borderRadius: '20px 20px 0 0',
              padding: '20px 16px 0',
              animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 4 }}>
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
                {['All', ...EXERCISE_LIBRARY.map(c => c.category)].map(cat => (
                  <button key={cat} onClick={() => setPickerCategory(cat)} style={{
                    padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
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
                    onSwapExercise?.(isAdd ? '__add__' : swapTargetId, sub);
                    setSwapTargetId(null);
                  }} style={{
                    padding: '11px 14px', borderRadius: 11, textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: 'var(--text)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontFamily: 'Exo 2, sans-serif', fontSize: 14, fontWeight: 600, flex: 1 }}>{sub.name}</span>
                    {(sub.isBodyweight || sub.isPlank) && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>BW</span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => setSwapTargetId(null)} style={{
                margin: '10px 0 28px', width: '100%', padding: 10, borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'var(--text3)',
                fontFamily: 'Orbitron', fontSize: 9, cursor: 'pointer', flexShrink: 0,
              }}>CANCEL</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Sub-components

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text2)', fontSize: 18,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>{children}</button>
  );
}

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
      fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700,
      padding: '2px 6px', borderRadius: 4, letterSpacing: 0.3,
      color, background: bg, border: `1px solid ${border}`
    }}>{children}</span>
  );
}

function SessionTimerBar({ startTime }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startTime]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginBottom: 10, padding: '8px 14px',
      background: 'rgba(255,109,0,0.08)', border: '1px solid rgba(255,109,0,0.2)',
      borderRadius: 10, fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700, color: 'var(--fire2)'
    }}>
      ⏱ {`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`}
    </div>
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
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
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
          fontFamily: 'Orbitron', fontSize: 28, fontWeight: 900,
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
        fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
        color: 'var(--bg)', letterSpacing: 0.8, cursor: 'pointer',
        boxShadow: allDone ? '0 4px 18px var(--green-glow)' : '0 4px 18px var(--fire-glow)'
      }}>
        {allDone && completionPct >= 95 ? 'FINISH SESSION ⚔️ (PERFECT!)' : 'FINISH SESSION ⚔️'}
      </button>
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
        <h3 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Finish Today's Session?</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{done}/{total} exercises completed</p>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          This will lock in your session for Week {currentWeek}.
          {missed.length > 0 ? `\n\nSkipped: ${missed.join(', ')}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text2)',
            fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700
          }}>CANCEL</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
            color: 'var(--bg)', fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700
          }}>FINISH ⚔️</button>
        </div>
      </div>
    </div>
  );
}
