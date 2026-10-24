# T23-fuel-photo-scan-and-log-as-user: Scan or upload a meal photo, adjust the portion, add a missing item, and log — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T23-fuel-photo-scan-and-log-as-user.md |
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
The run was blocked before the browser opened. The task needs auth (`Requires auth: yes`, `Required role: test-user`). The orchestrator marked the `test-user` credential as unresolved (`resolved: false`) because `QA_CRED_TEST_USER_PASSWORD` is unset. Under the execution contract, a protected task is never run without a credential, so no TC was executed. Two other preconditions are also unmet. First, the dev server is running without Supabase env vars, but the task needs real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Second, the task needs the fixture `QA-tests/fixtures/meal-2000x1500.jpg`. Either problem alone would block sign-in and meal logging.

## Test Case Results

### TC-01: Happy path: upload from gallery, analyze, set chicken to L, add rice, log — BLOCKED
- Not executed. There is no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset), and there is no Supabase backend.

### TC-02: Form validation — MISSING SOMETHING? spot-check — BLOCKED
- Not executed. This TC needs an authenticated session on `/?tab=fuel` with detected foods.

### TC-03: Modal coverage — camera/gallery file choosers — BLOCKED
- Not executed. This TC needs an authenticated session.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| SCAN MEAL | click → choose photo | preview + ANALYZE MEAL | not run | BLOCKED |
| Upload from gallery | click → choose photo | preview + ANALYZE MEAL | not run | BLOCKED |
| ANALYZE MEAL | click | SCANNING MEAL…, then cards | not run | BLOCKED |
| S on Broccoli | click | 75g · 26 kcal | not run | BLOCKED |
| M on Broccoli | click | 100g · 34 kcal | not run | BLOCKED |
| ADD (MISSING SOMETHING?) | click | third card appended | not run | BLOCKED |
| LOG MEAL | click | toast `Meal logged — 611 kcal ✓` | not run | BLOCKED |
| SCAN ANOTHER | click | panel reset | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Small image not upscaled: not run.
- PNG converted to JPEG: not run.
- Re-select after reset: not run.
- Re-analyze unavailable after detection: not run.
- Live API (optional): not run.

## Screenshots

No screenshots were captured. The run was blocked before the browser was opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: The credential for role `test-user` (username `qa.test-user@example.test`, loginUrl `/`) is unresolved because env var `QA_CRED_TEST_USER_PASSWORD` is unset. Set it, then re-run.
- DEF-env-no-supabase: The dev server at http://localhost:5173 has no Supabase env vars. The task needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` for sign-in and meal persistence. This is an environment precondition, not an app defect.
