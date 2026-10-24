# T34-progress-checkin-overwrite: Re-submit this week's check-in (UPDATE → overwrite warning → OVERWRITE)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/CheckinTab.jsx` (`handleSubmit` L66-78, overwrite banner L129-137, button label L147) |
| Flow | Re-submit this week's check-in: UPDATE CHECK-IN → overwrite warning → OVERWRITE CHECK-IN → 'CHECK-IN SAVED! UPDATED' |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | yes (overwrites the existing check-in for the current week) |
| Estimated steps | 20 |

> Verification status: source-derived. Not run in the real authenticated app or the harness.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- Seed: onboarding complete, `state.unit = "kg"`, and **an existing check-in for `state.currentWeek` with `weight = 79.5`, `waist = 0`, `sleep = 7.5`**. Running T31 first produces this. The waist must be 0 so the getHeightCm defect (T33) does not block this flow.
- Record the XP total before starting.

## Test data
- `existingWeight = 79.5` (seeded)
- `newWeight = "78.9"`
- `abandonWeight = "78.0"`
- `newSleep = "8"`
- `waist = ""` (keep blank)

## Steps

### TC-01: Happy path: overwrite this week's check-in
1. Sign in as `test-user` and navigate to `http://localhost:5173/?tab=progress`.
2. Assert: Weight is pre-filled `79.5`, Sleep `7.5`, and Waist is empty. The button reads `UPDATE CHECK-IN`.
3. Change Weight to `78.9` and Sleep to `8`.
4. Click **`UPDATE CHECK-IN`**.
5. Assert: a gold warning reads `Already checked in Week {N} (79.5 kg). Tap again to overwrite.` The button label changes to `OVERWRITE CHECK-IN` with the orange (fire) gradient. Nothing has saved yet: XP is unchanged and no cloud upsert has been sent.
6. Click **`OVERWRITE CHECK-IN`**.
7. Assert: the form is replaced by `CHECK-IN SAVED! UPDATED` (not `+25 XP`).
8. Assert: Weekly Summary shows `Check-in: 78.9 kg`.
9. Assert: a cloud upsert completes with a 2xx status.
10. Reload. Assert: Check-in History has exactly **one** `Week {N}` row, showing `78.9 kg` and `8h sleep`. The button reads `UPDATE CHECK-IN` again with Weight `78.9`.
11. Assert: total XP is **unchanged** compared with before step 4. The UI copy `UPDATED` and the log entry (`xp: isUpdate ? 0 : 25`, useGameState.js:1006) both mean an update earns no XP. *(Suspected defect, source-derived: `submitCheckin` calls `addXP(25)` unconditionally (useGameState.js:1028), so each overwrite probably adds 25 XP. If XP goes up by 25, report it as "overwriting a check-in re-awards 25 XP".)*

### TC-02: Form validation during overwrite
1. With the overwrite warning showing (after step 5), change Weight to `600`.
2. Assert: the gold warning disappears and the button returns to `UPDATE CHECK-IN`, because a weight change resets `showOverwrite`.
3. Click **`UPDATE CHECK-IN`**. Assert: `Enter a valid weight between 1–500 kg` is shown and the gold warning is **not** shown.

| Field | Empty value error | Pattern violation | Max-length / range overflow |
|---|---|---|---|
| Weight | `""` → "Enter a valid weight between 1–500 kg" | `0` → same | `600` → same |
| Sleep | n/a | `-1` → "Enter a valid sleep value (0–24 hours)" | `30` → same |

### TC-03: Modal coverage
n/a. The confirmation is an inline banner, not a modal.

### TC-04: Button coverage (destructive confirm cancel / proceed)
| Button | Action taken | Expected result |
|---|---|---|
| `UPDATE CHECK-IN` | first click with valid input | gold `Already checked in Week {N} (79.5 kg). Tap again to overwrite.`, label becomes `OVERWRITE CHECK-IN`, no save |
| `OVERWRITE CHECK-IN` | cancel: edit Weight to `78.0` instead of clicking, then reload without clicking | warning gone, label back to `UPDATE CHECK-IN`. After reload the stored weight is unchanged (`79.5`, or `78.9` if TC-01 already ran) |
| `OVERWRITE CHECK-IN` | confirm: second click | `CHECK-IN SAVED! UPDATED`, record replaced |

### TC-05: Negative & edge cases
- Edit only Sleep while the warning is showing. Assert: the warning **stays** (only a Weight change resets it, L118 vs L122). Clicking **`OVERWRITE CHECK-IN`** saves the new sleep.
- Navigate to another tab and back to Progress while the warning is showing. Assert: the warning is gone (component remount) and the button reads `UPDATE CHECK-IN`.

## Assertions
- [ ] Button label goes `UPDATE CHECK-IN` → `OVERWRITE CHECK-IN` → saved state.
- [ ] Gold warning text shows the exact prior week and weight.
- [ ] The first click never saves.
- [ ] `CHECK-IN SAVED! UPDATED` appears after the confirm.
- [ ] Only one History row exists for the week, with the new values.
- [ ] A weight change resets the overwrite prompt.
- [ ] Total XP is unchanged after the overwrite (suspected to fail: unconditional `addXP(25)`).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (pre-filled, `UPDATE CHECK-IN`)
- Overwrite warning state
- Validation error during overwrite
- Final `CHECK-IN SAVED! UPDATED` state and History after reload

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
