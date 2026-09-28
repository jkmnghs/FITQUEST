import React, { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CloudOff } from 'lucide-react';
import { getSyncStatus, subscribeSyncStatus, retryCloudSaveNow } from '../utils/storage';

/**
 * Says so when the cloud copy is behind this device.
 *
 * A failed save used to be a console warning only: the user saw nothing,
 * and a cleared browser or a switch of device later lost progress they
 * believed was saved. Saves retry on their own; this makes that visible and
 * lets the user push one through by hand.
 */
export default function CloudSaveBanner() {
  const { status } = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
  if (status !== 'error') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        width: 'max-content',
        maxWidth: 'min(calc(100vw - 32px), 420px)',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px 8px 14px',
        background: 'rgba(40,20,10,0.92)',
        border: '1px solid rgba(255,109,0,0.45)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--color-text-primary)',
        fontSize: 13, lineHeight: 1.35,
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
      }}
    >
      <CloudOff size={16} color="var(--color-warning)" style={{ flexShrink: 0 }} />
      <span>Not saved to the cloud yet — kept on this device, retrying.</span>
      <button
        onClick={retryCloudSaveNow}
        style={{
          flexShrink: 0, padding: '6px 10px', minHeight: 32,
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,109,0,0.5)',
          background: 'rgba(255,109,0,0.14)',
          color: 'var(--color-warning)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}
      >Retry</button>
    </div>,
    document.body,
  );
}
