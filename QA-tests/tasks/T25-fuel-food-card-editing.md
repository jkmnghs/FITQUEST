# T25-fuel-food-card-editing: Edit grams and macros inline, switch S/M/L portions

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (gram editor lines 770–798, `setGrams` 362–368, macro tiles 868–918, `saveMacroEdit` 370–386, `setPortion` 358–360), `src/utils/nutritionUtils.js` (`getAdjusted`, `PORTION_MULT`) |
| Flow | Edit grams inline (tap `<N>g`) and check that macros scale; edit a macro tile and check that calories are recomputed as 4/4/9 (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | no. It logs one throwaway meal and deletes that same meal during cleanup |
| Estimated steps | 36 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis). The editors are inline inputs (`food-grams-edit`, `food-macro-edit`). There is no submit button: Enter or blur commits, and Escape cancels (macro editor only).

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and `READY` has been skipped.
- Desktop viewport `1280×800` unless a step says otherwise.
- Starting state for each TC: the clean panel, then add one card through the mock below (type `grilled chicken breast` → `ADD`).

## Test data
- **Mocks:** `POST **/api/nutrition` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`. `GET **/api/usda**` → 200 `{"foods":[]}`.
- The base card after ADD (REF, M): `150g · 248 kcal`, tiles Protein `46.5g`, Carbs `0g`, Fat `5.4g`. S/M/L previews `113g`/`150g`/`225g`.
- Gram editor values: `validGrams = "180"`, `zeroGrams = "0"`, `negativeGrams = "-20"`, `emptyGrams = ""`, `decimalGrams = "12.7"`
- Macro editor values: `validProtein = "50"`, `negativeCarbs = "-5"`, `escapeFat = "99"`, `decimalFat = "7.25"`
- Expected values:

| State | Card line | Protein / Carbs / Fat tiles | MEAL TOTAL kcal |
|---|---|---|---|
| base (M) | `150g · 248 kcal` | `46.5g` / `0g` / `5.4g` | `248` |
| grams = 180 | `180g · 298 kcal` (the `180g` text is cyan) | `55.8g` / `0g` / `6.5g` | `298` |
| grams = "12.7" → parseInt 12 | `12g · 20 kcal` | `3.7g` / `0g` / `0.4g` | `20` |
| S | `113g · 186 kcal` | `34.9g` / `0g` / `4.1g` | `186` |
| L | `225g · 372 kcal` | `69.8g` / `0g` / `8.1g` | `372` |
| M, Protein → 50 | `150g · 249 kcal` | `50g` / `0g` / `5.4g` | `249` |
| …then Carbs → -5 | `150g · 249 kcal` | `50g` / `0g` / `5.4g` | `249` |
| …then Fat → 7.25 | `150g · 265 kcal` | `50g` / `0g` / `7.3g` | `265` |
| …then L | `225g · 398 kcal` | `75g` / `0g` / `10.9g` | `398` |
| …at L, Protein → 60 | `225g · 344 kcal` | `60g` / `0g` / `10.9g` | `344` |

## Steps

### TC-01: Happy path: correct the grams and a macro, then log the corrected meal
1. Install the mocks. Sign in as `user`, open `/?tab=fuel`, skip `READY`, and record the ring baseline `C0`/`N0`.
2. Type `grilled chicken breast` and click `ADD`. Assert: the base row of the table.
3. Click the `150g` span (`title="Tap to edit"`). Assert: a number input replaces it, has focus, and holds the value `150`.
4. Select all, type `180`, press Enter. Assert: the input is gone and the card matches the `grams = 180` row. None of S/M/L is highlighted, because a custom gram value overrides the portion.
5. Click **`M`**. Assert: the custom grams are cleared, the card is back to the base row, and M is highlighted.
6. Click the **Protein** tile. Assert: an input with `inputmode="decimal"` has focus and holds `46.5`, and the tile border is cyan.
7. Select all, type `50`, press Enter. Assert: the `M, Protein → 50` row. Calories are recomputed: 50·4 + 0·4 + 5.4·9 = 248.6 → `249`.
8. Click **`LOG MEAL`**. Assert: toast `Meal logged — 249 kcal ✓`, and a `TODAY'S MEALS` row reads `QA Grilled Chicken Breast` · `249` · `kcal`. The ring aria-label is `<C0+249> of G kcal eaten, <N0+1> meal(s)`.
9. **Cleanup:** click `Delete meal` on this run's `249` kcal row. Assert: toast `Meal deleted`, and the ring is back to baseline. Click `SCAN ANOTHER`.

### TC-02: Form validation: `food-grams-edit` and `food-macro-edit`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| grams | `""` + Enter → edit discarded silently. The card keeps its prior grams. No error shown | `0` → discarded; `-20` → discarded; `12.7` → **truncated** to `12` (`parseInt`), giving `12g · 20 kcal`. Record the silent truncation as a UX issue | n/a. Try `99999` and record the result: `99999g · 165332 kcal`, with no upper bound |
| protein / carbs / fat | `""` + Enter → value becomes `0g` (`Number('') \|\| 0`), and calories are recomputed | `-5` → clamped to `0g` with no error; `7.25` → stored as `7.3` (rounded to 0.1) | n/a |

