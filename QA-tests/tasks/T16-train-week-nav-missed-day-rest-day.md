# T16-train-week-nav-missed-day-rest-day: Week navigation, missed-day resolution (incl. CLEAR THIS DAY), rest-day override and Next workout preview

| Field | Value |
|---|---|
| Route | `/?tab=train` |
| Source | `src/components/WorkoutTab.jsx` (SessionHero week stepper and day dots, 12-week cycle map, `MissedDayModal`, rest-day warning, "Go to current week" span), `src/components/TrainTab.jsx` (`NextWorkoutCard`) |
| Flow | Previous/Next week, `Week n of 12` map, BACK TO WEEK N, Go to current week; tap a red day dot → LOG IT / MARK AS SKIPPED / CANCEL; done day → CLEAR THIS DAY; skipped day → UNDO SKIP; rest day → ASK YOUR COACH or TRAIN ANYWAY → TRAIN / ASK COACH FIRST; Next workout accordion |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | **yes**: `CLEAR THIS DAY` removes a recorded session; `LOG IT` and `MARK AS SKIPPED` write week progress. Throwaway account only |
| Estimated steps | 40 |

> Verification status: **source-derived (not browser-verified)**.

## Preconditions
- App running at `http://localhost:5173` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set; otherwise mark all TCs **BLOCKED (needs Supabase)**.
- Signed in as `test-user`, a **throwaway** account (credentials via `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`; never inline them).
- Seed C (TC-01 to TC-04): onboarding complete; `currentWeek = 3`; `trainingDays = ["mon","wed","fri"]` (or any 3 days); in the **current** week at least two training days earlier than today have passed untrained (red `✗` dots: `{MISS_1}`, `{MISS_2}`) and one earlier day `{DONE_DAY}` is recorded as trained (`✓`). Weeks 1-2 have some progress. Today is a training day. `localStorage.fitquest_onboarding_complete = "true"`.
- Seed D (TC-05 rest-day rows): same account, but run on a weekday **not** in `trainingDays` (or set `trainingDays` to exclude today), with `dayTemplates` holding exercises for the next training day.

## Test data
- `{Day}` = full weekday name (`Monday` … `Sunday`) of the dot under test
- `{MISS_1}` → resolved with `I DID IT — LOG IT`
- `{MISS_2}` → resolved with `MARK AS SKIPPED`, then `UNDO SKIP`
- `{DONE_DAY}` → `CLEAR THIS DAY` (destructive)

## Steps

### TC-01: Happy path — navigate weeks
1. Sign in as `test-user` (Seed C). Navigate to `http://localhost:5173/?tab=train`.
2. Assert: hero shows `WEEK 3` (no ` · VIEWING`) and a phase name; `Next week` (aria-label) is `disabled`; `Previous week` is enabled.
3. Click **`Previous week`**. Assert: `WEEK 2 · VIEWING`; the CTA reads `BACK TO WEEK 3`; under the cards the text `Viewing Week 2 — Go to current week (3)`; cards are not `role=button`; no `Actions for …` buttons; `Next week` is enabled.
4. Click `Previous week` again. Assert: `WEEK 1 · VIEWING` and `Previous week` is `disabled` (opacity 0.3).
5. Click **`Next week`**. Assert: `WEEK 2 · VIEWING`.
6. Click the **`Go to current week (3)`** text. Assert: back to `WEEK 3`. Observation: it is a `<span>` with `onClick`, not a button, so it is not keyboard-focusable (accessibility finding; confirm with Tab).
7. Go to week 1 again, click the CTA **`BACK TO WEEK 3`**. Assert: `WEEK 3`.
8. Click **`Week 3 of 12`**. Assert: `aria-expanded="true"`; 12 buttons labelled `1`…`12` with aria-labels `Week 1`…`Week 12`; `Week 3` has `aria-current="true"`.
9. Click `Week 1`. Assert: hero `WEEK 1 · VIEWING`; `Week 1` now has `aria-current="true"`. Click `Week 3`. Click `Week 3 of 12` again. Assert: `aria-expanded="false"`, map hidden.
10. Click `Week 5` in the map (a future week). Record what happens: the map allows jumping beyond `currentWeek` while `Next week` does not. Note whether the hero shows `WEEK 5 · VIEWING` (candidate defect). Return with `BACK TO WEEK 3`.

### TC-02: Form validation — n/a (no inputs). Day-dot interactivity rules instead
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| n/a | n/a | n/a | n/a |

- An upcoming day dot (aria-label `{Day} upcoming`) is `disabled` and shows a 3-letter label; clicking does nothing.
- The current day's dot pulses and has the action border colour.
- A missed dot shows `✗` with aria-label `{Day} missed — resolve it`; a done dot shows `✓` with `{Day} complete — tap to clear`; a skipped dot reads `{Day} marked as skipped`.

