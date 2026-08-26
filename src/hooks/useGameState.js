import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_STATE, ACHIEVEMENTS } from '../data/gameData';
import { storageGet, storageSet, storageClear, migrateLegacyStorage, cloudGet, cloudGetResult, cloudSet, cloudClear, cloudSetDebounced, cancelCloudDebounce, flushCloudDebounce, markCloudLoadSettled, resetCloudLoadGate, isEmptyState } from '../utils/storage';
import { today, applyXP, updateStreak, checkAchievements, calculateSessionXP, calculateAdherenceXP, overtrainingCheck, isDeloadWeek, DAILY_XP_CAP, xpToLevel, removeXP, tomorrow, midnightOf } from '../utils/gameLogic';
import { maybeFireOpenNotification } from '../utils/notifications';
import { selectProgram, getProgramById, buildInitialWeights } from '../data/programs';
import { calcNutritionGoals, calcBMI, calcWaistToHeight } from '../utils/nutrition';
import { validateState, repairState } from '../utils/stateSchema';
import { migrateState } from '../utils/stateMigrations';
import { applySubstitutions, applyCompetencySubstitutions } from '../utils/exerciseSubstitutions';
import { lookupExName, buildPrescription } from '../data/exerciseCatalog';
import { todayDayKey, exercisesForDay } from '../utils/session';

/**
 * Build a personalized exercise list from a program base by applying
 * the user's movement-competency swaps first, then pain-region swaps.
 */
function applyDurationTrim(exercises, sessionLength) {
  const mins = Number(sessionLength);
  if (!mins) return exercises;
  if (mins <= 30) {
    // ~30 min: 5 exercises × 2 sets
    return exercises.slice(0, 5).map(ex => ({ ...ex, sets: Math.min(ex.sets, 2) }));
  }
  if (mins <= 45) {
    // ~45 min: 6 exercises × 2 sets
    return exercises.slice(0, 6).map(ex => ({ ...ex, sets: Math.min(ex.sets, 2) }));
  }
  if (mins >= 90) {
    // ~90 min: full list + 1 extra set per exercise (capped at 5)
    return exercises.map(ex => ({ ...ex, sets: Math.min(ex.sets + 1, 5) }));
  }
  return exercises; // 60 min: use program defaults
}

function buildPersonalizedExercises(exercises, assessment) {
  if (!exercises) return exercises;
  let result = [...exercises];
  result = applyCompetencySubstitutions(result, assessment?.movementCompetency);
  result = applySubstitutions(result, assessment?.painRegions);
  result = applyDurationTrim(result, assessment?.sessionLength);
  return result;
}

// Module-level guard — lives completely outside React, reset only on page reload.
// Tracks "week_dayKey" strings already backfilled to prevent double-apply on re-render.
const _backfillGuard = new Set();

/** Seed the guard from a state object once we know whose state it is. */
function hydrateBackfillGuard(saved) {
  _backfillGuard.clear();
  for (const [w, val] of Object.entries(saved?.backfillLock ?? {})) {
    if (Array.isArray(val)) val.forEach(dk => _backfillGuard.add(`${w}_${dk}`));
  }
}

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

function unionArrays(arr1, arr2, keyFn) {
  const map = new Map();
  (arr1 || []).forEach(item => {
    const k = keyFn(item);
    if (k !== undefined) map.set(k, item);
  });
  (arr2 || []).forEach(item => {
    const k = keyFn(item);
    if (k !== undefined) map.set(k, item); // arr2 (local) wins on collision
    else map.set(Symbol(), item);
  });
  return [...map.values()];
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
  // Auto-advance currentWeek if it's already marked complete (e.g. via backfill)
  let advanced = false;
  while (next.weekProgress?.[next.currentWeek]?.completed && next.currentWeek < 999) {
    next.currentWeek += 1;
    advanced = true;
  }
  // Keep the persisted "week started on" date in sync: reset it whenever the
  // week actually changes, and backfill it once for state saved before this
  // field existed (fall back to the earliest recorded session this week, or today).
  if (advanced || !next.currentWeekStartDate) {
    const wp = next.weekProgress?.[next.currentWeek];
    const sessionDates = [...(wp?.dates || []), ...(wp?.sessions || []).map(s => s.date).filter(Boolean)];
    next.currentWeekStartDate = advanced || sessionDates.length === 0
      ? t
      : new Date(Math.min(...sessionDates.map(d => +new Date(d)))).toDateString();
  }

  // Repair state stamped before the anchor fix. A week that advanced the moment
  // its last session was logged recorded that same day as its start, so from
  // the following day that weekday sat in the past with nothing against it and
  // showed as missed — for a session the user had just completed. The signature
  // is exact: the previous week holds a session dated on this week's start day.
  // Bumping it by one makes the check no longer match, so this runs once.
  if (next.currentWeekStartDate) {
    const startMs = midnightOf(next.currentWeekStartDate);
    const prevWp = next.weekProgress?.[next.currentWeek - 1];
    const closedOnStartDay = (prevWp?.sessions || [])
      .some(sess => sess?.date && midnightOf(sess.date) === startMs);
    if (!isNaN(startMs) && closedOnStartDay) {
      const d = new Date(startMs);
      d.setDate(d.getDate() + 1);
      next.currentWeekStartDate = d.toDateString();
    }
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
    return { ...state, questMessagesThisWeek: 0, programGenerationsThisWeek: 0, questMessagesWeekStart: weekStart };
  }
  return state;
}

