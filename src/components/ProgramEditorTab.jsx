import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EX_CATALOG } from '../data/exerciseCatalog';
import { useConfirm } from './ui/ConfirmDialog';

const DAY_ORDER  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_FULL   = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_SHORT  = { mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN' };

const REST_OPTIONS = [
  { label: '45 sec',  sec: 45  },
  { label: '60 sec',  sec: 60  },
  { label: '90 sec',  sec: 90  },
  { label: '2 min',   sec: 120 },
  { label: '2.5 min', sec: 150 },
  { label: '3 min',   sec: 180 },
  { label: '3.5 min', sec: 210 },
];


function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function fmtRest(sec) {
  const opt = REST_OPTIONS.find(o => o.sec === sec);
  if (opt) return opt.label;
  if (sec && sec >= 60 && sec % 60 === 0) return `${sec / 60} min`;
  return sec ? `${sec} sec` : '—';
}

function repLabel(ex) {
  const mn = ex.repMin ?? ex.reps;
  const mx = ex.repMax ?? ex.reps;
  return mn !== mx ? `${mn}–${mx}` : String(mn ?? '?');
}

const inputSt = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: 'var(--text1)', fontFamily: 'var(--font-primary)', fontSize: 14,
  padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
};
const selectSt = { ...inputSt, cursor: 'pointer', appearance: 'none', paddingRight: 6 };

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: 1, marginBottom: 4 }}>{children}</div>;
}

