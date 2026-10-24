# T15-train-destructive-finish-session: Destructive — FINISH the session, and the week-12 program-complete modal

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/WorkoutTab.jsx` (`FinishArea`, `FinishConfirmModal`, SessionHero CTA, `isLastSession` → `ProgramCompleteModal` after 2 s), `src/components/ProgramCompleteModal.jsx`, `src/components/TrainTab.jsx` (`SessionHistory`) |
| Flow | FINISH SESSION → `Finish Today's Session?` (shows skipped exercises) → CANCEL / FINISH; on the final week-12 session the program-complete modal follows: CONTINUE SAME PROGRAM or SWITCH PROGRAM → pick a program |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | **yes**: locks today's session (irreversible from this tab) and, in TC-03, may switch the program. Throwaway account only |
| Estimated steps | 34 |

> Verification status: **source-derived (not browser-verified)**.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set; otherwise mark all TCs **BLOCKED (needs Supabase)**.
- Signed in as `test-user`, a **throwaway** account (credentials via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them). **Never run against real user data.**
- Seed A (TC-01, TC-02, TC-04, TC-05): onboarding complete, non-deload `currentWeek` (e.g. 2), today is a training day with `{T}` ≥ 3 exercises, today untouched, and **no prior sessions** in `state.log` so Recent Sessions starts empty. `localStorage.fitquest_onboarding_complete = "true"`.
- Seed B (TC-03 only, separate throwaway account or reseed): `currentWeek = 12` (cycle week 12), `sessionsPerWeek = 3`, `weekProgress[12].count = 2` (two sessions already done this week), today is a training day, today untouched.

## Test data
- `{EX_1}` = first exercise; completed in TC-01 with 1 set checked (any values, e.g. weight `40`, reps `10`, RPE `8`).
- `{SKIPPED}` = the remaining `{T}−1` exercise names, comma-separated in on-screen order.
- `{bonus}` = `max(10, 50 − ({T}−1) × 8)`
- `{SWITCH_TO}` = the first program in the SWITCH PROGRAM list that is **not** marked `(current)`.

## Steps

### TC-01: Happy path — finish a partial session
1. Sign in as `test-user` (Seed A). Navigate to `http://localhost:5173/?tab=train`.
2. Assert: `Recent Sessions` header is visible with the empty state `No sessions logged yet. Your journey starts now.`
3. Assert: no FinishArea and no `FINISH SESSION` button are rendered (0 exercises done).
4. Click `START SESSION`. Open `{EX_1}`, check set 1, `SKIP` the rest timer if shown, `COMPLETE EXERCISE` → `COMPLETE`.
5. Assert: hero CTA `FINISH SESSION · 1/{T}`; FinishArea shows `{round(100/{T})}%`, `1/{T} exercises • +{bonus} bonus XP` and the button `FINISH SESSION` (not `· PERFECT!`).
6. Click the FinishArea **`FINISH SESSION`**.
7. Assert: a confirm with heading `Finish Today's Session?`, text `1/{T} exercises completed`, `This will lock in your session for Week {currentWeek}.` and, on its own paragraph, `Skipped: {SKIPPED}`; buttons `CANCEL` and `FINISH`. The tab bar is hidden.
8. Click **`FINISH`**.
9. Assert: the confirm closes; hero CTA reads `SESSION COMPLETE` and is `disabled`; the elapsed timer chip is gone; the line `✓ SESSION COMPLETE — GREAT WORK!` is visible; FinishArea is gone.
10. Assert: exercise cards are no longer `role=button` (no `Log sets for …`), there are no `Actions for …` buttons, and clicking a card opens nothing.
11. Assert: `Recent Sessions` now has one row: the session name, `{date} · Wk {currentWeek}`, and a `+{xp}` badge with xp > 0. The empty-state text is gone.
12. Assert: the day dot for today has aria-label `{Today} complete — tap to clear` and shows `✓`; the counter right of the dots reads `{k}/{trainingDays}` (or `WEEK DONE`).
13. Reload. Assert: steps 9-12 still hold.

### TC-02: Form validation — n/a (no inputs). Guard checks instead
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| n/a | n/a | n/a | n/a |

- With 0 exercises done, no finish entry point exists (TC-01 step 3). The hero shows `START SESSION` or `TAP AN EXERCISE TO LOG`.
- With every exercise done (fresh day on a throwaway account), FinishArea shows `100%`, `{T}/{T} exercises • +50 bonus XP`, button `FINISH SESSION · PERFECT!`, and the confirm has **no** `Skipped:` line.

