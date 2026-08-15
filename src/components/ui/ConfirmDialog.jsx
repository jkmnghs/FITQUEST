import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { haptic } from '../../utils/haptics';

/**
 * In-app replacement for `window.confirm`.
 *
 * The native dialog was a poor fit here for three reasons: it renders in the
 * OS chrome rather than the app (jarring inside an installed PWA), it is
 * synchronous and blocks the main thread, and on iOS standalone mode it can be
 * suppressed entirely — which silently turned "delete exercise" into a no-op.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Escape always cancels — a dialog you cannot dismiss with the keyboard is a
  // trap for anyone not using touch.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel?.(); }
    };
    document.addEventListener('keydown', onKey);
    // Defer so the button exists and the slide-in has started.
    const t = setTimeout(() => confirmRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      // Hand focus back to whatever opened the dialog.
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const accent = destructive ? 'var(--color-destructive)' : 'var(--color-action)';

  return createPortal(
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onCancel?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(var(--space-5) + var(--safe-area-top)) var(--space-5) calc(var(--space-5) + var(--safe-area-bottom))',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fq-confirm-title"
        aria-describedby={message ? 'fq-confirm-message' : undefined}
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--color-bg-secondary)',
          border: `1px solid ${destructive ? 'rgba(255,23,68,0.25)' : 'var(--color-border-medium)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6) var(--space-5)',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          animation: 'popIn 0.18s cubic-bezier(0.2,0.9,0.3,1) both',
        }}
      >
        {destructive && (
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-full)',
            background: 'rgba(255,23,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-3)',
          }}>
            <AlertTriangle size={21} color="var(--color-destructive)" />
          </div>
        )}

        <h3 id="fq-confirm-title" style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '0.02em',
          marginBottom: message ? 'var(--space-2)' : 'var(--space-5)',
        }}>{title}</h3>

        {message && (
          <p id="fq-confirm-message" style={{
            fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
            lineHeight: 1.6, marginBottom: 'var(--space-5)', whiteSpace: 'pre-wrap',
          }}>{message}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, minHeight: 'var(--tap-target)', padding: '12px 8px',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-medium)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >{cancelLabel}</button>
          <button
            ref={confirmRef}
            onClick={() => { haptic(destructive ? 'error' : 'success'); onConfirm?.(); }}
            style={{
              flex: 1, minHeight: 'var(--tap-target)', padding: '12px 8px',
              borderRadius: 'var(--radius-lg)', border: 'none',
              background: destructive
                ? 'linear-gradient(135deg, #d50000, var(--color-destructive))'
                : 'linear-gradient(135deg, var(--color-action-hover), var(--color-action))',
              color: destructive ? '#fff' : 'var(--color-bg-primary)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.04em',
              boxShadow: `0 4px 18px ${destructive ? 'rgba(255,23,68,0.25)' : 'rgba(0,229,255,0.2)'}`,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Promise-based confirm, so an existing `if (window.confirm(...))` branch
 * becomes `if (await confirm({...}))` without restructuring the handler.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (await confirm({ title: 'Delete?', destructive: true })) doIt();
 *   ...
 *   return <>{confirmDialog}</>;
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    // A second call while one is pending would strand the first promise, so
    // resolve it as cancelled before taking over.
    resolverRef.current?.(false);
    return new Promise(resolve => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const settle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  // Never leave a caller awaiting forever if the component unmounts mid-dialog.
  useEffect(() => () => resolverRef.current?.(false), []);

  const confirmDialog = (
    <ConfirmDialog
      open={!!request}
      {...(request || {})}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}

export default ConfirmDialog;
