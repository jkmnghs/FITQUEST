import { useState, useEffect } from 'react';
import { getBackupInfo, restoreFromBackup, summariseState, diffStates } from '../utils/storage';

/**
 * Two safety nets for account data, in Settings → Training data.
 *
 * A sync defect once overwrote a populated account with an empty state, and
 * because the row was the only copy — free-plan Postgres keeps no backups —
 * there was no way back. The export button existed but nothing ever suggested
 * using it.
 *
 * So: surface the server-side snapshot when one exists, and nag gently when the
 * last manual export is old.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
// Long enough not to be noise, short enough that a lost week is the worst case.
const EXPORT_STALE_AFTER_DAYS = 14;

function daysSince(ts) {
  if (!ts) return Infinity;
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / DAY_MS);
}

export function ExportNudge({ state, onExport }) {
  const sessions = Number(state?.totalSessions) || 0;
  const age = daysSince(state?.lastExportAt);

  // Nothing to lose yet, or backed up recently.
  if (sessions === 0 || age < EXPORT_STALE_AFTER_DAYS) return null;

  const never = !state?.lastExportAt;

  return (
    <button
      onClick={onExport}
      className="fq-press"
      style={{
        width: '100%', marginBottom: 10, padding: '11px 14px',
        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        background: 'rgba(255,214,0,0.07)',
        border: '1px solid rgba(255,214,0,0.28)',
        borderRadius: 10, cursor: 'pointer',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontFamily: 'var(--font-primary)', fontSize: 13,
          fontWeight: 600, color: 'var(--color-text-primary)',
        }}>
          {never ? 'You have never backed up' : `Last backup was ${age} days ago`}
        </span>
        <span style={{
          display: 'block', fontFamily: 'var(--font-primary)', fontSize: 12,
          color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4,
        }}>
          {sessions} sessions of progress. Tap to save a copy.
        </span>
      </span>
    </button>
  );
}

/**
 * The card itself, given both summaries — no data fetching, so it can be
 * rendered directly in a preview or a test with a known snapshot.
 */
export function BackupCardView({ info, current, busy = false, onRestore }) {
  const [open, setOpen] = useState(false);
  if (!info) return null;

  const { rows, losses } = diffStates(current, info);
  // Nothing would change — no reason to offer the choice at all.
  if (rows.length === 0) return null;

  const risky = losses.length > 0;
  const accent = risky ? '255,214,0' : '0,230,118';
  const takenAt = info.takenAt ? new Date(info.takenAt) : null;
  return (
    <div style={{
      marginBottom: 10, padding: '11px 14px',
      background: `rgba(${accent},0.06)`,
      border: `1px solid rgba(${accent},0.25)`,
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily: 'var(--font-primary)', fontSize: 13, fontWeight: 600,
        color: 'var(--color-text-primary)',
      }}>
        {risky ? 'Snapshot available — but it holds less' : 'Recovery snapshot available'}
      </div>
      <div style={{
        fontFamily: 'var(--font-primary)', fontSize: 12, lineHeight: 1.45,
        color: 'var(--color-text-secondary)', marginTop: 3,
      }}>
        Taken automatically because a save would have reduced your progress
        {takenAt && <> · {takenAt.toLocaleDateString()}</>}
      </div>

      {/* The whole point of the card: what actually changes, both directions.
          A bare session count once made an empty snapshot look like the better
          copy, because it happened to carry a higher number. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="fq-press"
        style={{
          width: '100%', marginTop: 9, padding: '7px 0',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-primary)', fontSize: 12, fontWeight: 600,
          color: `rgb(${accent})`, textAlign: 'left',
        }}
      >
        {open ? '▾' : '▸'} What would change ({rows.length})
      </button>

      {open && (
        <div style={{ marginTop: 2, marginBottom: 4 }}>
          {rows.map(r => {
            const down = r.after < r.now;
            return (
              <div key={r.key} style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '3px 0', fontSize: 12, fontFamily: 'var(--font-primary)',
              }}>
                <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{r.label}</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{r.now}</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                <span style={{
                  minWidth: 34, textAlign: 'right', fontWeight: 700,
                  color: down ? 'var(--color-destructive)' : 'var(--color-success)',
                }}>{r.after}</span>
              </div>
            );
          })}
        </div>
      )}

      {risky && (
        <div style={{
          fontFamily: 'var(--font-primary)', fontSize: 11, lineHeight: 1.45,
          color: 'var(--color-text-tertiary)', marginTop: 2,
        }}>
          A higher session count does not mean a better copy — check the logged
          workouts and records above before restoring.
        </div>
      )}

      <button
        onClick={onRestore}
        disabled={busy}
        className="fq-press"
        style={{
          width: '100%', marginTop: 9, minHeight: 'var(--tap-target)', padding: 10,
          borderRadius: 10,
          background: busy ? `rgba(${accent},0.1)` : `rgba(${accent},0.16)`,
          border: `1px solid rgba(${accent},0.35)`,
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          letterSpacing: 0.5,
          color: busy ? 'var(--color-text-tertiary)' : `rgb(${accent})`,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'RESTORING…' : 'RESTORE THIS SNAPSHOT'}
      </button>
    </div>
  );
}

/**
 * Data-fetching wrapper: reads the snapshot summary, compares it to the live
 * state, and hands both to the view.
 */
export function BackupCard({ state, userId, onRestored, onToast, confirm }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    getBackupInfo(userId).then(i => { if (alive) setInfo(i); });
    return () => { alive = false; };
  }, [userId]);

  if (!info) return null;
  const current = summariseState(state);

  async function handleRestore() {
    const { losses } = diffStates(current, info);
    const risky = losses.length > 0;
    const lossLine = losses.map(l => `${l.label}: ${l.now} → ${l.after}`).join('\n');

    const ok = confirm
      ? await confirm({
          title: risky ? 'This snapshot has less data' : 'Restore this snapshot?',
          message: risky
            ? `Restoring would reduce:\n\n${lossLine}\n\nYour current state is kept as the new snapshot, so this can be undone.`
            : 'Your current state is kept as the new snapshot, so this can be undone.',
          confirmLabel: risky ? 'Restore anyway' : 'Restore',
          destructive: risky,
        })
      : true;
    if (!ok) return;

    setBusy(true);
    const restored = await restoreFromBackup(userId);
    setBusy(false);
    if (restored) {
      onRestored?.(restored);
      onToast?.('Snapshot restored ✓');
      setInfo(null);
    } else {
      onToast?.('Restore failed — check your connection.');
    }
  }

  return <BackupCardView info={info} current={current} busy={busy} onRestore={handleRestore} />;
}
