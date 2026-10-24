# T23-fuel-photo-scan-and-log-as-user: Scan or upload a meal photo, adjust the portion, add a missing item, and log

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (`handleImageSelect`, `analyzeMeal`, `setPortion`, `addFoodByText`, `handleLogMeal`), `src/utils/nutritionUtils.js` (`getAdjusted`, `sumTotals`, `PORTION_MULT`) |
| Flow | Scan meal via camera input / upload from gallery → ANALYZE MEAL → adjust portion S/M/L → add a missing item → LOG MEAL (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | no. It creates one throwaway meal and deletes that same meal during cleanup |
| Estimated steps | 32 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis).

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and the `READY` screen has been skipped.
- Desktop viewport `1280×800`.
- Fixture `QA-tests/fixtures/meal-2000x1500.jpg`: any real JPEG photo that is **2000 × 1500 px**. If it is missing, create it (any image editor or `sharp`/ImageMagick) before running.
- Seed data: none. The ring baseline is read in step 2.

## Test data
- `photo = QA-tests/fixtures/meal-2000x1500.jpg` (MIME `image/jpeg`)
- `missingItem = "1 cup white rice"`
- **Network mocks** (`page.route`):
  - `POST **/api/nutrition`, **vision** request (`messages[0].content` is an array whose first element has `type: "image"`): wait 1000 ms, then respond 200
    `{"content":[{"type":"text","text":"[{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6},{\"name\":\"Broccoli\",\"cookingMethod\":\"steamed\",\"grams\":100,\"calories\":35,\"protein\":3,\"carbs\":7,\"fat\":0.4}]"}]}`
  - `POST **/api/nutrition`, **text** request whose content contains `white rice` → 200
    `{"content":[{"type":"text","text":"{\"name\":\"White Rice\",\"cookingMethod\":\"steamed\",\"grams\":158,\"calories\":205,\"protein\":4,\"carbs\":45,\"fat\":0.4}"}]}`
  - `GET **/api/usda**` → 200 `{"foods":[]}`. It must not be called, because all three items hit the reference DB.
- Expected derived values (reference DB per 100 g: chicken breast 165/31/0/3.6, broccoli 34/2.8/7.2/0.4, white rice 130/2.7/28.2/0.3):

| Item | M (default) | L |
|---|---|---|
| QA Grilled Chicken Breast | `150g · 248 kcal`, `46.5g`/`0g`/`5.4g`, S/M/L previews `113g`/`150g`/`225g` | `225g · 372 kcal`, `69.8g`/`0g`/`8.1g` |
| Broccoli | `100g · 34 kcal`, `2.8g`/`7.2g`/`0.4g`, previews `75g`/`100g`/`150g` | n/a |
| White Rice | `158g · 205 kcal`, `4.3g`/`44.6g`/`0.5g`, previews `119g`/`158g`/`237g` | n/a |

- MEAL TOTAL checkpoints: after analysis `282` KCAL / `49g` / `7g` / `6g`. After chicken → L: `406` / `73g` / `7g` / `9g`. After adding rice: `611` / `77g` / `52g` / `9g`.
- Toast after logging: `Meal logged — 611 kcal ✓`
- TODAY'S MEALS row title (truncated at 40 chars): `QA Grilled Chicken Breast, Broccoli, Whi...`

## Steps

### TC-01: Happy path: upload from gallery, analyze, set chicken to L, add rice, log
1. Install the mocks. Sign in as `user`, open `/?tab=fuel`, skip `READY`.
2. Record the ring aria-label baseline `C0 of G kcal eaten[, N0 meal(s)]`.
3. Click **`Upload from gallery`**, and in the `filechooser` event set `photo`. Alternatively, run `setInputFiles` on the `input[type=file]:not([capture])`.
4. Assert: an `img[alt="Meal"]` preview is visible with a round `✕` button at its top-right. `SCAN MEAL`, `Upload from gallery`, `OR ADD MANUALLY`, the manual input and the tip are no longer rendered. **`ANALYZE MEAL`** is visible.
5. Click **`ANALYZE MEAL`**. Assert: during the 1000 ms delay `SCANNING MEAL…` is visible and `ANALYZE MEAL` is not rendered.
6. Assert the request body: `model` is `claude-sonnet-5`, `max_tokens` is `1024`, `messages[0].content[0].type` is `image`, `source.media_type` is `image/jpeg`, and `source.data` is base64 that decodes to a JPEG whose **largest side is exactly 1024 px** (the client-side resize from 2000 px). `content[1].type` is `text` and contains `Analyze this meal photo.`
7. Assert: `DETECTED FOODS — ADJUST PORTIONS` is shown with two cards matching the M column above, both with badge `REF`. `MEAL TOTAL` reads `282` / `49g` / `7g` / `6g`. No `/api/usda` request was made.
8. On the chicken card, click **`L`** (its preview reads `225g`). Assert: L is highlighted (cyan border) and M is not. The card reads `225g · 372 kcal` with tiles `69.8g`/`0g`/`8.1g`. `MEAL TOTAL` reads `406` / `73g` / `7g` / `9g`.
9. Assert: the `MISSING SOMETHING?` section is visible below the cards with an input whose placeholder is `e.g. 2 scrambled eggs` and a disabled `ADD`.
10. Type `1 cup white rice` into that input and click **`ADD`**. Assert: a third card `White Rice` · `REF` · `158g · 205 kcal` appears, the input is cleared, and `MEAL TOTAL` reads `611` / `77g` / `52g` / `9g`.
11. Click **`LOG MEAL`**. Assert: toast `Meal logged — 611 kcal ✓`, plus `MEAL LOGGED ✓` and `SCAN ANOTHER`. `RE-SCAN`, `LOG MEAL` and `MISSING SOMETHING?` are hidden. The preview image is still shown.
12. Assert: a `TODAY'S MEALS` row reads `QA Grilled Chicken Breast, Broccoli, Whi...` · `611` · `kcal`. The ring aria-label is `<C0+611> of G kcal eaten, <N0+1> meal(s)`.
13. Click **`SCAN ANOTHER`**. Assert: the preview, cards and totals are gone, and the clean upload panel (step 1 state) is back.
14. **Cleanup:** click `Delete meal` on this run's `QA Grilled Chicken Breast, Broccoli, Whi...` / `611` row. Assert: toast `Meal deleted`, and the ring is back to baseline.

