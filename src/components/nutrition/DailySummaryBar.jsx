import React from 'react';
import CountUp from '../CountUp';

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--color-action)',  track: 'rgba(0,229,255,0.10)',   glow: 'rgba(0,229,255,0.7)'   },
  { key: 'carbs',   label: 'Carbs',   color: 'var(--color-accent-purple)', track: 'rgba(179,136,255,0.12)', glow: 'rgba(179,136,255,0.7)' },
  { key: 'fat',     label: 'Fat',     color: 'var(--color-premium)', track: 'rgba(255,214,0,0.12)',   glow: 'rgba(255,214,0,0.6)'   },
];

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export default function DailySummaryBar({ dayTotals, goals, mealCount }) {
  const calPct = goals.calories > 0
    ? Math.min(100, (dayTotals.calories / goals.calories) * 100)
    : 0;
  const calOver = dayTotals.calories > goals.calories;
  const calLeft = Math.max(0, goals.calories - dayTotals.calories);
  const ringColor = calOver ? 'var(--color-destructive)' : 'var(--color-warning)';

  return (
    <div className="fq-cut" style={{
      background: 'linear-gradient(160deg, #141b36, #0c1226)',
      border: '1px solid rgba(255,145,0,0.3)',
      '--fq-cut-border': 'rgba(255,145,0,0.3)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-4)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    }}>
      {/* Calorie ring — sweeps from empty to today's total each time Fuel opens. */}
      <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
        <svg
          role="img"
          aria-label={`${dayTotals.calories} of ${goals.calories} kcal eaten${mealCount > 0 ? `, ${mealCount} meal${mealCount !== 1 ? 's' : ''}` : ''}`}
          width="124" height="124" viewBox="0 0 124 124" style={{ transform: 'rotate(-90deg)' }}
        >
          <circle cx="62" cy="62" r={RING_R} fill="none" stroke="rgba(255,145,0,0.12)" strokeWidth="10" />
          <circle
            key={goals.calories}
            className="fq-ring"
            cx="62" cy="62" r={RING_R} fill="none"
            stroke={ringColor} strokeWidth="10"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - calPct / 100)}
            style={{
              '--fq-ring-from': RING_C,
              transition: 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 6px ${calOver ? 'rgba(255,23,68,0.7)' : 'rgba(255,109,0,0.8)'})`,
            }}
          />
        </svg>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
            color: calOver ? 'var(--color-destructive)' : '#fff', fontVariantNumeric: 'tabular-nums',
          }}>
            <CountUp
              value={calOver ? dayTotals.calories - goals.calories : calLeft}
              from={calOver ? 0 : goals.calories}
              duration={1200}
              format={n => n.toLocaleString()}
            />
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {calOver ? 'kcal over' : 'kcal left'}
          </span>
        </div>
      </div>

      {/* Macro bars */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {MACROS.map((m, i) => {
          const val = dayTotals[m.key] || 0;
          const goal = goals[m.key] || 1;
          const pct = Math.min(100, (val / goal) * 100);
          const over = val > goal;
          return (
            <div key={m.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.label}</span>
                <span style={{ color: over ? 'var(--color-destructive)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  <CountUp value={Math.round(val)} from={0} duration={1100} /> / {goal} g
                </span>
              </div>
              <div style={{ height: 6, background: m.track, overflow: 'hidden' }}>
                <div className="fq-grow-x" style={{
                  height: '100%', width: `${pct}%`,
                  background: over ? 'var(--color-destructive)' : m.color,
                  boxShadow: `0 0 8px ${over ? 'rgba(255,23,68,0.6)' : m.glow}`,
                  transition: 'width 0.4s ease',
                  animationDelay: `${0.15 * (i + 1)}s`,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
