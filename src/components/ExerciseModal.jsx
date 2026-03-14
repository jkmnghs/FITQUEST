import React, { useState, useEffect, useRef } from 'react';
import { EXERCISES, FORM_TIPS } from '../data/gameData';
import { getSetsForWeek, getWeightForExercise, convertWeight, kgFromDisplay } from '../utils/gameLogic';
import RestTimer from './RestTimer';

function makeDefaultSets(ex, count, weightKg) {
  return Array.from({ length: count }, (_, i) => ({
    idx: i, weightKg, reps: '', rpe: 8, time: '', done: false,
    isExtra: i >= ex.sets
  }));
}

export default function ExerciseModal({ exId, week, unit, liftWeights, todayExDone, todayExDetails, savedSets, onSetsChange, onClose, onComplete }) {
  const ex = EXERCISES.find(e => e.id === exId);
  const baseSets = getSetsForWeek(ex, week);
  const baseWeightKg = getWeightForExercise(ex, week, liftWeights);
  const displayWt = convertWeight(baseWeightKg, unit);

  const alreadyDone = todayExDone.includes(exId);
  const det = todayExDetails[exId];
  const isDeload = week === 9;
  const formTips = FORM_TIPS[exId] || [];
  const randomTip = formTips[Math.floor(Math.random() * formTips.length)];

  const [sets, setSets] = useState(() => savedSets || makeDefaultSets(ex, baseSets, displayWt));
  const [timer, setTimer] = useState(null);
  const [tipIdx, setTipIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Report every change back to WorkoutTab so sets survive modal close
  useEffect(() => {
    onSetsChange?.(exId, sets);
  }, [sets]); // eslint-disable-line

  function addExtraSet() {
    setSets(prev => [
      ...prev,
      { idx: prev.length, weightKg: displayWt, reps: '', rpe: 8, time: '', done: false, isExtra: true }
    ]);
  }

  function updateSet(i, field, value) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function toggleSetDone(i) {
    setSets(prev => {
      const next = prev.map((s, idx) => idx === i ? { ...s, done: !s.done } : s);
      // Start rest timer if we just checked a set (not the last)
      if (!prev[i].done && i < prev.length - 1) {
        setTimeout(() => {
          setTimer({
            exName: ex.name,
            setInfo: `Rest after Set ${i + 1} of ${prev.length}`,
            seconds: ex.restSec
          });
        }, 300);
      }
      return next;
    });
  }

  function handleComplete() {
    // Convert display weights to kg
    const processedSets = sets.map(s => ({
      ...s,
      weightKg: unit === 'lbs' ? kgFromDisplay(parseFloat(s.weightKg) || 0, unit) : (parseFloat(s.weightKg) || 0),
      reps: parseFloat(s.reps) || 0,
      rpe: parseInt(s.rpe) || 0,
      time: parseFloat(s.time) || 0
    }));
    onComplete(exId, processedSets);
    onClose();
  }


  function cycleTip() {
    setTipIdx(i => (i + 1) % formTips.length);
  }

  const doneCount = sets.filter(s => s.done).length;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{
          width: '100%', maxWidth: 430, maxHeight: '92vh',
          background: 'var(--bg2)',
          borderRadius: '22px 22px 0 0',
          border: '1px solid var(--card-border)', borderBottom: 'none',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
          paddingBottom: 'calc(16px + var(--safe-bottom))'
        }}>
          {/* Handle */}
          <div style={{ width: 34, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 4, margin: '10px auto 0' }} />

          {/* Header */}
          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700 }}>{ex.name}</h2>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 9, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text2)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
          </div>

          <div style={{ padding: '0 18px 18px' }}>
            {/* Note */}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
              {ex.note} • Target: RPE {isDeload ? '5-6' : ex.rpe} • Rest: {ex.rest}
            </div>

            {/* Form tip */}
            {formTips.length > 0 && (
              <div onClick={cycleTip} style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(179,136,255,0.06)',
                border: '1px solid rgba(179,136,255,0.15)',
                cursor: 'pointer', userSelect: 'none'
              }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--purple)', letterSpacing: 1, marginBottom: 4 }}>
                  💡 FORM TIP (tap for next)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                  {formTips[tipIdx]}
                </div>
              </div>
            )}

            {alreadyDone && det ? (
              // Already completed
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
                  COMPLETED
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {det.setsCompleted}/{det.setsPrescribed} sets
                  {det.extraSets > 0 ? ` (+${det.extraSets} extra)` : ''}
                  {det.volume > 0 ? ` • ${Math.round(det.volume)} kg volume` : ''}
                </div>
                {det.maxRPE > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Max RPE: {det.maxRPE}</div>
                )}
              </div>
            ) : (
              <>
                {/* Sets */}
                <div style={{ background: 'var(--card)', borderRadius: 12, padding: 12, marginBottom: 12, border: '1px solid var(--card-border)' }}>
                  {ex.isPlank ? (
                    <PlankSets sets={sets} onToggle={toggleSetDone} onUpdate={updateSet} />
                  ) : (
                    <WeightSets sets={sets} unit={unit} displayWt={displayWt} ex={ex}
                      onToggle={toggleSetDone} onUpdate={updateSet} />
                  )}
                  <button onClick={addExtraSet} style={{
                    width: '100%', padding: 8, marginTop: 6,
                    border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 9,
                    background: 'transparent', color: 'var(--text3)',
                    fontSize: 13, fontWeight: 600
                  }}>+ Add Extra Set</button>
                </div>

                {/* Progress indicator */}
                <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
                  {doneCount}/{sets.length} sets checked
                </div>

                {/* Complete button */}
                <button onClick={() => setShowConfirm(true)} style={{
                  width: '100%', padding: 14, border: 'none', borderRadius: 13,
                  background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
                  fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
                  color: 'var(--bg)', letterSpacing: 0.8,
                  boxShadow: '0 4px 18px var(--cyan-glow)'
                }}>
                  COMPLETE EXERCISE ⚔️
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      <RestTimer
        visible={!!timer}
        exName={timer?.exName}
        setInfo={timer?.setInfo}
        seconds={timer?.seconds || 0}
        onSkip={() => setTimer(null)}
        onDone={() => setTimer(null)}
      />

      {/* Confirm dialog */}
      {showConfirm && (
        <ConfirmModal
          exName={ex.name}
          doneCount={doneCount}
          totalSets={sets.length}
          baseSets={baseSets}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => { setShowConfirm(false); handleComplete(); }}
        />
      )}
    </>
  );
}

