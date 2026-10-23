// Full-screen "System boot" loading screen used for auth + cloud sync states
import { useState, useEffect, useMemo } from 'react';
import { FORM_TIPS } from '../data/gameData';

const CYAN    = '#00e5ff';
const PURPLE  = '#b388ff';
const DISPLAY = 'var(--font-display)';
const BODY    = 'var(--font-primary)';
const MONO    = "'SF Mono', ui-monospace, Menlo, monospace";

const SUBLABELS = {
  'LOADING...':  'Checking your session',
  'SYNCING...':  'Pulling your data from the cloud',
};

// The boot log is honest about what is actually happening: each line is a
// real step, and only the step in flight blinks. No fake percentages.
const BOOT_STEPS = {
  'LOADING...': [
    { text: 'System online', done: true },
    { text: 'Authenticating hunter', done: false },
  ],
  'SYNCING...': [
    { text: 'Hunter authenticated', done: true },
    { text: 'Loading quest log', done: true },
    { text: 'Syncing with cloud', done: false },
  ],
};

// How long before the screen admits something is wrong. The cloud read gives up
// on its own at 8s (CLOUD_GET_TIMEOUT_MS), so the first message lands just
// before that — if the read is about to resolve, the user never sees it.
const SLOW_AFTER_MS   = 6000;
const STUCK_AFTER_MS  = 12000;

function randomTip() {
  const all = Object.values(FORM_TIPS).flat();
  return all.length ? all[Math.floor(Math.random() * all.length)] : null;
}

export default function SyncIndicator({ label = 'LOADING...', onContinueOffline }) {
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const tip = useMemo(randomTip, []);

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

  const steps = BOOT_STEPS[label] || BOOT_STEPS['LOADING...'];

  return (
    <div
      // Announced once, politely: a screen reader user otherwise gets silence
      // for the whole wait and no indication the app is doing anything.
      role="status"
      aria-live="polite"
      aria-label={`${label.replace('...', '')}. ${sublabel || ''}`}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: '#05070f',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minHeight: '100dvh',
        padding: 'calc(env(safe-area-inset-top) + 56px) 28px calc(env(safe-area-inset-bottom) + 32px)',
        boxSizing: 'border-box',
      }}
    >
      {/* grid */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(0,229,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.05) 1px,transparent 1px)`,
        backgroundSize: '26px 26px',
      }} />
      {/* core glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: '38%', width: 520, height: 520,
        marginLeft: -260, marginTop: -260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,229,255,0.20) 0%, rgba(124,77,255,0.10) 35%, transparent 65%)',
      }} />
      {/* scan band */}
      <div className="hud-scanline" aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, height: 90,
        background: 'linear-gradient(180deg, transparent, rgba(0,229,255,0.07), transparent)',
      }} />

      <div aria-hidden="true" style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: DISPLAY, fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', color: '#8691d0',
      }}>
        <span style={{ width: 6, height: 6, background: CYAN, animation: 'fqBlink 1s steps(2) infinite' }} />
        SYSTEM ONLINE
      </div>

      {/* emblem + orbit rings */}
      <div aria-hidden="true" style={{
        position: 'relative', width: 236, height: 236, marginTop: 'clamp(28px, 7vh, 64px)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="236" height="236" viewBox="0 0 236 236"
          style={{ position: 'absolute', inset: 0, animation: 'fqSpin 9s linear infinite' }}>
          <circle cx="118" cy="118" r="112" fill="none" stroke={CYAN} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 10" />
          <path d="M118 6 A112 112 0 0 1 230 118" fill="none" stroke={CYAN} strokeWidth="3" />
        </svg>
        <svg width="196" height="196" viewBox="0 0 196 196"
          style={{ position: 'absolute', left: 20, top: 20, animation: 'fqSpinRev 5s linear infinite' }}>
          <circle cx="98" cy="98" r="92" fill="none" stroke={PURPLE} strokeOpacity="0.25" strokeWidth="1" />
          <path d="M98 190 A92 92 0 0 1 6 98" fill="none" stroke={PURPLE} strokeWidth="2.5" />
        </svg>
        <img
          src="/fq-emblem.png" alt="" width="184" height="184"
          style={{
            width: 184, height: 184, objectFit: 'contain', mixBlendMode: 'screen',
            animation: 'fqBreathe 2.2s ease-in-out infinite',
            WebkitMaskImage: 'radial-gradient(circle closest-side, #000 86%, transparent 100%)',
            maskImage: 'radial-gradient(circle closest-side, #000 86%, transparent 100%)',
          }}
        />
      </div>

      <div style={{
        position: 'relative', marginTop: 'clamp(20px, 5vh, 44px)',
        fontFamily: DISPLAY, fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 900, letterSpacing: '0.14em',
        color: '#fff', textShadow: '0 0 24px rgba(0,229,255,0.55)',
      }}>FITQUEST</div>
      <div style={{
        position: 'relative', marginTop: 10,
        fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '0.4em', color: CYAN,
      }}>ARISE · TRAIN · LEVEL UP</div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 24, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: MONO, fontSize: 11, color: '#8691d0' }}>
          {steps.map(s => (
            <div key={s.text} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>&gt; {s.text}</span>
              {s.done
                ? <span style={{ color: '#00e676' }}>OK</span>
                : <span style={{ color: CYAN, minWidth: 18 }}>{ellipsis || ' '}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: DISPLAY }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: '#e8eaf6' }}>
            {label.replace('...', '')}
          </span>
        </div>
        {/* Indeterminate: a sweep rather than a percentage we can't actually know. */}
        <div aria-hidden="true" className="fq-skew" style={{
          position: 'relative', height: 8, overflow: 'hidden',
          background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '40%',
            background: `linear-gradient(90deg, transparent, ${CYAN}, ${PURPLE})`,
            boxShadow: `0 0 14px ${CYAN}`,
            animation: 'fqIndeterminate 1.4s cubic-bezier(.45,.05,.55,.95) infinite',
          }} />
        </div>
        {sublabel && (
          <div style={{ fontFamily: BODY, fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>
            {sublabel}
          </div>
        )}

        {tip && (
          <div style={{
            marginTop: 6, padding: '12px 14px',
            background: 'rgba(21,29,53,0.7)', border: '1px solid rgba(0,229,255,0.14)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
            </svg>
            <p style={{ margin: 0, fontFamily: BODY, fontSize: 12, lineHeight: 1.5, color: '#9fa8da' }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#ffd600' }}>HUNTER TIP&nbsp;&nbsp;</span>
              {tip}
            </p>
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
              alignSelf: 'center', minHeight: 'var(--tap-target)',
              padding: '10px 22px',
              fontFamily: BODY, fontSize: 14, fontWeight: 600,
              color: CYAN,
              background: 'rgba(0,229,255,0.08)',
              border: `1px solid ${CYAN}55`,
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
