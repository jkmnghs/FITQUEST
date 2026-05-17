import React, { useState, useRef, useEffect } from 'react';
import { searchUSDA, validateUSDAMacros, getAdjusted, sumTotals, PORTION_MULT } from '../utils/nutritionUtils';
import DailySummaryBar from './nutrition/DailySummaryBar';
import TodaysMealHistory from './nutrition/TodaysMealHistory';
import { useIsDesktop } from '../hooks/useIsDesktop';

const API_URL = '/api/nutrition';

// ── Quest nutrition-analysis system prompt ────────────────────────────────────
// Lives in the `system` field so it is cached across calls (no token cost repeat).
const QUEST_NUTRITION_PROMPT = `You are Quest, FitQuest's AI nutrition coach. When given a food photo, analyze it in two strict passes before returning any data. Complete each pass fully before proceeding to the next.

════════════════════════════════════════
PASS 1 — FOOD IDENTIFICATION & PORTION ESTIMATION
════════════════════════════════════════

For each visible food item, determine:

1. FOOD NAME & COOKING METHOD
   Identify not just what the food is, but HOW it was prepared:
   - Plain / steamed / boiled
   - Grilled / charred / ihaw (look for grill marks, charring)
   - Marinated then grilled / inasal (glossy, colored surface + grill marks)
   - Sautéed / stir-fried (look for sheen, oil coating on surface)
   - Sweet-cured (tocino, longganisa — reddish, slightly caramelised)
   - Breaded / fried (crispy pale-golden coating)
   - Stewed / braised (sauce pooling, tender texture — adobo, sinigang, kare-kare)
   - Mixed dish (multiple components in sauce or broth)

   IMPORTANT: Never label food as "plain" when there is visible evidence of sauce,
   marinade, charring, breading, or oil. If cooking method is ambiguous, use "cooked".

2. PORTION WEIGHT ESTIMATE
   Estimate the weight in grams. Always provide a confidence level:
   - HIGH (±10%): clearly portioned, single-ingredient item, or kitchen scale visible
   - MEDIUM (±20%): mixed dish, partially visible, or plated without clear reference
   - LOW (±30%): deep container, overlapping foods, heavily sauced, partially eaten

   SCALE OVERRIDE: If a kitchen scale is visible in the photo, read its exact digital
   display — that value overrides all visual estimates and earns HIGH confidence.

3. HIDDEN INGREDIENT CHECK
   Before finalising each item, ask:
   - Is there visible oil / butter sheen? → cooking oil contribution applies
   - Is there a sauce or marinade? → sauce carbs and fat apply
   - Is there breading or coating? → breading carbs apply
   - Is this a composite dish? → decompose into components or flag as composite
   - Is this a beverage? → estimate volume in mL and apply Rule 7
   - Are there condiments or dips? → note them; only add macros if clearly consumed in quantity

════════════════════════════════════════
PASS 2 — MACRO CALCULATION & VALIDATION
════════════════════════════════════════

Apply rules in this exact order for every item:
  Step 1 → Look up base cooked macros from standard nutrition values (Rule 1)
  Step 2 → Apply protein ceiling check (Rule 2)
  Step 3 → Add marinade / sauce carbs and fat (Rule 3) — NEVER adjust protein here
  Step 4 → Add cooking oil fat (Rule 4)
  Step 5 → Validate calorie formula (Rule 5) — correct any discrepancy before continuing

── RULE 1: ALWAYS USE COOKED STATE VALUES ──
Base all calculations on the cooked / prepared state, never raw.
Cooking dramatically changes density:
  Raw chicken breast ~120 kcal/100g  →  Cooked ~165 kcal/100g
  Raw rice ~365 kcal/100g            →  Cooked white rice ~130 kcal/100g
  Raw potato ~77 kcal/100g           →  Boiled ~87 kcal/100g  |  Fried ~312 kcal/100g
Never use raw-state values for food that is clearly cooked.

── RULE 2: PROTEIN CEILING CHECK ──
Sanity-check protein against realistic cooked maximums per 100g.
Use the "Marinated/Sauced" column when Pass 1 identified any coating, sauce, or marinade —
marination dilutes protein concentration, so the ceiling is lower.

| Food Type                              | Max protein — plain | Max protein — marinated/sauced |
|----------------------------------------|---------------------|--------------------------------|
| Chicken breast                         | 31g                 | 24–28g                         |
| Chicken thigh / dark meat              | 26g                 | 20–24g                         |
| Pork (lean cuts — kasim, pigue)        | 26g                 | 20–24g                         |
| Pork belly / liempo                    | 12g                 | 10–13g                         |
| Beef (lean cuts)                       | 28g                 | 22–26g                         |
| Fish — white (bangus, tilapia, dory)   | 22–25g              | 18–22g                         |
| Fish — oily (tuna, salmon, mackerel)   | 25–28g              | 20–25g                         |
| Seafood (shrimp, squid, crab)          | 18–22g              | 15–19g                         |
| Seafood (scallops, mussels, tahong)    | 15–20g              | 12–17g                         |
| Eggs (whole, cooked)                   | 13g                 | 12–13g                         |
| Tofu (firm)                            | 8–10g               | 7–9g                           |
| Tempeh                                 | 18–20g              | 15–18g                         |
| Legumes (beans, chickpeas, lentils)    | 8–9g                | 7–9g                           |
| Processed meats (longganisa, hotdog,   | 10–15g              | 9–13g                          |
|   tocino, chorizo, spam)               |                     |                                |

If estimated protein exceeds the ceiling, reduce it and log:
"Rule 2: Protein capped at ceiling for [food] ([cooking method])"

── RULE 3: MARINADE & SAUCE MACRO ADJUSTMENT ──
Add carbs and fat ON TOP of the base cooked macros (after Rule 2 protein ceiling is applied).
These represent sauce and marinade contributions only — do NOT adjust protein here.

| Cooking method / sauce                       | Add carbs   | Add fat    |
|----------------------------------------------|-------------|------------|
| Plain grilled / steamed (no marinade)         | +0g         | +0–1g      |
| Grilled with light soy marinade / ihaw        | +1–2g       | +1–2g      |
| Inasal (annatto-citrus marinade)              | +2–4g       | +2–4g      |
| Adobo (soy-vinegar braise, low added fat)     | +1–3g       | +1–2g      |
| Sinigang broth (per 100g broth consumed)      | +1–2g       | +0g        |
| Kare-kare (peanut-based stew)                 | +4–6g       | +6–8g      |
| Tocino / sweet-cured pork                     | +5–8g       | +3–4g      |
| Longganisa (sweet or garlicky pork)           | +4–7g       | +4–6g      |
| BBQ sauce coating                             | +5–10g      | +2–4g      |
| Teriyaki / sweet soy glaze                    | +5–8g       | +1–2g      |
| Stir-fried with oyster / hoisin sauce         | +3–6g       | +3–5g      |
| Breaded and fried (panko / breadcrumb)        | +8–12g      | +4–6g      |
| Curry / stew with coconut milk                | +3–5g       | +8–12g     |
| Satay / peanut sauce dip                      | +3–5g       | +3–5g      |
| Sisig (chopped, sizzling plate with mayo)     | +2–3g       | +8–12g     |

── RULE 4: COOKING OIL CONTRIBUTION ──
If Pass 1 identified a sheen, gloss, or oil-coated surface, add fat per 100g:
- Lightly sautéed vegetables: +2–3g fat
- Stir-fried mixed dish: +3–5g fat
- Garlic fried rice / sinangag: +4–6g fat
- Pan-seared meat / seafood: +2–4g fat
- Deep-fried (karaage, fried chicken, fries): +6–10g fat

── RULE 5: CALORIE CONSISTENCY CHECK ──
After every item is calculated, validate:
  Expected kcal = (protein_g × 4) + (carbs_g × 4) + (fat_g × 9)

If stated calories deviate from this formula by more than 5%, correct calories to match.
Macros are ground truth; calories must follow from them.

── RULE 6: CARB STAPLE REFERENCE ──
| Staple                                 | Cooked kcal/100g | Carbs/100g |
|----------------------------------------|------------------|------------|
| White rice — plain, steamed            | 130              | 28g        |
| Garlic fried rice / sinangag           | 170              | 29g        |
| Java rice / flavoured rice             | 160              | 29g        |
| Brown rice                             | 112              | 23g        |
| Champorado (chocolate rice porridge)   | 140              | 28g        |
| Pan de sal / white bread               | 265              | 49g        |
| Cooked pasta / noodles (pancit, bihon) | 130              | 25g        |
| Sweet potato / camote (boiled)         | 86               | 20g        |
| Banana (saba, ripe)                    | 89               | 23g        |

If rice appears oily, tinted, or mixed with ingredients, do not use plain white rice values.

── RULE 7: BEVERAGES ──
If a beverage is visible, estimate its volume in mL (glass ~240mL, can ~330mL):
- Plain water: 0 kcal — include with 0 macros
- Juice / soda / sweetened drinks: ~45 kcal/100mL, ~11g carbs/100mL
- Whole milk / chocolate milk: ~65 kcal/100mL, 3.5g protein, 5g carbs, 3.5g fat
- Black coffee / unsweetened tea: ~2 kcal — include with ~0 macros
- Coffee with cream + sugar: estimate additions separately (~30 kcal cream, ~16 kcal per tsp sugar)

── RULE 8: PRE-RETURN SANITY CHECK ──
Before generating the final JSON, verify:
1. Total calories are plausible for the visual portion size:
   - Small snack / side: < 250 kcal
   - Full Filipino rice meal: 500–900 kcal
   - Large restaurant plate: 800–1400 kcal
2. No single macro is implausibly high or low for that food type
3. Every item satisfies Rule 5 (kcal = P×4 + C×4 + F×9, ±5%)
4. meal_total equals the exact arithmetic sum of all items

If any check fails, correct the value before returning.

── RULE 9: MEAL CONFIDENCE ──
Set meal_confidence to the LOWEST confidence level among all items.
If any item is LOW, the overall meal must be LOW.

════════════════════════════════════════
ERROR CASE
════════════════════════════════════════

If no food is visible or the image cannot be analysed as food, return:
{"error":"no_food_detected","message":"<brief reason in one sentence>"}

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════

Return a single JSON object — no markdown fences, no explanation text, nothing else:

{
  "items": [
    {
      "name": "string",
      "cooking_method": "string",
      "weight_g": number,
      "weight_confidence": "HIGH | MEDIUM | LOW",
      "weight_range_g": { "min": number, "max": number },
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "adjustments_applied": ["Rule N: description"],
      "flags": ["string"]
    }
  ],
  "meal_total": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  },
  "meal_confidence": "HIGH | MEDIUM | LOW",
  "meal_notes": "Plain-English summary of major assumptions — cooking methods inferred, items with low confidence, hidden ingredient estimates applied."
}

CONSTRAINTS:
- meal_total must equal the exact arithmetic sum of all items
- Each item's calories must satisfy Rule 5 (±5%)
- adjustments_applied entries must start with "Rule N:" — use [] if no rules fired
- weight_range_g must reflect the confidence level (HIGH ±10%, MEDIUM ±20%, LOW ±30%)
- Keep each adjustments_applied entry under 12 words
- Keep each flags entry under 12 words
- Keep meal_notes under 40 words
- Prioritise valid complete JSON over verbose descriptions`;

