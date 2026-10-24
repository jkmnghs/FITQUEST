# T31-progress-checkin-weight-only-as-test-user: Save a first weekly check-in (weight + sleep, no waist) — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T31-progress-checkin-weight-only-as-test-user.md |
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
The run was blocked before the browser opened. The task needs `Required role: test-user` (`Requires auth: yes`). The orchestrator marked that role's credential as `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The execution contract says not to guess a credential or run a protected task without one, so no test case was run. There is also a second, separate blocker: the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's preconditions need both, for sign-in and for the cloudSet upsert (TC-01 steps 1 and 13). So even with a password, the authenticated flow could not complete against this server.

## Test Case Results

### TC-01: Happy path: save this week's check-in — BLOCKED
- Not run. There is no resolved credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` is unset), and Supabase is not configured on the dev server.

### TC-02: Form validation — BLOCKED
- The task defers this to T32. Nothing was run here.

### TC-03: Modal coverage — BLOCKED
- n/a in the task (the Progress tab has no modals). It also could not be reached without auth.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| `SAVE CHECK-IN (+25 XP)` | click with valid weight/sleep, waist blank | `CHECK-IN SAVED! +25 XP`, +25 XP, persisted | not run (no credential) | BLOCKED |
| App nav `Progress` tab | click from `Train` | Progress panel renders | not run (no credential) | BLOCKED |

### TC-05: Edge cases — BLOCKED
- `/?tab=bogus` while signed in falls back to `Train`: not run, because there is no credential.
- Sleep `"0"` variant: not run, because there is no credential.

## Screenshots

> No screenshots were captured because the task was blocked before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` has `resolved: false`. The env var `QA_CRED_TEST_USER_PASSWORD` is unset, so no password is available for `qa.test-user@example.test` (loginUrl `/`).
- DEF-env-supabase-unconfigured: the dev server at http://localhost:5173 is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's preconditions need both, for sign-in and for cloud persistence. This is an environment blocker, not an app defect.
