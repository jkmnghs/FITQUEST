# T26-fuel-destructive-remove-food-and-rescan: Destructive: ⋯ > Delete, swipe-to-remove, RE-SCAN and ✕ on unsaved foods

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (dot menu lines 828–863 plus the outside-click effect 31–36, swipe helpers 41–86, trash button 699–724, `reset()` 404–411, `RE-SCAN` 1022–1034, `✕` 620–629, `handleImageSelect` 102–104) |
| Flow | Remove a detected food via ⋯ > Delete (desktop) or swipe-left trash (mobile); RE-SCAN / ✕ discard the current analysis with no confirm (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | yes. Only **unsaved, in-memory** food cards are destroyed. No logged meal or cloud data is touched |
| Estimated steps | 34 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis). None of these actions shows a confirmation, and nothing in the component can undo them. The "cancel" paths below are the closest equivalents the UI offers: closing the menu, or swiping the card back.

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and `READY` has been skipped.
- Fixture `QA-tests/fixtures/meal-2000x1500.jpg` (see T23).
- No seed data. Record the `TODAY'S MEALS` rows and the ring aria-label at the start. Neither may change during this task.

## Test data
- `foodA = "grilled chicken breast"` → card `QA Grilled Chicken Breast` · `150g · 248 kcal`
- `foodB = "1 cup white rice"` → card `White Rice` · `158g · 205 kcal`
- **Mocks** (`POST **/api/nutrition`):
  - text containing `grilled chicken breast` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`
  - text containing `white rice` → 200 `{"content":[{"type":"text","text":"{\"name\":\"White Rice\",\"cookingMethod\":\"steamed\",\"grams\":158,\"calories\":205,\"protein\":4,\"carbs\":45,\"fat\":0.4}"}]}`
  - vision (array content) → 200 `{"content":[{"type":"text","text":"[{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6},{\"name\":\"Broccoli\",\"cookingMethod\":\"steamed\",\"grams\":100,\"calories\":35,\"protein\":3,\"carbs\":7,\"fat\":0.4}]"}]}`
  - `GET **/api/usda**` → 200 `{"foods":[]}`
- Expected MEAL TOTAL with A + B: `453` KCAL. With A only: `248`. With B only: `205`.
- Viewports: desktop `1280×800`; mobile `390×844` (`isDesktop` false below 768 px).

## Steps

### TC-01: Happy path (desktop): remove one item through ⋯ > Delete, then log nothing
1. Desktop viewport. Install the mocks. Sign in as `user`, open `/?tab=fuel`, skip `READY`. Record the baseline ring aria-label and the `TODAY'S MEALS` rows.
2. Add `foodA`, then `foodB` (from the top input or `MISSING SOMETHING?`). Assert: two cards, `MEAL TOTAL` `453`.
3. On the `White Rice` card, click **`⋯`**. Assert: a popover with a single `Delete` item (trash icon, red text) appears below it.
4. Click **`Delete`**. Assert: the `White Rice` card disappears at once, with no confirm dialog (`page.on('dialog')` never fires) and no toast. `MEAL TOTAL` is `248`. The ring aria-label and the `TODAY'S MEALS` rows still match the baseline.
5. Open `⋯` on `QA Grilled Chicken Breast` and click `Delete`. Assert: `DETECTED FOODS — ADJUST PORTIONS`, `MEAL TOTAL`, `RE-SCAN`, `LOG MEAL` and `MISSING SOMETHING?` are all gone. The clean upload/manual panel remains, and the baseline is unchanged.

### TC-02: Form validation: n/a
This flow has no form inputs. The delete controls are covered in TC-04.

