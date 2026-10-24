import { today } from './gameLogic';
import { calcBMI } from './nutrition';

export const CHECKIN_XP = 25;

/**
 * Records this week's check-in. A second check-in in the same week replaces
 * the first and earns no XP. Returns the next state (log not pruned) and the
 * XP the caller should award.
 */
export function applyCheckin(prev, weight, waist, sleep) {
  const entry = { week: prev.currentWeek, weight, waist: waist || 0, sleep: sleep || 0, date: today() };
  const isUpdate = prev.weeklyCheckins.some(c => c.week === prev.currentWeek);
  const xp = isUpdate ? 0 : CHECKIN_XP;
  const logEntry = {
    name: `Week ${prev.currentWeek} Check-in: ${weight} ${prev.unit}`,
    xp, date: today(), type: 'checkin',
    dateStr: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  };
  // Recalculate BMI from the new weight (height stays fixed from assessment)
  const weightKg = prev.unit === 'lbs' ? weight / 2.205 : weight;
  const { bmi } = calcBMI(weightKg, prev.assessment?.heightCm);
  const state = {
    ...prev,
    bmi: bmi || prev.bmi,
    checkins: isUpdate ? prev.checkins : prev.checkins + 1,
    // Replace any existing entry for this week rather than appending
    weeklyCheckins: [
      ...prev.weeklyCheckins.filter(c => c.week !== prev.currentWeek),
      entry,
    ],
    log: [...prev.log, logEntry]
  };
  return { state, xp };
}
