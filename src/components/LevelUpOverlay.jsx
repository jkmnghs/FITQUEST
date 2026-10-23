import React, { useEffect, useRef } from 'react';
import { RANKS, ACHIEVEMENTS } from '../data/gameData';
import { getRank } from '../utils/gameLogic';
import { achievementIcon } from '../data/achievementIcons';

/**
 * Full-screen "[ SYSTEM NOTICE ] LEVEL UP!" celebration.
 * Props: level, newAchievementIds (ids unlocked in the same moment), onClose
 */
export default function LevelUpOverlay({ level, newAchievementIds = [], onClose }) {
  const btnRef = useRef(null);
  const rank = getRank(level);
  const rankIdx = RANKS.findIndex(r => r.l === rank.l);
  const nextRank = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;
  const rankedUp = rank.minLevel === level;
  const achievements = newAchievementIds
    .map(id => ACHIEVEMENTS.find(a => a.id === id))
    .filter(Boolean);

  useEffect(() => {
    btnRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fq-levelup-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden',
        background: 'rgba(5,7,15,0.97)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top) + 64px) 24px calc(env(safe-area-inset-bottom) + 32px)',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s ease-out both',
        fontFamily: 'var(--font-primary)', color: 'var(--color-text-primary)',
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: 300, width: 760, height: 760, marginLeft: -380, marginTop: -380,
        borderRadius: '50%',
        background: 'repeating-conic-gradient(from 0deg, rgba(179,136,255,0.10) 0deg 6deg, transparent 6deg 18deg)',
        WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 62%)',
        maskImage: 'radial-gradient(circle, #000 20%, transparent 62%)',
        animation: 'fqRays 18s linear infinite',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: 300, width: 420, height: 420, marginLeft: -210, marginTop: -210,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(179,136,255,0.35), rgba(0,229,255,0.08) 45%, transparent 70%)',
      }} />

      <p style={{
        position: 'relative', margin: 0,
        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.4em', color: '#b388ff',
      }}>[ SYSTEM NOTICE ]</p>
      <h2 id="fq-levelup-title" style={{
        position: 'relative', margin: '12px 0 0',
        fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 10vw, 40px)', fontWeight: 900, letterSpacing: '0.08em',
        color: '#fff', textShadow: '0 0 30px rgba(179,136,255,0.8)',
      }}>{rankedUp ? 'RANK UP!' : 'LEVEL UP!'}</h2>

      <div className="fq-pop" style={{
        position: 'relative', marginTop: 30, width: 168, height: 190, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg aria-hidden="true" width="168" height="190" viewBox="0 0 168 190" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="fq-lvg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b388ff" />
              <stop offset="1" stopColor="#00e5ff" />
            </linearGradient>
          </defs>
          <polygon points="84,4 162,49 162,141 84,186 6,141 6,49" fill="#0d1230" stroke="url(#fq-lvg)" strokeWidth="4" />
          <polygon points="84,20 148,57 148,133 84,170 20,133 20,57" fill="none" stroke="#b388ff" strokeOpacity="0.35" strokeWidth="1.5" />
        </svg>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.3em', color: '#9fa8da' }}>LV</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 900, lineHeight: 1,
            color: '#fff', textShadow: '0 0 20px rgba(0,229,255,0.7)',
          }}>{level}</span>
        </div>
      </div>

      <div className="fq-rise" style={{ position: 'relative', marginTop: 30, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10, animationDelay: '0.5s' }}>
        <div style={{
          padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(13,18,48,0.85)', border: `1px solid ${rank.color}55`,
        }}>
          <span style={{ fontSize: 13, color: '#9fa8da' }}>Current rank</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: rank.color }}>
            {rank.l} · {rank.name.toUpperCase()}
          </span>
        </div>

        {achievements.map(a => { const [Icon, color] = achievementIcon(a.id); return (
          <div key={a.id} style={{
            padding: 14, display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(90deg, rgba(255,214,0,0.12), rgba(255,145,0,0.04))',
            border: '1px solid rgba(255,214,0,0.45)',
          }}>
            <div className="fq-hex" style={{
              width: 44, height: 44, flexShrink: 0, background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color="#05070f" strokeWidth={2.4} aria-hidden="true" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.24em', color: '#ffd600' }}>ACHIEVEMENT UNLOCKED</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{a.name}</span>
              <span style={{ fontSize: 12, color: '#9fa8da' }}>{a.desc}</span>
            </div>
          </div>
        ); })}

        {nextRank && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px 0' }}>
            <span style={{ fontSize: 12, color: '#9fa8da' }}>Next rank</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: nextRank.color }}>
              {nextRank.l} · {nextRank.name.toUpperCase()} at LV {nextRank.minLevel}
            </span>
          </div>
        )}
      </div>

      <button
        ref={btnRef}
        onClick={onClose}
        className="fq-press fq-skew"
        style={{
          position: 'relative', marginTop: 'auto', width: '100%', maxWidth: 380, minHeight: 54,
          border: 'none', background: 'linear-gradient(90deg, #b388ff, #00e5ff)', color: '#05070f',
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, letterSpacing: '0.24em',
          boxShadow: '0 0 30px rgba(179,136,255,0.45)',
        }}
      >CLAIM REWARD</button>
    </div>
  );
}
