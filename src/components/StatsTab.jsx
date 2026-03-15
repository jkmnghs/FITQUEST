import React from 'react';
import { EXERCISES } from '../data/gameData';
import { convertWeight } from '../utils/gameLogic';

export default function StatsTab({ state }) {
  const { unit, overloadSuggestions, personalRecords, liftWeights, weeklyCheckins } = state;

  return (
    <div>
      <SectionTitle>Power Stats</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatCard icon="⚡" value={state.totalXp} label="Total XP" color="var(--cyan)" />
        <StatCard icon="🏋️" value={state.totalSessions} label="Sessions" color="var(--fire2)" />
        <StatCard icon="💪" value={`${(state.totalVolume / 1000).toFixed(1)}k`} label={`Volume (${unit})`} color="var(--purple)" />
        <StatCard icon="🔥" value={state.bestStreak} label="Best Streak" color="var(--green)" />
      </div>

      <SectionTitle>Weight Trend</SectionTitle>
      <WeightChart checkins={weeklyCheckins || []} unit={unit} />

      <SectionTitle>Personal Records</SectionTitle>
      <PRSection prs={personalRecords || {}} unit={unit} />

      <SectionTitle>Lift Progression</SectionTitle>
      {EXERCISES.filter(e => !e.isPlank).map(ex => {
        const wt = liftWeights?.[ex.id] ?? ex.startKg;
        const convWt = convertWeight(wt, unit);
        const startConv = convertWeight(ex.startKg, unit);
        const gain = convWt - startConv;
        const sug = overloadSuggestions?.[ex.id];
        const pr = personalRecords?.[ex.id];
        return (
          <div key={ex.id} style={{
            background: 'var(--card)', border: '1px solid var(--card-border)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{ex.name}</span>
                {sug === 'increase' && <MiniTag color="var(--green)" bg="rgba(0,230,118,0.12)" border="rgba(0,230,118,0.2)">↑ +2.5kg</MiniTag>}
                {sug === 'repeat'   && <MiniTag color="var(--gold)"  bg="rgba(255,214,0,0.1)"   border="rgba(255,214,0,0.2)">= REPEAT</MiniTag>}
                {sug === 'deload'   && <MiniTag color="var(--red)"   bg="rgba(255,23,68,0.1)"   border="rgba(255,23,68,0.2)">↓ DELOAD</MiniTag>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <span style={{ fontWeight: 700 }}>{convWt} {unit}</span>
                {gain > 0 && <span style={{ color: 'var(--green)' }}>+{gain.toFixed(1)}</span>}
                {pr && <span style={{
                  fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, padding: '2px 5px',
                  borderRadius: 4, background: 'rgba(255,214,0,0.12)', color: 'var(--gold)',
                  border: '1px solid rgba(255,214,0,0.25)'
                }}>PR</span>}
              </div>
            </div>
            <div style={{ height: 5, background: 'rgba(0,229,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6, background: 'var(--cyan)',
                width: `${Math.min(100, Math.max(0, ((wt - ex.startKg) / 20) * 100))}%`,
                transition: 'width 0.6s'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 14, padding: 14, textAlign: 'center', backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 800, marginBottom: 2, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}

function WeightChart({ checkins, unit }) {
  if (checkins.length < 2) {
    return (
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 14, padding: 20, marginBottom: 16, textAlign: 'center',
        color: 'var(--text3)', fontSize: 13
      }}>
        Need 2+ Sunday check-ins to show chart
      </div>
    );
  }
  const weights = checkins.map(c => c.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;
  const W = 280, H = 120;
  const step = W / (weights.length - 1);

  let path = 'M';
  const dots = weights.map((wt, i) => {
    const x = i * step;
    const y = H - ((wt - minW) / range) * H;
    path += `${i ? 'L' : ''}${x.toFixed(1)},${y.toFixed(1)} `;
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });
  const areaPath = path + `L${W},${H} L0,${H} Z`;

  const first = weights[0], last = weights[weights.length - 1];
  const change = last - first;
  const rate = checkins.length > 1 ? change / (checkins.length - 1) : 0;
  const rateColor = rate >= -0.5 && rate <= -0.3 ? 'var(--green)' : rate < -0.5 ? 'var(--fire2)' : 'var(--cyan)';

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 14, padding: 16, marginBottom: 16, backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Body Weight Trend</div>
      <div style={{ position: 'relative', height: H, overflow: 'hidden' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#cg)" />
          <path d={path} fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="4" fill="var(--cyan)" stroke="var(--bg)" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { val: `${first} ${unit}`, lbl: 'Start', color: 'var(--text)' },
          { val: `${last} ${unit}`, lbl: 'Current', color: 'var(--cyan)' },
          { val: `${change >= 0 ? '+' : ''}${change.toFixed(1)}`, lbl: 'Change', color: rateColor },
          { val: `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}/wk`, lbl: 'Rate', color: rateColor }
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PRSection({ prs, unit }) {
  const hasPRs = Object.keys(prs).length > 0;
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid rgba(255,214,0,0.15)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 16, backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>🏅 Personal Records</div>
      {!hasPRs ? (
        <div style={{ textAlign: 'center', padding: 10, color: 'var(--text3)', fontSize: 12 }}>
          Complete workouts to set your first PRs!
        </div>
      ) : (
        EXERCISES.filter(e => !e.isPlank).map(ex => {
          const pr = prs[ex.id];
          return (
            <div key={ex.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{ex.name}</div>
                {pr && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>Week {pr.week} • {pr.date}</div>}
              </div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: pr ? 'var(--gold)' : 'var(--text3)' }}>
                {pr ? `${convertWeight(pr.weight, unit)} ${unit}` : '—'}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MiniTag({ color, bg, border, children }) {
  return (
    <span style={{
      fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700,
      padding: '2px 5px', borderRadius: 4, letterSpacing: 0.3,
      color, background: bg, border: `1px solid ${border}`
    }}>{children}</span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
      color: 'var(--text2)', letterSpacing: 1.5,
      marginBottom: 12, textTransform: 'uppercase'
    }}>{children}</div>
  );
}
