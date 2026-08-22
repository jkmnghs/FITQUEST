/**
 * useAgentMessages — polls for new proactive agent messages and fires client-side triggers.
 *
 * - Polls Supabase every 30s while the app is visible for new unread agent messages
 * - Fires post_workout and pr_milestone triggers automatically when detected
 * - Deduplicates triggers using a ref so each event fires only once per session
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authPostJSON } from '../lib/authFetch';
import {
  improvedLifts, triggerKey, loadFiredKeys, saveFiredKey, forgetFiredKey,
} from '../utils/agentTriggers';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
// Client triggers go through the JWT-authenticated route. /api/agent itself is
// gated on AGENT_SECRET for the cron, and that secret must never reach a browser.
const AGENT_TRIGGER_URL = '/api/agent-trigger';

export function useAgentMessages(userId, state, onProgramSwitch, cloudLoading = false) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const lastSessionCountRef = useRef(state?.totalSessions || 0);
  const sessionBaselineSyncedRef = useRef(false);
  const lastPRsRef = useRef(null);
  const lastProgramSwitchedAtRef = useRef(state?.programSwitchedAt || null);
  const pollTimerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const pollMessagesRef = useRef(null);

  // ── Fire a trigger to the agent endpoint ──────────────────────────────────
  const fireTrigger = useCallback(async (trigger, dedupDetail = '') => {
    if (!userId) {
      console.warn('[Quest Agent] fireTrigger skipped — no userId yet', trigger);
      return;
    }
    const dedupKey = triggerKey(trigger, dedupDetail);
    // Content-addressed and persisted, so closing the app doesn't make a
    // month-old PR look new again on next launch.
    if (loadFiredKeys(userId).has(dedupKey)) {
      console.log('[Quest Agent] already fired for this event, skipping:', dedupKey);
      return;
    }
    saveFiredKey(userId, dedupKey);
    console.log('[Quest Agent] firing trigger:', dedupKey, 'for userId:', userId);

    try {
      // userId is derived server-side from the access token — sending it here
      // would be advisory at best, and the server ignores it.
      const res = await authPostJSON(AGENT_TRIGGER_URL, { trigger });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Agent trigger failed (${res.status})`);
      console.log('[Quest Agent] trigger result:', json);
      // Poll for new messages — give Claude 5s to finish writing before we read
      setTimeout(() => pollMessagesRef.current?.(), 5000);
    } catch (e) {
      console.warn('[useAgentMessages] trigger failed:', e);
      forgetFiredKey(userId, dedupKey);
    }
  }, [userId]);

  // ── Detect post-workout trigger ────────────────────────────────────────────
  useEffect(() => {
    if (cloudLoading) return; // same baseline race as the PR effect below
    // Re-baseline once against the merged cloud state: the ref was seeded from
    // localStorage at mount, which can be behind and would read as a new session.
    if (!sessionBaselineSyncedRef.current) {
      sessionBaselineSyncedRef.current = true;
      lastSessionCountRef.current = state?.totalSessions || 0;
      return;
    }
    const prev = lastSessionCountRef.current;
    const current = state?.totalSessions || 0;
    if (current > prev && state?.todaySessionFinished) {
      lastSessionCountRef.current = current;
      // Keyed to the session number, so relaunching the app after a workout
      // cannot re-congratulate the same session.
      fireTrigger('post_workout', String(current));
    }
  }, [state?.totalSessions, state?.todaySessionFinished, fireTrigger, cloudLoading]);

  // ── Detect PR trigger ──────────────────────────────────────────────────────
  useEffect(() => {
    // Wait for the cloud merge before taking a baseline. This hook is called
    // from the App body, so its effects run on the very first render — while
    // `state` is still the localStorage copy and `cloudLoading` is true. The
    // old code took its baseline there, then saw the merged cloud records
    // arrive and read the difference as a brand-new PR. That is why a message
    // appeared on essentially every app open.
    if (cloudLoading) return;

    const currentPRs = state?.personalRecords || {};
    if (!isInitializedRef.current) {
      lastPRsRef.current = currentPRs;
      isInitializedRef.current = true;
      return;
    }

    // Compare the lifts themselves rather than a JSON string: stringify is
    // key-order dependent, so a re-serialized identical map looked changed.
    // Only a heavier or brand-new lift counts — a record that was corrected
    // downward or removed is not something to celebrate.
    const improved = improvedLifts(lastPRsRef.current, currentPRs);
    lastPRsRef.current = currentPRs;
    if (improved.length > 0) {
      // Keyed by which lifts improved and to what, so the same PR can never
      // fire twice while a genuinely new one still gets through.
      const detail = improved
        .map(id => `${id}@${currentPRs[id]?.weight ?? currentPRs[id]}`)
        .join(',');
      fireTrigger('pr_milestone', detail);
    }
  }, [state?.personalRecords, fireTrigger, cloudLoading]);

  // ── Fire onboarding trigger ────────────────────────────────────────────────
  // Called externally via the returned `fireOnboarding` function after assessment completes
  const fireOnboarding = useCallback(() => {
    fireTrigger('onboarding');
  }, [fireTrigger]);

  // ── Poll for unread messages from Supabase ────────────────────────────────
  const pollMessages = useCallback(async () => {
    if (!supabase || !userId) return;
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', userId)
        .single();
      if (!data?.state) return;
      const cloudState = data.state;
      const msgs = cloudState.agentMessages || [];
      const unread = msgs.filter(m => !m.read).length;
      setUnreadCount(unread);
      setMessages(msgs);

      // If the agent switched the program, sync it into local game state
      const cloudSwitchedAt = cloudState.programSwitchedAt || null;
      if (
        cloudSwitchedAt &&
        cloudSwitchedAt !== lastProgramSwitchedAtRef.current &&
        onProgramSwitch
      ) {
        lastProgramSwitchedAtRef.current = cloudSwitchedAt;
        onProgramSwitch({
          programId: cloudState.programId,
          activeExercises: cloudState.activeExercises,
          sessionsPerWeek: cloudState.sessionsPerWeek,
          liftWeights: cloudState.liftWeights,
          liftHistory: cloudState.liftHistory,
          programSwitchedAt: cloudSwitchedAt,
        });
      }
    } catch (e) {
      // Silent fail — polling should not crash the app
    }
  }, [userId]);

  // Keep the ref in sync on every render — assigning refs in render body is fine
  // and avoids adding a new hook that would shift the hooks order.
  pollMessagesRef.current = pollMessages;

  useEffect(() => {
    if (!userId) return;

    // Poll immediately on mount
    pollMessages();

    // Then poll on interval when visible
    function startPolling() {
      pollTimerRef.current = setInterval(pollMessages, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      clearInterval(pollTimerRef.current);
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        pollMessages();
        startPolling();
      } else {
        stopPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, pollMessages]);

  // ── Mark all messages as read ──────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!supabase || !userId) return;
    setUnreadCount(0);
    setMessages(prev => prev.map(m => ({ ...m, read: true })));

    // Persist to cloud
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('state')
        .eq('id', userId)
        .single();
      if (!data?.state) return;
      const updated = (data.state.agentMessages || []).map(m => ({ ...m, read: true }));
      await supabase
        .from('user_profiles')
        .update({ state: { ...data.state, agentMessages: updated } })
        .eq('id', userId);
    } catch (e) { /* silent */ }
  }, [userId]);

  return { unreadCount, messages, markAllRead, fireOnboarding, pollMessages };
}
