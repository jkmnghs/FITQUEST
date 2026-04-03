import React, { useState, useRef } from 'react';
import { searchUSDA, validateUSDAMacros, getAdjusted, sumTotals, PORTION_MULT } from '../utils/nutritionUtils';
import DailySummaryBar from './nutrition/DailySummaryBar';
import TodaysMealHistory from './nutrition/TodaysMealHistory';

const API_URL = 'https://api.anthropic.com/v1/messages';

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
  const [swipedIdx, setSwipedIdx] = useState(null); // index of food card swiped open
  const swipeRef = useRef({}); // { startX, startY, moved, idx, baseX }
  const cardRefs = useRef({});  // idx -> card DOM element
  const trashRefs = useRef({}); // idx -> trash DOM element
  const fileRef = useRef();
  const galleryRef = useRef();

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
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
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
        }),
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
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
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
        // USDA failed validation — fall through to Claude's full estimate below
      }

      // USDA not found or failed validation — use Claude's full nutrition estimate
      {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\[[\s\S]*\]/);
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
                  // clip-path is more reliable than overflow:hidden for clipping
                  // CSS-transformed children on mobile Safari
                  clipPath: 'inset(0 round 14px)',
                }}
              >
                {/* Trash — hidden until swiped */}
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

                {/* Swipeable card — slides left to reveal trash */}
                <div
                  ref={el => { cardRefs.current[idx] = el; }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isOpen ? 'rgba(255,23,68,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 14, padding: '14px',
                    transform: isOpen ? `translateX(-${TRASH_W}px)` : 'translateX(0)',
                    transition: 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    position: 'relative', zIndex: 1,
                  }}
                  onTouchStart={e => {
                    const el = cardRefs.current[idx];
                    // Start from whatever position the card currently is at
                    const baseX = swipedIdx === idx ? -TRASH_W : 0;
                    swipeRef.current = {
                      startX: e.touches[0].clientX,
                      startY: e.touches[0].clientY,
                      moved: false,
                      idx,
                      baseX,
                    };
                    // Disable transitions so card + trash follow finger exactly
                    if (el) el.style.transition = 'none';
                    const tr = trashRefs.current[idx];
                    if (tr) tr.style.transition = 'none';
                  }}
                  onTouchMove={e => {
                    const { startX, startY, baseX } = swipeRef.current;
                    const dx = e.touches[0].clientX - startX;
                    const dy = e.touches[0].clientY - startY;
                    // First movement: ignore if scrolling vertically
                    if (!swipeRef.current.moved && Math.abs(dy) > Math.abs(dx)) return;
                    swipeRef.current.moved = true;
                    e.preventDefault(); // lock scroll once we're swiping horizontally
                    const el = cardRefs.current[idx];
                    const tr = trashRefs.current[idx];
                    if (!el) return;
                    // Clamp: can't go past fully open (-TRASH_W) or past closed (0)
                    // Add slight resistance past the limits for a rubber-band feel
                    let newX = baseX + dx;
                    if (newX > 0) newX = newX * 0.2;           // resist overdrag right
                    if (newX < -TRASH_W) newX = -TRASH_W + (newX + TRASH_W) * 0.2; // resist overdrag left
                    el.style.transform = `translateX(${newX}px)`;
                    // Drive trash opacity in sync with the drag (0 → 1 as card slides -TRASH_W)
                    if (tr) tr.style.opacity = Math.min(1, -newX / TRASH_W).toFixed(2);
                  }}
                  onTouchEnd={e => {
                    const { moved, idx: sIdx, baseX, startX } = swipeRef.current;
                    const el = cardRefs.current[sIdx];
                    const tr = trashRefs.current[sIdx];
                    // Re-enable smooth snap transitions
                    if (el) el.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    if (tr) tr.style.transition = 'opacity 0.28s ease';
                    if (!moved) return;
                    const dx = e.changedTouches[0].clientX - startX;
                    // Snap open if dragged left >30px from closed, or snap closed if dragged right >20px from open
                    if (baseX === 0 ? dx < -30 : dx < 20) {
                      setSwipedIdx(sIdx); // snap open → React will apply translateX(-TRASH_W)
                    } else {
                      setSwipedIdx(null); // snap closed → React will apply translateX(0)
                    }
                  }}
                  onClick={() => { if (isOpen) setSwipedIdx(null); }}
                >
                  {/* Name row + S/M/L */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <div style={{ fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                        {food.name}
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
                        <span>&middot; {adj.calories} kcal</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
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
                    </div>
                  </div>

                  {/* Macros */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Protein', value: adj.protein, color: 'var(--cyan)' },
                      { label: 'Carbs', value: adj.carbs, color: 'var(--gold)' },
                      { label: 'Fat', value: adj.fat, color: 'var(--fire2)' },
                    ].map(m => (
                      <div key={m.label} style={{
                        flex: 1, textAlign: 'center', padding: '7px 4px',
                        background: 'rgba(255,255,255,0.03)', borderRadius: 9,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'Rajdhani' }}>
                          {m.value}g
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.label}</div>
                      </div>
                    ))}
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
