import React from 'react';

export default function BgFx() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      pointerEvents: 'none', overflow: 'hidden'
    }}>
      {/* Cyan orb - top left */}
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.08, animation: 'orbFloat 30s ease-in-out infinite',
        willChange: 'transform',
        width: 280, height: 280, background: 'var(--color-action)', top: -80, left: -50
      }} />
      {/* Purple orb - bottom right */}
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.08, animation: 'orbFloat 30s ease-in-out infinite',
        animationDelay: '-10s',
        willChange: 'transform',
        width: 220, height: 220, background: 'var(--color-accent-purple)', bottom: '20%', right: -30
      }} />
      {/* Warm purple orb - bottom center */}
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.06, animation: 'orbFloat 30s ease-in-out infinite',
        animationDelay: '-18s',
        willChange: 'transform',
        width: 180, height: 180, background: '#7c4dff', bottom: -40, left: '30%'
      }} />
      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
    </div>
  );
}

