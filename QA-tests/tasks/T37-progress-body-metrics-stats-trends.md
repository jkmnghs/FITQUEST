# T37-progress-body-metrics-stats-trends: Body Metrics cards, BMI scale and Stats & Trends (data and empty states)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/ProgressTab.jsx` (BodyStatsCard L60-181) + `src/components/StatsTab.jsx` |
| Flow | View Body Metrics (BMI, Weight, Waist/Ht, BMI scale) and Stats & Trends (power stats, weight/waist/sleep charts and empty states, PRs, lift progression) |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no |
| Estimated steps | 24 |

> Verification status: source-derived. The sections rendered in the isolated-mount harness. The 1-check-in `Need one more check-in` state was harness-verified.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- **Seed A (populated)**, fixture state for the test user:
  - `unit = "kg"`, `bmi = 24.5`
  - `assessment = { heightCm: 180, weightKg: 80, waistCm: 90, age: 30, sex: "male", goal: "fat_loss" }`
  - `weeklyCheckins = [{week:1, weight:81.0, waist:0, sleep:7}, {week:2, weight:80.2, waist:0, sleep:6.5}]`
  - `totalXp = 1250`, `totalSessions = 6`, `totalVolume = 12500`, `bestStreak = 4`
  - `personalRecords = { "<exId A>": {weight: 100, week: 2, date: "<date>"}, "<exId B>": {weight: 60, week: 1, date: "<date>"} }`
- **Seed B (empty)**, a second test user or a reset state: `bmi = null`, `weeklyCheckins = []`, `personalRecords = {}`, `totalXp = 0`.

## Test data
- Expected BMI tag for `24.5`: `Normal`
- Expected Weight card: `80.2 kg`, tag `+0.2 kg` (80.2 − 80)
- Expected Waist/Ht with `waistCm 90 / heightCm 180`: `0.5`, tag `Elevated` (≥ 0.5)
- Expected Weight Trend: Start `81 kg`, Current `80.2 kg`, Change `-0.8`, Rate `-0.80/wk`
- Expected Sleep Trend: Last `6.5h`, Avg `6.8h` ((7+6.5)/2 = 6.75 → `toFixed(1)`; record the rendered value), Target `7h`

## Steps

### TC-01: Happy path (Seed A): read every metric
1. Sign in as `test-user` (Seed A) and navigate to `http://localhost:5173/?tab=progress`.
2. Assert: section `Body Metrics` is visible.
3. Assert: the BMI MetricBox shows `24.5`, tag `Normal`, note `WHO standard cutoffs`.
4. Assert: the Weight MetricBox shows `80.2 kg` with tag `+0.2 kg`.
5. Assert: the Waist/Ht MetricBox is visible with value `0.5`, tag `Elevated`, note `< 0.5 = low risk`. The grid has 3 columns.
6. Assert: the baseline row reads `Height 180 cm`, `Age 30 yrs`, `Sex Male`, `Goal Fat Loss`.
7. Assert: the BMI scale shows labels `UNDER`, `NORMAL`, `OVER`, `OBESE` and ticks `18.5`, `25`, `30`. The marker sits at about `(24.5−14)/26 = 40.4%` of the bar width.
8. Scroll to `Stats & Trends`. Assert: Power Stats tiles show (after the CountUp animation, about 1.2 s) `1,250` Total XP, `6` Sessions, `12.5k` Volume (kg), `4` Best Streak.
9. Assert: Weight Trend shows the title `Body Weight Trend`, an SVG line with 2 dots, and Start `81 kg`, Current `80.2 kg`, Change `-0.8`, Rate `-0.80/wk`.
10. Assert: Waist Trend shows `No waist data yet` and `Include your waist measurement in your Sunday check-in to track recomposition progress.` (both check-ins have waist 0).
11. Assert: Sleep Trend shows the title `Avg Sleep (hrs/night)`, 2 dots, a dashed 7 h target line, Last `6.5h` (gold, since 6 ≤ last < 7), Avg (record value), Target `7h`.
12. Assert: Personal Records lists `<exId A name>` `100 kg` before `<exId B name>` `60 kg` (sorted by weight, descending), each with `Week N • <date>`.
13. Assert: each Lift Progression card shows an exercise name, a current weight (`N kg` or `—`) and a progress bar. Cards with an overload suggestion show `↑ +2.5`, `= REPEAT` or `↓ DELOAD`. Exercises with a PR show a `PR` badge.

### TC-02: Form validation
n/a. This section is read-only.

### TC-03: Modal coverage
n/a. No modals.

### TC-04: Button coverage
n/a. There are no interactive controls in these sections. Week navigation is T35, check-in is T31–T34, checklist is T36.

### TC-05: Negative & edge cases
- **Seed B (empty):** sign in as the empty-state user. Assert: the `Body Metrics` section is **absent** (because `state.bmi` is falsy). Weight Trend shows `No check-ins yet` with `Complete your first Sunday check-in to start tracking your weight trend. Tap the More → Check-in tab every Sunday.` Sleep Trend shows `No sleep data yet`. Personal Records shows `Complete workouts to set your first PRs!`. Power Stats show `0`, `0`, `0.0k`, `0`.
- **Stale copy:** the empty Weight Trend copy says `Tap the More → Check-in tab every Sunday.`, but NAV_TABS is `train, fuel, progress, profile` and has no `More` tab. Record this as a content defect.
- **One check-in:** with exactly 1 check-in, Weight Trend shows `Need one more check-in` / `Submit one more Sunday check-in to unlock your weight trend chart.`
- **Unit mixing (suspected defect):** for a user with `unit = "lbs"`, `assessment.weightKg = 80` and latest check-in `176`, the Weight MetricBox renders `176 kg` and tag `+96.0 kg`. The expected values are `176 lbs` and a correctly converted delta. Assert the correct behavior and record the failure (ProgressTab.jsx L93-94 hard-code ` kg`).
- **Duplicate heading (cosmetic):** assert the text `Week {N} Check-in` appears exactly once. Today it appears twice (ProgressTab SectionHeader plus CheckinTab SectionTitle, harness-verified). Record as a cosmetic defect.

## Assertions
- [ ] BMI, Weight and Waist/Ht cards show the exact seed-derived values and tags.
- [ ] Baseline row and BMI scale labels/ticks are present.
- [ ] Power Stats values match the seed after CountUp.
- [ ] Weight/Sleep charts show the correct Start/Current/Change/Rate and Last/Avg/Target.
- [ ] Waist chart empty state shows when there are fewer than 2 waist entries.
- [ ] PR list is sorted by weight, descending.
- [ ] Body Metrics is hidden when `bmi` is falsy, and all empty-state copy matches the source.
- [ ] `lbs` user Weight card is labelled with the correct unit (suspected to fail).
- [ ] `Week {N} Check-in` heading appears once (fails today, cosmetic).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (Seed A, Body Metrics visible)
- Stats & Trends with charts (Seed A)
- Empty-state Progress tab (Seed B)
- `lbs` user Weight card

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
