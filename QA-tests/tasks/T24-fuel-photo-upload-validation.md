# T24-fuel-photo-upload-validation: HEIC rejection and meal-analysis error paths

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (`handleImageSelect` lines 88–123, `analyzeMeal` lines 125–272, error banner lines 662–672) |
| Flow | Upload HEIC photo → rejected with the HEIC error and no API call; API failure paths for ANALYZE MEAL (source-derived) |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no. Nothing is logged |
| Estimated steps | 30 |

> Verification status: **source-derived, not browser-verified** (no Supabase during analysis).

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and `READY` has been skipped.
- On `/?tab=fuel` with the clean panel. Desktop viewport `1280×800`.
- Fixture `QA-tests/fixtures/meal-2000x1500.jpg` (see T23). The HEIC cases do **not** need a real HEIC file: rejection is based only on MIME type or extension, so pass a buffer with the name and mimeType set explicitly (`setInputFiles({ name, mimeType, buffer })`).

## Test data
- `validPhoto = QA-tests/fixtures/meal-2000x1500.jpg`
- HEIC variants, each with the JPEG fixture's bytes as `buffer`:
  - `{ name: "meal.heic", mimeType: "image/heic" }`
  - `{ name: "photo.HEIF", mimeType: "image/jpeg" }` (uppercase extension, rejected by name)
  - `{ name: "meal.jpg", mimeType: "image/heif" }` (rejected by MIME)
  - `{ name: "IMG_0001.heic.jpg", mimeType: "image/jpeg" }` (**accepted**, because the name ends in `.jpg`)
