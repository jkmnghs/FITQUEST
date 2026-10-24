# T22-fuel-manual-add-validation: Form validation and error paths for `manual-add-food`

| Field | Value |
|---|---|
| Route | `/?tab=fuel` |
| Source | `src/components/NutritionTab.jsx` (`addFoodByText`, lines 274–356; input/ADD at 554–591 and 940–977), `src/lib/authFetch.js`, `src/utils/nutritionUtils.js` (`searchUSDA`, `validateUSDAMacros`, `validateUSDAAgainstClaude`) |
| Flow | Manual add input validation, 3-tier enrichment, and API failure paths: 401/429/500 surface as `API error <status>` (source-derived) |
| Requires auth | yes |
| Required role | user |
| Destructive | no. Nothing is logged; every card is discarded with `RE-SCAN` |
| Estimated steps | 34 |

> Verification status: **source-derived, not browser-verified** (the analysis ran without Supabase). There is no client-side text validation other than `addText.trim()` being non-empty, and no `maxLength`.

## Preconditions
- App running at `http://localhost:5173` with real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- Signed in as role `user`: a dedicated throwaway test account from `QA-tests/.qa-catalog/auth.local.json`. Onboarding is complete, `localStorage.fitquest_onboarding_complete = "true"` is set, and the `READY` boot screen has been skipped.
- On `/?tab=fuel`, with no image selected and no detected foods (the clean panel). Desktop viewport `1280×800`.
- Seed data: none.

## Test data
- `emptyRequired = ""`, `whitespaceOnly = "   "`, `paddedQuery = "   grilled chicken breast   "`
- `longQuery = 500 × "a"` (no maxLength exists)
- `unparseableQuery = "mystery stew xyzzy"` (matches no reference-DB keyword)
- `usdaQuery = "qa usda oat bar"`
- `negativeQuery = "qa negative macros"`
- **Network mocks** (`page.route`). Each TC row says which variant of `POST **/api/nutrition` to install:
  - `M-CHICKEN` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`
  - `M-500` → 500 `{"error":"API key not configured"}`
  - `M-429` → 429 `{"error":"Too many requests. Max 15 per minute — wait a moment and try again."}`
  - `M-401` → 401 `{"error":"Invalid or expired session"}`
  - `M-ABORT` → `route.abort('failed')`
  - `M-PROSE` → 200 `{"content":[{"type":"text","text":"Sorry, I am not sure what that is."}]}`
  - `M-THINKING` → 200 `{"content":[{"type":"thinking","thinking":"…"},{"type":"text","text":"{\"name\":\"QA Grilled Chicken Breast\",\"cookingMethod\":\"grilled\",\"grams\":150,\"calories\":250,\"protein\":45,\"carbs\":0,\"fat\":6}"}]}`
  - `M-OATBAR` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Oat Bar\",\"cookingMethod\":\"raw\",\"grams\":50,\"calories\":200,\"protein\":5,\"carbs\":30,\"fat\":7}"}]}`
  - `M-NEGATIVE` → 200 `{"content":[{"type":"text","text":"{\"name\":\"QA Negative\",\"grams\":80,\"calories\":-50,\"protein\":-3,\"carbs\":10,\"fat\":2}"}]}`
  - `GET **/api/usda**` default → 200 `{"foods":[]}`. For the `M-OATBAR` row only, use `U-OATBAR` → 200 `{"foods":[{"foodNutrients":[{"nutrientId":1008,"value":400},{"nutrientId":1003,"value":10},{"nutrientId":1005,"value":60},{"nutrientId":1004,"value":14}]}]}`

## Steps

### TC-01: Happy path: a padded query is trimmed and submitted
1. Install `M-CHICKEN` and the default USDA mock. Navigate to `/?tab=fuel` signed in as `user`.
2. Type `   grilled chicken breast   ` into `e.g. 2 scrambled eggs`. Assert: `ADD` is enabled.
3. Click **`ADD`**. Assert: the request body's `messages[0].content` contains `Nutritional info for: "grilled chicken breast"` (trimmed, no surrounding spaces).
4. Assert: the card `QA Grilled Chicken Breast` · `REF` · `150g · 248 kcal` appears and the input is cleared.
5. Click `RE-SCAN`. Assert: the clean panel is restored.

### TC-02: Form validation: `manual-add-food`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| addText | `""` → `ADD` `disabled` (tertiary colour, cursor default). Enter sends no request and renders no error text | `"   "` → same as empty. No request | `500 × "a"` → `ADD` enabled. One request is sent. Accept either a card or `API error 400`, and record which one occurred (the server-side `sanitizeAnthropicBody` decides) |

Error-message matrix (red 11 px text directly under the input; one row per mock):

