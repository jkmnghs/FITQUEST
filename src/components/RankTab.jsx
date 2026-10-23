import React from 'react';
import { RANKS } from '../data/gameData';
import { getRank, xpToLevel } from '../utils/gameLogic';
import CountUp from './CountUp';

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
      {/* Rank display */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {/* Hex badge */}
        <div className="fq-pop" style={{ width: 120, height: 134, margin: '0 auto 16px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: `radial-gradient(circle, ${rank.color}33, transparent 65%)`,
          }} />
          <svg width="120" height="134" viewBox="0 0 112 126" style={{ position: 'relative', filter: `drop-shadow(0 0 14px ${rank.color}99)` }}>
            <polygon points="56,3 109,33 109,93 56,123 3,93 3,33" fill="#0b1430" stroke={rank.color} strokeWidth="3" />
            <polygon points="56,15 98,39 98,87 56,111 14,87 14,39" fill="none" stroke={rank.color} strokeOpacity="0.3" strokeWidth="1" />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 54, fontWeight: 900,
            color: rank.color, textShadow: `0 0 18px ${rank.color}cc`
          }}>{rank.l}</div>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: rank.color, marginBottom: 4 }}>
          {rank.name}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>
          Level {state.level} • Week {cycleWeek}/12{cycles > 1 ? ` (Cycle ${cycles})` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {nextRank ? `Next: ${nextRank.name} (Level ${nextRank.minLevel})` : 'MAX RANK ACHIEVED!'}
        </div>

        {/* Rank ladder */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4, marginTop: 28 }}>
          {RANKS.map(r => {
            const isCur = r.l === rank.l;
            const isLocked = state.level < r.minLevel;
            return (
              <div key={r.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 48, height: 54,
                  clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
                  color: isLocked ? 'var(--text3)' : isCur ? '#05070f' : r.color,
                  background: isLocked ? 'rgba(255,255,255,0.05)' : isCur ? r.color : `${r.color}26`,
                  opacity: isLocked ? 0.3 : 1,
                  animation: isCur ? 'rankPulse 2s infinite' : 'none'
                }}>{r.l}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: isLocked ? 'var(--text3)' : 'var(--text2)'
                }}>{r.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats breakdown */}
      <div className="fq-cut fq-rise" style={{
        background: 'linear-gradient(160deg, #141b36, #0c1226)', border: '1px solid rgba(0,229,255,0.18)', '--fq-cut-border': 'rgba(0,229,255,0.18)',
        padding: '14px 16px', animationDelay: '0.2s',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 12 }}>
          RANK PROGRESS
        </div>
        {[
          { label: 'Sessions Completed', value: state.totalSessions, target: cycles * 36, color: 'var(--cyan)' },
          { label: 'Perfect Weeks', value: state.perfectWeeks, target: cycles * 12, color: 'var(--purple)' },
          { label: 'Best Streak', value: state.bestStreak, target: cycles * 12, color: 'var(--fire2)' },
          { label: 'Total XP', value: state.totalXp, target: xpTarget, color: 'var(--gold)' }
        ].map((row, i) => (
          <div key={row.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: row.color, fontWeight: 700 }}>
                <CountUp value={row.value || 0} from={0} duration={1200} format={n => n.toLocaleString()} />/{row.target.toLocaleString()}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div className="fq-grow-x" style={{
                height: '100%', borderRadius: 4, background: row.color,
                boxShadow: `0 0 8px ${row.color}`,
                width: `${Math.min(100, ((row.value || 0) / row.target) * 100)}%`,
                transition: 'width 0.6s',
                animationDelay: `${0.3 + i * 0.12}s`,
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
      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
      color: 'var(--text2)', letterSpacing: 1.5,
      marginBottom: 12, textTransform: 'uppercase'
    }}>{children}</div>
  );
}
