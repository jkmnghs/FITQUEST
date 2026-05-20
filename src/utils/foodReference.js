// Curated per-100g cooked nutrition values for common whole foods.
// Used as the highest-confidence data source before USDA or Claude estimates.

const COMPLEX_COOKING_KEYWORDS = [
  // Fried preparations (change carb/fat profile significantly)
  'fried rice', 'garlic rice', 'sinangag', 'nasi goreng', 'chahan',
  'stir fry', 'stir-fry', 'stir fried', 'stir-fried',
  'deep fry', 'deep-fry', 'deep fried', 'deep-fried',
  'breaded', 'battered', 'tempura', 'crispy fried',
  // Sauce-heavy (add carbs/fat, dilute protein density)
  'adobo', 'teriyaki', 'bbq sauce', 'barbecue sauce',
  'honey glaz', 'sweet glaz', 'hoisin', 'oyster sauce',
  'curry', 'stewed', 'braised', 'in gravy', 'cream sauce',
  'tomato sauce', 'pasta sauce', 'carbonara', 'alfredo',
  // Filipino/Asian complex dishes
  'sinigang', 'kare-kare', 'menudo', 'caldereta', 'bistek', 'sisig', 'tinola',
  'inasal', 'tocino', 'longganisa', 'lechon', 'dinuguan',
  // Other complex preparations
  'satay', 'paella', 'risotto', 'shakshuka',
];

export function hasComplexCooking(foodName, cookingMethod) {
  const combined = `${foodName} ${cookingMethod}`.toLowerCase();
  return COMPLEX_COOKING_KEYWORDS.some(kw => combined.includes(kw));
}

