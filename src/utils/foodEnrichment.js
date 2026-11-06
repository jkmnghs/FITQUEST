/**
 * Food analysis shared by the photo scan and the manual text add.
 *
 * Both used to carry their own copy of the "reference → USDA → AI" chain and
 * their own regex JSON parsing, and they had drifted: text add skipped the
 * macro-wipeout guard and dropped cookingMethod. Everything that turns a model
 * estimate into a logged food now lives here.
 */
import { authPostJSON } from '../lib/authFetch';
import { findFoodReference } from './foodReference';
import { searchUSDA, validateUSDAMacros, validateUSDAAgainstClaude } from './nutritionUtils';

const API_URL = '/api/nutrition';
const MODEL = 'claude-sonnet-5-5';

const FOOD_PROPS = {
  name: { type: 'string' },
  cookingMethod: { type: 'string' },
  grams: { type: 'number' },
  calories: { type: 'number' },
  protein: { type: 'number' },
  carbs: { type: 'number' },
  fat: { type: 'number' },
};
const FOOD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(FOOD_PROPS),
  properties: FOOD_PROPS,
};
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: FOOD_SCHEMA } },
};

const COOKING_RULE = 'cookingMethod: how it was prepared — grilled, fried, deep-fried, breaded, boiled, steamed, raw, roasted, stewed, braised, or the dish name if it is a named preparation (adobo, sinigang, teriyaki, carbonara). Use "unknown" only if it genuinely cannot be told. This decides whether reference nutrition values can be applied, so a fried or sauce-heavy item must say so.';

const PHOTO_PROMPT = `Analyze this meal photo. Identify each food item and estimate portions.

Guidelines:
- SCALE PRIORITY: If a kitchen scale is visible, read its exact digital display value and use that as the grams for the food on the scale. This overrides any visual estimate.
- If no scale is visible, estimate grams from visual portion size (standard dinner plate ~26cm as reference)
- Calories/macros must accurately match the gram amount (e.g. raw rolled oats: ~389 kcal/100g, ~13g protein, ~66g carbs, ~7g fat)
- Look carefully at texture, color, and context to distinguish similar foods (e.g. oats vs flour vs rice)
- Separate mixed dishes into visible components
- ${COOKING_RULE}
- Use "Unknown food" if unidentifiable. Return an empty items list if there is no food in the photo.`;

const textPrompt = (query) => `Nutritional info for: "${query}".
Use cooked-state values and a realistic serving gram weight for the amount described.
${COOKING_RULE}`;

/** A user-facing message for a failed /api/nutrition response. */
async function errorFrom(res) {
  const data = await res.json().catch(() => ({}));
  if (data?.error) return data.error;            // e.g. the daily limit message
  if (res.status === 401) return 'Session expired — please sign in again.';
  return `Food analysis failed (${res.status}). Try again.`;
}

async function callModel(content, schema, maxTokens) {
  const res = await authPostJSON(API_URL, {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  if (!res.ok) throw new Error(await errorFrom(res));
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('The AI could not analyze this. Try a different photo or description.');
  if (data.stop_reason === 'max_tokens') throw new Error('Too many items to analyze at once. Try a closer photo.');
  const text = (data.content?.find(b => b.type === 'text')?.text || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Could not read the analysis. Try again.');
  }
}

/** Coerce one model estimate into safe numbers. */
export function sanitizeEstimate(f, fallbackName = 'Unknown food') {
  const num = (v, min) => (Number(v) >= min ? Number(v) : null);
  return {
    name: typeof f?.name === 'string' && f.name.trim() ? f.name.trim() : fallbackName,
    cookingMethod: typeof f?.cookingMethod === 'string' ? f.cookingMethod.trim() : '',
    grams: num(f?.grams, 0.0001) ?? 100,
    calories: num(f?.calories, 0) ?? 0,
    protein: num(f?.protein, 0) ?? 0,
    carbs: num(f?.carbs, 0) ?? 0,
    fat: num(f?.fat, 0) ?? 0,
  };
}

const scaled = (per100g, grams) => {
  const m = grams / 100;
  return {
    calories: Math.round(per100g.calories * m),
    protein: Math.round(per100g.protein * m * 10) / 10,
    carbs: Math.round(per100g.carbs * m * 10) / 10,
    fat: Math.round(per100g.fat * m * 10) / 10,
  };
};

/**
 * Best available numbers for one estimate:
 * 1. curated reference values, 2. USDA if it agrees with the estimate,
 * 3. the model's own estimate. `hint` is extra cooking context (the user's
 * typed query) for the reference lookup.
 *
 * @param {object} estimate sanitized model estimate
 * @param {object} [deps] injectable for tests
 */
export async function enrichFood(estimate, { hint = '', usda = searchUSDA } = {}) {
  const f = estimate;
  const base = { ...f, portion: 'M', customGrams: null };

  const ref = findFoodReference(f.name, `${f.cookingMethod} ${hint}`.trim());
  if (ref) return { ...base, ...scaled(ref, f.grams), source: 'reference' };

  const per100 = {
    calories: (f.calories / f.grams) * 100,
    protein: (f.protein / f.grams) * 100,
    carbs: (f.carbs / f.grams) * 100,
    fat: (f.fat / f.grams) * 100,
  };
  const found = await usda(f.name, per100.calories);
  if (found) {
    const u = scaled(found, f.grams);
    const noMacroWipeout =
      !(f.protein > 2 && u.protein === 0) &&
      !(f.carbs > 2 && u.carbs === 0) &&
      !(f.fat > 2 && u.fat === 0);
    if (validateUSDAMacros(u, f.grams) && validateUSDAAgainstClaude(found, per100) && noMacroWipeout) {
      return { ...base, ...u, source: 'usda' };
    }
  }

  return { ...base, calories: Math.round(f.calories), source: 'ai' };
}

/** Photo → enriched foods. Throws with a user-facing message. */
export async function analyzeMealPhoto(image) {
  const parsed = await callModel([
    { type: 'image', source: { type: 'base64', media_type: image.type, data: image.base64 } },
    { type: 'text', text: PHOTO_PROMPT },
  ], MEAL_SCHEMA, 2048);
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  if (items.length === 0) throw new Error('No food items detected. Try a clearer photo.');
  return Promise.all(items.map(i => enrichFood(sanitizeEstimate(i))));
}

/** Typed description → one enriched food. Throws with a user-facing message. */
export async function analyzeFoodText(query) {
  const parsed = await callModel(textPrompt(query), FOOD_SCHEMA, 512);
  return enrichFood(sanitizeEstimate(parsed, query), { hint: query });
}
