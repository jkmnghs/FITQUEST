# T25-fuel-food-card-editing: Edit grams and macros inline, switch S/M/L portions

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (gram editor lines 770–798, `setGrams` 362–368, macro tiles 868–918, `saveMacroEdit` 370–386, `setPortion` 358–360), `src/utils/nutritionUtils.js` (`getAdjusted`, `PORTION_MULT`) |
| Flow | Edit grams inline (tap `<N>g`) and check that macros scale; edit a macro tile and check that calories are recomputed as 4/4/9 (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | no. It logs throwaway meals and deletes those same meals during cleanup |
| Estimated steps | 36 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis). The editors are inline inputs (`food-grams-edit`, `food-macro-edit`). There is no submit button: Enter or blur commits, and Escape cancels (macro editor only).

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and `READY` has been skipped.
- Desktop viewport `1280×800` unless a step says otherwise.
- Starting state for each TC: the clean panel (click `RE-SCAN` / `SCAN ANOTHER` if needed), then add one **fresh base card** through the mock below (type `grilled chicken breast` → `ADD`).

## Test data
- **Mocks:** `POST **/api/nutrition` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`. `GET **/api/usda**` → 200 `{"foods":[]}`.
- Gram editor values: `validGrams = "180"`, `zeroGrams = "0"`, `negativeGrams = "-20"`, `emptyGrams = ""`, `decimalGrams = "12.7"`, `hugeGrams = "99999"`
- Macro editor values: `validProtein = "50"`, `negativeCarbs = "-5"`, `decimalFat = "7.25"`, `emptyFat = ""`, `escapeFat = "99"`, `proteinAtL = "60"`
- Expected values. Each row starts from the state named in "From"; "fresh" means a new base card.

| # | From | Action | Card line | Protein / Carbs / Fat tiles | MEAL TOTAL kcal |
|---|---|---|---|---|---|
| E0 | fresh | none (REF, portion M) | `150g · 248 kcal` | `46.5g` / `0g` / `5.4g` | `248` |
| E1 | E0 | grams → `180` | `180g · 298 kcal` (the `180g` text is cyan; no S/M/L highlighted) | `55.8g` / `0g` / `6.5g` | `298` |
| E2 | E1 | grams → `12.7` (parseInt 12) | `12g · 20 kcal` | `3.7g` / `0g` / `0.4g` | `20` |
| E3 | E0 | click `S` | `113g · 186 kcal` | `34.9g` / `0g` / `4.1g` | `186` |
| E4 | E0 | click `L` | `225g · 372 kcal` | `69.8g` / `0g` / `8.1g` | `372` |
| E5 | E0 | Protein → `50` | `150g · 249 kcal` | `50g` / `0g` / `5.4g` | `249` |
| E6 | E5 | Carbs → `-5` | `150g · 249 kcal` | `50g` / `0g` / `5.4g` | `249` |
| E7 | E6 | Fat → `7.25` (stored 7.3) | `150g · 266 kcal` | `50g` / `0g` / `7.3g` | `266` |
| E8 | E7 | Fat → `""` | `150g · 200 kcal` | `50g` / `0g` / `0g` | `200` |
| E9 | E5 | click `L` | `225g · 374 kcal` | `75g` / `0g` / `8.1g` | `374` |
| E10 | E9 | Protein → `60` (base becomes 40) | `225g · 314 kcal` | `60g` / `0g` / `8.1g` | `314` |
| E11 | E5 | click `S` | `113g · 187 kcal` | `37.5g` / `0g` / `4.1g` | `187` |

Derivations: kcal after a macro edit = `round(P·4 + C·4 + F·9)` using **base** (M) values. E5: 200 + 0 + 48.6 = 248.6 → 249. E7: 200 + 65.7 → 266. E10: base P = 60/1.5 = 40, so 160 + 48.6 = 208.6 → 209 base, and 209 × 1.5 = 313.5 → 314. Portion display = `round(base × mult)`.

## Steps

### TC-01: Happy path: correct the grams and a macro, then log the corrected meal
1. Install the mocks. Sign in as `user`, open `/?tab=fuel`, skip `READY`, and record the ring baseline `C0`/`N0`.
2. Type `grilled chicken breast` and click `ADD`. Assert: E0.
3. Click the `150g` span (`title="Tap to edit"`). Assert: a number input replaces it, has focus, and holds `150`.
4. Select all, type `180`, press Enter. Assert: E1.
5. Click **`M`**. Assert: E0 again, with M highlighted and the gram text no longer cyan.
6. Click the **Protein** tile. Assert: an input with `inputmode="decimal"` has focus and holds `46.5`, and the tile shows a coloured border.
7. Select all, type `50`, press Enter. Assert: E5.
8. Click **`LOG MEAL`**. Assert: toast `Meal logged — 249 kcal ✓`, and a `TODAY'S MEALS` row reads `QA Grilled Chicken Breast` · `249` · `kcal`. The ring aria-label is `<C0+249> of G kcal eaten, <N0+1> meal(s)`.
9. **Cleanup:** click `Delete meal` on this run's `249` row. Assert: toast `Meal deleted`, and the ring is back to baseline. Click `SCAN ANOTHER`.

