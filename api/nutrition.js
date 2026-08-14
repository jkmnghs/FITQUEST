import { requireUser, sanitizeAnthropicBody, callAnthropic } from './_auth.js';

// Meal photo analysis + manual food lookup. Previously unauthenticated, which
// made it a free proxy onto the Anthropic key for anyone who found the URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const auth = await requireUser(req, res);
  if (!auth) return;

  const payload = sanitizeAnthropicBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid request: unsupported model or malformed messages.' });
  }

  try {
    const { status, data } = await callAnthropic(payload, apiKey);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
