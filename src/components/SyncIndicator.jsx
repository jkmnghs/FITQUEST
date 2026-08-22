// Minimal full-screen loading indicator used for auth + cloud sync states
import { useState, useEffect } from 'react';

const NAVY   = '#0a1628';
const CYAN   = '#00e5ff';
const DISPLAY = 'var(--font-display)';
const BODY    = 'var(--font-primary)';

const SUBLABELS = {
  'LOADING...':  'Checking your session',
  'SYNCING...':  'Pulling your data from the cloud',
};

// How long before the screen admits something is wrong. The cloud read gives up
// on its own at 8s (CLOUD_GET_TIMEOUT_MS), so the first message lands just
// before that — if the read is about to resolve, the user never sees it.
const SLOW_AFTER_MS   = 6000;
const STUCK_AFTER_MS  = 12000;

export default function SyncIndicator({ label = 'LOADING...', onContinueOffline }) {
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Cycle ellipsis dots so the screen feels alive without fake numbers.
  // This is also the only motion that survives prefers-reduced-motion, since
  // it is driven by state rather than CSS animation.
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 420);
    return () => clearInterval(id);
  }, []);

  // Track how long the wait has run so the copy can stop pretending it's fine.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(id);
  }, []);

  const ellipsis = '.'.repeat(dots);
  const isSlow  = elapsed >= SLOW_AFTER_MS;
  const isStuck = elapsed >= STUCK_AFTER_MS;

  const sublabel = isStuck
    ? 'Still waiting on the network.'
    : isSlow
      ? 'Taking longer than usual — slow connection?'
      : SUBLABELS[label];

  return (
    <div
      // Announced once, politely: a screen reader user otherwise gets silence
      // for the whole wait and no indication the app is doing anything.
      role="status"
      aria-live="polite"
      aria-label={`${label.replace('...', '')}. ${sublabel || ''}`}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 35%, #14223a 0%, ${NAVY} 55%, #050a14 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* subtle grid */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${CYAN}09 1px,transparent 1px),linear-gradient(90deg,${CYAN}09 1px,transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse at 50% 50%,black 15%,transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%,black 15%,transparent 72%)',
      }} />
      {/* scanline */}
      <div className="hud-scanline" aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${CYAN}55,transparent)`,
        filter: 'blur(1px)', opacity: 0.35,
      }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />

      {/* pulse visual */}
      <div aria-hidden="true" style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
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
          {/* Downward arrow: this screen only ever means "pulling data in".
              The old glyph was a plus sign, which reads as "add" and told the
              user nothing about what was happening. */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M9 3v9M5.5 8.5 9 12l3.5-3.5M4 14.5h10"
              fill="none" stroke={NAVY} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          </svg>
        </div>
        {/* thin orbit ring — the moving arc spans a quarter of the circle so it
            reads as a sweep. At the old 44/440 dash it was a 10% speck that
            looked like a rendering artifact rather than a progress cue. */}
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke={`${CYAN}18`} strokeWidth="1" />
          <circle cx="80" cy="80" r="70" fill="none" stroke={`${CYAN}70`} strokeWidth="1.5"
            strokeDasharray="110 330"
            strokeLinecap="round" transform="rotate(-90 80 80)"
            style={{ animation: 'fitq-spin-cw 3s linear infinite' }} />
        </svg>
      </div>

      {/* text block */}
      <div style={{ textAlign: 'center', marginTop: 36, zIndex: 1, padding: '0 32px' }}>
        {/* app name — was rgba(255,255,255,0.3), which measures 2.65:1 against
            this backdrop. At 11px that needs 4.5:1; this sits at 6.2:1. */}
        <div style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
          FITQUEST
        </div>
        {/* main label */}
        <div style={{
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: 3,
          color: '#fff', minWidth: 160,
        }}>
          {label.replace('...', '')}{ellipsis}
        </div>
        {/* sub label — was 0.38 alpha (3.55:1), now 7.6:1 */}
        {sublabel && (
          <div style={{
            fontFamily: BODY, fontSize: 13, color: 'rgba(255,255,255,0.62)',
            marginTop: 8, letterSpacing: 0.3,
            maxWidth: 280, marginInline: 'auto', lineHeight: 1.4,
          }}>
            {sublabel}
          </div>
        )}

        {/* Escape hatch. Local state is already hydrated by the time this screen
            renders, so there is always something to fall back to — a stalled
            network should never leave the only way forward as force-quitting. */}
        {isStuck && onContinueOffline && (
          <button
            onClick={onContinueOffline}
            className="fq-press"
            style={{
              marginTop: 22, minHeight: 'var(--tap-target)',
              padding: '10px 22px',
              fontFamily: BODY, fontSize: 14, fontWeight: 600,
              color: CYAN,
              background: 'rgba(0,229,255,0.08)',
              border: `1px solid ${CYAN}55`,
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
          >
            Continue offline
          </button>
        )}
      </div>
    </div>
  );
}
