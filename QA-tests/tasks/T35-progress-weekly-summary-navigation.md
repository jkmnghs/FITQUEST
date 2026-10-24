# T35-progress-weekly-summary-navigation: Browse past weeks in the Weekly Summary (‹ / ›)

| Field | Value |
|---|---|
| Route | `/?tab=progress` |
| Source | `src/components/ProgressTab.jsx` → `SummaryTab` in `src/components/OtherTabs.jsx` (L148-264) |
| Flow | Browse past weeks in the Weekly Summary with ‹ and ›, clamped to the range 1..currentWeek |
| Requires auth | yes |
| Required role | `test-user` |
| Destructive | no |
| Estimated steps | 18 |

> Verification status: source-derived. The ‹/› clamping was harness-verified in an isolated mount.

## Preconditions
- App running at `http://localhost:5173` with Supabase env vars configured.
- Signed in as `test-user`, a signed-in Supabase test user (credentials via `QA-tests/.qa-catalog/auth.local.json`).
- Seed (fixture state for the test user):
  - `currentWeek = 3`, `sessionsPerWeek = 3`, `unit = "kg"`
  - `weekProgress[2] = { count: 3, sessions: [{date:"<any>", completion: 100}, {completion: 90}, {completion: 80}] }` → Avg Completion `90%`
  - `weekProgress[3] = { count: 1, sessions: [{completion: 60}] }`
  - `weeklyCheckins = [{week:1, weight:81.0}, {week:2, weight:80.2}]` (no week-3 check-in)
  - `log` entries with `week: 2` summing to `xp = 150`
  - `overloadSuggestions = { "<exId A>": "increase", "<exId B>": "repeat" }`

## Test data
- `expectedWeek2WeightChange = "-0.8 kg"` (80.2 − 81.0)
- `expectedWeek2Checkin = "Check-in: 80.2 kg"`
- `expectedWeek2XP = "150"`

## Steps

### TC-01: Happy path: step back to Week 2 and read its recap
1. Sign in as `test-user` and navigate to `http://localhost:5173/?tab=progress`.
2. Assert: the selector label reads `WEEK 3` and the card header reads `WEEK 3 RECAP`.
3. Assert: Sessions `1/3`, Avg Completion `60%`, Weight Change `—` (no week-3 check-in), and the highlight `No check-in yet this week`.
4. Assert: `SESSION BREAKDOWN` lists `Session 1` with `60%`.
5. Click **`‹`**.
6. Assert: the label reads `WEEK 2` and the header `WEEK 2 RECAP`.
7. Assert: Sessions `3/3`, Avg Completion `90%`, XP Earned `150`, Weight Change `-0.8 kg`.
8. Assert: highlights include `All 3 sessions completed!`, `Ready to increase: <exId A>`, `Repeat weight: <exId B>` and `Check-in: 80.2 kg`.
9. Assert: `SESSION BREAKDOWN` lists `Session 1` `100%`, `Session 2` `90%`, `Session 3` `80%`.

### TC-02: Form validation
n/a. There are no inputs in this section.

### TC-03: Modal coverage
n/a. No modals.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `‹` | click at WEEK 2 | `WEEK 1`. Weight Change `—` (no week-0 check-in). Highlight `Check-in: 81 kg` (JS renders `81.0` as `81`) |
| `‹` | click again at WEEK 1 | stays `WEEK 1` (clamped at 1) |
| `›` | click ×2 from WEEK 1 | `WEEK 3` |
| `›` | click again at WEEK 3 | stays `WEEK 3` (clamped at currentWeek) |

### TC-05: Negative & edge cases
- **Accessibility gap:** assert the accessible names of the two week buttons. Today they are the bare glyphs `‹` and `›`, with no `aria-label`. Record as an a11y defect: expected names are something like `Previous week` / `Next week`.
- A week with no `weekProgress` entry (e.g. WEEK 1 in this seed) shows Sessions `0/3`, Avg Completion `0%`, and no `SESSION BREAKDOWN` block.
- Save a check-in for week 3 (weight-only, see T31), then return to `WEEK 3`. Assert: Weight Change shows the diff from week 2 with sign and unit (e.g. `+0.3 kg` for 80.5).

## Assertions
- [ ] Initial view is `WEEK {currentWeek}`.
- [ ] `‹` / `›` change the week and clamp at 1 and at currentWeek.
- [ ] Recap numbers (Sessions, Avg Completion, XP Earned, Weight Change) match the seed for each week.
- [ ] Highlight lines match the seed.
- [ ] SESSION BREAKDOWN appears only when sessions exist.
- [ ] Week buttons lack accessible names (recorded a11y gap).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load (WEEK 3 recap)
- WEEK 2 recap
- WEEK 1 (clamped) state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
