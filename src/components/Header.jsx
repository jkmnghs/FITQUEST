import React from 'react';
import { Flame } from 'lucide-react';
import { getRank, xpForLevel } from '../utils/gameLogic';
import CountUp from './CountUp';

/**
 * Compact collapsing header.
 * Props:
 *   state    — game state
 *   scrollY  — scroll position of the content container (passed from App)
 *
 * Behavior:
 *   0–50px   : full 72px height — avatar(40px) + name/rank row + XP bar
 *   50–120px : transition — avatar shrinks to 32px, name fades out
 *   120px+   : collapsed 44px — tiny avatar, streak, XP bar only
 */
export default function Header({ state, scrollY = 0 }) {
  const rank = getRank(state.level);
  const xpNeeded = xpForLevel(state.level);
  const xpPct = Math.min(100, (state.xp / xpNeeded) * 100);
  const initial = (state.name || '?').charAt(0).toUpperCase();

  // Collapse progress: 0 = full, 1 = collapsed
  const raw = Math.max(0, Math.min(1, (scrollY - 50) / 70));

  // Heights
  const headerHeight = Math.round(72 - raw * 28); // 72 → 44
  const avatarSize   = Math.round(40 - raw * 8);  // 40 → 32
  const avatarRadius = Math.round(12 - raw * 4);  // 12 → 8
  const nameOpacity  = Math.max(0, 1 - raw * 2.5);

  return (
    <div
      style={{
        height: headerHeight,
        padding: '0 var(--space-4)',
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        position: 'sticky', top: 0, zIndex: 50,
        willChange: 'height',
        overflow: 'hidden',
      }}
    >
      {/* Main row: avatar + name/rank + streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Avatar */}
        <div style={{
          width: avatarSize, height: avatarSize, flexShrink: 0,
          borderRadius: avatarRadius,
          background: 'linear-gradient(135deg, var(--color-action), var(--color-accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: Math.round(avatarSize * 0.45),
          color: '#fff',
          transition: 'width 0.1s, height 0.1s',
        }}>
          {initial}
        </div>

        {/* Name + rank pill (fades out on scroll) */}
        <div style={{ flex: 1, opacity: nameOpacity, overflow: 'hidden', transition: 'opacity 0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 600,
              color: 'var(--color-text-primary)', whiteSpace: 'nowrap',
            }}>{state.name}</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700,
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: `${rank.color}18`, color: rank.color,
              letterSpacing: '0.04em', flexShrink: 0,
            }}>{rank.l} · {rank.name}</span>
          </div>
        </div>

        {/* Streak counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,109,0,0.1)',
          border: `1px solid ${state.streak >= 3 ? 'rgba(255,109,0,0.3)' : 'rgba(255,109,0,0.15)'}`,
          padding: '5px 10px', borderRadius: 'var(--radius-md)',
          flexShrink: 0,
        }}>
          <Flame size={14} color="var(--color-fire)" strokeWidth={2} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700,
            color: 'var(--color-fire)',
          }}>{state.streak}</span>
        </div>
      </div>

      {/* XP Bar (always visible) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{
            fontFamily: 'var(--font-primary)', fontSize: 'var(--text-xs)', fontWeight: 500,
            color: 'var(--color-text-tertiary)',
          }}>LVL {state.level}</span>
          <span style={{
            fontFamily: 'var(--font-primary)', fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
          }}>
            <CountUp value={state.xp} /> / {xpNeeded} XP
          </span>
        </div>
        <div style={{
          height: 3, background: 'rgba(0,229,255,0.08)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${xpPct}%`,
            background: 'linear-gradient(90deg, var(--color-action), var(--color-accent-purple))',
            transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 20,
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25))',
              animation: 'shimmer 2s infinite',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