| Mock | Query | Expected text under input | Input value after | ADD after |
|---|---|---|---|---|
| `M-500` | `grilled chicken breast` | `API error 500` | unchanged (`grilled chicken breast`) | enabled |
| `M-429` | `grilled chicken breast` | `API error 429`. The server's `Too many requests…` message is **not** shown; record as a UX gap | unchanged | enabled |
| `M-401` | `grilled chicken breast` | `API error 401` | unchanged | enabled |
| `M-ABORT` | `grilled chicken breast` | `Failed to fetch` (Chromium's TypeError message; the fallback `Failed to add item.` is only used when `err.message` is empty) | unchanged | enabled |

Steps:
1. With the input empty, assert `ADD` has the `disabled` attribute. Focus the input and press Enter. Assert: zero `/api/nutrition` requests.
2. Type `   `. Assert: `ADD` is still disabled. Press Enter. Assert: zero requests.
3. For each row of the error matrix: install the mock, type the query, click `ADD`, and assert the text, input value and ADD state. Then type one more character (` `). Assert: the error text disappears, because `onChange` calls `setAddError(null)`. Clear the input.
4. Long query: install `M-PROSE`, paste `longQuery`, click `ADD`. Assert: exactly one request, and the UI does not freeze. Record the result. With `M-PROSE` the result is an `AI` card named with the 500-char query, `100g · 0 kcal`. Check that the long name wraps and does not overflow the card horizontally (`scrollWidth <= clientWidth` on the card). `RE-SCAN`.

### TC-03: Modal coverage: n/a (no dialogs in this flow)

### TC-04: Button coverage: enrichment tiers, observed through the ADD button
| Button | Action taken | Expected result |
|---|---|---|
| `ADD` with `M-CHICKEN` | `grilled chicken breast` | Tier 1: badge `REF`, `150g · 248 kcal`, no `/api/usda` request |
| `ADD` with `M-THINKING` | `grilled chicken breast` | The leading non-text block is skipped. Same `REF` card as above |
| `ADD` with `M-OATBAR` + `U-OATBAR` | `qa usda oat bar` | Tier 2: one `GET /api/usda?query=QA%20Oat%20Bar`, badge `USDA`, card `QA Oat Bar` · `50g · 200 kcal`, tiles `5g` / `30g` / `7g` |
| `ADD` with `M-OATBAR` + default USDA (`{"foods":[]}`) | `qa usda oat bar` | Tier 3: badge `AI`, `50g · 200 kcal`, tiles `5g` / `30g` / `7g` |
| `ADD` with `M-PROSE` | `mystery stew xyzzy` | The response cannot be parsed, so the name falls back to the query and grams to 100. Badge `AI`, card `mystery stew xyzzy` · `100g · 0 kcal`, tiles `0g`/`0g`/`0g`. No error text. Record that a zero-calorie item is added silently |
| `ADD` with `M-NEGATIVE` | `qa negative macros` | Clamping: `AI` card `QA Negative` · `80g · 0 kcal`, tiles Protein `0g`, Carbs `10g`, Fat `2g` |
| `RE-SCAN` | after each row | the card list is cleared and nothing is logged |

### TC-05: Negative & edge cases
- **Double submit:** install `M-CHICKEN` with a 1500 ms delay. Type the query, click `ADD`, then click again and press Enter while `…` is showing. Assert: exactly one request and one card.
- **ADD disabled while pending:** during the delay, assert `ADD` has `disabled` and the label `…`.
- **Session expired (best effort):** with no mock installed, delete every `localStorage` key matching `sb-*-auth-token`, then click `ADD` with `grilled chicken breast`. Expected per `authFetch`: the red text `Your session has expired — please sign in again.` and no `/api/nutrition` request. If supabase-js still serves the session from memory and the request goes out, record that, then reload the page to restore the session.
- **Rate limit with the live API (optional; only run it with spare quota):** 16 live `ADD` requests within 60 s must return `API error 429` on the 16th (`PER_MINUTE = 15`). Skip this by default, because it burns a quarter of the 60/day quota.
- **Error scoping:** trigger `M-500` from the top input, then add a card with `M-CHICKEN` so `MISSING SOMETHING?` renders. Trigger `M-500` again from the `MISSING SOMETHING?` input. Assert: the error is shown under **both** inputs, because both render `addError` from shared state. Record as a UX issue.

## Assertions
- [ ] Empty and whitespace-only input keep `ADD` disabled and the Enter key does nothing.
- [ ] The query is trimmed before it is sent.
- [ ] 500/429/401 surface as `API error <status>` under the input. A network failure surfaces as `Failed to fetch`.
- [ ] Typing clears the error text.
- [ ] Tier 1 → `REF`, tier 2 → `USDA`, tier 3 → `AI`, with exactly the values listed above.
- [ ] Negative AI macros are clamped to 0.
- [ ] Concurrent submits collapse to one request.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except the mocked error responses listed above.

## Screenshots required
- Page initial load
- Disabled ADD with whitespace input
- Each error-text state (`API error 500`, `API error 429`, `API error 401`, `Failed to fetch`)
- The REF, USDA and AI badge cards
- Long-query card (wrapping check)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
