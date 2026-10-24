# T12-train-exercise-log-validation: Exercise modal input rules, plank stopwatch, and close/reopen persistence — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T12-train-exercise-log-validation.md |
| Route | /?tab=train |
| Date (UTC) | 2026-10-24T03:20:29Z |
| Run id | 2026-10-24T03-20-29Z |
| Duration (s) | 5 |
| Role | test-user |
| Browser engine | playwright |
| Browser channel | chromium |
| Headless | true |
| Screenshots | 0 |
| Console errors | 0 |
| Network failures | 0 |

## Summary
The run was blocked before the browser opened. Two separate preconditions were not met. (1) The task requires `Required role: test-user`, and that role's credential has `resolved: false`: the env var `QA_CRED_TEST_USER_PASSWORD` is not set. The runner contract does not allow running a protected task without a credential. (2) The dev server at http://localhost:5173 is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say to mark every TC **BLOCKED (needs Supabase)** in that case. Nothing was submitted and no data was written.

## Test Case Results

### TC-01: Happy path — log a plank with the stopwatch — BLOCKED
- Not executed. Blocked by missing `test-user` credential (`QA_CRED_TEST_USER_PASSWORD` unset) and missing Supabase env vars.

### TC-02: Form validation — exercise-log-weighted / exercise-log-plank — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| weight (KG) | empty / -5 / 1500 | stored 0 / 0 / 1000 | not run | BLOCKED |
| reps (REPS) | empty / -3 / 7.5 / 150 | stored 0 / 0 / 7.5 / 100 | not run | BLOCKED |
| RPE (select) | `-` | stored 0 | not run | BLOCKED |
| SECONDS (plank) | empty / -10 / 99999 | stored 0 / 0 / 99999 | not run | BLOCKED |
| weight (lbs user) | 135 / 2300 lbs | ~61.2 kg / 1000 kg | not run | BLOCKED |

### TC-03: Modal coverage — exercise dialog close paths and persistence — BLOCKED
- Not executed. Same blockers as TC-01.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| ▶ (plank) | click | Live {n}s counter starts | not run | BLOCKED |
| {n}s (plank) | click | Stops; SECONDS = elapsed | not run | BLOCKED |
| Close | click | Dialog closes; sets kept | not run | BLOCKED |
| Escape key | press | Dialog closes; sets kept | not run | BLOCKED |
| backdrop | click | Dialog closes; sets kept | not run | BLOCKED |
| COMPLETE EXERCISE | click with 1 of N checked | Confirm with Heads up | not run | BLOCKED |
| CANCEL (confirm) | click | Confirm closes; nothing saved | not run | BLOCKED |
| COMPLETE (confirm) | click | Saved with clamped values | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Escape inside the confirm: not run (BLOCKED).
- Escape during the rest timer: not run (BLOCKED).
- Double complete: not run (BLOCKED).
- Completed exercise is read-only: not run (BLOCKED).
- Many extra sets: not run (BLOCKED).
- Mobile viewport 375x812: not run (BLOCKED).

## Screenshots

No screenshots were captured because the task was blocked before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (loginUrl `/`, username `qa.test-user@example.test`) cannot sign in because env var `QA_CRED_TEST_USER_PASSWORD` is unset (`resolved: false` in credentialsByRole).
- DEF-env-missing-supabase: the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so the task's Preconditions require every TC to be BLOCKED (needs Supabase).
