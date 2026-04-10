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

    // Recover existing session (Supabase stores it in localStorage automatically)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to all future auth state changes
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

  async function signUp(email, password) {
    if (!supabase) return false;
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
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
