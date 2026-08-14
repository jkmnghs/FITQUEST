import { supabase } from './supabaseClient';

/**
 * fetch() with the current Supabase access token attached.
 *
 * Every /api route that talks to Anthropic or reads a profile verifies this
 * token server-side — the previous `x-user-id` header was client-controlled and
 * therefore not authentication at all.
 *
 * Throws when there is no session, so callers surface "please sign in" rather
 * than a confusing 401 body.
 */
export async function authFetch(url, options = {}) {
  if (!supabase) throw new Error('Cloud sync is not configured.');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Your session has expired — please sign in again.');

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/** Convenience wrapper for the JSON POST shape used by every AI endpoint. */
export function authPostJSON(url, body) {
  return authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
