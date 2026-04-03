import React from 'react';

export default function DailySummaryBar({ dayTotals, goals, mealCount }) {
  return (
    <div style={{
      background: 'rgba(0,229,255,0.05)',
      border: '1px solid rgba(0,229,255,0.12)',
      borderRadius: 12, padding: '12px 14px',
      marginBottom: 20,
    }}>
      {/* Calorie row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>TODAY</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>
          {dayTotals.calories}
          <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 3 }}>/ {goals.calories} kcal</span>
        </div>
      </div>
      {/* Calorie progress bar */}
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${Math.min(100, (dayTotals.calories / goals.calories) * 100)}%`,
          background: dayTotals.calories > goals.calories ? 'var(--fire2)' : 'var(--cyan)',
          transition: 'width 0.4s ease',
        }} />
      </div>
      {/* Macro rows */}
      {[
        { label: 'PROTEIN', value: dayTotals.protein, goal: goals.protein, color: '#a78bfa' },
        { label: 'CARBS',   value: dayTotals.carbs,   goal: goals.carbs,   color: '#34d399' },
        { label: 'FAT',     value: dayTotals.fat,     goal: goals.fat,     color: '#fbbf24' },
      ].map(m => {
        const over = m.value > m.goal;
        return (
          <div key={m.label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 8, color: 'var(--text3)', letterSpacing: 1 }}>{m.label}</span>
              <span style={{ fontFamily: 'Rajdhani', fontSize: 11, color: over ? '#ff4444' : m.color, fontWeight: 700 }}>
                {Math.round(m.value)}g / {m.goal}g
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min(100, (m.value / m.goal) * 100)}%`,
                background: over ? '#ff4444' : m.color,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        );
      })}
      {mealCount > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, textAlign: 'right' }}>
          {mealCount} meal{mealCount !== 1 ? 's' : ''} logged
        </div>
      )}
    </div>
  );
}
