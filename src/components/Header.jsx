import React from 'react';
import { getRank, getPhase, xpForLevel } from '../utils/gameLogic';

function getNextWorkoutLabel() {
  const day = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  const workoutDays = [1, 3, 5];
  if (workoutDays.includes(day)) return 'Today!';
  let d = 1;
  while (d <= 7) {
    if (workoutDays.includes((day + d) % 7)) break;
    d++;
  }
  return d === 1 ? 'Tomorrow' : `In ${d} days`;
}

export default function Header({ state }) {
  const rank = getRank(state.level);
  const phase = getPhase(state.currentWeek);
  const n = xpForLevel(state.level);
  const pct = Math.min(100, (state.xp / n) * 100);
  const nextWorkout = getNextWorkoutLabel();

  return (
    <div style={{ padding: '16px 20px 8px', background: 'rgba(10,14,26,0.7)', backdropFilter: 'blur(12px)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron', fontWeight: 900, fontSize: 24, color: '#fff',
            boxShadow: '0 0 24px var(--cyan-glow), 0 0 60px rgba(0,229,255,0.08)',
            position: 'relative', flexShrink: 0
          }}>
            {state.name.charAt(0).toUpperCase()}
            <div style={{
              position: 'absolute', inset: -3, borderRadius: 18,
              border: '2px solid var(--cyan)', opacity: 0.4
            }} />
          </div>
          {/* Info */}
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, letterSpacing: 0.5, color: '#c5cae9' }}>
              {state.name.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              display: 'inline-block', padding: '3px 10px', borderRadius: 6, marginTop: 3,
              background: `${rank.color}18`, color: rank.color
            }}>
              {rank.l} • {rank.name.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              <Stat icon="bar" label={`Lv ${state.level}`} />
              <Stat icon="clock" label={`Wk ${state.currentWeek}/12`} />
            </div>
          </div>
        </div>
        {/* Streak */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,109,0,0.12)',
          border: `1px solid ${state.streak >= 3 ? 'rgba(255,109,0,0.35)' : 'rgba(255,109,0,0.2)'}`,
          padding: '8px 14px', borderRadius: 12,
          fontFamily: 'Orbitron', fontSize: 15, fontWeight: 700, color: 'var(--fire2)',
          boxShadow: state.streak >= 3 ? '0 0 12px rgba(255,109,0,0.12)' : 'none'
        }}>
          🔥 {state.streak}
        </div>
      </div>

      {/* Phase banner + next workout */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, marginBottom: 10,
        background: 'linear-gradient(135deg,rgba(179,136,255,0.08),rgba(0,229,255,0.08))',
        border: '1px solid rgba(179,136,255,0.18)'
      }}>
        <span style={{ fontSize: 20 }}>{phase.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: 'var(--purple)', letterSpacing: 1 }}>
            {phase.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{phase.desc}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 8, color: 'var(--text3)', letterSpacing: 0.8, marginBottom: 1 }}>NEXT SESSION</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: nextWorkout === 'Today!' ? 'var(--green)' : 'var(--cyan)' }}>
            {nextWorkout}
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div style={{
        padding: '10px 14px', background: 'var(--card)',
        border: '1px solid var(--card-border)', borderRadius: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1 }}>
            LEVEL {state.level}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>{state.xp}</span> / {n} XP
          </span>
        </div>
        <div style={{ height: 7, background: 'rgba(0,229,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 8, width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--cyan2), var(--cyan))',
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 25,
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35))',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#7986cb', fontWeight: 600 }}>
      <span style={{ fontSize: 12 }}>{icon === 'bar' ? '📊' : '🕐'}</span>
      <span style={{ color: '#c5cae9', fontWeight: 800 }}>{label}</span>
    </div>
  );
}
