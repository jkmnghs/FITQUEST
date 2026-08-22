import { useState, useEffect, useRef } from 'react';

const NAVY   = '#0a1628';
const NAVY2  = '#111827';
const CYAN   = '#00e5ff';
const PURPLE = '#a855f7';
const ORBITRON = 'var(--font-display)';
const RAJDHANI = 'var(--font-primary)';

// ── Derive readable labels from assessment values ─────────────
const GOAL_LABEL = {
  recomp: 'Body Recomp', fat_loss: 'Fat Loss',
  muscle: 'Muscle Gain', strength: 'Strength',
};
const EQUIP_LABEL = {
  full_gym: 'Full Gym', dumbbells: 'Dumbbells + Bands',
  dumbbells_only: 'Dumbbells Only', barbell_home: 'Home Barbell',
  bodyweight: 'Bodyweight',
};
const LEVEL_LABEL = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};
const SPLIT_LABEL = {
  full_body: 'Full Body', upper_lower: 'Upper / Lower', ppl: 'Push / Pull / Legs',
};

function deriveSplit(pref, numDays) {
  if (pref && pref !== 'no_preference') return pref;
  if (numDays <= 3) return 'full_body';
  if (numDays === 4) return 'upper_lower';
  return 'ppl';
}

// Build steps that reflect what the AI is actually doing
function buildSteps(assessment) {
  const goal  = assessment?.goal  || 'recomp';
  const equip = assessment?.equipment || 'full_gym';
  const level = assessment?.level || 'intermediate';
  const days  = assessment?.trainingDays?.length || assessment?.daysPerWeek || 3;
  const mins  = assessment?.sessionLength || 60;
  const split = deriveSplit(assessment?.splitPreference, days);
  const name  = assessment?.name ? assessment.name.split(' ')[0] : null;

  const goalStr  = GOAL_LABEL[goal]  || 'Fitness';
  const equipStr = EQUIP_LABEL[equip] || 'Full Gym';
  const levelStr = LEVEL_LABEL[level] || 'Intermediate';
  const splitStr = SPLIT_LABEL[split] || 'Full Body';

  return [
    {
      label: `Analyzing ${name ? name + "'s" : 'your'} profile`,
      sub: `${goalStr} · ${levelStr} · ${days} day${days > 1 ? 's' : ''}/wk`,
      dur: 1800,
    },
    {
      label: 'Loading equipment catalog',
      sub: `${equipStr} · filtering compatible exercises`,
      dur: 1900,
    },
    {
      label: 'Designing your split',
      sub: `${splitStr} · ${days} × ${mins}-min sessions`,
      dur: 2200,
    },
    {
      label: 'Calibrating intensity',
      sub: `RPE targets · sets & reps for ${goalStr}`,
      dur: 2000,
    },
    {
      label: 'Assembling your program',
      sub: `Sequencing days · balancing recovery`,
      dur: 1900,
    },
  ];
}

