# T13-train-add-swap-exercise-as-test-user: Add and swap exercises through the exercise picker — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T13-train-add-swap-exercise-as-test-user.md |
| Route | /?tab=train |
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
Blocked before the browser was opened. The task requires auth as `test-user`, and that role's resolved credential has `resolved: false` because env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, a protected task is never run with a guessed credential. The orchestrator also reports that the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say every TC must be marked **BLOCKED (needs Supabase)** in that case. Both blockers have to be fixed before this task can run.

## Test Case Results

### TC-01: Happy path — add an exercise — BLOCKED
- Not executed: the test-user credential is missing (`QA_CRED_TEST_USER_PASSWORD` unset), and Supabase env vars are not configured.

### TC-02: Form validation — exercise-picker-search — BLOCKED
- Not executed: same reason as TC-01.

### TC-03: Modal coverage — exercise-picker (swap mode) — BLOCKED
- Not executed: same reason as TC-01.

### TC-04: Button coverage — BLOCKED
- Not executed: same reason as TC-01.

### TC-05: Negative & edge cases — BLOCKED
- Not executed: same reason as TC-01.

## Screenshots

No screenshots were captured because the task was blocked before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` has no resolved credential. Env var `QA_CRED_TEST_USER_PASSWORD` (referenced by QA-tests/.qa-catalog/auth.local.json) is unset.
- DEF-missing-supabase-env: The dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's preconditions require every TC to be BLOCKED (needs Supabase).
