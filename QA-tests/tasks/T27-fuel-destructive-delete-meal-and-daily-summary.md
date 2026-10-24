# T27-fuel-destructive-delete-meal-and-daily-summary: Destructive: delete a logged meal from TODAY'S MEALS; daily summary over-goal state

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/nutrition/TodaysMealHistory.jsx`, `src/components/nutrition/DailySummaryBar.jsx`, `src/components/NutritionTab.jsx` (`todayMeals`/`dayTotals`/`goals` lines 413–426), `src/hooks/useGameState.js` (`logMeal`, `deleteMeal`) |
| Flow | Delete a logged meal from TODAY'S MEALS (destructive, no confirm). The calorie ring turns red with `kcal over` when the day's calories exceed the goal (source-derived) |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | yes. It deletes **only the throwaway meals this task creates**, identified by name, kcal and minute stamp. Never delete a pre-existing row |
| Estimated steps | 32 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis). `Delete meal` calls `onDeleteMeal(meal.id)` immediately: there is **no** confirmation dialog, so the template's "cancel confirm" path cannot be exercised. TC-04 asserts that no dialog appears and records the missing confirmation.

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a **dedicated throwaway test account** from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and `READY` has been skipped. Do not run this task against a real person's account: it writes to and deletes from the account's cloud `mealLogs`.
- Run outside the 23:55–00:05 local window. `TODAY'S MEALS` filters by the local calendar date (`toLocaleDateString('en-CA')`), so a meal logged just before midnight drops out of the list.
- Desktop viewport `1280×800`.
- Seed data: none. The baseline is read in TC-01 step 2. Pre-existing rows must survive unchanged.

## Test data
- **Mocks:** `POST **/api/nutrition` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`. `GET **/api/usda**` → 200 `{"foods":[]}`.
- `QA meal A` (normal): add `grilled chicken breast`, log as is → `248` kcal, toast `Meal logged — 248 kcal ✓`
- `QA meal B` (over goal): add `grilled chicken breast`, set the **Fat** tile to `600` → kcal = round(46.5·4 + 0·4 + 600·9) = `5586`. Card `150g · 5586 kcal`. Toast `Meal logged — 5586 kcal ✓`.
- `G`, `Pg`, `Cg`, `Fg`: the user's goals (kcal / protein / carbs / fat), read from the ring aria-label and the macro bars (`<val> / <goal> g`). If `state.nutritionGoals` is unset, they default to `2000` / `155` / `190` / `60`.
- Precondition check for the over-goal case: `C0 + 5586 > G`. This holds for any goal below 5586 kcal. If it does not hold, raise the Fat value until it does, and record the value used.

## Steps

### TC-01: Happy path: log two throwaway meals, observe the over-goal state, delete one, and check that the other remains
1. Install the mocks. Sign in as `user`, open `/?tab=fuel`, skip `READY`.
2. Record the baseline: the ring aria-label `C0 of G kcal eaten[, N0 meal(s)]`, the centre number and its label (`kcal left` / `kcal over`), the three macro bar texts, and every existing `TODAY'S MEALS` row (title, dateStr, kcal).
3. Create **QA meal A**: type `grilled chicken breast` → `ADD` → `LOG MEAL`. Assert: toast `Meal logged — 248 kcal ✓`. Click `SCAN ANOTHER`.
4. Create **QA meal B**: type `grilled chicken breast` → `ADD` → click the Fat tile → enter `600` → Enter. Assert: the card reads `150g · 5586 kcal`. Click `LOG MEAL`. Assert: toast `Meal logged — 5586 kcal ✓`. Click `SCAN ANOTHER`.
5. Assert: `TODAY'S MEALS` lists the baseline rows plus two new `QA Grilled Chicken Breast` rows (`248` and `5586`), in log order: B is below A.
6. Assert the **over-goal** summary: the ring aria-label is `<C0+5834> of G kcal eaten, <N0+2> meals`. The centre number is red, reads `C0 + 5834 − G` (formatted with `toLocaleString`), and is labelled `kcal over`. The ring stroke uses `--color-destructive`. The Fat bar reads `<round(F0+605.4)> / Fg g` in red at 100 % width. (605.4 = 5.4 from A + 600 from B.)
7. Click **`Delete meal`** on the `5586` row (QA meal B).
8. Assert: no dialog appears (no `page.on('dialog')` event, no `[role=dialog]`). The row disappears at once, and the toast is `Meal deleted`.
9. Assert: the `248` QA row and every baseline row remain. The ring aria-label is `<C0+248> of G kcal eaten, <N0+1> meal(s)`. The centre label goes back to `kcal left` (white number `G − C0 − 248`) when `C0 + 248 ≤ G`.
10. Wait 3 s, reload `/?tab=fuel`, skip `READY`. Assert: the `5586` row is still gone and the `248` row is still present (the deletion reached the cloud).
11. **Cleanup:** click `Delete meal` on the `248` QA row. Assert: toast `Meal deleted`. The ring aria-label equals the step-2 baseline exactly, and every baseline row is unchanged. If N0 was 0, the `TODAY'S MEALS` header is no longer rendered.

