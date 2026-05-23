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

const ACTIVITY_MULTIPLIERS = {
  sedentary:        1.2,
  lightly_active:   1.375,
  moderately_active: 1.55,
  very_active:      1.725,
};

// Previously wrong: flat kcal deltas (–400/+250) ignored TDEE magnitude, so a
// 1 800 kcal/day person and a 3 000 kcal/day person got the same absolute swing.
// Percentage multipliers scale correctly with body size and activity level.
const GOAL_MULTIPLIERS = {
  fat_loss: 0.80, // 20% deficit
  muscle:   1.10, // 10% surplus
  strength: 1.05, // 5% surplus
  recomp:   1.00, // maintenance
};

// Previously wrong: fat_loss was 2.0g/kg (under), strength 1.8g/kg (under),
// recomp 2.0g/kg (under). Using evidence-based targets per goal.
const PROTEIN_PER_KG = {
  fat_loss: 2.2,
  muscle:   1.8,
  strength: 2.0,
  recomp:   2.4,
};

// Previously wrong: fat was a flat 25% of calories regardless of goal.
// Goal-specific g/kg ensures hormonal adequacy and correct satiety signalling.
const FAT_PER_KG = {
  fat_loss: 0.9,
  muscle:   1.0,
  strength: 1.2,
  recomp:   0.9,
};

// Previously wrong: added daysPerWeek × 0.03 on top of the activity multiplier,
// double-counting training days (the multiplier already encodes exercise frequency).
export function calcTDEE(bmr, dailyActivity) {
  const multiplier = ACTIVITY_MULTIPLIERS[dailyActivity] || ACTIVITY_MULTIPLIERS.sedentary;
  return Math.round(bmr * multiplier);
}

/**
 * Full nutrition goal calc. Returns { calories, protein, carbs, fat, warnings }.
 * Enforces minimum safe caloric floors (1200 kcal women / 1500 kcal men).
 */
export function calcNutritionGoals(assessment) {
  const { weightKg, heightCm, age, sex, goal, dailyActivity, stressLevel } = assessment;
  const warnings = [];

  if (!weightKg || !heightCm || !age || !sex) {
    return { calories: 2000, protein: 155, carbs: 190, fat: 60, warnings: [] };
  }

  const bmr  = calcBMR({ weightKg, heightCm, age, sex });
  const tdee = calcTDEE(bmr, dailyActivity);

  let goalMultiplier = GOAL_MULTIPLIERS[goal] ?? 1.00;

  // High stress + fat_loss → reduce deficit from 20% to 10% to avoid cortisol spike
  if ((stressLevel === 'high' || stressLevel === 'very_high') && goal === 'fat_loss') {
    goalMultiplier = 0.90;
    warnings.push('Caloric deficit reduced to 10% due to high stress levels. Aggressive deficits under stress can increase cortisol and promote binge cycles.');
  }

  let safeFloor = sex === 'female' ? 1200 : 1500;

  if (age < 18) {
    safeFloor = sex === 'female' ? 1600 : 1800;
    warnings.push('Adolescent caloric floors applied (minimum ' + safeFloor + ' kcal). Growing bodies need adequate nutrition. Please consult a healthcare provider about your dietary goals.');
  }

  let calories = Math.round(tdee * goalMultiplier);

  if (calories < safeFloor) {
    warnings.push(`Calculated calories (${calories}) are below the safe minimum of ${safeFloor} kcal. This floor exists to prevent metabolic adaptation, hormonal disruption, and muscle loss.`);
    calories = safeFloor;
  }

  // Protein — capped at 3g/kg (above this, excess is oxidised for energy, not anabolism)
  let protein = Math.round(weightKg * (PROTEIN_PER_KG[goal] ?? 2.0));
  if (protein > weightKg * 3) {
    protein = Math.round(weightKg * 3);
    warnings.push('Protein capped at 3g/kg. Higher intakes provide no additional muscle-building benefit and may displace other macros.');
  }

  // Fat — for fat_loss use whichever is lower: 0.9g/kg or 25% of calories.
  // This prevents fat eating into the carb budget on lower-calorie cuts.
  let fat;
  if (goal === 'fat_loss') {
    fat = Math.round(Math.min(weightKg * 0.9, (calories * 0.25) / 9));
  } else {
    fat = Math.round(weightKg * (FAT_PER_KG[goal] ?? 0.9));
  }
  const fatFloor = Math.round(weightKg * 0.5);
  if (fat < fatFloor) {
    fat = fatFloor;
    warnings.push('Fat intake raised to minimum 0.5g/kg to support hormone production.');
  }

  // Carbs fill the remaining calories — never go negative
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  if (carbs < 0) {
    carbs = 0;
    // Protein + fat already exceed the calorie budget; align the calorie goal to the
    // actual macro sum so the UI never shows a target the user cannot hit with these macros.
    calories = protein * 4 + fat * 9;
    warnings.push('Protein and fat already meet your calorie target — carbohydrates set to zero. Consider increasing your calorie goal slightly if you want to include carbs.');
  }

  return { calories, protein, carbs, fat, warnings };
}

/**
 * BMI with standard WHO cutoffs (18.5 / 25 / 30).
 */
export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return { bmi: null, category: null };
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const category = bmi < 18.5 ? 'Underweight'
    : bmi < 25  ? 'Normal'
    : bmi < 30  ? 'Overweight'
    : 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Waist-to-height ratio — ≥0.5 = elevated cardiometabolic risk.
 * Returns null if waist is missing or physiologically implausible.
 * Minimum: 55 cm or 30% of height, whichever is greater.
 */
export function calcWaistToHeight(waistCm, heightCm) {
  if (!waistCm || !heightCm) return null;
  const minWaist = Math.max(55, heightCm * 0.30);
  if (waistCm < minWaist) return null;
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
