# T14-train-destructive-remove-exercise: Destructive — REMOVE an exercise from today's training day

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/WorkoutTab.jsx` (`requestDelete` → `confirm({ title: 'Remove {name}?', confirmLabel: 'REMOVE', destructive: true })` → `onDeleteExercise(ex.id, sessionDayKey)`), `src/components/ui/ConfirmDialog.jsx` |
| Flow | Remove exercise via the ⋯ menu (REMOVE) or a swipe (DELETE), then the REMOVE confirm; cancel paths and confirm path |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | **yes**: removes the exercise from the training day template. Run on a **throwaway** account only |
| Estimated steps | 26 |

> Verification status: **source-derived (not browser-verified)**. The analyzer cancelled this confirm in source review only; nothing was removed.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set; otherwise mark all TCs **BLOCKED (needs Supabase)**.
- Signed in as `test-user`, a **throwaway** account whose data may be destroyed (credentials via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them). **Never run this task against a real user's account.**
- Seed: onboarding complete; today is a training day with ≥ 3 untouched exercises `{EX_A}`, `{EX_B}`, `{EX_C}`; session not finished. `localStorage.fitquest_onboarding_complete = "true"`.
- Restoring afterwards: re-add the removed exercises via `＋ ADD EXERCISE` (T13) or discard the account.

## Test data
- `{EX_A}` = removed via the ⋯ menu path
- `{EX_B}` = removed via the swipe path
- `{EX_C}` = kept; used for the cancel paths
- `{T}` = initial number of exercise cards

## Steps

### TC-01: Happy path — remove `{EX_A}` via the ⋯ menu
1. Sign in as `test-user`. Navigate to `http://localhost:5173/?tab=train`. Record `{T}`.
2. Click `Actions for {EX_A}`. Click the menuitem **`REMOVE`**.
3. Assert: a `role=alertdialog` with `aria-modal="true"` and `aria-labelledby="fq-confirm-title"` opens. Heading `Remove {EX_A}?`, message `It comes off this training day. You can add it back any time from + ADD EXERCISE.`, a red warning icon, buttons `CANCEL` and `REMOVE`.
4. Assert: the ⋯ menu on `{EX_A}` has closed (`aria-expanded="false"`).
5. Assert and record: about 40 ms after opening, keyboard focus is on **`REMOVE`** (the destructive button), not `CANCEL`. **Finding:** pressing Enter right after the dialog opens removes the exercise. Recommend default focus on `CANCEL` for destructive confirms.
6. Click **`REMOVE`**. Assert: the dialog closes; the `{EX_A}` card is gone; the card count is `{T}−1`; the hero subtitle reads `{T−1} exercises · …`; the ring reads `of {T−1}`.
7. Assert: focus returns to the element that opened the dialog, or to `document.body` if that element was removed. No console error.
8. Reload. Assert: `{EX_A}` is still absent from today.
9. Click `＋ ADD EXERCISE`. Assert: `{EX_A}` is now offered in the add list (it is no longer on today's list).

### TC-02: Form validation — n/a (confirm has no inputs)
The confirm has no fields. Validation here is guarding: REMOVE must only run from an explicit confirm.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| n/a | n/a | n/a | n/a |

### TC-03: Modal coverage — `confirm-remove-exercise`
1. Open `Actions for {EX_C}` → `REMOVE`. Click **`CANCEL`**. Assert: the dialog closes; `{EX_C}` is still present; card count unchanged.
2. Reopen. Press **`Escape`**. Assert: the dialog closes (ConfirmDialog stops propagation and cancels); `{EX_C}` is still present.
3. Reopen. Click the **backdrop** (the `role=presentation` overlay outside the box). Assert: the dialog closes; `{EX_C}` is still present.
4. Reopen. Click inside the dialog box (on the message). Assert: the dialog stays open. Click `CANCEL`.
5. Observation: this confirm is not reported through `onModalChange`, so the bottom tab bar stays visible behind it. Assert and record whether the tab bar is still rendered and clickable through the overlay (the overlay has z-index 10000, so clicks must be blocked).

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `REMOVE` (menuitem) | click | `Remove {name}?` alertdialog |
| `DELETE` (swipe action) | swipe `{EX_B}` left > 40 px, click `DELETE` | `Remove {EX_B}?` alertdialog |
| `CANCEL` | click | No state change |
| `Escape` | press | No state change |
| backdrop | click | No state change |
| `REMOVE` (confirm) | click → confirm proceed | Card removed; persists after reload |

Swipe path steps: swipe `{EX_B}` left (mouse drag or touch), click `DELETE`, assert the confirm title `Remove {EX_B}?`, click `REMOVE`. Assert: `{EX_B}` gone, swipe state cleared (no other card is left swiped open), count `{T}−2`.

### TC-05: Negative & edge cases
- Remove until one exercise is left, then remove the last one (throwaway only). Assert and record: the hero shows `0 exercises · …`, the ring reads `0` / `of 0`, no crash, and `＋ ADD EXERCISE` is still available. Check FinishArea does not render `NaN%` (it divides by `exercises.length`).
- Focus trap: open the REMOVE confirm on `{EX_C}` and press `Tab` repeatedly. Record whether focus is trapped inside the dialog (no trap is implemented in source; finding if focus escapes to the page behind).
- A `DONE` exercise cannot be removed: no ⋯ button, swipe reveals nothing.
- Past week view: no ⋯ button, no swipe actions.
- Offline: go offline, remove `{EX_C}`, go online, reload. Record whether the removal persisted or reverted.

## Assertions
- [ ] REMOVE / DELETE always opens `Remove {name}?` before anything is deleted.
- [ ] CANCEL, Escape and backdrop leave the exercise in place.
- [ ] REMOVE deletes the card, updates counts, and persists after reload.
- [ ] Default focus lands on the destructive button (finding recorded).
- [ ] Focus trap / tab-bar-behind-overlay behaviour recorded.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Train tab before removal
- `Remove {EX_A}?` confirm (showing focus ring on REMOVE)
- State after CANCEL
- Final state after both removals

## Pass criteria
All TCs above pass AND no unexpected console/network errors. Run only on a throwaway account.
