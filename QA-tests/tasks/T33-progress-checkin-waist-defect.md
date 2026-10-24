# T33-progress-checkin-waist-defect: Check-in with a waist value saves and validates (exposes the getHeightCm ReferenceError)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/CheckinTab.jsx` (L44-50; `getHeightCm` is called on L45 but never imported, see `src/utils/bodyMetrics`) |
| Flow | Submit a weekly check-in with weight, waist and sleep |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no |
| Estimated steps | 18 |

> **Known defect, harness-verified.** `CheckinTab.jsx:45` calls `getHeightCm(state)`, but the file never imports it, so any waist > 0 throws `ReferenceError: getHeightCm is not defined` inside the click handler. No error text appears, `onSubmit` never runs, and nothing saves. **This task is expected to FAIL until the import is added.** The assertions describe the correct behavior, so a pass confirms the fix.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- Seed: onboarding complete with `assessment.heightCm = 180` (so `minWaist = max(55, round(180 × 0.30)) = 55`), `state.unit = "kg"`, and **no check-in for `state.currentWeek`**. Record the XP total before starting.
- DevTools console capture is on (the runner records `pageerror` / uncaught exceptions).

## Test data
- `weight = "79.5"`
- `validWaist = "86"`
- `sleep = "7.5"`
- `waistInches = "32"` (below minWaist 55)
- `waistTooHigh = "251"`
- `waistMinBoundary = "55"` (valid)
- `waistMaxBoundary = "250"` (valid)
- Expected range error text: `Enter 55–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size.`

## Steps

### TC-01: Happy path: save weight + waist + sleep
1. Sign in as `test-user` and navigate to `http://localhost:5173/?tab=progress`.
2. Fill Weight → `79.5`, Waist → `86`, Sleep → `7.5`.
3. Click **`SAVE CHECK-IN (+25 XP)`**.
4. Assert: **no** uncaught exception is logged. Specifically, the console must not contain `ReferenceError: getHeightCm is not defined`. *(Currently FAILS: this error is thrown.)*
5. Assert: the form is replaced by `CHECK-IN SAVED! +25 XP`. *(Currently FAILS: the inputs stay on screen, the button still reads `SAVE CHECK-IN (+25 XP)`, and no message appears.)*
6. Assert: XP went up by exactly 25. *(Currently FAILS: unchanged.)*
7. Assert: a Supabase upsert (cloudSet) request completes with a 2xx status. *(Currently FAILS: no request.)*
8. Reload. Assert: Check-in History shows `Week {N}` with `79.5 kg`, `86cm` and `7.5h sleep`.
9. Assert: the Body Metrics `Waist/Ht` MetricBox shows the value of `calcWaistToHeight(86, 180)` (≈ `0.48`), tag `Healthy`, note `< 0.5 = low risk`.

### TC-02: Form validation: waist range (only reachable once the import is fixed)
From a fresh load with Weight = `79.5` and Sleep blank:

| Field | Empty value error | Pattern violation | Max-length / range overflow |
|---|---|---|---|
| Waist | `""` → no error (saves) | `32` → "Enter 55–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size." | `251` → same message |

For each invalid row assert: the red inline error is visible with that exact text, no `ReferenceError` is in the console, nothing saves, and XP is unchanged. *(Currently FAILS: `32` and `251` both throw the ReferenceError and show no message. The harness confirmed this for `32`.)*

Boundaries: Waist `55` → saves. Waist `250` → saves (run each from a fresh seed, or use the overwrite path with a waist-less prior check-in).

### TC-03: Modal coverage
n/a. No modals.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `SAVE CHECK-IN (+25 XP)` | click with Waist `86` | `CHECK-IN SAVED! +25 XP`, no console error |
| `SAVE CHECK-IN (+25 XP)` | click with Waist `32` | range error text shown, no console error |

### TC-05: Negative & edge cases (consequences of the same defect)
- **Update path is blocked when this week already has a waist.** Seed a check-in for `currentWeek` with `waist = 86`. Load the tab: Waist is pre-filled `86` and the button reads `UPDATE CHECK-IN`. Change Weight to `79.0` and click **`UPDATE CHECK-IN`**. Assert: the overwrite warning `Already checked in Week {N} (… kg). Tap again to overwrite.` appears with no console error. *(Currently FAILS: a ReferenceError is thrown before the warning, so the user cannot update the check-in without first clearing Waist.)*
- **Weight error still wins:** Weight `600` + Waist `86` → `Enter a valid weight between 1–500 kg`, and no ReferenceError, because weight is validated first. This passes today and shows the crash is limited to the waist branch.
- **Negative waist:** Waist `-5` → `Enter a valid waist measurement`, and no ReferenceError, because the `ws > 0` branch is skipped. This passes today.

## Assertions
- [ ] Saving with Waist `86` shows `CHECK-IN SAVED! +25 XP` (FAILS today).
- [ ] No `ReferenceError: getHeightCm is not defined` in the console at any step (FAILS today).
- [ ] XP +25 and a cloud upsert happen for a valid waist save (FAILS today).
- [ ] Waist `32` / `251` show the exact `Enter 55–250 cm, …` message (FAILS today).
- [ ] An existing check-in with a waist can go through UPDATE → OVERWRITE (FAILS today).
- [ ] Weight-first and negative-waist paths behave correctly (pass today).
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Form filled with Weight 79.5 / Waist 86 / Sleep 7.5, before the click
- State after the click (today: unchanged form, which is the defect evidence) plus a console capture showing the ReferenceError
- Waist `32` state (today: no error message)
- Final state after the happy path (once fixed)

## Pass criteria
All TCs above pass AND no unexpected console/network errors. **Expected to fail today.** Report the failure as defect "CheckinTab.jsx:45 `getHeightCm` not imported; any waist > 0 makes check-in unsaveable".
