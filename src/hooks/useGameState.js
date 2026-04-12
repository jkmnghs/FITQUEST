import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_STATE, ACHIEVEMENTS } from '../data/gameData';
import { storageGet, storageSet, storageClear, cloudGet, cloudSet, cloudClear, cloudSetDebounced } from '../utils/storage';
import { today, applyXP, updateStreak, checkAchievements, calculateSessionXP, calculateAdherenceXP, overtrainingCheck, isDeloadWeek } from '../utils/gameLogic';
import { maybeFireOpenNotification } from '../utils/notifications';
import { selectProgram, getProgramById, buildInitialWeights } from '../data/programs';
import { calcNutritionGoals, calcBMI, calcWaistToHeight } from '../utils/nutrition';
import { validateState, repairState } from '../utils/stateSchema';
import { migrateState } from '../utils/stateMigrations';

// Module-level guard — lives completely outside React, reset only on page reload.
// Initialized from localStorage so page reloads are also covered.
const _initSaved = storageGet();
const _backfillGuard = Object.fromEntries(
  Object.entries(_initSaved?.weekProgress ?? {}).map(([w, d]) => [w, d.count ?? 0])
);

function mergeState(saved) {
  const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
  const merged = { ...base, ...saved };
  // Deep-merge assessment so new fields (parqFlagged, sessionLength, body stats) appear
  merged.assessment = { ...base.assessment, ...(saved.assessment || {}) };
  // Deep-merge new v2 nested objects
  merged.lifestyle = { ...base.lifestyle, ...(saved.lifestyle || {}) };
  merged.dietary = { ...base.dietary, ...(saved.dietary || {}) };
  merged.motivation = { ...base.motivation, ...(saved.motivation || {}) };
  merged.dailyHabits = { ...base.dailyHabits, ...(saved.dailyHabits || {}) };
  // Run migration
  return migrateState(merged);
}

const PRUNE_DAYS = 90;
function pruneOldEntries(arr, dateKey = 'date') {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PRUNE_DAYS);
  return (arr || []).filter(e => new Date(e[dateKey]) >= cutoff);
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
    // Reset daily XP tracking at midnight
    next.dailyXPEarned = 0;
    next.dailySessionCount = 0;
    next.lastDayReset = new Date().toISOString().slice(0, 10);
  }
  // Decay streak if gap since last session exceeds the 3-day rest-day window
  if (next.lastDate && next.lastDate !== t && next.streak > 0) {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const lastMidnight = new Date(next.lastDate); lastMidnight.setHours(0, 0, 0, 0);
    const daysSinceLast = Math.round((todayMidnight - lastMidnight) / 864e5);
    if (daysSinceLast > 3) next.streak = 0;
  }
  return next;
}

/** Reset Quest message quota if the week has rolled over (Monday midnight). */
function checkQuestReset(state) {
  const now = new Date();
  // Week starts on Monday — compute Monday midnight ISO
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().slice(0, 10);
  if (!state.questMessagesWeekStart || state.questMessagesWeekStart !== weekStart) {
    return { ...state, questMessagesThisWeek: 0, questMessagesWeekStart: weekStart };
  }
  return state;
}

