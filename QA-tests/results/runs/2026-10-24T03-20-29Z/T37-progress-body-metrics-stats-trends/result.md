# T37-progress-body-metrics-stats-trends: Body Metrics cards, BMI scale and Stats & Trends (data and empty states) — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T37-progress-body-metrics-stats-trends.md |
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
The task requires `Requires auth: yes` with `Required role: test-user`. The orchestrator resolved the `test-user` credential as `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, no credential was guessed and no protected TC was run. In addition, the dev server is running with no Supabase env vars, so the task's precondition ("App running ... with Supabase env vars configured") and the Seed A / Seed B fixtures could not be met even with a password. All TCs are BLOCKED.

## Test Case Results

### TC-01: Happy path (Seed A): read every metric — BLOCKED
- Not executed: no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset); Supabase not configured, so Seed A cannot be loaded.

### TC-02: Form validation — n/a — BLOCKED
- Task marks this n/a (read-only section). Not executed because the task as a whole is blocked on auth.

### TC-03: Modal coverage — n/a — BLOCKED
- Task marks this n/a (no modals). Not executed because the task as a whole is blocked on auth.

### TC-04: Button coverage — n/a — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| (none) | n/a | n/a | not executed | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Seed B (empty): BLOCKED (no credential / no Supabase seed).
- Stale copy "More → Check-in": BLOCKED in-browser (source-derived claim not verified in this run).
- One check-in: BLOCKED.
- Unit mixing (lbs user): BLOCKED.
- Duplicate `Week {N} Check-in` heading: BLOCKED.

## Screenshots

> No screenshots were captured; the run was blocked before navigation.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` has no resolved credential — env var `QA_CRED_TEST_USER_PASSWORD` is unset (auth.local.json entry, loginUrl `/`, username `qa.test-user@example.test`). Additionally the dev server has no Supabase env vars, so the Seed A/Seed B preconditions cannot be satisfied.
