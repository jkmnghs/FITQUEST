# T11-train-log-weighted-exercise-as-test-user: Start a session, log a weighted exercise with rest timer, and complete it

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/TrainTab.jsx` → `src/components/WorkoutTab.jsx` (SessionHero, exercise cards, FinishArea) → `src/components/ExerciseModal.jsx` (WeightSets, PlateCalculator, ConfirmModal) → `src/components/RestTimer.jsx` |
| Flow | START SESSION; tap a weighted card; edit weight/reps/RPE; check sets (rest timer opens between sets: SKIP, +30s, NEXT SET →); + EXTRA SET; plate calculator; COMPLETE EXERCISE → COMPLETE |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no (writes one completed exercise to today's session in the test user's cloud state) |
| Estimated steps | 40 |

> Verification status: **source-derived (not browser-verified)**. Supabase was not available during analysis, so the authenticated Train tab was never rendered. Every label below was read from source.

## Preconditions
- App running at `http://localhost:5173` **with** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (dev server restarted after setting them). If they are not set, mark every TC **BLOCKED (needs Supabase)**, not FAILED.
- Signed in as `test-user`: a **throwaway** Supabase test account. The runner resolves its credentials from `QA-tests/.qa-catalog/auth.local.json` via `scripts/auth-resolve.mjs`. Never write credentials into this file.
- Seed (throwaway account only):
  - Onboarding finished (`state.assessment.completed = true`), `state.unit = "kg"`.
  - `state.currentWeek` is a non-deload week (not 4, 8 or 12 of the cycle), e.g. `2`.
  - **Today's weekday is in `state.trainingDays`**, and today's session has ≥ 3 exercises, including one **barbell** lift with prescribed weight > 20 kg and ≥ 3 sets (e.g. Barbell Squat or Bench Press; `EX_CATALOG_MAP[id].equipment === 'barbell'`). Call it `{LIFT}`.
  - Today is untouched: `todayExDone = []`, `sessionStartTime` empty, `todaySessionFinished = false`.
  - `localStorage.fitquest_onboarding_complete = "true"` so the onboarding tour overlay does not cover the tab.
- After sign-in the boot screen shows `READY` for up to 5 s (`BOOT_MIN_MS`). Tap it to skip, or wait.

## Test data
- `{LIFT}` = the barbell exercise name as shown on its card; `{N}` = its prescribed set count; `{W}` = its prescribed weight in kg (from the card tag `{N} × {reps} @ {W} kg`); `{T}` = number of exercises today.
- Set 1: `weight = "60"`, `reps = "8"`, `RPE = "8"`
- Set 2: `weight = "62.5"`, `reps = "7"`, `RPE = "9"`
- Set 3 … {N}: `weight = "62.5"`, `reps = "6"`, `RPE = "9"`
- Extra set row `{N+1}+`: `weight = "50"`, `reps = "10"`, `RPE = "7"`

## Steps

