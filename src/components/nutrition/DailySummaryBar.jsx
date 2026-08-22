import React from 'react';

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--color-action)',    bg: 'rgba(0,229,255,0.10)'   },
  { key: 'carbs',   label: 'Carbs',   color: 'var(--color-premium)',   bg: 'rgba(255,214,0,0.10)'   },
  { key: 'fat',     label: 'Fat',     color: 'var(--color-warning)',   bg: 'rgba(255,145,0,0.10)'   },
];

export default function DailySummaryBar({ dayTotals, goals, mealCount }) {
  const calPct = goals.calories > 0
    ? Math.min(100, (dayTotals.calories / goals.calories) * 100)
    : 0;
  const calOver = dayTotals.calories > goals.calories;

  return (
    <div style={{
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-4)',
    }}>
      {/* Calorie row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 11,
          color: 'var(--color-text-tertiary)', letterSpacing: '0.1em',
        }}>TODAY</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
            color: calOver ? 'var(--color-warning)' : 'var(--color-action)',
          }}>
            {dayTotals.calories}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            / {goals.calories} kcal
          </span>
          {mealCount > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 10, color: 'var(--color-text-tertiary)',
              background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)',
              padding: '1px 7px',
            }}>
              {mealCount} meal{mealCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Calorie bar */}
      <div style={{
        height: 6, background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-4)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${calPct}%`,
          background: calOver
            ? 'linear-gradient(90deg, var(--color-warning), var(--color-fire))'
            : 'linear-gradient(90deg, var(--color-action), var(--color-accent-purple))',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.4s ease',
          boxShadow: calOver ? 'none' : '0 0 8px rgba(0,229,255,0.35)',
        }} />
      </div>

      {/* Macro row */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {MACROS.map(m => {
          const val = dayTotals[m.key] || 0;
          const goal = goals[m.key] || 1;
          const pct = Math.min(100, (val / goal) * 100);
          const over = val > goal;
          return (
            <div key={m.key} style={{
              flex: 1, padding: 'var(--space-2) var(--space-3)',
              background: m.bg, borderRadius: 'var(--radius-md)',
              border: `1px solid ${over ? 'rgba(255,23,68,0.2)' : 'transparent'}`,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 5,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 11,
                  color: 'var(--color-text-tertiary)', letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>{m.label}</span>
                <span style={{
                  fontFamily: 'var(--font-primary)', fontSize: 11, fontWeight: 700,
                  color: over ? 'var(--color-destructive)' : m.color,
                }}>
                  {Math.round(val)}g
                </span>
              </div>
              <div style={{
                height: 3, background: 'rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-full)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: over ? 'var(--color-destructive)' : m.color,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{
                fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, textAlign: 'right',
              }}>/ {goal}g</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
