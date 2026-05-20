import { z } from 'zod';

// ── Meal entry schema ──
const mealEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  items: z.array(z.object({
    name: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).passthrough()).optional(),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).passthrough().optional(),
}).passthrough();

// ── Recovery score schema ──
const recoveryScoreSchema = z.object({
  date: z.string(),
  sleep: z.number().min(1).max(5),
  bodyFeel: z.number().min(1).max(5),
  energy: z.number().min(1).max(5),
});

// ── Assessment schema ──
const assessmentSchema = z.object({
  completed: z.boolean(),
  parqFlagged: z.boolean().optional(),
  goal: z.enum(['recomp', 'fat_loss', 'muscle', 'strength']).nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  daysPerWeek: z.number().int().min(1).max(7).nullable().optional(),
  sessionLength: z.number().nullable().optional(),
  equipment: z.enum(['full_gym', 'dumbbells', 'dumbbells_only', 'barbell_home', 'bodyweight']).nullable().optional(),
  trainingDays: z.array(z.string()).optional(),
  injuries: z.string().optional(),
  programId: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  sex: z.enum(['male', 'female']).nullable().optional(),
  weightKg: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  waistCm: z.number().nullable().optional(),
  // New fields from Phase 3
  movementCompetency: z.record(z.string(), z.enum(['confident', 'unsure', 'never'])).optional(),
  estimatedMaxes: z.object({
    squat: z.number().nullable().optional(),
    bench: z.number().nullable().optional(),
    deadlift: z.number().nullable().optional(),
    ohp: z.number().nullable().optional(),
  }).optional(),
  painRegions: z.object({
    shoulders: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
    lowerBack: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
    knees: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
    hips: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
    wrists: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
    neck: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
  }).optional(),
  splitPreference: z.enum(['full_body', 'upper_lower', 'ppl', 'no_preference']).nullable().optional(),
}).passthrough();

// ── Lifestyle schema ──
const lifestyleSchema = z.object({
  dailyActivity: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).optional(),
  sleepHours: z.enum(['<5', '5-6', '6-7', '7-8', '8+']).optional(),
  stressLevel: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
}).optional();

// ── Dietary schema ──
const dietarySchema = z.object({
  restrictions: z.array(z.string()).optional(),
  trackingExperience: z.enum(['never', 'tried', 'regular']).optional(),
  mealsPerDay: z.union([z.literal(2), z.literal(3), z.literal('4-5'), z.literal('varies')]).optional(),
}).optional();

// ── Motivation schema ──
const motivationSchema = z.object({
  primaryMotivation: z.string().nullable().optional(),
  previousQuitReason: z.string().nullable().optional(),
}).optional();

// ── Daily habits schema ──
const dailyHabitsSchema = z.object({
  waterGlasses: z.number().int().nonnegative().optional(),
  vegetablesEaten: z.boolean().optional(),
  fruitEaten: z.boolean().optional(),
  supplementsTaken: z.boolean().optional(),
}).optional();

// ── Nutrition goals schema ──
const nutritionGoalsSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
}).passthrough();

// ── Full state schema ──
export const stateSchema = z.object({
  name: z.string(),
  level: z.number().int().min(1),
  xp: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  lastDate: z.string().nullable(),
  currentWeek: z.number().int().min(1).max(999),
  unit: z.enum(['kg', 'lbs']),
  totalSessions: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  totalMinutes: z.number().nonnegative(),
  perfectWeeks: z.number().int().nonnegative(),
  checkins: z.number().int().nonnegative(),
  deloadDone: z.boolean(),
  log: z.array(z.object({}).passthrough()),
  achDone: z.array(z.string()),
  weekProgress: z.record(z.string(), z.object({}).passthrough()),
  liftWeights: z.record(z.string(), z.number()),
  liftHistory: z.record(z.string(), z.array(z.any())),
  weeklyRPE: z.record(z.string(), z.any()),
  overloadSuggestions: z.record(z.string(), z.any()),
  consecutiveCompletions: z.record(z.string(), z.number()),
  personalRecords: z.record(z.string(), z.any()),
  dayTemplates: z.record(z.string(), z.any()).nullable().optional(),
  weeklyCheckins: z.array(z.object({}).passthrough()),
  aiCoachHistory: z.array(z.any()),
  aiEpisodic: z.array(z.any()),
  mealLogs: z.array(mealEntrySchema).max(500),
  nutritionGoals: nutritionGoalsSchema,
  questMessagesThisWeek: z.number().int().nonnegative(),
  questMessagesWeekStart: z.string().nullable(),
  assessment: assessmentSchema,
  // New v2 fields
  stateVersion: z.number().int().optional(),
  dailyXPEarned: z.number().int().nonnegative().optional(),
  dailySessionCount: z.number().int().nonnegative().optional(),
  lastDayReset: z.string().nullable().optional(),
  lifestyle: lifestyleSchema,
  dietary: dietarySchema,
  motivation: motivationSchema,
  recoveryScores: z.array(recoveryScoreSchema).optional(),
  dailyHabits: dailyHabitsSchema,
}).passthrough(); // passthrough allows extra fields without failing

