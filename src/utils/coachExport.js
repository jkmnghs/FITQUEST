import { EXERCISES, ACHIEVEMENTS } from '../data/gameData';
import { getPhase, convertWeight } from './gameLogic';

function getExercises(state) {
  return state.activeExercises?.length ? state.activeExercises : EXERCISES;
}

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

  // ── Athlete profile ──────────────────────────────────────────────────────────
  const a = state.assessment || {};
  const GOAL_LABELS = { fat_loss: 'Fat Loss', muscle: 'Build Muscle', recomp: 'Body Recomp', strength: 'Strength' };
  const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const ACTIVITY_LABELS = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', very_active: 'Very Active' };
  lines.push('ATHLETE PROFILE');
  lines.push('---');
  if (a.heightCm)   lines.push(`  Height:   ${a.heightCm} cm`);
  if (a.age)        lines.push(`  Age:      ${a.age} yrs`);
  if (a.sex)        lines.push(`  Sex:      ${a.sex === 'male' ? 'Male' : 'Female'}`);
  if (a.goal)       lines.push(`  Goal:     ${GOAL_LABELS[a.goal] ?? a.goal}`);
  if (a.level)      lines.push(`  Level:    ${LEVEL_LABELS[a.level] ?? a.level}`);
  if (a.dailyActivity) lines.push(`  Activity: ${ACTIVITY_LABELS[a.dailyActivity] ?? a.dailyActivity}`);
  // Current body metrics (most recent check-in weight, or assessment baseline)
  const latestCheckin = (state.weeklyCheckins || []).at(-1);
  const currentWeightKg = latestCheckin?.weight ?? a.weightKg;
  const currentWaistCm  = latestCheckin?.waist  ?? a.waistCm;
  if (currentWeightKg) {
    const dispWt = unit === 'lbs' ? `${(currentWeightKg * 2.205).toFixed(1)} lbs` : `${currentWeightKg} kg`;
    lines.push(`  Weight:   ${dispWt}${latestCheckin ? ` (Wk ${latestCheckin.week} check-in)` : ' (baseline)'}`);
  }
  if (currentWaistCm)   lines.push(`  Waist:    ${currentWaistCm} cm`);
  if (state.bmi)        lines.push(`  BMI:      ${state.bmi.toFixed(1)} (${state.bmiCategory || ''})`);
  lines.push('');

  // ── Current weights + overload status ───────────────────────────────────────
  lines.push('CURRENT WORKING WEIGHTS & OVERLOAD STATUS');
  lines.push('---');
  const sug = state.overloadSuggestions || {};
  for (const ex of getExercises(state)) {
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

  // ── Today's planned workout (from day templates) ────────────────────────────
  const DAY_KEYS_ORD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = DAY_KEYS_ORD[new Date().getDay()];
  const todayTemplate = state.dayTemplates?.[todayKey];
  if (todayTemplate) {
    lines.push(`TODAY'S PLANNED WORKOUT — ${todayKey.toUpperCase()} (${todayTemplate.title || 'Session'})`);
    lines.push('---');
    for (const ex of (todayTemplate.exercises || [])) {
      const wt = ex.isBodyweight ? 'bodyweight' : convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg ?? 0, unit) + unit;
      lines.push(`  ${ex.name}: ${ex.sets} sets × ${ex.reps} reps @ ${wt}`);
    }
    lines.push('');
  }

  // ── Today's session (in-progress or just finished) ──────────────────────────
  const todayDone = state.todayExDone || [];
  const details = state.todayExDetails || {};

  // Fall back to the most recent session log entry if todayExDone has been cleared
  const recentSessionLog = (state.log || [])
    .filter(e => e.type === 'session' && e.exerciseDetails && Object.keys(e.exerciseDetails).length > 0)
    .at(-1);

  const activeDone = todayDone.length > 0 ? todayDone : (recentSessionLog?.exercisesDone || []);
  const activeDetails = todayDone.length > 0 ? details : (recentSessionLog?.exerciseDetails || {});
  const sessionLabel = todayDone.length > 0
    ? (state.todaySessionFinished ? 'TODAY\'S COMPLETED SESSION' : 'TODAY\'S SESSION (in progress)')
    : recentSessionLog ? `MOST RECENT SESSION (${recentSessionLog.dateStr || recentSessionLog.date})` : null;

  if (sessionLabel && activeDone.length > 0) {
    lines.push(sessionLabel);
    lines.push('---');
    for (const ex of getExercises(state)) {
      if (!activeDone.includes(ex.id)) continue;
      const d = activeDetails[ex.id];
      if (!d) continue;
      if (ex.isPlank) {
        lines.push(`  Plank: ${d.setsCompleted} set(s) done`);
      } else {
        const wt = convertWeight(d.maxWeight || (state.liftWeights?.[ex.id] ?? ex.startKg), unit);
        const rpeStr = d.maxRPE > 0 ? ` @ RPE ${d.maxRPE}` : '';
        let repsStr = '';
        if (d.repsPerSet && d.repsPerSet.length > 0) {
          const allSame = d.repsPerSet.every(r => r === d.repsPerSet[0]);
          repsStr = allSame
            ? ` × ${d.repsPerSet[0]} reps`
            : ` × [${d.repsPerSet.join('/')} reps]`;
        }
        lines.push(`  ${ex.name}: ${wt}${unit} × ${d.setsCompleted}/${d.setsPrescribed} sets${repsStr}${rpeStr}`);
      }
    }
    const skipped = EXERCISES.filter(e => !activeDone.includes(e.id)).map(e => e.name);
    if (skipped.length) lines.push(`  Skipped: ${skipped.join(', ')}`);
    lines.push('');
  }

  // ── Session history by week ──────────────────────────────────────────────────
  lines.push('SESSION HISTORY');
  lines.push('---');
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
    lines.push('---');
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

  // ── Personal records (always shown — current weight as baseline if no PR yet) ──
  const prs = state.personalRecords || {};
  lines.push('PERSONAL RECORDS');
  lines.push('---');
  for (const ex of EXERCISES.filter(e => !e.isPlank)) {
    const pr = prs[ex.id];
    const curWt = convertWeight(state.liftWeights?.[ex.id] ?? ex.startKg, unit);
    if (pr) {
      const prWt = convertWeight(pr.weight, unit);
      const isCurrent = pr.weight === (state.liftWeights?.[ex.id] ?? ex.startKg);
      lines.push(`  ${ex.name}: ${prWt}${unit}  (set Week ${pr.week}, ${pr.date}${isCurrent ? ' — still current' : ` → now at ${curWt}${unit}`})`);
    } else {
      lines.push(`  ${ex.name}: no PR yet — current working weight ${curWt}${unit}`);
    }
  }
  lines.push('');

  // ── Achievements ─────────────────────────────────────────────────────────────
  const unlocked = (state.achDone || []);
  lines.push(`ACHIEVEMENTS  (${unlocked.length}/${ACHIEVEMENTS.length} unlocked)`);
  lines.push('---');
  for (const ach of ACHIEVEMENTS) {
    const done = unlocked.includes(ach.id);
    lines.push(`  ${done ? '[X]' : '[ ]'} ${ach.name} — ${ach.desc}`);
  }
  lines.push('');

  // ── Nutrition goals & today's intake ────────────────────────────────────────
  const nGoals = state.nutritionGoals || {};
  if (nGoals.calories) {
    lines.push('NUTRITION GOALS (set by AI coach)');
    lines.push('---');
    lines.push(`  Calories: ${nGoals.calories} kcal/day`);
    lines.push(`  Protein:  ${nGoals.protein}g`);
    lines.push(`  Carbs:    ${nGoals.carbs}g`);
    lines.push(`  Fat:      ${nGoals.fat}g`);
    lines.push('');
  }

  // Today's nutrition intake
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayMeals = (state.mealLogs || []).filter(m => m.date && new Date(m.date).toLocaleDateString('en-CA') === todayStr);
  if (todayMeals.length > 0) {
    const totals = todayMeals.reduce((acc, meal) => {
      acc.calories += meal.totals?.calories || 0;
      acc.protein  += meal.totals?.protein  || 0;
      acc.carbs    += meal.totals?.carbs    || 0;
      acc.fat      += meal.totals?.fat      || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    lines.push("TODAY'S NUTRITION INTAKE");
    lines.push('---');
    lines.push(`  Calories: ${Math.round(totals.calories)} kcal${nGoals.calories ? ` / ${nGoals.calories} goal` : ''}`);
    lines.push(`  Protein:  ${Math.round(totals.protein)}g${nGoals.protein ? ` / ${nGoals.protein}g goal` : ''}`);
    lines.push(`  Carbs:    ${Math.round(totals.carbs)}g${nGoals.carbs ? ` / ${nGoals.carbs}g goal` : ''}`);
    lines.push(`  Fat:      ${Math.round(totals.fat)}g${nGoals.fat ? ` / ${nGoals.fat}g goal` : ''}`);
    lines.push(`  Meals logged: ${todayMeals.length}`);
    lines.push('');
  }

  lines.push('END OF REPORT');
  return lines.join('\n');
}