export default function NutritionTab({ state, onLogMeal, onDeleteMeal, mealLogs = [] }) {
  const [image, setImage] = useState(null); // { base64, preview, type }
  const [analyzing, setAnalyzing] = useState(false);
  const [foods, setFoods] = useState([]);
  const [error, setError] = useState(null);
  const [logged, setLogged] = useState(false);
  const [addText, setAddText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [editingGram, setEditingGram] = useState(null); // { idx, value }
  const [editingName, setEditingName] = useState(null); // { idx, value }
  const [correctingIdx, setCorrectingIdx] = useState(null); // idx being re-queried
  const [editingMacro, setEditingMacro] = useState(null); // { idx, field, value }
  const [swipedIdx, setSwipedIdx] = useState(null); // index of food card swiped open (mobile)
  const [dotMenuOpenIdx, setDotMenuOpenIdx] = useState(null); // index of ⋯ menu open (desktop)
  const isDesktop = useIsDesktop();
  const swipeRef = useRef({}); // { startX, startY, moved, idx, baseX }
  const cardRefs = useRef({});  // idx -> card DOM element
  const trashRefs = useRef({}); // idx -> trash DOM element

  // Close dot-menu when clicking outside
  useEffect(() => {
    if (dotMenuOpenIdx == null) return;
    const close = () => setDotMenuOpenIdx(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dotMenuOpenIdx]);
  const fileRef = useRef();
  const galleryRef = useRef();

  // ── shared swipe/drag helpers ───────────────────────────────────────────────
  function startDrag(idx, clientX, clientY) {
    const TRASH_W = 68;
    const baseX = swipedIdx === idx ? -TRASH_W : 0;
    swipeRef.current = { startX: clientX, startY: clientY, moved: false, idx, baseX };
    const el = cardRefs.current[idx];
    const tr = trashRefs.current[idx];
    if (el) el.style.transition = 'none';
    if (tr) tr.style.transition = 'none';
  }

  function moveDrag(clientX, clientY, event) {
    const TRASH_W = 68;
    const { startX, startY, baseX } = swipeRef.current;
    if (swipeRef.current.idx == null) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (!swipeRef.current.moved && Math.abs(dy) > Math.abs(dx)) return;
    swipeRef.current.moved = true;
    if (event?.preventDefault) event.preventDefault();
    const el = cardRefs.current[swipeRef.current.idx];
    const tr = trashRefs.current[swipeRef.current.idx];
    if (!el) return;
    let newX = baseX + dx;
    if (newX > 0) newX = newX * 0.2;
    if (newX < -TRASH_W) newX = -TRASH_W + (newX + TRASH_W) * 0.2;
    el.style.transform = `translateX(${newX}px)`;
    if (tr) tr.style.opacity = Math.min(1, -newX / TRASH_W).toFixed(2);
  }

  function endDrag(clientX) {
    const TRASH_W = 68;
    const { moved, idx: sIdx, baseX, startX } = swipeRef.current;
    if (sIdx == null) return;
    const el = cardRefs.current[sIdx];
    const tr = trashRefs.current[sIdx];
    if (el) el.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (tr) tr.style.transition = 'opacity 0.28s ease';
    swipeRef.current = {};
    if (!moved) return;
    const dx = clientX - startX;
    if (baseX === 0 ? dx < -30 : dx < 20) {
      setSwipedIdx(sIdx);
    } else {
      setSwipedIdx(null);
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reject HEIC/HEIF — Anthropic vision API doesn't support them
    const lowerName = file.name.toLowerCase();
    if (
      file.type === 'image/heic' || file.type === 'image/heif' ||
      lowerName.endsWith('.heic') || lowerName.endsWith('.heif')
    ) {
      setError('HEIC photos are not supported. In iPhone Settings → Camera → Formats, choose "Most Compatible" to shoot in JPEG, or pick an existing JPEG from your gallery.');
      return;
    }

    setFoods([]);
    setError(null);
    setLogged(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL('image/jpeg', 0.85);
        setImage({ base64: resized.split(',')[1], preview: resized, type: 'image/jpeg' });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function analyzeMeal() {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    setFoods([]);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: QUEST_NUTRITION_PROMPT,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: image.type, data: image.base64 },
              },
              {
                type: 'text',
                text: 'Analyse this meal photo and return the JSON object per the output format.',
              },
            ],
          }],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.content[0].text.trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Could not parse response. Try again.');
      }

      // Handle explicit error case from the model
      if (parsed.error === 'no_food_detected') {
        throw new Error(parsed.message || 'No food items detected. Try a clearer photo.');
      }

      // Normalise new rich format → flat array the rest of the pipeline expects
      const items = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : null;
      if (!items || items.length === 0) {
        throw new Error('No food items detected. Try a clearer photo.');
      }

      // Sanitize and normalise field names (new format uses weight_g / protein_g / etc.)
      parsed = items.map(f => ({
        name:          typeof f.name === 'string' && f.name.trim() ? f.name.trim() : 'Unknown food',
        cookingMethod: typeof f.cooking_method === 'string' ? f.cooking_method.trim() : '',
        grams:         Number(f.weight_g ?? f.grams)    > 0  ? Number(f.weight_g ?? f.grams)    : 100,
        calories:      Number(f.calories)               >= 0 ? Number(f.calories)                : 0,
        protein:       Number(f.protein_g ?? f.protein) >= 0 ? Number(f.protein_g ?? f.protein)  : 0,
        carbs:         Number(f.carbs_g   ?? f.carbs)   >= 0 ? Number(f.carbs_g   ?? f.carbs)    : 0,
        fat:           Number(f.fat_g     ?? f.fat)     >= 0 ? Number(f.fat_g     ?? f.fat)      : 0,
      }));

      // Enrich Claude's macro estimates with USDA verified data in parallel
      // Only accept USDA data if it doesn't zero-out a macro Claude already estimated
      const enriched = await Promise.all(parsed.map(async (f) => {
        // Pass Claude's per-100g calorie estimate so USDA picks the closest match
        const claudeCalsPer100g = f.grams > 0 ? (f.calories / f.grams) * 100 : 0;
        const usda = await searchUSDA(f.name, claudeCalsPer100g);
        if (usda && f.grams > 0) {
          const m = f.grams / 100;
          const usdaResult = {
            calories: Math.round(usda.calories * m),
            protein: Math.round(usda.protein * m * 10) / 10,
            carbs: Math.round(usda.carbs * m * 10) / 10,
            fat: Math.round(usda.fat * m * 10) / 10,
          };
          // Reject USDA if values are physically implausible or internally inconsistent,
          // or if it zeroes out a macro that Claude already estimated as present
          const usdaValid = validateUSDAMacros(usdaResult, f.grams);
          const usdaZeroesClaudeMacro =
            (f.protein > 2 && usdaResult.protein === 0) ||
            (f.carbs   > 2 && usdaResult.carbs   === 0) ||
            (f.fat     > 2 && usdaResult.fat      === 0);
          if (!usdaValid || usdaZeroesClaudeMacro) return f;
          return { ...f, ...usdaResult };
        }
        return f;
      }));

      setFoods(enriched.map(f => ({
        name: f.name || 'Unknown',
        grams: Number(f.grams) || 0,
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
        portion: 'M',
        customGrams: null,
      })));
    } catch (err) {
      setError(err.message || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function addFoodByText() {
    const query = addText.trim();
    if (!query) return;
    setAdding(true);
    setAddError(null);
    try {
      // First get USDA data, then use it to build the Claude request
      const usdaPer100g = await searchUSDA(query);
      const claudeRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: usdaPer100g
              ? `Estimate the gram weight for: "${query}". Return ONLY JSON: {"name":"<food name>","grams":<number>}`
              : `Give nutritional info for: "${query}". Return ONLY a JSON array — no markdown:\n[{"name":"Food Name","grams":100,"calories":150,"protein":10,"carbs":20,"fat":5}]\n- Realistic gram weight for the quantity described\n- Accurate macros for that gram amount`,
          }],
        }),
      });

      if (!claudeRes.ok) throw new Error(`API error ${claudeRes.status}`);
      const claudeData = await claudeRes.json();
      const text = claudeData.content[0].text.trim();

      if (usdaPer100g) {
        // USDA has data — Claude just estimates grams & name
        let parsed = {};
        try {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch {}
        const grams = Number(parsed.grams) > 0 ? Number(parsed.grams) : 100;
        const m = grams / 100;
        const usdaResult = {
          calories: Math.round(usdaPer100g.calories * m),
          protein: Math.round(usdaPer100g.protein * m * 10) / 10,
          carbs: Math.round(usdaPer100g.carbs * m * 10) / 10,
          fat: Math.round(usdaPer100g.fat * m * 10) / 10,
        };
        // Validate USDA data before applying — same check as the image analysis path
        if (validateUSDAMacros(usdaResult, grams)) {
          setFoods(prev => [...prev, {
            name: parsed.name || query,
            grams,
            ...usdaResult,
            portion: 'M',
            customGrams: null,
          }]);
          return;
        }
        // USDA failed validation — fall through to Claude's full estimate below,
        // but we need a new request since the previous one only asked for grams
      }

      // USDA not found or failed validation — ask Claude for full nutrition estimate
      const needsFullEstimate = !usdaPer100g || true; // always re-request if we reach here
      if (needsFullEstimate) {
        const fullRes = await fetch(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 256,
            messages: [{
              role: 'user',
              content: `Give nutritional info for: "${query}". Return ONLY a JSON array — no markdown:\n[{"name":"Food Name","grams":100,"calories":150,"protein":10,"carbs":20,"fat":5}]\n- Realistic gram weight for the quantity described\n- Accurate macros for that gram amount`,
            }],
          }),
        });
        if (!fullRes.ok) throw new Error(`API error ${fullRes.status}`);
        const fullData = await fullRes.json();
        const fullText = fullData.content[0].text.trim();
        let parsed;
        try {
          parsed = JSON.parse(fullText);
        } catch {
          const match = fullText.match(/\[[\s\S]*\]/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error('Could not parse response.');
        }
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No items returned.');
        setFoods(prev => [...prev, ...parsed.map(f => ({
          name:     typeof f.name === 'string' && f.name.trim() ? f.name.trim() : query,
          grams:    Number(f.grams)    > 0  ? Number(f.grams)    : 100,
          calories: Number(f.calories) >= 0 ? Number(f.calories) : 0,
          protein:  Number(f.protein)  >= 0 ? Number(f.protein)  : 0,
          carbs:    Number(f.carbs)    >= 0 ? Number(f.carbs)    : 0,
          fat:      Number(f.fat)      >= 0 ? Number(f.fat)      : 0,
          portion: 'M',
          customGrams: null,
        }))]);
      }
      setAddText('');
    } catch (err) {
      setAddError(err.message || 'Failed to add item.');
    } finally {
      setAdding(false);
    }
  }

  function setPortion(idx, portion) {
    setFoods(prev => prev.map((f, i) => i === idx ? { ...f, portion, customGrams: null } : f));
  }

  function setGrams(idx, grams) {
    setFoods(prev => prev.map((f, i) => i === idx ? { ...f, customGrams: grams } : f));
  }

  function saveMacroEdit() {
    if (!editingMacro) return;
    const { idx, field, value } = editingMacro;
    const food = foods[idx];
    const adj = getAdjusted(food);
    const scale = adj.grams > 0 && food.grams > 0 ? adj.grams / food.grams : 1;
    const newAdj = Math.max(0, Number(value) || 0);
    const newBase = Math.round((newAdj / scale) * 10) / 10;
    setFoods(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const updated = { ...f, [field]: newBase };
      // Recalculate calories from macros to keep them consistent
      updated.calories = Math.round(updated.protein * 4 + updated.carbs * 4 + updated.fat * 9);
      return updated;
    }));
    setEditingMacro(null);
  }

  async function correctItem(idx, query) {
    if (!query.trim()) return;
    setEditingName(null);
    setCorrectingIdx(idx);
    try {
      const usdaPer100g = await searchUSDA(query);
      const claudeRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: usdaPer100g
              ? `Estimate a realistic single-serving gram weight for: "${query}". Return ONLY JSON: {"name":"<food name>","grams":<number>}`
              : `Nutritional info for: "${query}". Return ONLY JSON (no markdown):\n{"name":"Food Name","grams":150,"calories":250,"protein":22,"carbs":5,"fat":8}\nUse cooked-state values. Be accurate for the described cooking method.`,
          }],
        }),
      });
      if (!claudeRes.ok) throw new Error();
      const claudeData = await claudeRes.json();
      const text = claudeData.content[0].text.trim();
      let c = {};
      try { c = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) c = JSON.parse(m[0]); }
      const grams = Number(c.grams) > 0 ? Number(c.grams) : foods[idx]?.grams ?? 100;

      let result;
      if (usdaPer100g) {
        const m = grams / 100;
        const usdaResult = {
          calories: Math.round(usdaPer100g.calories * m),
          protein:  Math.round(usdaPer100g.protein  * m * 10) / 10,
          carbs:    Math.round(usdaPer100g.carbs     * m * 10) / 10,
          fat:      Math.round(usdaPer100g.fat       * m * 10) / 10,
        };
        result = validateUSDAMacros(usdaResult, grams) ? usdaResult : null;
      }
      if (!result) {
        result = {
          calories: Math.max(0, Number(c.calories) || 0),
          protein:  Math.max(0, Number(c.protein)  || 0),
          carbs:    Math.max(0, Number(c.carbs)     || 0),
          fat:      Math.max(0, Number(c.fat)       || 0),
        };
      }
      setFoods(prev => prev.map((f, i) => i !== idx ? f : {
        ...f,
        name:          c.name || query,
        cookingMethod: '',
        grams,
        ...result,
        customGrams: null,
        portion: 'M',
      }));
    } catch {
      // silently keep existing item if re-query fails
    } finally {
      setCorrectingIdx(null);
    }
  }

  function handleLogMeal() {
    const totals = sumTotals(foods);
    const meal = {
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      dateStr: new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      foods: foods.map(f => ({ ...f, ...getAdjusted(f) })),
      totals,
    };
    onLogMeal(meal);
    setLogged(true);
  }

  function reset() {
    setImage(null);
    setFoods([]);
    setError(null);
    setLogged(false);
    if (fileRef.current) fileRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  const totals = sumTotals(foods);

  // Today's logged meals
  const today = new Date().toDateString();
  const todayMeals = mealLogs.filter(m => new Date(m.date).toDateString() === today);
  const dayTotals = todayMeals.reduce((acc, meal) => ({
    calories: acc.calories + meal.totals.calories,
    protein: Math.round((acc.protein + meal.totals.protein) * 10) / 10,
    carbs:   Math.round((acc.carbs   + meal.totals.carbs)   * 10) / 10,
    fat:     Math.round((acc.fat     + meal.totals.fat)     * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const goals = state.nutritionGoals || { calories: 2000, protein: 155, carbs: 190, fat: 60 };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1 }}>
          NUTRITION SCANNER
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Snap your meal — AI estimates calories &amp; macros
        </div>
      </div>

      <DailySummaryBar dayTotals={dayTotals} goals={goals} mealCount={todayMeals.length} />

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Upload area or preview */}
      {!image ? (
        <div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => fileRef.current.click()}
              style={{
                flex: 1, padding: '28px 12px',
                border: '2px dashed rgba(0,229,255,0.25)',
                borderRadius: 16, background: 'rgba(0,229,255,0.03)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 10,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 40 }}>📸</span>
              <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, letterSpacing: 1 }}>
                CAMERA
              </div>
            </button>
            <button
              onClick={() => galleryRef.current.click()}
              style={{
                flex: 1, padding: '28px 12px',
                border: '2px dashed rgba(179,136,255,0.25)',
                borderRadius: 16, background: 'rgba(179,136,255,0.03)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 10,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 40 }}>🖼️</span>
              <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--purple)', fontWeight: 700, letterSpacing: 1 }}>
                UPLOAD
              </div>
            </button>
          </div>
          {/* Framing tip */}
          <div style={{
            marginTop: 10, padding: '10px 14px',
            border: '1px dashed rgba(0,229,255,0.18)',
            borderRadius: 12, background: 'rgba(0,229,255,0.03)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, flexShrink: 0,
              border: '2px dashed rgba(0,229,255,0.5)',
              borderRadius: 6, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* corner marks */}
              {[['0','0'],['0','auto'],['auto','0'],['auto','auto']].map(([t,b],i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: t === '0' ? -2 : 'auto', bottom: b === 'auto' ? -2 : 'auto',
                  left: i % 2 === 0 ? -2 : 'auto', right: i % 2 === 1 ? -2 : 'auto',
                  width: 8, height: 8,
                  borderTop: t === '0' ? '2px solid var(--cyan)' : 'none',
                  borderBottom: b === 'auto' ? '2px solid var(--cyan)' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid var(--cyan)' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid var(--cyan)' : 'none',
                }} />
              ))}
              <span style={{ fontSize: 14 }}>🍽️</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
              Fit <span style={{ color: 'var(--cyan)' }}>all food items</span> within the frame for accurate analysis. Good lighting helps too.
            </div>
          </div>

          {/* Quick add — always visible */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 8 }}>
              NO PHOTO? ADD MANUALLY
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={addText}
                onChange={e => { setAddText(e.target.value); setAddError(null); }}
                onKeyDown={e => e.key === 'Enter' && !adding && addFoodByText()}
                placeholder="e.g. 2 scrambled eggs"
                style={{
                  flex: 1, padding: '11px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'var(--text1)',
                  fontFamily: 'Rajdhani', fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                onClick={addFoodByText}
                disabled={adding || !addText.trim()}
                style={{
                  padding: '11px 16px', borderRadius: 10, border: 'none',
                  background: adding || !addText.trim()
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,229,255,0.15)',
                  color: adding || !addText.trim() ? 'var(--text3)' : 'var(--cyan)',
                  fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                  cursor: adding || !addText.trim() ? 'default' : 'pointer',
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {adding ? '...' : 'ADD'}
              </button>
            </div>
            {addError && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{addError}</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <img
            src={image.preview}
            alt="Meal"
            style={{
              width: '100%', borderRadius: 16,
              maxHeight: 320, objectFit: 'contain',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(0,229,255,0.15)',
              display: 'block',
            }}
          />
          <button
            onClick={reset}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 34, height: 34, borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,0.75)',
              color: 'white', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      )}

      {/* Analyze button */}
      {image && foods.length === 0 && !analyzing && (
        <button
          onClick={analyzeMeal}
          style={{
            width: '100%', padding: '14px', marginTop: 12,
            border: 'none', borderRadius: 12,
            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
            color: 'var(--bg)', fontFamily: 'Orbitron', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ANALYZE MEAL
        </button>
      )}

      {/* Loading */}
      {analyzing && (
        <div style={{
          textAlign: 'center', padding: '28px 20px',
          color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: 11, letterSpacing: 1,
        }}>
          SCANNING MEAL...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 12, padding: 14, borderRadius: 12,
          background: 'rgba(255,50,50,0.07)',
          border: '1px solid rgba(255,50,50,0.2)',
          color: 'var(--red)', fontSize: 12, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Food items */}
      {foods.length > 0 && (
        <>
          <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginTop: 20, marginBottom: 10 }}>
            DETECTED FOODS — ADJUST PORTIONS
          </div>

          {foods.map((food, idx) => {
            const adj = getAdjusted(food);
            const isOpen = swipedIdx === idx;
            const TRASH_W = 68;
            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  marginBottom: 10,
                  // clipPath clips overflow on mobile for the swipe-reveal; not needed on desktop
                  ...(isDesktop ? {} : { clipPath: 'inset(0 round 14px)' }),
                }}
              >
                {/* Trash — mobile only, hidden until swiped */}
                {!isDesktop && (
                <div
                  ref={el => { trashRefs.current[idx] = el; }}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: TRASH_W,
                    background: 'rgba(255,23,68,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.28s ease',
                  }}>
                  <button
                    onClick={() => {
                      setFoods(prev => prev.filter((_, i) => i !== idx));
                      setSwipedIdx(null);
                    }}
                    style={{
                      background: 'none', border: 'none',
                      color: 'white', fontSize: 22, cursor: 'pointer',
                      padding: 0, lineHeight: 1,
                    }}
                  >🗑️</button>
                </div>
                )}

                {/* Card — swipeable on mobile, static on desktop */}
                <div
                  ref={el => { cardRefs.current[idx] = el; }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${!isDesktop && isOpen ? 'rgba(255,23,68,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 14, padding: '14px',
                    transform: !isDesktop && isOpen ? `translateX(-${TRASH_W}px)` : 'translateX(0)',
                    transition: 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    position: 'relative', zIndex: 1,
                    cursor: isDesktop ? 'default' : 'grab',
                    userSelect: isDesktop ? 'auto' : 'none',
                  }}
                  onTouchStart={e => !isDesktop && startDrag(idx, e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchMove={e => !isDesktop && moveDrag(e.touches[0].clientX, e.touches[0].clientY, e)}
                  onTouchEnd={e => !isDesktop && endDrag(e.changedTouches[0].clientX)}
                  onMouseDown={e => { if (isDesktop || e.button !== 0) return; startDrag(idx, e.clientX, e.clientY); }}
                  onMouseMove={e => { if (isDesktop || swipeRef.current.idx == null) return; moveDrag(e.clientX, e.clientY, null); }}
                  onMouseUp={e => { if (isDesktop) return; endDrag(e.clientX); }}
                  onMouseLeave={e => { if (isDesktop || swipeRef.current.idx == null) return; endDrag(e.clientX); }}
                  onClick={() => { if (!isDesktop && isOpen) setSwipedIdx(null); }}
                >
                  {/* Name row + S/M/L */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      {/* Food name — editable on correction */}
                      {editingName?.idx === idx ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={editingName.value}
                            onChange={e => setEditingName({ idx, value: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') correctItem(idx, editingName.value);
                              if (e.key === 'Escape') setEditingName(null);
                            }}
                            style={{
                              flex: 1, background: 'rgba(0,229,255,0.07)',
                              border: '1px solid var(--cyan)', borderRadius: 7,
                              color: 'var(--text1)', fontFamily: 'Rajdhani',
                              fontSize: 14, fontWeight: 600, padding: '4px 8px', outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => correctItem(idx, editingName.value)}
                            style={{
                              padding: '4px 10px', borderRadius: 7, border: 'none',
                              background: 'var(--cyan)', color: 'var(--bg)',
                              fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                            }}
                          >OK</button>
                          <button
                            onClick={() => setEditingName(null)}
                            style={{
                              padding: '4px 8px', borderRadius: 7, border: 'none',
                              background: 'rgba(255,255,255,0.08)', color: 'var(--text3)',
                              fontSize: 13, cursor: 'pointer',
                            }}
                          >✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                            {correctingIdx === idx ? `${food.name}…` : food.name}
                          </span>
                          {correctingIdx !== idx && (
                            <button
                              onClick={() => setEditingName({ idx, value: food.name })}
                              title="Correct this item"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text3)', fontSize: 13, padding: '0 2px', lineHeight: 1,
                                opacity: 0.6,
                              }}
                            >✎</button>
                          )}
                        </div>
                      )}
                      {/* Cooking method badge */}
                      {food.cookingMethod && !editingName && correctingIdx !== idx && (
                        <div style={{
                          display: 'inline-block', marginTop: 4,
                          fontSize: 10, color: 'var(--text3)',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 20, padding: '2px 8px',
                        }}>
                          {food.cookingMethod}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {editingGram?.idx === idx ? (
                          <input
                            type="number"
                            value={editingGram.value}
                            onChange={e => setEditingGram({ idx, value: e.target.value })}
                            onBlur={() => {
                              const g = parseInt(editingGram.value, 10);
                              if (g > 0) setGrams(idx, g);
                              setEditingGram(null);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                            autoFocus
                            style={{
                              width: 52, background: 'rgba(0,229,255,0.1)',
                              border: '1px solid var(--cyan)', borderRadius: 5,
                              color: 'var(--cyan)', fontSize: 11, padding: '1px 4px',
                              fontFamily: 'Rajdhani', textAlign: 'center',
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => !isOpen && setEditingGram({ idx, value: adj.grams })}
                            title="Tap to edit"
                            style={{
                              cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.2)',
                              color: food.customGrams != null ? 'var(--cyan)' : 'var(--text3)',
                            }}
                          >{adj.grams}g</span>
                        )}
                        <span>&middot; {correctingIdx === idx ? '…' : `${adj.calories} kcal`}</span>
                      </div>
                      {correctingIdx === idx && (
                        <div style={{ fontSize: 9, color: 'var(--cyan)', fontFamily: 'Orbitron', letterSpacing: 1, marginTop: 2 }}>
                          RECALCULATING...
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                      {['S', 'M', 'L'].map(p => {
                        const previewG = Math.round(food.grams * PORTION_MULT[p]);
                        const isActive = food.customGrams == null && food.portion === p;
                        return (
                          <button
                            key={p}
                            onClick={() => setPortion(idx, p)}
                            style={{
                              width: 40, height: 44, borderRadius: 9,
                              border: `1px solid ${isActive ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                              background: isActive ? 'rgba(0,229,255,0.15)' : 'transparent',
                              color: isActive ? 'var(--cyan)' : 'var(--text3)',
                              cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: 2,
                              padding: 0,
                            }}
                          >
                            <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700 }}>{p}</span>
                            <span style={{ fontFamily: 'Rajdhani', fontSize: 9, opacity: 0.8 }}>{previewG}g</span>
                          </button>
                        );
                      })}
                      {/* Desktop 3-dot delete menu */}
                      {isDesktop && (
                        <div style={{ position: 'relative', marginLeft: 4 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setDotMenuOpenIdx(i => i === idx ? null : idx); }}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                              color: 'var(--text2)', fontSize: 17, cursor: 'pointer', letterSpacing: -1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                            }}
                          >⋯</button>
                          {dotMenuOpenIdx === idx && (
                            <div style={{
                              position: 'absolute', top: 32, right: 0,
                              background: 'rgba(15,21,40,0.97)', border: '1px solid rgba(255,23,68,0.2)',
                              borderRadius: 10, overflow: 'hidden',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 130, zIndex: 200,
                            }}>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setFoods(prev => prev.filter((_, i) => i !== idx));
                                  setDotMenuOpenIdx(null);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '11px 14px', border: 'none',
                                  background: 'transparent', color: 'var(--red)',
                                  fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 600,
                                  cursor: 'pointer', textAlign: 'left',
                                }}
                              ><span>🗑️</span> Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Macros — tap any value to correct it */}
                  <div style={{ display: 'flex', gap: 8, opacity: correctingIdx === idx ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    {[
                      { label: 'Protein', field: 'protein', value: adj.protein, color: 'var(--cyan)' },
                      { label: 'Carbs',   field: 'carbs',   value: adj.carbs,   color: 'var(--gold)' },
                      { label: 'Fat',     field: 'fat',     value: adj.fat,     color: 'var(--fire2)' },
                    ].map(m => {
                      const isEditingThis = editingMacro?.idx === idx && editingMacro?.field === m.field;
                      return (
                        <div
                          key={m.label}
                          onClick={() => {
                            if (!isOpen && !isEditingThis) {
                              setEditingMacro({ idx, field: m.field, value: m.value });
                              setEditingGram(null);
                            }
                          }}
                          style={{
                            flex: 1, textAlign: 'center', padding: '7px 4px',
                            background: isEditingThis ? `${m.color}14` : 'rgba(255,255,255,0.03)',
                            borderRadius: 9,
                            border: isEditingThis ? `1px solid ${m.color}` : '1px solid transparent',
                            cursor: isOpen ? 'default' : 'pointer',
                          }}
                        >
                          {isEditingThis ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              value={editingMacro.value}
                              onChange={e => setEditingMacro(prev => ({ ...prev, value: e.target.value }))}
                              onBlur={saveMacroEdit}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingMacro(null); }}
                              autoFocus
                              style={{
                                width: '100%', background: 'transparent', border: 'none',
                                color: m.color, fontSize: 14, fontWeight: 700,
                                fontFamily: 'Rajdhani', textAlign: 'center', outline: 'none',
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'Rajdhani' }}>
                              {m.value}g
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                            {m.label}{!isEditingThis && <span style={{ opacity: 0.4, marginLeft: 2 }}>✎</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })}

          {/* Add missing item — when image is loaded, keep field available */}
          {!logged && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 8 }}>
                MISSING SOMETHING?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={addText}
                  onChange={e => { setAddText(e.target.value); setAddError(null); }}
                  onKeyDown={e => e.key === 'Enter' && !adding && addFoodByText()}
                  placeholder="e.g. 2 scrambled eggs"
                  style={{
                    flex: 1, padding: '11px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, color: 'var(--text1)',
                    fontFamily: 'Rajdhani', fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={addFoodByText}
                  disabled={adding || !addText.trim()}
                  style={{
                    padding: '11px 16px', borderRadius: 10, border: 'none',
                    background: adding || !addText.trim()
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,229,255,0.15)',
                    color: adding || !addText.trim() ? 'var(--text3)' : 'var(--cyan)',
                    fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                    cursor: adding || !addText.trim() ? 'default' : 'pointer',
                    flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {adding ? '...' : 'ADD'}
                </button>
              </div>
              {addError && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{addError}</div>
              )}
            </div>
          )}

          {/* Meal totals */}
          <div style={{
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: 14, padding: '16px',
            marginTop: 6, marginBottom: 16,
          }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 12 }}>
              MEAL TOTAL
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Orbitron', fontSize: 26, fontWeight: 700, color: 'var(--text1)', lineHeight: 1 }}>
                  {totals.calories}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>KCAL</div>
              </div>
              {[
                { label: 'Protein', value: totals.protein, color: 'var(--cyan)' },
                { label: 'Carbs', value: totals.carbs, color: 'var(--gold)' },
                { label: 'Fat', value: totals.fat, color: 'var(--fire2)' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: 'Rajdhani' }}>
                    {Math.round(m.value)}g
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {!logged ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, padding: '13px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, background: 'transparent',
                  color: 'var(--text3)', fontFamily: 'Orbitron',
                  fontSize: 11, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                RE-SCAN
              </button>
              <button
                onClick={handleLogMeal}
                style={{
                  flex: 2, padding: '13px',
                  border: 'none', borderRadius: 12,
                  background: 'var(--cyan)',
                  color: 'var(--bg)', fontFamily: 'Orbitron',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                LOG MEAL
              </button>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '18px',
              background: 'rgba(0,230,118,0.07)',
              border: '1px solid rgba(0,230,118,0.2)',
              borderRadius: 12,
            }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>
                MEAL LOGGED ✓
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '8px 18px',
                  border: '1px solid rgba(0,230,118,0.3)',
                  borderRadius: 8, background: 'transparent',
                  color: 'var(--green)', fontFamily: 'Orbitron',
                  fontSize: 10, cursor: 'pointer',
                }}
              >
                SCAN ANOTHER
              </button>
            </div>
          )}
        </>
      )}

      {/* Tip when idle */}
      {!image && (
        <div style={{
          marginTop: 20, padding: '14px',
          background: 'rgba(179,136,255,0.05)',
          border: '1px solid rgba(179,136,255,0.13)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'Orbitron', marginBottom: 5, letterSpacing: 1 }}>
            TIP
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Place a fork or your hand next to the food for better portion accuracy.
          </div>
        </div>
      )}

      <TodaysMealHistory todayMeals={todayMeals} onDeleteMeal={onDeleteMeal} />
    </div>
  );
}
