/**
 * The body-composition figures the coach reasons from, derived once.
 *
 * These used to be computed inline inside the physique branch of
 * buildSystemPrompt and nowhere else, so the check-in review — which is
 * entirely about weight trends — was never told the user's height. It could
 * not compute a BMI and asked the user to "log that", for a number they had
 * entered at onboarding and which the app had all along. Deriving it in one
 * place is what stops the two prompts drifting apart again.
 */

/**
 * A waist under 30% of height is not a measurement a person has — it is
 * inches, or a pant size, typed into a field labelled cm. Onboarding rejects
 * those at entry; this is the same floor applied when reading back, because
 * check-ins recorded before that validation existed still hold them.
 */
export function isPlausibleWaistCm(waistCm, heightCm) {
  const w = Number(waistCm);
  if (!(w > 0)) return false;
  const floor = Math.max(55, Math.round((Number(heightCm) || 170) * 0.30));
  return w >= floor && w <= 250;
}

export function bmiLabel(bmi) {
  if (bmi == null) return '';
  const n = Number(bmi);
  if (n < 18.5) return ' (underweight)';
  if (n < 25) return ' (normal)';
  if (n < 30) return ' (overweight)';
  return ' (obese)';
}

export function getBodyMetrics(state) {
  const checkins = state?.weeklyCheckins || [];
  const lastCheckin = checkins[checkins.length - 1];
  const weight = Number(lastCheckin?.weight) || 0;
  const height = Number(state?.assessment?.height) || 0;
  const rawWaist = Number(lastCheckin?.waist) || 0;

  const waistOk = isPlausibleWaistCm(rawWaist, height);
  const waist = waistOk ? rawWaist : 0;

  const bmi = (height > 0 && weight > 0)
    ? (weight / Math.pow(height / 100, 2)).toFixed(1)
    : null;
  const whr = (height > 0 && waist > 0) ? (waist / height).toFixed(2) : null;

  return { weight, height, rawWaist, waist, waistOk, bmi, whr };
}

/**
 * The BODY DATA block both the physique and check-in prompts send.
 *
 * `unit` applies to body weight only — height and waist are always cm, which
 * is what the inputs collect.
 */
export function formatBodyData(state, unit = 'kg') {
  const { weight, height, rawWaist, waist, bmi, whr } = getBodyMetrics(state);

  const waistLine = waist > 0
    ? `${waist}cm`
    : rawWaist > 0
      ? `recorded as ${rawWaist}, which is not a possible waist in cm — treat it as MISSING, ask them to re-measure in centimetres, and do not guess what they meant`
      : 'not measured';

  return [
    `- Current weight: ${weight > 0 ? weight + unit : 'not set'}`,
    `- Height: ${height > 0 ? height + 'cm' : 'not set'}`,
    `- BMI: ${bmi || 'n/a'}${bmi ? bmiLabel(bmi) : ''}`,
    `- Waist: ${waistLine}`,
    whr ? `- Waist-to-height ratio: ${whr} (healthy <0.50, elevated risk >0.55)` : null,
  ].filter(Boolean).join('\n');
}

/** Check-in history line, dropping waist values that cannot be real. */
export function formatCheckinTrend(state, unit = 'kg', limit = 8) {
  const checkins = state?.weeklyCheckins || [];
  const height = Number(state?.assessment?.height) || 0;
  return checkins.slice(-limit)
    .map(c => {
      const ok = isPlausibleWaistCm(c.waist, height);
      return `Wk${c.week}: ${c.weight}${unit}${ok ? ` w${c.waist}cm` : ''}`;
    })
    .join(', ') || 'No check-ins yet';
}
