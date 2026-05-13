import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Encapsulates all Supabase auth state.
 * Returns { session, user, loading, authError, signIn, signUp, signOut }
 *
 * `loading` is true only while the initial session check is in flight.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // getSession() reads from localStorage immediately and also waits for any
    // in-progress PKCE code exchange (detectSessionInUrl is true by default).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // onAuthStateChange handles SIGNED_IN after email confirmation redirect,
    // TOKEN_REFRESHED, SIGNED_OUT, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
    if (error) setAuthError(error.message);
    return !error;
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
    signIn,
    signUp,
    signOut,
  };
}
