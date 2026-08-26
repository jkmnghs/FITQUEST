import { useState, useEffect } from 'react';
import { getBackupInfo, restoreFromBackup } from '../utils/storage';

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

export function BackupCard({ userId, onRestored, onToast, confirm }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    getBackupInfo(userId).then(i => { if (alive) setInfo(i); });
    return () => { alive = false; };
  }, [userId]);

  if (!info || info.totalSessions === 0) return null;

  async function handleRestore() {
    const ok = confirm
      ? await confirm({
          title: 'Restore this snapshot?',
          message: `This replaces your current progress with the ${info.totalSessions}-session snapshot. Your current state is kept as the new snapshot, so this is reversible.`,
          confirmLabel: 'Restore',
        })
      : true;
    if (!ok) return;

    setBusy(true);
    const restored = await restoreFromBackup(userId);
    setBusy(false);
    if (restored) {
      onRestored?.(restored);
      onToast?.('Snapshot restored ✓');
    } else {
      onToast?.('Restore failed — check your connection.');
    }
  }

  const takenAt = info.takenAt ? new Date(info.takenAt) : null;

  return (
    <div style={{
      marginBottom: 10, padding: '11px 14px',
      background: 'rgba(0,230,118,0.06)',
      border: '1px solid rgba(0,230,118,0.25)',
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily: 'var(--font-primary)', fontSize: 13, fontWeight: 600,
        color: 'var(--color-text-primary)',
      }}>
        Recovery snapshot available
      </div>
      <div style={{
        fontFamily: 'var(--font-primary)', fontSize: 12, lineHeight: 1.45,
        color: 'var(--color-text-secondary)', marginTop: 3,
      }}>
        {info.totalSessions} sessions · week {info.currentWeek} · level {info.level}
        {takenAt && <> · saved {takenAt.toLocaleDateString()}</>}
      </div>
      <div style={{
        fontFamily: 'var(--font-primary)', fontSize: 11, lineHeight: 1.45,
        color: 'var(--color-text-tertiary)', marginTop: 4,
      }}>
        Taken automatically because a save would have reduced your progress.
      </div>
      <button
        onClick={handleRestore}
        disabled={busy}
        className="fq-press"
        style={{
          width: '100%', marginTop: 9, minHeight: 'var(--tap-target)', padding: 10,
          borderRadius: 10,
          background: busy ? 'rgba(0,230,118,0.1)' : 'rgba(0,230,118,0.16)',
          border: '1px solid rgba(0,230,118,0.35)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          letterSpacing: 0.5,
          color: busy ? 'var(--color-text-tertiary)' : 'var(--color-success)',
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'RESTORING…' : 'RESTORE THIS SNAPSHOT'}
      </button>
    </div>
  );
}
