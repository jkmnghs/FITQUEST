# T42-profile-change-password: Change password from the Account panel — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T42-profile-change-password.md |
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
Not executed. The task requires role `test-user` (`Requires auth: yes`), but the orchestrator resolved that role's credential with `resolved: false`. The env var `QA_CRED_TEST_USER_PASSWORD` is unset, so there is no `origPassword`. On top of that, the dev server runs without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, and the task's preconditions say to mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED. The contract forbids guessing a credential. TC-01 also changes the account's password and must revert it with `origPassword`, so no TC was attempted and no browser session was opened. The throwaway account's password is unchanged.

## Test Case Results

### TC-01: Happy path — change the password, then change it back — BLOCKED
- Not run. No `test-user` credential (`QA_CRED_TEST_USER_PASSWORD` unset) and no Supabase env, so sign-in, the `PUT /auth/v1/user` call and the revert are all impossible.

### TC-02: Form validation — change-password — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| New password | `abc` / `abcde` (<6) | "New password must be at least 6 characters." | not run | BLOCKED |
| Confirm new password | mismatch | "New passwords do not match." | not run | BLOCKED |
| Current password | wrong / empty | "Current password is incorrect." | not run | BLOCKED |

- The panel sits behind the authenticated Profile tab, so even the client-only length and match checks can't be reached without signing in.

### TC-03: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| CHANGE PASSWORD | click | Panel opens, label becomes CANCEL | not run | BLOCKED |
| CANCEL (toggle) | click after error | Panel closes, message cleared | not run | BLOCKED |
| CANCEL then CHANGE PASSWORD | toggle after typing | Record whether values persist | not run | BLOCKED |
| UPDATE PASSWORD | double-click | Exactly one PUT /auth/v1/user | not run | BLOCKED |

### TC-04: Edge cases — BLOCKED
- New password same as current: not run (needs auth + Supabase).
- Offline submit: not run (needs auth).
- Session still valid after re-verification: not run (needs auth).

## Screenshots

No screenshots were captured, because no TC could be executed.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` has an unresolved credential. Env var `QA_CRED_TEST_USER_PASSWORD` is unset, so the task cannot sign in or know `origPassword`. The dev server also lacks `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Provide a disposable Supabase test account and its env var, plus the Supabase env, then re-run.
