# T12-train-exercise-log-validation: Exercise modal input rules, plank stopwatch, and close/reopen persistence

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/ExerciseModal.jsx` (`handleComplete` clamps, `WeightSets`, `PlankSets`, `ConfirmModal`, Escape listener) and `src/components/WorkoutTab.jsx` (`inProgressSets`) |
| Flow | Validation of `exercise-log-weighted` and `exercise-log-plank`; plank ▶ stopwatch; close the exercise modal with ×, Escape or backdrop; in-progress sets survive a reopen |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no (writes completed exercises to today's session of a throwaway account) |
| Estimated steps | 34 |

> Verification status: **source-derived (not browser-verified)**. The app shows **no client-side error messages** for set inputs. Invalid values are silently clamped on `COMPLETE`. So the "errors" asserted below are the clamped values stored, read back from the `COMPLETED` summary and the card's `Last:` line on a later session.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set. Otherwise mark all TCs **BLOCKED (needs Supabase)**.
- Signed in as `test-user` (throwaway account; credentials resolved via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them).
- Seed (throwaway account only): onboarding complete, `unit = "kg"`, non-deload `currentWeek`, today is a training day with ≥ 4 untouched exercises: weighted `{EX_A}` (≥ 3 sets), weighted `{EX_B}` (≥ 3 sets), and a **plank** exercise `{PLANK}` (`isPlank = true`, ≥ 2 sets). If today has no plank, add one with `＋ ADD EXERCISE` (T13) first, searching `plank`.
- `localStorage.fitquest_onboarding_complete = "true"`. Skip the `READY` boot screen after sign-in.
- Optional for TC-02 row 5: a second throwaway account, or the same one with Profile → unit set to `lbs`.

## Test data
- `negativeWeight = "-5"` → stored `0`
- `hugeWeight = "1500"` → stored `1000` (clamp `0..1000` kg)
- `emptyWeight = ""` → stored `0`
- `hugeReps = "150"` → stored `100` (clamp `0..100`)
- `negativeReps = "-3"` → stored `0`
- `emptyReps = ""` → stored `0`
- `decimalReps = "7.5"` → stored `7.5` (`parseFloat`, not rounded)
- `rpeDash = "-"` (option value `""`) → stored `0`
- `negativeSeconds = "-10"` → stored `0`
- `plankSeconds = "45"`
- `lbsWeight = "135"` (lbs user) → stored ≈ `61.2` kg

## Steps

### TC-01: Happy path — log a plank with the stopwatch
1. Sign in as `test-user`. Navigate to `http://localhost:5173/?tab=train`.
2. Assert: the `{PLANK}` card tag reads `{sets} × 45-60s` and has no `RPE` tag.
3. Click `Log sets for {PLANK}`. Assert: dialog `{PLANK}` with column headers `#`, `SECONDS`, `TIMER`, and one row per set with a SECONDS input (placeholder `45-60`) and a `▶` button. No `Plate calculator`, no RPE select.
4. Click `▶` on row 1. Assert: the button text becomes a live counter `0s`, `1s`, `2s`… (pulsing). Wait ~5 s.
5. Click the counter button again. Assert: it returns to `▶` and the row 1 SECONDS input now holds the elapsed whole seconds (≈ `5`).
6. Start row 2's stopwatch, then (while running) click `▶` on row 1. Assert: row 2 stops **without** writing a value (its input stays empty) and row 1 starts counting from `0s`. Stop row 1. Record this as a candidate defect: switching rows discards the running time.
7. Type `45` into row 2. Click `Complete set 1`. Assert: the rest timer opens with `Rest after Set 1 of {sets}`. Click `SKIP`. Click `Complete set 2`.
8. Click `COMPLETE EXERCISE` → `COMPLETE`. Assert: the `{PLANK}` card is `DONE`.

### TC-02: Form validation — `exercise-log-weighted` (`{EX_A}`) and `exercise-log-plank`
No inline error is ever shown. For each row, enter the value, check the set, then complete the exercise and read the stored value from the reopened `COMPLETED` summary (`Max RPE`, `kg volume`) or the next session's `Last:` line.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| weight (`KG`) | `""` → no error; stored `0` kg | `-5` → no error; stored `0`. `abc` cannot be typed (`type=number`) | `1500` → no error; stored `1000` |
| reps (`REPS`) | `""` → no error; stored `0` (a "done" set with 0 reps) | `-3` → stored `0`; `7.5` → stored `7.5` | `150` → stored `100` |
| RPE (select) | `-` → stored `0`; `Max RPE` line hidden when all sets are `-` | n/a (options `-`, `6`-`10` only) | n/a |
| SECONDS (plank) | `""` → stored `0` | `-10` → stored `0` | no upper clamp; `99999` stored as is |
| weight (lbs user) | n/a | `135` lbs → stored ≈ `61.2` kg; reopened card shows ≈ `135 lbs` | `2300` lbs → stored `1000` kg |

