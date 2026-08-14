import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Supabase treats addresses case-insensitively; a stray space fails silently. */
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * Encapsulates all Supabase auth state.
 * Returns { session, user, loading, authError, signIn, signUp, signOut }
 *
 * `loading` is true only while the initial session check is in flight.
 */
export function useAuth() {
  const [session,             setSession]             = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [authError,           setAuthError]           = useState(null);
  const [passwordRecovery,    setPasswordRecovery]    = useState(false);

  // The auth listener is registered once, so reading `passwordRecovery` from its
  // closure always saw the first render's value (false) and the SIGNED_IN reset
  // below could never fire. A ref gives the callback the live value.
  const passwordRecoveryRef = useRef(false);
  passwordRecoveryRef.current = passwordRecovery;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Listen first so we never miss a SIGNED_IN event that fires during
    // the email-confirmation redirect (the code exchange can complete
    // before or after getSession resolves).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_IN' && passwordRecoveryRef.current) setPasswordRecovery(false);
    });

    // getSession reads from localStorage and also handles any in-progress
    // PKCE code exchange (detectSessionInUrl is true by default).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  async function signIn(email, password) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) setAuthError(error.message);
    return !error;
  }

  async function signUp(email, password, name = '') {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        ...(name ? { data: { full_name: name } } : {}),
      },
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
        setAuthError('An account with this email already exists. Try signing in or use "Forgot Password?" to recover access.');
      } else if (msg.includes('rate limit') || msg.includes('email rate')) {
        setAuthError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setAuthError(error.message);
      }
    }
    return !error;
  }

  async function resetPassword(email) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: window.location.origin,
    });
    if (error) setAuthError(error.message);
    return !error;
  }

  async function updatePassword(newPassword) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setAuthError(error.message); return false; }
    setPasswordRecovery(false);
    return true;
  }

  /** Re-sends the sign-up confirmation email. */
  async function resendConfirmation(email) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
    return !error;
  }

  /**
   * Changes the password of the signed-in user, verifying the current one first.
   * Supabase's updateUser does not require the old password, so without this
   * check an unattended session could be used to lock the owner out.
   */
  async function changePassword(currentPassword, newPassword) {
    if (!supabase) return false;
    setAuthError(null);
    const email = session?.user?.email;
    if (!email) { setAuthError('You must be signed in to change your password.'); return false; }

    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) { setAuthError('Current password is incorrect.'); return false; }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setAuthError(error.message); return false; }
    return true;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    authError,
    passwordRecovery,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    changePassword,
    resendConfirmation,
    clearAuthError,
  };
}
