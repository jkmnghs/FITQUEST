import React, { useState, useEffect } from 'react';
import { EXERCISES } from '../data/gameData';
import { getSetsForWeek, getWeightForExercise, convertWeight } from '../utils/gameLogic';
import ExerciseModal from './ExerciseModal';

export default function WorkoutTab({ state, onCompleteExercise, onFinishSession, onStartSession, onModalChange }) {
  const [viewingWeek, setViewingWeek] = useState(state.currentWeek);
  const [activeExId, setActiveExId] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  // Stores per-exercise set arrays so checked sets survive modal close/reopen
  const [inProgressSets, setInProgressSets] = useState({});

  // Keep viewingWeek in sync when the program advances to a new week
  useEffect(() => {
    setViewingWeek(state.currentWeek);
  }, [state.currentWeek]);

  // Tell App when any modal/overlay is open so it can hide the tab bar
  useEffect(() => {
    onModalChange?.(!!activeExId || showFinishConfirm);
  }, [activeExId, showFinishConfirm]);

  const w = viewingWeek;
  const isCurrentWeek = w === state.currentWeek;
  const isDeload = w === 9;
  const { unit, liftWeights, todayExDone, todayExDetails, todaySessionFinished, weekProgress, overloadSuggestions } = state;

  const wp = weekProgress?.[w] || { count: 0, dates: [], completed: false, sessions: [] };

  function jumpToWeek(n) { setViewingWeek(n); }

  const todayDone = isCurrentWeek ? (todayExDone || []) : [];

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
          {['M', 'W', 'F'].map((d, i) => {
            const done = i < wp.count;
            const isCur = i === wp.count && !wp.completed && isCurrentWeek;
            return (
              <div key={d} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${done ? 'var(--green)' : isCur ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                background: done ? 'var(--green)' : 'transparent',
                color: done ? 'var(--bg)' : isCur ? 'var(--cyan)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                animation: isCur ? 'rankPulse 2s infinite' : 'none'
              }}>{done ? '✓' : d}</div>
            );
          })}
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Week {w} Sessions</div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
            color: wp.completed ? 'var(--green)' : 'var(--cyan)'
          }}>
            {wp.completed ? '✓ COMPLETE' : `${wp.count}/3 DONE`}
          </div>
        </div>
      </div>

      {/* Week map (12 pips) */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap', padding: '0 10px' }}>
        {Array.from({ length: 12 }, (_, i) => {
          const wn = i + 1;
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
            }}>{wn}</div>
          );
        })}
      </div>

      {/* Session timer */}
      {state.sessionStartTime && !state.todaySessionFinished && isCurrentWeek && (
        <SessionTimerBar startTime={state.sessionStartTime} />
      )}

      {/* Exercise label */}
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
        letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase'
      }}>
        Full Body Session
      </div>

      {/* Exercise cards */}
      {EXERCISES.map(ex => {
        const isDone = todayDone.includes(ex.id);
        const sug = overloadSuggestions?.[ex.id];
        const wt = getWeightForExercise(ex, w, liftWeights);
        const convWt = convertWeight(wt, unit);
        const setsCount = getSetsForWeek(ex, w);

        return (
          <div key={ex.id}
            onClick={() => {
              if (!isCurrentWeek || todaySessionFinished) return;
              onStartSession();
              setActiveExId(ex.id);
            }}
            style={{
              background: 'var(--card)', border: '1px solid var(--card-border)',
              borderRadius: 16, padding: '14px 16px', marginBottom: 10,
              cursor: isCurrentWeek && !todaySessionFinished ? 'pointer' : 'default',
              opacity: isDone ? 0.55 : 1, position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              transition: 'opacity 0.3s, border-color 0.2s'
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
                  {sug === 'increase' && <Badge color="var(--green)" bg="rgba(0,230,118,0.12)" border="rgba(0,230,118,0.2)">↑ +2.5</Badge>}
                  {sug === 'repeat' && <Badge color="var(--gold)" bg="rgba(255,214,0,0.1)" border="rgba(255,214,0,0.2)">= SAME</Badge>}
                  {sug === 'deload' && <Badge color="var(--red)" bg="rgba(255,23,68,0.1)" border="rgba(255,23,68,0.2)">↓ DELOAD</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{ex.note}</div>
              </div>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--fire2)',
                background: 'var(--fire-glow)', padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap', marginLeft: 8
              }}>
                +{isDeload ? 10 : ex.sets * 5 + 10} XP max
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
          </div>
        );
      })}

      {/* Finish session area */}
      {isCurrentWeek && !todaySessionFinished && todayDone.length > 0 && (
        <FinishArea
          state={state}
          onFinish={() => setShowFinishConfirm(true)}
        />
      )}

      {/* Already done or not current week */}
      {isCurrentWeek && todaySessionFinished && (
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
      {showFinishConfirm && (
        <FinishConfirmModal
          state={state}
          onCancel={() => setShowFinishConfirm(false)}
          onConfirm={() => { setShowFinishConfirm(false); onFinishSession(); }}
        />
      )}
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

function FinishArea({ state, onFinish }) {
  const { todayExDone, todayExDetails, currentWeek } = state;
  const totalEx = EXERCISES.length;
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
        {EXERCISES.map(e => {
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

function FinishConfirmModal({ state, onCancel, onConfirm }) {
  const { todayExDone, currentWeek } = state;
  const total = EXERCISES.length;
  const done = todayExDone.length;
  const missed = EXERCISES.filter(e => !todayExDone.includes(e.id)).map(e => e.name);

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
