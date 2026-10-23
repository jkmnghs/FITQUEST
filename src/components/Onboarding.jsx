import React, { useState } from 'react';
import { Dumbbell, Trophy, Bot, ChevronRight } from 'lucide-react';

const SCREENS = [
  {
    icon: Dumbbell,
    iconColor: 'var(--color-action)',
    iconBg: 'rgba(0,229,255,0.1)',
    title: 'Swipe to manage exercises',
    subtitle: 'Swipe left on any exercise to swap it out or remove it from your workout.',
  },
  {
    icon: Trophy,
    iconColor: 'var(--color-premium)',
    iconBg: 'rgba(255,214,0,0.1)',
    title: 'Level up your rank',
    subtitle: 'Complete workouts, check in weekly, and maintain streaks to progress from E-rank to S-rank.',
  },
  {
    icon: Bot,
    iconColor: 'var(--color-accent-purple)',
    iconBg: 'rgba(179,136,255,0.1)',
    title: 'Your AI coach adapts to you',
    subtitle: 'Get personalized form tips, overload suggestions, and post-session analysis based on your actual data.',
  },
];

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0);
  const isLast = screen === SCREENS.length - 1;
  const { icon: Icon, iconColor, iconBg, title, subtitle } = SCREENS[screen];

  function next() {
    if (isLast) {
      onComplete();
    } else {
      setScreen(s => s + 1);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,14,26,0.97)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-6)',
    }}>
      {/* Skip */}
      <button
        onClick={onComplete}
        style={{
          position: 'absolute', top: 'calc(var(--safe-area-top, 20px) + 12px)', right: 'var(--space-4)',
          border: 'none', background: 'none',
          fontFamily: 'var(--font-primary)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '8px', minWidth: 44, minHeight: 44,
        }}
      >Skip</button>

      {/* Icon */}
      <div key={screen} className="fq-pop" style={{
        width: 112, height: 126, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'var(--space-8)',
        filter: `drop-shadow(0 0 16px ${iconColor})`,
      }}>
        <div className="fq-hex" style={{ position: 'absolute', inset: 0, background: iconColor, opacity: 0.9 }} />
        <div className="fq-hex" style={{ position: 'absolute', inset: 3, background: '#0b1430' }} />
        <div className="fq-hex" style={{ position: 'absolute', inset: 3, background: iconBg }} />
        <Icon size={48} color={iconColor} strokeWidth={1.6} style={{ position: 'relative' }} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 300, marginBottom: 'var(--space-10)' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 900,
          color: '#fff', marginBottom: 'var(--space-3)', lineHeight: 1.3, letterSpacing: '0.04em',
        }}>{title}</h2>
        <p style={{
          fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0,
        }}>{subtitle}</p>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
        {SCREENS.map((_, i) => (
          <div key={i} style={{
            width: i === screen ? 28 : 10, height: 4,
            background: i === screen ? 'var(--color-action)' : 'rgba(255,255,255,0.15)',
            boxShadow: i === screen ? '0 0 8px var(--color-action)' : 'none',
            transition: 'width var(--transition-slow), background var(--transition-normal)',
          }} />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={next}
        style={{
          width: '100%', maxWidth: 300,
          padding: 'var(--space-4)', minHeight: 52,
          background: isLast
            ? 'linear-gradient(90deg, var(--color-action), #00b8d4)'
            : 'transparent',
          border: isLast ? 'none' : '1px solid rgba(0,229,255,0.35)',
          boxShadow: isLast ? '0 0 24px rgba(0,229,255,0.45)' : 'none',
          clipPath: isLast ? 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' : 'none',
          color: isLast ? '#05070f' : 'var(--color-action)',
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, letterSpacing: '0.16em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all var(--transition-normal)',
        }}
      >
        {isLast ? 'BEGIN QUEST' : 'NEXT'}
        {!isLast && <ChevronRight size={18} />}
      </button>
    </div>
  );
}
