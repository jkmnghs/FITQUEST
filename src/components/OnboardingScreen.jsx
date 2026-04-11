import React, { useState } from 'react';

const DAYS = [
  { id: 'mon', label: 'M', full: 'Mon' },
  { id: 'tue', label: 'T', full: 'Tue' },
  { id: 'wed', label: 'W', full: 'Wed' },
  { id: 'thu', label: 'T', full: 'Thu' },
  { id: 'fri', label: 'F', full: 'Fri' },
  { id: 'sat', label: 'S', full: 'Sat' },
  { id: 'sun', label: 'S', full: 'Sun' },
];

const PARQ_QUESTIONS = [
  'Has your doctor ever said you have a heart condition and recommended only medically supervised activity?',
  'Do you feel pain in your chest when you do physical activity?',
  'In the past month, have you had chest pain when you were not doing physical activity?',
  'Do you lose your balance because of dizziness or do you ever lose consciousness?',
  'Do you have a bone or joint problem that could be made worse by physical activity?',
  'Is your doctor currently prescribing drugs for your blood pressure or heart condition?',
  'Do you know of any other reason why you should not do physical activity?',
];

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid rgba(0,229,255,0.1)',
      borderRadius: 20, padding: '24px 20px',
      backdropFilter: 'blur(20px)', ...style
    }}>{children}</div>
  );
}

function OptionBtn({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 16px', marginBottom: 10,
        borderRadius: 12,
        border: selected ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
        background: selected ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
        color: selected ? 'var(--cyan)' : 'var(--text)',
        fontSize: 15, fontFamily: 'Rajdhani', fontWeight: 600,
        textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: selected ? '5px solid var(--cyan)' : '2px solid rgba(255,255,255,0.3)',
        background: 'transparent', display: 'inline-block',
      }} />
      {children}
    </button>
  );
}

