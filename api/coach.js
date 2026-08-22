import {
  requireUser, sanitizeAnthropicBody, callAnthropic, checkRateLimit,
} from './_auth.js';

// ── Rate limiting: max 10 requests/min per user (in-memory, resets on cold start) ──
const RATE_LIMIT_MAX = 10;

// Two separate weekly budgets. Program generation used to be charged against
// the chat quota because it posts to this same route — so finishing onboarding
// spent one of the user's five coach messages before they had opened the coach
// once, and a few regenerations locked them out for the week. Generation is
// infrastructure, not conversation, and gets its own (larger) allowance.
//
// `purpose` is client-supplied, but it cannot be used to escape a limit: every
// value maps to some bounded budget, so the worst a lying client can do is
// spend the other quota.
const QUOTAS = {
  chat: { field: 'questMessagesThisWeek', limit: 5, label: 'quest message' },
  program_generation: { field: 'programGenerationsThisWeek', limit: 15, label: 'program generation' },
};
const DEFAULT_PURPOSE = 'chat';

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health-check: GET /api/coach — used by the client to verify the key is set.
  // Deliberately unauthenticated: it reveals only whether a key is configured.
  if (req.method === 'GET') {
    return res.status(apiKey ? 200 : 500).json({ ok: !!apiKey });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Identity comes from the verified access token, never from the client ──
  // Authenticate first: an anonymous caller should learn nothing about how the
  // server is configured.
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId, supabase } = auth;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // ── Rate limiting: max 10 requests/min per verified user ──
  if (!checkRateLimit('coach', userId, { max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Too many requests. Max 10 per minute — wait a moment and try again.' });
  }

  // ── Constrain what the client can ask Anthropic to do ──
  const payload = sanitizeAnthropicBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid request: unsupported model or malformed messages.' });
  }

  // ── Server-side weekly quota enforcement ──
  // Patches only the one counter field so a concurrent client auto-save can't
  // clobber it (and vice versa).
  const quota = QUOTAS[req.body?.purpose] || QUOTAS[DEFAULT_PURPOSE];
  let charged = false;

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();
    const weeklyCount = profile?.state?.[quota.field] || 0;
    if (weeklyCount >= quota.limit) {
      return res.status(429).json({
        error: `Weekly ${quota.label} limit reached (${quota.limit}/${quota.limit}).`,
        resetDay: 'Monday'
      });
    }
    // Charge BEFORE calling Claude so two concurrent requests can't both pass
    // the check on the same count. Refunded below if the call never lands.
    const { error: mergeError } = await supabase.rpc('admin_merge_user_state', {
      p_user_id: userId,
      p_patch: { [quota.field]: weeklyCount + 1 },
    });
    if (mergeError) throw mergeError;
    charged = true;
  } catch (e) {
    // If Supabase fails, still allow the request (graceful degradation)
    console.error('[coach] Quota check failed:', e.message);
  }

  try {
    const { status, data } = await callAnthropic(payload, apiKey);
    // An upstream rejection produced nothing the user can read, so it should
    // not cost them a message. Charging up front is only there to close the
    // concurrency window — once we know the call failed, give it back.
    if (charged && status >= 400) await refund(supabase, userId, quota.field);
    res.status(status).json(data);
  } catch (err) {
    if (charged) await refund(supabase, userId, quota.field);
    res.status(502).json({ error: 'Upstream request failed' });
  }
}

/** Give back one unit of a weekly quota after a failed upstream call. */
async function refund(supabase, userId, field) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();
    const count = profile?.state?.[field] || 0;
    if (count <= 0) return;
    await supabase.rpc('admin_merge_user_state', {
      p_user_id: userId,
      p_patch: { [field]: count - 1 },
    });
  } catch (e) {
    console.error('[coach] Quota refund failed:', e.message);
  }
}
