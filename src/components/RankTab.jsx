import React from 'react';
import { RANKS } from '../data/gameData';
import { getRank, xpToLevel } from '../utils/gameLogic';

export default function RankTab({ state }) {
  const rank = getRank(state.level);
  const rankIdx = RANKS.findIndex(r => r.l === rank.l);
  const nextRank = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;
  const xpTarget = nextRank ? xpToLevel(nextRank.minLevel) : xpToLevel(RANKS[RANKS.length - 1].minLevel + 10);

  // Scale targets by the number of 12-week cycles the user has been through
  const cycles = Math.max(1, Math.ceil((state.currentWeek || 1) / 12));
  const cycleWeek = ((state.currentWeek || 1) - 1) % 12 + 1;

  return (
    <div>
      <SectionTitle>Warrior Rank</SectionTitle>

      {/* Rank display */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {/* Hex badge */}
        <div style={{ width: 120, height: 120, margin: '0 auto 16px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="120" height="120" viewBox="0 0 100 100">
            <polygon points="50 2 95 27 95 73 50 98 5 73 5 27"
              fill={`${rank.color}10`} stroke={rank.color} strokeWidth="2.5" opacity="0.6" />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron', fontSize: 48, fontWeight: 900,
            color: rank.color, textShadow: `0 0 40px ${rank.color}60`
          }}>{rank.l}</div>
        </div>

        <div style={{ fontFamily: 'Orbitron', fontSize: 20, fontWeight: 700, color: rank.color, marginBottom: 4 }}>
          {rank.name}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>
          Level {state.level} • Week {cycleWeek}/12{cycles > 1 ? ` (Cycle ${cycles})` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {nextRank ? `Next: ${nextRank.name} (Level ${nextRank.minLevel})` : 'MAX RANK ACHIEVED!'}
        </div>

        {/* Rank ladder */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
          {RANKS.map(r => {
            const isCur = r.l === rank.l;
            const isLocked = state.level < r.minLevel;
            return (
              <div key={r.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Orbitron', fontSize: 18, fontWeight: 800,
                  border: `2px solid ${isLocked ? 'var(--text3)' : r.color}`,
                  color: isLocked ? 'var(--text3)' : r.color,
                  background: isLocked ? 'rgba(255,255,255,0.02)' : `${r.color}15`,
                  opacity: isLocked ? 0.3 : 1,
                  animation: isCur ? 'rankPulse 2s infinite' : 'none'
                }}>{r.l}</div>
                <div style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
                  color: isLocked ? 'var(--text3)' : 'var(--text2)'
                }}>{r.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats breakdown */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 12 }}>
          RANK PROGRESS
        </div>
        {[
          { label: 'Sessions Completed', value: state.totalSessions, target: cycles * 36, color: 'var(--cyan)' },
          { label: 'Perfect Weeks', value: state.perfectWeeks, target: cycles * 12, color: 'var(--purple)' },
          { label: 'Best Streak', value: state.bestStreak, target: cycles * 12, color: 'var(--fire2)' },
          { label: 'Total XP', value: state.totalXp, target: xpTarget, color: 'var(--gold)' }
        ].map(row => (
          <div key={row.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 11, color: row.color, fontWeight: 700 }}>
                {row.value}/{row.target}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, background: row.color,
                width: `${Math.min(100, (row.value / row.target) * 100)}%`,
                transition: 'width 0.6s'
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
      color: 'var(--text2)', letterSpacing: 1.5,
      marginBottom: 12, textTransform: 'uppercase'
    }}>{children}</div>
  );
}