function StepHeader({ step, total, title }) {
  const pct = (step / total) * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
          color: 'var(--text3)', letterSpacing: 1.5,
        }}>STEP {step} OF {total}</div>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 9, color: 'var(--cyan)',
        }}>{Math.round(pct)}%</div>
      </div>
      <div style={{
        height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)',
        marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
          width: `${pct}%`, transition: 'width 0.4s',
        }} />
      </div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700,
        color: 'var(--text)', lineHeight: 1.3,
      }}>{title}</div>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = 'NEXT', nextDisabled = false, step }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
      {step > 1 && (
        <button onClick={onBack} style={{
          flex: 1, padding: '13px', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: 'var(--text2)',
          fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
        }}>← BACK</button>
      )}
      <button onClick={onNext} disabled={nextDisabled} style={{
        flex: 2, padding: '13px', borderRadius: 12,
        border: 'none',
        background: nextDisabled ? 'rgba(0,229,255,0.2)' : 'var(--cyan)',
        color: nextDisabled ? 'rgba(0,229,255,0.5)' : 'var(--bg)',
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
        cursor: nextDisabled ? 'not-allowed' : 'pointer',
        boxShadow: nextDisabled ? 'none' : '0 0 20px rgba(0,229,255,0.2)',
        transition: 'all 0.2s',
      }}>{nextLabel} {!nextDisabled && step < 7 ? '→' : ''}</button>
    </div>
  );
}

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    parqAnswers: Array(7).fill(false),
    parqFlagged: false,
    goal: null,
    level: null,
    daysPerWeek: null,
    sessionLength: null,
    equipment: null,
    age: '',
    sex: null,
    weightKg: '',
    heightCm: '',
    waistCm: '',
    trainingDays: [],
    injuries: '',
  });

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  function handleNext() {
    if (step < 7) setStep(s => s + 1);
    else {
      const assessment = {
        ...data,
        parqFlagged: data.parqAnswers.some(Boolean),
        age: parseFloat(data.age) || null,
        weightKg: parseFloat(data.weightKg) || null,
        heightCm: parseFloat(data.heightCm) || null,
        waistCm: data.waistCm ? parseFloat(data.waistCm) : null,
        completed: true,
      };
      onComplete(assessment);
    }
  }
  function handleBack() { setStep(s => Math.max(1, s - 1)); }

  // ── Step 1: PAR-Q+ ──
  if (step === 1) {
    const anyYes = data.parqAnswers.some(Boolean);
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={1} total={7} title="Health & Safety Screening" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
            Please answer honestly. This is the PAR-Q+ safety screening used by health professionals worldwide.
          </div>
          {PARQ_QUESTIONS.map((q, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{q}</div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2 }}>
                {[['NO', false], ['YES', true]].map(([label, val]) => (
                  <button key={label} onClick={() => {
                    const next = [...data.parqAnswers];
                    next[i] = val;
                    set('parqAnswers', next);
                  }} style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: data.parqAnswers[i] === val
                      ? `2px solid ${val ? 'var(--red)' : 'var(--cyan)'}`
                      : '1px solid rgba(255,255,255,0.1)',
                    background: data.parqAnswers[i] === val
                      ? (val ? 'rgba(255,50,50,0.12)' : 'rgba(0,229,255,0.1)')
                      : 'transparent',
                    color: data.parqAnswers[i] === val
                      ? (val ? 'var(--red)' : 'var(--cyan)')
                      : 'var(--text3)',
                    fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                    cursor: 'pointer', minWidth: 40,
                  }}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          {anyYes && (
            <div style={{
              marginTop: 16, padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)',
              fontSize: 13, color: '#ffaa00', lineHeight: 1.6,
            }}>
              ⚠️ <strong>Heads up:</strong> We recommend getting clearance from your doctor before starting a new exercise program. You can still use FitQuest — just consult a healthcare provider before your first session.
            </div>
          )}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext}
            nextDisabled={data.parqAnswers.some(v => v === undefined)} />
        </Card>
      </div>
    );
  }

  // ── Step 2: Goal ──
  if (step === 2) {
    const goals = [
      { id: 'recomp',   label: 'Body Recomposition',  sub: 'Build muscle while losing fat' },
      { id: 'fat_loss', label: 'Fat Loss',              sub: 'Lose weight, maintain muscle' },
      { id: 'muscle',   label: 'Build Muscle',          sub: 'Maximize hypertrophy and size' },
      { id: 'strength', label: 'Get Stronger',          sub: 'Focus on strength and performance' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={2} total={7} title="What's Your Main Goal?" />
          {goals.map(g => (
            <OptionBtn key={g.id} selected={data.goal === g.id} onClick={() => set('goal', g.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{g.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} nextDisabled={!data.goal} />
        </Card>
      </div>
    );
  }

  // ── Step 3: Experience ──
  if (step === 3) {
    const levels = [
      { id: 'beginner',     label: 'Beginner',     sub: 'Less than 6 months of consistent training' },
      { id: 'intermediate', label: 'Intermediate',  sub: '6 months – 2 years of training' },
      { id: 'advanced',     label: 'Advanced',      sub: '2+ years of consistent training' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={3} total={7} title="What's Your Fitness Level?" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
            Be honest — this is the single most important factor in building your program.
          </div>
          {levels.map(l => (
            <OptionBtn key={l.id} selected={data.level === l.id} onClick={() => set('level', l.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{l.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} nextDisabled={!data.level} />
        </Card>
      </div>
    );
  }

  // ── Step 4: Schedule ──
  if (step === 4) {
    const daysOpts = [2, 3, 4, 5];
    const lengthOpts = [
      { val: 30, label: '30 min', sub: 'Express session' },
      { val: 45, label: '45 min', sub: 'Efficient' },
      { val: 60, label: '60 min', sub: 'Standard' },
      { val: 90, label: '90 min', sub: 'Extended' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={4} total={7} title="Your Training Schedule" />
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>DAYS PER WEEK</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {daysOpts.map(d => (
              <button key={d} onClick={() => set('daysPerWeek', d)} style={{
                flex: 1, padding: '12px 4px',
                borderRadius: 10,
                border: data.daysPerWeek === d ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                background: data.daysPerWeek === d ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: data.daysPerWeek === d ? 'var(--cyan)' : 'var(--text)',
                fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}>{d}</button>
            ))}
          </div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>SESSION LENGTH</div>
          {lengthOpts.map(l => (
            <OptionBtn key={l.val} selected={data.sessionLength === l.val}
              onClick={() => set('sessionLength', l.val)}>
              <div>
                <span style={{ fontWeight: 700 }}>{l.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>{l.sub}</span>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext}
            nextDisabled={!data.daysPerWeek || !data.sessionLength} />
        </Card>
      </div>
    );
  }

  // ── Step 5: Equipment ──
  if (step === 5) {
    const eqs = [
      { id: 'full_gym',      label: 'Full Gym',           sub: 'Barbells, machines, dumbbells — everything' },
      { id: 'dumbbells',     label: 'Dumbbells + Machines', sub: 'No barbell, but have machines' },
      { id: 'barbell_home',  label: 'Barbell at Home',    sub: 'Home gym with barbell setup' },
      { id: 'bodyweight',    label: 'Bodyweight Only',    sub: 'No equipment — home or outdoors' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={5} total={7} title="What Equipment Do You Have?" />
          {eqs.map(eq => (
            <OptionBtn key={eq.id} selected={data.equipment === eq.id}
              onClick={() => set('equipment', eq.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{eq.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{eq.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} nextDisabled={!data.equipment} />
        </Card>
      </div>
    );
  }

  // ── Step 6: Body Stats ──
  if (step === 6) {
    const bodyValid = data.age && data.sex && data.weightKg && data.heightCm;
    function NumInput({ label, value, onChange, placeholder, unit }) {
      return (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
          }}>{label}{unit && <span style={{ color: 'var(--text3)', marginLeft: 4 }}>({unit})</span>}</div>
          <input
            type="number" inputMode="decimal" value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={6} total={7} title="Your Body Stats" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
            Used to calculate your personalized calorie targets using the Mifflin-St Jeor formula.
          </div>
          <NumInput label="AGE" value={data.age} onChange={v => set('age', v)} placeholder="25" unit="years" />
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 8,
            }}>BIOLOGICAL SEX</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['male', 'Male'], ['female', 'Female']].map(([val, label]) => (
                <button key={val} onClick={() => set('sex', val)} style={{
                  flex: 1, padding: '12px',
                  borderRadius: 10,
                  border: data.sex === val ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                  background: data.sex === val ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                  color: data.sex === val ? 'var(--cyan)' : 'var(--text)',
                  fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          </div>
          <NumInput label="WEIGHT" value={data.weightKg} onChange={v => set('weightKg', v)} placeholder="70" unit="kg" />
          <NumInput label="HEIGHT" value={data.heightCm} onChange={v => set('heightCm', v)} placeholder="170" unit="cm" />
          <NumInput label="WAIST CIRCUMFERENCE (optional)" value={data.waistCm}
            onChange={v => set('waistCm', v)} placeholder="85" unit="cm" />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
            Waist measurement enables Asian-adjusted health risk screening.
          </div>
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} nextDisabled={!bodyValid} />
        </Card>
      </div>
    );
  }

  // ── Step 7: Training Days + Injuries ──
  if (step === 7) {
    const needed = data.daysPerWeek || 3;
    const selected = data.trainingDays;
    const exactly = selected.length === needed;

    function toggleDay(id) {
      if (selected.includes(id)) {
        set('trainingDays', selected.filter(d => d !== id));
      } else if (selected.length < needed) {
        set('trainingDays', [...selected, id]);
      }
    }

    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={7} total={7} title="Pick Your Training Days" />
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
            Select exactly <strong style={{ color: 'var(--cyan)' }}>{needed} days</strong> per week.
            <span style={{ color: 'var(--text3)', marginLeft: 6 }}>({selected.length}/{needed} selected)</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, justifyContent: 'space-between' }}>
            {DAYS.map(d => {
              const isSelected = selected.includes(d.id);
              const disabled = !isSelected && selected.length >= needed;
              return (
                <button key={d.id} onClick={() => toggleDay(d.id)} disabled={disabled} style={{
                  width: 40, height: 48, borderRadius: 10, flexShrink: 0,
                  border: isSelected ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? 'var(--cyan)' : (disabled ? 'rgba(255,255,255,0.2)' : 'var(--text2)'),
                  fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  transition: 'all 0.15s',
                }}>
                  <span>{d.label}</span>
                  <span style={{ fontSize: 8, fontWeight: 400 }}>{d.full}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 8,
          }}>INJURIES OR LIMITATIONS (optional)</div>
          <textarea
            value={data.injuries}
            onChange={e => set('injuries', e.target.value)}
            placeholder="e.g. Right knee pain, avoid heavy squats"
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)', fontSize: 14, fontFamily: 'Rajdhani',
              outline: 'none', resize: 'none', boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
            Quest will use this to suggest safer exercise alternatives.
          </div>
          <NavButtons step={step} onBack={handleBack} onNext={handleNext}
            nextLabel="START MY PROGRAM" nextDisabled={!exactly} />
        </Card>
      </div>
    );
  }

  return null;
}
