/**
 * useAgentMessages — polls for new proactive agent messages and fires client-side triggers.
 *
 * - Polls Supabase every 30s while the app is visible for new unread agent messages
 * - Fires post_workout and pr_milestone triggers automatically when detected
 * - Deduplicates triggers using a ref so each event fires only once per session
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const AGENT_BASE_URL = '/api/agent';

export function useAgentMessages(userId, state, onProgramSwitch) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const lastSessionCountRef = useRef(state?.totalSessions || 0);
  const lastPRsRef = useRef(null);
  const lastProgramSwitchedAtRef = useRef(state?.programSwitchedAt || null);
  const firedTriggersRef = useRef(new Set());
  const pollTimerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const pollMessagesRef = useRef(null);

  // ── Fire a trigger to the agent endpoint ──────────────────────────────────
  const fireTrigger = useCallback(async (trigger) => {
    if (!userId) {
      console.warn('[Quest Agent] fireTrigger skipped — no userId yet', trigger);
      return;
    }
    const dedupKey = `${trigger}_${new Date().toDateString()}`;
    if (firedTriggersRef.current.has(dedupKey)) {
      console.log('[Quest Agent] trigger already fired today, skipping:', trigger);
      return;
    }
    firedTriggersRef.current.add(dedupKey);
    console.log('[Quest Agent] firing trigger:', trigger, 'for userId:', userId);

    try {
      const res = await fetch(AGENT_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-secret': '',
        },
        body: JSON.stringify({ trigger, userId }),
      });
      const json = await res.json();
      console.log('[Quest Agent] trigger result:', json);
      // Poll for new messages — give Claude 5s to finish writing before we read
      setTimeout(() => pollMessagesRef.current?.(), 5000);
    } catch (e) {
      console.warn('[useAgentMessages] trigger failed:', e);
      firedTriggersRef.current.delete(dedupKey);
    }
  }, [userId]);

  // ── Detect post-workout trigger ────────────────────────────────────────────
  useEffect(() => {
    const prev = lastSessionCountRef.current;
    const current = state?.totalSessions || 0;
    if (current > prev && state?.todaySessionFinished) {
      lastSessionCountRef.current = current;
      fireTrigger('post_workout');
    }
  }, [state?.totalSessions, state?.todaySessionFinished, fireTrigger]);

  // ── Detect PR trigger ──────────────────────────────────────────────────────
  useEffect(() => {
    const currentPRs = JSON.stringify(state?.personalRecords || {});
    if (!isInitializedRef.current) {
      // First run after cloud load — record baseline, never fire spuriously
      lastPRsRef.current = currentPRs;
      isInitializedRef.current = true;
      return;
    }
    if (currentPRs !== lastPRsRef.current) {
      lastPRsRef.current = currentPRs;
      fireTrigger('pr_milestone');
    }
  }, [state?.personalRecords, fireTrigger]);

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
