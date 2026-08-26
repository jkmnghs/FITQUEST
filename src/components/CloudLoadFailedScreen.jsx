/**
 * Shown when the cloud read did not complete.
 *
 * This screen exists because of a real data loss. A failed read used to be
 * indistinguishable from an empty account: the app concluded the user was new,
 * showed the onboarding questionnaire, and saved the answers over a populated
 * row. The user opened the app and their training history was gone.
 *
 * So when we do not know what is stored, we say so and stop. The only actions
 * offered are ones that cannot destroy anything: retry, or sign out.
 */
const NAVY = '#0a1628';
const CYAN = '#00e5ff';
const DISPLAY = 'var(--font-display)';
const BODY = 'var(--font-primary)';

export default function CloudLoadFailedScreen({ onRetry, onSignOut }) {
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', inset: 0, overflow: 'auto',
        background: `radial-gradient(ellipse at 50% 35%, #14223a 0%, ${NAVY} 55%, #050a14 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100dvh', padding: '32px 24px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid rgba(255,214,0,0.5)`,
        background: 'rgba(255,214,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="var(--gold, #ffd600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>

      <div style={{
        fontFamily: DISPLAY, fontSize: 11, letterSpacing: 5,
        color: 'rgba(255,255,255,0.55)', marginBottom: 14,
      }}>
        FITQUEST
      </div>

      <h1 style={{
        fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: 2,
        color: '#fff', margin: 0, textAlign: 'center',
      }}>
        COULDN'T REACH YOUR DATA
      </h1>

      <p style={{
        fontFamily: BODY, fontSize: 14, lineHeight: 1.5,
        color: 'rgba(255,255,255,0.68)', textAlign: 'center',
        maxWidth: 320, margin: '12px 0 0',
      }}>
        Your training history is safe on the server — the app just couldn't load
        it right now, usually a weak connection.
      </p>
      <p style={{
        fontFamily: BODY, fontSize: 13, lineHeight: 1.5,
        color: 'rgba(255,255,255,0.5)', textAlign: 'center',
        maxWidth: 320, margin: '10px 0 0',
      }}>
        Nothing will be saved or changed until it loads, so your progress can't
        be overwritten.
      </p>

      <button
        onClick={onRetry}
        className="fq-press"
        style={{
          marginTop: 28, minHeight: 'var(--tap-target)', width: '100%', maxWidth: 280,
          padding: '12px 22px',
          fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, letterSpacing: 1.5,
          color: NAVY, background: CYAN,
          border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer',
        }}
      >
        TRY AGAIN
      </button>

      <button
        onClick={onSignOut}
        className="fq-press"
        style={{
          marginTop: 12, minHeight: 'var(--tap-target)', width: '100%', maxWidth: 280,
          padding: '10px 22px',
          fontFamily: BODY, fontSize: 14, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)', background: 'transparent',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 'var(--radius-full)', cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
