import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Transient status message.
 *
 * Anchored above the tab bar rather than at a hardcoded `top: 70`, which was
 * measured against the old full-height header and landed squarely on the first
 * row of content. `nowrap` was also dropped: messages like
 * "🏆 CYCLE COMPLETE! Week 13 begins — keep lifting! ⚔️" ran off both edges of
 * a 320px screen.
 */
export default function Toast({ message }) {
  if (!message) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + var(--safe-area-bottom) + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        width: 'max-content',
        maxWidth: 'min(calc(100vw - 32px), 380px)',
        background: 'linear-gradient(135deg, rgba(0,230,118,0.16), rgba(0,229,255,0.16))',
        border: '1px solid rgba(0,230,118,0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 20px',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-sm)',
        fontWeight: 700,
        color: 'var(--green2)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        textAlign: 'center',
        lineHeight: 1.45,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        animation: 'toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>,
    document.body
  );
}
