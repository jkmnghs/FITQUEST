/**
 * Supabase keep-alive ping — called by Vercel Cron every 3 days.
 *
 * Supabase free projects pause after 7 days of inactivity.
 * This minimal read keeps the project awake at zero cost.
 *
 * Schedule: see the cron line below.
 */
// vercel.json cron: "0 9 */3 * *" — 9am every 3 days. This has to live in a
// line comment: the "*/" inside "*/3" terminates a block comment early, which
// is what made this whole file unparseable and silently killed the keep-alive.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: true, note: 'Supabase not configured — skipping ping' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('user_profiles').select('id').limit(1);
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    // Don't fail the cron — just log
    console.error('[ping] Supabase ping failed:', e.message);
    res.status(200).json({ ok: false, error: e.message });
  }
}
