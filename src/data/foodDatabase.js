/**
 * FitQuest Filipino Food Database
 * Nutritional data sourced from FNRI (Food and Nutrition Research Institute)
 * and USDA databases. All values per standard serving.
 *
 * Used for: quick-add suggestions, AI coach context, nutrition tab search.
 */

export const FOOD_DATABASE = [
  // ── Rice & Staples ───────────────────────────────────────────────────────
  {
    id: 'steamed_rice',
    name: 'Steamed Rice',
    category: 'Staple',
    serving: '1 cup (186g)',
    calories: 242, protein: 5, carbs: 53, fat: 0.4,
    notes: 'Primary Filipino staple — white rice',
  },
  {
    id: 'brown_rice',
    name: 'Brown Rice',
    category: 'Staple',
    serving: '1 cup (195g)',
    calories: 216, protein: 5, carbs: 45, fat: 1.8,
    notes: 'Higher fiber, slower digesting — recommended swap',
  },
  {
    id: 'pandesal',
    name: 'Pandesal',
    category: 'Bread',
    serving: '1 pc (50g)',
    calories: 145, protein: 4, carbs: 28, fat: 1,
    notes: 'Common breakfast roll — moderate protein',
  },
  {
    id: 'kangkong',
    name: 'Kangkong (Water Spinach)',
    category: 'Vegetable',
    serving: '1 cup cooked (180g)',
    calories: 36, protein: 4, carbs: 5, fat: 0.5,
    notes: 'High iron + calcium — excellent micro source',
  },

  // ── Meat & Poultry ───────────────────────────────────────────────────────
  {
    id: 'chicken_adobo',
    name: 'Chicken Adobo',
    category: 'Viand',
    serving: '1 cup (~200g)',
    calories: 285, protein: 32, carbs: 5, fat: 15,
    notes: 'Excellent protein source — remove skin to reduce fat',
  },
  {
    id: 'pork_adobo',
    name: 'Pork Adobo',
    category: 'Viand',
    serving: '1 cup (~200g)',
    calories: 380, protein: 28, carbs: 5, fat: 26,
    notes: 'High in fat — choose lean cuts, remove visible fat',
  },
  {
    id: 'tinola',
    name: 'Tinola (Ginger Chicken Soup)',
    category: 'Soup',
    serving: '1 cup (240ml)',
    calories: 145, protein: 20, carbs: 6, fat: 4,
    notes: 'Light and high-protein — great recovery meal',
  },
  {
    id: 'sinigang_baboy',
    name: 'Sinigang na Baboy',
    category: 'Soup',
    serving: '1 cup (240ml)',
    calories: 180, protein: 15, carbs: 8, fat: 9,
    notes: 'Tamarind broth — high in Vitamin C from vegetables',
  },
  {
    id: 'sinigang_hipon',
    name: 'Sinigang na Hipon',
    category: 'Soup',
    serving: '1 cup (240ml)',
    calories: 130, protein: 18, carbs: 7, fat: 3,
    notes: 'Shrimp version — lower fat, high protein',
  },
  {
    id: 'pork_sisig',
    name: 'Pork Sisig',
    category: 'Viand',
    serving: '1 serving (~200g)',
    calories: 420, protein: 28, carbs: 3, fat: 32,
    notes: 'High fat — enjoy occasionally, pair with vegetables',
  },
  {
    id: 'longganisa',
    name: 'Longganisa',
    category: 'Breakfast',
    serving: '2 pcs (~80g)',
    calories: 280, protein: 12, carbs: 6, fat: 22,
    notes: 'High sodium and fat — limit to 1-2x/week',
  },
  {
    id: 'chicken_breast',
    name: 'Chicken Breast (grilled)',
    category: 'Protein',
    serving: '100g',
    calories: 165, protein: 31, carbs: 0, fat: 3.6,
    notes: 'Top protein-to-calorie ratio — ideal for muscle building',
  },
  {
    id: 'egg',
    name: 'Egg (whole)',
    category: 'Protein',
    serving: '1 large (50g)',
    calories: 78, protein: 6, carbs: 0.6, fat: 5,
    notes: 'Complete protein with all essential amino acids',
  },

  // ── Seafood ──────────────────────────────────────────────────────────────
  {
    id: 'bangus',
    name: 'Bangus (Milkfish)',
    category: 'Seafood',
    serving: '100g grilled',
    calories: 148, protein: 20, carbs: 0, fat: 7,
    notes: 'Affordable Filipino protein staple — high omega-3',
  },
  {
    id: 'tilapia',
    name: 'Tilapia (grilled)',
    category: 'Seafood',
    serving: '100g',
    calories: 128, protein: 26, carbs: 0, fat: 2.7,
    notes: 'Lean protein — excellent for fat loss goals',
  },
  {
    id: 'tuyo',
    name: 'Tuyo (Dried Fish)',
    category: 'Seafood',
    serving: '2 pcs (~30g)',
    calories: 80, protein: 14, carbs: 0, fat: 2.5,
    notes: 'Very high sodium — limit if hypertensive',
  },
  {
    id: 'hipon',
    name: 'Shrimp (sautéed)',
    category: 'Seafood',
    serving: '100g',
    calories: 85, protein: 18, carbs: 0.9, fat: 0.9,
    notes: 'Very lean, high protein — excellent choice',
  },

  // ── Snacks & Street Food ─────────────────────────────────────────────────
  {
    id: 'lumpia',
    name: 'Lumpia (fried)',
    category: 'Snack',
    serving: '2 pcs (~80g)',
    calories: 200, protein: 8, carbs: 22, fat: 9,
    notes: 'Fresh lumpia (not fried) is significantly lower in fat',
  },
  {
    id: 'banana_q',
    name: 'Banana-Q',
    category: 'Snack',
    serving: '2 skewers (~120g)',
    calories: 210, protein: 1, carbs: 48, fat: 3,
    notes: 'High sugar — good pre-workout carb source',
  },
  {
    id: 'biko',
    name: 'Biko (Sticky Rice Cake)',
    category: 'Dessert',
    serving: '1 slice (~100g)',
    calories: 290, protein: 3, carbs: 62, fat: 4,
    notes: 'High carbs and sugar — occasional treat',
  },

  // ── Beverages ────────────────────────────────────────────────────────────
  {
    id: 'coconut_water',
    name: 'Coconut Water',
    category: 'Beverage',
    serving: '1 cup (240ml)',
    calories: 46, protein: 2, carbs: 9, fat: 0.5,
    notes: 'Natural electrolytes — excellent post-workout hydration',
  },
  {
    id: 'sago_gulaman',
    name: 'Sago\'t Gulaman',
    category: 'Beverage',
    serving: '1 cup (240ml)',
    calories: 130, protein: 1, carbs: 32, fat: 0,
    notes: 'High sugar — choose less sweet version',
  },

  // ── International Common Foods ───────────────────────────────────────────
  {
    id: 'oats',
    name: 'Oats (rolled, cooked)',
    category: 'Breakfast',
    serving: '1 cup (234g)',
    calories: 166, protein: 6, carbs: 28, fat: 4,
    notes: 'High fiber — great breakfast for sustained energy',
  },
  {
    id: 'greek_yogurt',
    name: 'Greek Yogurt (plain)',
    category: 'Dairy',
    serving: '1 cup (245g)',
    calories: 130, protein: 23, carbs: 9, fat: 0.5,
    notes: 'Highest protein dairy — excellent snack or breakfast',
  },
  {
    id: 'banana',
    name: 'Banana (Lakatan)',
    category: 'Fruit',
    serving: '1 medium (118g)',
    calories: 105, protein: 1.3, carbs: 27, fat: 0.4,
    notes: 'Good pre-workout carb + potassium',
  },
];

/**
 * Search the food database by name (case-insensitive).
 * Returns matching food entries.
 */
export function searchFoods(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return FOOD_DATABASE.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.category.toLowerCase().includes(q)
  );
}

/**
 * Get foods by category.
 */
export function getFoodsByCategory(category) {
  return FOOD_DATABASE.filter(f => f.category === category);
}

export const FOOD_CATEGORIES = [
  'Staple', 'Bread', 'Vegetable', 'Viand', 'Soup',
  'Protein', 'Seafood', 'Breakfast', 'Snack', 'Dessert',
  'Beverage', 'Dairy', 'Fruit',
];
