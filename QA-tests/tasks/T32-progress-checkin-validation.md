# T32-progress-checkin-validation: Form validation for `weekly-checkin` (weight, sleep, negative waist)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/CheckinTab.jsx` (`validate()` L32-64) |
| Flow | Submit a weekly check-in with invalid values; the inline error renders and nothing saves |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no |
| Estimated steps | 20 |

> Verification status: source-derived. The weight (0, 600) and sleep (30) errors were harness-verified in an isolated mount. Positive waist values are excluded from this matrix on purpose because they crash (see T33). This task covers only the waist paths that never reach `getHeightCm`.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- Seed: onboarding complete, `state.unit = "kg"`, **no check-in for `state.currentWeek`**, so the button reads `SAVE CHECK-IN (+25 XP)`. Note the XP total and the Check-in History contents before starting.

## Test data
- `validWeight = "79.5"`
- `weightZero = "0"`
- `weightTooHigh = "600"`
- `weightJustOver = "500.1"`
- `weightMax = "500"` (boundary, valid)
- `weightEmpty = ""`
- `sleepTooHigh = "30"`
- `sleepJustOver = "24.5"`
- `sleepNegative = "-1"`
- `waistNegative = "-5"`
- `waistZero = "0"` (allowed, treated as blank)

## Steps

### TC-01: Happy path: an error clears on edit, then a valid save works
1. Sign in as `test-user` and navigate to `http://localhost:5173/?tab=progress`.
2. Clear Weight and fill `600`. Leave Waist and Sleep blank. Click **`SAVE CHECK-IN (+25 XP)`**.
3. Assert: a red inline error with a warning triangle reads exactly `Enter a valid weight between 1–500 kg`.
4. Change Weight to `79.5`. Assert: the error disappears as soon as you type (onChange clears it).
5. Set Waist = `0`. Click **`SAVE CHECK-IN (+25 XP)`**.
6. Assert: `CHECK-IN SAVED! +25 XP` is shown and History (after reload) shows `79.5 kg` with no `cm` tag. A waist of 0 is stored as 0 and skips the `getHeightCm` path.

### TC-02: Form validation: `weekly-checkin`
Run each row from a fresh load with no check-in for this week (reset seed, or use a separate test user per row). Fill the listed values, leave the other fields blank unless stated, click **`SAVE CHECK-IN (+25 XP)`**, and assert the error text. For every row also assert: the inputs are still visible, `CHECK-IN SAVED!` does **not** appear, XP is unchanged, and no Supabase upsert request is sent.

| Field | Empty value error | Pattern violation | Max-length / range overflow |
|---|---|---|---|
| Weight (required) | `""` → "Enter a valid weight between 1–500 kg" | `0` → "Enter a valid weight between 1–500 kg" | `600` and `500.1` → "Enter a valid weight between 1–500 kg" |
| Waist (optional) | `""` → no error (saves) | `-5` (with Weight `79.5`) → "Enter a valid waist measurement" | n/a here; values > 0 are T33 |
| Sleep (optional) | `""` → no error (saves) | `-1` (with Weight `79.5`) → "Enter a valid sleep value (0–24 hours)" | `30` and `24.5` (with Weight `79.5`) → "Enter a valid sleep value (0–24 hours)" |

Extra checks:
1. **Validation order:** Weight `600` + Sleep `30` → only `Enter a valid weight between 1–500 kg` shows, because weight is checked first.
2. **Boundary valid:** Weight `500`, Sleep `24` → saves (`CHECK-IN SAVED! +25 XP`).
3. **Unit-aware message:** if a second test user with `state.unit = "lbs"` is available, Weight `600` → `Enter a valid weight between 1–500 lbs`.

### TC-03: Modal coverage
n/a. No modals.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SAVE CHECK-IN (+25 XP)` | click with invalid weight | inline error, no save, no XP |
| `SAVE CHECK-IN (+25 XP)` | click with valid weight, waist `0` | `CHECK-IN SAVED! +25 XP` |

### TC-05: Negative & edge cases
- Type `e` or `abc` into Weight. The `type=number` input rejects non-numeric text, so the value stays `""`. Clicking save gives `Enter a valid weight between 1–500 kg`.
- Weight `0.05` (parseFloat > 0) → passes validation and saves. Record this as an observation: the HTML `min="1"` is not enforced by JS.

## Assertions
- [ ] Each invalid row shows its exact error text with the triangle icon.
- [ ] Editing a field clears the visible error.
- [ ] No invalid submit changes XP, History, or sends a cloud upsert.
- [ ] Waist `0` / blank and the boundaries Weight `500` / Sleep `24` save successfully.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Each validation error state (weight, waist negative, sleep)
- Final state after the valid save

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
