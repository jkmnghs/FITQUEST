import React, { useState } from 'react';

const CHECKLIST_ITEMS = [
  { id: 'ck1', text: '3/3 workouts completed' },
  { id: 'ck2', text: 'Progressive overload on 2+ exercises' },
  { id: 'ck3', text: '155g+ protein on 6/7 days' },
  { id: 'ck4', text: '7+ hours sleep on 5/7 nights' },
  { id: 'ck5', text: 'Followed exact set prescription (no extras)' },
  { id: 'ck6', text: 'Tracked all workouts in FitQuest' }
];

export default function CheckinTab({ state, onSubmit }) {
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [sleep, setSleep] = useState('');
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showOverwrite, setShowOverwrite] = useState(false);

  const dayIdx = new Date().getDay();
  const isSunday = dayIdx === 0;
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayIdx];
  const lastCheckin = state.weeklyCheckins?.length > 0
    ? state.weeklyCheckins[state.weeklyCheckins.length - 1]
    : null;
  const thisWeekCheckin = state.weeklyCheckins?.find(c => c.week === state.currentWeek);

  function validate() {
    const wt = parseFloat(weight);
    if (!wt || wt <= 0 || wt > 500) {
      setError(`Enter a valid weight between 1–500 ${state.unit}`);
      return false;
    }
    const ws = parseFloat(waist) || 0;
    if (ws < 0 || ws > 300) {
      setError('Enter a valid waist measurement (0–300 cm)');
      return false;
    }
    if (sleep !== '') {
      const sl = parseFloat(sleep);
      if (isNaN(sl) || sl < 0 || sl > 24) {
        setError('Enter a valid sleep value (0–24 hours)');
        return false;
      }
    }
    setError(null);
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (thisWeekCheckin && !showOverwrite) {
      setShowOverwrite(true);
      return;
    }
    const wt = parseFloat(weight);
    const ws = parseFloat(waist) || 0;
    const sl = parseFloat(sleep) || 0;
    onSubmit(wt, ws, sl);
    setSubmitted(true);
    setShowOverwrite(false);
  }

  function toggleCheck(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <SectionTitle>Weekly Check-in (Sunday)</SectionTitle>

      {/* Check-in form */}
      {isSunday ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--card-border)',
          borderRadius: 14, padding: 16, marginBottom: 12, backdropFilter: 'blur(20px)'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Weekly Measurements</div>
          <div style={{
            fontSize: 12, color: 'var(--green)', marginBottom: 12, fontWeight: 600
          }}>✓ It's Sunday — check-in day!</div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                CHECK-IN SAVED! +25 XP
              </div>
            </div>
          ) : (
            <>
              <InputRow label="Weight" value={weight} onChange={v => { setWeight(v); setError(null); setShowOverwrite(false); }}
                placeholder="70.4" unit={state.unit} inputMode="decimal" step="0.1" min="1" max="500" />
              <InputRow label="Waist" value={waist} onChange={v => { setWaist(v); setError(null); }}
                placeholder="Optional" unit="cm" inputMode="decimal" step="0.1" min="0" max="300" />
              <InputRow label="Sleep" value={sleep} onChange={v => { setSleep(v); setError(null); }}
                placeholder="Optional" unit="hrs/night" inputMode="decimal" step="0.5" min="0" max="24" />
              {error && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4, marginBottom: 4, fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
              {showOverwrite && !error && (
                <div style={{
                  fontSize: 12, color: 'var(--gold)', marginTop: 4, marginBottom: 4,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(255,214,0,0.07)', border: '1px solid rgba(255,214,0,0.2)'
                }}>
                  ⚠ Already checked in Week {thisWeekCheckin.week} ({thisWeekCheckin.weight} {state.unit}). Tap again to overwrite.
                </div>
              )}
              <button onClick={handleSubmit} style={{
                width: '100%', padding: 12, border: 'none', borderRadius: 12,
                background: showOverwrite
                  ? 'linear-gradient(135deg, var(--fire), var(--fire2))'
                  : 'linear-gradient(135deg, var(--purple2), var(--purple))',
                fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
                color: '#fff', letterSpacing: 0.5, marginTop: 6, cursor: 'pointer'
              }}>
                {showOverwrite ? 'OVERWRITE CHECK-IN' : 'SAVE CHECK-IN (+25 XP)'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--card-border)',
          borderRadius: 14, padding: '24px 16px', marginBottom: 12,
          textAlign: 'center', backdropFilter: 'blur(20px)'
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
            color: 'var(--text)', marginBottom: 6
          }}>CHECK-IN DAY: SUNDAY</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            Today is {dayName}. Come back Sunday morning to log your weight, waist, and sleep.
          </div>
          {lastCheckin && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text2)' }}>
              Last check-in: {lastCheckin.weight} {state.unit} (Week {lastCheckin.week})
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      <SectionTitle>Weekly Success Checklist</SectionTitle>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 14, padding: '4px 16px', backdropFilter: 'blur(20px)'
      }}>
        {CHECKLIST_ITEMS.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <button
              onClick={() => toggleCheck(item.id)}
              style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${checked[item.id] ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
                background: checked[item.id] ? 'var(--green)' : 'transparent',
                color: checked[item.id] ? 'var(--bg)' : 'transparent',
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', cursor: 'pointer'
              }}
            >✓</button>
            <div style={{
              fontSize: 13,
              color: checked[item.id] ? 'var(--text)' : 'var(--text2)',
              textDecoration: checked[item.id] ? 'none' : 'none'
            }}>{item.text}</div>
          </div>
        ))}
        {/* Score */}
        <div style={{
          padding: '12px 0', textAlign: 'center',
          fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
          color: checkedCount >= 5 ? 'var(--green)' : checkedCount >= 3 ? 'var(--cyan)' : 'var(--text3)'
        }}>
          {checkedCount}/{CHECKLIST_ITEMS.length} completed
          {checkedCount === CHECKLIST_ITEMS.length ? ' 🏆 PERFECT WEEK!' : ''}
        </div>
      </div>

      {/* Previous check-ins */}
      {state.weeklyCheckins?.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 16 }}>Check-in History</SectionTitle>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--card-border)',
            borderRadius: 14, padding: '4px 16px', backdropFilter: 'blur(20px)'
          }}>
            {[...state.weeklyCheckins].reverse().slice(0, 8).map((ci, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Week {ci.week}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{ci.date}</div>
                </div>
                <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>
                  {ci.weight} {state.unit}
                  {ci.waist > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{ci.waist}cm</span>}
                  {ci.sleep > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>😴 {ci.sleep}h</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder, unit, inputMode, step, min, max }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <label style={{ fontSize: 13, color: 'var(--text2)', width: 70, flexShrink: 0 }}>{label}</label>
      <input
        type="number" inputMode={inputMode} step={step} min={min} max={max}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, height: 36, borderRadius: 9,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--text)', fontFamily: 'Rajdhani', fontSize: 14,
          fontWeight: 600, textAlign: 'center', padding: '0 8px'
        }}
      />
      <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 30 }}>{unit}</div>
    </div>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{
      fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
      color: 'var(--text2)', letterSpacing: 1.5,
      marginBottom: 12, textTransform: 'uppercase', ...style
    }}>{children}</div>
  );
}