### TC-03: Modal coverage — `finish-confirm` cancel path and `program-complete`
1. (Seed A, new day or reseed) Complete one exercise, open the confirm via the **hero CTA** `FINISH SESSION · 1/{T}`. Click **`CANCEL`**. Assert: the confirm closes; the CTA is still `FINISH SESSION · 1/{T}`; the session is not finished.
2. Reopen the confirm. Press `Escape`, then click the dimmed backdrop. Assert and record: the confirm has **no** Escape handler and **no** backdrop-close in source, so it stays open (accessibility finding). Close with `CANCEL`.
3. (Seed B) Sign in, open the Train tab. Assert: the hero shows `WEEK 12`, the deload banner `DELOAD WEEK — RECOVERY MODE` (week 12 is a deload week), and cards show `+10 XP`.
4. Complete one exercise, click `FINISH SESSION` → `FINISH`.
5. Within 2.5 s assert: a full-screen modal shows a trophy, `CYCLE 1 COMPLETE`, `Week 12 done — {totalSessions} sessions, {perfectWeeks} perfect weeks, {totalXp} XP earned.`, three stat tiles `Lv {level}` / `Level`, `{streak}` / `Streak`, `{vol}k` / `Vol (kg)`, the text `What do you want for the next 12 weeks?`, and buttons `CONTINUE SAME PROGRAM` and `SWITCH PROGRAM`.
6. Click **`SWITCH PROGRAM`**. Assert: `Choose your next program:` and one button per program; exactly one is suffixed `(current)` and highlighted; a `← BACK` button.
7. Click **`← BACK`**. Assert: the two primary buttons return.
8. Click **`CONTINUE SAME PROGRAM`**. Assert: the modal closes. Record the resulting `WEEK {n}` in the hero (WorkoutTab passes no `onContinue`, so this only closes the modal; the week advance comes from `finishSession`).
9. Reseed B. Repeat steps 4-6, then click `{SWITCH_TO}`. Assert: the modal closes and the Train tab now shows `{SWITCH_TO}`'s exercises for the next training day (check the `Next workout:` accordion). Reload; assert the program change persisted.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `FINISH SESSION · 1/{T}` (hero CTA) | click | `Finish Today's Session?` |
| `FINISH SESSION` (FinishArea) | click | `Finish Today's Session?` |
| `FINISH SESSION · PERFECT!` | click (all done) | Confirm without `Skipped:` |
| `CANCEL` (finish confirm) | click → cancel | No state change |
| `FINISH` (finish confirm) | click → confirm proceed | `SESSION COMPLETE`, Recent Sessions row added |
| `SESSION COMPLETE` | click | Disabled; nothing happens |
| `CONTINUE SAME PROGRAM` | click | Modal closes |
| `SWITCH PROGRAM` | click | Program list |
| `{SWITCH_TO}` | click | Program changed; modal closes |
| `← BACK` | click | Back to the two choices |

### TC-05: Negative & edge cases
- Double-click `FINISH` quickly. Assert: exactly one new row in Recent Sessions and XP awarded once.
- Recent Sessions caps at 5 rows: on an account with ≥ 6 logged sessions, assert exactly 5 rows, newest first.
- After finishing, open the AI Coach and back out; assert the `SESSION COMPLETE` state is unchanged.
- Program-complete modal has no close button, no Escape and no backdrop close; the user must choose. Record as an accessibility observation.
- Week 12 but not the last session (`weekProgress[12].count = 0`): finishing must **not** open the program-complete modal (wait 3 s to confirm).

## Assertions
- [ ] Finish entry points appear only after ≥ 1 exercise is done.
- [ ] The confirm lists `{d}/{t} exercises completed`, `This will lock in your session for Week N.` and `Skipped: …` when applicable.
- [ ] CANCEL leaves the session open; FINISH locks it (`SESSION COMPLETE`, cards read-only).
- [ ] Recent Sessions empty state is replaced by the new session row with `· Wk N` and `+XP`.
- [ ] Final week-12 session opens `CYCLE 1 COMPLETE` after ~2 s; CONTINUE and SWITCH paths work.
- [ ] Missing Escape/backdrop handling recorded.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- FinishArea before finishing
- `Finish Today's Session?` confirm with the `Skipped:` line
- Final state: `SESSION COMPLETE`, Recent Sessions row
- `CYCLE 1 COMPLETE` modal and the SWITCH PROGRAM list

## Pass criteria
All TCs above pass AND no unexpected console/network errors. Throwaway accounts only.
