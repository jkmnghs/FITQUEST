# T35-progress-weekly-summary-navigation: Browse past weeks in the Weekly Summary (‹ / ›) — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T35-progress-weekly-summary-navigation.md |
| Route | /?tab=progress |
| Date (UTC) | 2026-10-24T03:20:29Z |
| Run id | 2026-10-24T03-20-29Z |
| Duration (s) | 0 |
| Role | test-user |
| Browser engine | playwright |
| Browser channel | chromium |
| Headless | true |
| Screenshots | 0 |
| Console errors | 0 |
| Network failures | 0 |

## Summary
BLOCKED before any browser interaction. The task requires auth (`Requires auth: yes`, `Required role: test-user`), but the orchestrator's resolved credential for `test-user` has `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, no credential was guessed and no protected TC was run. Additionally, the dev server is running without Supabase env vars, so the precondition "App running with Supabase env vars configured" and the seeded fixture state (currentWeek=3, weekProgress, weeklyCheckins, log XP, overloadSuggestions) are not met even if a password were provided.

## Test Case Results

### TC-01: Happy path: step back to Week 2 and read its recap — BLOCKED
- Not executed: no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset); Supabase not configured on the dev server, so the seed cannot be loaded.

### TC-02: Form validation — n/a — BLOCKED
- Task declares n/a (no inputs). Not executed because the run is blocked at login.

### TC-03: Modal coverage — n/a — BLOCKED
- Task declares n/a (no modals). Not executed because the run is blocked at login.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| ‹ | click at WEEK 2 | WEEK 1, Weight Change —, `Check-in: 81 kg` | not run | BLOCKED |
| ‹ | click again at WEEK 1 | stays WEEK 1 | not run | BLOCKED |
| › | click x2 from WEEK 1 | WEEK 3 | not run | BLOCKED |
| › | click again at WEEK 3 | stays WEEK 3 | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Accessibility gap (bare `‹` / `›` accessible names): not run in browser.
- Week with no weekProgress (WEEK 1 shows 0/3, 0%, no SESSION BREAKDOWN): not run.
- Save a week-3 check-in then return to WEEK 3 (Weight Change diff with sign and unit): not run.

## Screenshots

No screenshots captured — the run was blocked before navigation.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` (username `qa.test-user@example.test`, loginUrl `/`) has no resolved password — env var `QA_CRED_TEST_USER_PASSWORD` is unset. Set it (and configure the dev server's Supabase env vars plus the T35 seed) to unblock this task.
