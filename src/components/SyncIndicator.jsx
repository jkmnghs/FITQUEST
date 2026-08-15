// Minimal full-screen loading indicator used for auth + cloud sync states
import { useState, useEffect } from 'react';

const NAVY   = '#0a1628';
const CYAN   = '#00e5ff';
const ORBITRON = 'var(--font-display)';
const RAJDHANI = 'var(--font-primary)';

const SUBLABELS = {
  'LOADING...':  'Checking your session',
  'SYNCING...':  'Pulling your data from the cloud',
};

export default function SyncIndicator({ label = 'LOADING...' }) {
  const [dots, setDots] = useState(0);

  // Cycle ellipsis dots so the screen feels alive without fake numbers
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 420);
    return () => clearInterval(id);
  }, []);

  const ellipsis = '.'.repeat(dots);

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 35%, #14223a 0%, ${NAVY} 55%, #050a14 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh',
    }}>
      {/* subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${CYAN}09 1px,transparent 1px),linear-gradient(90deg,${CYAN}09 1px,transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse at 50% 50%,black 15%,transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%,black 15%,transparent 72%)',
      }} />
      {/* scanline */}
      <div className="hud-scanline" style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${CYAN}55,transparent)`,
        filter: 'blur(1px)', opacity: 0.35,
      }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />

      {/* pulse visual */}
      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        {/* expanding rings */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', width: 52, height: 52, borderRadius: '50%',
            border: `1.5px solid ${CYAN}`,
            animation: `fitq-ring-pulse 2.4s ease-out ${i * 0.8}s infinite`,
            opacity: 0,
          }} />
        ))}
        {/* center disc */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `radial-gradient(circle,${CYAN} 30%,${CYAN}77 70%,transparent)`,
          boxShadow: `0 0 24px ${CYAN},0 0 48px ${CYAN}55`,
          animation: 'fitq-pulse-scale 1.4s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* inner cross */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M9 2v14M2 9h14" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
        {/* thin orbit ring */}
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke={`${CYAN}18`} strokeWidth="1" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={`${CYAN}60`} strokeWidth="1.5"
            strokeDasharray="44 396"
            strokeLinecap="round" transform="rotate(-90 80 80)"
            style={{ animation: 'fitq-spin-cw 3s linear infinite' }} />
        </svg>
      </div>

      {/* text block */}
      <div style={{ textAlign: 'center', marginTop: 36, zIndex: 1, padding: '0 32px' }}>
        {/* app name */}
        <div style={{ fontFamily: ORBITRON, fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
          FIT<span style={{ color: CYAN, textShadow: `0 0 6px ${CYAN}` }}>·</span>QUEST
        </div>
        {/* main label */}
        <div style={{
          fontFamily: ORBITRON, fontWeight: 700, fontSize: 15, letterSpacing: 3,
          color: '#fff', minWidth: 160,
        }}>
          {label.replace('...', '')}{ellipsis}
        </div>
        {/* sub label */}
        {SUBLABELS[label] && (
          <div style={{
            fontFamily: RAJDHANI, fontSize: 13, color: 'rgba(255,255,255,0.38)',
            marginTop: 8, letterSpacing: 0.3,
          }}>
            {SUBLABELS[label]}
          </div>
        )}
      </div>
    </div>
  );
}
