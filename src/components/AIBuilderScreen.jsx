import { useState, useEffect, useRef } from 'react';

const NAVY  = '#0a1628';
const NAVY2 = '#111827';
const CYAN  = '#00e5ff';
const PURPLE = '#a855f7';
const ORBITRON = '"Orbitron", "SF Mono", monospace';
const RAJDHANI = '"Rajdhani", -apple-system, system-ui, sans-serif';

const STEPS = [
  { label: 'Analyzing your assessment data', sub: 'Goals · Equipment · Schedule',        dur: 1900 },
  { label: 'Mapping muscle readiness',        sub: 'Split · Volume · Recovery',            dur: 2100 },
  { label: 'Selecting optimal exercises',     sub: 'Matching catalog to your setup',       dur: 2300 },
  { label: 'Calibrating intensity & volume',  sub: 'RPE targets · Working sets',           dur: 2000 },
  { label: 'Assembling your program',         sub: 'Sequencing days & rest windows',       dur: 1800 },
];

function NeuralCore({ phase }) {
  const canvasRef = useRef(null);
  const phaseRef  = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const dpr    = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE   = 240;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    const C = SIZE / 2;

    const nodes = [];
    const rings = [{ r: 0, n: 1 }, { r: 42, n: 6 }, { r: 80, n: 10 }, { r: 108, n: 14 }];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (Math.PI * 2 * i) / ring.n + ri * 0.4;
        nodes.push({ baseA: a, r: ring.r, ring: ri,
          x: C + Math.cos(a) * ring.r, y: C + Math.sin(a) * ring.r,
          pulse: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.6 });
      }
    });

    const links = [];
    nodes.forEach((n, i) => {
      nodes.forEach((m, j) => {
        if (j <= i) return;
        if (Math.abs(n.ring - m.ring) === 1) {
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < 56) links.push([i, j, d]);
        }
      });
    });

    let raf, t = 0;
    const render = () => {
      t += 0.016;
      const ph        = phaseRef.current;
      const intensity = ph === 'done' ? 0.4 : 1;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const rot = t * 0.18 * intensity;

      nodes.forEach(n => {
        const a      = n.baseA + rot * (n.ring % 2 ? 1 : -1);
        const breathe = 1 + Math.sin(t * n.speed + n.pulse) * 0.04;
        n.px = C + Math.cos(a) * n.r * breathe;
        n.py = C + Math.sin(a) * n.r * breathe;
      });

      links.forEach(([i, j]) => {
        const a    = nodes[i], b = nodes[j];
        const flow = (Math.sin(t * 2 - i * 0.3) + 1) / 2;
        ctx.strokeStyle = `rgba(0,229,255,${0.04 + flow * 0.14 * intensity})`;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        if (ph !== 'done' && flow > 0.85) {
          const fp = (t * 0.8 + i * 0.1) % 1;
          ctx.fillStyle = CYAN;
          ctx.beginPath();
          ctx.arc(a.px + (b.px - a.px) * fp, a.py + (b.py - a.py) * fp, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      nodes.forEach((n, i) => {
        const glow   = (Math.sin(t * n.speed * 2 + n.pulse) + 1) / 2;
        const isCore = n.ring === 0;
        const r      = isCore ? 7 : n.ring === 1 ? 3.4 : 2.2;
        const col    = i % 5 === 0 ? PURPLE : CYAN;
        ctx.shadowBlur  = (isCore ? 24 : 8) * intensity;
        ctx.shadowColor = col;
        ctx.fillStyle   = isCore
          ? 'rgba(255,255,255,0.9)'
          : `rgba(${col === PURPLE ? '168,85,247' : '0,229,255'},${0.5 + glow * 0.5 * intensity})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, r + (isCore ? glow * 1.5 : 0), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ width: 240, height: 240, display: 'block' }} />;
}

function HUDBg({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 32%, #16263f 0%, ${NAVY} 58%, #050a14 100%)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${CYAN}14 1px, transparent 1px), linear-gradient(90deg, ${CYAN}14 1px, transparent 1px)`,
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse at 50% 42%, black 15%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 42%, black 15%, transparent 72%)',
      }} />
      <div className="hud-scanline" style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${CYAN}66, transparent)`,
        filter: 'blur(1px)', opacity: 0.5,
      }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
      {children}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 2 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 3, height: 3, borderRadius: '50%', background: CYAN,
          animation: `fitq-think 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

function StepRow({ step, status }) {
  const isActive = status === 'active';
  const isDone   = status === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '11px 14px', borderRadius: 12,
      background: isActive ? `${CYAN}0d` : 'transparent',
      border: `1px solid ${isActive ? CYAN + '44' : 'transparent'}`,
      transition: 'all 0.4s ease',
      opacity: status === 'pending' ? 0.32 : 1,
    }}>
      <div style={{
        width: 22, height: 22, flexShrink: 0, marginTop: 1,
        borderRadius: '50%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isDone ? 'none' : `1.5px solid ${isActive ? CYAN : 'rgba(255,255,255,0.25)'}`,
        background: isDone ? `linear-gradient(135deg, ${CYAN}, ${PURPLE})` : 'transparent',
        boxShadow: isDone ? `0 0 12px ${CYAN}88` : 'none',
      }}>
        {isDone && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2.5 6.2 L5 8.7 L9.5 3.5" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <div style={{
            position: 'absolute', inset: -1, borderRadius: '50%',
            border: '1.5px solid transparent', borderTopColor: CYAN,
            animation: 'fitq-spin-cw 0.8s linear infinite',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: RAJDHANI, fontSize: 16, fontWeight: 600, letterSpacing: 0.3,
          color: isDone ? 'rgba(255,255,255,0.55)' : '#fff',
          display: 'flex', alignItems: 'center',
        }}>
          {step.label}{isActive && <ThinkingDots />}
        </div>
        {(isActive || isDone) && (
          <div style={{
            fontFamily: ORBITRON, fontSize: 9.5, letterSpacing: 1.5, marginTop: 3,
            color: isActive ? CYAN : 'rgba(255,255,255,0.3)',
            textShadow: isActive ? `0 0 6px ${CYAN}66` : 'none',
          }}>{step.sub}</div>
        )}
      </div>
    </div>
  );
}

