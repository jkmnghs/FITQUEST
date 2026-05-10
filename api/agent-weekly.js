/**
 * Quest Agent Weekly Review — GET /api/agent-weekly
 *
 * Vercel Cron: runs every Monday at 6 AM UTC.
 * Fans out a 'weekly_review' agent trigger to every active user.
 *
 * Also handles re-engagement: any user whose last session was 3+ days ago
 * and hasn't already been nudged today gets a 'reengagement' trigger.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

async function callAgent(trigger, userId, baseUrl, secret) {
  try {
    const res = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': secret || '',
      },
      body: JSON.stringify({ trigger, userId }),
    });
    const json = await res.json();
    return { userId, trigger, ok: res.ok, result: json };
  } catch (e) {
    return { userId, trigger, ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  // Vercel cron authenticates via CRON_SECRET header automatically.
  // For manual/n8n calls, also accept x-agent-secret.
  const secret = process.env.AGENT_SECRET;
  const provided = req.headers['x-agent-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (secret && provided !== secret && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  // Base URL for calling /api/agent (must be absolute in server-side calls)
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.SITE_URL || 'http://localhost:3000';

  const now = new Date();
  const isMonday = now.getDay() === 1;
  const todayStr = now.toISOString().slice(0, 10);

  try {
    // Fetch all users who have completed onboarding and have at least 1 session
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, state');

    if (error) throw error;
    if (!profiles?.length) return res.status(200).json({ ok: true, processed: 0 });

    const activeUsers = profiles.filter(p => {
      const s = p.state || {};
      return s.assessment?.completed && (s.totalSessions || 0) > 0;
    });

    const results = [];

    for (const profile of activeUsers) {
      const state = profile.state || {};
      const lastDate = state.lastDate; // last session date string (toDateString())

      // --- Re-engagement check ---
      if (lastDate) {
        const last = new Date(lastDate);
        const daysSince = Math.floor((now - last) / 864e5);
        const alreadyNudgedToday = (state.agentMessages || [])
          .some(m => m.trigger === 'reengagement' && m.createdAt?.startsWith(todayStr));

        if (daysSince >= 3 && !alreadyNudgedToday) {
          const r = await callAgent('reengagement', profile.id, baseUrl, secret);
          results.push(r);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // --- Weekly review (Mondays only) ---
      if (isMonday) {
        const alreadyReviewedToday = (state.agentMessages || [])
          .some(m => m.trigger === 'weekly_review' && m.createdAt?.startsWith(todayStr));

        if (!alreadyReviewedToday) {
          const r = await callAgent('weekly_review', profile.id, baseUrl, secret);
          results.push(r);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    return res.status(200).json({
      ok: true,
      processed: activeUsers.length,
      triggered: results.length,
      isMonday,
      results,
    });

  } catch (err) {
    console.error('[agent-weekly] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
