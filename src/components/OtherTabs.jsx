import React, { useState } from 'react';
import { ACHIEVEMENTS, EXERCISES } from '../data/gameData';

// ─── ACHIEVEMENTS TAB ───
export function AchievementsTab({ state }) {
  return (
    <div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
        color: 'var(--text2)', letterSpacing: 1.5, marginBottom: 12
      }}>
        ACHIEVEMENTS • {state.achDone.length}/{ACHIEVEMENTS.length}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = state.achDone.includes(a.id);
          return (
            <div key={a.id} style={{
              background: 'var(--card)',
              border: `1px solid ${unlocked ? 'rgba(0,229,255,0.15)' : 'var(--card-border)'}`,
              borderRadius: 14, padding: '12px 6px', textAlign: 'center',
              backdropFilter: 'blur(20px)', opacity: unlocked ? 1 : 0.3,
              transition: 'all 0.3s'
            }}>
              <div style={{
                fontSize: 26, marginBottom: 4,
                filter: unlocked ? 'none' : 'grayscale(1) brightness(0.5)'
              }}>{unlocked ? a.icon : '❓'}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: unlocked ? 'var(--text)' : 'var(--text2)', letterSpacing: 0.2 }}>
                {unlocked ? a.name : 'Unknown'}
              </div>
              {unlocked && (
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{a.desc}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LOG TAB ───
export function LogTab({ state }) {
  const [showCount, setShowCount] = useState(30);
  const allLogs = [...(state.log || [])].reverse();
  const logs = allLogs.slice(0, showCount);
  const dotColor = { exercise: 'var(--green)', session: 'var(--purple)', checkin: 'var(--gold)' };

  return (
    <div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
        color: 'var(--text2)', letterSpacing: 1.5, marginBottom: 12
      }}>RECENT ACTIVITY • {allLogs.length} entries</div>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '28px 0', fontSize: 13 }}>
          No activity yet. Complete your first session!
        </div>
      ) : (
        <>
          {logs.map((l, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 12px', marginBottom: 8,
              background: 'var(--card)', border: '1px solid var(--card-border)',
              borderRadius: 12, backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: dotColor[l.type] || 'var(--cyan)',
                boxShadow: `0 0 10px ${dotColor[l.type] || 'var(--cyan)'}60`
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {l.dateStr || l.date}{l.week ? ` • Week ${l.week}` : ''}
                </div>
              </div>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700, color: 'var(--green2)',
                background: 'var(--green-glow)', padding: '4px 8px', borderRadius: 6
              }}>+{l.xp}</div>
            </div>
          ))}
          {allLogs.length > showCount && (
            <button onClick={() => setShowCount(c => c + 30)} style={{
              width: '100%', padding: 12, border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, background: 'rgba(255,255,255,0.03)',
              color: 'var(--text3)', fontFamily: 'Orbitron', fontSize: 11,
              fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5
            }}>
              LOAD MORE ({allLogs.length - showCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── SUMMARY TAB ───
export function SummaryTab({ state }) {
  const [viewWeek, setViewWeek] = useState(state.currentWeek);
  const w = viewWeek;
  const wp = state.weekProgress?.[w] || { count: 0, sessions: [], completed: false };
  const sessions = wp.sessions || [];
  const avgCompletion = sessions.length > 0
    ? Math.round(sessions.reduce((s, sess) => s + (sess.completion || 0), 0) / sessions.length)
    : 0;
  const weekLogs = (state.log || []).filter(l => l.week === w);
  const weekXP = weekLogs.reduce((sum, l) => sum + (l.xp || 0), 0);
  const checkin = state.weeklyCheckins?.find(c => c.week === w);
  const prevCheckin = state.weeklyCheckins?.find(c => c.week === w - 1);

  const sug = state.overloadSuggestions || {};
  const increases = Object.entries(sug).filter(([, v]) => v === 'increase').map(([k]) => k);
  const repeats = Object.entries(sug).filter(([, v]) => v === 'repeat').map(([k]) => k);

  let weightChange = '—';
  if (checkin && prevCheckin) {
    const diff = checkin.weight - prevCheckin.weight;
    weightChange = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} ${state.unit}`;
  }

  return (
    <div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
        color: 'var(--text2)', letterSpacing: 1.5, marginBottom: 12
      }}>WEEKLY SUMMARY</div>

      {/* Week selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={() => setViewWeek(v => Math.max(1, v - 1))} style={navBtnStyle}>‹</button>
        <span style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', minWidth: 80, textAlign: 'center' }}>
          WEEK {w}
        </span>
        <button onClick={() => setViewWeek(v => Math.min(state.currentWeek, v + 1))} style={navBtnStyle}>›</button>
      </div>

      {/* Summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
        border: '1px solid rgba(0,229,255,0.12)', borderRadius: 16, padding: 18, marginBottom: 16
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 14 }}>
          WEEK {w} RECAP
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { val: `${wp.count}/3`, lbl: 'Sessions', color: 'var(--cyan)' },
            { val: `${avgCompletion}%`, lbl: 'Avg Completion', color: 'var(--purple)' },
            { val: weekXP, lbl: 'XP Earned', color: 'var(--fire2)' },
            { val: weightChange, lbl: 'Weight Change', color: 'var(--green)' }
          ].map(item => (
            <div key={item.lbl} style={{
              textAlign: 'center', padding: 10,
              background: 'rgba(255,255,255,0.03)', borderRadius: 10
            }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 800, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <ul style={{ listStyle: 'none', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          {wp.count >= 3 && (
            <li style={{ color: 'var(--green)', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>→</span>
              All 3 sessions completed!
            </li>
          )}
          {increases.length > 0 && (
            <li style={{ color: 'var(--green)', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>→</span>
              Ready to increase: {increases.join(', ')}
            </li>
          )}
          {repeats.length > 0 && (
            <li style={{ color: 'var(--gold)', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>→</span>
              Repeat weight: {repeats.join(', ')}
            </li>
          )}
          <li style={{ paddingLeft: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>→</span>
            {checkin ? `Check-in: ${checkin.weight} ${state.unit}` : 'No check-in yet this week'}
          </li>
        </ul>
      </div>

      {/* Session breakdown */}
      {sessions.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--card-border)',
          borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(20px)'
        }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--text2)', letterSpacing: 1, marginBottom: 10 }}>
            SESSION BREAKDOWN
          </div>
          {sessions.map((sess, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Session {i + 1}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sess.date}</div>
              </div>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
                color: sess.completion >= 95 ? 'var(--green)' : sess.completion >= 70 ? 'var(--cyan)' : 'var(--fire2)'
              }}>{sess.completion}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ───
export function SettingsTab({ state, onUpdate, onReset, onResetToday, onBackfillWeek, notifStatus, onRequestNotif, onImport }) {
  const [backfillW, setBackfillW] = useState(1);
  const [backfillCount, setBackfillCount] = useState(1);
  const [backfillDuration, setBackfillDuration] = useState(50);
  const [backfillWeights, setBackfillWeights] = useState(() =>
    Object.fromEntries(EXERCISES.filter(e => !e.isPlank).map(e => [e.id, '']))
  );
  const [backfillSets, setBackfillSets] = useState(() =>
    Object.fromEntries(EXERCISES.map(e => [e.id, e.isPlank ? 2 : 3]))
  );
  return (
    <div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 600,
        color: 'var(--text2)', letterSpacing: 1.5, marginBottom: 12
      }}>SETTINGS</div>

      {/* Name */}
      <SettingRow label="Name">
        <input
          value={state.name} maxLength={12}
          onChange={e => onUpdate('name', e.target.value || 'Jake')}
          style={inputStyle}
        />
      </SettingRow>

      {/* Week */}
      <SettingRow label="Current Week">
        <select value={state.currentWeek} onChange={e => onUpdate('currentWeek', parseInt(e.target.value))} style={inputStyle}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Week {i + 1}</option>
          ))}
        </select>
      </SettingRow>

      {/* Unit */}
      <SettingRow label="Unit">
        <select value={state.unit} onChange={e => onUpdate('unit', e.target.value)} style={inputStyle}>
          <option value="kg">kg</option>
          <option value="lbs">lbs</option>
        </select>
      </SettingRow>

      {/* Notifications */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 13, padding: 14, marginBottom: 8, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Push Notifications</label>
          <div style={{
            fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700,
            color: notifStatus === 'granted' ? 'var(--green)' : notifStatus === 'denied' ? 'var(--red)' : 'var(--text3)'
          }}>
            {notifStatus === 'granted' ? 'ENABLED' : notifStatus === 'denied' ? 'BLOCKED' : 'OFF'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
          Mon/Wed/Fri workout reminders, Sunday check-in, overload nudges
        </div>
        {notifStatus !== 'granted' && notifStatus !== 'denied' && (
          <button onClick={onRequestNotif} style={{
            width: '100%', padding: 10, border: 'none', borderRadius: 10,
            background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
            fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
            color: 'var(--bg)', cursor: 'pointer', letterSpacing: 0.5
          }}>ENABLE NOTIFICATIONS</button>
        )}
        {notifStatus === 'denied' && (
          <div style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center' }}>
            Notifications blocked. Enable in browser settings.
          </div>
        )}
        {notifStatus === 'granted' && (
          <div style={{ fontSize: 11, color: 'var(--green)', textAlign: 'center' }}>
            ✓ You'll receive workout and check-in reminders
          </div>
        )}
      </div>

      {/* Backfill History */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(179,136,255,0.2)',
        borderRadius: 13, padding: 14, marginBottom: 8, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Backfill Past Weeks</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
          Lost your data? Set sessions done, completion, and weights you were lifting.
        </div>

        {/* Week + sessions row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Week</div>
            <select value={backfillW} onChange={e => setBackfillW(Number(e.target.value))} style={{ ...inputStyle, width: '100%' }}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Sessions done</div>
            <select value={backfillCount} onChange={e => setBackfillCount(Number(e.target.value))} style={{ ...inputStyle, width: '100%' }}>
              <option value={1}>1 / 3</option>
              <option value={2}>2 / 3</option>
              <option value={3}>3 / 3 ✓</option>
            </select>
          </div>
        </div>



        {/* Session duration */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Session duration (per session)</div>
            <div style={{ fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700, color: 'var(--cyan)' }}>
              {backfillDuration} min
            </div>
          </div>
          <input type="range" min={20} max={120} step={5} value={backfillDuration}
            onChange={e => setBackfillDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--cyan)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            <span>20 min</span><span>120 min</span>
          </div>
        </div>

        {/* Per-exercise weights + sets */}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
          Exercise details — leave weight blank to keep current. Set sets to <span style={{ color: 'var(--fire2)', fontWeight: 700 }}>0</span> for any exercise you skipped.
        </div>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', gap: 6, marginBottom: 4 }}>
          {['Exercise', state.unit.toUpperCase(), 'Sets (0=skip)'].map(h => (
            <div key={h} style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'Orbitron', fontWeight: 600 }}>{h}</div>
          ))}
        </div>
        {EXERCISES.map(ex => (
          <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{ex.name}</div>
            {ex.isPlank ? (
              <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>—</div>
            ) : (
              <input
                type="number" inputMode="decimal"
                placeholder={`${state.liftWeights?.[ex.id] ?? ex.startKg}`}
                value={backfillWeights[ex.id]}
                onChange={e => setBackfillWeights(prev => ({ ...prev, [ex.id]: e.target.value }))}
                style={{ ...inputStyle, width: '100%', height: 30, fontSize: 12 }}
              />
            )}
            <input
              type="number" inputMode="numeric"
              min={0} max={ex.sets + 2}
              value={backfillSets[ex.id]}
              onChange={e => setBackfillSets(prev => ({ ...prev, [ex.id]: Number(e.target.value) }))}
              style={{ ...inputStyle, width: '100%', height: 30, fontSize: 12 }}
            />
          </div>
        ))}

        {/* Current status */}
        {(state.weekProgress?.[backfillW] || state.backfillLock?.[backfillW]) && (
          <div style={{ fontSize: 11, color: 'var(--cyan)', margin: '8px 0' }}>
            Currently: {state.weekProgress?.[backfillW]?.count ?? 0}/3 sessions
            {state.weekProgress?.[backfillW]?.completed ? ' ✓ complete' : ''}
          </div>
        )}

        {/* Auto-computed completion */}
        {(() => {
          const done = Object.values(backfillSets).filter(s => s > 0).length;
          const pct = Math.round(done / EXERCISES.length * 100);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Completion (auto)</div>
              <div style={{ fontSize: 12, fontFamily: 'Orbitron', fontWeight: 700,
                color: pct >= 95 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' : 'var(--fire2)' }}>
                {done}/{EXERCISES.length} &nbsp;{pct}%
              </div>
            </div>
          );
        })()}

        {(() => {
          const lockedCount = state.backfillLock?.[backfillW] ?? 0;
          const alreadyDone = backfillCount <= lockedCount;
          return (
            <button
              disabled={alreadyDone}
              onClick={() => {
                if (alreadyDone) return;
                const done = Object.values(backfillSets).filter(s => s > 0).length;
                const autoPct = Math.round(done / EXERCISES.length * 100);
                const custom = {};
                EXERCISES.filter(e => !e.isPlank).forEach(ex => {
                  const v = parseFloat(backfillWeights[ex.id]);
                  if (!isNaN(v) && v > 0) {
                    custom[ex.id] = state.unit === 'lbs' ? v / 2.205 : v;
                  }
                });
                onBackfillWeek(backfillW, backfillCount, autoPct, custom, backfillSets, backfillDuration);
              }}
              style={{
                width: '100%', padding: 10, border: 'none', borderRadius: 10, marginTop: 4,
                background: alreadyDone
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, var(--purple2), var(--purple))',
                fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
                color: alreadyDone ? 'var(--text3)' : '#fff',
                letterSpacing: 0.5, cursor: alreadyDone ? 'not-allowed' : 'pointer'
              }}
            >{alreadyDone ? `WEEK ${backfillW} ALREADY AT ${lockedCount}/3` : `APPLY WEEK ${backfillW}`}</button>
          );
        })()}
      </div>

      {/* Export / Import */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--card-border)',
        borderRadius: 13, padding: 14, marginBottom: 8, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Backup & Restore</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
          Export your progress as a JSON file, or restore from a previous backup.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const json = JSON.stringify(state, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `fitquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            style={{
              flex: 1, padding: 10, border: 'none', borderRadius: 10,
              background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
              fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
              color: 'var(--bg)', cursor: 'pointer', letterSpacing: 0.5
            }}
          >EXPORT</button>
          <label style={{
            flex: 1, padding: 10, borderRadius: 10, textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
            color: 'var(--text2)', cursor: 'pointer', letterSpacing: 0.5
          }}>
            IMPORT
            <input type="file" accept=".json" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    if (data && typeof data === 'object' && data.level !== undefined) {
                      if (window.confirm('Replace all current progress with this backup?')) {
                        onImport(data);
                      }
                    } else {
                      alert('Invalid backup file.');
                    }
                  } catch {
                    alert('Could not read file. Make sure it\'s a valid FitQuest backup.');
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* Reset Today */}
      <button
        onClick={() => {
          if (window.confirm("Clear today's session so you can re-test exercises?")) onResetToday();
        }}
        style={{
          width: '100%', padding: 12, marginTop: 8,
          border: '2px solid var(--gold)', borderRadius: 13,
          background: 'rgba(255,214,0,0.06)', color: 'var(--gold)',
          fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 0.8
        }}
      >RESET TODAY'S SESSION</button>

      {/* Reset */}
      <button
        onClick={() => {
          if (window.confirm('Reset ALL progress? This cannot be undone!')) onReset();
        }}
        style={{
          width: '100%', padding: 12, marginTop: 8,
          border: '2px solid var(--red)', borderRadius: 13,
          background: 'rgba(255,23,68,0.06)', color: 'var(--red)',
          fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 0.8
        }}
      >RESET ALL PROGRESS</button>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 13, padding: 14, marginBottom: 8, backdropFilter: 'blur(20px)'
    }}>
      <label style={{ fontSize: 14, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text2)', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const inputStyle = {
  height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
  fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 600,
  textAlign: 'center', width: 110, padding: '0 8px'
};
