/**
 * Nutrition utilities — Mifflin-St Jeor formula (ADA recommended)
 * All functions are pure — no side effects.
 */

/**
 * Basal Metabolic Rate via Mifflin-St Jeor.
 * Accurate within 10% for 82% of non-obese individuals.
 */
export function calcBMR({ weightKg, heightCm, age, sex }) {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Activity level multipliers (Phase 3.4a — corrected TDEE calculation)
 */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

/**
 * Total Daily Energy Expenditure — uses daily activity level as base + training days as adjustment.
 * Phase 3.4a: A construction worker training 3x/week needs more calories than a desk worker at 3x/week.
 */
export function calcTDEE(bmr, daysPerWeek, dailyActivity) {
  const baseMultiplier = ACTIVITY_MULTIPLIERS[dailyActivity] || ACTIVITY_MULTIPLIERS.sedentary;
  const trainingBoost = (daysPerWeek || 3) * 0.03;
  const multiplier = baseMultiplier + trainingBoost;
  return Math.round(bmr * multiplier);
}

/**
 * Full nutrition goal calc. Returns { calories, protein, carbs, fat, warnings }.
 * Enforces minimum safe caloric floors (1200 kcal women / 1500 kcal men).
 * Phase 4.3: Additional safeguards for max deficit, under-18, stress adjustment.
 */
export function calcNutritionGoals(assessment) {
  const { weightKg, heightCm, age, sex, daysPerWeek, goal, dailyActivity, stressLevel } = assessment;
  const warnings = [];

  if (!weightKg || !heightCm || !age || !sex) {
    return { calories: 2000, protein: 155, carbs: 190, fat: 60, warnings: [] };
  }

  const bmr  = calcBMR({ weightKg, heightCm, age, sex });
  const tdee = calcTDEE(bmr, daysPerWeek || 3, dailyActivity);

  const proteinPerKg = { recomp: 2.0, fat_loss: 2.5, muscle: 1.8, strength: 1.8 };
  let calAdj = { recomp: 0, fat_loss: -400, muscle: +250, strength: +100 };

  // Phase 3.4c: High stress + fat_loss → reduce deficit
  if ((stressLevel === 'high' || stressLevel === 'very_high') && goal === 'fat_loss') {
    calAdj.fat_loss = -250;
    warnings.push('Caloric deficit reduced to 250 kcal due to high stress levels. Aggressive deficits under stress can increase cortisol and promote binge cycles.');
  }

  // Phase 4.3: Cap max deficit at 500 kcal
  let deficit = calAdj[goal] ?? 0;
  if (deficit < -500) {
    deficit = -500;
    warnings.push('Caloric deficit capped at 500 kcal/day. For larger deficits, we recommend consulting a nutrition professional.');
  }

  // Determine safe floor
  let safeFloor = sex === 'female' ? 1200 : 1500;

  // Phase 4.3: Under-18 gets higher floors
  if (age < 18) {
    safeFloor = sex === 'female' ? 1600 : 1800;
    warnings.push('Adolescent caloric floors applied (minimum ' + safeFloor + ' kcal). Growing bodies need adequate nutrition. Please consult a healthcare provider about your dietary goals.');
  }

  let calories = Math.round(tdee + deficit);

  if (calories < safeFloor) {
    warnings.push(`Calculated calories (${calories}) are below the safe minimum of ${safeFloor} kcal. This floor exists to prevent metabolic adaptation, hormonal disruption, and muscle loss.`);
    calories = safeFloor;
  }

  const protein = Math.round(weightKg * (proteinPerKg[goal] ?? 2.0));
  const fat     = Math.round((calories * 0.25) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat, warnings };
}

/**
 * BMI with Asian-adjusted WHO 2004 cutoffs (Filipino users).
 */
export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return { bmi: null, category: null };
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const category = bmi < 18.5 ? 'Underweight'
    : bmi < 23   ? 'Normal'
    : bmi < 27.5 ? 'Overweight'
    : 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Waist-to-height ratio — ≥0.5 = elevated cardiometabolic risk.
 */
export function calcWaistToHeight(waistCm, heightCm) {
  if (!waistCm || !heightCm) return null;
  return Math.round((waistCm / heightCm) * 100) / 100;
}

/**
 * Micronutrient targets (Phase 4.5)
 */
export function getFiberTarget() {
  return { min: 25, max: 35, unit: 'g/day' };
}

export function getWaterTarget(weightKg) {
  if (!weightKg) return 2.5; // default liters
  return Math.round(weightKg * 0.033 * 10) / 10;
}
