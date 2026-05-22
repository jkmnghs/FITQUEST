import { createClient } from '@supabase/supabase-js';

// ── Rate limiting: max 2 requests/min per user (in-memory, resets on cold start) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 2;

function checkRateLimit(userId) {
  if (!userId) return true; // no user = no rate limit (will fail auth anyway)
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health-check: GET /api/coach — used by the client to verify the key is set
  if (req.method === 'GET') {
    return res.status(apiKey ? 200 : 500).json({ ok: !!apiKey });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // ── Require userId — unauthenticated requests must not reach the Anthropic API ──
  const userId = req.body?.metadata?.userId || req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  // ── Rate limiting: max 2 requests/min per user ──
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: 'Too many requests. Max 2 per minute.' });
  }

  // ── Server-side quest message quota enforcement ──
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', userId)
        .single();
      const weeklyCount = profile?.state?.questMessagesThisWeek || 0;
      if (weeklyCount >= 5) {
        return res.status(429).json({
          error: 'Weekly quest message limit reached (5/5).',
          resetDay: 'Monday'
        });
      }
      // Increment BEFORE calling Claude (prevents race condition)
      const updatedState = {
        ...profile?.state,
        questMessagesThisWeek: weeklyCount + 1
      };
      await supabase
        .from('user_profiles')
        .update({ state: updatedState })
        .eq('id', userId);
    } catch (e) {
      // If Supabase fails, still allow the request (graceful degradation)
      console.error('[coach] Quota check failed:', e.message);
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