### TC-02: Form validation: n/a for this flow
The photo inputs' validation (HEIC rejection, analysis errors) is covered in T24. The `MISSING SOMETHING?` text input follows the same rules as T22. Spot-check only: with `MISSING SOMETHING?` empty, `ADD` is disabled and Enter sends no request.

### TC-03: Modal coverage: n/a. The camera/gallery file pickers are OS dialogs
1. Click **`SCAN MEAL`**. Assert: a `filechooser` event fires for the input that has `capture="environment"` and `accept="image/*"`.
2. Cancel the chooser without selecting a file (in Playwright, `fileChooser.setFiles([])`). Assert: nothing changes. No preview and no error appear (`handleImageSelect` returns early when no file is chosen).
3. Click `SCAN MEAL` again and set `photo`. Assert: the preview and `ANALYZE MEAL` appear, just as in TC-01 step 4.
4. Click `✕`. Assert: back to the clean panel.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SCAN MEAL` | click → choose `photo` | preview + `ANALYZE MEAL` (camera input path) |
| `Upload from gallery` | click → choose `photo` | preview + `ANALYZE MEAL` (gallery input path) |
| `ANALYZE MEAL` | click | `SCANNING MEAL…`, then the cards |
| `S` on Broccoli | click | `75g · 26 kcal` (34 × 0.75 = 25.5 → 26), tiles `2.1g`/`5.4g`/`0.3g` |
| `M` on Broccoli | click | back to `100g · 34 kcal` |
| `ADD` (MISSING SOMETHING?) | click with `1 cup white rice` | third card appended |
| `LOG MEAL` | click | toast `Meal logged — 611 kcal ✓` |
| `SCAN ANOTHER` | click | panel reset; the logged row remains |

### TC-05: Negative & edge cases
- **Small image is not upscaled:** upload any JPEG ≤ 1024 px on both sides, analyze, and assert that the decoded request image has the same dimensions as the source (`scale = min(1, …)`).
- **PNG is converted:** upload a PNG via `Upload from gallery` and assert `source.media_type` is `image/jpeg`.
- **Re-select after reset:** after `✕`, choose the **same** `photo` again. Assert: the preview reappears, because `reset()` clears both inputs' `value`.
- **Re-analyze is unavailable after detection:** once cards are shown, `ANALYZE MEAL` is not rendered (`foods.length === 0` is required). Only `RE-SCAN` or `✕` restarts.
- **Live API (optional, uses 1 quota call):** remove the mocks, analyze `photo`, and assert that at least one card or the error text `No food items detected. Try a clearer photo.` renders within 60 s. Do not log the result. Click `RE-SCAN`.

## Assertions
- [ ] Both the camera and gallery inputs produce a preview and `ANALYZE MEAL`.
- [ ] The vision request uses `claude-sonnet-5`, `max_tokens 1024`, and a JPEG resized to a 1024 px longest side.
- [ ] `SCANNING MEAL…` shows while pending.
- [ ] Card and total values match the table at each checkpoint.
- [ ] L multiplies by 1.5 and S by 0.75, and the previews equal `round(grams × mult)`.
- [ ] `MISSING SOMETHING?` appends an item to the detected list.
- [ ] LOG MEAL shows the toast `Meal logged — 611 kcal ✓`, the row is truncated to 40 chars plus `...`, and the ring updates.
- [ ] Cleanup removed this run's meal.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Photo preview with `ANALYZE MEAL`
- `SCANNING MEAL…` state
- Detected foods at M, and after chicken → L
- After adding White Rice
- `MEAL LOGGED ✓` with the toast and the `TODAY'S MEALS` row
- Final state after cleanup

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
