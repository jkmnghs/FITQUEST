import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/authFetch', () => ({ authPostJSON: vi.fn(), authFetch: vi.fn() }));
import { authPostJSON } from '../../lib/authFetch';
import { enrichFood, sanitizeEstimate, analyzeFoodText, analyzeMealPhoto } from '../foodEnrichment';

const est = (o) => sanitizeEstimate({ name: 'Food', cookingMethod: '', grams: 100, calories: 200, protein: 10, carbs: 20, fat: 8, ...o });
const noUsda = async () => null;

describe('sanitizeEstimate', () => {
  it('coerces bad numbers and names', () => {
    expect(sanitizeEstimate({ name: ' ', grams: -5, calories: 'x', protein: null }, 'eggs'))
      .toMatchObject({ name: 'eggs', grams: 100, calories: 0, protein: 0 });
  });
});

describe('enrichFood', () => {
  it('uses reference values for a plain staple', async () => {
    const f = await enrichFood(est({ name: 'White rice', grams: 200 }), { usda: noUsda });
    expect(f).toMatchObject({ source: 'reference', calories: 260, portion: 'M', customGrams: null });
  });

  it('does not treat fried rice as plain rice', async () => {
    const f = await enrichFood(est({ name: 'Garlic fried rice', cookingMethod: 'fried', grams: 200, calories: 360 }), { usda: noUsda });
    expect(f.source).toBe('ai');
    expect(f.calories).toBe(360);
  });

  it('uses USDA when it agrees with the estimate', async () => {
    const usda = async () => ({ calories: 250, protein: 26, carbs: 0, fat: 15 });
    const f = await enrichFood(est({ name: 'Pork chop', grams: 100, calories: 240, protein: 25, carbs: 0, fat: 14 }), { usda });
    expect(f).toMatchObject({ source: 'usda', calories: 250 });
  });

  it('rejects a USDA match that wipes out a macro', async () => {
    const usda = async () => ({ calories: 360, protein: 0, carbs: 90, fat: 0 });
    const f = await enrichFood(est({ name: 'Mystery', grams: 100, calories: 350, protein: 10, carbs: 70, fat: 3 }), { usda });
    expect(f.source).toBe('ai');
  });

  it('keeps the cooking method on text-added foods', async () => {
    const f = await enrichFood(est({ name: 'Pork sinigang', cookingMethod: 'sinigang' }), { usda: noUsda });
    expect(f.cookingMethod).toBe('sinigang');
  });
});

describe('model calls', () => {
  beforeEach(() => authPostJSON.mockReset());
  const reply = (obj) => ({ ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(obj) }] }) });

  it('asks for structured output on Sonnet 5.5', async () => {
    authPostJSON.mockResolvedValueOnce(reply({ name: 'White rice', cookingMethod: 'steamed', grams: 150, calories: 195, protein: 4, carbs: 42, fat: 0.4 }));
    const f = await analyzeFoodText('1 cup rice');
    const body = authPostJSON.mock.calls[0][1];
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(f.source).toBe('reference');
  });

  it('surfaces the server\'s limit message instead of a bare status code', async () => {
    authPostJSON.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'Daily food analysis limit reached (60/60). Resets at midnight.' }) });
    await expect(analyzeFoodText('eggs')).rejects.toThrow(/Daily food analysis limit/);
  });

  it('reports an empty photo clearly', async () => {
    authPostJSON.mockResolvedValueOnce(reply({ items: [] }));
    await expect(analyzeMealPhoto({ type: 'image/jpeg', base64: 'x' })).rejects.toThrow(/No food items/);
  });
});
