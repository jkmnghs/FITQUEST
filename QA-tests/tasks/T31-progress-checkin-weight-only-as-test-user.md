# T31-progress-checkin-weight-only-as-test-user: Save a first weekly check-in (weight + sleep, no waist)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/ProgressTab.jsx` (form: `src/components/CheckinTab.jsx`; mutation: `src/hooks/useGameState.js` `submitCheckin` ~L999) |
| Flow | Authenticated deep link /?tab=progress opens the Progress tab directly; submit a weekly check-in with weight only and get 'CHECK-IN SAVED! +25 XP' |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no (writes a check-in to the user's cloud state) |
| Estimated steps | 16 |

> Verification status: source-derived. The weight-only save was harness-verified in an isolated mount (the stub received `[79.5, 0, 0]` and the UI showed `CHECK-IN SAVED! +25 XP`). It has not run in the real authenticated app because Supabase was unavailable during analysis.

## Preconditions
- App running at `http://localhost:5173` **with** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured.
- Signed in as `test-user`, a signed-in Supabase test user. The runner resolves credentials from `QA-tests/.qa-catalog/auth.local.json` via `scripts/auth-resolve.mjs`. Never inline them.
- Seed: the test user has finished onboarding (`state.assessment` present, `heightCm = 180`, `weightKg = 80`, `goal = "fat_loss"`), `state.unit = "kg"`, and **no check-in exists for `state.currentWeek`**. A check-in for an earlier week is allowed.
- Leave Waist blank in this task. Any waist > 0 triggers the known getHeightCm defect (see T33).

## Test data
- `weight = "79.5"`
- `waist = ""` (left blank on purpose)
- `sleep = "7.5"`
- `{N}` = the user's `currentWeek`, read from the `WEEK {N}` label in the Weekly Summary selector on load.

## Steps

### TC-01: Happy path: save this week's check-in
1. Sign in as `test-user`.
2. Navigate to `http://localhost:5173/?tab=progress`.
3. Assert: the Progress tab is active (the `?tab=progress` value is whitelisted by `initialTabFromUrl`). The section headers `Weekly Summary`, `Week {N} Check-in` and `Stats & Trends` are visible. `Body Metrics` is visible because `state.bmi` is set.
4. Assert: the check-in card shows `WEEKLY REPORT` and `Weekly Measurements`, and one of these day banners: `✓ It's Sunday — check-in day!` or `Today is {Day} · Sunday is the recommended check-in day` (with {Day} = today's weekday name).
5. Assert: the submit button reads `SAVE CHECK-IN (+25 XP)`.
6. Assert: the Weight field (accessible name `Weight kg`) holds the latest earlier check-in weight, or is empty if the user has no check-ins. Waist (placeholder `Optional — in cm`) is empty. Sleep (placeholder `Optional`) is empty.
7. Clear Weight and fill: Weight → `79.5`. Leave Waist blank. Sleep → `7.5`.
8. Press **Enter** in the Sleep field. Assert: nothing submits, because there is no `<form>` element. The button still reads `SAVE CHECK-IN (+25 XP)`.
9. Click **`SAVE CHECK-IN (+25 XP)`**.
10. Assert: the inputs are replaced by a green ✓ hex and the text `CHECK-IN SAVED! +25 XP`.
11. Assert: the Weekly Summary highlight list shows `Check-in: 79.5 kg` (it re-renders from the updated state).
12. Assert: the user's total XP (Header / Power Stats `Total XP`) went up by 25 compared with before step 9.
13. Assert: a Supabase upsert request (cloudSet) completes with a 2xx status.
14. Reload the page (`/?tab=progress`).
15. Assert: `Check-in History` lists `Week {N}` first, with today's date and `79.5 kg` and `7.5h sleep`, and no `cm` waist tag.
16. Assert: the submit button now reads `UPDATE CHECK-IN`, and Weight is pre-filled `79.5` and Sleep `7.5`.

### TC-02: Form validation
Covered in T32 (`progress-checkin-validation`).

### TC-03: Modal coverage
n/a. The Progress tab has no modals.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SAVE CHECK-IN (+25 XP)` | click with valid weight/sleep, waist blank | `CHECK-IN SAVED! +25 XP`, +25 XP, record persisted |
| App nav `Progress` tab | click from the `Train` tab | Progress panel renders (a `ProgressTabSkeleton` may flash first via LazyTab) |

### TC-05: Negative & edge cases
- Deep link `http://localhost:5173/?tab=bogus` while signed in → the `Train` tab is active (falls back to `train`).
- Sleep `"0"` (TC-01 variant with no prior save this week): it saves, and History shows no `h sleep` tag because sleep 0 is hidden.

## Assertions
- [ ] Deep link opens the Progress tab directly.
- [ ] Button label is `SAVE CHECK-IN (+25 XP)` before the save.
- [ ] Enter does not submit.
- [ ] `CHECK-IN SAVED! +25 XP` appears after the click.
- [ ] XP goes up by exactly 25.
- [ ] Weekly Summary shows `Check-in: 79.5 kg`.
- [ ] After reload, History shows `Week {N}` · `79.5 kg` · `7.5h sleep`, and the button reads `UPDATE CHECK-IN`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (Progress tab, signed in)
- Check-in card filled before the save
- `CHECK-IN SAVED! +25 XP` state
- Check-in History after reload

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