// All values are per 100g cooked / prepared weight.
// staple:true  → use this entry even when the dish has complex context
// staple:false → skip this entry if complex cooking keywords detected
const FOOD_DB = [
  // ── Grains & Starches ──────────────────────────────────────────────
  {
    keywords: ['white rice', 'steamed rice', 'cooked rice', 'jasmine rice', 'plain rice', 'boiled rice'],
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['brown rice'],
    per100g: { calories: 123, protein: 2.6, carbs: 25.6, fat: 0.9 },
    staple: true,
  },
  {
    keywords: ['rice'],
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['oatmeal', 'rolled oats', 'porridge'],
    per100g: { calories: 71, protein: 2.5, carbs: 12.2, fat: 1.5 },
    staple: true,
  },
  {
    keywords: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni'],
    per100g: { calories: 131, protein: 5.1, carbs: 25.0, fat: 1.1 },
    staple: true,
  },
  {
    keywords: ['quinoa'],
    per100g: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
    staple: true,
  },
  {
    keywords: ['sweet potato'],
    per100g: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
    staple: true,
  },
  {
    keywords: ['white potato', 'boiled potato', 'mashed potato', 'potato'],
    per100g: { calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1 },
    staple: true,
  },
  {
    keywords: ['white bread', 'bread'],
    per100g: { calories: 265, protein: 9.0, carbs: 49.1, fat: 3.2 },
    staple: true,
  },

  // ── Eggs ───────────────────────────────────────────────────────────
  {
    keywords: ['egg white'],
    per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2 },
    staple: true,
  },
  {
    keywords: ['whole egg', 'boiled egg', 'poached egg', 'scrambled egg', 'fried egg', 'egg'],
    per100g: { calories: 155, protein: 13.0, carbs: 1.1, fat: 10.6 },
    staple: true,
  },

  // ── Proteins ───────────────────────────────────────────────────────
  {
    keywords: ['chicken breast'],
    per100g: { calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
    staple: false,
  },
  {
    keywords: ['chicken thigh', 'chicken leg', 'chicken drumstick'],
    per100g: { calories: 209, protein: 25.9, carbs: 0.0, fat: 10.9 },
    staple: false,
  },
  {
    keywords: ['ground beef', 'minced beef'],
    per100g: { calories: 218, protein: 26.1, carbs: 0.0, fat: 12.0 },
    staple: false,
  },
  {
    keywords: ['beef steak', 'sirloin', 'ribeye', 'beef tenderloin'],
    per100g: { calories: 207, protein: 30.8, carbs: 0.0, fat: 8.7 },
    staple: false,
  },
  {
    keywords: ['salmon'],
    per100g: { calories: 206, protein: 28.2, carbs: 0.0, fat: 9.9 },
    staple: false,
  },
  {
    keywords: ['tilapia', 'cod fish', 'sea bass', 'white fish'],
    per100g: { calories: 128, protein: 26.2, carbs: 0.0, fat: 2.6 },
    staple: false,
  },
  {
    keywords: ['shrimp', 'prawn'],
    per100g: { calories: 99, protein: 24.0, carbs: 0.2, fat: 0.3 },
    staple: false,
  },
  {
    keywords: ['pork tenderloin', 'pork loin', 'lean pork'],
    per100g: { calories: 143, protein: 25.7, carbs: 0.0, fat: 3.5 },
    staple: false,
  },
  {
    keywords: ['turkey breast', 'turkey'],
    per100g: { calories: 189, protein: 29.2, carbs: 0.0, fat: 7.4 },
    staple: false,
  },
  {
    keywords: ['canned tuna', 'tuna in water', 'tuna chunks', 'tuna'],
    per100g: { calories: 116, protein: 25.5, carbs: 0.0, fat: 0.8 },
    staple: true,
  },

  // ── Dairy ──────────────────────────────────────────────────────────
  {
    keywords: ['greek yogurt', 'greek yoghurt'],
    per100g: { calories: 59, protein: 10.2, carbs: 3.6, fat: 0.4 },
    staple: true,
  },
  {
    keywords: ['cottage cheese'],
    per100g: { calories: 98, protein: 11.1, carbs: 3.4, fat: 4.3 },
    staple: true,
  },
  {
    keywords: ['whey protein', 'protein powder', 'protein shake'],
    per100g: { calories: 375, protein: 77.0, carbs: 7.8, fat: 4.2 },
    staple: true,
  },
  {
    keywords: ['whole milk', 'milk'],
    per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
    staple: true,
  },

  // ── Legumes (cooked) ───────────────────────────────────────────────
  {
    keywords: ['black beans', 'black bean'],
    per100g: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5 },
    staple: true,
  },
  {
    keywords: ['lentils', 'lentil'],
    per100g: { calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4 },
    staple: true,
  },
  {
    keywords: ['chickpeas', 'garbanzo'],
    per100g: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
    staple: true,
  },
  {
    keywords: ['edamame'],
    per100g: { calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2 },
    staple: true,
  },

  // ── Vegetables (cooked) ────────────────────────────────────────────
  {
    keywords: ['broccoli'],
    per100g: { calories: 34, protein: 2.8, carbs: 7.2, fat: 0.4 },
    staple: true,
  },
  {
    keywords: ['spinach'],
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    staple: true,
  },
  {
    keywords: ['green beans', 'string beans', 'snap beans'],
    per100g: { calories: 35, protein: 1.8, carbs: 8.1, fat: 0.2 },
    staple: true,
  },
  {
    keywords: ['cauliflower'],
    per100g: { calories: 25, protein: 2.0, carbs: 5.3, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['asparagus'],
    per100g: { calories: 22, protein: 2.4, carbs: 4.1, fat: 0.2 },
    staple: true,
  },
  {
    keywords: ['cabbage'],
    per100g: { calories: 23, protein: 1.3, carbs: 5.4, fat: 0.1 },
    staple: true,
  },
  {
    keywords: ['carrots', 'carrot'],
    per100g: { calories: 35, protein: 0.8, carbs: 8.2, fat: 0.2 },
    staple: true,
  },
  {
    keywords: ['zucchini', 'courgette'],
    per100g: { calories: 17, protein: 1.2, carbs: 3.6, fat: 0.0 },
    staple: true,
  },
  {
    keywords: ['bell pepper', 'capsicum'],
    per100g: { calories: 31, protein: 1.0, carbs: 7.2, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['mushroom'],
    per100g: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.4 },
    staple: true,
  },

  // ── Fruits ─────────────────────────────────────────────────────────
  {
    keywords: ['banana'],
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['apple'],
    per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
    staple: true,
  },
  {
    keywords: ['orange'],
    per100g: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
    staple: true,
  },
  {
    keywords: ['mango'],
    per100g: { calories: 60, protein: 0.8, carbs: 15.0, fat: 0.4 },
    staple: true,
  },
  {
    keywords: ['blueberries', 'blueberry'],
    per100g: { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
    staple: true,
  },
  {
    keywords: ['strawberries', 'strawberry'],
    per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
    staple: true,
  },

  // ── Fats & Nuts ─────────────────────────────────────────────────────
  {
    keywords: ['peanut butter'],
    per100g: { calories: 588, protein: 25.1, carbs: 20.1, fat: 50.4 },
    staple: true,
  },
  {
    keywords: ['almonds', 'almond'],
    per100g: { calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9 },
    staple: true,
  },
  {
    keywords: ['avocado'],
    per100g: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7 },
    staple: true,
  },
  {
    keywords: ['olive oil', 'cooking oil', 'vegetable oil'],
    per100g: { calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
    staple: true,
  },
];

function keywordMatches(normalized, kw) {
  const idx = normalized.indexOf(kw);
  if (idx === -1) return false;
  const wordChar = /[a-z0-9]/;
  const before = normalized[idx - 1];
  const after = normalized[idx + kw.length];
  if (before && wordChar.test(before)) return false;
  if (after && wordChar.test(after)) return false;
  return true;
}

/**
 * Returns per-100g macros from the reference database if a reliable match is found.
 * Returns null if no keyword match exists or complex cooking is detected for non-staple entries.
 */
export function findFoodReference(foodName, cookingMethod = '') {
  if (!foodName) return null;
  const normalized = foodName.toLowerCase();
  const isComplex = hasComplexCooking(foodName, cookingMethod);

  let bestMatch = null;
  let bestLen = 0;

  for (const entry of FOOD_DB) {
    if (!entry.staple && isComplex) continue;
    for (const kw of entry.keywords) {
      if (keywordMatches(normalized, kw) && kw.length > bestLen) {
        bestMatch = entry;
        bestLen = kw.length;
      }
    }
  }

  return bestMatch ? bestMatch.per100g : null;
}
