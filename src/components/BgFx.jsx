import React from 'react';

export default function BgFx() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      pointerEvents: 'none', overflow: 'hidden'
    }}>
      {/* Orbs */}
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.25, animation: 'orbFloat 14s ease-in-out infinite',
        width: 280, height: 280, background: 'var(--cyan)', top: -80, left: -50
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.25, animation: 'orbFloat 14s ease-in-out infinite',
        animationDelay: '-5s',
        width: 220, height: 220, background: 'var(--purple)', bottom: '20%', right: -30
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%', filter: 'blur(80px)',
        opacity: 0.15, animation: 'orbFloat 14s ease-in-out infinite',
        animationDelay: '-9s',
        width: 180, height: 180, background: 'var(--fire)', bottom: -40, left: '30%'
      }} />
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
    </div>
  );
}