### TC-02: Form validation: `food-grams-edit` and `food-macro-edit`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| grams | `""` + Enter → edit discarded silently. The card keeps its prior grams. No error shown | `0` → discarded; `-20` → discarded; `12.7` → **truncated** to `12` (E2) with no notice. Record as a UX issue | `99999` → accepted: `99999g · 165332 kcal`. There is no upper bound; record it |
| protein / carbs / fat | `""` + Enter → value becomes `0g` (E8), and kcal is recomputed | `-5` → clamped to `0g` with no error (E6); `7.25` → rounded to `7.3` (E7) | n/a |

Steps:
1. Fresh card. Open the gram editor, enter `180`, Enter (E1). For each of `""`, `0` and `-20`: open the editor, enter the value, press Enter. Assert: still E1, and no error text anywhere.
2. Open the gram editor, enter `12.7`, press Enter. Assert: E2.
3. Open the gram editor, enter `180`, then click on blank page space instead of pressing Enter. Assert: the blur commits (E1).
4. Open the gram editor, enter `99999`, press Enter. Assert: `99999g · 165332 kcal`. Click `M` to reset.
5. Click the Protein tile, enter `50`, Enter (E5). Click the Carbs tile, enter `-5`, Enter. Assert: E6.
6. Click the Fat tile, enter `7.25`, Enter. Assert: E7.
7. Click the Fat tile, clear it, Enter. Assert: E8.

### TC-03: Modal coverage: n/a (inline editors). Covers editor cancel and focus behaviour
1. Fresh card. Click the Fat tile, type `99`, then press **Escape**. Assert: the editor closes, and the card is still E0 (Fat `5.4g`, `248 kcal`). If Fat changes to `99g`, record a defect: Escape must cancel, but the input's `onBlur → saveMacroEdit` may fire when it unmounts.
2. Fresh card. Click the Protein tile, then click the `150g` span. Assert: the Protein editor closes and the gram editor opens, so only one editor is open. **Expected per source:** the blur commits the *unchanged* 46.5 through `saveMacroEdit`, which recomputes kcal from macros: round(46.5·4 + 0 + 5.4·9) = round(234.6) = `235`. The card now reads `150g · 235 kcal`, not 248. Record this as a defect: opening and closing a macro editor without editing changes the calories (the reference kcal of 248 is replaced by the Atwater value).
3. Press Escape in the gram editor. Expected per source: Escape has no handler there, so the editor stays open until blur. Click blank space. Assert: the gram value is unchanged (`150g`).
4. Click the Protein tile, then click the **same** tile again. Assert: the editor stays open (`!isEditingThis` guard).

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `S` | click on a fresh card | E3, S highlighted |
| `M` | click | E0, M highlighted |
| `L` | click on a fresh card | E4, L highlighted |
| `L` | click after Protein → 50 (E5) | E9 |
| Protein tile | at E9, click → `60` → Enter | E10 |
| `S` | click at E5 | E11 |
| `M` | click after a custom grams value | custom grams cleared, the `150g` text is not cyan, M highlighted |
| `LOG MEAL` | at E10 | toast `Meal logged — 314 kcal ✓`. Then **cleanup**: `Delete meal` on that row, toast `Meal deleted` |

### TC-05: Negative & edge cases
- **Mobile, swiped-open card blocks editing:** at viewport `390×844` with `hasTouch: true` (`isDesktop` false), add a fresh card, then swipe the card 60 px left with **touch events** (touchstart → touchmove −60 px → touchend; see T26 for why a mouse drag may not stay open). Assert: the card shifts to `translateX(-68px)` and `Remove food` is visible. Click `150g` and assert that no gram editor opens. Click the Protein tile and assert that no macro editor opens. Click the card body and assert that it closes (`translateX(0)`). Click `150g` and assert that the editor now opens.
- **Desktop has no swipe:** at `1280×800`, dragging the card 60 px left leaves it at `translateX(0)`, and no `Remove food` button exists in the DOM.
- **Short swipe does not open:** on mobile, a 20 px left drag springs back (threshold is −30 px).
- **Custom grams then macro edit:** at E1 (180 g, scale 1.2), set Protein to `60`. Stored base = round(60/1.2 × 10)/10 = 50, so base kcal = round(200 + 48.6) = 249 and the display is `180g · 299 kcal` (249 × 1.2 = 298.8 → 299), with Protein `60g`.

## Assertions
- [ ] The gram editor commits on Enter or blur, accepts integers > 0, and silently discards 0, negative and empty values. Decimals are truncated.
- [ ] A custom gram value overrides the S/M/L highlight. Pressing a portion button clears it.
- [ ] Macro edits clamp to ≥ 0, round to 0.1, and recompute kcal as `P·4 + C·4 + F·9` from base values (E5–E11).
- [ ] Escape cancels the macro editor without saving.
- [ ] A swiped-open card (mobile) ignores the gram and macro editor taps.
- [ ] Logged meal totals equal the adjusted card values (`249`, `314`).
- [ ] Every throwaway meal logged in this task was deleted.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Gram editor open
- E1 (cyan custom grams)
- Macro editor open (Protein)
- E7 after the macro edits
- Mobile swiped-open card
- Final state after cleanup

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
