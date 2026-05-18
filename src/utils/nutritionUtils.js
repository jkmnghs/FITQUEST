export const PORTION_MULT = { S: 0.75, M: 1.0, L: 1.5 };

export async function searchUSDA(query, claudeCalsPer100g) {
  try {
    const res = await fetch(`/api/usda?query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return null;
    const parseFood = (food) => {
      const nutrients = food.foodNutrients || [];
      const get = (id) => { const n = nutrients.find(n => n.nutrientId === id); return n ? n.value : null; };
      const calories = get(1008);
      if (calories == null) return null;
      return { calories, protein: get(1003) || 0, carbs: get(1005) || 0, fat: get(1004) || 0 };
    };
    const candidates = data.foods.map(parseFood).filter(Boolean);
    if (candidates.length === 0) return null;
    // Pick the candidate whose calorie density is closest to Claude's estimate
    if (claudeCalsPer100g > 0) {
      candidates.sort((a, b) =>
        Math.abs(a.calories - claudeCalsPer100g) - Math.abs(b.calories - claudeCalsPer100g)
      );
    }
    return candidates[0];
  } catch {
    return null;
  }
}

// Validates USDA macro data for physical plausibility and internal consistency.
// Returns true only if the data is trustworthy enough to override Claude's estimate.
export function validateUSDAMacros(usdaResult, foodGrams) {
  const { calories, protein, carbs, fat } = usdaResult;

  // No individual macro can equal or exceed the total food weight
  if (fat >= foodGrams || protein >= foodGrams || carbs >= foodGrams) return false;

  // Sum of macros can't exceed food weight (water/fiber make up the rest)
  if (protein + carbs + fat > foodGrams * 1.05) return false;

  // Calorie density can't exceed pure fat (~900 kcal/100g)
  if (foodGrams > 0 && (calories / foodGrams) * 100 > 900) return false;

  // Atwater cross-check: stated calories must be consistent with macros
  // Formula: protein×4 + carbs×4 + fat×9 (±20% tolerance for fiber, alcohol, rounding)
  const impliedCalories = protein * 4 + carbs * 4 + fat * 9;
  if (impliedCalories > 0 && calories > 0) {
    const deviation = Math.abs(calories - impliedCalories) / calories;
    if (deviation > 0.20) return false;
  }

  return true;
}

// Cross-validates USDA per-100g data against Claude's per-100g estimate.
// Rejects USDA if any macro deviates by more than 3× from Claude's estimate.
// This catches wrong-category USDA matches (e.g. rice flour returned for cooked rice).
export function validateUSDAAgainstClaude(usdaPer100g, claudePer100g) {
  const macros = ['protein', 'carbs', 'fat'];
  for (const macro of macros) {
    const usda = usdaPer100g[macro] ?? 0;
    const claude = claudePer100g[macro] ?? 0;
    const larger = Math.max(usda, claude);
    if (larger < 3) continue;
    const ratio = claude > 0 ? usda / claude : Infinity;
    const invRatio = usda > 0 ? claude / usda : Infinity;
    if (ratio > 3 || invRatio > 3) return false;
  }
  return true;
}

export function getAdjusted(food) {
  const m = food.customGrams != null && food.grams > 0
    ? food.customGrams / food.grams
    : (PORTION_MULT[food.portion] ?? PORTION_MULT['M']);
  const grams = food.customGrams != null ? food.customGrams : Math.round(food.grams * m);
  return {
    grams,
    calories: Math.round(food.calories * m),
    protein: Math.round(food.protein * m * 10) / 10,
    carbs: Math.round(food.carbs * m * 10) / 10,
    fat: Math.round(food.fat * m * 10) / 10,
  };
}

export function sumTotals(foods) {
  return foods.reduce((acc, f) => {
    const adj = getAdjusted(f);
    return {
      calories: acc.calories + adj.calories,
      protein: Math.round((acc.protein + adj.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + adj.carbs) * 10) / 10,
      fat: Math.round((acc.fat + adj.fat) * 10) / 10,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
