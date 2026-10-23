import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const CIRCUMFERENCE = 2 * Math.PI * 108; // ~678.58

export default function RestTimer({ visible, exName, setInfo, seconds, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const endTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const firedRef = useRef(false);

  // Reset when new timer starts — anchor to wall-clock end time
  useEffect(() => {
    if (!visible) return;
    endTimeRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
    setRemaining(seconds);
    setTotal(seconds);
  }, [visible, seconds]);

  // Tick using Date.now() so backgrounding the app doesn't freeze the countdown
  useEffect(() => {
    if (!visible) {
      clearInterval(intervalRef.current);
      return;
    }
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const r = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(intervalRef.current);
        playDoneSound();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 500);
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  function playDoneSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const play = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine'; g.gain.value = 0.3;
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };
      play(880, 0, 0.15);
      play(1100, 0.2, 0.2);
    } catch (e) {}
  }

  const add30 = useCallback(() => {
    endTimeRef.current = (endTimeRef.current || Date.now()) + 30000;
    setRemaining(r => r + 30);
    setTotal(t => t + 30);
  }, []);

  const isDone = remaining <= 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const pct = total > 0 ? (total - remaining) / total : 1;
  const offset = CIRCUMFERENCE * pct;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

  const ringColor = isDone ? 'var(--green)' : isWarning ? 'var(--fire2)' : 'var(--cyan)';

  if (!visible) return null;

  const ghostBtn = {
    padding: '12px 28px', minHeight: 'var(--tap-target)', minWidth: 120,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
    fontSize: 12, fontWeight: 800, letterSpacing: '0.16em',
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Rest timer, ${timeStr} left`} style={{
      position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden',
      background: 'rgba(5,7,15,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 0, padding: '0 20px',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)',
        backgroundSize: '26px 26px',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: '50%', width: 460, height: 460, marginLeft: -230, marginTop: -260,
        borderRadius: '50%', background: `radial-gradient(circle, ${isDone ? 'rgba(0,230,118,0.18)' : isWarning ? 'rgba(255,145,0,0.18)' : 'rgba(0,229,255,0.16)'}, transparent 65%)`,
        transition: 'background 0.4s',
      }} />

      <div style={{
        position: 'relative', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800,
        letterSpacing: '0.3em', color: ringColor, marginBottom: 10, transition: 'color 0.3s',
      }}>{isDone ? 'READY' : 'RECOVERING'}</div>
      <div style={{
        position: 'relative', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 900,
        color: '#fff', marginBottom: 6, textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {exName}
      </div>
      <div style={{ position: 'relative', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 28 }}>{setInfo}</div>

      <div style={{ width: 240, height: 240, position: 'relative', marginBottom: 32 }}>
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* tick ring */}
          <circle cx="120" cy="120" r="118" fill="none" stroke="rgba(0,229,255,0.25)" strokeWidth="1" strokeDasharray="2 8" />
          <circle cx="120" cy="120" r="108"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="120" cy="120" r="108"
            fill="none" stroke={ringColor} strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s',
              filter: `drop-shadow(0 0 8px ${ringColor})`,
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 900,
            color: '#fff', textShadow: `0 0 18px ${ringColor}`,
            transition: 'text-shadow 0.3s', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {isDone ? 'GO!' : timeStr}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800,
            color: 'var(--color-text-secondary)', letterSpacing: '0.24em', marginTop: 8
          }}>
            {isDone ? 'NEXT SET' : 'REST'}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 12 }}>
        <button onClick={onSkip} className="fq-press fq-skew" style={ghostBtn}>SKIP</button>

        {!isDone && (
          <button onClick={add30} className="fq-press fq-skew" style={ghostBtn}>+30s</button>
        )}

        {isDone && (
          <button onClick={onDone} className="fq-press fq-skew" style={{
            ...ghostBtn,
            background: 'linear-gradient(90deg, var(--color-success), #00c853)',
            border: 'none', color: '#05070f', fontWeight: 900,
            boxShadow: '0 0 24px rgba(0,230,118,0.45)',
          }}>NEXT SET →</button>
        )}
      </div>
    </div>,
    document.body
  );
}