export function useGameState(user) {
  const userId = user?.id;
  const [state, setStateRaw] = useState(() => {
    const saved = storageGet(user?.id);
    const merged = saved ? mergeState(saved) : { ...DEFAULT_STATE };
    hydrateBackfillGuard(saved);
    return checkQuestReset(checkDayReset(merged));
  });

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [cloudLoading, setCloudLoading] = useState(!!userId);
  // True when the cloud read did not complete. The app must not conclude
  // anything about the account in that case — in particular it must not offer
  // onboarding, whose completion would write a fresh state over real progress.
  const [cloudLoadFailed, setCloudLoadFailed] = useState(false);
  // Bumped by retryCloudLoad to re-run the load effect below.
  const [retryNonce, setRetryNonce] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const isFinishingSession = useRef(false);
  // Track previous userId so we can distinguish sign-out (value→null)
  // from cold start (null→null). Only reset state on an actual sign-out.
  const prevUserIdRef = useRef(userId);

  // Ref-based synchronous lock for backfill
  const backfillApplied = useRef((() => {
    const wp = storageGet(user?.id)?.weekProgress ?? {};
    return Object.fromEntries(Object.entries(wp).map(([w, d]) => [w, d.count ?? 0]));
  })());

  // ── Cloud load on mount / userId change ──────────────────────────────────
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (!userId) {
      // Only wipe state when the user explicitly signed out (had an ID before).
      // On cold start userId is null while auth is still resolving — don't clear
      // localStorage or reset state in that case or onboarding will flash.
      if (prevUserId) {
        // Flush first — cancelling the debounce and then clearing local storage
        // silently discarded up to 3 seconds of progress on sign-out.
        flushCloudDebounce();
        setStateRaw({ ...DEFAULT_STATE });
        storageClear(prevUserId);
        _backfillGuard.clear();
        backfillApplied.current = {};
      }
      setCloudLoading(false);
      return;
    }
    setCloudLoading(true);
    // Close the write gate until this load resolves. Nothing may reach the
    // cloud in the meantime — the auto-save effect fires on mount with the
    // in-memory default, and its 3s debounce used to beat a slow read and
    // overwrite the account.
    resetCloudLoadGate();
    setCloudLoadFailed(false);
    // Adopt any pre-namespacing local state into this account's namespace, once.
    // Only applies when this account has no local state of its own, so it can't
    // pull a previous user's progress into a different account.
    migrateLegacyStorage(userId);
    hydrateBackfillGuard(storageGet(userId));

    cloudGetResult(userId).then(result => {
      // A failed read is not an empty account. Treating the two the same is
      // what sent a user with 79 sessions to the onboarding questionnaire and
      // then saved the answers over their history. Surface the failure and
      // touch nothing.
      if (!result.ok) {
        console.warn('[FitQuest] cloud load failed:', result.reason, '— keeping local state, no cloud write');
        setCloudLoadFailed(true);
        setCloudLoading(false);
        return;
      }

      markCloudLoadSettled(userId);
      const cloudData = result.data;
      if (cloudData && Object.keys(cloudData).length > 0) {
        const localData = storageGet(userId);

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
          // Recalculate xp (progress within current level) from the authoritative totalXp+level
          // so the XP bar is always consistent after the merge, regardless of which source
          // provided each value.
          merged.xp = Math.max(0, merged.totalXp - xpToLevel(merged.level));
          merged.totalSessions = Math.max(cloudData.totalSessions || 0, localData.totalSessions || 0);
          // Week and checkin count should never regress — take the higher value
          merged.currentWeek = Math.max(cloudData.currentWeek || 1, localData.currentWeek || 1);
          // currentWeekStartDate must track whichever side's currentWeek "won" above —
          // otherwise the date can point at a stale (lower) week after the merge.
          const weekWinner = (cloudData.currentWeek || 1) >= (localData.currentWeek || 1) ? cloudData : localData;
          merged.currentWeekStartDate = weekWinner.currentWeekStartDate || merged.currentWeekStartDate || today();
          merged.checkins = Math.max(cloudData.checkins || 0, localData.checkins || 0);
          // Union achievements
          merged.achDone = [...new Set([...(cloudData.achDone || []), ...(localData.achDone || [])])];
          // Union check-ins by week — local wins for any given week (most recent edit)
          const checkinMap = new Map();
          (cloudData.weeklyCheckins || []).forEach(c => checkinMap.set(c.week, c));
          (localData.weeklyCheckins || []).forEach(c => checkinMap.set(c.week, c));
          merged.weeklyCheckins = [...checkinMap.values()].sort((a, b) => a.week - b.week);
          // Union weekProgress — take max session count per week, union completedDays/dates/sessions
          // without this, a sync conflict silently drops sessions from whichever source loses
          const mergedWP = { ...(baseData.weekProgress || {}) };
          const otherWP = (baseData === cloudData ? localData : cloudData).weekProgress || {};
          for (const [week, other] of Object.entries(otherWP)) {
            if (!mergedWP[week]) {
              mergedWP[week] = other;
            } else {
              const base = mergedWP[week];
              const sessionMap = new Map();
              [...(base.sessions || []), ...(other.sessions || [])].forEach(s => {
                const key = `${s.dayKey || ''}-${s.date || ''}`;
                if (!sessionMap.has(key)) sessionMap.set(key, s);
              });
              mergedWP[week] = {
                ...base,
                count: Math.max(base.count || 0, other.count || 0),
                completedDays: [...new Set([...(base.completedDays || []), ...(other.completedDays || [])])],
                dates: [...new Set([...(base.dates || []), ...(other.dates || [])])],
                completed: base.completed || other.completed,
                sessions: [...sessionMap.values()],
              };
            }
          }
          merged.weekProgress = mergedWP;
          // Union other user-data arrays — both sides contribute, local wins on collision
          merged.mealLogs = unionArrays(cloudData.mealLogs, localData.mealLogs, m => m.id).slice(-500);
          merged.aiEpisodic = unionArrays(cloudData.aiEpisodic, localData.aiEpisodic, e => e.id);
          merged.recoveryScores = unionArrays(cloudData.recoveryScores, localData.recoveryScores, r => r.date).slice(-90);
          merged.aiCoachHistory = (localData.aiCoachHistory || []).length >= (cloudData.aiCoachHistory || []).length
            ? (localData.aiCoachHistory || [])
            : (cloudData.aiCoachHistory || []);

          if (!merged.name && user?.user_metadata?.full_name) {
            merged.name = user.user_metadata.full_name;
          }
          setStateRaw(merged);
          storageSet(merged, userId);
        } else if (isEmptyState(cloudData) && !isEmptyState(storageGet(userId))) {
          // Cloud row is empty but this device still holds real progress.
          //
          // The branch below reads "cloud wins over localStorage", which is
          // right when the cloud copy is the newer one — but it is catastrophic
          // when the cloud row has been emptied. It would overwrite the last
          // surviving copy of the user's history with nothing. Recover from the
          // device instead, and push it back up.
          const localData = storageGet(userId);
          const recovered = checkQuestReset(checkDayReset(mergeState(localData)));
          if (!recovered.assessment?.completed) {
            recovered.assessment = { ...recovered.assessment, completed: true };
          }
          if (!recovered.name && user?.user_metadata?.full_name) {
            recovered.name = user.user_metadata.full_name;
          }
          console.warn('[FitQuest] cloud row is empty but local has progress — restoring from this device');
          setStateRaw(recovered);
          storageSet(recovered, userId);
          markCloudLoadSettled(userId);
          cloudSet(userId, recovered);
          setTimeout(() => showToast('Progress restored from this device ✓'), 800);
        } else {
          // Cloud wins over localStorage
          const merged = checkQuestReset(checkDayReset(mergeState(cloudData)));
          // If local has a higher week (e.g., claimed reward locally before cloud save landed),
          // keep the higher value so the week never regresses on reload.
          const localForWeek = storageGet(userId);
          if (localForWeek && (localForWeek.currentWeek || 1) > (merged.currentWeek || 1)) {
            merged.currentWeek = localForWeek.currentWeek;
            merged.currentWeekStartDate = localForWeek.currentWeekStartDate || today();
          }
          // Populate name from Supabase auth metadata if not already set
          if (!merged.name && user?.user_metadata?.full_name) {
            merged.name = user.user_metadata.full_name;
          }
          setStateRaw(merged);
          storageSet(merged, userId);
        }
      } else {
        // Cloud is empty — check if localStorage has data to migrate
        const localData = storageGet(userId);
        if (localData && localData.totalSessions > 0) {
          // Auto-migrate: mark assessment completed so onboarding is skipped
          const migrateData = mergeState(localData);
          if (!migrateData.assessment?.completed) {
            migrateData.assessment = { ...migrateData.assessment, completed: true };
          }
          const merged = checkQuestReset(checkDayReset(migrateData));
          cloudSet(userId, merged);
          setStateRaw(merged);
          storageSet(merged, userId);
          // Toast shown after cloudLoading resolves
          setTimeout(() => showToast('Progress synced to account ✓'), 800);
        }
      }
      setLastSyncedAt(Date.now());
      setCloudLoading(false);
    }).catch((e) => {
      // Same rule as an !ok result: an exception tells us nothing about what
      // is stored, so the gate stays shut.
      console.warn('[FitQuest] cloud load threw:', e);
      setCloudLoadFailed(true);
      setCloudLoading(false);
    });
  }, [userId, retryNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save: localStorage + debounced cloud ─────────────────────────────
  // localStorage always; the cloud only once the load has settled. cloudSet
  // enforces that too, but skipping the debounce here avoids arming a timer
  // whose write will just be refused.
  useEffect(() => {
    storageSet(state, userId);
    if (userId && !cloudLoading && !cloudLoadFailed) {
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
  }, [state, userId, cloudLoading, cloudLoadFailed]);

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
      storageSet(state, userId);
      if (userId) { cancelCloudDebounce(); cloudSet(userId, state); }
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

  /**
   * setState + an immediate (non-debounced) cloud save of the committed result.
   *
   * Several mutations used to call cloudSet from *inside* their setState
   * updater. React may invoke an updater more than once — StrictMode does so on
   * every render in development — so those writes fired twice and the reducer
   * stopped being pure. Capturing the result and syncing in an effect keeps the
   * updater side-effect-free while preserving the "don't wait for the 3s
   * debounce" behaviour these actions need.
   */
  const pendingSyncRef = useRef(null);
  const [syncTick, setSyncTick] = useState(0);

  const setStateWithSync = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      pendingSyncRef.current = next;
      return next;
    });
    setSyncTick(t => t + 1);
  }, []);

  useEffect(() => {
    const next = pendingSyncRef.current;
    if (!next) return;
    pendingSyncRef.current = null;
    if (userId) { cancelCloudDebounce(); cloudSet(userId, next); }
  }, [syncTick, userId]);

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
    storageClear(userId);
    if (userId) cloudClear(userId);
    backfillApplied.current = {};
    _backfillGuard.clear();
    setStateRaw({ ...DEFAULT_STATE });
    showToast('Progress reset!');
  }, [showToast, userId]);

  // ── completeAssessment ───────────────────────────────────────────────────
  const pendingAssessmentSave = useRef(null);
  const completeAssessment = useCallback((assessment, onSaved) => {
    const programId       = selectProgram(assessment);
    const program         = getProgramById(programId);
    const { liftWeights, liftHistory } = buildInitialWeights(program, assessment);
    const nutritionGoals  = calcNutritionGoals(assessment);
    const { bmi, category: bmiCategory } = calcBMI(assessment.weightKg, assessment.heightCm);
    const waistToHeightRatio = calcWaistToHeight(assessment.waistCm, assessment.heightCm);

    setStateRaw(prev => {
      const _dayOrder2 = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const _todayKey2 = _dayOrder2[new Date().getDay()];
      const _tdays2 = assessment.trainingDays || [];
      const _builtTemplates = program.templates
        ? program.templates.map(t => ({ ...t, exercises: buildPersonalizedExercises(t.exercises, assessment) }))
        : null;
      // Start from today's slot so the first workout shown is today's, not always slot 0 (Monday)
      const _todayOrigIdx2 = _tdays2.indexOf(_todayKey2);
      const _initDayIndex = (_todayOrigIdx2 >= 0 && _builtTemplates?.length > 0)
        ? _todayOrigIdx2 % _builtTemplates.length
        : 0;
      const _initExercises = _builtTemplates?.[_initDayIndex]?.exercises
        ?? buildPersonalizedExercises(program.exercises, assessment);

      const newState = {
        ...prev,
        name: assessment.name || prev.name,
        assessment: { ...assessment, completed: true, programId },
        programId,
        sessionsPerWeek: program.sessionsPerWeek,
        activeExercises: _initExercises,
        activeTemplates: _builtTemplates,
        currentDayIndex: _initDayIndex,
        trainingDays: assessment.trainingDays,
        dayTemplates: null, // always clear so stale split templates never bleed into new program
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
      pendingAssessmentSave.current = newState;
      return newState;
    });

    // Cloud save and the onSaved callback run *after* the update commits.
    // Firing them from inside the updater meant StrictMode's double-invoke sent
    // two cloud writes and two onboarding agent triggers.
    const newState = pendingAssessmentSave.current;
    if (userId && newState) {
      cancelCloudDebounce();
      cloudSet(userId, newState).then(() => { if (onSaved) onSaved(); });
    } else if (onSaved) {
      setTimeout(onSaved, 0);
    }
    pendingAssessmentSave.current = null;
  }, [userId]);

  // ── changeProgram ──────────────────────────────────────────────────────
  // Switches to a new program while preserving weights for shared exercises.
  const changeProgram = useCallback((newProgramId) => {
    const program = getProgramById(newProgramId);
    if (!program) return;
    setStateWithSync(prev => {
      // Merge: keep existing weights for exercises that appear in the new program
      const { liftWeights: freshWeights, liftHistory: freshHistory } = buildInitialWeights(program);
      const mergedWeights = { ...freshWeights, ...prev.liftWeights };
      const mergedHistory = {};
      for (const ex of program.exercises) {
        mergedHistory[ex.id] = prev.liftHistory?.[ex.id] || [];
      }
      return {
        ...prev,
        programId: program.id,
        activeExercises: buildPersonalizedExercises(program.exercises, prev.assessment),
        activeTemplates: program.templates
          ? program.templates.map(t => ({ ...t, exercises: buildPersonalizedExercises(t.exercises, prev.assessment) }))
          : null,
        sessionsPerWeek: program.sessionsPerWeek,
        liftWeights: mergedWeights,
        liftHistory: mergedHistory,
        assessment: { ...prev.assessment, programId: program.id },
        dayTemplates: null, // clear stale AI templates so new program's split is shown correctly
      };
    });
    showToast(`Program changed to ${program.name}`);
  }, [setStateWithSync, showToast]);

  // ── swapExercise ──────────────────────────────────────────────────────────
  // `sessionDayKey` is the day the UI is actually showing — on a rest-day
  // override that is the *next* training day, not today. Defaults to today so
  // existing call sites keep their behaviour.
  const swapExercise = useCallback((oldId, newEx, sessionDayKey) => {
    setStateWithSync(prev => {
      const liftWeights = { ...prev.liftWeights };
      if (liftWeights[newEx.id] == null) liftWeights[newEx.id] = newEx.startKg ?? 0;

      const dayKey = sessionDayKey || todayDayKey();
      const dayTemplates = prev.dayTemplates || {};
      const dayTemplate = dayTemplates[dayKey];

      // Swap takes the incoming exercise's own prescription. Carrying the old
      // one over meant Plank -> Barbell Squat rendered as "3 x 0 reps @ 45kg"
      // with the plank's coaching note still attached.
      const replaceAt = (list, idx) => {
        const previous = list[idx];
        const sameKind = !!previous.isPlank === !!newEx.isPlank;
        const prescription = buildPrescription(newEx.id, {
          preserveSets: sameKind ? previous.sets : undefined,
        });
        return { ...prescription, ...newEx, sets: prescription.sets, note: prescription.note };
      };

      const appended = () => {
        const prescription = buildPrescription(newEx.id);
        return { ...prescription, ...newEx, sets: prescription.sets, note: prescription.note };
      };

      if (dayTemplate?.exercises?.length > 0) {
        const exList = dayTemplate.exercises;
        let updatedExercises;
        if (oldId === '__add__') {
          updatedExercises = [...exList, appended()];
        } else {
          const idx = exList.findIndex(e => e.id === oldId);
          if (idx === -1) return prev;
          updatedExercises = [...exList];
          updatedExercises[idx] = replaceAt(exList, idx);
        }
        return {
          ...prev, liftWeights,
          dayTemplates: { ...dayTemplates, [dayKey]: { ...dayTemplate, exercises: updatedExercises } },
        };
      }

      // Legacy activeExercises path
      if (oldId === '__add__') {
        return { ...prev, activeExercises: [...(prev.activeExercises || []), appended()], liftWeights };
      }
      const idx = (prev.activeExercises || []).findIndex(e => e.id === oldId);
      if (idx === -1) return prev;
      const updated = [...prev.activeExercises];
      updated[idx] = replaceAt(prev.activeExercises, idx);
      return { ...prev, activeExercises: updated, liftWeights };
    });
    showToast(oldId === '__add__' ? `Added ${newEx.name}` : `Swapped to ${newEx.name}`);
  }, [setStateWithSync, showToast]);

  // ── deleteExercise ────────────────────────────────────────────────────────
  const deleteExercise = useCallback((exId, sessionDayKey) => {
    setStateWithSync(prev => {
      const dayKey = sessionDayKey || todayDayKey();
      const dayTemplates = prev.dayTemplates || {};
      const dayTemplate = dayTemplates[dayKey];

      if (dayTemplate?.exercises?.length > 0) {
        return {
          ...prev,
          dayTemplates: {
            ...dayTemplates,
            [dayKey]: { ...dayTemplate, exercises: dayTemplate.exercises.filter(e => e.id !== exId) },
          },
        };
      }
      return { ...prev, activeExercises: (prev.activeExercises || []).filter(e => e.id !== exId) };
    });
    showToast('Exercise removed');
  }, [setStateWithSync, showToast]);

  const addAIEpisodic = useCallback((note) => {
    let nextState;
    setState(prev => {
      nextState = {
        ...prev,
        aiEpisodic: [...(prev.aiEpisodic || []), {
          id: `ep_${Date.now()}`,
          ...note,
          createdAt: new Date().toISOString().slice(0, 10),
        }].slice(-200),
      };
      return nextState;
    });
    setTimeout(() => { if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); } }, 50);
  }, [setState, userId]);

  const completeExercise = useCallback((exId, sets, sessionDayKey) => {
    let pendingXP = 0;
    let pendingPR = false;
    let pendingReasons = [];
    setState(prev => {
      const isDeload = isDeloadWeek(prev.currentWeek);
      let vol = 0, maxRPE = 0, setsCompleted = 0;
      let maxWeightUsed = 0;
      let totalRPE = 0, rpeCount = 0;
      const repsPerSet = [];

      sets.forEach(s => {
        if (s.done) {
          setsCompleted++;
          repsPerSet.push(Number(s.reps) || 0);
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
      const xp = Math.min(DAILY_XP_CAP - dailyEarned, Math.max(5, adherenceXP));
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

      // 2-for-2 rule: resolve against the session the user is actually logging,
      // which on a rest-day override is not today's (empty) template.
      const ex = exercisesForDay(prev, sessionDayKey || todayDayKey()).find(e => e.id === exId);
      const targetReps = ex?.repMax ?? ex?.reps ?? 10;
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
        [exId]: { setsCompleted, setsPrescribed: baseSets, extraSets, volume: vol, maxRPE, maxWeight: maxWeightUsed, repsPerSet }
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
      if (pendingPR) setTimeout(() => showToast(`🏅 NEW PR: ${lookupExName(exId)}!`), 1200);
    }, 50);
  }, [setState, addXP, showToast]);

  const finishSession = useCallback((sessionDayKey) => {
    if (isFinishingSession.current) return;
    isFinishingSession.current = true;
    let pendingXP = 0;
    let pendingAdvance = null;
    setState(prev => {
      if (prev.todaySessionFinished) return prev;
      const w = prev.currentWeek;
      const isDeload = isDeloadWeek(w);

      // Resolve the exercises that were actually on screen. Scoring completion
      // against a different list than the user saw is what made the finish
      // summary disagree with the card list on a rest-day override.
      const dayKey = sessionDayKey || todayDayKey();
      const exercises = exercisesForDay(prev, dayKey);

      const doneCount = (prev.todayExDone || []).length;
      const totalEx = exercises.length || 7;
      const completionPct = Math.round((doneCount / totalEx) * 100);
      const missedCount = Math.max(0, totalEx - doneCount);

      // Session-level adherence bonuses (prescribed day + overall RPE quality)
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3);
      const matchesPrescribedDay = (prev.trainingDays || []).some(d => d.toLowerCase().startsWith(todayStr));
      const details = Object.values(prev.todayExDetails || {});
      const rpeValues = details.map(d => d.maxRPE).filter(r => r > 0);
      const avgSessionRPE = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : 0;

      let sessionBonus = Math.max(10, 50 - missedCount * 8);
      if (matchesPrescribedDay) sessionBonus += 30;
      if (avgSessionRPE >= 6 && avgSessionRPE <= 9) sessionBonus += 20;
      const bonusXP = sessionBonus;

      // ── Overtraining check (Phase 2.4) ──
      const weekProgress = { ...prev.weekProgress };
      if (!weekProgress[w]) weekProgress[w] = { count: 0, dates: [], completed: false, sessions: [] };
      const currentWeekSessions = weekProgress[w].count || 0;
      const programFrequency = prev.sessionsPerWeek || 3;
      const ot = overtrainingCheck({ completedSessions: currentWeekSessions }, programFrequency);

      // Apply overtraining multiplier and daily cap
      const adjustedXP = Math.round(bonusXP * ot.xpMultiplier);
      const dailyEarned = prev.dailyXPEarned || 0;
      pendingXP = Math.min(DAILY_XP_CAP - dailyEarned, adjustedXP);
      if (pendingXP < 0) pendingXP = 0;

      const updatedWithStreak = updateStreak(prev);

      const wp = { ...weekProgress[w] };
      wp.count = (wp.count || 0) + 1;
      wp.dates = [...(wp.dates || []), today()];
      wp.completedDays = [...(wp.completedDays || []), dayKey]; // track which calendar days were trained
      wp.sessions = [...(wp.sessions || []), {
        date: today(), dayKey, exercisesDone: [...(prev.todayExDone || [])], completion: completionPct
      }];

      const sessionsNeeded = prev.sessionsPerWeek || 3;
      let nextWeek = w;
      if (wp.count >= sessionsNeeded && !wp.completed) {
        wp.completed = true;
        if (isDeload) setTimeout(() => showToast('🧘 Deload complete! Great recovery week.'), 500);
        nextWeek = w + 1;
        const cycleWeek = ((w - 1) % 12) + 1;
        if (cycleWeek === 12) {
          setTimeout(() => showToast('🏆 CYCLE COMPLETE! Week ' + (w + 1) + ' begins — keep lifting! ⚔️'), 1000);
        } else {
          setTimeout(() => showToast(`Week ${w} COMPLETE! → Week ${w + 1} 🎉`), 1000);
        }
        pendingAdvance = nextWeek;
      }
      weekProgress[w] = wp;

      const logEntry = {
        name: `Session ${wp.count}/${sessionsNeeded} • ${doneCount}/${totalEx} exercises (${completionPct}%)`,
        xp: bonusXP, date: today(), type: 'session', week: w,
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        exerciseDetails: { ...prev.todayExDetails },
        exercisesDone: [...(prev.todayExDone || [])],
        dayKey,
      };

      // Compute next day index by calendar, not counter, so activeExercises
      // stays aligned even when sessions are skipped or done out of order.
      // Uses calendar sort to find next day, then maps back to original
      // trainingDays order so activeTemplates indices stay correct.
      const _dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const _origTdays = prev.trainingDays || ['mon', 'wed', 'fri'];
      const _sortedTdays = _origTdays.slice().sort((a, b) => _dayOrder.indexOf(a) - _dayOrder.indexOf(b));
      const _todaySortedIdx = _sortedTdays.indexOf(dayKey);
      const _nextSortedIdx = _todaySortedIdx >= 0
        ? (_todaySortedIdx + 1) % _sortedTdays.length
        : -1;
      const _nextDayKey = _nextSortedIdx >= 0 ? _sortedTdays[_nextSortedIdx] : null;
      // Map next day back to its position in the original (unsorted) trainingDays,
      // because activeTemplates was built in that same original order.
      const _nextOrigIdx = _nextDayKey ? _origTdays.indexOf(_nextDayKey) : -1;
      const nextDayIndex = prev.activeTemplates
        ? (_nextOrigIdx >= 0 ? _nextOrigIdx : (prev.currentDayIndex + 1) % prev.activeTemplates.length) % prev.activeTemplates.length
        : 0;

      return {
        ...updatedWithStreak,
        todaySessionFinished: true,
        currentDayIndex: nextDayIndex,
        activeExercises: prev.activeTemplates
          ? prev.activeTemplates[nextDayIndex].exercises
          : prev.activeExercises,
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + (prev.sessionStartTime
          ? Math.max(5, Math.min(300, Math.round((Date.now() - prev.sessionStartTime) / 60000)))
          : 50),
        perfectWeeks: (wp.count >= sessionsNeeded && !prev.weekProgress[w]?.completed) ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        deloadDone: isDeload && wp.count >= sessionsNeeded ? true : prev.deloadDone,
        weekProgress,
        currentWeek: nextWeek,
        // The new week begins the day *after* the session that closed the old
        // one; anchoring it to today made today's weekday look missed tomorrow.
        currentWeekStartDate: nextWeek !== w ? tomorrow() : (prev.currentWeekStartDate || today()),
        sessionStartTime: null,
        dailySessionCount: (prev.dailySessionCount || 0) + 1,
        dailyXPEarned: (prev.dailyXPEarned || 0) + pendingXP,
        log: pruneOldEntries([...prev.log, logEntry])
      };
    });
    // Immediately push to cloud — session data is too important to leave to the 3s debounce.
    // If the app backgrounds within that window the cloud save never fires and the session is lost.
    setTimeout(() => {
      if (userId) {
        setStateRaw(prev => { cancelCloudDebounce(); cloudSet(userId, prev); return prev; });
      }
    }, 200);
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
  }, [setState, addXP, showToast, userId]);

  const submitCheckin = useCallback((weight, waist, sleep) => {
    let nextState;
    setState(prev => {
      const entry = { week: prev.currentWeek, weight, waist: waist || 0, sleep: sleep || 0, date: today() };
      const isUpdate = prev.weeklyCheckins.some(c => c.week === prev.currentWeek);
      const logEntry = {
        name: `Week ${prev.currentWeek} Check-in: ${weight} ${prev.unit}`,
        xp: isUpdate ? 0 : 25, date: today(), type: 'checkin',
        dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      };
      // Recalculate BMI from the new weight (height stays fixed from assessment)
      const weightKg = prev.unit === 'lbs' ? weight / 2.205 : weight;
      const { bmi } = calcBMI(weightKg, prev.assessment?.heightCm);
      nextState = {
        ...prev,
        bmi: bmi || prev.bmi,
        checkins: isUpdate ? prev.checkins : prev.checkins + 1,
        // Replace any existing entry for this week rather than appending
        weeklyCheckins: [
          ...prev.weeklyCheckins.filter(c => c.week !== prev.currentWeek),
          entry,
        ],
        log: pruneOldEntries([...prev.log, logEntry])
      };
      return nextState;
    });
    // Force-save immediately — don't wait for the debounced auto-save
    setTimeout(() => {
      if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); }
      addXP(25);
    }, 50);
  }, [setState, addXP, userId]);

  const updateSetting = useCallback((key, value) => {
    let nextState;
    setState(prev => { nextState = { ...prev, [key]: value }; return nextState; });
    setTimeout(() => { if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); } }, 50);
  }, [setState, userId]);

  const resetToday = useCallback(() => {
    setState(prev => {
      // Restore currentDayIndex and activeExercises back to today's calendar slot
      // so the workout shown after reset is today's session, not the "next" day
      // that finishSession advanced to.
      const _dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = _dayOrder[new Date().getDay()];
      const _origTdays = prev.trainingDays || ['mon', 'wed', 'fri'];
      const todayOrigIdx = _origTdays.indexOf(todayKey);

      let currentDayIndex = prev.currentDayIndex;
      let activeExercises = prev.activeExercises;

      if (todayOrigIdx >= 0 && prev.activeTemplates?.length > 0) {
        currentDayIndex = todayOrigIdx % prev.activeTemplates.length;
        activeExercises = prev.activeTemplates[currentDayIndex].exercises;
      } else if (prev.dayTemplates?.[todayKey]?.exercises?.length > 0) {
        activeExercises = prev.dayTemplates[todayKey].exercises;
      }

      // ── Roll back a session that was already banked today ──
      //
      // This used to clear only the scratch fields (todayExDone,
      // todaySessionFinished), leaving weekProgress untouched. The day stayed
      // green in the week strip while the Train tab offered the session again,
      // and finishing it a second time counted it twice — which could complete
      // the week early and advance currentWeek off a single real session.
      const todayStr = today();
      const weekProgress = { ...prev.weekProgress };
      let rolledBack = null;

      // Search for the week holding today's session rather than assuming
      // prev.currentWeek: when a session completes a week, currentWeek has
      // already advanced past the week that session belongs to.
      for (const key of Object.keys(weekProgress)) {
        const wp = weekProgress[key];
        const idx = (wp?.sessions || []).findIndex(s => s.date === todayStr);
        if (idx === -1) continue;

        const session = wp.sessions[idx];
        const dayKey = session.dayKey || todayKey;

        // Remove one occurrence only — the same weekday legitimately appears
        // in other weeks, and dates/completedDays are parallel history.
        const completedDays = [...(wp.completedDays || [])];
        const dayIdx = completedDays.lastIndexOf(dayKey);
        if (dayIdx !== -1) completedDays.splice(dayIdx, 1);

        const dates = [...(wp.dates || [])];
        const dateIdx = dates.lastIndexOf(todayStr);
        if (dateIdx !== -1) dates.splice(dateIdx, 1);

        const count = Math.max(0, (wp.count || 0) - 1);
        const sessionsNeeded = prev.sessionsPerWeek || 3;

        weekProgress[key] = {
          ...wp,
          sessions: wp.sessions.filter((_, i) => i !== idx),
          completedDays,
          dates,
          count,
          completed: count >= sessionsNeeded,
        };
        rolledBack = { week: Number(key), dayKey, wasCompleted: !!wp.completed };
        // Let the day be re-recorded; the guard is what makes backfill refuse
        // a day it has already seen this session.
        _backfillGuard.delete(`${key}_${dayKey}`);
        break;
      }

      // backfillLock is the persisted half of that guard — without clearing it
      // too, hydrateBackfillGuard would re-block the day on the next reload.
      let backfillLock = prev.backfillLock;
      if (rolledBack) {
        const locked = prev.backfillLock?.[rolledBack.week];
        if (Array.isArray(locked) && locked.includes(rolledBack.dayKey)) {
          backfillLock = {
            ...prev.backfillLock,
            [rolledBack.week]: locked.filter(d => d !== rolledBack.dayKey),
          };
        }
      }

      // If finishing that session is what advanced the week, come back to it.
      let currentWeek = prev.currentWeek;
      let currentWeekStartDate = prev.currentWeekStartDate;
      if (rolledBack && rolledBack.wasCompleted && !weekProgress[rolledBack.week].completed
          && prev.currentWeek > rolledBack.week) {
        currentWeek = rolledBack.week;
        // finishSession stamps currentWeekStartDate = today when it advances,
        // so the week we are returning to began roughly a week before that.
        // Only the start-of-week anchor for skipped-day maths depends on this.
        if (currentWeekStartDate) {
          const back = new Date(currentWeekStartDate);
          if (!isNaN(back)) {
            back.setDate(back.getDate() - 7);
            currentWeekStartDate = back.toISOString().slice(0, 10);
          }
        }
      }

      // XP granted today is tracked exactly by dailyXPEarned (both
      // completeExercise and finishSession add the post-cap amount, and the
      // day rollover zeroes it), so it can be removed without guessing.
      const dailyEarned = prev.dailyXPEarned || 0;
      const { xp, totalXp, level } = removeXP(prev, dailyEarned);

      return {
        ...prev,
        todayExDone: [], todayExDetails: {},
        todaySessionFinished: false, sessionStartTime: null,
        currentDayIndex, activeExercises,
        weekProgress, currentWeek, currentWeekStartDate, backfillLock,
        totalSessions: Math.max(0, (prev.totalSessions || 0) - (rolledBack ? 1 : 0)),
        perfectWeeks: Math.max(0, (prev.perfectWeeks || 0)
          - (rolledBack?.wasCompleted && !weekProgress[rolledBack.week].completed ? 1 : 0)),
        totalXp, level, xp, dailyXPEarned: 0,
        // Today's entries describe work that no longer exists.
        log: (prev.log || []).filter(l => l.date !== todayStr),
      };
    });
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
    let nextState;
    setState(prev => {
      nextState = { ...prev, mealLogs: pruneOldEntries([...(prev.mealLogs || []), meal]) };
      return nextState;
    });
    setTimeout(() => { if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); } }, 50);
    showToast(`Meal logged — ${meal.totals.calories} kcal ✓`);
  }, [setState, showToast, userId]);

  const deleteMeal = useCallback((mealId) => {
    let nextState;
    setState(prev => {
      nextState = { ...prev, mealLogs: (prev.mealLogs || []).filter(m => m.id !== mealId) };
      return nextState;
    });
    setTimeout(() => { if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); } }, 50);
    showToast('Meal deleted');
  }, [setState, showToast, userId]);

  // ── Recovery check-in (Phase 4.4) ──
  const logRecovery = useCallback((scores) => {
    let nextState;
    setState(prev => {
      nextState = {
        ...prev,
        recoveryScores: [
          ...(prev.recoveryScores || []).slice(-30),
          { date: new Date().toISOString().slice(0, 10), ...scores }
        ]
      };
      return nextState;
    });
    setTimeout(() => { if (userId && nextState) { cancelCloudDebounce(); cloudSet(userId, nextState); } }, 50);
  }, [setState, userId]);

  // ── Daily habits tracking (Phase 4.5) ──
  const updateDailyHabits = useCallback((habits) => {
    setState(prev => ({
      ...prev,
      dailyHabits: { ...(prev.dailyHabits || {}), ...habits }
    }));
  }, [setState]);

  // Backfill ONE specific training-day session for a given week.
  // Call once per day you want to log — each call is independently guarded.
  /**
   * Record a training day as deliberately missed.
   *
   * Until now the only way to resolve a missed day was backfillWeek, which
   * logs it as *done* — crediting a session, XP and volume the user never
   * did. With no honest alternative, a week that lost a day could never reach
   * `completed`, so currentWeek never advanced and the user was pinned to it.
   *
   * A skipped day closes the slot without crediting anything: no session, no
   * XP, no streak, no volume. It only lets the week finish.
   */
  const markDaySkipped = useCallback((week, dayKey, skipped = true) => {
    setState(prev => {
      const wp = prev.weekProgress?.[week]
        || { count: 0, dates: [], completed: false, sessions: [], completedDays: [] };

      // A day that was actually trained is not a candidate — clear the session
      // first if the intent is to undo it.
      if (skipped && (wp.completedDays || []).includes(dayKey)) return prev;

      const skippedDays = skipped
        ? [...new Set([...(wp.skippedDays || []), dayKey])]
        : (wp.skippedDays || []).filter(d => d !== dayKey);

      const sessionsNeeded = prev.sessionsPerWeek || 3;
      const completed = (wp.count || 0) + skippedDays.length >= sessionsNeeded;
      const weekProgress = { ...prev.weekProgress, [week]: { ...wp, skippedDays, completed } };

      // Mirror finishSession: completing the current week moves it on. Without
      // this the user would have to wait for the next day-reset to be released.
      let currentWeek = prev.currentWeek;
      let currentWeekStartDate = prev.currentWeekStartDate;
      if (completed && week === prev.currentWeek) {
        currentWeek = prev.currentWeek + 1;
        currentWeekStartDate = tomorrow();
      } else if (!completed && week < prev.currentWeek && !skipped) {
        // Un-skipping a day that was holding a past week complete reopens it,
        // but we deliberately do not drag currentWeek backwards — later weeks
        // may already hold real sessions.
      }

      return { ...prev, weekProgress, currentWeek, currentWeekStartDate };
    });
    showToast(skipped ? 'Day marked as skipped' : 'Skip removed');
  }, [setState, showToast]);

  /**
   * Remove a day that is recorded as trained from a week.
   *
   * Nothing could do this. backfillWeek only adds, markDaySkipped refuses a
   * completed day, and resetToday reaches only today — so a day recorded by
   * mistake (a mis-aimed backfill, or the double-count the reset bug used to
   * produce) was permanent. Clearing it returns the day to "missed", from
   * where it can be made up or marked skipped.
   *
   * Lifetime XP and level are deliberately left alone. weekProgress.sessions
   * carries no per-session XP, and the log's figure is the pre-cap bonus
   * rather than what was actually granted, so any subtraction here would be a
   * guess — and guessing low on someone's rank is worse than leaving a banked
   * total intact. The confirm copy says so explicitly.
   */
  const clearDayProgress = useCallback((week, dayKey) => {
    setState(prev => {
      const wp = prev.weekProgress?.[week];
      if (!wp) return prev;

      const sessions = wp.sessions || [];
      const idx = sessions.findIndex(s => (s.dayKey || null) === dayKey);
      const hadDay = (wp.completedDays || []).includes(dayKey) || idx !== -1;
      if (!hadDay) return prev;

      const completedDays = (wp.completedDays || []).filter(d => d !== dayKey);

      // Drop the matching session and its date entry, keeping the two arrays
      // aligned. Only one occurrence: a week can hold the same weekday twice
      // if it was double-counted, and clearing should undo one at a time.
      let dates = [...(wp.dates || [])];
      let nextSessions = sessions;
      if (idx !== -1) {
        const removed = sessions[idx];
        nextSessions = sessions.filter((_, i) => i !== idx);
        const dateIdx = removed?.date ? dates.lastIndexOf(removed.date) : -1;
        if (dateIdx !== -1) dates.splice(dateIdx, 1);
      } else if (dates.length) {
        dates = dates.slice(0, -1);
      }

      const count = Math.max(0, (wp.count || 0) - 1);
      const sessionsNeeded = prev.sessionsPerWeek || 3;
      const skippedDays = (wp.skippedDays || []).filter(d => d !== dayKey);
      const completed = count + skippedDays.length >= sessionsNeeded;

      // Release both halves of the backfill guard so the day can be recorded
      // again — otherwise backfill would refuse a day this just freed.
      _backfillGuard.delete(`${week}_${dayKey}`);
      const locked = prev.backfillLock?.[week];
      const backfillLock = Array.isArray(locked) && locked.includes(dayKey)
        ? { ...prev.backfillLock, [week]: locked.filter(d => d !== dayKey) }
        : prev.backfillLock;

      return {
        ...prev,
        weekProgress: {
          ...prev.weekProgress,
          [week]: { ...wp, completedDays, dates, sessions: nextSessions, skippedDays, count, completed },
        },
        backfillLock,
        totalSessions: Math.max(0, (prev.totalSessions || 0) - 1),
        perfectWeeks: Math.max(0, (prev.perfectWeeks || 0) - (wp.completed && !completed ? 1 : 0)),
      };
    });
    showToast('Day cleared');
  }, [setState, showToast]);

  const backfillWeek = useCallback((week, dayKey, completionPct = 100, customWeights = {}, customSets = {}, durationMins = 50) => {
    const guardKey = `${week}_${dayKey}`;
    if (_backfillGuard.has(guardKey)) {
      showToast(`${dayKey} already recorded for week ${week}`);
      return;
    }
    _backfillGuard.add(guardKey);

    setStateRaw(prev => {
      // Double-check against persisted state (handles page refresh)
      const existingDays = prev.weekProgress?.[week]?.completedDays || [];
      if (existingDays.includes(dayKey)) return prev;

      const _dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const _dayLabel = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

      // Compute a realistic date: go back (currentWeek − week) weeks then
      // snap to the target weekday within that week.
      const weeksBack = (prev.currentWeek || 1) - week;
      const d = new Date();
      d.setDate(d.getDate() - weeksBack * 7);
      const targetDow = _dayOrder.indexOf(dayKey);
      const diff = targetDow - d.getDay();
      d.setDate(d.getDate() + diff);
      const fakeDateStr = d.toISOString().slice(0, 10);

      const doneExIds = Object.entries(customSets)
        .filter(([, sets]) => sets > 0)
        .map(([exId]) => exId);

      const prevWp = prev.weekProgress?.[week] || { count: 0, dates: [], completed: false, sessions: [], completedDays: [] };
      const prevCompleted = prevWp.completed || false;
      const newCount = (prevWp.count || 0) + 1;
      const sessionsNeeded = prev.sessionsPerWeek || 3;
      const completed = newCount >= sessionsNeeded;

      const newWp = {
        ...prevWp,
        count: newCount,
        dates: [...(prevWp.dates || []), fakeDateStr],
        completedDays: [...existingDays, dayKey],
        sessions: [...(prevWp.sessions || []), {
          date: fakeDateStr, dayKey, exercisesDone: doneExIds, completion: completionPct,
        }],
        completed,
      };

      const sessionXp = Math.round(60 * (completionPct / 100));
      const { xp, totalXp, level } = applyXP(prev, sessionXp);

      let addedVolume = 0;
      Object.entries(customSets).forEach(([exId, sets]) => {
        if (!sets || sets <= 0) return;
        const reps = { squat: 10, bench: 10, rdl: 8, pulldown: 10, ohp: 12, legcurl: 15 }[exId] || 10;
        const wt = customWeights[exId] ?? prev.liftWeights?.[exId] ?? 0;
        addedVolume += sets * reps * wt;
      });

      const totalExCount = Object.keys(customSets).length || 7;
      const logEntry = {
        name: `Session ${newCount}/${sessionsNeeded} • ${doneExIds.length}/${totalExCount} exercises (${completionPct}%) [backfill]`,
        xp: sessionXp, date: fakeDateStr, type: 'session', week,
        dateStr: `Week ${week} ${_dayLabel[dayKey] || dayKey} (backfill)`,
      };

      // backfillLock stores array of locked day keys per week
      const prevLockDays = Array.isArray(prev.backfillLock?.[week]) ? prev.backfillLock[week] : [];

      // Auto-advance currentWeek when backfill completes the current week
      const nextWeek = (completed && !prevCompleted && week === prev.currentWeek)
        ? prev.currentWeek + 1
        : prev.currentWeek;

      const updatedState = {
        ...prev, xp, totalXp, level,
        weekProgress: { ...prev.weekProgress, [week]: newWp },
        liftWeights: { ...prev.liftWeights, ...customWeights },
        currentWeek: nextWeek,
        currentWeekStartDate: nextWeek !== prev.currentWeek ? tomorrow() : (prev.currentWeekStartDate || today()),
        backfillLock: { ...prev.backfillLock, [week]: [...prevLockDays, dayKey] },
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + durationMins,
        totalVolume: prev.totalVolume + addedVolume,
        perfectWeeks: completed && !prevCompleted ? (prev.perfectWeeks || 0) + 1 : prev.perfectWeeks,
        log: pruneOldEntries([...prev.log, logEntry]),
      };

      const newlyUnlocked = checkAchievements(updatedState);
      if (newlyUnlocked.length > 0) {
        updatedState.achDone = [...(prev.achDone || []), ...newlyUnlocked];
        newlyUnlocked.forEach((id, idx) => {
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          setTimeout(() => showToast(`🏆 ${ach?.name || 'Achievement'} unlocked!`), 1500 + idx * 2000);
        });
      }

      setTimeout(() => showToast(`Week ${week} ${_dayLabel[dayKey]} backfilled ✓`), 0);
      return updatedState;
    });

    if (userId) {
      setTimeout(() => {
        setStateRaw(prev => { cancelCloudDebounce(); cloudSet(userId, prev); return prev; });
      }, 50);
    }
  }, [setStateRaw, showToast, userId]);

  // ── Helper: apply the full cloud+local merge into a state object ──
  function applyCloudMerge(localData, cloudData) {
    const cloudModified = cloudData.lastDate || '';
    const localModified = localData.lastDate || '';
    const baseData = cloudModified >= localModified ? cloudData : localData;
    const merged = checkQuestReset(checkDayReset(mergeState(baseData)));
    // Union log (cloud first so cloud entries win dedup)
    const seenDates = new Set();
    merged.log = [...(cloudData.log || []), ...(localData.log || [])].filter(e => {
      const key = e.dateStr || e.date;
      if (seenDates.has(key)) return false;
      seenDates.add(key);
      return true;
    }).slice(-200);
    // Maximums
    merged.totalXp = Math.max(cloudData.totalXp || 0, localData.totalXp || 0);
    merged.level = Math.max(cloudData.level || 1, localData.level || 1);
    merged.xp = Math.max(0, merged.totalXp - xpToLevel(merged.level));
    merged.totalSessions = Math.max(cloudData.totalSessions || 0, localData.totalSessions || 0);
    merged.currentWeek = Math.max(cloudData.currentWeek || 1, localData.currentWeek || 1);
    merged.checkins = Math.max(cloudData.checkins || 0, localData.checkins || 0);
    merged.achDone = [...new Set([...(cloudData.achDone || []), ...(localData.achDone || [])])];
    // Union check-ins
    const ciMap = new Map();
    (cloudData.weeklyCheckins || []).forEach(c => ciMap.set(c.week, c));
    (localData.weeklyCheckins || []).forEach(c => ciMap.set(c.week, c));
    merged.weeklyCheckins = [...ciMap.values()].sort((a, b) => a.week - b.week);
    // Union weekProgress — never drop sessions from either source
    const mergedWP = { ...(baseData.weekProgress || {}) };
    const otherWP = ((baseData === cloudData) ? localData : cloudData).weekProgress || {};
    for (const [week, other] of Object.entries(otherWP)) {
      if (!mergedWP[week]) {
        mergedWP[week] = other;
      } else {
        const base = mergedWP[week];
        const sMap = new Map();
        [...(base.sessions || []), ...(other.sessions || [])].forEach(s => {
          const k = `${s.dayKey || ''}-${s.date || ''}`;
          if (!sMap.has(k)) sMap.set(k, s);
        });
        mergedWP[week] = {
          ...base,
          count: Math.max(base.count || 0, other.count || 0),
          completedDays: [...new Set([...(base.completedDays || []), ...(other.completedDays || [])])],
          dates: [...new Set([...(base.dates || []), ...(other.dates || [])])],
          completed: base.completed || other.completed,
          sessions: [...sMap.values()],
        };
      }
    }
    merged.weekProgress = mergedWP;
    // Union arrays
    merged.mealLogs = unionArrays(cloudData.mealLogs, localData.mealLogs, m => m.id).slice(-500);
    merged.aiEpisodic = unionArrays(cloudData.aiEpisodic, localData.aiEpisodic, e => e.id);
    merged.recoveryScores = unionArrays(cloudData.recoveryScores, localData.recoveryScores, r => r.date).slice(-90);
    merged.aiCoachHistory = (localData.aiCoachHistory || []).length >= (cloudData.aiCoachHistory || []).length
      ? (localData.aiCoachHistory || []) : (cloudData.aiCoachHistory || []);
    return merged;
  }

  const syncFromCloud = useCallback(async () => {
    if (!userId) { showToast('Sign in to sync from cloud.'); return; }
    setSyncing(true);
    try {
      const result = await cloudGetResult(userId);

      // "No cloud data found" used to be shown for a failed read too, which is
      // both wrong and alarming — it reads as "your account is empty" when the
      // truth is we could not reach it.
      if (!result.ok) {
        showToast('Could not reach the cloud — nothing changed.');
        setSyncing(false);
        return;
      }

      const cloudData = result.data;
      if (!cloudData || Object.keys(cloudData).length === 0) {
        // The cloud genuinely has nothing. If this device does, that is the
        // surviving copy — push it up rather than reporting an empty account.
        if (!isEmptyState(state)) {
          markCloudLoadSettled(userId);
          cancelCloudDebounce();
          await cloudSet(userId, state);
          setLastSyncedAt(Date.now());
          showToast('Cloud was empty — this device\'s progress uploaded ✓');
        } else {
          showToast('No cloud data found.');
        }
        setSyncing(false);
        return;
      }
      setStateRaw(prev => {
        const merged = applyCloudMerge(prev, cloudData);
        storageSet(merged, userId);
        cancelCloudDebounce();
        cloudSet(userId, merged);
        return merged;
      });
      setLastSyncedAt(Date.now());
      showToast('Synced from cloud ✓');
    } catch (e) {
      showToast('Sync failed — check your connection.');
      console.error('[syncFromCloud]', e);
    } finally {
      setSyncing(false);
    }
    // `state` is read above for the empty-cloud recovery path, so it must be a
    // dependency — a stale closure would upload an out-of-date snapshot.
  }, [userId, showToast, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const importData = useCallback((data) => {
    if (!data || typeof data !== 'object' ||
        typeof data.currentWeek !== 'number' ||
        typeof data.level !== 'number' ||
        !Array.isArray(data.log)) {
      showToast('Invalid backup: missing required fields.');
      return;
    }
    const merged = checkQuestReset(checkDayReset(mergeState(data)));
    storageSet(merged, userId);
    if (userId) { cancelCloudDebounce(); cloudSet(userId, merged); }
    backfillApplied.current = {};
    setStateRaw(merged);
    showToast('Progress restored from backup! ✓');
  }, [showToast, userId]);

  /**
   * Dismiss the cloud-sync splash and run on local data.
   *
   * `state` is already hydrated from localStorage by the useState initializer,
   * so there is something to show. The in-flight cloudGet is left alone — if it
   * lands later its result is simply ignored for this session, and the next
   * auto-save pushes local state up. This exists so a stalled network can never
   * strand the user on a screen with no controls.
   */
  const continueOffline = useCallback(() => setCloudLoading(false), []);

  /**
   * Retry a cloud load that failed, without reloading the app.
   *
   * Re-runs the same read the mount effect does. On success the account is
   * restored and the write gate opens; on failure nothing changes and the
   * gate stays shut, so a retry can never make things worse.
   */
  const retryCloudLoad = useCallback(() => {
    setCloudLoadFailed(false);
    setRetryNonce(n => n + 1);
  }, []);

  return {
    state, setState, cloudLoading, cloudLoadFailed, continueOffline, retryCloudLoad,
    toast, showToast,
    addXP,
    resetAll, resetToday,
    startSession, backfillWeek, markDaySkipped, clearDayProgress,
    completeExercise, finishSession,
    submitCheckin, updateSetting,
    addAIHistory, addAIEpisodic,
    incrementQuestMessages,
    logMeal, deleteMeal,
    logRecovery, updateDailyHabits,
    importData, completeAssessment, changeProgram,
    swapExercise, deleteExercise,
    syncFromCloud, lastSyncedAt, syncing,
  };
}
