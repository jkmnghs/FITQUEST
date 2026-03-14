import React, { useState, useEffect, useRef, useCallback } from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 108; // ~678.58

export default function RestTimer({ visible, exName, setInfo, seconds, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Reset when new timer starts
  useEffect(() => {
    if (!visible) return;
    setRemaining(seconds);
    setTotal(seconds);
  }, [visible, seconds]);

  // Tick
  useEffect(() => {
    if (!visible) {
      clearInterval(intervalRef.current);
      return;
    }
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          playDoneSound();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [visible]); // only re-run when visibility changes

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
  const timeColor = ringColor;

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 0
    }}>
      {/* Exercise name */}
      <div style={{
        fontFamily: 'Exo 2, sans-serif', fontSize: 18, fontWeight: 700,
        color: 'var(--text)', marginBottom: 6, textAlign: 'center', padding: '0 20px'
      }}>
        {exName}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>{setInfo}</div>

      {/* Ring */}
      <div style={{ width: 220, height: 220, position: 'relative', marginBottom: 28 }}>
        <svg width="220" height="220" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
          <circle className="track" cx="120" cy="120" r="108"
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
            color: timeColor, transition: 'color 0.3s',
            lineHeight: 1
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

      {/* Buttons */}
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
