# T15-train-destructive-finish-session: Destructive — FINISH the session, and the week-12 program-complete modal — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T15-train-destructive-finish-session.md |
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
Not executed. The task requires auth as `test-user` (`Requires auth: yes`, `Required role: test-user`), but `settings.credentialsByRole["test-user"]` is `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, a protected task is never run without a credential. Independently, the task's Preconditions require `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, and the dev server is running without Supabase env vars, so every TC is also `BLOCKED (needs Supabase)`. The task is destructive (locks today's session, may switch program) and must only run against a seeded throwaway account (Seed A / Seed B), which cannot exist without a backend. No browser actions were taken.

## Test Case Results

### TC-01: Happy path — finish a partial session — BLOCKED
- Reason: no credential for `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset); no Supabase backend for Seed A.

### TC-02: Form validation — n/a (guard checks) — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| n/a | n/a | n/a | not run | BLOCKED |
- Reason: guard checks need an authenticated session with a seeded training day.

### TC-03: Modal coverage — finish-confirm / program-complete — BLOCKED
- Reason: requires Seed A and Seed B (week 12, `weekProgress[12].count = 2`) on throwaway accounts; no credential and no Supabase.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| All buttons in task table | — | — | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Reason: same as above; all edge cases depend on an authenticated, seeded account.

## Screenshots

No screenshots were captured; the task was blocked before any browser navigation.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` has no resolved credential — env var `QA_CRED_TEST_USER_PASSWORD` is unset (auth.local.json entry `resolved: false`). Set it, and run the dev server with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` against a throwaway Supabase project, to unblock this task.
