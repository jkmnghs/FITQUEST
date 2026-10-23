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
  const nameOpacity  = Math.max(0, 1 - raw * 2.5);

  return (
    <div
      style={{
        height: headerHeight,
        padding: '0 var(--space-4)',
        background: 'rgba(7,10,20,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,229,255,0.12)',
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
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
          background: 'linear-gradient(135deg, var(--color-action), #7c4dff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: Math.round(avatarSize * 0.42),
          color: '#05070f',
          transition: 'width 0.1s, height 0.1s',
        }}>
          {initial}
        </div>

        {/* Name + rank pill (fades out on scroll) */}
        {/* Name over rank tag. Side by side, a long name pushed the tag into the
            streak counter and its text was cut off. */}
        <div style={{ flex: 1, minWidth: 0, opacity: nameOpacity, maxHeight: nameOpacity > 0 ? 60 : 0, overflow: 'hidden', transition: 'opacity 0.1s' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <span style={{
              maxWidth: '100%',
              fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 700,
              color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
            }}>{state.name}</span>
            <span style={{
              maxWidth: '100%',
              fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 800,
              padding: '3px 10px',
              clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
              background: `${rank.color}1f`, color: rank.color,
              boxShadow: `inset 0 0 0 1px ${rank.color}55`,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
            }}>{rank.l}-RANK · {rank.name}</span>
          </div>
        </div>

        {/* Streak counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'linear-gradient(135deg, rgba(255,109,0,0.22), rgba(255,145,0,0.06))',
          border: `1px solid ${state.streak >= 3 ? 'rgba(255,109,0,0.5)' : 'rgba(255,109,0,0.2)'}`,
          boxShadow: state.streak >= 3 ? '0 0 16px rgba(255,109,0,0.28)' : 'none',
          padding: '5px 10px',
          flexShrink: 0,
        }}>
          <Flame size={14} color="var(--color-fire)" fill={state.streak >= 3 ? 'var(--color-fire)' : 'none'} strokeWidth={2} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 900,
            color: 'var(--color-warning)',
          }}><CountUp value={state.streak} from={0} duration={900} /></span>
        </div>
      </div>

      {/* XP Bar (always visible) */}
      <div>
        {/* Labels fold away as the header collapses so the bar itself stays
            inside the 44px collapsed height instead of being clipped. */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', overflow: 'hidden',
          maxHeight: Math.round(16 * (1 - raw)), marginBottom: Math.round(3 * (1 - raw)),
          opacity: 1 - raw,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
            color: 'var(--color-text-primary)',
          }}>LV {state.level}</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums',
          }}>
            <CountUp value={state.xp} from={0} duration={1200} format={n => n.toLocaleString()} /> / {xpNeeded.toLocaleString()} XP
          </span>
        </div>
        <div style={{
          height: 5, background: 'rgba(0,229,255,0.08)', overflow: 'hidden',
        }}>
          <div className="fq-grow-x" style={{
            height: '100%', width: `${xpPct}%`,
            background: 'linear-gradient(90deg, var(--color-action), var(--color-accent-purple))',
            boxShadow: '0 0 10px rgba(0,229,255,0.6)',
            transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: '30%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',
              animation: 'fqShine 2.6s 1.2s ease-in-out infinite',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
