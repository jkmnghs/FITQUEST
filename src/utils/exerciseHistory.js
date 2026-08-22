/**
 * Derives per-exercise history from the session log.
 *
 * `finishSession` already snapshots `todayExDetails` into each session log
 * entry, so the data needed for "what did I lift last time?" is present — it
 * was just never surfaced. Reading it here avoids widening the persisted state
 * shape (and the cloud sync payload) for something that is purely derived.
 */

/**
 * Most recent completed performance of one exercise, excluding today's
 * in-progress session.
 *
 * @returns {{ maxWeight:number, repsPerSet:number[], setsCompleted:number,
 *             setsPrescribed:number, maxRPE:number, dateStr:string,
 *             week:number }|null}
 */
export function getLastPerformance(state, exId) {
  if (!state || !exId) return null;
  const log = state.log;
  if (!Array.isArray(log)) return null;

  // Walk backwards: the log is append-ordered, so the last match is the latest.
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    if (!entry || entry.type !== 'session') continue;
    const detail = entry.exerciseDetails?.[exId];
    if (!detail) continue;
    // A session where the exercise was on the card but never logged carries no
    // useful reference weight.
    if (!(detail.setsCompleted > 0)) continue;

    return {
      maxWeight: detail.maxWeight || 0,
      repsPerSet: Array.isArray(detail.repsPerSet) ? detail.repsPerSet.filter(r => r > 0) : [],
      setsCompleted: detail.setsCompleted || 0,
      setsPrescribed: detail.setsPrescribed || 0,
      maxRPE: detail.maxRPE || 0,
      dateStr: entry.dateStr || entry.date || '',
      week: entry.week ?? null,
    };
  }
  return null;
}

/**
 * Estimated one-rep max via the Epley formula: 1RM = w × (1 + reps/30).
 *
 * Epley is the common gym-app default and is reasonably accurate in the 1–10
 * rep range it is used for here. Above ~12 reps the estimate drifts high, so
 * it is not reported at all — a confidently wrong number is worse than none.
 */
export function estimate1RM(weightKg, reps) {
  const w = Number(weightKg);
  const r = Number(reps);
  if (!(w > 0) || !(r > 0) || r > 12) return null;
  if (r === 1) return Math.round(w * 10) / 10;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

/** Best estimated 1RM across a set of logged sets. */
export function best1RM(sets) {
  if (!Array.isArray(sets)) return null;
  let best = null;
  for (const s of sets) {
    if (!s?.done) continue;
    const est = estimate1RM(s.weightKg, s.reps);
    if (est != null && (best == null || est > best)) best = est;
  }
  return best;
}

/**
 * Barbell plate breakdown for one side of the bar.
 *
 * Returns null when the target is unreachable with the available plates —
 * lighter than the bar, or not divisible into the smallest pair — because
 * showing a partial stack that does not add up is actively misleading.
 */
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export function platesPerSide(targetKg, barKg = 20, plates = PLATES_KG) {
  const target = Number(targetKg);
  if (!(target > 0) || target < barKg) return null;

  let perSide = (target - barKg) / 2;
  if (perSide === 0) return { plates: [], remainderKg: 0 };

  const smallest = Math.min(...plates);
  const result = [];
  // Work in tenths of a kg to keep 1.25 + 2.5 arithmetic exact.
  let remaining = Math.round(perSide * 100);
  for (const plate of [...plates].sort((a, b) => b - a)) {
    const unit = Math.round(plate * 100);
    let count = Math.floor(remaining / unit);
    if (count > 0) {
      result.push({ kg: plate, count });
      remaining -= count * unit;
    }
  }
  const remainderKg = Math.round(remaining) / 100;
  // Anything left over smaller than the smallest plate cannot be loaded.
  if (remainderKg > 0 && remainderKg < smallest) {
    return { plates: result, remainderKg };
  }
  return { plates: result, remainderKg };
}

/**
 * The last `limit` completed performances of one exercise, most recent first.
 *
 * Same source and filtering as getLastPerformance — this just doesn't stop at
 * the first hit, because a single data point can't distinguish "progressing"
 * from "stalled for a month".
 */
export function getRecentPerformances(state, exId, limit = 3) {
  if (!state || !exId) return [];
  const log = state.log;
  if (!Array.isArray(log)) return [];

  const out = [];
  for (let i = log.length - 1; i >= 0 && out.length < limit; i--) {
    const entry = log[i];
    if (!entry || entry.type !== 'session') continue;
    const detail = entry.exerciseDetails?.[exId];
    if (!detail) continue;
    if (!(detail.setsCompleted > 0)) continue;

    out.push({
      maxWeight: detail.maxWeight || 0,
      repsPerSet: Array.isArray(detail.repsPerSet) ? detail.repsPerSet.filter(r => r > 0) : [],
      setsCompleted: detail.setsCompleted || 0,
      setsPrescribed: detail.setsPrescribed || 0,
      maxRPE: detail.maxRPE || 0,
      dateStr: entry.dateStr || entry.date || '',
      week: entry.week ?? null,
    });
  }
  return out;
}

/**
 * Epley estimate for one logged session.
 *
 * The log stores `maxWeight` and a flat `repsPerSet`, without pairing a weight
 * to each set — so this assumes the straight-set loading the app's programs
 * actually prescribe (same weight every set). Under a pyramid that assumption
 * would pair the top weight with a lighter set's reps and read high, which is
 * why the result is only ever labelled an estimate.
 */
export function sessionEstimated1RM(perf) {
  if (!perf) return null;
  const reps = Array.isArray(perf.repsPerSet) ? perf.repsPerSet.filter(r => r > 0) : [];
  if (reps.length === 0) return null;
  return estimate1RM(perf.maxWeight, Math.max(...reps));
}

/**
 * Direction of travel across recent sessions, oldest → newest.
 *
 * Returns null rather than guessing when there are fewer than two comparable
 * sessions. The 2.5% band keeps normal session-to-session noise from being
 * reported as a trend.
 */
export function getStrengthTrend(performances) {
  if (!Array.isArray(performances) || performances.length < 2) return null;
  const estimates = performances.map(sessionEstimated1RM).filter(e => e != null);
  if (estimates.length < 2) return null;

  // performances arrive newest-first
  const newest = estimates[0];
  const oldest = estimates[estimates.length - 1];
  if (!(oldest > 0)) return null;

  const change = (newest - oldest) / oldest;
  if (change > 0.025) return 'rising';
  if (change < -0.025) return 'falling';
  return 'flat';
}
