import React, { useState, useEffect, useRef, useCallback } from 'react';

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 0
    }}>
      <div style={{
        fontFamily: 'Exo 2, sans-serif', fontSize: 18, fontWeight: 700,
        color: 'var(--text)', marginBottom: 6, textAlign: 'center', padding: '0 20px'
      }}>
        {exName}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>{setInfo}</div>

      <div style={{ width: 220, height: 220, position: 'relative', marginBottom: 28 }}>
        <svg width="220" height="220" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="120" cy="120" r="108"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx="120" cy="120" r="108"
            fill="none" stroke={ringColor} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: 48, fontWeight: 900,
            color: ringColor, transition: 'color 0.3s', lineHeight: 1
          }}>
            {isDone ? '✓' : timeStr}
          </div>
          <div style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 600,
            color: 'var(--text2)', letterSpacing: 1.5, marginTop: 4
          }}>
            {isDone ? 'GO!' : 'REST'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSkip} style={{
          padding: '12px 28px', borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text2)', fontFamily: 'Orbitron, sans-serif',
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5
        }}>SKIP</button>

        {!isDone && (
          <button onClick={add30} style={{
            padding: '12px 28px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text2)', fontFamily: 'Orbitron, sans-serif',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5
          }}>+30s</button>
        )}

        {isDone && (
          <button onClick={onDone} style={{
            padding: '12px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
            border: 'none', color: 'var(--bg)',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
            boxShadow: '0 4px 18px var(--cyan-glow)'
          }}>NEXT SET →</button>
        )}
      </div>
    </div>
  );
}
