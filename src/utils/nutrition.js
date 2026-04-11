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
 * Total Daily Energy Expenditure — inferred from training frequency.
 */
export function calcTDEE(bmr, daysPerWeek) {
  const multiplier = daysPerWeek <= 2 ? 1.375
    : daysPerWeek <= 3 ? 1.55
    : daysPerWeek <= 5 ? 1.725 : 1.9;
  return Math.round(bmr * multiplier);
}

/**
 * Full nutrition goal calc. Returns { calories, protein, carbs, fat }.
 * Enforces minimum safe caloric floors (1200 kcal women / 1500 kcal men).
 */
export function calcNutritionGoals(assessment) {
  const { weightKg, heightCm, age, sex, daysPerWeek, goal } = assessment;
  if (!weightKg || !heightCm || !age || !sex) {
    return { calories: 2000, protein: 155, carbs: 190, fat: 60 };
  }

  const bmr  = calcBMR({ weightKg, heightCm, age, sex });
  const tdee = calcTDEE(bmr, daysPerWeek || 3);

  const proteinPerKg = { recomp: 2.0, fat_loss: 2.5, muscle: 1.8, strength: 1.8 };
  const calAdj       = { recomp: 0,   fat_loss: -400, muscle: +250, strength: +100 };

  const safeFloor = sex === 'female' ? 1200 : 1500;
  const calories  = Math.max(safeFloor, Math.round(tdee + (calAdj[goal] ?? 0)));
  const protein   = Math.round(weightKg * (proteinPerKg[goal] ?? 2.0));
  const fat       = Math.round((calories * 0.25) / 9);
  const carbs     = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat };
}

/**
 * BMI with Asian-adjusted WHO 2004 cutoffs (Filipino users).
 * Standard cutoffs miss ~35% of hypertensive and ~24% of diabetic Filipino women.
 */
export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return { bmi: null, category: null };
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  // Asian-adjusted thresholds (WHO Expert Consultation, 2004)
  const category = bmi < 18.5 ? 'Underweight'
    : bmi < 23   ? 'Normal'
    : bmi < 27.5 ? 'Overweight'
    : 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Waist-to-height ratio — ≥0.5 = elevated cardiometabolic risk.
 * Affects ~39.3% of Filipinos (highest in studied populations).
 */
export function calcWaistToHeight(waistCm, heightCm) {
  if (!waistCm || !heightCm) return null;
  return Math.round((waistCm / heightCm) * 100) / 100;
}
