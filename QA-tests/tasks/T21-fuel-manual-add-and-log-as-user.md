# T21-fuel-manual-add-and-log-as-user: Add a food by text and log the meal

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (`addFoodByText`, `handleLogMeal`), `src/components/nutrition/DailySummaryBar.jsx`, `src/components/nutrition/TodaysMealHistory.jsx`, `src/hooks/useGameState.js` (`logMeal`, `deleteMeal`) |
| Flow | Manually add food by text (Enter or ADD) with no image, then LOG MEAL (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | no. It creates one throwaway meal and deletes that same meal during cleanup |
| Estimated steps | 30 |

> Verification status: **source-derived, not browser-verified.** The analysis ran without Supabase, so the authenticated Fuel tab was never rendered. The exact strings and numbers below come from the code. Any mismatch is a finding to report; do not edit the expected values to match what you see.

## Preconditions
- App running at `http://localhost:5173`, started with a real `.env` that sets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Restart the dev server after editing `.env`. `ANTHROPIC_API_KEY` / `USDA_API_KEY` are needed only for the optional live check in TC-05; every exact-value step uses the network mocks below.
- Signed in as role `user`: a **dedicated throwaway test account** resolved from `QA-tests/.qa-catalog/auth.local.json` via `scripts/auth-resolve.mjs`. Never use a real person's account.
- The test account has finished onboarding (`state.assessment.completed === true`). Otherwise `OnboardingScreen` renders instead of the tabs.
- Before the first page load, set `localStorage.fitquest_onboarding_complete = "true"` so the tour overlay does not cover the tab.
- After sign-in, the `READY` boot screen holds for up to 5 s. Click it once to skip (`onSkip`). Do not click "continue offline" on a `SYNCING...` screen. Wait for the cloud load to finish.
- Load the page **with** the query string. `initialTabFromUrl()` reads `?tab=fuel` only on mount.
- Seed data: none required. The test reads a baseline from the calorie ring instead of assuming an empty day.
- Desktop viewport `1280×800` (`useIsDesktop` is true at ≥ 768 px).

## Test data
- `foodQuery = "grilled chicken breast"`
- `emptyRequired = ""`, `whitespaceOnly = "   "`
- **Network mocks** (Playwright `page.route`). Install them before step 1 of TC-01:
  - `POST **/api/nutrition`: when `JSON.parse(body).messages[0].content` is a **string** containing `grilled chicken breast`, wait 800 ms, then respond `200` with
    `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`
  - `GET **/api/usda**`: respond `200` `{"foods":[]}`. This route must not be hit for the chicken case, because the reference DB matches first.
- Expected derived values. Tier 1 reference match on `chicken breast` (165 kcal / 31 P / 0 C / 3.6 F per 100 g) × 1.5:
  - card line `150g · 248 kcal`, badge `REF`, tiles `46.5g` Protein / `0g` Carbs / `5.4g` Fat
  - portion previews `S 113g`, `M 150g`, `L 225g`, with M active
  - MEAL TOTAL `248` KCAL, `47g` Protein, `0g` Carbs, `5g` Fat
  - toast `Meal logged — 248 kcal ✓`

## Steps

### TC-01: Happy path: add "grilled chicken breast" by text and log it
1. Sign in as `user` on the login wall at `http://localhost:5173/?tab=fuel`. Skip the `READY` screen.
2. Assert: the Fuel header shows `FUEL` and `AI-powered nutrition tracking`, and the `Fuel` tab is selected (`aria-selected="true"` in `nav[aria-label="Primary"]` on desktop).
3. Assert that these are visible: `SCAN MEAL`, `Take a photo — AI identifies food & macros`, `Upload from gallery`, the `OR ADD MANUALLY` divider, an input with placeholder `e.g. 2 scrambled eggs`, a disabled `ADD` button, and the tip `Include a fork or your hand in the frame — it helps the AI estimate portion size more accurately.`
4. Read the calorie ring `svg[role=img]` aria-label and record it as baseline: `C0 of G kcal eaten` or `C0 of G kcal eaten, N0 meal(s)` (N0 = 0 when the suffix is absent). Record whether `TODAY'S MEALS` is present.
5. Type `grilled chicken breast` into the `e.g. 2 scrambled eggs` input. Assert: `ADD` is enabled.
6. Click **`ADD`**. Assert: within the 800 ms mock delay the button label is `…` and it is disabled.
7. Assert: exactly one `POST /api/nutrition` was sent. Its JSON body has `model: "claude-sonnet-5"`, `max_tokens: 256`, and `messages[0].content` containing `Nutritional info for: "grilled chicken breast"`. The request carries an `Authorization: Bearer <token>` header. No `/api/usda` request was made.
8. Assert: the heading `DETECTED FOODS — ADJUST PORTIONS` appears, along with one card containing `QA Grilled Chicken Breast`, badge `REF`, `150g · 248 kcal`, tiles `46.5g`/`0g`/`5.4g`, and S/M/L buttons showing `113g`/`150g`/`225g` with M highlighted.
9. Assert: the manual input is now empty, `ADD` is disabled again, and the `MISSING SOMETHING?` section is visible.
10. Assert: `MEAL TOTAL` shows `248` KCAL, `47g` Protein, `0g` Carbs, `5g` Fat. The `RE-SCAN` and `LOG MEAL` buttons are visible.
11. Click **`LOG MEAL`**.
12. Assert: the toast `Meal logged — 248 kcal ✓` is visible (it auto-hides after about 2.8 s). `MEAL LOGGED ✓` and `SCAN ANOTHER` replace `RE-SCAN`/`LOG MEAL`, and `MISSING SOMETHING?` is hidden.
13. Assert: `TODAY'S MEALS` is visible and a row reads `QA Grilled Chicken Breast` with a date string in the format `Sat, Oct 24, 02:15 PM`, `248` and `kcal`, plus a `Delete meal` button.
14. Assert: the ring aria-label is now `<C0+248> of G kcal eaten, <N0+1> meal` (or `meals` when N0+1 ≠ 1). The Protein bar value went up by 47 ±1 because of rounding.
15. Click **`SCAN ANOTHER`**. Assert: `DETECTED FOODS — ADJUST PORTIONS`, `MEAL TOTAL` and `MEAL LOGGED ✓` are gone, the empty upload/manual state from step 3 is back, and the `TODAY'S MEALS` row is still there.
16. Wait 3 s for the immediate `cloudSet`, then reload `/?tab=fuel` and skip `READY`. Assert: the `QA Grilled Chicken Breast` / `248` kcal row is still in `TODAY'S MEALS`, and the ring aria-label still includes the 248 kcal.
17. **Cleanup:** click `Delete meal` on the row created in this run, identified by name `QA Grilled Chicken Breast`, `248` kcal and this run's minute stamp. Assert: toast `Meal deleted`, and the ring aria-label is back to `C0 of G kcal eaten` with the N0 suffix.

### TC-02: Form validation: `manual-add-food` (required-field subset; the full matrix is in T22)
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| addText | `""` → `ADD` has the `disabled` attribute, pressing Enter sends no request, no error text | `"   "` (whitespace only) → `ADD` disabled, Enter sends no request | n/a (no maxLength in source) |

1. Clear the input. Assert: `ADD` is disabled. Press Enter. Assert: no `/api/nutrition` request.
2. Type `   `. Assert: `ADD` is still disabled. Press Enter. Assert: no request.

### TC-03: Modal coverage: n/a
The Fuel tab has no dialogs. The only popover (the `⋯` food menu) is covered in T26.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `ADD` | click with `grilled chicken breast` | card added (TC-01 step 8) |
| Enter key in input | type `grilled chicken breast`, press Enter | identical to clicking ADD: one request, one card |
| `LOG MEAL` | click | toast `Meal logged — 248 kcal ✓`, row in `TODAY'S MEALS` |
| `SCAN ANOTHER` | click after logging | same as TC-01 step 15 |
| `Delete meal` | click on this run's row (cleanup) | row removed, toast `Meal deleted` (no confirm dialog; see T27) |

### TC-05: Negative & edge cases
- **Enter path:** start from a clean panel, type `grilled chicken breast`, press Enter twice quickly. Assert: exactly **one** request, because `!adding` guards the second Enter, and exactly one card.
- **Append after logging (suspected defect):** after `LOG MEAL` with no image, the top `OR ADD MANUALLY` input is still rendered, because it renders whenever `!image`. Type `grilled chicken breast` and click `ADD`. Expected per source: a second card is appended under `DETECTED FOODS` while `MEAL LOGGED ✓` is still shown and no `LOG MEAL` button exists, so the new item can never be logged. Record it as a defect if reproduced. Then click `SCAN ANOTHER` and assert the panel is cleared.
- **Mirrored inputs:** with one card present and no image, both the top input and the `MISSING SOMETHING?` input are rendered and share the `addText` state. Type `abc` in one. Assert: the other also shows `abc`. Record as a UX issue (duplicate inputs).
- **Live API (optional, consumes 1 of the 60/day quota):** remove the mocks, add `2 scrambled eggs`, and assert that one card appears with a badge of `REF`, `USDA` or `AI`, a positive gram value and a non-negative kcal value. Click `RE-SCAN` (it does not log).

## Assertions
- [ ] Fuel header, `SCAN MEAL`, `Upload from gallery`, `OR ADD MANUALLY` and the tip render for a signed-in user.
- [ ] `ADD` is disabled for empty or whitespace input, and shows `…` while a request is pending.
- [ ] The text-add request uses `claude-sonnet-5`, `max_tokens 256`, and a Bearer token.
- [ ] The REF-matched card shows `150g · 248 kcal`, `46.5g / 0g / 5.4g`, and S/M/L `113g/150g/225g`.
- [ ] `MEAL TOTAL` is `248` KCAL / `47g` / `0g` / `5g`.
- [ ] LOG MEAL shows the toast `Meal logged — 248 kcal ✓` and `MEAL LOGGED ✓`, the row appears in `TODAY'S MEALS`, and the ring aria-label goes up by 248 kcal and 1 meal.
- [ ] The logged meal survives a reload.
- [ ] Cleanup removed this run's meal (toast `Meal deleted`).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load (signed in, Fuel tab)
- ADD in its `…` pending state
- Detected-food card plus MEAL TOTAL before logging
- `MEAL LOGGED ✓` with the toast and the `TODAY'S MEALS` row
- Post-reload `TODAY'S MEALS`
- Final state after cleanup

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
