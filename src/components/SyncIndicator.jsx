// V10 Minimal Pulse — used for auth/cloud loading states
import { useEffect, useState } from 'react';

const NAVY   = '#0a1628';
const CYAN   = '#00e5ff';
const ORBITRON = '"Orbitron", "SF Mono", monospace';

function useSyncProgress(active, duration = 4800) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) { setP(0); return; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const el   = (t - start) / duration;
      const loop = el % 1;
      setP(0.02 + loop * 0.96);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration]);
  return p;
}

export default function SyncIndicator({ label = 'LOADING...' }) {
  const p = useSyncProgress(true);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 40%, #15233a 0%, ${NAVY} 55%, #050a14 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh',
    }}>
      {/* subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${CYAN}0a 1px, transparent 1px), linear-gradient(90deg, ${CYAN}0a 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
      }} />
      {/* scanline */}
      <div className="hud-scanline" style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${CYAN}80, transparent)`,
        filter: 'blur(1px)', opacity: 0.4,
      }} />

      <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        {/* pulsing concentric rings */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', width: 60, height: 60, borderRadius: '50%',
            border: `1.5px solid ${CYAN}`,
            animation: `fitq-ring-pulse 2.2s ease-out infinite`,
            animationDelay: `${i * 0.73}s`,
            opacity: 0,
          }} />
        ))}
        {/* center disc */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: `radial-gradient(circle, ${CYAN}, ${CYAN}88)`,
          boxShadow: `0 0 30px ${CYAN}, 0 0 60px ${CYAN}66`,
          animation: 'fitq-pulse-scale 1.2s ease-in-out infinite',
        }} />
        {/* progress ring */}
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="100" cy="100" r="80" fill="none" stroke={`${CYAN}22`} strokeWidth="1" />
          <circle cx="100" cy="100" r="80" fill="none" stroke={CYAN} strokeWidth="2"
            strokeDasharray={`${p * 2 * Math.PI * 80} ${2 * Math.PI * 80}`}
            strokeLinecap="round" transform="rotate(-90 100 100)"
            style={{ filter: `drop-shadow(0 0 4px ${CYAN})`, transition: 'stroke-dasharray 0.3s' }} />
        </svg>
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, zIndex: 1 }}>
        <div style={{ fontFamily: ORBITRON, fontSize: 13, letterSpacing: 6, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          FIT<span style={{ color: CYAN, textShadow: `0 0 4px ${CYAN}` }}>·</span>QUEST
        </div>
        <div style={{ fontFamily: ORBITRON, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: '#fff' }}>
          {label}
        </div>
        <div style={{
          fontFamily: ORBITRON, fontSize: 48, fontWeight: 700, color: '#fff',
          marginTop: 20, letterSpacing: 2,
        }}>
          {Math.round(p * 100)}<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>%</span>
        </div>
      </div>
    </div>
  );
}
