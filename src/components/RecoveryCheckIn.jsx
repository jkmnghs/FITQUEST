import React, { useState } from 'react';

/**
 * RecoveryCheckIn — Pre-session recovery rating (Phase 4.4)
 * 3 quick questions, takes ~10 seconds.
 */
const QUESTIONS = [
  { key: 'sleep',    label: 'How did you sleep last night?',  low: 'Terrible', high: 'Great' },
  { key: 'bodyFeel', label: 'How does your body feel?',       low: 'Very sore', high: 'Fresh' },
  { key: 'energy',   label: 'Current energy level?',          low: 'Exhausted', high: 'Energized' },
];

export default function RecoveryCheckIn({ onSubmit, onSkip }) {
  const [scores, setScores] = useState({ sleep: 0, bodyFeel: 0, energy: 0 });

  const allAnswered = scores.sleep > 0 && scores.bodyFeel > 0 && scores.energy > 0;
  const avg = allAnswered ? (scores.sleep + scores.bodyFeel + scores.energy) / 3 : 0;

  const handleSubmit = () => {
    onSubmit(scores, avg);
  };

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700,
        color: 'var(--cyan)', marginBottom: 8,
      }}>RECOVERY CHECK-IN</div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
        Quick check before your session — helps optimize your training.
      </div>

      {QUESTIONS.map(q => (
        <div key={q.key} style={{
          background: 'var(--card)', border: '1px solid rgba(0,229,255,0.1)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {q.label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', minWidth: 50 }}>{q.low}</span>
            <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setScores(s => ({ ...s, [q.key]: n }))}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: scores[q.key] === n ? '2px solid var(--cyan)' : '1px solid rgba(255,255,255,0.12)',
                    background: scores[q.key] === n ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: scores[q.key] === n ? 'var(--cyan)' : 'var(--text2)',
                    fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text3)', minWidth: 50, textAlign: 'right' }}>{q.high}</span>
          </div>
        </div>
      ))}

      {/* Recommendation based on average score */}
      {allAnswered && avg < 1.5 && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.25)',
          fontSize: 13, color: '#ff5555', lineHeight: 1.6,
        }}>
          🛑 <strong>Recommendation: Skip today's workout.</strong> Your body needs rest. Taking a rest day is smart recovery — you'll still earn 15 XP.
        </div>
      )}
      {allAnswered && avg >= 1.5 && avg < 2.5 && (
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)',
          fontSize: 13, color: '#ffaa00', lineHeight: 1.6,
        }}>
          ⚠️ <strong>Suggestion: Go lighter today.</strong> Reduce working sets by 1 and lower RPE targets. Listen to your body.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSkip} style={{
          flex: 1, padding: '13px', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: 'var(--text3)',
          fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
        }}>SKIP</button>
        <button onClick={handleSubmit} disabled={!allAnswered} style={{
          flex: 2, padding: '13px', borderRadius: 12,
          border: 'none',
          background: allAnswered ? 'var(--cyan)' : 'rgba(0,229,255,0.2)',
          color: allAnswered ? 'var(--bg)' : 'rgba(0,229,255,0.5)',
          fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
          cursor: allAnswered ? 'pointer' : 'not-allowed',
          boxShadow: allAnswered ? '0 0 20px rgba(0,229,255,0.2)' : 'none',
        }}>CONTINUE →</button>
      </div>
    </div>
  );
}
