# T36-progress-weekly-success-checklist: Toggle the Weekly Success Checklist and reach PERFECT WEEK!

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/CheckinTab.jsx` (CHECKLIST_ITEMS L4-11, render L153-214) |
| Flow | Toggle the Weekly Success Checklist items and watch the N/6 score and PERFECT WEEK! |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no (local state only) |
| Estimated steps | 16 |

> Verification status: source-derived. Harness-verified in an isolated mount: 6 checkboxes render, and one click sets `aria-checked=true` and shows `1/6 completed`.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- No seed data needed beyond completed onboarding.

## Test data
Checklist rows in DOM order:
1. `3/3 workouts completed`
2. `Progressive overload on 2+ exercises`
3. `155g+ protein on 6/7 days`
4. `7+ hours sleep on 5/7 nights`
5. `Followed exact set prescription (no extras)`
6. `Tracked all workouts in FitQuest`

## Steps

### TC-01: Happy path: check all six items
1. Sign in as `test-user` and navigate to `http://localhost:5173/?tab=progress`.
2. Scroll to `Weekly Success Checklist`.
3. Assert: exactly 6 elements with `role="checkbox"` are present, labelled with the 6 texts above in order, and each has `aria-checked="false"`.
4. Assert: the score reads `0/6 completed`.
5. Click row 1 (anywhere on the row, not just the box). Assert: row 1 has `aria-checked="true"`, its box shows a green ✓, the first progress segment turns green, and the score reads `1/6 completed`.
6. Click rows 2 and 3. Assert: the score reads `3/6 completed` and uses the cyan colour (`var(--cyan)`).
7. Click rows 4 and 5. Assert: the score reads `5/6 completed` and uses the green colour (`var(--green)`).
8. Click row 6. Assert: the score reads `6/6 completed · PERFECT WEEK!` and all 6 segments are green.

### TC-02: Form validation
n/a. These are toggles only.

### TC-03: Modal coverage
n/a. No modals.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| Row 6 `Tracked all workouts in FitQuest` | click again (uncheck) | `aria-checked="false"`, score `5/6 completed`, `PERFECT WEEK!` gone |
| Row 1 `3/3 workouts completed` | keyboard: Tab to focus, press **Space** | toggles `aria-checked` (native `<button>`) |
| Row 2 | keyboard: focus, press **Enter** | toggles `aria-checked` |

### TC-05: Negative & edge cases
- **Not persisted (by design):** with 3 items checked, reload the page. Assert: all items are unchecked and the score is `0/6 completed`. Record this as an observation. The checklist is local `useState` only.
- Switch to the `Train` tab and back to `Progress`. Assert: the checklist resets to `0/6 completed`.
- Saving a check-in (T31) does not change the checklist state. Toggle 2 items, save a weight-only check-in, and assert the score still reads `2/6 completed`.

## Assertions
- [ ] 6 `role=checkbox` rows with the exact texts.
- [ ] Each click toggles `aria-checked` and updates `N/6 completed`.
- [ ] Score colour is cyan at 3–4 and green at 5–6.
- [ ] `· PERFECT WEEK!` appears only at 6/6.
- [ ] Keyboard Space/Enter toggles rows.
- [ ] State resets on reload (observation).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (checklist at 0/6)
- 3/6 state
- 6/6 PERFECT WEEK! state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
