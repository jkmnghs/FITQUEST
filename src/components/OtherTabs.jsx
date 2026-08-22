import React, { useState, useMemo, useEffect } from 'react';
import { ACHIEVEMENTS } from '../data/gameData';
import { authFetch } from '../lib/authFetch';
import { exercisesForDay, DAY_ORDER } from '../utils/session';
import { useConfirm } from './ui/ConfirmDialog';

// ─── ACHIEVEMENTS TAB ───
export function AchievementsTab({ state }) {
  return (
    <div>
      {/* ProfileTab supplies the "Achievements" heading; only the count is
          additional information worth repeating here. */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
        color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', marginBottom: 12
      }}>
        {state.achDone.length}/{ACHIEVEMENTS.length} UNLOCKED
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
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.desc}</div>
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
        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
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
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--green2)',
                background: 'var(--green-glow)', padding: '4px 8px', borderRadius: 6
              }}>+{l.xp}</div>
            </div>
          ))}
          {allLogs.length > showCount && (
            <button onClick={() => setShowCount(c => c + 30)} style={{
              width: '100%', padding: 12, border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, background: 'rgba(255,255,255,0.03)',
              color: 'var(--text3)', fontFamily: 'var(--font-display)', fontSize: 11,
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
      {/* Title supplied by ProgressTab's SectionHeader — see RankTab. */}

      {/* Week selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={() => setViewWeek(v => Math.max(1, v - 1))} style={navBtnStyle}>‹</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', minWidth: 80, textAlign: 'center' }}>
          WEEK {w}
        </span>
        <button onClick={() => setViewWeek(v => Math.min(state.currentWeek, v + 1))} style={navBtnStyle}>›</button>
      </div>

      {/* Summary card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
        border: '1px solid rgba(0,229,255,0.12)', borderRadius: 16, padding: 18, marginBottom: 16
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 14 }}>
          WEEK {w} RECAP
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { val: `${wp.count}/${state.sessionsPerWeek || 3}`, lbl: 'Sessions', color: 'var(--cyan)' },
            { val: `${avgCompletion}%`, lbl: 'Avg Completion', color: 'var(--purple)' },
            { val: weekXP, lbl: 'XP Earned', color: 'var(--fire2)' },
            { val: weightChange, lbl: 'Weight Change', color: 'var(--green)' }
          ].map(item => (
            <div key={item.lbl} style={{
              textAlign: 'center', padding: 10,
              background: 'rgba(255,255,255,0.03)', borderRadius: 10
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <ul style={{ listStyle: 'none', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          {wp.count >= (state.sessionsPerWeek || 3) && (
            <li style={{ color: 'var(--green)', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>→</span>
              All {state.sessionsPerWeek || 3} sessions completed!
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text2)', letterSpacing: 1, marginBottom: 10 }}>
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
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                color: sess.completion >= 95 ? 'var(--green)' : sess.completion >= 70 ? 'var(--cyan)' : 'var(--fire2)'
              }}>{sess.completion}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Kept as a named export for existing callers; the resolution itself lives in
// utils/session so the display and the mutations can't drift apart.
export const getProgramExercisesForDay = exercisesForDay;

// ─── SETTINGS TAB ───
export function SettingsTab({ state, onUpdate, onReset, onResetToday, onBackfillWeek, notifStatus, onRequestNotif, onImport, userEmail, onSignOut, onShowCycleComplete, onSyncFromCloud, lastSyncedAt, syncing, onChangePassword, authError, onClearAuthError }) {
  const { confirm, confirmDialog } = useConfirm();
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [backfillW, setBackfillW] = useState(() => Math.max(1, (state.currentWeek || 1) - 1));
  const [backfillDay, setBackfillDay] = useState(null);
  const [backfillDuration, setBackfillDuration] = useState(50);
  const [backfillWeights, setBackfillWeights] = useState({});
  const [backfillSets, setBackfillSets] = useState({});

  // Account management
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function submitPasswordChange() {
    setPwNote(null);
    onClearAuthError?.();
    if (pwNext.length < 6) { setPwNote({ ok: false, text: 'New password must be at least 6 characters.' }); return; }
    if (pwNext !== pwConfirm) { setPwNote({ ok: false, text: 'New passwords do not match.' }); return; }
    setPwBusy(true);
    const ok = await onChangePassword?.(pwCurrent, pwNext);
    setPwBusy(false);
    if (ok) {
      setPwNote({ ok: true, text: 'Password updated.' });
      setPwCurrent(''); setPwNext(''); setPwConfirm('');
      setTimeout(() => { setPwOpen(false); setPwNote(null); }, 1800);
    } else {
      setPwNote({ ok: false, text: null }); // authError carries the reason
    }
  }

  async function submitAccountDelete() {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const res = await authFetch('/api/account-delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
      onReset();   // wipe local + cloud state
      onSignOut(); // drop the now-orphaned session
    } catch (e) {
      setDeleteError(e.message);
      setDeleteBusy(false);
    }
  }

  const _sortedTdays = useMemo(() => (
    (state.trainingDays || ['mon', 'wed', 'fri'])
      .slice()
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
  ), [state.trainingDays]);

  // Days already recorded for the selected week (real sessions + backfill)
  const _doneDays = useMemo(() => {
    const wp = state.weekProgress?.[backfillW];
    const fromCompleted = wp?.completedDays || [];
    const fromSessions = (wp?.sessions || []).map(s => s.dayKey).filter(Boolean);
    return new Set([...fromCompleted, ...fromSessions]);
  }, [state.weekProgress, backfillW]);

  const programExercises = useMemo(
    () => backfillDay ? getProgramExercisesForDay(state, backfillDay) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backfillDay, state.dayTemplates, state.activeTemplates, state.trainingDays]
  );

  // Reset selected day when week changes
  useEffect(() => {
    setBackfillDay(null);
  }, [backfillW]);

  // Seed default weights/sets whenever the exercise list changes
  useEffect(() => {
    setBackfillWeights(prev => {
      const next = { ...prev };
      programExercises.filter(e => !e.isPlank).forEach(e => {
        if (next[e.id] === undefined) next[e.id] = '';
      });
      return next;
    });
    setBackfillSets(prev => {
      const next = { ...prev };
      programExercises.forEach(e => {
        if (next[e.id] === undefined) next[e.id] = e.isPlank ? 2 : 3;
      });
      return next;
    });
  }, [programExercises]);

  // Reset day selection when week changes
  useEffect(() => { setBackfillDay(null); }, [backfillW]);
  return (
    <div>
      {/* Title supplied by ProfileTab's SectionHeader — see RankTab. */}

      {/* Cycle complete claim button — visible when user is on or just past the end of a 12-week cycle */}
      {onShowCycleComplete && (((state.currentWeek - 1) % 12) + 1 === 12) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(179,136,255,0.06))',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 13, padding: 14, marginBottom: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>
            🏆 Cycle End Reached!
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
            Week {state.currentWeek} is the final week of your current cycle. Claim your reward and choose your next program.
          </div>
          <button
            onClick={onShowCycleComplete}
            style={{
              width: '100%', padding: 10, border: 'none', borderRadius: 10,
              background: 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              color: 'var(--bg)', letterSpacing: 0.5, cursor: 'pointer',
              boxShadow: '0 4px 18px var(--cyan-glow)',
            }}
          >CLAIM CYCLE REWARD 🏆</button>
        </div>
      )}

      {/* Account section */}
      {userEmail && (
        <SettingsGroup title="Account">
        <div style={{ padding: '12px var(--space-4)' }}>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12, wordBreak: 'break-all' }}>
            {userEmail}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onSignOut} style={accountBtn('rgba(255,255,255,0.06)', 'var(--color-text-secondary)')}>SIGN OUT</button>
            {onChangePassword && (
              <button
                onClick={() => { setPwOpen(o => !o); setPwNote(null); onClearAuthError?.(); }}
                style={accountBtn('rgba(0,229,255,0.12)', 'var(--cyan)')}
              >{pwOpen ? 'CANCEL' : 'CHANGE PASSWORD'}</button>
            )}
          </div>

          {/* Change password */}
          {pwOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Current password', value: pwCurrent, set: setPwCurrent, autoComplete: 'current-password' },
                { label: 'New password',     value: pwNext,    set: setPwNext,    autoComplete: 'new-password' },
                { label: 'Confirm new password', value: pwConfirm, set: setPwConfirm, autoComplete: 'new-password' },
              ].map(f => (
                <label key={f.label} style={{ display: 'block', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{f.label}</div>
                  <input
                    type="password" value={f.value} autoComplete={f.autoComplete}
                    onChange={e => f.set(e.target.value)}
                    style={{ ...inputStyle, width: '100%', textAlign: 'left' }}
                  />
                </label>
              ))}
              {(pwNote?.text || (pwNote && !pwNote.ok && authError)) && (
                <div style={{ fontSize: 12, marginBottom: 8, color: pwNote.ok ? 'var(--green)' : 'var(--red)' }}>
                  {pwNote.text || authError}
                </div>
              )}
              <button
                onClick={submitPasswordChange}
                disabled={pwBusy}
                style={{
                  width: '100%', padding: 10, border: 'none', borderRadius: 10,
                  background: pwBusy ? 'rgba(0,229,255,0.15)' : 'linear-gradient(135deg, var(--cyan2), var(--cyan))',
                  color: pwBusy ? 'var(--text3)' : 'var(--bg)',
                  fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                  cursor: pwBusy ? 'default' : 'pointer', letterSpacing: 0.5,
                }}
              >{pwBusy ? 'UPDATING...' : 'UPDATE PASSWORD'}</button>
            </div>
          )}

        </div>
        </SettingsGroup>
      )}

      <SettingsGroup title="Preferences">
      {/* Name */}
      <SettingRow label="Name">
        <input
          value={state.name} maxLength={20}
          onChange={e => onUpdate('name', e.target.value)}
          style={inputStyle}
        />
      </SettingRow>

      {/* Week */}
      <SettingRow label="Current Week">
        <select value={state.currentWeek} onChange={e => onUpdate('currentWeek', parseInt(e.target.value))} style={inputStyle}>
          {Array.from({ length: Math.max(state.currentWeek + 4, 12) }, (_, i) => (
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

      </SettingsGroup>

      {/* Notifications */}
      <SettingsGroup title="Notifications">
      <div style={{ padding: '10px var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Push Notifications</label>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700,
            color: notifStatus === 'granted' ? 'var(--green)' : notifStatus === 'denied' ? 'var(--red)' : 'var(--text3)'
          }}>
            {notifStatus === 'granted' ? 'ENABLED' : notifStatus === 'denied' ? 'BLOCKED' : 'OFF'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
          Scheduled workout day reminders, weekly check-in nudges, overload alerts
        </div>
        {notifStatus !== 'granted' && notifStatus !== 'denied' && (
          <button onClick={onRequestNotif} style={{
            width: '100%', padding: 10, border: 'none', borderRadius: 10,
            background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.28)', color: 'var(--color-action)',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', letterSpacing: 0.5
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

      </SettingsGroup>

      <SettingsGroup title="Training data">
      {/* Backfill History */}
      <div style={{ padding: '10px var(--space-4)' }}>
        <button
          onClick={() => setBackfillOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: backfillOpen ? 4 : 0
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Backfill Past Weeks</span>
          <span style={{ fontSize: 16, color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: backfillOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {backfillOpen && (() => {
          const DAY_FULL = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
          const DAY_SHORT = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
          const alreadyDone = backfillDay ? _doneDays.has(backfillDay) : false;
          const canApply = backfillDay && !alreadyDone && programExercises.length > 0;
          const doneCount = Object.values(backfillSets).filter(s => s > 0).length;
          const pct = programExercises.length > 0 ? Math.round(doneCount / programExercises.length * 100) : 0;

          return <>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, marginTop: 4, lineHeight: 1.5 }}>
            Select the week and the specific training day you want to log.
          </div>

          {/* Week selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Week</div>
            <select value={backfillW} onChange={e => setBackfillW(Number(e.target.value))} style={{ ...inputStyle, width: '100%' }}>
              {Array.from({ length: state.currentWeek }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>

          {/* Week status */}
          {_doneDays.size > 0 && (
            <div style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 10 }}>
              Week {backfillW}: {[..._doneDays].map(d => DAY_SHORT[d] || d).join(', ')} already recorded
            </div>
          )}

          {/* Single-day picker */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Training day to log</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {_sortedTdays.map(dk => {
                const isDone = _doneDays.has(dk);
                const isSelected = backfillDay === dk;
                return (
                  <button
                    key={dk}
                    disabled={isDone}
                    onClick={() => setBackfillDay(dk)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      cursor: isDone ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                      background: isDone
                        ? 'rgba(0,230,118,0.12)'
                        : isSelected
                          ? 'var(--purple)'
                          : 'rgba(255,255,255,0.06)',
                      color: isDone ? 'var(--green)' : isSelected ? '#fff' : 'var(--text3)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {DAY_SHORT[dk] || dk}{isDone ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercise details — only shown once a day is selected */}
          {backfillDay && !alreadyDone && <>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--cyan)',
              marginBottom: 8, fontFamily: 'var(--font-display)',
            }}>
              {DAY_FULL[backfillDay]} session
            </div>

            {/* Session duration */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Session duration</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--cyan)' }}>
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
              Leave weight blank to keep current. Set sets to <span style={{ color: 'var(--fire2)', fontWeight: 700 }}>0</span> to skip an exercise.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', gap: 6, marginBottom: 4 }}>
              {['Exercise', state.unit.toUpperCase(), 'Sets (0=skip)'].map(h => (
                <div key={h} style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {programExercises.map(ex => (
              <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{ex.name}</div>
                {ex.isPlank ? (
                  <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>—</div>
                ) : (
                  <input
                    type="number" inputMode="decimal" min={0} max={1000}
                    placeholder={`${state.liftWeights?.[ex.id] ?? ex.startKg}`}
                    value={backfillWeights[ex.id] ?? ''}
                    onChange={e => setBackfillWeights(prev => ({ ...prev, [ex.id]: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', height: 30, fontSize: 12 }}
                  />
                )}
                <input
                  type="number" inputMode="numeric" min={0} max={ex.sets + 2}
                  value={backfillSets[ex.id] ?? (ex.isPlank ? 2 : 3)}
                  onChange={e => setBackfillSets(prev => ({ ...prev, [ex.id]: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: '100%', height: 30, fontSize: 12 }}
                />
              </div>
            ))}

            {/* Completion preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Completion (auto)</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700,
                color: pct >= 95 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' : 'var(--fire2)' }}>
                {doneCount}/{programExercises.length} &nbsp;{pct}%
              </div>
            </div>
          </>}

          <button
            disabled={!canApply}
            onClick={() => {
              if (!canApply) return;
              const autoPct = pct;
              const custom = {};
              programExercises.filter(e => !e.isPlank).forEach(ex => {
                const v = parseFloat(backfillWeights[ex.id]);
                if (!isNaN(v) && v > 0) {
                  const clamped = Math.min(1000, v);
                  custom[ex.id] = state.unit === 'lbs' ? clamped / 2.205 : clamped;
                }
              });
              onBackfillWeek(backfillW, backfillDay, autoPct, custom, backfillSets, backfillDuration);
              setBackfillDay(null);
            }}
            style={{
              width: '100%', padding: 10, border: 'none', borderRadius: 10, marginTop: 4,
              background: canApply
                ? 'linear-gradient(135deg, var(--purple2), var(--purple))'
                : 'rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              color: canApply ? '#fff' : 'var(--text3)',
              letterSpacing: 0.5, cursor: canApply ? 'pointer' : 'not-allowed',
            }}
          >
            {!backfillDay
              ? 'SELECT A DAY ABOVE'
              : alreadyDone
                ? `${DAY_SHORT[backfillDay]?.toUpperCase()} ALREADY RECORDED`
                : `LOG WEEK ${backfillW} — ${DAY_SHORT[backfillDay]?.toUpperCase()}`}
          </button>
          </>;
        })()}
      </div>

      {/* Nutrition Goals */}
      <button
        onClick={() => setGoalsOpen(o => !o)}
        className="fq-set-row"
        aria-expanded={goalsOpen}
      >
        <span style={{ flex: 1 }}>Nutrition goals</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {state.nutritionGoals?.calories ?? '—'} kcal
        </span>
        <span aria-hidden="true" style={{
          color: 'var(--color-text-tertiary)',
          transform: goalsOpen ? 'rotate(90deg)' : 'none',
          transition: 'transform var(--transition-normal)', lineHeight: 1,
        }}>&#8250;</span>
      </button>
      {goalsOpen && (
      <div className="fq-set-panel" style={{ paddingTop: 'var(--space-3)' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
          Auto-calculated from your profile (height, weight, goal, activity). Edit to override.
        </div>
        {[
          { key: 'calories', label: 'Calories (kcal)', placeholder: '2000' },
          { key: 'protein',  label: 'Protein (g)',     placeholder: '155'  },
          { key: 'carbs',    label: 'Carbs (g)',       placeholder: '190'  },
          { key: 'fat',      label: 'Fat (g)',         placeholder: '60'   },
        ].map(({ key, label, placeholder }) => (
          <SettingRow key={key} label={label}>
            <input
              type="number" min={0}
              value={(state.nutritionGoals || {})[key] ?? ''}
              placeholder={placeholder}
              onChange={e => onUpdate('nutritionGoals', {
                ...(state.nutritionGoals || { calories: 2000, protein: 155, carbs: 190, fat: 60 }),
                [key]: Number(e.target.value) || 0,
              })}
              style={{ ...inputStyle, width: 80 }}
            />
          </SettingRow>
        ))}
      </div>
      )}

      {/* Export / Import */}
      <div style={{ padding: '10px var(--space-4)', borderTop: '1px solid var(--color-border-medium)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 10, lineHeight: 1.5 }}>
          Export your progress as a JSON file, or restore from a previous backup.
        </div>

        {/* Cloud Resync */}
        {onSyncFromCloud && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={onSyncFromCloud}
              disabled={syncing}
              style={{
                width: '100%', padding: 11, borderRadius: 10,
                background: syncing
                  ? 'rgba(0,229,255,0.1)'
                  : 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.08))',
                border: '1px solid rgba(0,229,255,0.3)',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                color: syncing ? 'var(--text3)' : 'var(--cyan)',
                cursor: syncing ? 'default' : 'pointer', letterSpacing: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {syncing ? '⟳ SYNCING...' : '☁ RESYNC FROM CLOUD'}
            </button>
            {lastSyncedAt && (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 5 }}>
                Last synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}

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
              flex: 1, padding: 10, borderRadius: 10,
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.28)', color: 'var(--color-action)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.5
            }}
          >EXPORT</button>
          <label style={{
            flex: 1, padding: 10, borderRadius: 10, textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
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
                    if (data && typeof data === 'object' && typeof data.level === 'number' && typeof data.currentWeek === 'number' && Array.isArray(data.log)) {
                      confirm({
                        title: 'Restore from backup?',
                        message: 'This replaces all current progress with the contents of this file. It cannot be undone.',
                        confirmLabel: 'RESTORE',
                        destructive: true,
                      }).then(ok => { if (ok) onImport(data); });
                    } else {
                      confirm({
                        title: 'Invalid backup file',
                        message: "That file doesn't look like a FitQuest backup.",
                        confirmLabel: 'OK', cancelLabel: 'DISMISS',
                      });
                    }
                  } catch {
                    confirm({
                      title: "Couldn't read that file",
                      message: 'Make sure you picked the .json backup FitQuest exported.',
                      confirmLabel: 'OK', cancelLabel: 'DISMISS',
                    });
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      </SettingsGroup>

      <SettingsGroup title="Danger zone" tone="danger">
      {/* Reset Today */}
      <button
        onClick={() => {
          confirm({
            title: "Clear today's session?",
            message: 'Your logged sets for today are discarded so you can re-run the session. Past weeks are untouched.',
            confirmLabel: 'CLEAR',
          }).then(ok => { if (ok) onResetToday(); });
        }}
        className="fq-set-row" style={{ color: '#ff8a9b', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 500 }}
      >Reset today&rsquo;s session</button>

      {/* Reset */}
      <button
        onClick={() => {
          confirm({
            title: 'Reset ALL progress?',
            message: 'Every session, lift, streak and achievement is erased and you start again from Week 1. This cannot be undone — export a backup first if you might want it back.',
            confirmLabel: 'ERASE EVERYTHING',
            destructive: true,
          }).then(ok => { if (ok) onReset(); });
        }}
        className="fq-set-row" style={{ color: '#ff8a9b', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 500 }}
      >Reset all progress</button>

      {/* Delete account — collected here rather than sitting above the
      preferences, where it shared a card with sign out. */}
      <>
        {!deleteOpen ? (
          <button
            onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); setDeleteError(null); }}
            className="fq-set-row"
            style={{ color: '#ff8a9b', fontFamily: 'var(--font-primary)', fontSize: 'var(--text-base)', fontWeight: 500 }}
          >Delete account</button>
        ) : (
          <div className="fq-set-panel" style={{ paddingTop: 'var(--space-4)' }}>
            <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5, marginBottom: 8 }}>
              This permanently deletes your account and all training data. It cannot be undone.
              Type <strong>DELETE</strong> to confirm.
            </div>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              style={{ ...inputStyle, width: '100%', textAlign: 'left', marginBottom: 8 }}
            />
            {deleteError && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteOpen(false)}
                style={{ flex: 1, ...accountBtn('rgba(255,255,255,0.06)', 'var(--text2)') }}
              >CANCEL</button>
              <button
                onClick={submitAccountDelete}
                disabled={deleteConfirm !== 'DELETE' || deleteBusy}
                style={{
                  flex: 1, padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: deleteConfirm === 'DELETE' && !deleteBusy ? 'var(--red)' : 'rgba(255,23,68,0.12)',
                  color: deleteConfirm === 'DELETE' && !deleteBusy ? '#fff' : 'var(--text3)',
                  fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  cursor: deleteConfirm === 'DELETE' && !deleteBusy ? 'pointer' : 'not-allowed',
                }}
              >{deleteBusy ? 'DELETING...' : 'DELETE FOREVER'}</button>
            </div>
          </div>
        )}
      </>
      </SettingsGroup>

      {confirmDialog}
    </div>
  );
}

/**
 * One row inside a settings group.
 *
 * Was a standalone card — border, radius, 8px margin — so a run of settings
 * rendered as detached boxes rather than a list. It is now a flat row that
 * takes its chrome from the group around it.
 */
function SettingRow({ label, sub, value, children, onClick, tone, chevron }) {
  const Tag = onClick ? 'button' : 'div';
  const labelColor = tone === 'danger' ? '#ff8a9b' : 'var(--color-text-primary)';
  return (
    <Tag
      className="fq-set-row"
      {...(onClick ? { onClick, type: 'button' } : {})}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', color: labelColor, fontWeight: 500 }}>{label}</span>
        {sub && (
          <span style={{
            display: 'block', marginTop: 2,
            fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.45,
          }}>{sub}</span>
        )}
      </span>
      {value != null && (
        <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{value}</span>
      )}
      {children}
      {chevron && (
        <span aria-hidden="true" style={{
          color: 'var(--color-text-tertiary)', flexShrink: 0,
          transition: 'transform var(--transition-normal)',
          transform: chevron === 'open' ? 'rotate(90deg)' : 'none',
          lineHeight: 1,
        }}>&#8250;</span>
      )}
    </Tag>
  );
}

/** A labelled run of settings rows. */
function SettingsGroup({ title, tone, children }) {
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      {title && (
        <div className="fq-set-header" style={tone === 'danger' ? { color: '#ff8a9b' } : undefined}>
          {title}
        </div>
      )}
      <div className={`fq-set-group${tone === 'danger' ? ' fq-set-group--danger' : ''}`}>
        {children}
      </div>
    </section>
  );
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text2)', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

function accountBtn(background, color) {
  return {
    padding: '9px 18px', borderRadius: 10, border: 'none',
    background, color,
    fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 0.5,
  };
}

const inputStyle = {
  height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
  fontFamily: 'var(--font-primary)', fontSize: 14, fontWeight: 600,
  textAlign: 'center', width: 110, padding: '0 8px'
};
