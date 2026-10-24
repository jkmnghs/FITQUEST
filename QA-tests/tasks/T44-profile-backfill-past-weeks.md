# T44-profile-backfill-past-weeks: Backfill a past training week

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/OtherTabs.jsx` (`SettingsTab` › `Training data` › `Backfill Past Weeks`); mutation `onBackfillWeek` → `useGameState.backfillWeek` |
| Flow | Backfill a past week: pick week, then day, then duration/weights/sets, then LOG WEEK n — DAY; recorded days are disabled (source-derived) |
| Requires auth | yes |
| Required role | qa-throwaway |
| Destructive | no (adds a backfilled session to a throwaway account; there is no undo in the UI) |
| Estimated steps | 30 |

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `qa-throwaway`: a **dedicated, disposable** Supabase test account resolved through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. **Never run this against a real person's account**, because logging a backfilled session adds permanent history that the UI cannot remove.
- Onboarding completed, and `localStorage.fitquest_onboarding_complete = "true"`.
- Seed: `state.currentWeek >= 3`. Use `Settings` › `Current Week` to raise it if needed (see T43), and restore it afterwards. Week `currentWeek - 1` has at least two training days **not** yet recorded, and `My Program` has at least 2 non-plank exercises on those days.
- Seed for TC-03: the analysis records `trainingDays` defaulting to `mon` / `wed` / `fri`. Pick `dayA` and `dayB` = two unrecorded training days whose programs contain **different** exercises.
- Optional safety: click `EXPORT` (T46) first and keep the file, so the account state can be compared afterwards.
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified).

## Test data
- `week = currentWeek - 1` (the default selection)
- `dayA` = first unrecorded training day, for example `Mon`
- `duration = 60` (range 20–120, step 5)
- `weight` for the first non-plank exercise = `"60"`
- `sets` for the second exercise = `"0"` (skip)
- `tooHeavy = "5000"` (expected clamp to 1000)
- `negWeight = "-10"` (expected to be ignored: keeps the current weight)
- `negSets = "-1"`

## Steps

### TC-01: Happy path — log a past week's day
1. Sign in as `qa-throwaway`. Navigate to `/?tab=profile`. Scroll to `Training data`.
2. Click **`Backfill Past Weeks ▾`**. Assert: the chevron rotates 180°, and the helper `Select the week and the specific training day you want to log.` shows.
3. Assert: the `Week` select defaults to `Week <currentWeek - 1>`, with options `Week 1` … `Week <currentWeek>`.
4. Assert: `Training day to log` shows one button per training day, sorted Mon→Sun. Already-recorded days are `disabled`, green, and suffixed ` ✓`. If any day is recorded, the cyan line `Week <n>: <Days> already recorded` shows.
5. Assert: the submit reads `SELECT A DAY ABOVE` and is `disabled`.
6. Click **`dayA`**. Assert: the button turns purple, the heading `<Full day name> session` shows, and `Session duration` shows `50 min` with labels `20 min` / `120 min`. The grid header shows `Exercise | <UNIT> | Sets (0=skip)`, with one row per program exercise. Weight inputs show the current lift weight as placeholder. Plank rows show `—` in place of a weight input. Sets default to 3 (plank 2). The footer shows `Completion (auto)` as `<n>/<n>  100%`.
7. Drag `Session duration` to `60`. Assert: the label reads `60 min`.
8. In the first non-plank row, fill the weight = `60`. In the second row, set `Sets (0=skip)` = `0`.
9. Assert: the completion reads `<n-1>/<n>  <round((n-1)/n*100)>%`, coloured green (95% or more), cyan (70% or more) or orange.
10. Assert: the submit is enabled and reads `LOG WEEK <week> — <DAYA>` (for example `LOG WEEK 2 — MON`).
11. Click **`LOG WEEK <week> — <DAYA>`**.
12. Assert: the day selection clears and the submit reads `SELECT A DAY ABOVE` again. The `dayA` button is now `disabled` with ` ✓`, and `Week <week>: … <DayA> … already recorded` shows.
13. Navigate to the `Progress` tab and find the summary for Week `<week>`. Assert: the session count for that week went up by 1. Record the completion % shown for the new session.
14. Reload `/?tab=profile` and reopen the accordion. Assert: `dayA` is still ` ✓` / disabled for `Week <week>`.

### TC-02: Form validation — `backfill-past-weeks`
There are no error messages. Assert the coercion, clamping and enablement behaviour.

| Field | Empty value | Range violation | Expected handling |
|---|---|---|---|
| Weight (`<UNIT>`) | `""` keeps the current weight (not sent in `customWeights`) | `tooHeavy` = 5000 | clamped to 1000 (`Math.min(1000, v)`). In `lbs`, stored as kg ÷ 2.205 |
| Weight | n/a | `negWeight` = -10 | ignored (`v > 0` check), so the current weight is kept |
| Sets (0=skip) | `""` becomes `0` (`Number("")`) and counts as skipped | `negSets` = -1 | `min=0` is DOM-only. Record whether -1 is accepted and how Completion counts it (expected: not done, because only `s > 0` counts) |
| Session duration | n/a | cannot go below 20 or above 120 | range input clamps |

1. Select a different unrecorded day (`dayB`). Clear a Sets field. Assert: the completion drops by one exercise.
2. Type `negSets` into a Sets field. Record the completion value.
3. Type `tooHeavy` into a weight field. Do **not** log this. Click another day, or change the `Week` select, to discard.
4. Change the `Week` select. Assert: the day selection resets (`SELECT A DAY ABOVE`), and the ` ✓` markers reflect the newly selected week.
5. Select a recorded (` ✓`) day. Assert: the click does nothing (the button is disabled), and the submit stays `SELECT A DAY ABOVE`.

### TC-03: BUG CANDIDATE — completion counts sets from a previously selected day
`backfillSets` keeps entries from earlier days, and `doneCount` counts **all** of its values that are `> 0`.
1. Open the accordion fresh (reload first). Click **`dayA`**. Note the completion `x/x 100%`.
2. Click **`dayB`** (different exercises). Do not change anything.
3. Assert (expected behaviour): the completion reads `<nB>/<nB>  100%`.
4. Record the actual value. If it reads something like `6/3  200%`, mark FAILED with the label **"Backfill completion % counts exercises from another day"**. Attach a screenshot. Do **not** submit.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Backfill Past Weeks ▾` | click ×2 | The accordion opens and closes, and the chevron rotates. |
| Day button (unrecorded) | click | Selected (purple). The exercise grid renders. |
| Day button (recorded ` ✓`) | click | Disabled, so nothing happens. |
| `SELECT A DAY ABOVE` | click | Disabled, so nothing happens. |
| `<DAY> ALREADY RECORDED` | n/a | Not reachable via the UI because recorded days are disabled. Note this if it is ever observed. |
| `LOG WEEK n — DAY` | click once | One backfill is logged, then the UI resets (TC-01). |

### TC-05: Negative & edge cases
- When `currentWeek = 1`, the `Week` select has only `Week 1` and the default is `Week 1`. Assert: logging is still allowed for unrecorded days of week 1. Record this; do not log.
- A day with no program exercises (an empty day in `My Program`): select it. Assert: the grid is empty and the submit stays disabled, because `programExercises.length === 0` fails `canApply`.
- Restore `Current Week` if you changed it for the seed.

## Assertions
- [ ] The submit label follows `SELECT A DAY ABOVE` → `LOG WEEK n — DAY`, and is disabled when there is no day.
- [ ] Recorded days are disabled and marked ` ✓`, and the status line lists them.
- [ ] Logging adds a session to the selected week, and that day is then disabled.
- [ ] Weight blank or ≤ 0 keeps the current weight. Weights > 1000 are clamped.
- [ ] Changing the week resets the day selection.
- [ ] BUG CANDIDATE: the completion % stays within 0–100% for the selected day only.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Accordion opened (no day selected)
- Day selected with the exercise grid
- After LOG (day marked ` ✓`)
- TC-03 completion value after switching days

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. TC-03 is a known bug candidate: a FAILED result there is the expected finding and must be reported as a defect.