// ── NeuralCore canvas ─────────────────────────────────────────
function NeuralCore({ phase }) {
  const canvasRef = useRef(null);
  const phaseRef  = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const dpr    = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE   = 220;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    const C = SIZE / 2;

    const nodes = [];
    const rings = [{ r: 0, n: 1 }, { r: 38, n: 6 }, { r: 72, n: 10 }, { r: 98, n: 14 }];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (Math.PI * 2 * i) / ring.n + ri * 0.4;
        nodes.push({
          baseA: a, r: ring.r, ring: ri,
          x: C + Math.cos(a) * ring.r, y: C + Math.sin(a) * ring.r,
          pulse: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6,
        });
      }
    });

    const links = [];
    nodes.forEach((n, i) => {
      nodes.forEach((m, j) => {
        if (j <= i) return;
        if (Math.abs(n.ring - m.ring) === 1 && Math.hypot(n.x - m.x, n.y - m.y) < 52)
          links.push([i, j]);
      });
    });

    let raf, t = 0;
    const render = () => {
      t += 0.016;
      const ph        = phaseRef.current;
      const intensity = ph === 'done' ? 0.35 : 1;
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
        ctx.strokeStyle = `rgba(0,229,255,${0.04 + flow * 0.13 * intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        if (ph !== 'done' && flow > 0.82) {
          const fp = (t * 0.8 + i * 0.1) % 1;
          ctx.fillStyle = CYAN;
          ctx.beginPath();
          ctx.arc(a.px + (b.px - a.px) * fp, a.py + (b.py - a.py) * fp, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      nodes.forEach((n, i) => {
        const glow   = (Math.sin(t * n.speed * 2 + n.pulse) + 1) / 2;
        const isCore = n.ring === 0;
        const r      = isCore ? 6.5 : n.ring === 1 ? 3 : 2;
        const col    = i % 5 === 0 ? PURPLE : CYAN;
        ctx.shadowBlur  = (isCore ? 22 : 7) * intensity;
        ctx.shadowColor = col;
        ctx.fillStyle   = isCore
          ? 'rgba(255,255,255,0.92)'
          : `rgba(${col === PURPLE ? '168,85,247' : '0,229,255'},${0.5 + glow * 0.5 * intensity})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, r + (isCore ? glow * 1.4 : 0), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ width: 220, height: 220, display: 'block' }} />;
}

// ── HUD background ────────────────────────────────────────────
function HUDBg({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 30%, #16263f 0%, ${NAVY} 58%, #050a14 100%)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${CYAN}12 1px,transparent 1px),linear-gradient(90deg,${CYAN}12 1px,transparent 1px)`,
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse at 50% 40%,black 10%,transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%,black 10%,transparent 70%)',
      }} />
      <div className="hud-scanline" style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,transparent,${CYAN}55,transparent)`,
        filter: 'blur(1px)', opacity: 0.4,
      }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
      {children}
    </div>
  );
}

// ── Thinking dots ─────────────────────────────────────────────
function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 3, height: 3, borderRadius: '50%', background: CYAN,
          display: 'inline-block',
          animation: `fitq-think 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

// ── Step row ──────────────────────────────────────────────────
function StepRow({ step, status }) {
  const isActive = status === 'active';
  const isDone   = status === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px', borderRadius: 10,
      background: isActive ? `${CYAN}0c` : 'transparent',
      border: `1px solid ${isActive ? CYAN + '40' : 'transparent'}`,
      transition: 'all 0.35s ease',
      opacity: status === 'pending' ? 0.28 : 1,
    }}>
      {/* status icon */}
      <div style={{
        width: 20, height: 20, flexShrink: 0, marginTop: 2,
        borderRadius: '50%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isDone ? 'none' : `1.5px solid ${isActive ? CYAN : 'rgba(255,255,255,0.2)'}`,
        background: isDone ? `linear-gradient(135deg, ${CYAN}, ${PURPLE})` : 'transparent',
        boxShadow: isDone ? `0 0 10px ${CYAN}77` : 'none',
      }}>
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5L4.2 7.5L8.5 2.5" fill="none" stroke={NAVY} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <div style={{
            position: 'absolute', inset: -2, borderRadius: '50%',
            border: '1.5px solid transparent', borderTopColor: CYAN,
            animation: 'fitq-spin-cw 0.75s linear infinite',
          }} />
        )}
      </div>
      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: RAJDHANI, fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
          color: isDone ? 'rgba(255,255,255,0.45)' : '#fff',
          display: 'flex', alignItems: 'center',
        }}>
          {step.label}{isActive && <ThinkingDots />}
        </div>
        {(isActive || isDone) && (
          <div style={{
            fontFamily: ORBITRON, fontSize: 11, letterSpacing: 1.4, marginTop: 2,
            color: isActive ? CYAN : 'rgba(255,255,255,0.28)',
            textShadow: isActive ? `0 0 6px ${CYAN}55` : 'none',
          }}>{step.sub}</div>
        )}
      </div>
    </div>
  );
}

