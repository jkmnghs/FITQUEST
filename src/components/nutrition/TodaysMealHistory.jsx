import React from 'react';

export default function TodaysMealHistory({ todayMeals, onDeleteMeal }) {
  if (todayMeals.length === 0) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 12 }}>
        TODAY'S MEALS
      </div>
      {todayMeals.map((meal, i) => (
        <div key={meal.id || i} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: '12px 14px',
          marginBottom: 8, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-primary)', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meal.foods.map(f => f.name).join(', ').substring(0, 40)}
              {meal.foods.map(f => f.name).join(', ').length > 40 ? '...' : ''}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{meal.dateStr}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
              {meal.totals.calories}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)' }}>kcal</div>
          </div>
          {onDeleteMeal && meal.id && (
            <button
              onClick={() => onDeleteMeal(meal.id)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,68,68,0.6)', fontSize: 16,
                cursor: 'pointer', padding: '4px 2px', flexShrink: 0,
                lineHeight: 1,
              }}
              title="Delete meal"
            >🗑️</button>
          )}
        </div>
      ))}
    </div>
  );
}
