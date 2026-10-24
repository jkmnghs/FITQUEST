import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { getHeightCm } from '../utils/bodyMetrics';

const CHECKLIST_ITEMS = [
  { id: 'ck1', text: '3/3 workouts completed' },
  { id: 'ck2', text: 'Progressive overload on 2+ exercises' },
  { id: 'ck3', text: '155g+ protein on 6/7 days' },
  { id: 'ck4', text: '7+ hours sleep on 5/7 nights' },
  { id: 'ck5', text: 'Followed exact set prescription (no extras)' },
  { id: 'ck6', text: 'Tracked all workouts in FitQuest' }
];

export default function CheckinTab({ state, onSubmit }) {
  const lastCheckin = state.weeklyCheckins?.length > 0
    ? [...state.weeklyCheckins].sort((a, b) => b.week - a.week)[0]
    : null;
  const thisWeekCheckin = state.weeklyCheckins?.find(c => c.week === state.currentWeek);

  // Pre-fill with this week's existing values, or last check-in weight as a starting point
  const [weight, setWeight] = useState(thisWeekCheckin ? String(thisWeekCheckin.weight) : (lastCheckin ? String(lastCheckin.weight) : ''));
  const [waist, setWaist] = useState(thisWeekCheckin?.waist > 0 ? String(thisWeekCheckin.waist) : '');
  const [sleep, setSleep] = useState(thisWeekCheckin?.sleep > 0 ? String(thisWeekCheckin.sleep) : '');
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showOverwrite, setShowOverwrite] = useState(false);

  const dayIdx = new Date().getDay();
  const isSunday = dayIdx === 0;
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayIdx];

  function validate() {
    const wt = parseFloat(weight);
    if (!wt || wt <= 0 || wt > 500) {
      setError(`Enter a valid weight between 1–500 ${state.unit}`);
      return false;
    }
    const ws = parseFloat(waist) || 0;
    // Onboarding already rejects an inches or pant-size figure; this screen
    // accepted anything from 0–300 and labelled it "cm", so a 32 entered here
    // flowed through to the coach as a 32cm waist and a nonsense
    // waist-to-height ratio. Same physiological floor as onboarding: under 30%
    // of height is not a measurement a person can have.
    if (ws > 0) {
      const heightCm = getHeightCm(state) || 170;
      const minWaist = Math.max(55, Math.round(heightCm * 0.30));
      if (ws < minWaist || ws > 250) {
        setError(`Enter ${minWaist}–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size.`);
        return false;
      }
    } else if (ws < 0) {
      setError('Enter a valid waist measurement');
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
      <SectionTitle>Week {state.currentWeek} Check-in</SectionTitle>

      {/* Check-in form — available any day */}
      <div className="fq-cut" style={{
        background: 'linear-gradient(160deg, #141b36, #0c1226)', border: '1px solid rgba(179,136,255,0.3)',
        '--fq-cut-border': 'rgba(179,136,255,0.3)',
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.26em', color: 'var(--color-accent-purple)', marginBottom: 4 }}>WEEKLY REPORT</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Weekly Measurements</div>
        <div style={{
          fontSize: 12, color: isSunday ? 'var(--green)' : 'var(--text3)',
          marginBottom: 12, fontWeight: 600
        }}>
          {isSunday ? '✓ It\'s Sunday — check-in day!' : `Today is ${dayName} · Sunday is the recommended check-in day`}
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="fq-pop fq-hex" aria-hidden="true" style={{
              width: 60, height: 68, margin: '0 auto 12px', background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: '#05070f',
            }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
              CHECK-IN SAVED! {thisWeekCheckin ? 'UPDATED' : '+25 XP'}
            </div>
          </div>
        ) : (
          <>
            <InputRow label="Weight" value={weight} onChange={v => { setWeight(v); setError(null); setShowOverwrite(false); }}
              placeholder="e.g. 70.0" unit={state.unit} inputMode="decimal" step="0.1" min="1" max="500" />
            <InputRow label="Waist" value={waist} onChange={v => { setWaist(v); setError(null); }}
              placeholder="Optional — in cm" unit="cm" inputMode="decimal" step="0.1" min="0" max="250" />
            <InputRow label="Sleep" value={sleep} onChange={v => { setSleep(v); setError(null); }}
              placeholder="Optional" unit="hrs/night" inputMode="decimal" step="0.5" min="0" max="24" />
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--red)', marginTop: 4, marginBottom: 4, fontWeight: 600 }}>
                <TriangleAlert size={14} aria-hidden="true" style={{ flexShrink: 0 }} /> {error}
              </div>
            )}
            {showOverwrite && !error && (
              <div style={{
                fontSize: 12, color: 'var(--gold)', marginTop: 4, marginBottom: 4,
                padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,214,0,0.07)', border: '1px solid rgba(255,214,0,0.2)'
              }}>
                <TriangleAlert size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Already checked in Week {thisWeekCheckin.week} ({thisWeekCheckin.weight} {state.unit}). Tap again to overwrite.
              </div>
            )}
            <button onClick={handleSubmit} className="fq-press fq-skew" style={{
              width: '100%', minHeight: 52, padding: 12, border: 'none',
              background: showOverwrite
                ? 'linear-gradient(90deg, var(--fire), var(--fire2))'
                : 'linear-gradient(90deg, var(--purple2), var(--purple))',
              boxShadow: showOverwrite ? '0 0 22px rgba(255,109,0,0.4)' : '0 0 22px rgba(179,136,255,0.4)',
              fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 900,
              color: '#05070f', letterSpacing: '0.14em', marginTop: 10, cursor: 'pointer'
            }}>
              {showOverwrite ? 'OVERWRITE CHECK-IN' : thisWeekCheckin ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN (+25 XP)'}
            </button>
          </>
        )}
      </div>

      {/* Checklist */}
      <SectionTitle>Weekly Success Checklist</SectionTitle>
      <div style={{
        background: 'rgba(14,20,40,0.85)', border: '1px solid rgba(0,229,255,0.12)',
        padding: '4px 16px',
      }}>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${CHECKLIST_ITEMS.length}, minmax(0, 1fr))`, gap: 4, padding: '12px 0 6px' }}>
          {CHECKLIST_ITEMS.map(item => (
            <div key={item.id} style={{
              height: 4,
              background: checked[item.id] ? 'var(--green)' : 'rgba(255,255,255,0.08)',
              boxShadow: checked[item.id] ? '0 0 8px rgba(0,230,118,0.6)' : 'none',
              transition: 'background 0.25s, box-shadow 0.25s',
            }} />
          ))}
        </div>
        {CHECKLIST_ITEMS.map(item => (
          // The whole row is the target, not just the 22px box — a checklist
          // item you have to hit dead-centre with a thumb is a checklist item
          // that gets skipped.
          <button
            key={item.id}
            role="checkbox"
            aria-checked={!!checked[item.id]}
            onClick={() => toggleCheck(item.id)}
            style={{
              width: '100%', minHeight: 'var(--tap-target)',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              border: 'none', borderRadius: 0, background: 'transparent',
              textAlign: 'left',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24, height: 24, flexShrink: 0,
                border: `2px solid ${checked[item.id] ? 'var(--green)' : 'rgba(0,229,255,0.3)'}`,
                background: checked[item.id] ? 'var(--green)' : 'transparent',
                color: checked[item.id] ? '#05070f' : 'transparent',
                boxShadow: checked[item.id] ? '0 0 10px rgba(0,230,118,0.5)' : 'none',
                fontWeight: 900,
                fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >✓</span>
            <span style={{
              fontSize: 'var(--text-sm)',
              color: checked[item.id] ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}>{item.text}</span>
          </button>
        ))}
        {/* Score */}
        <div style={{
          padding: '12px 0', textAlign: 'center',
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
          color: checkedCount >= 5 ? 'var(--green)' : checkedCount >= 3 ? 'var(--cyan)' : 'var(--text3)'
        }}>
          {checkedCount}/{CHECKLIST_ITEMS.length} completed
          {checkedCount === CHECKLIST_ITEMS.length ? ' · PERFECT WEEK!' : ''}
        </div>
      </div>

      {/* Previous check-ins */}
      {state.weeklyCheckins?.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 16 }}>Check-in History</SectionTitle>
          <div style={{
            background: 'rgba(14,20,40,0.85)', border: '1px solid rgba(0,229,255,0.12)',
            padding: '4px 16px',
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
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>
                  {ci.weight} {state.unit}
                  {ci.waist > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{ci.waist}cm</span>}
                  {ci.sleep > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{ci.sleep}h sleep</span>}
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
    <label style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text2)', width: 70, flexShrink: 0 }}>{label}</span>
      <input
        type="number" inputMode={inputMode} step={step} min={min} max={max}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, height: 48,
          border: '1px solid rgba(179,136,255,0.3)',
          background: '#05070f',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: 16,
          fontWeight: 600, textAlign: 'center', padding: '0 8px'
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 30 }}>{unit}</span>
    </label>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800,
      color: 'var(--text2)', letterSpacing: '0.22em',
      marginBottom: 12, textTransform: 'uppercase', ...style
    }}>{children}</div>
  );
}
