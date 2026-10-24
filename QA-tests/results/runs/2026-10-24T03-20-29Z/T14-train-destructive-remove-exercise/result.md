# T14-train-destructive-remove-exercise: Destructive — REMOVE an exercise from today's training day — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T14-train-destructive-remove-exercise.md |
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
Not executed. The task requires auth as role `test-user` (`Requires auth: yes`), but `settings.credentialsByRole["test-user"]` is `resolved: false`: the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, a protected task is never run without a credential. Separately, the task precondition requires `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, and the dev server is running without Supabase env vars. The task says to mark every TC **BLOCKED (needs Supabase)** in that case. The task is destructive (it removes exercises from the training-day template) and must only run against a throwaway account. No browser session was started, nothing was clicked, and no data was changed.

## Test Case Results

### TC-01: Happy path — remove {EX_A} via the ⋯ menu — BLOCKED
- Blocked: no `test-user` credential (QA_CRED_TEST_USER_PASSWORD unset) and no Supabase backend configured.

### TC-02: Form validation — n/a — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| n/a | n/a | n/a | not run | BLOCKED |

### TC-03: Modal coverage — confirm-remove-exercise — BLOCKED
- Blocked: the cancel, Escape, backdrop, inside-click and tab-bar-behind-overlay checks need an authenticated train tab with seeded exercises.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| REMOVE (menuitem) | click | Remove {name}? alertdialog | not run | BLOCKED |
| DELETE (swipe action) | swipe + click | Remove {EX_B}? alertdialog | not run | BLOCKED |
| CANCEL | click | No state change | not run | BLOCKED |
| Escape | press | No state change | not run | BLOCKED |
| backdrop | click | No state change | not run | BLOCKED |
| REMOVE (confirm) | click | Card removed; persists after reload | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Remove the last exercise / 0-count / NaN% check: BLOCKED
- Focus trap on the REMOVE confirm: BLOCKED
- A DONE exercise cannot be removed: BLOCKED
- Past week view has no ⋯ button or swipe actions: BLOCKED
- Offline removal persistence: BLOCKED

## Screenshots

No screenshots captured. The task was blocked before the browser was launched.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` has no resolved credential. `QA_CRED_TEST_USER_PASSWORD` is unset, so the login at `/` as `qa.test-user@example.test` cannot be performed.
- DEF-missing-supabase-env: The dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task precondition requires both, so all TCs are BLOCKED (needs Supabase).
