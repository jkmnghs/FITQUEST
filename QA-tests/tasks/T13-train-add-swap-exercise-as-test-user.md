# T13-train-add-swap-exercise-as-test-user: Add and swap exercises through the exercise picker

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/WorkoutTab.jsx` (swap/add picker, `Actions for {name}` menu, swipe handlers; `getPickerCategories` from `src/data/exerciseCatalog.js`) |
| Flow | ＋ ADD EXERCISE → search / category filter → pick one; swap via the ⋯ menu or a left swipe → pick a replacement |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no (edits today's exercise list on a throwaway account) |
| Estimated steps | 30 |

> Verification status: **source-derived (not browser-verified)**.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set; otherwise mark all TCs **BLOCKED (needs Supabase)**.
- Signed in as `test-user`, a **throwaway** account (credentials via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them).
- Seed: onboarding complete, `assessment.equipment = "full_gym"` (so all picker categories exist), today is a training day with ≥ 2 untouched exercises `{EX_A}`, `{EX_B}`, session not finished. `localStorage.fitquest_onboarding_complete = "true"`.
- Re-runs: swaps and adds change the day template. Use a fresh throwaway account or restore the template afterwards.

## Test data
- `searchValid = "press"` (case-insensitive substring)
- `searchUpper = "PRESS"` (same results as `press`)
- `searchNoMatch = "zzzzqqq"`
- `{ADD_PICK}` = the first exercise in the filtered list after searching `press` that is **not** already on today's list
- `{SWAP_PICK}` = the first exercise listed in `{EX_A}`'s category after opening SWAP
- `{CAT}` = the second category tab after `ALL` (record its label)

## Steps

### TC-01: Happy path — add an exercise
1. Sign in as `test-user`. Navigate to `http://localhost:5173/?tab=train`. Record `{T}` = number of exercise cards.
2. Click **`＋ ADD EXERCISE`**.
3. Assert: a `role=dialog` named `Add exercise` opens with header `ADD EXERCISE`, sub-text `Choose an exercise to add:`, an input with placeholder `Search exercises...` (empty), category buttons starting with `ALL` (selected), a list of exercise buttons, and `CANCEL`. The tab bar is hidden.
4. Assert: none of today's existing exercise names appear in the list (add mode excludes them). Bodyweight/plank items show a `BW` badge.
5. Type `press` into `Search exercises...`. Assert: every listed name contains `press` (case-insensitive) and the list is non-empty.
6. Click `{ADD_PICK}`. Assert: the dialog closes; a new card `{ADD_PICK}` appears; the card count is `{T}+1`; the hero subtitle reads `{T+1} exercises · …`.
7. Reload. Assert: `{ADD_PICK}` is still on today's list.

### TC-02: Form validation — `exercise-picker-search`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| pickerSearch | `""` → full list for the selected category (no error) | `zzzzqqq` → text `No exercises found` | n/a (no maxLength); a 200-char string → `No exercises found`, no layout break |

Steps:
1. Open `＋ ADD EXERCISE`. Type `zzzzqqq`. Assert: `No exercises found` and no exercise buttons.
2. Clear the input. Assert: the list returns.
3. Type `PRESS`. Assert: the same items as `press` in TC-01 step 5.
4. Click category `{CAT}`. Assert: it is highlighted and only `{CAT}` exercises matching `PRESS` remain (or `No exercises found`). Click `ALL`. Assert: the full `PRESS` list again.
5. Click `CANCEL`. Reopen `＋ ADD EXERCISE`. Assert: the search is empty and `ALL` is selected (filters reset on open).

### TC-03: Modal coverage — `exercise-picker` in swap mode
1. Click **`Actions for {EX_A}`**. Assert: `aria-expanded="true"`, `aria-haspopup="menu"`; a `role=menu` with `role=menuitem` buttons `SWAP` and `REMOVE` appears inside the card. The card dialog does **not** open.
2. Click `Actions for {EX_A}` again. Assert: the menu closes (`aria-expanded="false"`).
3. Reopen the menu and click **`SWAP`**. Assert: a dialog named `Swap exercise` with header `SWAP — {EX_A}` and sub-text `Choose a replacement:`. `{EX_A}` itself is not in the list; other exercises already on today's list **are** listed (swap mode only excludes the target).
4. Click the backdrop. Assert: the picker closes, `{EX_A}` is unchanged.
5. Reopen SWAP from the menu. Press `Escape`. Assert and record: the picker has **no Escape handler** in source, so it stays open (accessibility finding). Close with `CANCEL`.
6. Reopen SWAP. Click `{SWAP_PICK}`. Assert: the dialog closes; the card formerly `{EX_A}` now shows `{SWAP_PICK}` in the same position; the card count is unchanged.
7. Swipe path (desktop mouse): on `{EX_B}`, mouse-down, drag left > 40 px, mouse-up. Assert: the card slides left (`translateX(-144px)`) and reveals `SWAP` and `DELETE`. Assert also that the `{EX_B}` exercise dialog did **not** open: the browser fires `click` after `mouseup` on the same element, and the card's `onClick` reads the pre-swipe `isSwiped = false`, so a mouse swipe may also open the dialog (candidate defect; record it). If the dialog opened, close it with `Close`. Click `SWAP`. Assert: `Swap exercise` dialog for `{EX_B}`. Click `CANCEL`.
8. Swipe-close: swipe `{EX_B}` left again, then drag right > 20 px. Assert: actions hidden. Swipe left once more and click anywhere outside the card. Assert: actions hidden. Click the swiped card itself. Assert: actions hide and the exercise dialog does **not** open on that click.
9. Touch path (mobile emulation `375×812`, `hasTouch`): touch-swipe left > 40 px with < 30 px vertical drift. Assert: actions revealed. A swipe with > 30 px vertical drift does nothing.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `＋ ADD EXERCISE` | click | `Add exercise` dialog |
| `ALL` / `{CAT}` | click | Filter list by category |
| exercise item (add) | click | Card appended to today |
| `CANCEL` (picker) | click | Picker closes, no change |
| backdrop (picker) | click | Picker closes, no change |
| `Actions for {name}` | click ×2 | Menu opens / closes |
| `SWAP` (menuitem) | click | `Swap exercise` dialog |
| `SWAP` (swipe) | click | `Swap exercise` dialog |
| exercise item (swap) | click | Target replaced in place |

### TC-05: Negative & edge cases
- A `DONE` card has no `Actions for {name}` button and a left swipe reveals nothing (`canEdit` false).
- Past week (`Previous week`): cards are not `role=button`, there is no ⋯ menu, and swipe does nothing. `＋ ADD EXERCISE` is still rendered; click it, add an item, and record which day/week the add lands on (candidate defect: adding while viewing a past week).
- After `FINISH` (see T15) the ⋯ menu and swipe actions are gone.
- Hidden swipe buttons have `tabIndex=-1` and `aria-hidden="true"` until revealed. Tab through the page and assert focus never lands on an invisible `SWAP`/`DELETE`.
- Equipment filter: with `assessment.equipment = "bodyweight"` (second throwaway account), assert the picker offers no barbell items.

## Assertions
- [ ] Add picker excludes today's exercises; swap picker excludes only the target.
- [ ] Search is a case-insensitive substring match; no match shows `No exercises found`.
- [ ] Filters reset every time the picker opens.
- [ ] Add appends a card; swap replaces in place; both persist after reload.
- [ ] Picker has no Escape handler (finding recorded).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Add picker with `press` results
- `No exercises found` state
- Card ⋯ menu open
- Swipe-revealed `SWAP` / `DELETE`
- Final state after add + swap

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