/**
 * Validate state before writing to cloud. Returns { success, data, error }.
 */
export function validateState(state) {
  const result = stateSchema.safeParse(state);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }
  const fieldPaths = result.error.issues.map(i =>
    `${i.path.join('.')}: ${i.message}`
  );
  console.error('[stateSchema] Validation failed:', fieldPaths);
  return { success: false, data: null, error: fieldPaths };
}

/**
 * Repair common state corruption patterns by replacing null/undefined with defaults.
 */
export function repairState(state) {
  const repaired = { ...state };

  // Fix null primitives
  if (repaired.level == null || repaired.level < 1) repaired.level = 1;
  if (repaired.xp == null || repaired.xp < 0) repaired.xp = 0;
  if (repaired.totalXp == null || repaired.totalXp < 0) repaired.totalXp = 0;
  if (repaired.streak == null || repaired.streak < 0) repaired.streak = 0;
  if (repaired.bestStreak == null || repaired.bestStreak < 0) repaired.bestStreak = 0;
  if (repaired.currentWeek == null || repaired.currentWeek < 1) repaired.currentWeek = 1;
  if (repaired.currentWeek > 999) repaired.currentWeek = 999;
  if (!repaired.unit) repaired.unit = 'kg';
  if (repaired.totalSessions == null) repaired.totalSessions = 0;
  if (repaired.totalVolume == null) repaired.totalVolume = 0;
  if (repaired.totalMinutes == null) repaired.totalMinutes = 0;
  if (repaired.perfectWeeks == null) repaired.perfectWeeks = 0;
  if (repaired.checkins == null) repaired.checkins = 0;
  if (repaired.deloadDone == null) repaired.deloadDone = false;
  if (!repaired.name) repaired.name = '';

  // Fix null arrays
  if (!Array.isArray(repaired.log)) repaired.log = [];
  if (!Array.isArray(repaired.achDone)) repaired.achDone = [];
  if (!Array.isArray(repaired.weeklyCheckins)) repaired.weeklyCheckins = [];
  if (!Array.isArray(repaired.aiCoachHistory)) repaired.aiCoachHistory = [];
  if (!Array.isArray(repaired.aiEpisodic)) repaired.aiEpisodic = [];
  if (!Array.isArray(repaired.mealLogs)) repaired.mealLogs = [];
  if (!Array.isArray(repaired.recoveryScores)) repaired.recoveryScores = [];

  // Fix null objects
  if (!repaired.weekProgress || typeof repaired.weekProgress !== 'object') repaired.weekProgress = {};
  if (!repaired.liftWeights || typeof repaired.liftWeights !== 'object') repaired.liftWeights = {};
  if (!repaired.liftHistory || typeof repaired.liftHistory !== 'object') repaired.liftHistory = {};
  if (!repaired.weeklyRPE || typeof repaired.weeklyRPE !== 'object') repaired.weeklyRPE = {};
  if (!repaired.overloadSuggestions || typeof repaired.overloadSuggestions !== 'object') repaired.overloadSuggestions = {};
  if (!repaired.consecutiveCompletions || typeof repaired.consecutiveCompletions !== 'object') repaired.consecutiveCompletions = {};
  if (!repaired.personalRecords || typeof repaired.personalRecords !== 'object') repaired.personalRecords = {};
  if (!repaired.nutritionGoals || typeof repaired.nutritionGoals !== 'object') {
    repaired.nutritionGoals = { calories: 2000, protein: 155, carbs: 190, fat: 60 };
  }

  // Fix assessment
  if (!repaired.assessment || typeof repaired.assessment !== 'object') {
    repaired.assessment = { completed: false };
  }
  if (repaired.assessment.completed == null) repaired.assessment.completed = false;

  // Fix quota
  if (repaired.questMessagesThisWeek == null) repaired.questMessagesThisWeek = 0;

  return repaired;
}
