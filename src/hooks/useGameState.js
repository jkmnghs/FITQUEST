import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_STATE, ACHIEVEMENTS } from '../data/gameData';
import { storageGet, storageSet, storageClear } from '../utils/storage';
import { today, applyXP, updateStreak, checkAchievements } from '../utils/gameLogic';
import { maybeFireOpenNotification } from '../utils/notifications';

// Module-level guard — lives completely outside React, reset only on page reload.
// Initialized from localStorage so page reloads are also covered.
const _initSaved = storageGet();
const _backfillGuard = Object.fromEntries(
  Object.entries(_initSaved?.weekProgress ?? {}).map(([w, d]) => [w, d.count ?? 0])
);

function mergeState(saved) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...saved };
}

function checkDayReset(state) {
  const t = today();
  let next = { ...state };
  if (next.todayExDate !== t) {
    next.todayExDone = [];
    next.todayExDetails = {};
    next.todaySessionFinished = false;
    next.sessionStartTime = null;
    next.todayExDate = t;
  }
  // Decay streak if more than one day has passed since last session
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  if (next.lastDate && next.lastDate !== t && next.lastDate !== yesterday && next.streak > 0) {
    next.streak = 0;
  }
  return next;
}

export function useGameState() {
  const [state, setStateRaw] = useState(() => {
    const saved = storageGet();
    const merged = saved ? mergeState(saved) : { ...DEFAULT_STATE };
    return checkDayReset(merged);
  });

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Ref-based synchronous lock for backfill — tracks the highest session count
  // already applied per week. Updated synchronously before setState so rapid
  // re-clicks are blocked even before React commits the state update.
  const backfillApplied = useRef((() => {
    const saved = storageGet();
    const wp = saved?.weekProgress ?? {};
    return Object.fromEntries(Object.entries(wp).map(([w, d]) => [w, d.count ?? 0]));
  })());

  // Auto-save on state change
  useEffect(() => {
    storageSet(state);
  }, [state]);

  // Re-run day reset whenever the app becomes visible or the minute ticks over midnight
  useEffect(() => {
    function maybeDayReset() {
      setStateRaw(prev => {
        const next = checkDayReset(prev);
        // Only trigger a re-render if something actually changed
        return next.todayExDate !== prev.todayExDate ? next : prev;
      });
    }

    // Check on tab focus (user comes back to app)
    const onVisible = () => { if (document.visibilityState === 'visible') maybeDayReset(); };
    document.addEventListener('visibilitychange', onVisible);

    // Also check every minute (catches midnight without needing a reload)
    const interval = setInterval(maybeDayReset, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  // Fire open notification
  useEffect(() => {
    maybeFireOpenNotification(state);
  }, []); // eslint-disable-line

  // Save on page hide / unload
  useEffect(() => {
    const save = () => storageSet(state);
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
    };
  }, [state]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  const addXP = useCallback((amount, message) => {
    setState(prev => {
      const { xp, totalXp, level, leveledUp } = applyXP(prev, amount);
      const newlyUnlocked = checkAchievements({ ...prev, xp, totalXp, level });
      const nextAchDone = [...prev.achDone, ...newlyUnlocked];
      showToast(leveledUp ? `+${amount} XP — LEVEL UP! 🎉` : (message || `+${amount} XP`));
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((id, idx) => {
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          setTimeout(() => showToast(`🏆 ${ach?.name || 'Achievement'} unlocked!`), 1500 + idx * 2000);
        });
      }
      return { ...prev, xp, totalXp, level, achDone: nextAchDone };
    });
  }, [setState, showToast]);

  const resetAll = useCallback(() => {
    storageClear();
    backfillApplied.current = {};
    Object.keys(_backfillGuard).forEach(k => delete _backfillGuard[k]);
    setStateRaw({ ...DEFAULT_STATE });
    showToast('Progress reset!');
  }, [showToast]);

  const completeExercise = useCallback((exId, sets) => {
    let pendingXP = 0;
    let pendingPR = false;
    setState(prev => {
      const isDeload = prev.currentWeek === 9;
      let vol = 0, maxRPE = 0, setsCompleted = 0;
      let maxWeightUsed = 0;

      sets.forEach(s => {
        if (s.done) {
          setsCompleted++;
          if (!isDeload) {
            const wt = s.weightKg || 0;
            const rp = s.reps || 0;
            vol += wt * rp;
            if (wt > maxWeightUsed) maxWeightUsed = wt;
            if ((s.rpe || 0) > maxRPE) maxRPE = s.rpe || 0;
          }
        }
      });

      const baseSets = sets.filter(s => !s.isExtra).length;
      const extraSets = sets.filter(s => s.isExtra).length;
      const missedPrescribed = Math.max(0, baseSets - setsCompleted);
      const xp = Math.max(5, 10 + setsCompleted * 5 - missedPrescribed * 3);
      pendingXP = xp;

      // Progressive overload
      let overloadSuggestions = { ...prev.overloadSuggestions };
      let weeklyRPE = { ...prev.weeklyRPE };
      if (!isDeload && maxRPE > 0) {
        if (!weeklyRPE[exId]) weeklyRPE[exId] = {};
        weeklyRPE[exId][prev.currentWeek] = maxRPE;
        if (maxRPE <= 8) overloadSuggestions[exId] = 'increase';
        else if (maxRPE === 9) overloadSuggestions[exId] = 'repeat';
        else overloadSuggestions[exId] = 'deload';
      }

      // PRs
      let personalRecords = { ...prev.personalRecords };
      let newPR = false;
      if (!isDeload && maxWeightUsed > 0) {
        const cur = personalRecords[exId];
        if (!cur || maxWeightUsed > cur.weight) {
          personalRecords[exId] = {
            weight: maxWeightUsed,
            week: prev.currentWeek,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
          newPR = !!cur;
        }
      }
      pendingPR = newPR;

      // Persist the weight used so next session loads it automatically
      const liftWeights = { ...prev.liftWeights };
      if (!isDeload && maxWeightUsed > 0) {
        liftWeights[exId] = maxWeightUsed;
      }

      const todayExDone = [...new Set([...(prev.todayExDone || []), exId])];
      const todayExDetails = {
        ...prev.todayExDetails,
        [exId]: { setsCompleted, setsPrescribed: baseSets, extraSets, volume: vol, maxRPE, maxWeight: maxWeightUsed }
      };

      const sessionStartTime = prev.sessionStartTime || Date.now();

      const logEntry = {
        name: `${exId} (${setsCompleted}/${baseSets} sets)`,
        xp, date: today(), type: 'exercise', week: prev.currentWeek,
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      return {
        ...prev,
        totalVolume: prev.totalVolume + vol,
        todayExDone,
        todayExDetails,
        todaySessionFinished: false,
        sessionStartTime,
        overloadSuggestions,
        weeklyRPE,
        personalRecords,
        liftWeights,
        log: [...prev.log, logEntry]
      };
    });
    // Schedule outside setState to avoid React StrictMode double-invocation
    setTimeout(() => {
      addXP(pendingXP);
      if (pendingPR) setTimeout(() => showToast(`🏅 NEW PR: ${exId}!`), 1200);
    }, 50);
  }, [setState, addXP, showToast]);

  const finishSession = useCallback(() => {
    let pendingXP = 0;
    let pendingAdvance = null;
    setState(prev => {
      if (prev.todaySessionFinished) return prev;
      const w = prev.currentWeek;
      const isDeload = w === 9;
      const doneCount = (prev.todayExDone || []).length;
      const totalEx = 7; // EXERCISES.length
      const completionPct = Math.round((doneCount / totalEx) * 100);
      const missedCount = totalEx - doneCount;
      const bonusXP = Math.max(10, 50 - missedCount * 8);
      pendingXP = bonusXP;

      const updatedWithStreak = updateStreak(prev);

      // Update week progress
      const weekProgress = { ...prev.weekProgress };
      if (!weekProgress[w]) weekProgress[w] = { count: 0, dates: [], completed: false, sessions: [] };
      const wp = { ...weekProgress[w] };
      wp.count = (wp.count || 0) + 1;
      wp.dates = [...(wp.dates || []), today()];
      wp.sessions = [...(wp.sessions || []), {
        date: today(), exercisesDone: [...(prev.todayExDone || [])], completion: completionPct
      }];

      let nextWeek = w;
      if (wp.count >= 3 && !wp.completed) {
        wp.completed = true;
        if (isDeload) {
          setTimeout(() => showToast('🧘 Deload complete! Great recovery week.'), 500);
        }
        if (w < 12) {
          nextWeek = w + 1;
          setTimeout(() => showToast(`Week ${w} COMPLETE! → Week ${w + 1} 🎉`), 1000);
        } else {
          setTimeout(() => showToast('🏆 12-WEEK PROGRAM COMPLETE!'), 1000);
        }
        pendingAdvance = nextWeek;
      }
      weekProgress[w] = wp;

      const logEntry = {
        name: `Session ${wp.count}/3 • ${doneCount}/${totalEx} exercises (${completionPct}%)`,
        xp: bonusXP, date: today(), type: 'session', week: w,
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      return {
        ...updatedWithStreak,
        todaySessionFinished: true,
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + 50,
        perfectWeeks: (wp.count >= 3 && !prev.weekProgress[w]?.completed) ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        deloadDone: isDeload && wp.count >= 3 ? true : prev.deloadDone,
        weekProgress,
        currentWeek: nextWeek,
        sessionStartTime: null,
        log: [...prev.log, logEntry]
      };
    });
    // Schedule outside setState to avoid React StrictMode double-invocation
    setTimeout(() => addXP(pendingXP), 100);
    if (pendingAdvance !== null) {
      setTimeout(() => {
        setState(s => {
          // Only clear daily fields if user hasn't manually navigated to a different week
          if (s.currentWeek !== pendingAdvance) return s;
          return {
            ...s,
            todayExDone: [],
            todayExDetails: {},
            todaySessionFinished: false,
            sessionStartTime: null,
            todayExDate: today()
          };
        });
      }, 2500);
    }
  }, [setState, addXP, showToast]);

  const submitCheckin = useCallback((weight, waist) => {
    let pendingXP = 25;
    setState(prev => {
      const entry = { week: prev.currentWeek, weight, waist: waist || 0, date: today() };
      const logEntry = {
        name: `Week ${prev.currentWeek} Check-in: ${weight} ${prev.unit}`,
        xp: 25, date: today(), type: 'checkin',
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      };
      return {
        ...prev,
        checkins: prev.checkins + 1,
        weeklyCheckins: [...prev.weeklyCheckins, entry],
        log: [...prev.log, logEntry]
      };
    });
    setTimeout(() => addXP(pendingXP), 50);
  }, [setState, addXP]);

  const updateSetting = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, [setState]);

  const resetToday = useCallback(() => {
    setState(prev => ({
      ...prev,
      todayExDone: [],
      todayExDetails: {},
      todaySessionFinished: false,
      sessionStartTime: null,
    }));
    showToast("Today's session cleared!");
  }, [setState, showToast]);

  const startSession = useCallback(() => {
    setState(prev => {
      if (prev.sessionStartTime || prev.todaySessionFinished) return prev;
      return { ...prev, sessionStartTime: Date.now() };
    });
  }, [setState]);

  const addAIHistory = useCallback((messages) => {
    setState(prev => ({
      ...prev,
      aiCoachHistory: messages
    }));
  }, [setState]);

  // Retroactively mark sessions for a past week (for backfilling lost data)
  // completionPct: 0-100, customWeights: { [exId]: kg }, customSets: { [exId]: n }, durationMins: per session
  const backfillWeek = useCallback((week, sessionCount, completionPct = 100, customWeights = {}, customSets = {}, durationMins = 50) => {
    // --- Module-level guard (outermost, synchronous, outside React entirely) ---
    const key = String(week);
    const guardCount = _backfillGuard[key] ?? 0;
    if (sessionCount <= guardCount) {
      showToast(`Week ${week}: already recorded ${guardCount}/3 sessions`);
      return;
    }
    _backfillGuard[key] = sessionCount; // lock immediately

    setStateRaw(prev => {
      // --- State-level guard (atomic, persisted in localStorage via state) ---
      const lockedCount = prev.backfillLock?.[week] ?? 0;
      if (sessionCount <= lockedCount) return prev;

      const prevSessionCount = prev.weekProgress?.[week]?.count ?? 0;
      const prevCompleted = prev.weekProgress?.[week]?.completed ?? false;
      const newSessions = Math.max(0, sessionCount - prevSessionCount);
      if (newSessions === 0) return prev;

      const completed = sessionCount >= 3;
      const fakeDates = ['Mon', 'Wed', 'Fri'].slice(0, sessionCount);

      // Populate exercisesDone with exercises that had sets > 0 in the form
      const doneExIds = Object.entries(customSets)
        .filter(([, sets]) => sets > 0)
        .map(([exId]) => exId);

      const sessions = fakeDates.map(d => ({
        date: `Week ${week} ${d} (backfilled)`,
        exercisesDone: doneExIds,
        completion: completionPct
      }));

      const weekProgress = {
        ...prev.weekProgress,
        [week]: { count: sessionCount, dates: fakeDates, completed, sessions }
      };

      const liftWeights = { ...prev.liftWeights, ...customWeights };

      let addedVolume = 0;
      Object.entries(customSets).forEach(([exId, sets]) => {
        if (!sets || sets <= 0) return;
        const reps = { squat: 10, bench: 10, rdl: 8, pulldown: 10, ohp: 12, legcurl: 15 }[exId] || 10;
        const wt = customWeights[exId] ?? prev.liftWeights?.[exId] ?? 0;
        addedVolume += sets * reps * wt * newSessions;
      });

      const sessionXp = Math.round(60 * (completionPct / 100));
      const xpGain = newSessions * sessionXp;
      const { xp, totalXp, level } = applyXP(prev, xpGain);

      // Build log entries for each newly backfilled session so Summary/Log tabs reflect them
      const totalExCount = Object.keys(customSets).length || 7;
      const dayLabels = ['Mon', 'Wed', 'Fri'];
      const newLogEntries = [];
      for (let i = prevSessionCount; i < sessionCount; i++) {
        newLogEntries.push({
          name: `Session ${i + 1}/3 • ${doneExIds.length}/${totalExCount} exercises (${completionPct}%) [backfill]`,
          xp: sessionXp, date: `Week ${week} (backfill)`, type: 'session', week,
          dateStr: `Week ${week} ${dayLabels[i] || `S${i + 1}`} (backfill)`
        });
      }

      const updatedState = {
        ...prev,
        xp, totalXp, level,
        weekProgress,
        liftWeights,
        backfillLock: { ...prev.backfillLock, [week]: sessionCount },
        totalSessions: prev.totalSessions + newSessions,
        totalMinutes: prev.totalMinutes + newSessions * durationMins,
        totalVolume: prev.totalVolume + addedVolume,
        perfectWeeks: completed && !prevCompleted ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        log: [...prev.log, ...newLogEntries],
      };

      const newlyUnlocked = checkAchievements(updatedState);
      if (newlyUnlocked.length > 0) {
        updatedState.achDone = [...(prev.achDone || []), ...newlyUnlocked];
        newlyUnlocked.forEach((id, idx) => {
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          setTimeout(() => showToast(`🏆 ${ach?.name || 'Achievement'} unlocked!`), 1500 + idx * 2000);
        });
      }

      setTimeout(() => showToast(`Week ${week}: ${sessionCount}/3 sessions set ✓`), 0);
      return updatedState;
    });
  }, [setStateRaw, showToast]);

  const importData = useCallback((data) => {
    const merged = mergeState(data);
    storageSet(merged);
    backfillApplied.current = {};
    setStateRaw(merged);
    showToast('Progress restored from backup! ✓');
  }, [showToast]);

  return {
    state, setState,
    toast, showToast,
    addXP,
    resetAll,
    resetToday,
    startSession,
    backfillWeek,
    completeExercise,
    finishSession,
    submitCheckin,
    updateSetting,
    addAIHistory,
    importData
  };
}