function RevealCard() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{
      width: '100%',
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(18px) scale(0.97)',
      transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.2,0.9,0.3,1)',
    }}>
      <div style={{
        background: `linear-gradient(160deg, ${NAVY2}f0, ${NAVY}f0)`,
        border: `1px solid ${CYAN}55`, borderRadius: 18, padding: 20,
        boxShadow: `0 0 40px ${CYAN}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], i) => (
          <div key={i} style={{ position: 'absolute', [v]: 8, [h]: 8, width: 14, height: 14,
            borderTop: v === 'top'    ? `2px solid ${CYAN}` : 'none',
            borderBottom: v === 'bottom' ? `2px solid ${CYAN}` : 'none',
            borderLeft:  h === 'left'  ? `2px solid ${CYAN}` : 'none',
            borderRight: h === 'right' ? `2px solid ${CYAN}` : 'none',
            opacity: 0.6 }} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: ORBITRON, fontSize: 9, letterSpacing: 2, color: CYAN, textShadow: `0 0 8px ${CYAN}` }}>
            PROGRAM READY
          </div>
          <div style={{ fontFamily: ORBITRON, fontSize: 9, letterSpacing: 1, color: PURPLE,
            padding: '3px 8px', border: `1px solid ${PURPLE}66`, borderRadius: 4 }}>
            PERSONALIZED
          </div>
        </div>
        <div style={{ fontFamily: ORBITRON, fontSize: 21, fontWeight: 800, color: '#fff', letterSpacing: 0.5, marginTop: 6 }}>
          YOUR QUEST AWAITS
        </div>
        <div style={{ fontFamily: RAJDHANI, fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3 }}>
          Custom program built for you
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[['12', 'WEEKS'], ['AI', 'POWERED'], ['∞', 'ADAPTS']].map(([v, k], i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', padding: '10px 4px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${i === 1 ? PURPLE : CYAN}33`, borderRadius: 10 }}>
              <div style={{ fontFamily: ORBITRON, fontSize: 18, fontWeight: 700,
                color: i === 1 ? PURPLE : '#fff', textShadow: i === 1 ? `0 0 8px ${PURPLE}` : 'none' }}>{v}</div>
              <div style={{ fontFamily: ORBITRON, fontSize: 7.5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIBuilderScreen() {
  const [current, setCurrent] = useState(0);
  const [phase,   setPhase]   = useState('building');
  const [pct,     setPct]     = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('building'); setCurrent(0); setPct(0);

    let acc   = 0;
    const total = STEPS.reduce((s, x) => s + x.dur, 0);
    STEPS.forEach((step, i) => {
      acc += step.dur;
      timers.current.push(setTimeout(() => {
        setCurrent(i + 1);
        setPct(Math.round((acc / total) * 100));
      }, acc));
    });
    timers.current.push(setTimeout(() => setPhase('done'), total + 500));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const [smoothPct, setSmoothPct] = useState(0);
  useEffect(() => {
    if (phase === 'done') { setSmoothPct(100); return; }
    let raf;
    const tick = () => {
      let stop = false;
      setSmoothPct(p => {
        const next = p + (pct - p) * 0.12;
        if (Math.abs(pct - next) < 0.3) { stop = true; return pct; }
        return next;
      });
      if (!stop) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct, phase]);

  const done = phase === 'done';

  return (
    <HUDBg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '70px 22px 30px' }}>

        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: ORBITRON, fontSize: 10, letterSpacing: 5, color: 'rgba(255,255,255,0.4)' }}>
            FIT<span style={{ color: CYAN }}>·</span>QUEST AI
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          flex: done ? '0 0 auto' : '1 1 auto', justifyContent: 'center' }}>
          {done ? (
            <div style={{ position: 'relative', width: 92, height: 92,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="92" height="92" viewBox="0 0 92 92" style={{ filter: `drop-shadow(0 0 16px ${CYAN}aa)` }}>
                <circle cx="46" cy="46" r="43" fill="none" stroke={`${CYAN}33`} strokeWidth="1.5" />
                <circle cx="46" cy="46" r="35" fill="none" stroke="url(#badgeGrad)" strokeWidth="2.5" />
                <defs>
                  <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={CYAN} />
                    <stop offset="100%" stopColor={PURPLE} />
                  </linearGradient>
                </defs>
                <path d="M31 47 L42 58 L63 34" fill="none" stroke={CYAN} strokeWidth="4"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="70" style={{ animation: 'fitq-dash-in 0.6s ease-out both' }} />
              </svg>
            </div>
          ) : (
            <div style={{ position: 'relative', height: 240, width: 240,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NeuralCore phase={phase} />
              <svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="120" cy="120" r="116" fill="none" stroke={`${CYAN}22`} strokeWidth="1" />
                <circle cx="120" cy="120" r="116" fill="none" stroke={CYAN} strokeWidth="2"
                  strokeDasharray={`${(smoothPct / 100) * 2 * Math.PI * 116} ${2 * Math.PI * 116}`}
                  strokeLinecap="round" transform="rotate(-90 120 120)"
                  style={{ filter: `drop-shadow(0 0 5px ${CYAN})` }} />
              </svg>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <div style={{ fontFamily: ORBITRON, fontWeight: 700, fontSize: 19, letterSpacing: 2.5,
              color: '#fff', textShadow: done ? `0 0 14px ${CYAN}` : 'none' }}>
              {done ? 'PROGRAM FORGED' : 'BUILDING YOUR PROGRAM'}
            </div>
            {!done && (
              <div style={{ fontFamily: RAJDHANI, fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: 0.5 }}>
                AI designing a program tuned to you
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: done ? '1 1 auto' : '0 0 auto', marginTop: 18,
          display: 'flex', flexDirection: 'column', justifyContent: done ? 'center' : 'flex-start' }}>
          {!done ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {STEPS.map((step, i) => (
                <StepRow key={i} step={step}
                  status={i < current ? 'done' : i === current ? 'active' : 'pending'} />
              ))}
            </div>
          ) : (
            <RevealCard />
          )}
        </div>

        {!done && (
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: ORBITRON, fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.4)' }}>
                NEURAL ENGINE · v4.2
              </span>
              <span style={{ fontFamily: ORBITRON, fontSize: 12, fontWeight: 700, color: CYAN, textShadow: `0 0 8px ${CYAN}` }}>
                {Math.round(smoothPct)}%
              </span>
            </div>
            <div style={{ height: 5, background: `${CYAN}1a`, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${smoothPct}%`,
                background: `linear-gradient(90deg, ${CYAN}, ${PURPLE})`,
                boxShadow: `0 0 12px ${CYAN}`, borderRadius: 3 }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, width: 40,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                animation: 'fitq-xp-scan 1.6s linear infinite', mixBlendMode: 'overlay' }} />
            </div>
          </div>
        )}
      </div>
    </HUDBg>
  );
}
