# T11-train-log-weighted-exercise-as-test-user: Start a session, log a weighted exercise with rest timer, and complete it — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T11-train-log-weighted-exercise-as-test-user.md |
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
Not executed. The task requires auth as role `test-user`, but the orchestrator resolved that credential with `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the runner contract a protected task is never attempted without a credential. Separately, the task's preconditions require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and the dev server is running without Supabase env vars, so the task's own pass criteria mark every TC BLOCKED (needs Supabase), not FAILED. No browser session was opened, no data was written.

## Test Case Results

### TC-01: Happy path — log and complete {LIFT} — BLOCKED
- Blocked: missing `test-user` credential (`QA_CRED_TEST_USER_PASSWORD` unset) and Supabase not configured on the dev server.

### TC-02: Form validation — exercise-log-weighted — BLOCKED
- Blocked: same reasons as TC-01 (authenticated Train tab cannot be rendered).

### TC-03: Modal coverage — rest-timer, exercise-complete-confirm — BLOCKED
- Blocked: same reasons as TC-01.

### TC-04: Button coverage — BLOCKED
- Blocked: same reasons as TC-01.

### TC-05: Edge cases — BLOCKED
- Blocked: same reasons as TC-01.

## Screenshots

No screenshots captured; the task was blocked before the browser was opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (username `qa.test-user@example.test`, loginUrl `/`) has no password; env var `QA_CRED_TEST_USER_PASSWORD` is unset, so the credential is unresolved.
- DEF-env-supabase-not-configured: dev server at http://localhost:5173 runs without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; the task precondition requires them (environment blocker, not an app defect).
