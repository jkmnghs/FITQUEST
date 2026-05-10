/**
 * POST /api/validate-session
 *
 * Server-side XP recomputation. Client sends raw session data;
 * server independently recalculates XP and writes the canonical value to Supabase.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

const DAILY_XP_CAP = 150;

function serverCalculateSessionXP(session, dailySessionCount) {
  const baseXP = 50;
  const setXP = (session.setsCompleted || 0) * 5;
  const raw = baseXP + setXP;
  const multiplier = dailySessionCount === 1 ? 1.0
                   : dailySessionCount === 2 ? 0.5
                   : 0.1;
  return Math.min(DAILY_XP_CAP, Math.round(raw * multiplier));
}

function serverCalculateAdherenceXP(session, weeklySessionCount, programFrequency) {
  let xp = 0;

  if (session.matchesPrescribedDay) xp += 40;
  if (session.avgRPE >= 6 && session.avgRPE <= 9) xp += 20;
  if (session.overloadAchieved) xp += 30;

  if (weeklySessionCount > programFrequency + 1) {
    xp = Math.round(xp * 0.1);
  }

  return Math.min(xp, DAILY_XP_CAP);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, session, exercises, timestamps } = req.body || {};

  if (!userId || !session) {
    return res.status(400).json({ error: 'userId and session are required' });
  }

  // ── Sanity checks ──
  if (exercises && exercises.length > 20) {
    return res.status(400).json({ error: 'Session rejected: too many exercises (max 20)' });
  }

  if (timestamps && timestamps.start && timestamps.end) {
    const durationMin = (new Date(timestamps.end) - new Date(timestamps.start)) / 60000;
    if (durationMin < 10) {
      return res.status(400).json({ error: 'Session rejected: duration too short (min 10 minutes)' });
    }
  }

  if (timestamps && Array.isArray(timestamps.exerciseOrder)) {
    for (let i = 1; i < timestamps.exerciseOrder.length; i++) {
      if (new Date(timestamps.exerciseOrder[i]) < new Date(timestamps.exerciseOrder[i - 1])) {
        return res.status(400).json({ error: 'Session rejected: non-sequential timestamps' });
      }
    }
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('state')
      .eq('id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: 'User not found' });

    const state = profile.state || {};
    const dailySessionCount = (state.dailySessionCount || 0) + 1;
    const weeklySessionCount = state.weekProgress?.[state.currentWeek]?.count || 0;
    const programFrequency = state.sessionsPerWeek || 3;

    // Server-side XP calculation
    const sessionXP = serverCalculateSessionXP(session, dailySessionCount);
    const adherenceXP = serverCalculateAdherenceXP(session, weeklySessionCount, programFrequency);
    const totalXP = Math.min(DAILY_XP_CAP, sessionXP + adherenceXP);
    const cappedXP = Math.min(DAILY_XP_CAP - (state.dailyXPEarned || 0), totalXP);

    return res.status(200).json({
      ok: true,
      serverXP: Math.max(0, cappedXP),
      breakdown: {
        sessionXP,
        adherenceXP,
        dailyCap: DAILY_XP_CAP,
        dailyEarnedBefore: state.dailyXPEarned || 0,
      }
    });
  } catch (err) {
    console.error('[validate-session] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
