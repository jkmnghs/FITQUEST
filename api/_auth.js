/**
 * Shared server-side auth for the API routes.
 *
 * Every client-facing endpoint must derive the user id from a *verified*
 * Supabase access token. Trusting a client-supplied header or body field
 * (as `/api/coach` previously did) turns these routes into an open proxy
 * onto the Anthropic API key.
 */

import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verifies the request's bearer token and returns { userId, supabase }.
 * On failure it writes the response and returns null — callers should
 * `if (!auth) return;` immediately.
 */
export async function requireUser(req, res) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Auth backend not configured' });
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return null;
    }
    return { userId: data.user.id, user: data.user, supabase };
  } catch (e) {
    console.error('[auth] Token verification failed:', e.message);
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }
}

// ── Anthropic request shaping ───────────────────────────────────────────────
// The client must not be able to choose an arbitrary model, an unbounded
// max_tokens, or smuggle extra top-level fields through to Anthropic.

// Every model the client is permitted to request. Keep this in sync with the
// model strings actually used in src/ — an unlisted model is rejected outright
// rather than silently downgraded, so a typo surfaces instead of hiding.
export const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
]);

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const MAX_OUTPUT_TOKENS = 4096;

/**
 * Returns a sanitized Anthropic Messages payload, or null when the body is
 * unusable. Only known fields survive; model and max_tokens are constrained.
 */
export function sanitizeAnthropicBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null;

  const model = ALLOWED_MODELS.has(body.model) ? body.model : null;
  if (body.model && !model) return null; // explicit but disallowed model

  const requested = Number(body.max_tokens);
  const maxTokens = Number.isFinite(requested) && requested > 0
    ? Math.min(Math.round(requested), MAX_OUTPUT_TOKENS)
    : 1024;

  const payload = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages: body.messages,
  };
  if (typeof body.system === 'string') payload.system = body.system;
  if (Array.isArray(body.tools)) payload.tools = body.tools;
  if (body.tool_choice && typeof body.tool_choice === 'object') {
    payload.tool_choice = body.tool_choice;
  }
  return payload;
}

export async function callAnthropic(payload, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return { status: response.status, data };
}
