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
          color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '8px',
        }}
      >Skip</button>

      {/* Icon */}
      <div style={{
        width: 100, height: 100, borderRadius: 'var(--radius-xl)',
        background: iconBg, border: `1px solid ${iconColor}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'var(--space-8)',
        animation: 'rankPulse 2s ease-in-out infinite',
      }}>
        <Icon size={48} color={iconColor} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 300, marginBottom: 'var(--space-10)' }}>
        <h2 style={{
          fontFamily: 'var(--font-primary)', fontSize: 'var(--text-lg)', fontWeight: 600,
          color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.3,
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
            width: i === screen ? 24 : 8, height: 8,
            borderRadius: 'var(--radius-full)',
            background: i === screen ? 'var(--color-action)' : 'rgba(255,255,255,0.15)',
            transition: 'width var(--transition-slow), background var(--transition-normal)',
          }} />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={next}
        style={{
          width: '100%', maxWidth: 300,
          padding: 'var(--space-4)',
          background: isLast
            ? 'var(--color-action)'
            : 'transparent',
          border: `1px solid ${isLast ? 'var(--color-action)' : 'var(--color-border-medium)'}`,
          borderRadius: 'var(--radius-lg)',
          color: isLast ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
          fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all var(--transition-normal)',
        }}
      >
        {isLast ? 'Get Started' : 'Next'}
        {!isLast && <ChevronRight size={18} />}
      </button>
    </div>
  );
}
