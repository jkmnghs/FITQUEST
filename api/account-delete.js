/**
 * POST /api/account-delete — permanently deletes the caller's account.
 *
 * Deleting an auth user requires the service-role key, so this cannot be done
 * from the browser. The user is identified purely by their verified access
 * token: there is no userId parameter, so this route can only ever delete the
 * account that called it.
 */

import { requireUser } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId, supabase } = auth;

  try {
    // The profile row usually cascades from auth.users, but delete it first so
    // the user's training data is gone even if the cascade isn't configured.
    await supabase.from('user_profiles').delete().eq('id', userId);

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[account-delete] Failed:', err.message);
    return res.status(500).json({ error: 'Could not delete the account. Please try again.' });
  }
}