### TC-01: Happy path — log and complete `{LIFT}`
1. Sign in as `test-user`. Navigate to `http://localhost:5173/?tab=train`.
2. Assert: `role=tab` `Train` has `aria-selected="true"`. The first element in the tab is the button `Open AI Coach` with text `AI Coach · form tips & overload plan`.
3. Assert: `section[aria-label="Today's session"]` shows eyebrow `DAILY QUEST`, `WEEK {currentWeek}` (no ` · VIEWING`), the session title (or `TODAY'S SESSION`), the subtitle `{T} exercises · session {k} of {sessionsPerWeek}`, a ring reading `0` / `of {T}`, and the CTA `START SESSION`.
4. Click **`START SESSION`**. Assert: the CTA changes to `TAP AN EXERCISE TO LOG` and is `disabled`. An elapsed timer chip appears in the hero in `MM:SS` format starting near `00:00`; after 3 s it reads ≥ `00:03`.
5. Assert: the `{LIFT}` card shows `+38 XP`, the tags `{N} × {reps} @ {W} kg`, `RPE {rpe}`, and its rest string, plus a button `Actions for {LIFT}`.
6. Click the card (`role=button`, aria-label `Log sets for {LIFT}`).
7. Assert: a `role=dialog` with accessible name `{LIFT}` opens, with eyebrow `EXERCISE`, chips `RPE {rpe}` and `Rest {rest}`, column headers `#`, `KG`, `REPS`, `RPE`, `{N}` set rows numbered `1`…`{N}`, every weight input prefilled with `{W}`, reps empty (placeholder `{reps}`), RPE select = `8`, footer `0/{N} sets checked`, and the button `COMPLETE EXERCISE`.
8. Assert: the bottom tab bar `nav[aria-label="Primary"].fq-tabbar` and the Header are not rendered while the modal is open.
9. Click **`Plate calculator`** (text `Show`). Assert: `aria-expanded="true"`, text becomes `Hide`, the panel shows `Per side · {W} kg total` with bar options `20 kg` (selected), `15 kg`, `10 kg`, and plate chips in the form `{count}× {kg}kg`. Click `15 kg`. Assert: the chips change (per side = ({W} − 15)/2). Click `Plate calculator` again. Assert: the panel is hidden.
10. Fill row 1: weight `60`, reps `8`, RPE `8`.
11. Click **`Complete set 1`**. Assert: the button now has aria-label `Undo set 1`, `aria-pressed="true"`; footer reads `1/{N} sets checked`; a reference card `Est. 1RM today` (`Epley estimate`) appears.
12. Within ~300 ms assert: a `role=dialog` whose aria-label starts with `Rest timer,` and ends with `left` is visible, showing `RECOVERING`, `{LIFT}` (upper-case), `Rest after Set 1 of {N}`, a `m:ss` countdown, `REST`, and buttons `SKIP` and `+30s`.
13. Note the countdown value, click **`+30s`**. Assert: the countdown increases by 30 s (± 1 s).
14. Click **`SKIP`**. Assert: the rest timer closes and the exercise dialog is still open with row 1 checked.
15. Fill row 2: weight `62.5`, reps `7`, RPE `9`. Click `Complete set 2`. When the rest timer opens, wait until it reaches 0 (`rest seconds` of the exercise; if > 120 s you may use the browser clock to fast-forward). Assert at 0: `READY`, `GO!`, `NEXT SET`, the `+30s` button is gone, and a button `NEXT SET →` is visible. Click **`NEXT SET →`**. Assert: the timer closes.
16. Fill and check every remaining prescribed row with set 3…{N} data, using `SKIP` on each rest timer. Checking the **last** row must **not** open a rest timer.
17. Click **`+ EXTRA SET`**. Assert: a new row labelled `{N+1}+` appears, weight prefilled `{W}`, footer `{N}/{N+1} sets checked`. Fill it with the extra-set data and check it. Assert: no rest timer opens (it is the last row).
18. Click **`COMPLETE EXERCISE`**. Assert: a confirm with heading `Complete Exercise?`, text `{LIFT}` and `{N+1}/{N+1} sets checked`, no `Heads up` text, buttons `CANCEL` and `COMPLETE`.
19. Click **`COMPLETE`**. Assert: both dialogs close; the tab bar is visible again.
20. Assert: the `{LIFT}` card shows a check icon, the badge `DONE` (no `+38 XP`), opacity reduced, and **no** `Actions for {LIFT}` button.
21. Assert: the hero ring reads `1` / `of {T}` and the CTA reads `FINISH SESSION · 1/{T}`.
22. Assert: the FinishArea below `＋ ADD EXERCISE` lists every exercise; `{LIFT}` shows `{setsCompleted}/{setsPrescribed}` (expected `{N}/{N}`, matching step 23); others show `—`. The score reads `{round(100/{T})}%` and `1/{T} exercises • +{max(10, 50 − ({T}−1)×8)} bonus XP`. The button reads `FINISH SESSION`.
23. Click the `{LIFT}` card again. Assert: the dialog shows `COMPLETED`, a line `{setsCompleted}/{setsPrescribed} sets{ (+{extraSets} extra)}{ • {volume} kg volume}` (expected `{N}/{N} sets (+1 extra) • … kg volume`; the exact counts come from `completeExercise` in `useGameState`, so record the actual values if they differ) and `Max RPE: 9`, with no inputs and no `COMPLETE EXERCISE`. Close it with `Close`.
24. Reload the page (skip `READY`). Assert: `{LIFT}` is still `DONE`, the CTA is still `FINISH SESSION · 1/{T}`, and the elapsed timer continues from the original start (not reset to `00:00`).

### TC-02: Form validation — `exercise-log-weighted`
Covered in depth by **T12** (clamps, empty reps, `-` RPE, partial completion). Here, assert only the base rule: open a second weighted exercise, click `COMPLETE EXERCISE` with **zero** sets checked. Assert: the confirm reads `0/{N2} sets checked` and `Heads up: {N2} prescribed sets not checked`. Click `CANCEL`. Assert: the confirm closes, the exercise dialog stays open, nothing is saved (card still `+38 XP`). Close with `Close`.