- `notAnImage = { name: "notes.txt", mimeType: "text/plain", buffer: "hello" }`
- `HEIC_MSG = 'HEIC photos are not supported. In iPhone Settings → Camera → Formats, choose "Most Compatible" to shoot in JPEG, or pick an existing JPEG from your gallery.'`
- **Vision mocks** for `POST **/api/nutrition`:
  - `V-500` → 500 `{"error":"API key not configured"}`
  - `V-429` → 429 `{"error":"Daily food analysis limit reached (60/60). Resets at midnight."}`
  - `V-502` → 502 `{"error":"Upstream request failed"}`
  - `V-ABORT` → `route.abort('failed')`
  - `V-PROSE` → 200 `{"content":[{"type":"text","text":"I can see a plate but cannot identify it."}]}`
  - `V-EMPTY` → 200 `{"content":[{"type":"text","text":"[]"}]}`
  - `V-FENCED` → 200 `{"content":[{"type":"text","text":"```json\n[{\"name\":\"Broccoli\",\"cookingMethod\":\"steamed\",\"grams\":100,\"calories\":35,\"protein\":3,\"carbs\":7,\"fat\":0.4}]\n```"}]}`
  - `V-GARBAGE` → 200 `{"content":[{"type":"text","text":"[{\"name\":\"\",\"grams\":\"abc\",\"calories\":-10,\"protein\":\"x\",\"carbs\":5,\"fat\":1}]"}]}`
  - `V-OBJECT` → 200 `{"content":[{"type":"text","text":"{\"name\":\"Broccoli\"}"}]}` (an object, not an array)
- `GET **/api/usda**` → 200 `{"foods":[]}`

## Steps

### TC-01: Happy path: a rejected HEIC is followed by a valid JPEG that analyzes successfully
1. Sign in as `user`, open `/?tab=fuel`, skip `READY`. Start capturing requests to `/api/nutrition`.
2. `setInputFiles` on the gallery input (`input[type=file]:not([capture])`) with `meal.heic` / `image/heic`.
3. Assert: the red error banner shows exactly `HEIC_MSG`. No `img[alt="Meal"]` preview, no `ANALYZE MEAL`, and `SCAN MEAL` / `Upload from gallery` are still visible. Zero `/api/nutrition` requests.
4. `setInputFiles` on the same input with `validPhoto`. Assert: the HEIC banner disappears (`setError(null)`), and the preview plus `ANALYZE MEAL` appear.
5. Install `V-FENCED`. Click **`ANALYZE MEAL`**. Assert: the JSON inside the markdown fence is extracted, and the card `Broccoli` · `REF` · `100g · 34 kcal` appears with no error banner.
6. Click `✕`. Assert: the clean panel is back.

### TC-02: Form validation: photo inputs (`camera-file-input`, `gallery-file-input`)
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| camera-file-input (`SCAN MEAL`) | No file chosen → no change, no error | `meal.heic` / `image/heic` → `HEIC_MSG`; `photo.HEIF` / `image/jpeg` → `HEIC_MSG`; `meal.jpg` / `image/heif` → `HEIC_MSG` | n/a. Large images are resized client-side to a 1024 px longest side; no size error exists |
| gallery-file-input (`Upload from gallery`) | same | same three variants → `HEIC_MSG` | same |

Steps:
1. Repeat TC-01 step 2–3 for each of the three HEIC variants, on **both** inputs (camera = `input[capture="environment"]`). Assert `HEIC_MSG` each time and zero requests. Between variants, clear the input with `setInputFiles([])`, because selecting an identical file twice does not fire `change`.
2. `IMG_0001.heic.jpg` / `image/jpeg`. Assert: accepted, the preview shows, and there is no error. `✕`.
3. `notes.txt` / `text/plain`. Expected per source: `FileReader` reads it, `Image.onload` never fires, and nothing visible happens (no preview, **no error**). Record as a silent-failure defect. Assert: no console error.

### TC-03: Modal coverage: n/a (no dialogs). Covers the error banner lifecycle instead
1. Upload `validPhoto`. Install `V-500`. Click `ANALYZE MEAL`. Assert: `SCANNING MEAL…` shows, then the red banner `API error 500`. The preview stays, `ANALYZE MEAL` is visible again (foods are empty and analyzing is false), and there are no cards.
2. Install `V-FENCED`. Click `ANALYZE MEAL` again. Assert: the banner disappears as soon as the click lands (`setError(null)` at the start), and the Broccoli card renders.
3. Click `RE-SCAN`. Assert: the banner, preview and cards are all cleared.

### TC-04: Button coverage: `ANALYZE MEAL` against each failure mock
For each row: upload `validPhoto`, install the mock, click `ANALYZE MEAL`, assert the banner text, assert that `ANALYZE MEAL` is visible again for a retry, then click `✕`.

| Button | Action taken | Expected result |
|---|---|---|
| `ANALYZE MEAL` + `V-500` | click | banner `API error 500` |
| `ANALYZE MEAL` + `V-429` | click | banner `API error 429`. The server's `Daily food analysis limit reached (60/60). Resets at midnight.` is **not** shown; record as a UX gap |
| `ANALYZE MEAL` + `V-502` | click | banner `API error 502` |
| `ANALYZE MEAL` + `V-ABORT` | click | banner `Failed to fetch` |
| `ANALYZE MEAL` + `V-PROSE` | click | banner `Could not parse response. Try again.` |
| `ANALYZE MEAL` + `V-EMPTY` | click | banner `No food items detected. Try a clearer photo.` |
| `ANALYZE MEAL` + `V-OBJECT` | click | banner `No food items detected. Try a clearer photo.` (the parsed value is not an array) |
| `ANALYZE MEAL` + `V-GARBAGE` | click | no banner. One card `Unknown food` · `AI` · `100g · 0 kcal`, tiles `0g` / `5g` / `1g` |
| `✕` | click after each row | banner, preview and cards cleared |

### TC-05: Negative & edge cases
- **HEIC while a preview exists:** upload `validPhoto` (the preview shows). Then call `setInputFiles` directly on the hidden gallery input with `meal.heic`. Expected per source: `HEIC_MSG` is shown **while the old preview and `ANALYZE MEAL` stay visible**. Clicking `ANALYZE MEAL` then clears the banner and analyzes the old photo. Record the mixed state as a UX issue.
- **Double-click ANALYZE:** with a 1500 ms vision mock, double-click `ANALYZE MEAL`. Assert: exactly one request, because the button unmounts as soon as `analyzing` is true.
- **Thinking block first:** a mock with `content: [{"type":"thinking","thinking":"…"}, {"type":"text","text":"[{\"name\":\"Broccoli\",\"cookingMethod\":\"steamed\",\"grams\":100,\"calories\":35,\"protein\":3,\"carbs\":7,\"fat\":0.4}]"}]` gives the `Broccoli` `REF` card with no banner.
- **Not signed in (session cleared, best effort):** remove the `sb-*-auth-token` localStorage keys, then analyze. Expected banner: `Your session has expired — please sign in again.`, with no request sent.

## Assertions
- [ ] All three HEIC/HEIF variants are rejected with `HEIC_MSG` on both inputs, with zero network calls.
- [ ] A name ending in `.jpg` is accepted even when it contains `.heic`.
- [ ] A non-image file fails silently. Logged as a defect.
- [ ] Each analysis failure shows its exact banner text, and `ANALYZE MEAL` comes back for a retry.
- [ ] A fenced JSON response is parsed. Garbage fields are sanitized to `Unknown food` / `100g` / `0` values.
- [ ] Retrying clears the previous banner.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except the mocked error responses.

## Screenshots required
- Page initial load
- The HEIC error banner
- Each analysis error banner (`API error 500`, `API error 429`, `Could not parse response. Try again.`, `No food items detected. Try a clearer photo.`)
- The `Unknown food` sanitized card
- Final state after `✕`

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
