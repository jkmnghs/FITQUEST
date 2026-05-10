import React from 'react';
import { GENERAL_WARMUP, getWarmupSets, MOBILITY_BY_REGION } from '../data/warmups';

/**
 * WarmupScreen — shown before each session (Phase 4.2)
 * Displays general warm-up, exercise-specific ramp-up sets, and mobility suggestions.
 */
export default function WarmupScreen({ exercises, liftWeights, painRegions, unit, onStart, onSkip }) {
  const mobilityRegions = Object.entries(painRegions || {})
    .filter(([, severity]) => severity !== 'none' && severity)
    .map(([region]) => region);

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700,
        color: 'var(--cyan)', marginBottom: 20,
      }}>WARM-UP</div>

      {/* General Warm-up */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(0,229,255,0.1)',
        borderRadius: 16, padding: '16px', marginBottom: 16,
      }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
          color: 'var(--text3)', letterSpacing: 1, marginBottom: 10,
        }}>GENERAL WARM-UP ({GENERAL_WARMUP.duration})</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          Pick one:
          {GENERAL_WARMUP.options.map((opt, i) => (
            <div key={i} style={{ paddingLeft: 8 }}>• {opt}</div>
          ))}
        </div>
      </div>

      {/* Mobility (if pain regions flagged) */}
      {mobilityRegions.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid rgba(255,170,0,0.15)',
          borderRadius: 16, padding: '16px', marginBottom: 16,
        }}>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
            color: '#ffaa00', letterSpacing: 1, marginBottom: 10,
          }}>MOBILITY WORK</div>
          {mobilityRegions.map(region => (
            <div key={region}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, textTransform: 'capitalize' }}>
                {region.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {(MOBILITY_BY_REGION[region] || []).map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 8, lineHeight: 1.8 }}>• {m}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Exercise-specific warm-ups (first 2 compound exercises) */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(0,229,255,0.1)',
        borderRadius: 16, padding: '16px', marginBottom: 20,
      }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
          color: 'var(--text3)', letterSpacing: 1, marginBottom: 10,
        }}>RAMP-UP SETS</div>
        {(exercises || []).slice(0, 3).filter(ex => !ex.isPlank && !ex.isBodyweight).map(ex => {
          const workingWeight = liftWeights?.[ex.id] || ex.startKg;
          const warmupSets = getWarmupSets(workingWeight);
          if (warmupSets.length === 0) return null;

          const displayWeight = (w) => unit === 'lbs' ? `${Math.round(w * 2.205)}lbs` : `${w}kg`;

          return (
            <div key={ex.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{ex.name}</div>
              {warmupSets.map((ws, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 8, lineHeight: 1.8 }}>
                  Set {i + 1}: {displayWeight(ws.weight)} × {ws.reps} reps — {ws.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSkip} style={{
          flex: 1, padding: '13px', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: 'var(--text3)',
          fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
        }}>SKIP</button>
        <button onClick={onStart} style={{
          flex: 2, padding: '13px', borderRadius: 12,
          border: 'none', background: 'var(--cyan)', color: 'var(--bg)',
          fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 0 20px rgba(0,229,255,0.2)',
        }}>START SESSION →</button>
      </div>
    </div>
  );
}
