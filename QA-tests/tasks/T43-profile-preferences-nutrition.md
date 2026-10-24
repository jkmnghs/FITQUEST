# T43-profile-preferences-nutrition: Edit Preferences and Nutrition goals (auto-save)

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/OtherTabs.jsx` (`SettingsTab`: Preferences group + Nutrition goals accordion); persistence through `onUpdate` → `useGameState.updateSetting` |
| Flow | Edit Name/Week/Unit preferences; changes persist immediately. Edit nutrition goals in the accordion; the header kcal value updates (source-derived) |
| Requires auth | yes |
| Required role | qa-throwaway |
| Destructive | no (changes settings on a throwaway account, restored in TC-05) |
| Estimated steps | 30 |

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `qa-throwaway`: a **dedicated, disposable** Supabase test account resolved through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never use a real person's account.
- Onboarding completed, and `localStorage.fitquest_onboarding_complete = "true"`.
- Before starting, record the original values of `Name`, `Current Week`, `Unit` and the four nutrition goals (`origName`, `origWeek`, `origUnit`, `origGoals`). TC-05 restores them.
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified). There is no submit button: every change is saved on `onChange`.

## Test data
- `name = "QA Tester"` (9 chars)
- `tooLongName = "ThisNameIsWayTooLongForField"` (28 chars; expected to be truncated to `"ThisNameIsWayTooLong"`, 20 chars)
- `exactly20 = "ABCDEFGHIJKLMNOPQRST"`
- `emptyName = ""`
- `week = "Week 2"` (value `2`)
- `unit = "lbs"`
- `calories = "2200"`, `protein = "160"`, `carbs = "200"`, `fat = "65"`
- `negativeCalories = "-50"`, `blankCalories = ""`, `decimalProtein = "150.5"`

## Steps

### TC-01: Happy path — edit Preferences and confirm they persist
1. Sign in as `qa-throwaway`. Navigate to `/?tab=profile`. Scroll to `Settings` › `Preferences`.
2. Assert: three rows: `Name` (text input, `maxlength=20`), `Current Week` (select with `Week 1` … `Week N`, where N = max(currentWeek + 4, 12)) and `Unit` (select with options `kg`, `lbs`).
3. Clear `Name` and type `name`. Select `Current Week` = `week`. Select `Unit` = `unit`.
4. Assert: the Name input shows `QA Tester`. The desktop rail header (if visible) shows `Week 2 · Lvl <n>`. The Backfill grid header (open `Backfill Past Weeks` and pick any day) shows `LBS` as its unit column.
5. Wait 2000 ms for the cloud write. Assert: any Supabase REST write that follows (for example to `/rest/v1/user_profiles`) returns 2xx. Record the exact endpoint, because the sync path was not traced in the analysis.
6. Reload the page. Assert: `Name` = `QA Tester`, `Current Week` = `Week 2`, `Unit` = `lbs`.

### TC-02: Happy path — Nutrition goals
1. In `Training data`, find the `Nutrition goals` row button. Assert: `aria-expanded="false"` and the trailing value reads `<calories> kcal`, or `— kcal` when no goals are set.
2. Click **`Nutrition goals`**. Assert: `aria-expanded="true"`, the chevron rotates 90°, and the panel shows `Auto-calculated from your profile (height, weight, goal, activity). Edit to override.` with four `type=number`, `min=0` inputs: `Calories (kcal)` (placeholder `2000`), `Protein (g)` (`155`), `Carbs (g)` (`190`) and `Fat (g)` (`60`).
3. Fill `Calories (kcal)` = `calories`, `Protein (g)` = `protein`, `Carbs (g)` = `carbs`, `Fat (g)` = `fat`.
4. Assert: the row header now reads `2200 kcal` and updates while you type.
5. Navigate to the `Fuel` tab. Assert: the calorie and macro targets shown there are 2200 kcal / 160 g / 200 g / 65 g. This is a cross-tab check: `NutritionTab` was not analyzed, so if the targets render differently, record what is shown rather than failing outright.
6. Reload `/?tab=profile`, then expand `Nutrition goals`. Assert: the four values persist.
7. Click **`Nutrition goals`** again. Assert: the panel collapses and `aria-expanded="false"`.

### TC-03: Form validation — `preferences` and `nutrition-goals`
There are no visible error messages anywhere in these forms. Assert the coercion behaviour instead.

| Field | Empty value | Pattern / range violation | Max-length overflow |
|---|---|---|---|
| Name | `""` is accepted and saved (no error). Record what the Header and Rank show for an empty name. | n/a | typing `tooLongName` stores `ThisNameIsWayTooLong` (20 chars). `exactly20` is stored in full. |
| Calories (kcal) | `""` becomes `0`: the header shows `0 kcal` (`Number(v) \|\| 0`) | `-50` is **accepted** and the header shows `-50 kcal` (`min=0` is DOM-only). **BUG CANDIDATE.** | n/a |
| Protein (g) | `""` becomes `0` | `-1` accepted. `150.5` stored as `150.5` | n/a |
| Carbs (g) / Fat (g) | `""` becomes `0` | `-1` accepted | n/a |

1. Type `tooLongName` into `Name`. Assert: the input value has length 20 and equals `ThisNameIsWayTooLong`.
2. Paste `tooLongName` via the clipboard. Assert: still truncated to 20.
3. Clear `Calories (kcal)`. Assert: the header shows `0 kcal`, and the input shows `0` (not blank).
4. Type `negativeCalories`. Assert (expected behaviour): the value is rejected or clamped to 0. Record the actual behaviour. If the header shows `-50 kcal`, mark FAILED with the label **"Nutrition goals accept negative values"** and attach a screenshot.
5. Type `decimalProtein` into `Protein (g)`. Assert: no error, and the value is kept.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Nutrition goals` row | click ×2 | Expands and collapses, and `aria-expanded` toggles `true` / `false`. |
| `Current Week` select | pick the highest option | The option count grows to `max(newWeek + 4, 12)` on re-render. |
| `Unit` select | `kg` → `lbs` → `kg` | The value is saved each time with no confirm dialog. |

### TC-05: Negative & edge cases, then restore
- Set `Current Week` to `Week 12`. Assert: the `Cycle End Reached!` card with `CLAIM CYCLE REWARD` appears at the top of Settings. Do not click it. Set the week back.
- Go offline (DevTools), change `Name` to `Offline Edit`, then go back online. Assert: no crash, and the value is kept locally. Record whether it syncs to the cloud after reconnecting (reload after 5 s).
- **Restore:** set `Name` = `origName`, `Current Week` = `origWeek`, `Unit` = `origUnit` and the nutrition goals = `origGoals`. Reload and assert that they persisted.

## Assertions
- [ ] `Name`, `Current Week` and `Unit` save on change and survive a reload.
- [ ] The Name input enforces `maxlength=20`.
- [ ] The `Current Week` options are `Week 1` … `Week max(currentWeek + 4, 12)`.
- [ ] The `Nutrition goals` accordion toggles `aria-expanded`, and the header shows `<calories> kcal` or `— kcal`.
- [ ] The nutrition values save on change, show up in the Fuel tab and survive a reload.
- [ ] Blank nutrition input becomes `0`. Negative values are accepted (bug candidate, recorded).
- [ ] The original values are restored at the end.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx), except during the deliberate offline step.

## Screenshots required
- Preferences group, initial
- Nutrition goals expanded, initial
- Header showing `2200 kcal` after edit
- Name truncated at 20 characters
- Negative calories state (`-50 kcal`)
- Final state after the restore

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. The negative-value result in TC-03 step 4 is a known bug candidate: report a FAILED result there as a defect.