### TC-03: Modal coverage — `rest-timer` and `exercise-complete-confirm`
1. Rest timer opened, `+30s`, `SKIP`, countdown to `GO!` and `NEXT SET →` are covered by TC-01 steps 12-15.
2. Assert at the timer's 10-s mark: the ring and label colour change to the warning colour (fire), and at 0 the ring is green.
3. Assert: `navigator.vibrate` is called with `[200, 100, 200]` at 0 (spy via `page.addInitScript`), and an `AudioContext` is created (no console error even if audio is blocked).
4. `exercise-complete-confirm` `CANCEL` and `COMPLETE` are covered by TC-02 and TC-01 step 19.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `START SESSION` | click | CTA → `TAP AN EXERCISE TO LOG` (disabled); elapsed `MM:SS` chip appears |
| `Log sets for {LIFT}` (card) | click / Enter / Space | Exercise dialog named `{LIFT}` opens |
| `Plate calculator` | click twice | `aria-expanded` toggles true/false; `Show`/`Hide` |
| `20 kg` / `15 kg` / `10 kg` | click | Selected bar highlighted; plate list recalculated |
| `Complete set i` / `Undo set i` | click | Toggles `aria-pressed`; footer count changes; rest timer only after a non-last check |
| `+ EXTRA SET` | click | Row `{n}+` appended |
| `SKIP` | click | Rest timer closes |
| `+30s` | click | Countdown +30 s |
| `NEXT SET →` | click at 0 | Rest timer closes |
| `COMPLETE EXERCISE` | click | `Complete Exercise?` confirm |
| `COMPLETE` | click | Exercise saved; card `DONE`; CTA `FINISH SESSION · d/t` |
| `Close` | click | Exercise dialog closes |

### TC-05: Negative & edge cases
- Undo: check set 1, click `Undo set 1`. Assert: `aria-pressed="false"`, footer back to `0/{N} sets checked`, no rest timer opens on undo.
- Keyboard: Tab to a card, press `Enter`. Assert: the dialog opens. Press `Escape`. Assert: it closes. Repeat with `Space`.
- Plate calculator for a target below the bar: on a barbell lift whose prescribed weight is < 20 kg, open the calculator. Assert: `Target is lighter than the bar — use the bar alone or pick a lighter one.` With exactly 20 kg assert `Empty bar.`
- Observation: the plate calculator uses the **prescribed** weight `{W}`, not the weight typed into the rows. Change row 1 to `100`; assert the panel still says `Per side · {W} kg total`. Record as a UX gap.
- Non-barbell exercise (dumbbell, machine, bodyweight): assert the `Plate calculator` button is absent.
- Rest timer accessibility: while it is open, its aria-label updates with the remaining time (`Rest timer, 1:29 left`, …).
- Offline: set the browser offline, complete a different exercise. Assert: the UI still marks it `DONE` locally; record whether a sync error banner (`CloudSaveBanner`) appears, then go online and reload to check it persisted.

## Assertions
- [ ] Hero CTA progresses `START SESSION` → `TAP AN EXERCISE TO LOG` → `FINISH SESSION · 1/{T}`.
- [ ] The elapsed timer appears after START SESSION and survives a reload.
- [ ] The exercise dialog's accessible name is the exercise name; the tab bar and Header are hidden while it is open.
- [ ] Checking set i of n (i < n) opens `Rest after Set i of n`; checking the last row does not.
- [ ] `+30s`, `SKIP`, `GO!` / `NEXT SET →` behave as described.
- [ ] `+ EXTRA SET` adds a `{n}+` row.
- [ ] `COMPLETE` marks the card `DONE` and the reopened modal shows `COMPLETED` with set/volume/RPE summary.
- [ ] Completed state persists across reload.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) to Supabase or the app.

## Screenshots required
- Train tab initial load (before START SESSION)
- Hero with the elapsed timer running
- Exercise dialog with plate calculator open
- Rest timer counting, and at `GO!`
- `Complete Exercise?` confirm
- Final state: `{LIFT}` card `DONE`, FinishArea, CTA `FINISH SESSION · 1/{T}`

## Pass criteria
All TCs above pass AND no unexpected console/network errors. If Supabase is not configured, every TC is BLOCKED, not FAILED.
