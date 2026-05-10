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

const MOVEMENTS = [
  { id: 'squat', name: 'Barbell Back Squat' },
  { id: 'deadlift', name: 'Barbell Deadlift' },
  { id: 'benchPress', name: 'Barbell Bench Press' },
  { id: 'overheadPress', name: 'Overhead Press' },
  { id: 'pullUp', name: 'Pull-up / Chin-up' },
  { id: 'barbellRow', name: 'Barbell Row' },
];

const PAIN_REGIONS = [
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'lowerBack', name: 'Lower Back' },
  { id: 'knees', name: 'Knees' },
  { id: 'hips', name: 'Hips' },
  { id: 'wrists', name: 'Wrists / Elbows' },
  { id: 'neck', name: 'Neck' },
];

const SEVERITY_OPTIONS = ['none', 'mild', 'moderate', 'severe'];

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

function CheckBtn({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px', marginBottom: 6, marginRight: 6,
        borderRadius: 10,
        border: selected ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
        background: selected ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
        color: selected ? 'var(--cyan)' : 'var(--text)',
        fontSize: 14, fontFamily: 'Rajdhani', fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: selected ? '2px solid var(--cyan)' : '2px solid rgba(255,255,255,0.3)',
        background: selected ? 'var(--cyan)' : 'transparent',
        display: 'inline-block',
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

function NumInput({ label, value, onChange, placeholder, unit, isText, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
        color: error ? 'var(--fire2)' : 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
      }}>{label}{unit && <span style={{ marginLeft: 4 }}>({unit})</span>}</div>
      <input
        type={isText ? 'text' : 'number'} inputMode={isText ? 'text' : 'decimal'} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={isText ? 50 : undefined}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 10,
          border: error ? '1.5px solid var(--fire2)' : '1px solid rgba(255,255,255,0.1)',
          background: error ? 'rgba(255,80,80,0.06)' : 'rgba(255,255,255,0.05)',
          color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
      />
      {error && (
        <div style={{ fontSize: 11, color: 'var(--fire2)', marginTop: 5, lineHeight: 1.4 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

function validateBodyStats(data) {
  const e = {};
  const name = data.name?.trim() ?? '';
  if (!name) e.name = 'Name is required.';
  else if (name.length < 2) e.name = 'Name must be at least 2 characters.';

  const age = Number(data.age);
  if (!data.age) e.age = 'Age is required.';
  else if (!Number.isFinite(age) || age < 13 || age > 100) e.age = 'Enter an age between 13 and 100.';

  if (!data.sex) e.sex = 'Please select your biological sex.';

  const wt = Number(data.weightKg);
  if (!data.weightKg) e.weightKg = 'Weight is required.';
  else if (!Number.isFinite(wt) || wt < 20 || wt > 400) e.weightKg = 'Enter a realistic weight (20–400 kg).';

  const ht = Number(data.heightCm);
  if (!data.heightCm) e.heightCm = 'Height is required.';
  else if (!Number.isFinite(ht) || ht < 100 || ht > 250) e.heightCm = 'Enter a realistic height (100–250 cm).';

  if (data.waistCm) {
    const wc = Number(data.waistCm);
    const ht = Number(data.heightCm) || 170;
    const minWaist = Math.max(55, Math.round(ht * 0.30)); // < 30% of height is physiologically impossible
    if (!Number.isFinite(wc) || wc < minWaist || wc > 250)
      e.waistCm = `Enter ${minWaist}–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size.`;
  }
  return e;
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
      }}>{nextLabel} {!nextDisabled && step < TOTAL_STEPS ? '→' : ''}</button>
    </div>
  );
}

function RadioRow({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: '6px 10px', borderRadius: 8, fontSize: 11,
          fontFamily: 'Rajdhani', fontWeight: 600, cursor: 'pointer',
          border: value === opt ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
          background: value === opt ? 'rgba(0,229,255,0.1)' : 'transparent',
          color: value === opt ? 'var(--cyan)' : 'var(--text3)',
          textTransform: 'capitalize',
        }}>{opt}</button>
      ))}
    </div>
  );
}

