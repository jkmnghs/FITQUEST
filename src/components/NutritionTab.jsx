import React, { useState, useRef, useEffect } from 'react';
import { Camera, ImagePlus, ChevronRight, Info, Search, Utensils } from 'lucide-react';
import { searchUSDA, validateUSDAMacros, validateUSDAAgainstClaude, getAdjusted, sumTotals, PORTION_MULT } from '../utils/nutritionUtils';
import { findFoodReference } from '../utils/foodReference';
import DailySummaryBar from './nutrition/DailySummaryBar';
import TodaysMealHistory from './nutrition/TodaysMealHistory';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { authPostJSON } from '../lib/authFetch';

const API_URL = '/api/nutrition';

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
      const res = await authPostJSON(API_URL, {
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: image.type, data: image.base64 },
              },
              {
                type: 'text',
                text: `Analyze this meal photo. Identify each food item and estimate portions.

Return ONLY a valid JSON array — no markdown, no explanation, nothing else:
[
  {
    "name": "Food Name",
    "grams": 150,
    "calories": 250,
    "protein": 30,
    "carbs": 10,
    "fat": 8
  }
]

Guidelines:
- SCALE PRIORITY: If a kitchen scale is visible, read its exact digital display value and use that as the grams for the food on the scale. This overrides any visual estimate.
- If no scale is visible, estimate grams from visual portion size (standard dinner plate ~26cm as reference)
- Calories/macros must accurately match the gram amount (e.g. raw rolled oats: ~389 kcal/100g, ~13g protein, ~66g carbs, ~7g fat)
- Look carefully at texture, color, and context to distinguish similar foods (e.g. oats vs flour vs rice)
- Separate mixed dishes into visible components
- Use "Unknown food" if unidentifiable`,
              },
            ],
        }],
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.content[0].text.trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Could not parse response. Try again.');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No food items detected. Try a clearer photo.');
      }

      // Sanitize parsed fields — guard against non-numeric values from Claude
      parsed = parsed.map(f => ({
        name:     typeof f.name === 'string' && f.name.trim() ? f.name.trim() : 'Unknown food',
        grams:    Number(f.grams)    > 0  ? Number(f.grams)    : 100,
        calories: Number(f.calories) >= 0 ? Number(f.calories) : 0,
        protein:  Number(f.protein)  >= 0 ? Number(f.protein)  : 0,
        carbs:    Number(f.carbs)    >= 0 ? Number(f.carbs)    : 0,
        fat:      Number(f.fat)      >= 0 ? Number(f.fat)      : 0,
      }));

      // 3-tier enrichment: Reference DB → USDA (cross-validated) → Claude estimate
      const enriched = await Promise.all(parsed.map(async (f) => {
        if (f.grams <= 0) return { ...f, source: 'ai' };

        // Tier 1: Curated reference database
        const ref = findFoodReference(f.name, f.cookingMethod || '');
        if (ref) {
          const m = f.grams / 100;
          return {
            ...f,
            calories: Math.round(ref.calories * m),
            protein:  Math.round(ref.protein  * m * 10) / 10,
            carbs:    Math.round(ref.carbs     * m * 10) / 10,
            fat:      Math.round(ref.fat       * m * 10) / 10,
            source: 'reference',
          };
        }

        // Tier 2: USDA with dual validation
        const claudeCalsPer100g = (f.calories / f.grams) * 100;
        const claudePer100g = {
          calories: claudeCalsPer100g,
          protein:  (f.protein / f.grams) * 100,
          carbs:    (f.carbs   / f.grams) * 100,
          fat:      (f.fat     / f.grams) * 100,
        };
        const usda = await searchUSDA(f.name, claudeCalsPer100g);
        if (usda) {
          const m = f.grams / 100;
          const usdaResult = {
            calories: Math.round(usda.calories * m),
            protein: Math.round(usda.protein * m * 10) / 10,
            carbs: Math.round(usda.carbs * m * 10) / 10,
            fat: Math.round(usda.fat * m * 10) / 10,
          };
          const physicallyValid  = validateUSDAMacros(usdaResult, f.grams);
          const consistentClaude = validateUSDAAgainstClaude(usda, claudePer100g);
          const noMacroWipeout   =
            !(f.protein > 2 && usdaResult.protein === 0) &&
            !(f.carbs   > 2 && usdaResult.carbs   === 0) &&
            !(f.fat     > 2 && usdaResult.fat      === 0);
          if (physicallyValid && consistentClaude && noMacroWipeout) {
            return { ...f, ...usdaResult, source: 'usda' };
          }
        }

        // Tier 3: Claude's estimate
        return { ...f, source: 'ai' };
      }));

      setFoods(enriched.map(f => ({
        name:     f.name || 'Unknown',
        grams:    Number(f.grams)    || 0,
        calories: Number(f.calories) || 0,
        protein:  Number(f.protein)  || 0,
        carbs:    Number(f.carbs)    || 0,
        fat:      Number(f.fat)      || 0,
        source:   f.source || 'ai',
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
      // Ask Claude for gram weight + full nutrition
      const claudeRes = await authPostJSON(API_URL, {
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Nutritional info for: "${query}". Return ONLY JSON (no markdown):\n{"name":"Food Name","grams":150,"calories":250,"protein":22,"carbs":5,"fat":8}\nUse cooked-state values. Realistic serving gram weight.`,
        }],
      });
      if (!claudeRes.ok) throw new Error(`API error ${claudeRes.status}`);
      const claudeData = await claudeRes.json();
      const text = claudeData.content[0].text.trim();
      let c = {};
      try { c = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) c = JSON.parse(m[0]); }

      const name  = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : query;
      const grams = Number(c.grams) > 0 ? Number(c.grams) : 100;
      const claudePer100g = grams > 0 ? {
        calories: ((Number(c.calories) || 0) / grams) * 100,
        protein:  ((Number(c.protein)  || 0) / grams) * 100,
        carbs:    ((Number(c.carbs)    || 0) / grams) * 100,
        fat:      ((Number(c.fat)      || 0) / grams) * 100,
      } : null;

      // Tier 1: Reference database
      const ref = findFoodReference(name, '');
      if (ref) {
        const m = grams / 100;
        setFoods(prev => [...prev, {
          name, grams,
          calories: Math.round(ref.calories * m),
          protein:  Math.round(ref.protein  * m * 10) / 10,
          carbs:    Math.round(ref.carbs     * m * 10) / 10,
          fat:      Math.round(ref.fat       * m * 10) / 10,
          source: 'reference', portion: 'M', customGrams: null,
        }]);
        setAddText('');
        return;
      }

      // Tier 2: USDA with cross-validation
      const usdaPer100g = await searchUSDA(name, claudePer100g?.calories ?? 0);
      if (usdaPer100g && claudePer100g) {
        const m = grams / 100;
        const usdaResult = {
          calories: Math.round(usdaPer100g.calories * m),
          protein:  Math.round(usdaPer100g.protein  * m * 10) / 10,
          carbs:    Math.round(usdaPer100g.carbs     * m * 10) / 10,
          fat:      Math.round(usdaPer100g.fat       * m * 10) / 10,
        };
        if (validateUSDAMacros(usdaResult, grams) && validateUSDAAgainstClaude(usdaPer100g, claudePer100g)) {
          setFoods(prev => [...prev, { name, grams, ...usdaResult, source: 'usda', portion: 'M', customGrams: null }]);
          setAddText('');
          return;
        }
      }

      // Tier 3: Claude's estimate
      setFoods(prev => [...prev, {
        name, grams,
        calories: Math.max(0, Number(c.calories) || 0),
        protein:  Math.max(0, Number(c.protein)  || 0),
        carbs:    Math.max(0, Number(c.carbs)     || 0),
        fat:      Math.max(0, Number(c.fat)       || 0),
        source: 'ai', portion: 'M', customGrams: null,
      }]);
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
    const val = Number(grams);
    const cleaned = (grams === '' || grams == null) ? null
      : (isNaN(val) || val <= 0) ? null
      : Math.round(val * 10) / 10;
    setFoods(prev => prev.map((f, i) => i === idx ? { ...f, customGrams: cleaned } : f));
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

  function handleLogMeal() {
    const totals = sumTotals(foods);
    const meal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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

  // Today's logged meals — compare local calendar dates to avoid UTC midnight drift
  const todayLocalStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
  const todayMeals = mealLogs.filter(m =>
    m.date && new Date(m.date).toLocaleDateString('en-CA') === todayLocalStr
  );
  const dayTotals = todayMeals.reduce((acc, meal) => ({
    calories: acc.calories + meal.totals.calories,
    protein: Math.round((acc.protein + meal.totals.protein) * 10) / 10,
    carbs:   Math.round((acc.carbs   + meal.totals.carbs)   * 10) / 10,
    fat:     Math.round((acc.fat     + meal.totals.fat)     * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const goals = state.nutritionGoals || { calories: 2000, protein: 155, carbs: 190, fat: 60 };

  return (
    <div className="tab-enter" style={{ padding: '0 var(--space-4)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: 'rgba(0,229,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Utensils size={22} color="var(--color-action)" />
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            color: 'var(--color-text-primary)', letterSpacing: '0.05em',
          }}>FUEL</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>
            AI-powered nutrition tracking
          </div>
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
        <>
          {/* Primary action — Camera */}
          <button
            onClick={() => fileRef.current.click()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(179,136,255,0.06))',
              border: '1px solid var(--color-border-accent)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--space-2)',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'rgba(0,229,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Camera size={24} color="var(--color-action)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                color: 'var(--color-action)', letterSpacing: '0.05em',
              }}>SCAN MEAL</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Take a photo — AI identifies food & macros
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </button>

          {/* Secondary action — Gallery upload */}
          <button
            onClick={() => galleryRef.current.click()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--space-5)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: 'rgba(179,136,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ImagePlus size={16} color="var(--color-accent-purple)" />
            </div>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Upload from gallery
            </span>
            <ChevronRight size={14} color="var(--color-text-tertiary)" />
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em' }}>
              OR ADD MANUALLY
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
          </div>

          {/* Manual text add */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={addText}
                onChange={e => { setAddText(e.target.value); setAddError(null); }}
                onKeyDown={e => e.key === 'Enter' && !adding && addFoodByText()}
                placeholder="e.g. 2 scrambled eggs"
                style={{
                  width: '100%', padding: '11px 14px 11px 36px',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-primary)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={addFoodByText}
              disabled={adding || !addText.trim()}
              style={{
                padding: '11px 18px', borderRadius: 'var(--radius-md)', border: 'none',
                background: adding || !addText.trim()
                  ? 'var(--color-surface-2)'
                  : 'rgba(0,229,255,0.15)',
                color: adding || !addText.trim() ? 'var(--color-text-tertiary)' : 'var(--color-action)',
                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                cursor: adding || !addText.trim() ? 'default' : 'pointer',
                flexShrink: 0, letterSpacing: '0.05em',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {adding ? '…' : 'ADD'}
            </button>
          </div>
          {addError && (
            <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 10 }}>{addError}</div>
          )}

          {/* Tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}>
            <Info size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Include a fork or your hand in the frame — it helps the AI estimate portion size more accurately.
            </span>
          </div>
        </>
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
            color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 12,
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
          textAlign: 'center', padding: '32px 20px',
          color: 'var(--color-action)', fontFamily: 'var(--font-display)',
          fontSize: 11, letterSpacing: '0.1em',
        }}>
          SCANNING MEAL…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 'var(--space-3)', padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255,23,68,0.07)',
          border: '1px solid rgba(255,23,68,0.2)',
          color: 'var(--color-destructive)', fontSize: 12, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Food items */}
      {foods.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-tertiary)',
            letterSpacing: '0.1em', marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)',
          }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-primary)', fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                          {food.name}
                        </span>
                        {food.source && (
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.5,
                            borderRadius: 4, padding: '1px 5px',
                            ...(food.source === 'reference'
                              ? { color: 'var(--cyan)',   background: 'rgba(0,229,255,0.08)',  border: '1px solid rgba(0,229,255,0.3)'  }
                              : food.source === 'usda'
                              ? { color: '#76ff03',        background: 'rgba(118,255,3,0.07)',  border: '1px solid rgba(118,255,3,0.3)'  }
                              : { color: 'var(--purple)', background: 'rgba(179,136,255,0.07)', border: '1px solid rgba(179,136,255,0.25)' }),
                          }}>
                            {food.source === 'reference' ? 'REF' : food.source === 'usda' ? 'USDA' : 'AI'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                              fontFamily: 'var(--font-primary)', textAlign: 'center',
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
                        <span>&middot; {adj.calories} kcal</span>
                      </div>
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
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700 }}>{p}</span>
                            <span style={{ fontFamily: 'var(--font-primary)', fontSize: 9, opacity: 0.8 }}>{previewG}g</span>
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
                                  fontFamily: 'var(--font-primary)', fontSize: 14, fontWeight: 600,
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
                  <div style={{ display: 'flex', gap: 8 }}>
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
                                fontFamily: 'var(--font-primary)', textAlign: 'center', outline: 'none',
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'var(--font-primary)' }}>
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
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 9,
                color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', marginBottom: 8,
              }}>
                MISSING SOMETHING?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    value={addText}
                    onChange={e => { setAddText(e.target.value); setAddError(null); }}
                    onKeyDown={e => e.key === 'Enter' && !adding && addFoodByText()}
                    placeholder="e.g. 2 scrambled eggs"
                    style={{
                      width: '100%', padding: '10px 12px 10px 32px',
                      background: 'var(--color-surface-1)',
                      border: '1px solid var(--color-border-medium)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-primary)', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={addFoodByText}
                  disabled={adding || !addText.trim()}
                  style={{
                    padding: '10px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                    background: adding || !addText.trim()
                      ? 'var(--color-surface-2)'
                      : 'rgba(0,229,255,0.15)',
                    color: adding || !addText.trim() ? 'var(--color-text-tertiary)' : 'var(--color-action)',
                    fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                    cursor: adding || !addText.trim() ? 'default' : 'pointer',
                    flexShrink: 0, letterSpacing: '0.05em',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {adding ? '…' : 'ADD'}
                </button>
              </div>
              {addError && (
                <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{addError}</div>
              )}
            </div>
          )}

          {/* Meal totals */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.07), rgba(179,136,255,0.04))',
            border: '1px solid var(--color-border-accent)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
            marginTop: 'var(--space-3)', marginBottom: 'var(--space-4)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 9,
              color: 'var(--color-action)', letterSpacing: '0.1em', marginBottom: 'var(--space-3)',
            }}>
              MEAL TOTAL
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
                  color: 'var(--color-text-primary)', lineHeight: 1,
                }}>
                  {totals.calories}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3, letterSpacing: '0.05em' }}>KCAL</div>
              </div>
              {[
                { label: 'Protein', value: totals.protein, color: 'var(--color-action)' },
                { label: 'Carbs',   value: totals.carbs,   color: 'var(--color-premium)' },
                { label: 'Fat',     value: totals.fat,     color: 'var(--color-warning)' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: 'var(--font-primary)' }}>
                    {Math.round(m.value)}g
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {!logged ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, padding: '13px',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-md)', background: 'transparent',
                  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)',
                  fontSize: 10, cursor: 'pointer', letterSpacing: '0.05em',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                RE-SCAN
              </button>
              <button
                onClick={handleLogMeal}
                style={{
                  flex: 2, padding: '13px',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-action)',
                  color: 'var(--color-bg-primary)', fontFamily: 'var(--font-display)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                LOG MEAL
              </button>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: 'var(--space-5)',
              background: 'rgba(0,230,118,0.06)',
              border: '1px solid rgba(0,230,118,0.18)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 12,
                color: 'var(--color-success)', marginBottom: 'var(--space-3)',
              }}>
                MEAL LOGGED ✓
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '8px 20px',
                  border: '1px solid rgba(0,230,118,0.25)',
                  borderRadius: 'var(--radius-sm)', background: 'transparent',
                  color: 'var(--color-success)', fontFamily: 'var(--font-display)',
                  fontSize: 10, cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                SCAN ANOTHER
              </button>
            </div>
          )}
        </>
      )}


      <TodaysMealHistory todayMeals={todayMeals} onDeleteMeal={onDeleteMeal} />
    </div>
  );
}