function WeightSets({ sets, unit, displayWt, ex, onToggle, onUpdate }) {
  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '20px 3fr 3fr 2fr 36px',
        gap: 6, marginBottom: 6, paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {['#', unit.toUpperCase(), 'REPS', 'RPE', ''].map((h, i) => (
          <span key={i} style={{ fontFamily: 'Orbitron', fontSize: 8, color: 'var(--text3)', textAlign: 'center', fontWeight: 600, letterSpacing: 0.5 }}>{h}</span>
        ))}
      </div>
      {sets.map((s, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 3fr 3fr 2fr 36px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: s.isExtra ? 'var(--cyan)' : 'var(--text3)', textAlign: 'center', fontWeight: 600 }}>
            {i + 1}{s.isExtra ? '+' : ''}
          </span>
          <input
            type="number" inputMode="decimal"
            value={s.weightKg}
            onChange={e => onUpdate(i, 'weightKg', e.target.value)}
            placeholder={String(displayWt)}
            style={inputStyle}
          />
          <input
            type="number" inputMode="numeric"
            value={s.reps}
            onChange={e => onUpdate(i, 'reps', e.target.value)}
            placeholder={String(ex.reps)}
            style={inputStyle}
          />
          <select value={s.rpe} onChange={e => onUpdate(i, 'rpe', e.target.value)} style={selectStyle}>
            <option value="">-</option>
            {[6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={() => onToggle(i)} style={{
            width: 36, height: 38, borderRadius: 9, flexShrink: 0,
            border: `2px solid ${s.done ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
            background: s.done ? 'var(--green)' : 'transparent',
            color: s.done ? 'var(--bg)' : 'var(--text3)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}>✓</button>
        </div>
      ))}
    </>
  );
}

function PlankSets({ sets, onToggle, onUpdate }) {
  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '20px 1fr 36px',
        gap: 6, marginBottom: 6, paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {['#', 'SECONDS', ''].map((h, i) => (
          <span key={i} style={{ fontFamily: 'Orbitron', fontSize: 8, color: 'var(--text3)', textAlign: 'center', fontWeight: 600 }}>{h}</span>
        ))}
      </div>
      {sets.map((s, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 36px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: s.isExtra ? 'var(--cyan)' : 'var(--text3)', textAlign: 'center' }}>
            {i + 1}{s.isExtra ? '+' : ''}
          </span>
          <input
            type="number" inputMode="numeric"
            value={s.time} onChange={e => onUpdate(i, 'time', e.target.value)}
            placeholder="45-60"
            style={inputStyle}
          />
          <button onClick={() => onToggle(i)} style={{
            width: 36, height: 38, borderRadius: 9,
            border: `2px solid ${s.done ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
            background: s.done ? 'var(--green)' : 'transparent',
            color: s.done ? 'var(--bg)' : 'var(--text3)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✓</button>
        </div>
      ))}
    </>
  );
}

function ConfirmModal({ exName, doneCount, totalSets, baseSets, onCancel, onConfirm }) {
  const missed = Math.max(0, baseSets - doneCount);
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
        <h3 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Complete Exercise?</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{exName}</p>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6 }}>
          {doneCount}/{totalSets} sets checked
          {missed > 0 ? `\n⚠️ ${missed} prescribed set${missed > 1 ? 's' : ''} not checked` : ''}
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
          }}>COMPLETE</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 38, borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)', fontFamily: 'Rajdhani, sans-serif',
  fontSize: 14, fontWeight: 600, textAlign: 'center', padding: '0 4px'
};

const selectStyle = {
  width: '100%', height: 38, borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)', fontFamily: 'Rajdhani, sans-serif',
  fontSize: 14, fontWeight: 600, textAlign: 'center',
  WebkitAppearance: 'none', appearance: 'none', padding: '0 4px'
};
