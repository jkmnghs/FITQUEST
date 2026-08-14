/**
 * POST /api/agent-trigger — browser-initiated Quest Agent triggers.
 *
 * The app needs to fire `onboarding`, `post_workout`, and `pr_milestone` from
 * the client. /api/agent is gated on AGENT_SECRET, which must never reach a
 * browser — so this route authenticates with the user's Supabase access token
 * and derives the userId from it, then runs the same agent logic.
 */

import { requireUser } from './_auth.js';
import { runAgent, VALID_TRIGGERS } from './agent.js';

// Triggers a user is allowed to fire for themselves. `weekly_review` and
// `reengagement` are scheduled server-side only.
const CLIENT_TRIGGERS = new Set(['post_workout', 'pr_milestone', 'onboarding']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req, res);
  if (!auth) return;

  const trigger = req.body?.trigger;
  if (typeof trigger !== 'string' || !VALID_TRIGGERS.includes(trigger)) {
    return res.status(400).json({ error: `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}` });
  }
  if (!CLIENT_TRIGGERS.has(trigger)) {
    return res.status(403).json({ error: `Trigger '${trigger}' cannot be fired by a client.` });
  }

  // userId comes from the verified token — a client cannot run the agent
  // against someone else's account.
  const { status, body } = await runAgent(trigger, auth.userId);
  return res.status(status).json(body);
}
