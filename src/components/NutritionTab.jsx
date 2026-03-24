import React, { useState, useRef } from 'react';

const API_URL = 'https://api.anthropic.com/v1/messages';
const PORTION_MULT = { S: 0.75, M: 1.0, L: 1.5 };

function getAdjusted(food) {
  const m = PORTION_MULT[food.portion];
  return {
    grams: Math.round(food.grams * m),
    calories: Math.round(food.calories * m),
    protein: Math.round(food.protein * m * 10) / 10,
    carbs: Math.round(food.carbs * m * 10) / 10,
    fat: Math.round(food.fat * m * 10) / 10,
  };
}

function sumTotals(foods) {
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

export default function NutritionTab({ state, onLogMeal, mealLogs = [] }) {
  const [image, setImage] = useState(null); // { base64, preview, type }
  const [analyzing, setAnalyzing] = useState(false);
  const [foods, setFoods] = useState([]);
  const [error, setError] = useState(null);
  const [logged, setLogged] = useState(false);
  const fileRef = useRef();

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFoods([]);
    setError(null);
    setLogged(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImage({ base64: dataUrl.split(',')[1], preview: dataUrl, type: file.type });
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
          model: 'claude-haiku-4-5-20251001',
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
- Estimate grams from visual portion (standard dinner plate ~26cm as reference)
- Calories/macros must match the gram estimate
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

      setFoods(parsed.map(f => ({
        name: f.name || 'Unknown',
        grams: Number(f.grams) || 0,
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
        portion: 'M',
      })));
    } catch (err) {
      setError(err.message || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  function setPortion(idx, portion) {
    setFoods(prev => prev.map((f, i) => i === idx ? { ...f, portion } : f));
  }

  function handleLogMeal() {
    const totals = sumTotals(foods);
    const meal = {
      id: Date.now(),
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
  }

  const totals = sumTotals(foods);

  // Today's logged meals
  const today = new Date().toDateString();
  const todayMeals = mealLogs.filter(m => new Date(m.date).toDateString() === today);
  const dayTotals = sumTotals(
    todayMeals.flatMap(m => m.foods.map(f => ({ ...f, portion: 'M' })))
  );

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

      {/* Daily summary bar */}
      {todayMeals.length > 0 && (
        <div style={{
          background: 'rgba(0,229,255,0.05)',
          border: '1px solid rgba(0,229,255,0.12)',
          borderRadius: 12, padding: '12px 14px',
          marginBottom: 20, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--text3)', letterSpacing: 1, marginBottom: 4 }}>
              TODAY
            </div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700, color: 'var(--cyan)' }}>
              {dayTotals.calories} <span style={{ fontSize: 10, color: 'var(--text3)' }}>kcal</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'P', value: dayTotals.protein, color: 'var(--cyan)' },
              { label: 'C', value: dayTotals.carbs, color: 'var(--gold)' },
              { label: 'F', value: dayTotals.fat, color: 'var(--fire2)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'Rajdhani' }}>
                  {Math.round(m.value)}g
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'Orbitron' }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {todayMeals.length} meal{todayMeals.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Upload area or preview */}
      {!image ? (
        <button
          onClick={() => fileRef.current.click()}
          style={{
            width: '100%', padding: '36px 20px',
            border: '2px dashed rgba(0,229,255,0.25)',
            borderRadius: 16, background: 'rgba(0,229,255,0.03)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 52 }}>📸</span>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, color: 'var(--cyan)', fontWeight: 700, letterSpacing: 1 }}>
            SCAN MEAL
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Take a photo or choose from gallery
          </div>
        </button>
      ) : (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <img
            src={image.preview}
            alt="Meal"
            style={{
              width: '100%', borderRadius: 16,
              maxHeight: 280, objectFit: 'cover',
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
            return (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '14px',
                marginBottom: 10,
              }}>
                {/* Name row + S/M/L */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                      {food.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                      {adj.grams}g &middot; {adj.calories} kcal
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {['S', 'M', 'L'].map(p => (
                      <button
                        key={p}
                        onClick={() => setPortion(idx, p)}
                        style={{
                          width: 34, height: 34, borderRadius: 9,
                          border: `1px solid ${food.portion === p ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                          background: food.portion === p ? 'rgba(0,229,255,0.15)' : 'transparent',
                          color: food.portion === p ? 'var(--cyan)' : 'var(--text3)',
                          fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {p}
                      </button>
                    ))}
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
            );
          })}

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

      {/* Today's meal history */}
      {todayMeals.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 12 }}>
            TODAY'S MEALS
          </div>
          {todayMeals.map((meal, i) => (
            <div key={meal.id || i} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '12px 14px',
              marginBottom: 8, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'Rajdhani', fontWeight: 600, marginBottom: 2 }}>
                  {meal.foods.map(f => f.name).join(', ').substring(0, 40)}
                  {meal.foods.map(f => f.name).join(', ').length > 40 ? '...' : ''}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{meal.dateStr}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                  {meal.totals.calories}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>kcal</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