Steps:
1. Add the base card. Open the gram editor and enter `180` (to give a non-default prior value). For each of `""`, `0` and `-20`: open the editor, enter the value, press Enter. Assert: the card still reads `180g · 298 kcal` and no error text appears.
2. Open the gram editor, enter `12.7`, press Enter. Assert: `12g · 20 kcal`, tiles `3.7g` / `0g` / `0.4g`.
3. Open the gram editor, enter `180`, then click elsewhere on the page instead of pressing Enter. Assert: the blur commits, giving `180g · 298 kcal`.
4. Click `M`. Click the Protein tile, enter `50`, press Enter. Then click the Carbs tile, enter `-5`, press Enter. Assert: the `…then Carbs → -5` row.
5. Click the Fat tile, enter `7.25`, press Enter. Assert: the `…then Fat → 7.25` row (`50·4 + 0 + 7.3·9 = 265.7` → `265`?). **Calculation note:** `saveMacroEdit` stores `newBase = round(7.25 × 10)/10 = 7.3`, and calories are `round(50·4 + 0·4 + 7.3·9) = round(265.7) = 266`. **Expected `150g · 266 kcal`.** The table row above that says 265 is superseded by this step: use `266` for this state and `L → 225g · 399 kcal`, Fat tile `11g` (7.3 × 1.5 = 10.95 → `11g`).
6. Click the Fat tile, clear the value, press Enter. Assert: Fat `0g`, and calories `round(50·4) = 200`, so the card reads `150g · 200 kcal`.

### TC-03: Modal coverage: n/a (inline editors). Covers editor cancel and focus behaviour
1. Click the Fat tile (current value shown). Type `99`, then press **Escape**. Assert: the editor closes and the Fat tile and kcal are **unchanged**. If the value changes, record a defect: Escape must cancel, but the input's `onBlur → saveMacroEdit` may still fire when the element unmounts.
2. Click the Protein tile, then click the gram span. Assert: only one editor is open at a time. The gram editor opens, and the Protein editor commits its unchanged value on blur.
3. Open the Protein editor and click the **same** tile again. Assert: the editor stays open (`!isEditingThis` guard).

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `S` | click on the base card | `S` row: `113g · 186 kcal`, S highlighted |
| `M` | click | base row, M highlighted |
| `L` | click | `L` row: `225g · 372 kcal`, L highlighted |
| `L` after the macro edit Protein → 50 at M | click | `225g · 374 kcal` (249 × 1.5 = 373.5 → 374), Protein `75g` |
| Protein tile at L | click → `60` → Enter | stored base protein = 60 / 1.5 = 40. Base kcal = round(40·4 + 5.4·9) = 209 → shown at L: `225g · 314 kcal` (313.5 → 314), Protein tile `60g` |
| `M` after a custom grams value | click | custom grams cleared and the `150g` text is no longer cyan |

### TC-05: Negative & edge cases
- **Mobile, swiped-open card blocks editing:** at viewport `390×844` (`isDesktop` false), add the base card, then drag the card 60 px left with the mouse (mousedown → mousemove −60 → mouseup) so it opens. Click `150g` and assert that no gram editor opens. Click the Protein tile and assert that no macro editor opens. Click the card body and assert that it closes (translateX 0). Click `150g` and assert that the editor opens.
- **Desktop has no swipe:** at `1280×800`, dragging the card 60 px left does not move it, and no `Remove food` button exists.
- **Rounding of `S` grams:** `150 × 0.75 = 112.5` shows as `113g` (`Math.round`). Assert the S button preview reads `113g`.
- **Portion change after a macro edit:** the edit is stored as a base value, so switching S/M/L rescales it. After `Protein → 50` at M, press `S` and assert Protein `37.5g` and kcal `187` (249 × 0.75 = 186.75 → 187).
- **Logged values are the adjusted ones:** after TC-04's L state, `LOG MEAL` must toast `Meal logged — 314 kcal ✓`. Clean up that row with `Delete meal` straight away.

## Assertions
- [ ] The gram editor commits on Enter or blur, accepts only an integer > 0, and silently discards 0, negative and empty values.
- [ ] A custom gram value overrides the S/M/L highlight. Pressing a portion button clears it.
- [ ] Macro edits clamp to ≥ 0, round to 0.1, and recompute kcal as `P·4 + C·4 + F·9` from base values.
- [ ] Escape cancels the macro editor without saving.
- [ ] A swiped-open card (mobile) ignores the gram and macro editor taps.
- [ ] Logged meal totals equal the adjusted card values.
- [ ] Every throwaway meal logged in this task was deleted.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Gram editor open
- Card after grams = 180 (cyan custom grams)
- Macro editor open (Protein)
- Card after the macro edits
- Mobile swiped-open card
- Final state after cleanup

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
