import React, { useState } from 'react';
import { PROGRAMS } from '../data/programs';

export default function ProgramCompleteModal({ state, onClose, onChangeProgram }) {
  const [picking, setPicking] = useState(false);
  const cycle = Math.floor((state.currentWeek - 1) / 12) + 1;
  const currentProgramId = state.programId || state.assessment?.programId;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid rgba(0,229,255,0.3)',
        borderRadius: 22, padding: '28px 20px',
        width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: '0 0 60px rgba(0,229,255,0.15)',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 17, fontWeight: 900, color: 'var(--cyan)', marginBottom: 6, letterSpacing: 1 }}>
          CYCLE {cycle} COMPLETE
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.7 }}>
          Week {state.currentWeek} done — {state.totalSessions} sessions,{' '}
          {state.perfectWeeks} perfect weeks, {state.totalXp} XP earned.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { val: `Lv ${state.level}`, lbl: 'Level' },
            { val: state.streak, lbl: 'Streak' },
            { val: `${(state.totalVolume / 1000).toFixed(1)}k`, lbl: `Vol (${state.unit})` }
          ].map(s => (
            <div key={s.lbl} style={{ background: 'rgba(0,229,255,0.06)', borderRadius: 10, padding: '10px 4px' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 800, color: 'var(--cyan)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {!picking ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              What do you want for the next 12 weeks?
            </div>
            <button onClick={onClose} style={{
              width: '100%', padding: 13, border: 'none', borderRadius: 12, marginBottom: 10,
              background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
              fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
              color: 'var(--bg)', letterSpacing: 0.8, cursor: 'pointer',
              boxShadow: '0 4px 20px var(--cyan-glow)'
            }}>
              CONTINUE SAME PROGRAM ⚔️
            </button>
            <button onClick={() => setPicking(true)} style={{
              width: '100%', padding: 13, border: '1px solid rgba(179,136,255,0.4)', borderRadius: 12,
              background: 'rgba(179,136,255,0.08)',
              fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
              color: 'var(--purple)', letterSpacing: 0.8, cursor: 'pointer',
            }}>
              SWITCH PROGRAM
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, textAlign: 'left' }}>
              Choose your next program:
            </div>
            {PROGRAMS.map(p => (
              <button
                key={p.id}
                onClick={() => onChangeProgram(p.id)}
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: 8,
                  border: p.id === currentProgramId
                    ? '1px solid rgba(0,229,255,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  background: p.id === currentProgramId
                    ? 'rgba(0,229,255,0.08)'
                    : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: p.id === currentProgramId ? 'var(--cyan)' : 'var(--text)', marginBottom: 2 }}>
                  {p.name} {p.id === currentProgramId ? '(current)' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{p.description}</div>
              </button>
            ))}
            <button onClick={() => setPicking(false)} style={{
              marginTop: 4, background: 'none', border: 'none',
              color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'Orbitron',
            }}>← BACK</button>
          </>
        )}
      </div>
    </div>
  );
}
