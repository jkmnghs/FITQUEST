# T46-profile-backup-export-import: Export, Import (cancel-only), Resync and Snapshot backup — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T46-profile-backup-export-import.md |
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
The task needs `Requires auth: yes` with `Required role: test-user`. The orchestrator resolved the `test-user` credential as `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server is also running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." Per the runner contract, no login was attempted and no credential was guessed. No browser actions were taken, so no restore or import was confirmed.

## Test Case Results

### TC-01: Happy path — EXPORT downloads a valid backup and clears the nudge — BLOCKED
- Blocked: no resolved credential for `test-user` and no Supabase backend configured (needs Supabase backend + throwaway user).

### TC-02: Modal coverage — unreadable-file and invalid-backup — BLOCKED
- Blocked: needs an authenticated `test-user` session on `/?tab=profile`.

### TC-03: Modal coverage — confirm-import (cancel paths only) — BLOCKED
- Blocked: needs an authenticated session and the `qa-valid-shape.json` export from TC-01. RESTORE was never clicked.

### TC-04: RESYNC FROM CLOUD — BLOCKED
- Blocked: needs a Supabase backend and an authenticated session.

### TC-05: Modal coverage — BackupCard snapshot (cancel path only) — BLOCKED
- Blocked: needs a Supabase backend (`user_profiles.state_backup`) and an authenticated session.

### TC-06: Negative & edge cases — BLOCKED
- Blocked: needs an authenticated `test-user` session on `/?tab=profile`.

## Screenshots

No screenshots were captured because the run was blocked before navigation.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` has no resolved credential. `QA_CRED_TEST_USER_PASSWORD` is unset, and the dev server has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Set both, then re-run.
