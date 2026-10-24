# T45-profile-program-editor: Edit the weekly program in My Program — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T45-profile-program-editor.md |
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
The task needs `Requires auth: yes` with `Required role: test-user`. The orchestrator resolved the `test-user` credential as `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server is also running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." The runner did not guess a credential. It did not open the browser or run any TC, so it took no screenshots and changed no data.

## Test Case Results

### TC-01: Happy path — add, edit, reorder and save — BLOCKED
- Blocked: no credential for `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset) and no Supabase backend env.

### TC-02: Form validation — program-editor-day — BLOCKED
- Blocked: same reason. Bug candidates (minutes 500, sets 11, repMax < repMin, negative weight) were not verified.

### TC-03: Modal coverage — confirm-clear-day — BLOCKED
- Blocked: same reason.

### TC-04: Button coverage — BLOCKED
- Blocked: same reason.

### TC-05: Edge cases — BLOCKED
- Blocked: same reason.

### TC-06: Restore — BLOCKED
- Blocked: same reason. Nothing was changed, so there is nothing to restore.

## Screenshots

No screenshots were taken because the browser was not opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: The `test-user` role's credential is unresolved because env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server also has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Set both, using a disposable Supabase test account, to unblock this task.
