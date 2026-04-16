/**
 * State Version Migration System (Phase 5.1)
 *
 * Each migration transforms state from version N to N+1.
 * Migrations add missing fields with sensible defaults — never break existing data.
 */

import { selectProgram, getProgramById } from '../data/programs';
import { applySubstitutions, applyCompetencySubstitutions } from './exerciseSubstitutions';

const CURRENT_VERSION = 2;

const migrations = {
  1: (state) => {
    // Backfill activeExercises for existing users who never had it set
    let activeExercises = state.activeExercises;
    let programId = state.programId;
    if (!activeExercises && state.assessment?.completed) {
      try {
        programId = selectProgram(state.assessment);
        const program = getProgramById(programId);
        if (program) {
          let exs = [...program.exercises];
          exs = applyCompetencySubstitutions(exs, state.assessment?.movementCompetency);
          exs = applySubstitutions(exs, state.assessment?.painRegions);
          activeExercises = exs;
        }
      } catch (e) {
        console.warn('[stateMigrations] Could not backfill activeExercises:', e);
      }
    }

    return ({
    ...state,
    activeExercises,
    programId: programId || state.programId,
    stateVersion: 2,
    // Lifestyle defaults
    lifestyle: {
      dailyActivity: state.lifestyle?.dailyActivity || 'sedentary',
      sleepHours: state.lifestyle?.sleepHours || '7-8',
      stressLevel: state.lifestyle?.stressLevel || 'moderate',
    },
    // Dietary defaults
    dietary: {
      restrictions: state.dietary?.restrictions || [],
      trackingExperience: state.dietary?.trackingExperience || 'never',
      mealsPerDay: state.dietary?.mealsPerDay || 3,
    },
    // Motivation defaults
    motivation: {
      primaryMotivation: state.motivation?.primaryMotivation || null,
      previousQuitReason: state.motivation?.previousQuitReason || null,
    },
    // Pain regions (in assessment)
    assessment: {
      ...state.assessment,
      movementCompetency: state.assessment?.movementCompetency || {},
      estimatedMaxes: state.assessment?.estimatedMaxes || { squat: null, bench: null, deadlift: null, ohp: null },
      painRegions: state.assessment?.painRegions || {
        shoulders: 'none', lowerBack: 'none', knees: 'none',
        hips: 'none', wrists: 'none', neck: 'none',
      },
      splitPreference: state.assessment?.splitPreference || null,
    },
    // Daily XP tracking
    dailyXPEarned: state.dailyXPEarned ?? 0,
    dailySessionCount: state.dailySessionCount ?? 0,
    lastDayReset: state.lastDayReset || null,
    // Recovery scores
    recoveryScores: state.recoveryScores || [],
    // Daily habits
    dailyHabits: {
      waterGlasses: 0,
      vegetablesEaten: false,
      fruitEaten: false,
      supplementsTaken: false,
      ...state.dailyHabits,
    },
  });
  },
};

/**
 * Run all necessary migrations to bring state to CURRENT_VERSION.
 */
export function migrateState(state) {
  let current = { ...state };
  const startVersion = current.stateVersion || 1;

  while ((current.stateVersion || 1) < CURRENT_VERSION) {
    const version = current.stateVersion || 1;
    const migrateFn = migrations[version];
    if (!migrateFn) {
      console.warn(`[stateMigrations] No migration for version ${version}`);
      break;
    }
    current = migrateFn(current);
  }

  if (startVersion < CURRENT_VERSION) {
    console.log(`[stateMigrations] Migrated state from v${startVersion} to v${current.stateVersion}`);
  }

  return current;
}

export { CURRENT_VERSION };