### TC-03: Modal coverage: `food-dot-menu` (popover, not `role=dialog`)
1. Add `foodA` and `foodB`. Click `⋯` on `White Rice`. Assert: the menu is visible.
2. **Cancel path (outside click):** click blank page space. Assert: the menu closes, and both cards remain (`MEAL TOTAL` `453`).
3. **Cancel path (toggle):** click `⋯` twice. Assert: the menu opens, then closes, and both cards remain.
4. **Only one menu at a time:** open `⋯` on `QA Grilled Chicken Breast`, then click `⋯` on `White Rice`. Assert: only the `White Rice` menu is open.
5. **Proceed:** click `Delete`. Assert: only `White Rice` is removed, and `MEAL TOTAL` is `248`.
6. Press `Tab` from the `⋯` button. Record whether the `Delete` item is reachable by keyboard, and whether `⋯` has an accessible name. The source sets no `aria-label`, so the name is just the `⋯` character. Record that as an a11y issue.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `⋯` → `Delete` (desktop) | click | the card is removed immediately, with no confirm and no toast |
| `⋯` → outside click | click blank space | the menu closes and nothing is removed |
| Swipe left 20 px (mobile) | touch swipe −20 px on the card | the card springs back to `translateX(0)`; nothing is removed |
| Swipe left 60 px (mobile) | touch swipe −60 px | the card rests at `translateX(-68px)` with a red border, and `Remove food` is fully visible (opacity 1) |
| Swipe open → tap card body (mobile) | tap on the card | the card closes back to `translateX(0)` and nothing is removed (cancel path) |
| Swipe open → swipe right 30 px (mobile) | touch swipe +30 px | the card closes and nothing is removed |
| `Remove food` (mobile, after swipe open) | click | the card is removed immediately, with no confirm |
| `RE-SCAN` (manual foods, no image) | click | all cards are cleared, no confirm. The clean panel shows, and nothing is logged |
| `RE-SCAN` (after photo analysis) | click | the preview, cards and totals are cleared. `SCAN MEAL` and `Upload from gallery` are visible again |
| `✕` (image previewed, not analyzed) | click | the preview is removed and the clean panel shows |
| `✕` (after analysis, cards shown) | click | the preview, both cards and the totals are cleared, no confirm |

Steps for the mobile rows: switch to `390×844` with `hasTouch: true`, reload `/?tab=fuel`, add `foodA` and `foodB`, and assert that no `⋯` button exists. **Swipe with touch events** (CDP `Input.dispatchTouchEvent`, or dispatch `touchstart`/`touchmove`/`touchend` with `Touch` objects) as the primary method. Then repeat the 60 px row once with a **mouse** drag. Expected risk per source: the `click` that follows `mouseup` runs the card's `onClick`, and because React flushes the `setSwipedIdx` from `mouseup` first, it may close the card immediately. If a mouse swipe never stays open, record a defect for narrow-window mouse users. Run each mobile row on the `White Rice` card. Re-add it if a row removed it. After `Remove food`, assert that `MEAL TOTAL` is `248`.

Steps for the photo rows: upload the fixture with `Upload from gallery`, then (for the analyzed variants) click `ANALYZE MEAL` with the vision mock. Assert that the two cards `QA Grilled Chicken Breast` and `Broccoli` appear before you press `RE-SCAN` / `✕`.

### TC-05: Negative & edge cases
- **Uploading a photo wipes manual foods without warning (suspected defect):** add `foodA` and `foodB` with no image, then use `Upload from gallery` to pick the fixture. Expected per source (`handleImageSelect` calls `setFoods([])`): both manual cards disappear, with no confirm, and only the preview plus `ANALYZE MEAL` remain. Record as a data-loss UX defect.
- **Swipe index after delete:** on mobile, with three cards (add `foodA`, `foodB`, `foodA`), swipe-delete the **middle** card. Assert: the remaining two cards are both at `translateX(0)`, and neither shows a visible `Remove food` button. The open state is cleared via `setSwipedIdx(null)`.
- **Index-keyed cards:** on desktop, with `foodA`, `foodB`, `foodA`, give the first card a custom gram value `200` (gram editor), then `⋯ > Delete` the first card. Assert: the remaining cards are `White Rice` (`158g · 205 kcal`) and `QA Grilled Chicken Breast` (`150g · 248 kcal`), and the custom grams did not move to another card. If it did, record a key-by-index defect.
- **Re-pick the same file after ✕:** after `✕`, choose the same fixture again. Assert: the preview reappears, because `reset()` cleared both inputs' `value`.
- **Nothing persisted:** at the end, reload `/?tab=fuel`. Assert: the ring aria-label and the `TODAY'S MEALS` rows equal the step-1 baseline.

## Assertions
- [ ] `⋯ > Delete` removes exactly the targeted card, with no confirm and no toast.
- [ ] The dot menu closes on an outside click or a toggle without removing anything.
- [ ] Mobile swipe opens at ≥ 30 px, springs back below that, and tapping the card closes it. `Remove food` deletes that card only.
- [ ] `RE-SCAN` and `✕` discard all unsaved foods and the image with no confirm.
- [ ] Deleting the last card hides `DETECTED FOODS`, `MEAL TOTAL`, `RE-SCAN` and `LOG MEAL`.
- [ ] No logged meal or ring value changes during the whole task.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Dot menu open on `White Rice`
- After `⋯ > Delete`
- Mobile card swiped open with `Remove food`
- After `RE-SCAN` and after `✕`
- The manual foods wiped by a photo upload (TC-05)
- Final state (baseline unchanged)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
