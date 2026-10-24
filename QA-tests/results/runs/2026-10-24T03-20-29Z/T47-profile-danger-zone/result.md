# T47-profile-danger-zone: Danger zone gating — Reset today, Reset all progress, Delete account (cancel paths only) — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T47-profile-danger-zone.md |
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
Every TC is BLOCKED and nothing was executed. The task needs `Requires auth: yes` and `Required role: test-user`, but `credentialsByRole["test-user"]` arrived with `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server at http://localhost:5173 also runs without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." The runner opened no browser session and sent no requests. No destructive control (`CLEAR`, `ERASE EVERYTHING`, `DELETE FOREVER`) was touched, and `POST /api/account-delete` was never reached.

## Test Case Results

### TC-01: Happy path — Danger zone renders and every gate holds — BLOCKED
- Blocked: needs a Supabase backend and a throwaway `test-user` login. The credential is unresolved (`QA_CRED_TEST_USER_PASSWORD` unset) and the Supabase env is absent.

### TC-02: Modal coverage — confirm-reset-today (CANCEL ONLY) — BLOCKED
- Blocked: same reason (needs an authenticated test-user with seeded state).

### TC-03: Modal coverage — confirm-reset-all (CANCEL ONLY) — BLOCKED
- Blocked: same reason.

### TC-04: Form validation — delete-account gate — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| delete-confirm | "" | disabled | not run | BLOCKED |
| delete-confirm | "DELET" | disabled | not run | BLOCKED |
| delete-confirm | "delete" | disabled | not run | BLOCKED |
| delete-confirm | "Delete" | disabled | not run | BLOCKED |
| delete-confirm | " DELETE" | disabled | not run | BLOCKED |
| delete-confirm | "DELETE " | disabled | not run | BLOCKED |
| delete-confirm | "DELETE" | enabled (never clicked) | not run | BLOCKED |

### TC-05: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| Reset today's session | click, then CANCEL / Escape / backdrop | Dialog closes, sets unchanged | not run | BLOCKED |
| CLEAR | not clicked | — | not clicked | n/a |
| Reset all progress | click, then CANCEL / Escape / backdrop | Dialog closes, progress unchanged | not run | BLOCKED |
| ERASE EVERYTHING | not clicked | — | not clicked | n/a |
| Delete account | click | Inline panel, empty input | not run | BLOCKED |
| DELETE FOREVER | not clicked (state only) | Disabled unless "DELETE" | not clicked | BLOCKED |
| CANCEL (delete panel) | click | Panel closes, no request | not run | BLOCKED |

### TC-06: Edge cases — BLOCKED
- Stacked confirm (Reset all progress, then a second confirm reached by keyboard): not run (blocked).
- Observation from the task (not browser-verified): account deletion is the only irreversible action here with no modal confirm. Typed text is its only gate. Carried forward as a UX/safety review item.
- Observation from the task (code-review only): `Danger zone` › `Delete account` renders with no `userEmail`, but the `Account` group is hidden in that case. Not reproduced.

## Screenshots

No screenshots were captured, because no TC could run (BLOCKED before browser launch).

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` is unresolved. `QA_CRED_TEST_USER_PASSWORD` is unset, so no throwaway login is available. The dev server also runs without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so the Supabase-backed flow cannot run.