### TC-02: Form validation: n/a
The meal history has no inputs. The Fat-tile edit in step 4 follows the validation rules in T25.

### TC-03: Modal coverage: n/a (no confirmation dialog exists)
1. Create one QA meal (`248`). Attach a `page.on('dialog')` listener. Click `Delete meal` on it.
2. Assert: the listener never fires, no element with `role="dialog"` or `role="alertdialog"` appears, and the row is removed. Record the missing confirmation on a destructive, cloud-synced action as a UX defect (High: no undo exists).

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Delete meal` (aria-label and title `Delete meal`) | hover | the native tooltip reads `Delete meal` |
| `Delete meal` | click → cancel confirm | **n/a.** No confirm exists; the click deletes immediately (TC-03) |
| `Delete meal` | click → proceed | the row is removed, toast `Meal deleted`, the ring and macro bars drop by that meal's totals |
| `Delete meal` | click on the only row of the day | the `TODAY'S MEALS` section is removed from the DOM entirely |
| `Delete meal` | keyboard: Tab to the button, press Enter | same as a click. The button is focusable and has an accessible name |

### TC-05: Negative & edge cases
- **Exact deletion target:** with two QA rows of the same kcal (log `QA meal A` twice), delete the **second** row. Assert: exactly one `248` QA row remains, and the first row's dateStr is unchanged (ids are distinct `Date.now()-random`). Clean up the remaining row.
- **Singular/plural:** with exactly one meal today, the aria-label ends in `, 1 meal`. With two, it ends in `, 2 meals`. With zero, there is no suffix: `0 of G kcal eaten`. Check whichever applies to the baseline account, using QA meals only.
- **Rapid double-click on `Delete meal`:** the second click lands on the next row's button (rows shift up). To avoid deleting a baseline row, run this only when the QA row is the **last** row, and assert that only the QA row is removed. If a non-QA row is deleted, stop and report it as a critical defect.
- **Title truncation:** a meal whose joined food names are longer than 40 chars shows the first 40 chars plus `...` (covered by T23's `QA Grilled Chicken Breast, Broccoli, Whi...`).
- **Cross-tab consistency:** after a deletion, switch to the `Progress` tab and back to `Fuel`. Assert: the deleted row is still absent, and the ring is unchanged.

## Assertions
- [ ] `Delete meal` removes exactly the clicked row with no confirmation, and toasts `Meal deleted`.
- [ ] The deletion persists across a reload (cloud sync).
- [ ] Pre-existing `TODAY'S MEALS` rows are never modified.
- [ ] The ring aria-label tracks `<cal> of <goal> kcal eaten, N meal(s)` after each log and delete.
- [ ] Over goal, the centre label is `kcal over`, the number is red and equals `cal − goal`, and over-goal macro bars turn red.
- [ ] Back under goal, the label is `kcal left` and the number equals `goal − cal`.
- [ ] Every QA meal created by this task was deleted. The ring equals the baseline at the end.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load (baseline ring and history)
- QA meal B card at `5586 kcal` before logging
- The over-goal summary (red `kcal over`) with both QA rows
- Right after deleting QA meal B
- After the reload (persistence check)
- Final state after cleanup (equal to the baseline)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