// ── Reveal card ───────────────────────────────────────────────
function RevealCard({ assessment, onDismiss }) {
  const [shown, setShown] = useState(false);
  // Stable ref so the auto-dismiss timer doesn't reset when App re-renders
  // and passes a new onDismiss arrow reference
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    const id   = requestAnimationFrame(() => setShown(true));
    const auto = setTimeout(() => dismissRef.current(), 3500);
    return () => { cancelAnimationFrame(id); clearTimeout(auto); };
  }, []); // intentionally empty — runs once only

  const days   = assessment?.trainingDays?.length || assessment?.daysPerWeek || 3;
  const mins   = assessment?.sessionLength || 60;
  const split  = deriveSplit(assessment?.splitPreference, days);
  const goal   = GOAL_LABEL[assessment?.goal] || 'Fitness';
  const name   = assessment?.name ? assessment.name.split(' ')[0] : null;

  const splitShort = {
    full_body: 'FULL BODY', upper_lower: 'UPPER / LOWER', ppl: 'PPL',
  }[split] || 'FULL BODY';

  return (
    <div style={{
      width: '100%',
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(16px) scale(0.97)',
      transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.2,0.9,0.3,1)',
    }}>
      {/* card */}
      <div style={{
        background: `linear-gradient(160deg,${NAVY2}f0,${NAVY}f0)`,
        border: `1px solid ${CYAN}50`, borderRadius: 16, padding: '18px 18px 16px',
        boxShadow: `0 0 40px ${CYAN}1a,inset 0 1px 0 rgba(255,255,255,0.05)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* corner accents */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
          <div key={i} style={{
            position:'absolute',[v]:7,[h]:7,width:12,height:12,
            borderTop:    v==='top'    ?`2px solid ${CYAN}`:'none',
            borderBottom: v==='bottom' ?`2px solid ${CYAN}`:'none',
            borderLeft:   h==='left'   ?`2px solid ${CYAN}`:'none',
            borderRight:  h==='right'  ?`2px solid ${CYAN}`:'none',
            opacity:0.55,
          }}/>
        ))}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontFamily:ORBITRON, fontSize:8.5, letterSpacing:2, color:CYAN, textShadow:`0 0 8px ${CYAN}` }}>
            PROGRAM READY
          </div>
          <div style={{ fontFamily:ORBITRON, fontSize:8, letterSpacing:1, color:PURPLE,
            padding:'2px 7px', border:`1px solid ${PURPLE}55`, borderRadius:3 }}>
            {goal.toUpperCase()}
          </div>
        </div>

        <div style={{ fontFamily:ORBITRON, fontSize:19, fontWeight:800, color:'#fff', letterSpacing:0.5 }}>
          {name ? `${name.toUpperCase()}'S QUEST` : 'YOUR QUEST'}
        </div>
        <div style={{ fontFamily:RAJDHANI, fontSize:13, color:'rgba(255,255,255,0.45)', letterSpacing:0.3, marginTop:2 }}>
          {splitShort} · AI-personalized program
        </div>

        {/* stat strip */}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          {[
            [String(days), 'DAYS/WK', false],
            [String(mins), 'MIN/SESSION', false],
            ['12', 'WEEKS', false],
            ['+XP', 'EARNED', true],
          ].map(([v,k,isPurple],i)=>(
            <div key={k} style={{
              flex:1, textAlign:'center', padding:'9px 3px',
              background:'rgba(255,255,255,0.025)',
              border:`1px solid ${isPurple?PURPLE:CYAN}2a`, borderRadius:8,
            }}>
              <div style={{
                fontFamily:ORBITRON, fontSize:16, fontWeight:700,
                color:isPurple?PURPLE:'#fff',
                textShadow:isPurple?`0 0 8px ${PURPLE}`:'none',
              }}>{v}</div>
              <div style={{ fontFamily:ORBITRON, fontSize:7, letterSpacing:1.2, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button onClick={() => dismissRef.current()} style={{
        width:'100%', marginTop:12, padding:'15px', border:'none', cursor:'pointer',
        background:`linear-gradient(135deg,${CYAN},${PURPLE})`,
        borderRadius:12, fontFamily:ORBITRON, fontSize:13, fontWeight:700, letterSpacing:2,
        color:NAVY, boxShadow:`0 8px 24px ${CYAN}44`,
      }}>
        START QUEST →
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function AIBuilderScreen({ assessment, apiReady = false, onDismiss, generationFailed = false, onRetry }) {
  const STEPS     = buildSteps(assessment);
  const TOTAL_DUR = STEPS.reduce((s, x) => s + x.dur, 0); // ~9800ms

  const [current,  setCurrent]  = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const [phase,    setPhase]    = useState('building'); // 'building' | 'done'
  const [pct,      setPct]      = useState(0);
  const [smoothPct, setSmoothPct] = useState(0);
  const timers = useRef([]);

  // Derived: animation has covered all steps but API hasn't returned yet.
  // Using current >= STEPS.length catches the 300ms gap before animDone fires
  // so the last step never flickers done → active.
  const waitingForAPI = !apiReady && !generationFailed && (animDone || current >= STEPS.length);
  const done = phase === 'done';

  // Kick off step timers once
  useEffect(() => {
    let acc = 0;
    STEPS.forEach((step, i) => {
      acc += step.dur;
      const elapsed = acc; // capture by value — acc mutates each iteration
      timers.current.push(setTimeout(() => {
        setCurrent(i + 1);
        setPct(Math.round((elapsed / TOTAL_DUR) * 100));
      }, elapsed));
    });
    timers.current.push(setTimeout(() => setAnimDone(true), TOTAL_DUR + 300));
    return () => timers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transition to done ONLY when both animation finished AND API returned
  useEffect(() => {
    if (animDone && (apiReady || generationFailed)) {
      const t = setTimeout(() => setPhase('done'), 250);
      return () => clearTimeout(t);
    }
  }, [animDone, apiReady]);

  // Smooth progress bar — hold at current position (≤98%) while waiting for API
  // so the bar never visually regresses when pct hits 100 before apiReady.
  useEffect(() => {
    if (done) { setSmoothPct(100); return; }
    let raf;
    const tick = () => {
      let stop = false;
      setSmoothPct(p => {
        if (waitingForAPI && p >= 98) { stop = true; return p; } // freeze, don't regress
        const target = waitingForAPI ? 98 : pct;
        const next   = p + (target - p) * 0.1;
        if (Math.abs(target - next) < 0.3) { stop = true; return target; }
        return next;
      });
      if (!stop) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct, done, waitingForAPI]);

  return (
    <HUDBg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        // Routed through the shared tokens so the insets stay consistent with
        // the rest of the app (and can be overridden for testing).
        padding: 'max(64px, var(--safe-area-top)) 20px max(24px, var(--safe-area-bottom))',
      }}>

        {/* top label */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: ORBITRON, fontSize: 9.5, letterSpacing: 5, color: 'rgba(255,255,255,0.35)' }}>
            FIT<span style={{ color: CYAN }}>·</span>QUEST AI
          </div>
        </div>

        {/* core visual */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          flex: done ? '0 0 auto' : '1 1 auto', justifyContent: 'center',
        }}>
          {done ? (
            <div style={{ position: 'relative', width: 86, height: 86,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="86" height="86" viewBox="0 0 86 86" style={{ filter: `drop-shadow(0 0 14px ${CYAN}99)` }}>
                <circle cx="43" cy="43" r="40" fill="none" stroke={`${CYAN}30`} strokeWidth="1.5" />
                <circle cx="43" cy="43" r="33" fill="none" stroke="url(#bgGrad)" strokeWidth="2.5" />
                <defs>
                  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={CYAN} />
                    <stop offset="100%" stopColor={PURPLE} />
                  </linearGradient>
                </defs>
                <path d="M29 44 L40 55 L60 32" fill="none" stroke={CYAN} strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="65" style={{ animation: 'fitq-dash-in 0.55s ease-out both' }} />
              </svg>
            </div>
          ) : (
            <div style={{ position: 'relative', width: 220, height: 220,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NeuralCore phase={phase} />
              <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <circle cx="110" cy="110" r="107" fill="none" stroke={`${CYAN}18`} strokeWidth="1" />
                <circle cx="110" cy="110" r="107" fill="none" stroke={CYAN} strokeWidth="2"
                  strokeDasharray={`${((waitingForAPI ? Math.min(smoothPct, 98) : smoothPct) / 100) * 2 * Math.PI * 107} ${2 * Math.PI * 107}`}
                  strokeLinecap="round" transform="rotate(-90 110 110)"
                  style={{ filter: `drop-shadow(0 0 4px ${CYAN})`, transition: 'stroke-dasharray 0.4s' }} />
              </svg>
            </div>
          )}

          {/* title */}
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{
              fontFamily: ORBITRON, fontWeight: 700, fontSize: 17, letterSpacing: 2,
              color: '#fff', textShadow: done ? `0 0 12px ${CYAN}` : 'none',
            }}>
              {done ? 'PROGRAM FORGED' : waitingForAPI ? 'FINALIZING…' : 'BUILDING YOUR PROGRAM'}
            </div>
            {!done && (
              <div style={{ fontFamily: RAJDHANI, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: 0.3 }}>
                {waitingForAPI ? 'AI is finalizing your plan' : 'AI designing a program tuned to you'}
              </div>
            )}
          </div>
        </div>

        {/* steps / reveal */}
        <div style={{
          flex: done ? '1 1 auto' : '0 0 auto', marginTop: 16,
          display: 'flex', flexDirection: 'column', justifyContent: done ? 'center' : 'flex-start',
        }}>
          {!done ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {STEPS.map((step, i) => (
                <StepRow key={i} step={step}
                  status={
                    waitingForAPI
                      ? (i === STEPS.length - 1 ? 'active' : 'done')
                      : i < current ? 'done'
                      : i === current ? 'active'
                      : 'pending'
                  }
                />
              ))}
            </div>
          ) : generationFailed ? (
            /* The AI build failed (offline, quota, upstream error). Say so —
               silently falling through to the generic full-body program left a
               user who explicitly picked PPL wondering why they got full body. */
            <div style={{ textAlign: 'center', padding: '20px 8px' }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontFamily: ORBITRON, fontSize: 13, fontWeight: 700, color: CYAN, marginBottom: 8, letterSpacing: 1 }}>
                COULDN'T BUILD YOUR CUSTOM SPLIT
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 20px' }}>
                We've started you on a proven program that matches your equipment and schedule.
                You can retry the custom build, or edit your program any time from the Profile tab.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {onRetry && (
                  <button onClick={onRetry} style={{
                    padding: '11px 20px', borderRadius: 11, border: `1px solid ${CYAN}`,
                    background: 'transparent', color: CYAN,
                    fontFamily: ORBITRON, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                  }}>RETRY BUILD</button>
                )}
                <button onClick={onDismiss} style={{
                  padding: '11px 20px', borderRadius: 11, border: 'none',
                  background: CYAN, color: '#0a0e1a',
                  fontFamily: ORBITRON, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                }}>CONTINUE</button>
              </div>
            </div>
          ) : (
            <RevealCard assessment={assessment} onDismiss={onDismiss} />
          )}
        </div>

        {/* progress footer (building only) */}
        {!done && (
          <div style={{ marginTop: 'auto', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: ORBITRON, fontSize: 8.5, letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
                NEURAL ENGINE · v4.2
              </span>
              <span style={{ fontFamily: ORBITRON, fontSize: 11, fontWeight: 700, color: CYAN, textShadow: `0 0 8px ${CYAN}` }}>
                {Math.min(Math.round(smoothPct), waitingForAPI ? 98 : 100)}%
              </span>
            </div>
            <div style={{ height: 4, background: `${CYAN}18`, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, width: `${waitingForAPI ? Math.min(smoothPct, 98) : smoothPct}%`,
                background: `linear-gradient(90deg,${CYAN},${PURPLE})`,
                boxShadow: `0 0 10px ${CYAN}`, borderRadius: 3,
                transition: 'width 0.3s',
              }} />
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 36,
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',
                animation: 'fitq-xp-scan 1.6s linear infinite', mixBlendMode: 'overlay',
              }} />
            </div>
          </div>
        )}
      </div>
    </HUDBg>
  );
}
