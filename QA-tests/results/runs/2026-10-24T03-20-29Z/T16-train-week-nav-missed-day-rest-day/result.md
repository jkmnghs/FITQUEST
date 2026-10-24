# T16-train-week-nav-missed-day-rest-day: Week navigation, missed-day resolution, rest-day override and Next workout preview — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T16-train-week-nav-missed-day-rest-day.md |
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
The task requires auth (`Requires auth: yes`, `Required role: test-user`). The resolved credential for `test-user` has `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset, so no login is possible. Separately, the task's preconditions require `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, and the dev server is running without Supabase env vars, which per the task means all TCs are BLOCKED (needs Supabase). Seed C / Seed D account state (currentWeek = 3, missed/done day dots, rest-day setup) also cannot be established without a backend. No browser steps were executed and nothing was submitted; the destructive `CLEAR THIS DAY` path was not touched.

## Test Case Results

### TC-01: Happy path — navigate weeks — BLOCKED
- Blocked: no credential for role `test-user` (QA_CRED_TEST_USER_PASSWORD unset) and no Supabase backend configured.

### TC-02: Form validation — n/a (day-dot interactivity rules) — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| n/a | day-dot rules | upcoming disabled; missed/done/skipped aria-labels | not run | BLOCKED |

### TC-03: Modal coverage — missed-day — BLOCKED
- Blocked: requires signed-in Seed C account with missed/done day dots in week 3.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| All rows in task table | click | per task | not run | BLOCKED |

### TC-05: Edge cases — rest day and Next workout preview — BLOCKED
- Blocked: requires signed-in Seed D account on a rest day.

## Screenshots

No screenshots were captured; the run was blocked before any navigation.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` credential unresolved — env var `QA_CRED_TEST_USER_PASSWORD` is unset (auth.local.json entry has `resolved: false`).
- DEF-env-missing-supabase: Dev server has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; task preconditions mark all TCs BLOCKED (needs Supabase).