export function useGameState(user) {
  const userId = user?.id;
  const [state, setStateRaw] = useState(() => {
    const saved = storageGet();
    const merged = saved ? mergeState(saved) : { ...DEFAULT_STATE };
    return checkQuestReset(checkDayReset(merged));
  });

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [cloudLoading, setCloudLoading] = useState(!!userId);

  const isFinishingSession = useRef(false);

  // Ref-based synchronous lock for backfill
  const backfillApplied = useRef((() => {
    const saved = storageGet();
    const wp = saved?.weekProgress ?? {};
    return Object.fromEntries(Object.entries(wp).map(([w, d]) => [w, d.count ?? 0]));
  })());

  // ── Cloud load on mount / userId change ──────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setCloudLoading(false);
      return;
    }
    setCloudLoading(true);
    cloudGet(userId).then(cloudData => {
      if (cloudData && Object.keys(cloudData).length > 0) {
        const localData = storageGet();

        // Phase 5.2: Conflict resolution — merge when both have data
        if (localData && localData.totalSessions > 0 && cloudData.totalSessions > 0) {
          const localModified = localData.lastDate || '';
          const cloudModified = cloudData.lastDate || '';
          // Simple merge strategy: take whichever is newer, union workout logs
          const baseData = cloudModified >= localModified ? cloudData : localData;
          const merged = checkQuestReset(checkDayReset(mergeState(baseData)));
          // Union log entries (deduplicate by dateStr)
          const seenDates = new Set();
          const mergedLog = [...(cloudData.log || []), ...(localData.log || [])].filter(entry => {
            const key = entry.dateStr || entry.date;
            if (seenDates.has(key)) return false;
            seenDates.add(key);
            return true;
          });
          merged.log = mergedLog.slice(-200); // keep last 200
          // Take higher XP/level
          merged.totalXp = Math.max(cloudData.totalXp || 0, localData.totalXp || 0);
          merged.level = Math.max(cloudData.level || 1, localData.level || 1);
          merged.totalSessions = Math.max(cloudData.totalSessions || 0, localData.totalSessions || 0);
          // Union achievements
          merged.achDone = [...new Set([...(cloudData.achDone || []), ...(localData.achDone || [])])];

          if (!merged.name && user?.user_metadata?.full_name) {
            merged.name = user.user_metadata.full_name;
          }
          setStateRaw(merged);
          storageSet(merged);
        } else {
          // Cloud wins over localStorage
          const merged = checkQuestReset(checkDayReset(mergeState(cloudData)));
          // Populate name from Supabase auth metadata if not already set
          if (!merged.name && user?.user_metadata?.full_name) {
            merged.name = user.user_metadata.full_name;
          }
          setStateRaw(merged);
          storageSet(merged);
        }
      } else {
        // Cloud is empty — check if localStorage has data to migrate
        const localData = storageGet();
        if (localData && localData.totalSessions > 0) {
          // Auto-migrate: mark assessment completed so onboarding is skipped
          const migrateData = mergeState(localData);
          if (!migrateData.assessment?.completed) {
            migrateData.assessment = { ...migrateData.assessment, completed: true };
          }
          const merged = checkQuestReset(checkDayReset(migrateData));
          cloudSet(userId, merged);
          setStateRaw(merged);
          storageSet(merged);
          // Toast shown after cloudLoading resolves
          setTimeout(() => showToast('Progress synced to account ✓'), 800);
        }
      }
      setCloudLoading(false);
    }).catch(() => setCloudLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save: localStorage + debounced cloud ─────────────────────────────
  useEffect(() => {
    storageSet(state);
    if (userId) {
      const { success, error } = validateState(state);
      if (success) {
        cloudSetDebounced(userId, state);
      } else {
        console.error('[useGameState] State validation failed, skipping cloud save:', error);
        // Attempt repair and save the repaired version
        const repaired = repairState(state);
        const recheck = validateState(repaired);
        if (recheck.success) {
          cloudSetDebounced(userId, repaired);
          setStateRaw(repaired);
        }
      }
    }
  }, [state, userId]);

  // Re-run day reset whenever the app becomes visible or the minute ticks over midnight
  useEffect(() => {
    function maybeDayReset() {
      setStateRaw(prev => {
        const next = checkQuestReset(checkDayReset(prev));
        return next.todayExDate !== prev.todayExDate ||
               next.questMessagesWeekStart !== prev.questMessagesWeekStart
          ? next : prev;
      });
    }
    const onVisible = () => { if (document.visibilityState === 'visible') maybeDayReset(); };
    document.addEventListener('visibilitychange', onVisible);
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

  // Save on page hide / unload (synchronous best-effort)
  useEffect(() => {
    const save = () => {
      storageSet(state);
      if (userId) cloudSet(userId, state);
    };
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
    };
  }, [state, userId]);

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
    if (userId) cloudClear(userId);
    backfillApplied.current = {};
    Object.keys(_backfillGuard).forEach(k => delete _backfillGuard[k]);
    setStateRaw({ ...DEFAULT_STATE });
    showToast('Progress reset!');
  }, [showToast, userId]);

  // ── completeAssessment ───────────────────────────────────────────────────
  const completeAssessment = useCallback((assessment, onSaved) => {
    const programId       = selectProgram(assessment);
    const program         = getProgramById(programId);
    const { liftWeights, liftHistory } = buildInitialWeights(program, assessment);
    const nutritionGoals  = calcNutritionGoals(assessment);
    const { bmi, category: bmiCategory } = calcBMI(assessment.weightKg, assessment.heightCm);
    const waistToHeightRatio = calcWaistToHeight(assessment.waistCm, assessment.heightCm);

    setStateRaw(prev => {
      const newState = {
        ...prev,
        name: assessment.name || prev.name,
        assessment: { ...assessment, completed: true, programId },
        programId,
        sessionsPerWeek: program.sessionsPerWeek,
        activeExercises: program.exercises,
        trainingDays: assessment.trainingDays,
        liftWeights,
        liftHistory,
        nutritionGoals,
        bmi,
        bmiCategory,
        waistToHeightRatio,
        // Store new v2 data
        lifestyle: {
          dailyActivity: assessment.dailyActivity || 'sedentary',
          sleepHours: assessment.sleepHours || '7-8',
          stressLevel: assessment.stressLevel || 'moderate',
        },
        dietary: {
          restrictions: assessment.dietaryRestrictions || [],
          trackingExperience: assessment.trackingExperience || 'never',
          mealsPerDay: assessment.mealsPerDay || 3,
        },
        motivation: {
          primaryMotivation: assessment.primaryMotivation || null,
          previousQuitReason: assessment.previousQuitReason || null,
        },
        stateVersion: 2,
      };
      // Immediate cloud save (not debounced) — assessment completion is critical
      if (userId) {
        cloudSet(userId, newState).then(() => {
          if (onSaved) onSaved();
        });
      } else if (onSaved) {
        // No cloud — fire immediately
        setTimeout(onSaved, 0);
      }
      return newState;
    });
  }, [userId]);

  // ── changeProgram ──────────────────────────────────────────────────────
  // Switches to a new program while preserving weights for shared exercises.
  const changeProgram = useCallback((newProgramId) => {
    const program = getProgramById(newProgramId);
    if (!program) return;
    setState(prev => {
      // Merge: keep existing weights for exercises that appear in the new program
      const { liftWeights: freshWeights, liftHistory: freshHistory } = buildInitialWeights(program);
      const mergedWeights = { ...freshWeights, ...prev.liftWeights };
      const mergedHistory = {};
      for (const ex of program.exercises) {
        mergedHistory[ex.id] = prev.liftHistory?.[ex.id] || [];
      }
      const newState = {
        ...prev,
        programId: program.id,
        activeExercises: program.exercises,
        sessionsPerWeek: program.sessionsPerWeek,
        liftWeights: mergedWeights,
        liftHistory: mergedHistory,
        assessment: { ...prev.assessment, programId: program.id },
      };
      if (userId) cloudSet(userId, newState);
      return newState;
    });
    showToast(`Program changed to ${program.name}`);
  }, [setState, userId, showToast]);

  // ── swapExercise ──────────────────────────────────────────────────────────
  const swapExercise = useCallback((oldId, newEx) => {
    setState(prev => {
      const liftWeights = { ...prev.liftWeights };
      if (liftWeights[newEx.id] == null) liftWeights[newEx.id] = newEx.startKg ?? 0;

      // Add mode — append with sensible defaults for sets/reps/rest/rpe
      if (oldId === '__add__') {
        const defaults = newEx.isPlank
          ? { sets: 2, reps: 0,  rest: '60 sec', restSec: 60,  rpe: 0 }
          : newEx.isBodyweight
            ? { sets: 3, reps: 12, rest: '60 sec', restSec: 60, rpe: 7 }
            : { sets: 3, reps: 10, rest: '2 min',  restSec: 120, rpe: 8 };
        const exerciseToAdd = { ...defaults, ...newEx };
        const newState = { ...prev, activeExercises: [...(prev.activeExercises || []), exerciseToAdd], liftWeights };
        if (userId) cloudSet(userId, newState);
        return newState;
      }

      // Swap mode — replace in place
      const idx = (prev.activeExercises || []).findIndex(e => e.id === oldId);
      if (idx === -1) return prev;
      const updated = [...prev.activeExercises];
      updated[idx] = { ...updated[idx], id: newEx.id, name: newEx.name, isPlank: !!newEx.isPlank, isBodyweight: !!newEx.isBodyweight };
      const newState = { ...prev, activeExercises: updated, liftWeights };
      if (userId) cloudSet(userId, newState);
      return newState;
    });
    showToast(oldId === '__add__' ? `Added ${newEx.name}` : `Swapped to ${newEx.name}`);
  }, [setState, userId, showToast]);

  // ── deleteExercise ────────────────────────────────────────────────────────
  const deleteExercise = useCallback((exId) => {
    setState(prev => {
      const updated = (prev.activeExercises || []).filter(e => e.id !== exId);
      const newState = { ...prev, activeExercises: updated };
      if (userId) cloudSet(userId, newState);
      return newState;
    });
    showToast('Exercise removed');
  }, [setState, userId, showToast]);

  const addAIEpisodic = useCallback((note) => {
    setState(prev => ({
      ...prev,
      aiEpisodic: [...(prev.aiEpisodic || []), {
        id: `ep_${Date.now()}`,
        ...note,
        createdAt: new Date().toISOString().slice(0, 10),
      }]
    }));
  }, [setState]);

  const completeExercise = useCallback((exId, sets) => {
    let pendingXP = 0;
    let pendingPR = false;
    let pendingReasons = [];
    setState(prev => {
      const isDeload = isDeloadWeek(prev.currentWeek);
      let vol = 0, maxRPE = 0, setsCompleted = 0;
      let maxWeightUsed = 0;
      let totalRPE = 0, rpeCount = 0;

      sets.forEach(s => {
        if (s.done) {
          setsCompleted++;
          if (!isDeload) {
            const wt = s.weightKg || 0;
            const rp = s.reps || 0;
            vol += wt * rp;
            if (wt > maxWeightUsed) maxWeightUsed = wt;
            if ((s.rpe || 0) > maxRPE) maxRPE = s.rpe || 0;
            if (s.rpe) { totalRPE += s.rpe; rpeCount++; }
          }
        }
      });

      // ── Adherence-based XP calculation ──
      const avgRPE = rpeCount > 0 ? totalRPE / rpeCount : 0;
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3);
      const matchesPrescribedDay = (prev.trainingDays || [])
        .some(d => d.toLowerCase().startsWith(todayStr));
      const previousWeight = prev.liftWeights?.[exId] || 0;
      const overloadAchieved = maxWeightUsed > previousWeight && previousWeight > 0;

      const weeklyState = {
        completedSessions: prev.weekProgress?.[prev.currentWeek]?.count || 0,
      };
      const program = { sessionsPerWeek: prev.sessionsPerWeek || 3 };

      const { xp: adherenceXP, reasons } = calculateAdherenceXP(
        { matchesPrescribedDay, avgRPE, overloadAchieved, setsCompleted },
        weeklyState,
        program
      );

      // Apply daily XP cap
      const dailyEarned = prev.dailyXPEarned || 0;
      const xp = Math.min(150 - dailyEarned, Math.max(5, adherenceXP));
      pendingXP = xp;
      pendingReasons = reasons;

      const baseSets = sets.filter(s => !s.isExtra).length;
      const extraSets = sets.filter(s => s.isExtra).length;

      // Progressive overload — RPE-based + 2-for-2 rule tracking
      let overloadSuggestions = { ...prev.overloadSuggestions };
      let weeklyRPE = { ...prev.weeklyRPE };
      let consecutiveCompletions = { ...prev.consecutiveCompletions };

      if (!isDeload && maxRPE > 0) {
        if (!weeklyRPE[exId]) weeklyRPE[exId] = {};
        weeklyRPE[exId][prev.currentWeek] = maxRPE;
        if (maxRPE <= 8) overloadSuggestions[exId] = 'increase';
        else if (maxRPE === 9) overloadSuggestions[exId] = 'repeat';
        else overloadSuggestions[exId] = 'deload';
      }

      // 2-for-2 rule: track consecutive full completions
      const ex = (prev.activeExercises || []).find(e => e.id === exId);
      const targetReps = ex?.reps ?? 10;
      const allSetsHitTarget = setsCompleted >= baseSets &&
        sets.filter(s => !s.isExtra && s.done).every(s => (s.reps || 0) >= targetReps);

      if (!isDeload && allSetsHitTarget) {
        consecutiveCompletions[exId] = (consecutiveCompletions[exId] || 0) + 1;
        if (consecutiveCompletions[exId] >= 2) {
          overloadSuggestions[exId] = 'increase';
        }
      } else if (!isDeload) {
        consecutiveCompletions[exId] = 0;
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
          newPR = true;
        }
      }
      pendingPR = newPR;

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
        todayExDone, todayExDetails,
        todaySessionFinished: false,
        sessionStartTime,
        overloadSuggestions, weeklyRPE, consecutiveCompletions,
        personalRecords, liftWeights,
        dailyXPEarned: (prev.dailyXPEarned || 0) + pendingXP,
        log: pruneOldEntries([...prev.log, logEntry])
      };
    });
    setTimeout(() => {
      if (pendingXP > 0) {
        const reasonStr = pendingReasons.length > 0 ? `\n${pendingReasons[0]}` : '';
        addXP(pendingXP, `+${pendingXP} XP${reasonStr}`);
      }
      if (pendingPR) setTimeout(() => showToast(`🏅 NEW PR: ${exId}!`), 1200);
    }, 50);
  }, [setState, addXP, showToast]);

  const finishSession = useCallback(() => {
    if (isFinishingSession.current) return;
    isFinishingSession.current = true;
    let pendingXP = 0;
    let pendingAdvance = null;
    setState(prev => {
      if (prev.todaySessionFinished) return prev;
      const w = prev.currentWeek;
      const isDeload = isDeloadWeek(w);
      const exercises = prev.activeExercises || [];
      const doneCount = (prev.todayExDone || []).length;
      const totalEx = exercises.length || 7;
      const completionPct = Math.round((doneCount / totalEx) * 100);
      const missedCount = totalEx - doneCount;
      const bonusXP = Math.max(10, 50 - missedCount * 8);

      // ── Overtraining check (Phase 2.4) ──
      const weekProgress = { ...prev.weekProgress };
      if (!weekProgress[w]) weekProgress[w] = { count: 0, dates: [], completed: false, sessions: [] };
      const currentWeekSessions = weekProgress[w].count || 0;
      const programFrequency = prev.sessionsPerWeek || 3;
      const ot = overtrainingCheck({ completedSessions: currentWeekSessions }, programFrequency);

      // Apply overtraining multiplier and daily cap
      const adjustedXP = Math.round(bonusXP * ot.xpMultiplier);
      const dailyEarned = prev.dailyXPEarned || 0;
      pendingXP = Math.min(150 - dailyEarned, adjustedXP);
      if (pendingXP < 0) pendingXP = 0;

      const updatedWithStreak = updateStreak(prev);

      const wp = { ...weekProgress[w] };
      wp.count = (wp.count || 0) + 1;
      wp.dates = [...(wp.dates || []), today()];
      wp.sessions = [...(wp.sessions || []), {
        date: today(), exercisesDone: [...(prev.todayExDone || [])], completion: completionPct
      }];

      const sessionsNeeded = prev.sessionsPerWeek || 3;
      let nextWeek = w;
      if (wp.count >= sessionsNeeded && !wp.completed) {
        wp.completed = true;
        if (isDeload) setTimeout(() => showToast('🧘 Deload complete! Great recovery week.'), 500);
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
        name: `Session ${wp.count}/${sessionsNeeded} • ${doneCount}/${totalEx} exercises (${completionPct}%)`,
        xp: bonusXP, date: today(), type: 'session', week: w,
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      return {
        ...updatedWithStreak,
        todaySessionFinished: true,
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + 50,
        perfectWeeks: (wp.count >= sessionsNeeded && !prev.weekProgress[w]?.completed) ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        deloadDone: isDeload && wp.count >= sessionsNeeded ? true : prev.deloadDone,
        weekProgress,
        currentWeek: nextWeek,
        sessionStartTime: null,
        dailySessionCount: (prev.dailySessionCount || 0) + 1,
        dailyXPEarned: (prev.dailyXPEarned || 0) + pendingXP,
        log: pruneOldEntries([...prev.log, logEntry])
      };
    });
    setTimeout(() => addXP(pendingXP), 100);
    if (pendingAdvance !== null) {
      setTimeout(() => {
        setState(s => {
          if (s.currentWeek !== pendingAdvance) return s;
          return {
            ...s,
            todayExDone: [], todayExDetails: {},
            todaySessionFinished: false,
            sessionStartTime: null, todayExDate: today()
          };
        });
        isFinishingSession.current = false;
      }, 2500);
    } else {
      isFinishingSession.current = false;
    }
  }, [setState, addXP, showToast]);

  const submitCheckin = useCallback((weight, waist, sleep) => {
    setState(prev => {
      const entry = { week: prev.currentWeek, weight, waist: waist || 0, sleep: sleep || 0, date: today() };
      const logEntry = {
        name: `Week ${prev.currentWeek} Check-in: ${weight} ${prev.unit}`,
        xp: 25, date: today(), type: 'checkin',
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      };
      return {
        ...prev,
        checkins: prev.checkins + 1,
        weeklyCheckins: [...prev.weeklyCheckins, entry],
        log: pruneOldEntries([...prev.log, logEntry])
      };
    });
    setTimeout(() => addXP(25), 50);
  }, [setState, addXP]);

  const updateSetting = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, [setState]);

  const resetToday = useCallback(() => {
    setState(prev => ({
      ...prev,
      todayExDone: [], todayExDetails: {},
      todaySessionFinished: false, sessionStartTime: null,
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
    setState(prev => ({ ...prev, aiCoachHistory: messages }));
  }, [setState]);

  const incrementQuestMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      questMessagesThisWeek: (prev.questMessagesThisWeek || 0) + 1
    }));
  }, [setState]);

  const logMeal = useCallback((meal) => {
    setState(prev => ({
      ...prev,
      mealLogs: pruneOldEntries([...(prev.mealLogs || []), meal])
    }));
    showToast(`Meal logged — ${meal.totals.calories} kcal ✓`);
  }, [setState, showToast]);

  const deleteMeal = useCallback((mealId) => {
    setState(prev => ({
      ...prev,
      mealLogs: (prev.mealLogs || []).filter(m => m.id !== mealId)
    }));
    showToast('Meal deleted');
  }, [setState, showToast]);

  // ── Recovery check-in (Phase 4.4) ──
  const logRecovery = useCallback((scores) => {
    setState(prev => ({
      ...prev,
      recoveryScores: [
        ...(prev.recoveryScores || []).slice(-30), // keep last 30 entries
        { date: new Date().toISOString().slice(0, 10), ...scores }
      ]
    }));
  }, [setState]);

  // ── Daily habits tracking (Phase 4.5) ──
  const updateDailyHabits = useCallback((habits) => {
    setState(prev => ({
      ...prev,
      dailyHabits: { ...(prev.dailyHabits || {}), ...habits }
    }));
  }, [setState]);

  const backfillWeek = useCallback((week, sessionCount, completionPct = 100, customWeights = {}, customSets = {}, durationMins = 50) => {
    const key = String(week);
    const guardCount = _backfillGuard[key] ?? 0;
    if (sessionCount <= guardCount) {
      showToast(`Week ${week}: already recorded ${guardCount}/3 sessions`);
      return;
    }
    _backfillGuard[key] = sessionCount;

    setStateRaw(prev => {
      const lockedCount = prev.backfillLock?.[week] ?? 0;
      if (sessionCount <= lockedCount) return prev;

      const prevSessionCount = prev.weekProgress?.[week]?.count ?? 0;
      const prevCompleted = prev.weekProgress?.[week]?.completed ?? false;
      const newSessions = Math.max(0, sessionCount - prevSessionCount);
      if (newSessions === 0) return prev;

      const sessionsNeeded = prev.sessionsPerWeek || 3;
      const completed = sessionCount >= sessionsNeeded;
      const fakeDates = ['Mon', 'Wed', 'Fri'].slice(0, sessionCount);

      const doneExIds = Object.entries(customSets)
        .filter(([, sets]) => sets > 0)
        .map(([exId]) => exId);

      const sessions = fakeDates.map(d => ({
        date: `Week ${week} ${d} (backfilled)`,
        exercisesDone: doneExIds, completion: completionPct
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

      const totalExCount = Object.keys(customSets).length || 7;
      const dayLabels = ['Mon', 'Wed', 'Fri'];
      const newLogEntries = [];
      for (let i = prevSessionCount; i < sessionCount; i++) {
        newLogEntries.push({
          name: `Session ${i + 1}/${sessionsNeeded} • ${doneExIds.length}/${totalExCount} exercises (${completionPct}%) [backfill]`,
          xp: sessionXp, date: `Week ${week} (backfill)`, type: 'session', week,
          dateStr: `Week ${week} ${dayLabels[i] || `S${i + 1}`} (backfill)`
        });
      }

      const updatedState = {
        ...prev, xp, totalXp, level, weekProgress, liftWeights,
        backfillLock: { ...prev.backfillLock, [week]: sessionCount },
        totalSessions: prev.totalSessions + newSessions,
        totalMinutes: prev.totalMinutes + newSessions * durationMins,
        totalVolume: prev.totalVolume + addedVolume,
        perfectWeeks: completed && !prevCompleted ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        log: pruneOldEntries([...prev.log, ...newLogEntries]),
      };

      const newlyUnlocked = checkAchievements(updatedState);
      if (newlyUnlocked.length > 0) {
        updatedState.achDone = [...(prev.achDone || []), ...newlyUnlocked];
        newlyUnlocked.forEach((id, idx) => {
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          setTimeout(() => showToast(`🏆 ${ach?.name || 'Achievement'} unlocked!`), 1500 + idx * 2000);
        });
      }

      setTimeout(() => showToast(`Week ${week}: ${sessionCount}/${sessionsNeeded} sessions set ✓`), 0);
      return updatedState;
    });
  }, [setStateRaw, showToast]);

  const importData = useCallback((data) => {
    if (!data || typeof data !== 'object' ||
        typeof data.currentWeek !== 'number' ||
        typeof data.level !== 'number' ||
        !Array.isArray(data.log)) {
      showToast('Invalid backup: missing required fields.');
      return;
    }
    const merged = checkQuestReset(checkDayReset(mergeState(data)));
    storageSet(merged);
    if (userId) cloudSet(userId, merged);
    backfillApplied.current = {};
    setStateRaw(merged);
    showToast('Progress restored from backup! ✓');
  }, [showToast, userId]);

  return {
    state, setState, cloudLoading,
    toast, showToast,
    addXP,
    resetAll, resetToday,
    startSession, backfillWeek,
    completeExercise, finishSession,
    submitCheckin, updateSetting,
    addAIHistory, addAIEpisodic,
    incrementQuestMessages,
    logMeal, deleteMeal,
    logRecovery, updateDailyHabits,
    importData, completeAssessment, changeProgram,
    swapExercise, deleteExercise,
  };
}
