import { EXERCISES } from '../data/gameData';
import { getPhase, convertWeight } from './gameLogic';

/**
 * Builds a human-readable training report suitable for pasting into any AI coach.
 * Covers: profile, current weights + overload status, today's session (if any),
 * per-week session history, body-weight trend, and personal records.
 */
export function formatForCoach(state) {
  const unit = state.unit || 'kg';
  const phase = getPhase(state.currentWeek);
  const lines = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`FITQUEST TRAINING REPORT — ${state.name || 'Athlete'}`);
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');
  lines.push(`Week ${state.currentWeek}/12 | ${phase.name}: ${phase.desc}`);
  lines.push(`Level ${state.level} | Total sessions: ${state.totalSessions} | Streak: ${state.streak} day(s) | Perfect weeks: ${state.perfectWeeks}`);
  lines.push(`Total volume lifted: ${Math.round(state.totalVolume || 0).toLocaleString()} ${unit}`);
  lines.push('');

  // ── Current weights + overload status ───────────────────────────────────────
  lines.push('CURRENT WORKING WEIGHTS & OVERLOAD STATUS');
  lines.push('─'.repeat(48));
  const sug = state.overloadSuggestions || {};
  for (const ex of EXERCISES) {
    if (ex.isPlank) {
      lines.push(`  Plank: target ${ex.sets}×45-60 sec`);
      continue;
    }
    const wt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    const nextWt = convertWeight((state.liftWeights?.[ex.id] ?? ex.startKg) + 2.5, unit);
    const s = sug[ex.id];
    const status = s === 'increase' ? `→ READY TO INCREASE to ${nextWt}${unit}`
      : s === 'deload' ? '→ DELOAD (back off)'
      : s === 'repeat' ? '→ REPEAT (not yet ready)'
      : '(no recommendation yet)';
    lines.push(`  ${ex.name}: ${wt}${unit} × ${ex.sets} sets × ${ex.reps} reps  [RPE target ${ex.rpe}]  ${status}`);
  }
  lines.push('');

  // ── Today's session ─────────────────────────────────────────────────────────
  const todayDone = state.todayExDone || [];
  const details = state.todayExDetails || {};
  if (todayDone.length > 0) {
    const sessionLabel = state.todaySessionFinished ? 'TODAY\'S COMPLETED SESSION' : 'TODAY\'S SESSION (in progress)';
    lines.push(sessionLabel);
    lines.push('─'.repeat(48));
    for (const ex of EXERCISES) {
      if (!todayDone.includes(ex.id)) continue;
      const d = details[ex.id];
      if (!d) continue;
      if (ex.isPlank) {
        lines.push(`  Plank: ${d.setsCompleted} set(s) done`);
      } else {
        const wt = convertWeight(d.maxWeight || (state.liftWeights?.[ex.id] ?? ex.startKg), unit);
        const rpeStr = d.maxRPE > 0 ? ` @ RPE ${d.maxRPE}` : '';
        lines.push(`  ${ex.name}: ${wt}${unit} × ${d.setsCompleted}/${d.setsPrescribed} sets${rpeStr}`);
      }
    }
    const skipped = EXERCISES.filter(e => !todayDone.includes(e.id)).map(e => e.name);
    if (skipped.length) lines.push(`  Skipped: ${skipped.join(', ')}`);
    lines.push('');
  }

  // ── Session history by week ──────────────────────────────────────────────────
  lines.push('SESSION HISTORY');
  lines.push('─'.repeat(48));
  const wp = state.weekProgress || {};
  const weeks = Object.keys(wp).map(Number).sort((a, b) => b - a).slice(0, 8); // last 8 weeks
  if (weeks.length === 0) {
    lines.push('  No sessions logged yet.');
  } else {
    for (const w of weeks) {
      const week = wp[w];
      const sessionDates = week.dates || [];
      lines.push(`  Week ${w}: ${week.count || 0}/3 sessions${week.completed ? ' ✓' : ''}`);
      // Pull per-day exercise completions from the log
      const dayGroups = {};
      for (const entry of (state.log || [])) {
        if (entry.week !== w || entry.type !== 'exercise') continue;
        const d = entry.dateStr || entry.date;
        if (!dayGroups[d]) dayGroups[d] = [];
        dayGroups[d].push(entry.name);
      }
      for (const [day, entries] of Object.entries(dayGroups)) {
        lines.push(`    ${day}: ${entries.join(' | ')}`);
      }
      if (Object.keys(dayGroups).length === 0 && sessionDates.length > 0) {
        sessionDates.forEach(d => lines.push(`    ${d}: session logged`));
      }
    }
  }
  lines.push('');

  // ── Body weight trend ───────────────────────────────────────────────────────
  const checkins = state.weeklyCheckins || [];
  if (checkins.length > 0) {
    lines.push('BODY WEIGHT TREND');
    lines.push('─'.repeat(48));
    const recent = checkins.slice(-8);
    for (let i = 0; i < recent.length; i++) {
      const c = recent[i];
      const prev = i > 0 ? recent[i - 1] : null;
      const delta = prev ? ` (${(c.weight - prev.weight) >= 0 ? '+' : ''}${(c.weight - prev.weight).toFixed(1)}${unit})` : '';
      const waist = c.waist > 0 ? `, waist ${c.waist}cm` : '';
      lines.push(`  Wk ${c.week}: ${c.weight}${unit}${waist}${delta}`);
    }
    lines.push('');
  }

  // ── Personal records ────────────────────────────────────────────────────────
  const prs = state.personalRecords || {};
  if (Object.keys(prs).length > 0) {
    lines.push('PERSONAL RECORDS');
    lines.push('─'.repeat(48));
    for (const ex of EXERCISES.filter(e => !e.isPlank)) {
      const pr = prs[ex.id];
      if (pr) lines.push(`  ${ex.name}: ${convertWeight(pr.weight, unit)}${unit} (Week ${pr.week}, ${pr.date})`);
    }
    lines.push('');
  }

  lines.push('END OF REPORT');
  return lines.join('\n');
}
