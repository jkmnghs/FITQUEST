# T44-profile-backfill-past-weeks: Backfill a past training week — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T44-profile-backfill-past-weeks.md |
| Route | /?tab=profile |
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
Not executed. The task has `Requires auth: yes` and `Required role: test-user`, but the resolved credential for `test-user` is `resolved: false` (env var `QA_CRED_TEST_USER_PASSWORD` is unset). The dev server is also running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." So every TC is BLOCKED. No browser session was started and nothing was submitted.

## Test Case Results

### TC-01: Happy path — log a past week's day — BLOCKED
- The run needs the Supabase backend and a throwaway `test-user` login. Neither is available.

### TC-02: Form validation — backfill-past-weeks — BLOCKED
- Blocked for the same reason. The Backfill accordion is only reachable on the authenticated Profile tab.

### TC-03: BUG CANDIDATE — completion counts sets from a previously selected day — BLOCKED
- Blocked for the same reason. The source-derived bug candidate ("Backfill completion % counts exercises from another day") is still unverified in the browser.

### TC-04: Button coverage — BLOCKED
- Blocked for the same reason.

### TC-05: Negative & edge cases — BLOCKED
- Blocked for the same reason.

## Screenshots

No screenshots were captured because the task was not executed.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: The `test-user` role credential is unresolved because `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server also lacks the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars. Every TC is BLOCKED until a Supabase backend and a disposable test account are provided.
