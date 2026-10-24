# T21-fuel-manual-add-and-log-as-user: Add a food by text and log the meal — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T21-fuel-manual-add-and-log-as-user.md |
| Route | /?tab=fuel |
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
Not executed. The task has `Requires auth: yes` and `Required role: test-user`. In `settings.credentialsByRole`, `test-user` is `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The contract does not allow guessing a credential, so no login or test case was attempted. The task's preconditions are also unmet in another way: the dev server is running without Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Without them the authenticated Fuel tab cannot render and meals cannot persist through `cloudSet`, so TC-01 steps 1 and 16–17 could not pass even with a password.

## Test Case Results

### TC-01: Happy path: add "grilled chicken breast" by text and log it — BLOCKED
- Blocked: no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset), and no Supabase env for the dev server.

### TC-02: Form validation — manual-add-food — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| addText | empty `""` | ADD disabled, Enter sends no request | not run | BLOCKED |
| addText | whitespace `"   "` | ADD disabled, Enter sends no request | not run | BLOCKED |

### TC-03: Modal coverage — n/a — BLOCKED
- The task says the tab has no dialogs. Nothing to run, and the tab is behind auth anyway.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| ADD | click with `grilled chicken breast` | card added | not run | BLOCKED |
| Enter key | type + Enter | one request, one card | not run | BLOCKED |
| LOG MEAL | click | toast `Meal logged — 248 kcal ✓` | not run | BLOCKED |
| SCAN ANOTHER | click after logging | panel reset | not run | BLOCKED |
| Delete meal | click on this run's row | toast `Meal deleted` | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Enter path (double Enter): not run.
- Append after logging (suspected defect): not run; it stays unverified.
- Mirrored inputs: not run.
- Live API (optional): not run.

## Screenshots

No screenshots were taken. The run stopped at credential resolution, before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (username `qa.test-user@example.test`, loginUrl `/`) has no resolved password because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Also, the dev server runs without the Supabase env vars that the task's preconditions require.
