import { requireUser, sanitizeAnthropicBody, callAnthropic } from './_auth.js';

// ── Rate limiting: max 10 requests/min per user (in-memory, resets on cold start) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const WEEKLY_QUEST_LIMIT = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health-check: GET /api/coach — used by the client to verify the key is set.
  // Deliberately unauthenticated: it reveals only whether a key is configured.
  if (req.method === 'GET') {
    return res.status(apiKey ? 200 : 500).json({ ok: !!apiKey });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // ── Identity comes from the verified access token, never from the client ──
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId, supabase } = auth;

  // ── Rate limiting: max 10 requests/min per verified user ──
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: 'Too many requests. Max 10 per minute — wait a moment and try again.' });
  }

  // ── Constrain what the client can ask Anthropic to do ──
  const payload = sanitizeAnthropicBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid request: unsupported model or malformed messages.' });
  }

  // ── Server-side quest message quota enforcement ──
  // Patches only questMessagesThisWeek so a concurrent client auto-save can't
  // clobber the counter (and vice versa).
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();
    const weeklyCount = profile?.state?.questMessagesThisWeek || 0;
    if (weeklyCount >= WEEKLY_QUEST_LIMIT) {
      return res.status(429).json({
        error: `Weekly quest message limit reached (${WEEKLY_QUEST_LIMIT}/${WEEKLY_QUEST_LIMIT}).`,
        resetDay: 'Monday'
      });
    }
    // Increment BEFORE calling Claude (prevents race condition)
    const { error: mergeError } = await supabase.rpc('admin_merge_user_state', {
      p_user_id: userId,
      p_patch: { questMessagesThisWeek: weeklyCount + 1 },
    });
    if (mergeError) throw mergeError;
  } catch (e) {
    // If Supabase fails, still allow the request (graceful degradation)
    console.error('[coach] Quota check failed:', e.message);
  }

  try {
    const { status, data } = await callAnthropic(payload, apiKey);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
