import React, { useState } from 'react';

export default function LoginScreen({ authError, onSignIn, onSignUp, onResetPassword }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [signUpDone, setSignUpDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);

    if (mode === 'forgot') {
      if (!email) { setLocalError('Please enter your email address.'); return; }
      setLoading(true);
      const ok = await onResetPassword(email);
      setLoading(false);
      if (ok) setResetDone(true);
      return;
    }

    if (!email || !password) { setLocalError('Please enter your email and password.'); return; }
    if (mode === 'signup' && !name.trim()) { setLocalError('Please enter your name.'); return; }
    if (mode === 'signup' && password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    if (mode === 'signup' && password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    setLoading(true);

    if (mode === 'signin') {
      const ok = await onSignIn(email, password);
      if (!ok) setLoading(false);
    } else {
      const ok = await onSignUp(email, password, name.trim());
      if (ok) {
        setSignUpDone(true);
      } else {
        setLoading(false);
      }
    }
  }

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 20px',
      fontFamily: 'Rajdhani, sans-serif',
    }}>
      {/* Logo / title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 28, fontWeight: 900,
          color: 'var(--cyan)', letterSpacing: 2,
          textShadow: '0 0 20px rgba(0,229,255,0.4)',
          marginBottom: 4,
        }}>FITQUEST</div>
        <div style={{
          fontSize: 12, color: 'var(--text3)', fontFamily: 'Orbitron',
          letterSpacing: 1.5,
        }}>YOUR GAMIFIED FITNESS COACH</div>
      </div>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--card)',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 20, padding: '28px 24px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 24, overflow: 'hidden',
        }}>
          {[['signin', 'SIGN IN'], ['signup', 'CREATE ACCOUNT']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setLocalError(null); setSignUpDone(false); setResetDone(false); setConfirmPassword(''); }}
              style={{
                flex: 1, padding: '10px 4px',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                letterSpacing: 0.5,
                background: mode === m ? 'rgba(0,229,255,0.12)' : 'transparent',
                color: mode === m ? 'var(--cyan)' : 'var(--text3)',
                transition: 'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>

        {resetDone ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
              color: 'var(--cyan)', marginBottom: 8,
            }}>CHECK YOUR EMAIL</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              We sent a password reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Click it to set a new password.
            </div>
            <button
              onClick={() => { setMode('signin'); setResetDone(false); }}
              style={{
                marginTop: 20, padding: '10px 20px', borderRadius: 10,
                border: '1px solid rgba(0,229,255,0.25)',
                background: 'transparent', color: 'var(--cyan)',
                fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                cursor: 'pointer',
              }}
            >BACK TO SIGN IN</button>
          </div>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleSubmit}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
              color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6,
            }}>Enter your email and we'll send you a link to reset your password.</div>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
              }}>EMAIL</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
                  outline: 'none', boxSizing: 'border-box',
                  WebkitTextFillColor: 'var(--text)',
                }}
              />
            </label>
            {displayError && (
              <div style={{
                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--red)', lineHeight: 1.4,
              }}>{displayError}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, border: 'none',
                background: loading ? 'rgba(0,229,255,0.3)' : 'var(--cyan)',
                color: 'var(--bg)',
                fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
                letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,229,255,0.25)',
              }}
            >{loading ? 'SENDING...' : 'SEND RESET LINK'}</button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setLocalError(null); }}
              style={{
                width: '100%', marginTop: 12, padding: '10px',
                border: 'none', background: 'transparent',
                color: 'var(--text3)', fontFamily: 'Orbitron',
                fontSize: 9, fontWeight: 700, letterSpacing: 1,
                cursor: 'pointer',
              }}
            >BACK TO SIGN IN</button>
          </form>
        ) : signUpDone ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
              color: 'var(--cyan)', marginBottom: 8,
            }}>CHECK YOUR EMAIL</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Click it to activate your account — you'll be signed in automatically.
            </div>
            <button
              onClick={() => { setMode('signin'); setSignUpDone(false); }}
              style={{
                marginTop: 20, padding: '10px 20px', borderRadius: 10,
                border: '1px solid rgba(0,229,255,0.25)',
                background: 'transparent', color: 'var(--cyan)',
                fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                cursor: 'pointer',
              }}
            >GO TO SIGN IN</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label style={{ display: 'block', marginBottom: 16 }}>
                <div style={{
                  fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                  color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
                }}>YOUR NAME</div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  autoComplete="name"
                  maxLength={30}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
                    outline: 'none', boxSizing: 'border-box',
                    WebkitTextFillColor: 'var(--text)',
                  }}
                />
              </label>
            )}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
              }}>EMAIL</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
                  outline: 'none', boxSizing: 'border-box',
                  WebkitTextFillColor: 'var(--text)',
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: mode === 'signup' ? 16 : mode === 'signin' ? 8 : 20 }}>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
              }}>PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Minimum 6 characters' : '••••••••'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </label>

            {mode === 'signup' && (
              <label style={{ display: 'block', marginBottom: 20 }}>
                <div style={{
                  fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                  color: 'var(--text3)', letterSpacing: 1.5, marginBottom: 6,
                }}>CONFIRM PASSWORD</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1px solid ${confirmPassword && password !== confirmPassword ? 'rgba(255,50,50,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)', fontSize: 15, fontFamily: 'Rajdhani',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </label>
            )}

            {mode === 'signin' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setLocalError(null); }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: 'var(--cyan)', fontFamily: 'Orbitron',
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    cursor: 'pointer', opacity: 0.8,
                  }}
                >FORGOT PASSWORD?</button>
              </div>
            )}

            {displayError && (
              <div style={{
                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--red)', lineHeight: 1.4,
              }}>{displayError}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, border: 'none',
                background: loading ? 'rgba(0,229,255,0.3)' : 'var(--cyan)',
                color: 'var(--bg)',
                fontFamily: 'Orbitron', fontSize: 12, fontWeight: 700,
                letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,229,255,0.25)',
              }}
            >
              {loading ? 'PLEASE WAIT...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}
      </div>

      <div style={{
        marginTop: 24, fontSize: 12, color: 'var(--text3)',
        textAlign: 'center', lineHeight: 1.6, maxWidth: 300,
      }}>
        Your data is securely stored in the cloud.<br />
        Access your progress from any device.
      </div>
    </div>
  );
}