### TC-03: Modal coverage — `missed-day`
1. Click the `{MISS_1}` dot (`{MISS_1} missed — resolve it`).
2. Assert: a `role=dialog` named `{MISS_1}, week 3`, heading `{MISS_1} · Week 3`, text `You didn't train {MISS_1}. Log it now, or mark it skipped so the week can close without crediting a session.`, buttons `I DID IT — LOG IT`, `MARK AS SKIPPED`, `CANCEL`. Tab bar hidden.
3. Click **`CANCEL`**. Assert: closed, dot still `✗`. Reopen; click the backdrop. Assert: closed, no change.
4. Reopen; click **`I DID IT — LOG IT`**. Assert: closed; the `{MISS_1}` dot turns `✓` (`{MISS_1} complete — tap to clear`); the sessions counter right of the dots increments by 1.
5. Click the `{MISS_2}` dot → **`MARK AS SKIPPED`**. Assert: the dot turns neutral (grey) with aria-label `{MISS_2} marked as skipped`; the counter does not credit a session.
6. Click the `{MISS_2}` dot again. Assert: text `This day is marked as skipped. It counts toward closing the week but earns nothing.` and buttons `UNDO SKIP`, `CANCEL`. Click **`UNDO SKIP`**. Assert: the dot is red `✗` again.
7. **Destructive (throwaway only):** click the `{DONE_DAY}` dot. Assert: text `This day is recorded as trained. Clearing it removes the session from the week and returns the day to missed. XP already banked is kept.` and buttons `CLEAR THIS DAY`, `CANCEL`. Click `CANCEL` first: no change. Reopen and click **`CLEAR THIS DAY`**. Assert: the dot becomes red `✗` (`{DONE_DAY} missed — resolve it`); the counter decrements; the header XP total is unchanged. Observation: there is no second confirmation for this destructive action.
8. Past-week backfill: go to `Previous week` (week 2), click a missed dot there. Assert: heading `{Day} · Week 2` and the primary button reads `LOG IT FOR THAT WEEK`. Click it. Assert: the credit lands on week 2 (week 2's dot turns `✓`; week 3's counter is unchanged).
9. Reload. Assert: all changes from steps 4-8 persisted.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Previous week` / `Next week` | click | Viewing week −1 / +1; disabled at 1 / current |
| `Week 3 of 12` | click | Map toggles; `aria-expanded` |
| `Week {n}` | click | Jump to week n; `aria-current` |
| `BACK TO WEEK 3` | click | Current week |
| `Go to current week (3)` (span) | click | Current week |
| `I DID IT — LOG IT` | click | Day credited as trained |
| `LOG IT FOR THAT WEEK` | click | Past-week day credited |
| `MARK AS SKIPPED` | click | Day marked skipped |
| `UNDO SKIP` | click | Back to missed |
| `CLEAR THIS DAY` | click → confirm proceed | Session removed; day missed |
| `CANCEL` (missed-day) | click | No state change |
| `Next workout: {title}` | click ×2 | Accordion opens / closes |

### TC-05: Negative & edge cases — rest day and Next workout preview
1. (Seed D, rest day) Open the Train tab. Assert: eyebrow `RECOVERY`, title `REST DAY`, subtitle `Recovery — next up {NextDay}`, a moon icon in the ring, CTA **`ASK YOUR COACH`**, a quieter `TRAIN ANYWAY →`, and no `＋ ADD EXERCISE`.
2. Click `ASK YOUR COACH`. Assert: the `AI Coach` dialog opens (no message is sent). Close it with `Close AI Coach`.
3. Click **`TRAIN ANYWAY →`**. Assert: a warning with `Rest days are when muscle is built.` and `Training through one usually costs more than it earns, and raises injury risk. Your coach can tell you whether today is an exception.` and buttons `ASK COACH FIRST`, `TRAIN`.
4. Click **`ASK COACH FIRST`**. Assert: the warning hides and the `AI Coach` dialog opens. Close it.
5. Click `TRAIN ANYWAY →` → **`TRAIN`**. Assert: eyebrow `DAILY QUEST`, the CTA `START SESSION`, `＋ ADD EXERCISE` visible, and `TRAIN ANYWAY →` gone. Reload and record whether the override resets (it is component state only, so it is expected to reset to `REST DAY`).
6. Rest-day preview, before pressing TRAIN: assert and record whether the cards are `role=button` and have `Actions for …` menus. Per source they are (`tappable`/`canEdit` do not check the rest day), so a user can log and swap exercises on a rest-day preview without the warning (candidate defect).
7. **Next workout:** assert a button `Next workout: {title}` with a chevron. Click it. Assert: a list of the next training day's exercises, each with `{sets} × {reps}` (plank rows show `{sets} × {duration or 30s}`). Click again. Assert: collapsed. If the next day has no template exercises, assert the button is absent.

## Assertions
- [ ] Previous week disabled at week 1; Next week disabled at the current week; past weeks are read-only with `· VIEWING`.
- [ ] Map buttons set `aria-current`; future-week jump behaviour recorded.
- [ ] Missed-day dialog offers LOG IT / MARK AS SKIPPED / CANCEL; skipped offers UNDO SKIP; done offers CLEAR THIS DAY.
- [ ] Past-week backfill credits the viewed week, not the current one.
- [ ] Rest-day CTA `ASK YOUR COACH`; TRAIN ANYWAY → warning → TRAIN override and ASK COACH FIRST both work.
- [ ] `Go to current week` keyboard inaccessibility and rest-day-preview editability recorded.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Hero on a past week (`· VIEWING`)
- Expanded 12-week map
- Missed-day dialog (each of the three variants)
- Rest-day hero and the overtraining warning
- Next workout accordion open
- Final state after the missed-day actions

## Pass criteria
All TCs above pass AND no unexpected console/network errors. Throwaway account only.