const TOTAL_STEPS = 14;

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [data, setData] = useState({
    name: '',
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
    // Phase 3 new fields
    movementCompetency: {},
    estimatedMaxes: { squat: '', bench: '', deadlift: '', ohp: '' },
    painRegions: { shoulders: 'none', lowerBack: 'none', knees: 'none', hips: 'none', wrists: 'none', neck: 'none' },
    splitPreference: null,
    // Lifestyle
    dailyActivity: null,
    sleepHours: null,
    stressLevel: null,
    // Dietary
    dietaryRestrictions: [],
    trackingExperience: null,
    mealsPerDay: null,
    // Motivation
    primaryMotivation: null,
    previousQuitReason: null,
  });

  const set = (key, val) => {
    setData(d => ({ ...d, [key]: val }));
    setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };
  const isAdvanced = data.level === 'intermediate' || data.level === 'advanced';

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else {
      const assessment = {
        ...data,
        parqFlagged: data.parqAnswers.some(Boolean),
        age: parseFloat(data.age) || null,
        weightKg: parseFloat(data.weightKg) || null,
        heightCm: parseFloat(data.heightCm) || null,
        waistCm: data.waistCm ? parseFloat(data.waistCm) : null,
        estimatedMaxes: {
          squat: data.estimatedMaxes.squat ? parseFloat(data.estimatedMaxes.squat) : null,
          bench: data.estimatedMaxes.bench ? parseFloat(data.estimatedMaxes.bench) : null,
          deadlift: data.estimatedMaxes.deadlift ? parseFloat(data.estimatedMaxes.deadlift) : null,
          ohp: data.estimatedMaxes.ohp ? parseFloat(data.estimatedMaxes.ohp) : null,
        },
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
          <StepHeader step={1} total={TOTAL_STEPS} title="Health & Safety Screening" />
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
          <StepHeader step={2} total={TOTAL_STEPS} title="What's Your Main Goal?" />
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
          <StepHeader step={3} total={TOTAL_STEPS} title="What's Your Fitness Level?" />
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

  // ── Step 4: Movement Competency (Phase 3.1) ──
  if (step === 4) {
    const competencyLevels = ['confident', 'unsure', 'never'];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={4} total={TOTAL_STEPS} title="Movement Competency" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
            Which of these movements can you currently perform with good form?
          </div>
          {MOVEMENTS.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{m.name}</div>
              <RadioRow
                options={competencyLevels}
                value={data.movementCompetency[m.id]}
                onChange={v => set('movementCompetency', { ...data.movementCompetency, [m.id]: v })}
              />
            </div>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 5: Estimated Current Lifts (Intermediate/Advanced only) (Phase 3.2) ──
  if (step === 5) {
    if (!isAdvanced) {
      // Skip this step for beginners
      if (step === 5) { setStep(6); return null; }
    }
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={5} total={TOTAL_STEPS} title="Your Current Lifts" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
            What are your current estimated or known maxes? Leave blank if unsure.
          </div>
          <NumInput label="BARBELL SQUAT" value={data.estimatedMaxes.squat}
            onChange={v => set('estimatedMaxes', { ...data.estimatedMaxes, squat: v })} placeholder="e.g. 100" unit="kg" />
          <NumInput label="BENCH PRESS" value={data.estimatedMaxes.bench}
            onChange={v => set('estimatedMaxes', { ...data.estimatedMaxes, bench: v })} placeholder="e.g. 80" unit="kg" />
          <NumInput label="DEADLIFT" value={data.estimatedMaxes.deadlift}
            onChange={v => set('estimatedMaxes', { ...data.estimatedMaxes, deadlift: v })} placeholder="e.g. 120" unit="kg" />
          <NumInput label="OVERHEAD PRESS" value={data.estimatedMaxes.ohp}
            onChange={v => set('estimatedMaxes', { ...data.estimatedMaxes, ohp: v })} placeholder="e.g. 50" unit="kg" />
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 6: Body Region Pain Assessment (Phase 3.3) ──
  if (step === 6) {
    const hasSevere = Object.values(data.painRegions).some(v => v === 'severe');
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={6} total={TOTAL_STEPS} title="Pain & Limitations" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
            Do you currently have pain or limitations in any of these areas?
          </div>
          {PAIN_REGIONS.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--text)', minWidth: 90 }}>{r.name}</div>
              <RadioRow
                options={SEVERITY_OPTIONS}
                value={data.painRegions[r.id]}
                onChange={v => set('painRegions', { ...data.painRegions, [r.id]: v })}
              />
            </div>
          ))}
          {hasSevere && (
            <div style={{
              marginTop: 16, padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.25)',
              fontSize: 13, color: '#ff5555', lineHeight: 1.6,
            }}>
              🏥 <strong>Important:</strong> You indicated severe pain in one or more areas. We strongly recommend getting medical clearance before starting any exercise program. FitQuest will automatically substitute safer exercises for affected areas.
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
              color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 8,
            }}>ADDITIONAL NOTES (optional)</div>
            <textarea
              value={data.injuries}
              onChange={e => set('injuries', e.target.value)}
              placeholder="e.g. Had ACL surgery 2 years ago, fully recovered"
              rows={2}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)', fontSize: 14, fontFamily: 'Rajdhani',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
              }}
            />
          </div>
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 7: Schedule ──
  if (step === 7) {
    const daysOpts = [2, 3, 4];
    const lengthOpts = [
      { val: 30, label: '30 min', sub: 'Express session' },
      { val: 45, label: '45 min', sub: 'Efficient' },
      { val: 60, label: '60 min', sub: 'Standard' },
      { val: 90, label: '90 min', sub: 'Extended' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={7} total={TOTAL_STEPS} title="Your Training Schedule" />
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

  // ── Step 8: Equipment ──
  if (step === 8) {
    const eqs = [
      { id: 'full_gym',       label: 'Full Gym',              sub: 'Barbells, machines, dumbbells — everything' },
      { id: 'dumbbells',      label: 'Dumbbells + Machines',  sub: 'No barbell, but have cable/machine access' },
      { id: 'dumbbells_only', label: 'Dumbbells Only',        sub: 'Home gym — dumbbells, no machines or barbell' },
      { id: 'barbell_home',   label: 'Barbell + Dumbbells',   sub: 'Home gym with barbell and dumbbells' },
      { id: 'bodyweight',     label: 'Bodyweight Only',       sub: 'No equipment — home or outdoors' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={8} total={TOTAL_STEPS} title="What Equipment Do You Have?" />
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

  // ── Step 9: Split Preference (Intermediate/Advanced only) (Phase 3.7) ──
  if (step === 9) {
    if (!isAdvanced) {
      setStep(10); return null;
    }
    const splits = [
      { id: 'full_body', label: 'Full Body', sub: 'Recommended for most — train everything each session' },
      { id: 'upper_lower', label: 'Upper / Lower Split', sub: 'Alternate upper and lower body days' },
      { id: 'ppl', label: 'Push / Pull / Legs', sub: 'Separate pushing, pulling, and leg days' },
      { id: 'no_preference', label: 'No Preference', sub: 'Choose for me based on my schedule' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)' }}>
        <Card>
          <StepHeader step={9} total={TOTAL_STEPS} title="Training Split Preference" />
          {splits.map(s => (
            <OptionBtn key={s.id} selected={data.splitPreference === s.id}
              onClick={() => set('splitPreference', s.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 10: Body Stats ──
  if (step === 10) {
    const fe = fieldErrors;
    const hasErrors = Object.keys(fe).length > 0;

    function handleBodyNext() {
      const errors = validateBodyStats(data);
      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
      setFieldErrors({});
      handleNext();
    }

    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={10} total={TOTAL_STEPS} title="Your Body Stats" />
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
            Used to calculate your personalized calorie targets using the Mifflin-St Jeor formula.
          </div>

          <NumInput label="YOUR NAME" value={data.name} onChange={v => set('name', v)}
            placeholder="e.g. Alex" unit={null} isText error={fe.name} />
          <NumInput label="AGE" value={data.age} onChange={v => set('age', v)}
            placeholder="25" unit="years" error={fe.age} />

          <div style={{ marginBottom: fe.sex ? 6 : 14 }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
              color: fe.sex ? 'var(--fire2)' : 'var(--text3)', letterSpacing: 1.5, marginBottom: 8,
            }}>BIOLOGICAL SEX</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['male', 'Male'], ['female', 'Female']].map(([val, label]) => (
                <button key={val} onClick={() => set('sex', val)} style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: data.sex === val ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                  background: data.sex === val ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                  color: data.sex === val ? 'var(--cyan)' : 'var(--text)',
                  fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
            {fe.sex && <div style={{ fontSize: 11, color: 'var(--fire2)', marginTop: 5 }}>⚠ {fe.sex}</div>}
          </div>

          <NumInput label="WEIGHT" value={data.weightKg} onChange={v => set('weightKg', v)}
            placeholder="70" unit="kg" error={fe.weightKg} />
          <NumInput label="HEIGHT" value={data.heightCm} onChange={v => set('heightCm', v)}
            placeholder="170" unit="cm" error={fe.heightCm} />
          <NumInput label="WAIST CIRCUMFERENCE (optional)" value={data.waistCm}
            onChange={v => set('waistCm', v)} placeholder="85" unit="cm" error={fe.waistCm} />
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
            Measure around your navel in <strong>centimetres</strong> — not inches or pant size. Typical range: 60–130 cm.
          </div>

          <NavButtons step={step} onBack={handleBack} onNext={handleBodyNext} nextDisabled={false} />
        </Card>
      </div>
    );
  }

  // ── Step 11: Lifestyle & Recovery (Phase 3.4) ──
  if (step === 11) {
    const activityOpts = [
      { id: 'sedentary', label: 'Sedentary', sub: 'Desk job, minimal walking' },
      { id: 'lightly_active', label: 'Lightly Active', sub: 'Teacher, retail, some walking' },
      { id: 'moderately_active', label: 'Moderately Active', sub: 'On feet most of the day' },
      { id: 'very_active', label: 'Very Active', sub: 'Construction, manual labor, athlete' },
    ];
    const sleepOpts = [
      { id: '<5', label: 'Less than 5 hours' },
      { id: '5-6', label: '5–6 hours' },
      { id: '6-7', label: '6–7 hours' },
      { id: '7-8', label: '7–8 hours' },
      { id: '8+', label: '8+ hours' },
    ];
    const stressOpts = [
      { id: 'low', label: 'Low', sub: 'Life feels manageable' },
      { id: 'moderate', label: 'Moderate', sub: 'Some stressors but coping well' },
      { id: 'high', label: 'High', sub: 'Significant stress from work, life, or relationships' },
      { id: 'very_high', label: 'Very High', sub: 'Feeling overwhelmed most days' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={11} total={TOTAL_STEPS} title="Lifestyle & Recovery" />
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>DAILY ACTIVITY LEVEL</div>
          {activityOpts.map(a => (
            <OptionBtn key={a.id} selected={data.dailyActivity === a.id} onClick={() => set('dailyActivity', a.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginTop: 20, marginBottom: 12,
          }}>TYPICAL SLEEP</div>
          {sleepOpts.map(s => (
            <OptionBtn key={s.id} selected={data.sleepHours === s.id} onClick={() => set('sleepHours', s.id)}>
              {s.label}
            </OptionBtn>
          ))}
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginTop: 20, marginBottom: 12,
          }}>STRESS LEVEL</div>
          {stressOpts.map(s => (
            <OptionBtn key={s.id} selected={data.stressLevel === s.id} onClick={() => set('stressLevel', s.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext}
            nextDisabled={!data.dailyActivity || !data.sleepHours || !data.stressLevel} />
        </Card>
      </div>
    );
  }

  // ── Step 12: Dietary Context (Phase 3.5) ──
  if (step === 12) {
    const restrictionOpts = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Lactose Intolerant', 'Gluten-Free'];
    const toggle = (r) => {
      if (r === 'None') {
        set('dietaryRestrictions', data.dietaryRestrictions.includes('None') ? [] : ['None']);
        return;
      }
      const without = data.dietaryRestrictions.filter(x => x !== 'None');
      set('dietaryRestrictions', without.includes(r) ? without.filter(x => x !== r) : [...without, r]);
    };
    const trackOpts = [
      { id: 'never', label: "Never — I'm new to this" },
      { id: 'tried', label: 'Tried it briefly' },
      { id: 'regular', label: 'I do it regularly' },
    ];
    const mealOpts = [
      { id: 2, label: '2 meals' },
      { id: 3, label: '3 meals' },
      { id: '4-5', label: '4–5 smaller meals' },
      { id: 'varies', label: 'Varies / no routine' },
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={12} total={TOTAL_STEPS} title="Dietary Context" />
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>DIETARY RESTRICTIONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
            {restrictionOpts.map(r => (
              <CheckBtn key={r} selected={data.dietaryRestrictions.includes(r)} onClick={() => toggle(r)}>
                {r}
              </CheckBtn>
            ))}
          </div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>TRACKING EXPERIENCE</div>
          {trackOpts.map(t => (
            <OptionBtn key={t.id} selected={data.trackingExperience === t.id} onClick={() => set('trackingExperience', t.id)}>
              {t.label}
            </OptionBtn>
          ))}
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginTop: 20, marginBottom: 12,
          }}>MEALS PER DAY</div>
          {mealOpts.map(m => (
            <OptionBtn key={m.id} selected={data.mealsPerDay === m.id} onClick={() => set('mealsPerDay', m.id)}>
              {m.label}
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 13: Motivation & Adherence History (Phase 3.6) ──
  if (step === 13) {
    const quitReasons = [
      'Got bored / lost motivation',
      'Got injured',
      'Life got busy / schedule conflict',
      "Didn't see results",
      'Felt too sore / recovery issues',
      'Felt intimidated at the gym',
      'This is my first program',
    ];
    const motivations = [
      'Look better (aesthetics)',
      'Feel better (energy, mood)',
      'Health / longevity',
      'Sport / athletic performance',
      'Mental health (stress, anxiety, depression)',
      'Doctor recommended',
    ];
    return (
      <div style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--bg)', overflowY: 'auto' }}>
        <Card>
          <StepHeader step={13} total={TOTAL_STEPS} title="Your Motivation" />
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 12,
          }}>HAVE YOU STARTED AND STOPPED BEFORE?</div>
          {quitReasons.map(r => (
            <OptionBtn key={r} selected={data.previousQuitReason === r} onClick={() => set('previousQuitReason', r)}>
              {r}
            </OptionBtn>
          ))}
          <div style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
            color: 'var(--text3)', letterSpacing: 1.5, marginTop: 20, marginBottom: 12,
          }}>YOUR #1 REASON FOR TRAINING</div>
          {motivations.map(m => (
            <OptionBtn key={m} selected={data.primaryMotivation === m} onClick={() => set('primaryMotivation', m)}>
              {m}
            </OptionBtn>
          ))}
          <NavButtons step={step} onBack={handleBack} onNext={handleNext} />
        </Card>
      </div>
    );
  }

  // ── Step 14: Training Days ──
  if (step === 14) {
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
          <StepHeader step={14} total={TOTAL_STEPS} title="Pick Your Training Days" />
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
          <NavButtons step={step} onBack={handleBack} onNext={handleNext}
            nextLabel="START MY PROGRAM" nextDisabled={!exactly} />
        </Card>
      </div>
    );
  }

  return null;
}
