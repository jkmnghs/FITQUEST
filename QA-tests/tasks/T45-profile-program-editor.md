# T45-profile-program-editor: Edit the weekly program in My Program

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/ProgramEditorTab.jsx` (catalog: `src/data/exerciseCatalog.js`; dialog: `src/components/ui/ConfirmDialog.jsx`) |
| Flow | Program editor: switch day, add catalog/custom exercise, edit fields, reorder, delete, clear day (confirm), save program (source-derived) |
| Requires auth | yes |
| Required role | test-user |
| Destructive | yes (`✕` delete and `CLEAR DAY` change the draft; SAVE writes `dayTemplates`) |
| Estimated steps | 40 |

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `test-user`: a **dedicated, disposable** Supabase test account resolved through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never use a real person's account.
- Onboarding completed, and `localStorage.fitquest_onboarding_complete = "true"`.
- Seed: at least 2 training days. `testDay` = the first day tab, which has at least 2 exercises (`exA`, `exB`) for the reorder steps.
- Before starting, record `testDay`'s original title, minutes and exercise list (screenshot plus the text of each row). TC-06 restores it.
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified).
- **Dialog safety:** `ConfirmDialog` moves focus to its **confirm** button about 40 ms after opening. Never press Enter or Space while a dialog is open unless the step says to confirm. Close dialogs with **CANCEL**, **Escape** or a backdrop click.

## Test data
- `dayTitle = "QA PUSH + ABS"`
- `sessionMinutes = "60"`
- `catalogQuery = "bench"`; pick `Barbell Bench Press` (catalog `startKg` 42.5)
- Edited catalog exercise: `WEIGHT (KG) = "40"`, `SETS = "4"`, `REPS MIN = "8"`, `REPS MAX = "12"`, `REST = "90 sec"`, `RPE = "7.5"`, `NOTE (OPTIONAL) = "Pause at chest"`
- `customName = "QA Custom Lift"` (expected defaults: 20 kg, 3×10, 2 min, RPE 8)
- `exactCatalogName = "barbell bench press"` (lower case; USE is expected to pick the catalog item)
- `blankName = "   "`
- Invalid values: `minutesZero = "0"`, `minutesHuge = "500"`, `setsHuge = "11"`, `setsZero = "0"`, `repMinZero = "0"`, `repMaxLow = "6"` (with REPS MIN 10), `negKg = "-5"`

## Steps

### TC-01: Happy path — add, edit, reorder and save
1. Sign in as `test-user`. Navigate to `/?tab=profile` and scroll to `My Program`.
2. Assert: one day tab per training day (`MON` … `SUN`, sorted). The active tab is cyan, and tabs with exercises show a small dot. The title input has the placeholder `<Full day> session — e.g. PUSH + SHOULDERS + ABS`. The minutes input defaults to `75` with the suffix `min`.
3. Click the `testDay` tab. Fill the title = `dayTitle` and the minutes = `sessionMinutes`.
4. Click **`+ ADD EXERCISE`**. Assert: `SEARCH EXERCISE LIBRARY` shows, the input (placeholder `Search or type custom name…`) is focused, and 10 catalog suggestions are listed, each with `<n>kg` or `BW`.
5. Type `catalogQuery`. Assert: at most 8 suggestions remain, and all of them contain "bench". Click **`Barbell Bench Press`**.
6. Assert: the add form shows the heading `Barbell Bench Press`, `← back`, the fields `WEIGHT (KG)` = 42.5, `SETS` = 3, `REPS MIN` = 10, `REPS MAX` = 10, `REST` = `2 min`, `RPE` = 8 and `NOTE (OPTIONAL)`, and the buttons `ADD TO <TESTDAY>` and `CANCEL`.
7. Fill the edited catalog exercise values from Test data. Click **`ADD TO <TESTDAY>`**.
8. Assert: a new last row `Barbell Bench Press` shows `40kg · 4×8–12 · 90 sec · RPE 7.5`, with the purple note `Pause at chest`.
9. Click **`+ ADD EXERCISE`**, type `customName` and click **`USE`**. Assert: the add form heading is `QA Custom Lift` with `WEIGHT (KG)` = 20. Click **`ADD TO <TESTDAY>`**. Assert: the row `QA Custom Lift` shows `20kg · 3×10 · 2 min · RPE 8`.
10. On the `QA Custom Lift` row, click `Move QA Custom Lift up` (↑). Assert: it swaps places with `Barbell Bench Press`. On the first row, `Move … up` is `disabled`. On the last row, `Move … down` is `disabled`.
11. Click `Edit QA Custom Lift` (✎). Assert: the inline editor opens with `DONE`, and the ✎ border is cyan. Change `SETS` to `5`. Click **`DONE`**. Assert: the row shows `20kg · 5×10 · 2 min · RPE 8`.
12. Click **`SAVE PROGRAM`**. Assert: the label becomes `✓ SAVED` on a green background, then returns to `SAVE PROGRAM` after about 2.5 s.
13. Reload the page and return to `My Program` › `testDay`. Assert: the title `QA PUSH + ABS`, `60` min and both new exercises with the edited values persist.
14. Navigate to `Train`. If today is `testDay`, assert that the session lists the saved exercises. Otherwise, record "N/A — not today".

### TC-02: Form validation — `program-editor-day`
There are no visible error messages. Assert the coercion behaviour. Run these on the add form (step 6 state), then click `CANCEL` so nothing is added.

| Field | Empty value | Range violation | Expected handling |
|---|---|---|---|
| Session minutes | `""` falls back to `75` | `minutesZero` → `75`; `minutesHuge` = 500 is **accepted** (min 20 / max 180 are DOM-only) | BUG CANDIDATE when 500 is stored |
| SETS | `""` → `1` | `setsZero` → `1`; `setsHuge` = 11 is **accepted** (max 10 DOM-only) | record the result |
| REPS MIN | `""` → `1` | `repMinZero` → `1` | — |
| REPS MAX | `""` → `1` | `repMaxLow` = 6 with REPS MIN 10 is accepted, and the row shows `10–6` | BUG CANDIDATE: no repMax ≥ repMin check |
| WEIGHT (KG) | `""` → `0` | `negKg` = -5 is accepted and shows `-5kg` | BUG CANDIDATE: negative weight |
| Search / USE | `blankName` → `USE` does nothing (form stays in search) | — | — |

1. For each row above, type the value and record the stored or displayed value. For the minutes field, type into the day minutes input and do **not** save. For the others, add the exercise, check its row summary, then delete it with ✕.
2. Type `exactCatalogName` and click **`USE`**. Assert: it picks the catalog item (heading `Barbell Bench Press`, weight 42.5, not 20). Click `CANCEL`.
3. Type `blankName` and press Enter. Assert: nothing happens. Press Escape. Assert: the search panel closes, and `+ ADD EXERCISE` is back.

### TC-03: Modal coverage — `confirm-clear-day`
The draft only changes until `SAVE PROGRAM` is clicked. **Do not click `SAVE PROGRAM` anywhere in this TC.**
1. On `testDay` (which has exercises), click **`CLEAR DAY`**.
2. Assert: an `alertdialog` (`aria-modal="true"`) titled `Clear <Full day>?` shows the message `Every exercise on this day is removed. You can rebuild it by hand or ask the AI Coach to design it.`, a red warning icon, and the buttons `CANCEL` and `CLEAR DAY` (red gradient). Focus moves to `CLEAR DAY`.
3. Click **`CANCEL`**. Assert: the dialog closes, every exercise is still listed, and focus returns to the `CLEAR DAY` button.
4. Reopen it. Press **Escape**. Assert: it closes with no change.
5. Reopen it. Click the dimmed backdrop outside the dialog. Assert: it closes with no change.
6. Reopen it. Click **`CLEAR DAY`** in the dialog. Assert: the list empties, `No exercises yet for <Full day>.` shows, the `CLEAR DAY` page button disappears, and the day-tab dot disappears.
7. **Without saving**, reload the page. Assert: `testDay`'s saved exercises are back. The draft clear was discarded, which proves CLEAR DAY does not persist without SAVE.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| Day tab (`MON`…) | click another day | That day's draft shows, and any open editor or add form closes. |
| `✎` `Edit <name>` | click ×2 | The inline editor toggles open and closed. |
| `↑` / `↓` | click | Swaps with the neighbour. Disabled at the ends. |
| `✕` `Delete <name>` | click | The row is removed **immediately, with no confirm** (observation). It persists only after SAVE. |
| `+ ADD EXERCISE` → `CANCEL` (search) | click | The search panel closes. |
| `← back` (add form) | click | Returns to the search panel. |
| `CANCEL` (add form) | click | The add form closes, and nothing is added. |
| `SAVE PROGRAM` | click | Shows `✓ SAVED` for 2.5 s. |

### TC-05: Negative & edge cases
- Unsaved-edit retention: change `testDay`'s title, switch to another day tab, then back. Assert: the edited draft title is still there (drafts are per day). Reload. Assert: the unsaved title is lost, and the saved one shows. Record whether any "unsaved changes" warning appears (none is expected from source).
- Delete via ✕ while that row's editor is open. Assert: the editor closes and no error appears.
- Days outside `trainingDays` keep their templates after SAVE (merge, not replace). This can only be checked if the throwaway account has a stored template for a non-training day. Otherwise record N/A.

### TC-06: Restore
1. On `testDay`, delete `Barbell Bench Press` and `QA Custom Lift` with ✕. Set the title and minutes back to the recorded originals. Click **`SAVE PROGRAM`**.
2. Reload. Assert: `testDay` matches the original record from the Preconditions.

## Assertions
- [ ] Catalog search filters to 8 or fewer matches. Picking an item prefills its catalog weight.
- [ ] A custom name creates an exercise with 20 kg, 3×10, 2 min, RPE 8. An exact catalog-name match picks the catalog item.
- [ ] Edits, reorders and deletes update the row summary right away.
- [ ] `SAVE PROGRAM` shows `✓ SAVED` and the program survives a reload.
- [ ] The `CLEAR DAY` dialog closes with no change on CANCEL, Escape and backdrop. Confirm clears only the draft.
- [ ] BUG CANDIDATES recorded: minutes 500 accepted, sets 11 accepted, repMax < repMin accepted, negative weight accepted, ✕ has no confirm.
- [ ] The original program is restored.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- My Program initial load (`testDay`)
- Search panel with the `bench` results
- Add form for `Barbell Bench Press`
- `CLEAR DAY` dialog opened
- Each bug-candidate state (`10–6`, `-5kg`, minutes 500)
- `✓ SAVED` state, and the final restored state

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. Bug-candidate results in TC-02 are expected findings and must be reported as defects.
