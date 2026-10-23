import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const SCREENS = [
  {
    image: '/tour-swap.png',
    glow: 'rgba(0,229,255,0.22)',
    title: 'Swipe to manage exercises',
    subtitle: 'Swipe left on any exercise to swap it out or remove it from your workout.',
  },
  {
    image: '/tour-rank.png',
    glow: 'rgba(255,214,0,0.2)',
    title: 'Level up your rank',
    subtitle: 'Complete workouts, check in weekly, and maintain streaks to progress from E-rank to S-rank.',
  },
  {
    image: '/tour-coach.png',
    glow: 'rgba(179,136,255,0.24)',
    title: 'Your AI coach adapts to you',
    subtitle: 'Get personalized form tips, overload suggestions, and post-session analysis based on your actual data.',
  },
];

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0);
  const isLast = screen === SCREENS.length - 1;
  const { image, glow, title, subtitle } = SCREENS[screen];

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
      <div key={screen} className="fq-pop" aria-hidden="true" style={{
        width: 'min(220px, 55vw)', aspectRatio: '1', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${glow}, transparent 65%)` }} />
        <img
          src={image} alt="" width="200" height="200"
          style={{
            position: 'relative', width: '92%', height: '92%', objectFit: 'contain', mixBlendMode: 'screen',
            WebkitMaskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)',
            maskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)',
          }}
        />
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