Steps:
1. Open `{EX_A}`. Row 1: weight `1500`, reps `150`, RPE `10`. Row 2: weight `-5`, reps `-3`, RPE `-`. Row 3: weight `""` (clear it), reps `""`, RPE `-`. Check rows 1-3.
2. Assert while open: the `Est. 1RM today` card reflects the **unclamped** row 1 values (it is computed from the raw inputs). Record the value.
3. Click `COMPLETE EXERCISE` → `COMPLETE`. Reopen `{EX_A}`.
4. Assert: `COMPLETED`, `Max RPE: 10`, and volume equal to `1000 × 100 = 100000 kg volume` (rows 2-3 contribute 0). If the volume or Max RPE differ, record the actual value: the clamp in `handleComplete` is `weightKg ∈ [0,1000]`, `reps ∈ [0,100]`, `rpe = parseInt || 0`.
5. Record as a UX defect: no feedback tells the user that `1500` became `1000`, `150` became `100`, or that a checked set with empty reps was saved as 0 reps.
6. Plank: on a second plank set (or a fresh day), enter `-10`, check, complete. Reopen. Assert the summary shows no negative value.

### TC-03: Modal coverage — `exercise` dialog close paths and persistence
1. Open `{EX_B}`. Row 1: weight `40`, reps `10`, RPE `7`; check it; `SKIP` the rest timer. Row 2: weight `42.5`, reps `9` (not checked).
2. Click **`Close`** (×). Assert: the dialog closes and the tab bar reappears. Reopen `{EX_B}`. Assert: row 1 is still `40` / `10` / `7` and `Undo set 1`; row 2 still `42.5` / `9`; footer `1/{N} sets checked`.
3. Press **`Escape`**. Assert: the dialog closes. Reopen. Assert: the same values persist.
4. Click the **backdrop** (outside the sheet, `.fq-sheet-backdrop`). Assert: the dialog closes. Reopen. Assert: the same values persist.
5. Click inside the sheet (e.g. on the header). Assert: the dialog stays open.
6. Click `COMPLETE EXERCISE`. Assert: the confirm reads `1/{N} sets checked` and `Heads up: {N−1} prescribed set{s} not checked` (singular `set` when N−1 = 1). Observation: the source inserts `\n` before `Heads up` but the container has no `white-space: pre-wrap`, so both phrases render on one line. Record the actual rendering.
7. Click `CANCEL`. Assert: the confirm closes; the dialog remains open with the values intact.
8. Reload the page. Reopen `{EX_B}`. Assert and record: in-progress (un-completed) sets are held only in `WorkoutTab` React state, so after a reload the rows reset to defaults (`{W}` weight, empty reps, RPE `8`, unchecked). This is expected behaviour; note it in the report.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `▶` (plank) | click | Live `{n}s` counter starts |
| `{n}s` (plank) | click | Stops; SECONDS input = elapsed seconds |
| `Close` | click | Dialog closes; sets kept |
| `Escape` key | press | Dialog closes; sets kept |
| backdrop | click | Dialog closes; sets kept |
| `COMPLETE EXERCISE` | click with 1 of N checked | Confirm with `Heads up: …` |
| `CANCEL` (confirm) | click | Confirm closes; nothing saved |
| `COMPLETE` (confirm) | click | Saved with clamped values |

### TC-05: Negative & edge cases
- **Escape inside the confirm (candidate defect):** open `{EX_B}`, check a set, click `COMPLETE EXERCISE`, then press `Escape`. Per source, the ExerciseModal's document-level Escape handler closes the **whole** exercise dialog (and the confirm with it) instead of only the confirm. Assert and record what happens; the exercise must not be saved.
- **Escape during the rest timer:** check a non-last set so the rest timer opens, press `Escape`. Per source this closes the exercise dialog and the timer together. Record.
- **Double complete:** click `COMPLETE` twice quickly. Assert: the exercise is stored once (card `DONE`, `FINISH SESSION · d/t` counts it once).
- **Completed exercise is read-only:** reopen a `DONE` card. Assert: no inputs, no `+ EXTRA SET`, no `COMPLETE EXERCISE`.
- **Many extra sets:** add 10 extra sets. Assert: the sticky footer with `COMPLETE EXERCISE` stays visible at the bottom of the sheet without scrolling, and the progress strip shows one segment per row.
- **Mobile viewport `375×812`:** inputs are ≥ 48 px tall; no horizontal overflow inside the sheet.

## Assertions
- [ ] Plank ▶ starts and a second click stops and writes elapsed seconds.
- [ ] Weight is clamped to 0..1000 kg, reps to 0..100, RPE `-` → 0, seconds ≥ 0; no inline error is shown (UX defect recorded).
- [ ] ×, Escape and backdrop all close the dialog and keep in-progress sets for a reopen in the same page session.
- [ ] `Heads up: N prescribed set(s) not checked` appears when prescribed sets are unchecked.
- [ ] CANCEL in the confirm saves nothing.
- [ ] Escape-in-confirm behaviour recorded.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Plank dialog with the stopwatch running
- Weighted dialog filled with the invalid values before COMPLETE
- Reopened `COMPLETED` summary showing the clamped results
- Confirm with `Heads up` text
- State after pressing Escape inside the confirm

## Pass criteria
All TCs above pass AND no unexpected console/network errors. Silent clamping, the plank row-switch data loss and the Escape-in-confirm behaviour are reported as findings.