function ExForm({ ex, onChange, onDone }) {
  return (
    <div style={{
      padding: '14px 14px 12px',
      background: 'rgba(0,229,255,0.03)',
      borderTop: '1px solid rgba(0,229,255,0.12)',
      borderRadius: '0 0 12px 12px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {!ex.isBodyweight && (
          <div>
            <FieldLabel>WEIGHT (KG)</FieldLabel>
            <input type="number" min="0" step="0.5" value={ex.startKg ?? 0}
              onChange={e => onChange('startKg', parseFloat(e.target.value) || 0)} style={inputSt} />
          </div>
        )}
        <div>
          <FieldLabel>SETS</FieldLabel>
          <input type="number" min="1" max="10" value={ex.sets ?? 3}
            onChange={e => onChange('sets', Math.max(1, parseInt(e.target.value) || 1))} style={inputSt} />
        </div>
        <div>
          <FieldLabel>REPS MIN</FieldLabel>
          <input type="number" min="1" value={ex.repMin ?? ex.reps ?? 10}
            onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); onChange('repMin', v); onChange('reps', v); }} style={inputSt} />
        </div>
        <div>
          <FieldLabel>REPS MAX</FieldLabel>
          <input type="number" min="1" value={ex.repMax ?? ex.reps ?? 10}
            onChange={e => onChange('repMax', Math.max(1, parseInt(e.target.value) || 1))} style={inputSt} />
        </div>
        <div>
          <FieldLabel>REST</FieldLabel>
          <select value={ex.restSec ?? 120}
            onChange={e => { const s = Number(e.target.value); onChange('restSec', s); onChange('rest', fmtRest(s)); }}
            style={selectSt}>
            {REST_OPTIONS.map(o => <option key={o.sec} value={o.sec}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>RPE</FieldLabel>
          <select value={ex.rpe ?? 8} onChange={e => onChange('rpe', Number(e.target.value))} style={selectSt}>
            {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <FieldLabel>NOTE (OPTIONAL)</FieldLabel>
        <input type="text" value={ex.note ?? ''} placeholder="e.g. Prioritize full ROM"
          onChange={e => onChange('note', e.target.value)} style={inputSt} />
      </div>
      {onDone && (
        <button onClick={onDone} style={{
          marginTop: 10, padding: '7px 16px', borderRadius: 8, border: 'none',
          background: 'rgba(0,229,255,0.12)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
        }}>DONE</button>
      )}
    </div>
  );
}

export default function ProgramEditorTab({ state, updateSetting }) {
  const { confirm, confirmDialog } = useConfirm();
  const trainingDays = useMemo(() => {
    const raw = state.trainingDays?.length ? state.trainingDays : (state.assessment?.trainingDays || ['mon', 'wed', 'fri']);
    return raw.filter(d => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }, [state.trainingDays, state.assessment?.trainingDays]);

  const [activeDay, setActiveDay] = useState(trainingDays[0] || 'mon');

  const buildDrafts = (templates, days) => {
    const existing = templates || {};
    const init = {};
    days.forEach(d => {
      init[d] = existing[d] || { title: '', sessionMinutes: 75, exercises: [] };
    });
    return init;
  };

  const [drafts, setDrafts] = useState(() => buildDrafts(state.dayTemplates, trainingDays));

  // The lazy initialiser only ran once. If dayTemplates arrived later (cloud
  // sync, AI generation) or the training days changed, the editor kept showing
  // empty days — and SAVE then wrote those empties over the real program.
  const [dirty, setDirty] = useState(false);
  const templatesKey = JSON.stringify(state.dayTemplates || {});
  const daysKey = trainingDays.join(',');
  const lastSyncedKey = useRef(`${templatesKey}|${daysKey}`);

  useEffect(() => {
    const key = `${templatesKey}|${daysKey}`;
    if (key === lastSyncedKey.current) return;
    lastSyncedKey.current = key;
    if (dirty) return; // never discard edits the user is in the middle of
    setDrafts(buildDrafts(state.dayTemplates, trainingDays));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesKey, daysKey, dirty]);

  const [editingIdx, setEditingIdx] = useState(null);
  const [addSearch, setAddSearch]   = useState('');
  const [addForm, setAddForm]       = useState(null);
  const [saved, setSaved]           = useState(false);

  const day    = drafts[activeDay] || { title: '', sessionMinutes: 75, exercises: [] };
  const exList = day.exercises || [];

  function patchDay(field, value) {
    setDirty(true);
    setDrafts(prev => ({ ...prev, [activeDay]: { ...(prev[activeDay] || {}), [field]: value } }));
  }

  function patchExercise(idx, field, value) {
    patchDay('exercises', exList.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  }

  function deleteExercise(idx) {
    patchDay('exercises', exList.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  }

  function moveExercise(idx, dir) {
    const arr = [...exList];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    patchDay('exercises', arr);
    setEditingIdx(null);
  }

  const suggestions = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return EX_CATALOG.slice(0, 10);
    return EX_CATALOG.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [addSearch]);

  function pickFromCatalog(cat) {
    setAddForm({
      id: cat.id,
      name: cat.name,
      sets: 3, reps: 10, repMin: 10, repMax: 10,
      restSec: 120, rest: '2 min', rpe: 8,
      startKg: cat.startKg ?? 0,
      note: '', isBodyweight: cat.isBodyweight ?? false, isPlank: cat.isPlank ?? false,
    });
    setAddSearch('');
  }

  function useCustomName() {
    if (!addSearch.trim()) return;
    const existing = EX_CATALOG.find(e => e.name.toLowerCase() === addSearch.trim().toLowerCase());
    if (existing) { pickFromCatalog(existing); return; }
    setAddForm({
      id: slugify(addSearch.trim()) || ('custom_' + Date.now()),
      name: addSearch.trim(),
      sets: 3, reps: 10, repMin: 10, repMax: 10,
      restSec: 120, rest: '2 min', rpe: 8,
      startKg: 20, note: '', isBodyweight: false, isPlank: false,
    });
    setAddSearch('');
  }

  function confirmAdd() {
    if (!addForm) return;
    patchDay('exercises', [...exList, addForm]);
    setAddForm(null);
  }

  function saveProgram() {
    // Merge rather than replace: `drafts` only covers the current trainingDays,
    // so a wholesale write silently dropped templates for any other day.
    const merged = { ...(state.dayTemplates || {}), ...drafts };
    updateSetting('dayTemplates', merged);
    lastSyncedKey.current = `${JSON.stringify(merged)}|${daysKey}`;
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function clearDay() {
    const ok = await confirm({
      title: `Clear ${DAY_FULL[activeDay]}?`,
      message: 'Every exercise on this day is removed. You can rebuild it by hand or ask the AI Coach to design it.',
      confirmLabel: 'CLEAR DAY',
      destructive: true,
    });
    if (!ok) return;
    patchDay('exercises', []);
    setEditingIdx(null);
    setAddForm(null);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {confirmDialog}
      {/* The "MY PROGRAM" title that used to sit here is now supplied by
          ProfileTab's SectionHeader — printing it here too showed it twice. */}
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
        Set custom exercises for each training day. The Train tab auto-loads today's session.
      </div>

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {trainingDays.map(d => {
          const active  = d === activeDay;
          const hasEx = (drafts[d]?.exercises || []).length > 0;
          return (
            <button key={d} onClick={() => { setActiveDay(d); setEditingIdx(null); setAddForm(null); }} style={{
              padding: '8px 16px', borderRadius: 20,
              border: `1px solid ${active ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
              background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
              color: active ? 'var(--cyan)' : 'var(--text3)',
              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent', position: 'relative',
            }}>
              {DAY_SHORT[d]}
              {hasEx && <span style={{
                position: 'absolute', top: 2, right: 4, width: 5, height: 5,
                borderRadius: '50%', background: active ? 'var(--cyan)' : 'var(--green)',
              }} />}
            </button>
          );
        })}
      </div>

      {/* Day title + session time */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          type="text"
          value={day.title}
          onChange={e => patchDay('title', e.target.value)}
          placeholder={`${DAY_FULL[activeDay]} session — e.g. PUSH + SHOULDERS + ABS`}
          style={{ ...inputSt, flex: 1 }}
        />
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" min="20" max="180" step="5"
            value={day.sessionMinutes ?? 75}
            onChange={e => patchDay('sessionMinutes', parseInt(e.target.value) || 75)}
            style={{ ...inputSt, width: 52, textAlign: 'center' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>min</span>
        </div>
      </div>

      {/* Empty state */}
      {exList.length === 0 && !addForm && (
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 14, marginBottom: 14,
          color: 'var(--text3)', fontSize: 13,
        }}>
          No exercises yet for {DAY_FULL[activeDay]}.<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>Add exercises using the button below.</span>
        </div>
      )}

      {/* Exercise list */}
      {exList.map((ex, idx) => {
        const isEditing = editingIdx === idx;
        return (
          <div key={idx} style={{
            marginBottom: 8,
            border: `1px solid ${isEditing ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 12, overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              }}>{idx + 1}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Four 38px action buttons leave this column ~130px on a
                    393px phone, which truncated "Romanian Deadlift" and
                    "DB Overhead Press" mid-word. Wrapping costs a line only
                    on the long names; ellipsis cost information on every one. */}
                <div style={{ fontFamily: 'var(--font-primary)', fontSize: 14, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                  {ex.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {ex.isBodyweight ? 'BW' : `${ex.startKg}kg`}
                  {' · '}{ex.sets}×{repLabel(ex)}
                  {' · '}{fmtRest(ex.restSec)}
                  {' · '}RPE {ex.rpe}
                </div>
                {ex.note ? <div style={{ fontSize: 10, color: 'var(--purple)', marginTop: 2, opacity: 0.8 }}>{ex.note}</div> : null}
              </div>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setEditingIdx(isEditing ? null : idx)} style={actionBtn(isEditing ? 'var(--cyan)' : null)} title="Edit" aria-label={`Edit ${ex.name}`}>✎</button>
                <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} style={actionBtn()} title="Move up" aria-label={`Move ${ex.name} up`}>↑</button>
                <button onClick={() => moveExercise(idx, 1)} disabled={idx === exList.length - 1} style={actionBtn()} title="Move down" aria-label={`Move ${ex.name} down`}>↓</button>
                <button onClick={() => deleteExercise(idx)} style={actionBtn('rgba(255,50,68,0.7)')} title="Delete" aria-label={`Delete ${ex.name}`}>✕</button>
              </div>
            </div>

            {isEditing && (
              <ExForm
                ex={ex}
                onChange={(field, value) => patchExercise(idx, field, value)}
                onDone={() => setEditingIdx(null)}
              />
            )}
          </div>
        );
      })}

      {/* Add exercise */}
      {!addForm ? (
        <button onClick={() => setAddForm('searching')} style={{
          width: '100%', padding: '13px', marginBottom: 16,
          border: '1px dashed rgba(0,229,255,0.25)', borderRadius: 12,
          background: 'rgba(0,229,255,0.03)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: 1, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          + ADD EXERCISE
        </button>
      ) : addForm === 'searching' ? (
        <div style={{
          marginBottom: 16, padding: '14px',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: 14,
          background: 'rgba(0,229,255,0.03)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 10 }}>
            SEARCH EXERCISE LIBRARY
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              type="text"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') useCustomName(); if (e.key === 'Escape') setAddForm(null); }}
              placeholder="Search or type custom name…"
              style={{ ...inputSt, flex: 1 }}
            />
            <button onClick={useCustomName} style={{
              padding: '0 14px', borderRadius: 8, border: 'none',
              background: 'rgba(0,229,255,0.15)', color: 'var(--cyan)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}>USE</button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {suggestions.map(s => (
              <button key={s.id} onClick={() => pickFromCatalog(s)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: 'var(--font-primary)', fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.isBodyweight ? 'BW' : `${s.startKg}kg`}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setAddForm(null)} style={{
            marginTop: 10, padding: '7px 14px', borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text3)',
            fontFamily: 'var(--font-display)', fontSize: 11, cursor: 'pointer',
          }}>CANCEL</button>
        </div>
      ) : (
        <div style={{
          marginBottom: 16, padding: '14px',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: 14,
          background: 'rgba(0,229,255,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{addForm.name}</div>
            <button onClick={() => setAddForm('searching')} style={{
              padding: '3px 8px', borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text3)',
              fontSize: 10, cursor: 'pointer',
            }}>← back</button>
          </div>
          <ExForm
            ex={addForm}
            onChange={(field, value) => setAddForm(prev => ({ ...prev, [field]: value }))}
            onDone={null}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={confirmAdd} style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1,
            }}>ADD TO {DAY_SHORT[activeDay]}</button>
            <button onClick={() => setAddForm(null)} style={{
              padding: '11px 16px', borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text3)',
              fontFamily: 'var(--font-display)', fontSize: 11, cursor: 'pointer',
            }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Save / Clear */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={saveProgram} style={{
          flex: 1, padding: '14px', borderRadius: 12, border: saved ? '1px solid var(--green)' : 'none',
          background: saved ? 'rgba(0,230,118,0.15)' : 'linear-gradient(135deg, var(--cyan), var(--purple))',
          color: saved ? 'var(--green)' : 'var(--bg)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 1, transition: 'all 0.3s',
        }}>
          {saved ? '✓ SAVED' : 'SAVE PROGRAM'}
        </button>
        {exList.length > 0 && (
          <button onClick={clearDay} style={{
            padding: '14px 18px', borderRadius: 12,
            border: '1px solid rgba(255,50,68,0.2)',
            background: 'rgba(255,50,68,0.07)', color: 'var(--red)',
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', letterSpacing: 1, flexShrink: 0,
          }}>CLEAR DAY</button>
        )}
      </div>

      <div style={{
        marginTop: 16, padding: '12px 14px',
        background: 'rgba(179,136,255,0.05)', border: '1px solid rgba(179,136,255,0.15)',
        borderRadius: 12, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--purple)' }}>How it works:</strong> Once saved, the Workout tab auto-loads today's exercises from this program. Prescribed weights here are your starting weights — the app tracks progress separately as you advance.
      </div>
    </div>
  );
}

function actionBtn(color) {
  return {
    // Four of these sit side by side on every exercise row. At 28px they were
    // under the 44px touch guideline and easy to mis-hit — deleting an
    // exercise when you meant to reorder it.
    width: 38, height: 38, borderRadius: 'var(--radius-md)', border: 'none',
    background: 'rgba(255,255,255,0.06)',
    color: color || 'var(--text3)', fontSize: 15,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent', padding: 0, flexShrink: 0,
  };
}
