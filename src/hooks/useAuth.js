import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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
      if (event === 'SIGNED_IN' && passwordRecovery) setPasswordRecovery(false);
    });

    // getSession reads from localStorage and also handles any in-progress
    // PKCE code exchange (detectSessionInUrl is true by default).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    return !error;
  }

  async function signUp(email, password, name = '') {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
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
      } else {
        setAuthError(error.message);
      }
    }
    return !error;
  }

  async function resetPassword(email) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
  };
}
