import { describe, it, expect } from 'vitest';
import {
  isPlausibleWaistCm, bmiLabel, getBodyMetrics, formatBodyData, formatCheckinTrend,
} from '../bodyMetrics';

const state = (over = {}) => ({
  assessment: { height: 170 },
  weeklyCheckins: [{ week: 18, weight: 64, waist: 81 }],
  ...over,
});

describe('isPlausibleWaistCm', () => {
  it('accepts a real waist in centimetres', () => {
    expect(isPlausibleWaistCm(81, 170)).toBe(true);
  });

  it('rejects an inches or pant-size figure typed into a cm field', () => {
    // The reported case: 32 stored as cm gave a waist-to-height ratio of 0.19
    expect(isPlausibleWaistCm(32, 170)).toBe(false);
  });

  it('scales the floor with height but never below 55cm', () => {
    expect(isPlausibleWaistCm(56, 120)).toBe(true);   // floor is 55, not 36
    expect(isPlausibleWaistCm(54, 120)).toBe(false);
    expect(isPlausibleWaistCm(60, 210)).toBe(false);  // floor is 63 for 210cm
  });

  it('rejects absent, zero and absurd values', () => {
    expect(isPlausibleWaistCm(0, 170)).toBe(false);
    expect(isPlausibleWaistCm(null, 170)).toBe(false);
    expect(isPlausibleWaistCm(300, 170)).toBe(false);
  });

  it('assumes an average height when height is unknown', () => {
    expect(isPlausibleWaistCm(81, 0)).toBe(true);
    expect(isPlausibleWaistCm(32, 0)).toBe(false);
  });
});

describe('bmiLabel', () => {
  it('labels each band at its boundary', () => {
    expect(bmiLabel(18.4)).toBe(' (underweight)');
    expect(bmiLabel(18.5)).toBe(' (normal)');
    expect(bmiLabel(24.9)).toBe(' (normal)');
    expect(bmiLabel(25)).toBe(' (overweight)');
    expect(bmiLabel(30)).toBe(' (obese)');
  });

  it('says nothing when there is no BMI', () => {
    expect(bmiLabel(null)).toBe('');
  });
});

describe('getBodyMetrics', () => {
  it('computes BMI from the height the app already stores', () => {
    // 64 / 1.70^2 = 22.15
    expect(getBodyMetrics(state()).bmi).toBe('22.1');
  });

  it('computes waist-to-height from a plausible waist', () => {
    expect(getBodyMetrics(state()).whr).toBe('0.48');
  });

  it('derives no ratio from an impossible waist', () => {
    const m = getBodyMetrics(state({ weeklyCheckins: [{ week: 18, weight: 64, waist: 32 }] }));
    expect(m.waistOk).toBe(false);
    expect(m.waist).toBe(0);
    expect(m.whr).toBeNull();
    expect(m.rawWaist).toBe(32); // preserved so the prompt can explain it
  });

  it('still reports BMI when the waist is unusable', () => {
    const m = getBodyMetrics(state({ weeklyCheckins: [{ week: 18, weight: 64, waist: 32 }] }));
    expect(m.bmi).toBe('22.1');
  });

  it('returns no BMI when height or weight is missing', () => {
    expect(getBodyMetrics(state({ assessment: {} })).bmi).toBeNull();
    expect(getBodyMetrics(state({ weeklyCheckins: [] })).bmi).toBeNull();
  });

  it('handles an empty state without throwing', () => {
    expect(() => getBodyMetrics({})).not.toThrow();
    expect(() => getBodyMetrics(null)).not.toThrow();
    expect(getBodyMetrics(null).bmi).toBeNull();
  });
});

describe('formatBodyData', () => {
  it('includes height and BMI, so the coach never asks for them again', () => {
    const out = formatBodyData(state(), 'kg');
    expect(out).toContain('Height: 170cm');
    expect(out).toContain('BMI: 22.1 (normal)');
  });

  it('tells the model an impossible waist is missing rather than showing it as fact', () => {
    const out = formatBodyData(state({ weeklyCheckins: [{ week: 18, weight: 64, waist: 32 }] }), 'kg');
    expect(out).toContain('not a possible waist in cm');
    expect(out).toContain('do not guess');
    expect(out).not.toContain('Waist-to-height ratio');
  });

  it('marks genuinely absent data as not set rather than inventing it', () => {
    const out = formatBodyData({ assessment: {}, weeklyCheckins: [] }, 'kg');
    expect(out).toContain('Height: not set');
    expect(out).toContain('Waist: not measured');
    expect(out).toContain('BMI: n/a');
  });

  it('respects the user weight unit', () => {
    expect(formatBodyData(state(), 'lbs')).toContain('64lbs');
  });
});

describe('formatCheckinTrend', () => {
  it('drops waist values that cannot be real, keeping the weights', () => {
    const s = state({ weeklyCheckins: [
      { week: 16, weight: 65.4, waist: 32 },
      { week: 18, weight: 64, waist: 81 },
    ] });
    const out = formatCheckinTrend(s, 'kg');
    expect(out).toContain('Wk16: 65.4kg');
    expect(out).not.toContain('w32cm');
    expect(out).toContain('Wk18: 64kg w81cm');
  });

  it('says so when there is no history', () => {
    expect(formatCheckinTrend({ weeklyCheckins: [] })).toBe('No check-ins yet');
  });
});
