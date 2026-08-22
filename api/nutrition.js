import {
  requireUser, sanitizeAnthropicBody, callAnthropic,
  checkRateLimit, consumeDailyQuota,
} from './_auth.js';

// Meal photo analysis + manual food lookup. Previously unauthenticated, which
// made it a free proxy onto the Anthropic key for anyone who found the URL.
//
// It was also, until now, the only Anthropic route with no limit of any kind:
// /api/coach caps chat weekly and throttles per minute, but a signed-in user
// could send unbounded Sonnet 5 *vision* requests here — the most expensive
// call the app makes. Both a burst damper and a durable daily ceiling below.
const PER_MINUTE = 15;
const PER_DAY = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { userId, supabase } = auth;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  if (!checkRateLimit('nutrition', userId, { max: PER_MINUTE })) {
    return res.status(429).json({
      error: `Too many requests. Max ${PER_MINUTE} per minute — wait a moment and try again.`,
    });
  }

  const payload = sanitizeAnthropicBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid request: unsupported model or malformed messages.' });
  }

  const quota = await consumeDailyQuota(supabase, userId, {
    countField: 'nutritionCallsToday',
    dateField: 'nutritionCallsDate',
    limit: PER_DAY,
  });
  if (!quota.ok) {
    return res.status(429).json({
      error: `Daily food analysis limit reached (${quota.limit}/${quota.limit}). Resets at midnight.`,
    });
  }

  try {
    const { status, data } = await callAnthropic(payload, apiKey);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
