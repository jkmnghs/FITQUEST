# T24-fuel-photo-upload-validation: HEIC rejection and meal-analysis error paths — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T24-fuel-photo-upload-validation.md |
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
Not executed. The task requires auth (`Requires auth: yes`, `Required role: test-user`). The resolved credential for `test-user` is marked `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Per the execution contract, a protected task is never run without a credential. Separately, the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, which the task's Preconditions also require, so sign-in could not succeed even with a password. No browser session was opened and no requests were made.

## Test Case Results

### TC-01: Happy path: a rejected HEIC is followed by a valid JPEG that analyzes successfully — BLOCKED
- Blocked: no credential for role `test-user` (QA_CRED_TEST_USER_PASSWORD unset); Supabase env vars absent on the dev server.

### TC-02: Form validation — camera-file-input, gallery-file-input — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| camera-file-input | meal.heic / image/heic | HEIC_MSG | not run | BLOCKED |
| camera-file-input | photo.HEIF / image/jpeg | HEIC_MSG | not run | BLOCKED |
| camera-file-input | meal.jpg / image/heif | HEIC_MSG | not run | BLOCKED |
| gallery-file-input | meal.heic / image/heic | HEIC_MSG | not run | BLOCKED |
| gallery-file-input | photo.HEIF / image/jpeg | HEIC_MSG | not run | BLOCKED |
| gallery-file-input | meal.jpg / image/heif | HEIC_MSG | not run | BLOCKED |
| gallery-file-input | IMG_0001.heic.jpg / image/jpeg | accepted, preview | not run | BLOCKED |
| gallery-file-input | notes.txt / text/plain | silent no-op | not run | BLOCKED |

### TC-03: Modal coverage — error banner lifecycle — BLOCKED
- Blocked: same reason as TC-01.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| ANALYZE MEAL + V-500 | click | API error 500 | not run | BLOCKED |
| ANALYZE MEAL + V-429 | click | API error 429 | not run | BLOCKED |
| ANALYZE MEAL + V-502 | click | API error 502 | not run | BLOCKED |
| ANALYZE MEAL + V-ABORT | click | Failed to fetch | not run | BLOCKED |
| ANALYZE MEAL + V-PROSE | click | Could not parse response. Try again. | not run | BLOCKED |
| ANALYZE MEAL + V-EMPTY | click | No food items detected. Try a clearer photo. | not run | BLOCKED |
| ANALYZE MEAL + V-OBJECT | click | No food items detected. Try a clearer photo. | not run | BLOCKED |
| ANALYZE MEAL + V-GARBAGE | click | Unknown food card, 100g · 0 kcal | not run | BLOCKED |
| ✕ | click | panel cleared | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- HEIC while a preview exists: not run (BLOCKED).
- Double-click ANALYZE: not run (BLOCKED).
- Thinking block first: not run (BLOCKED).
- Not signed in (session cleared): not run (BLOCKED).

## Screenshots

No screenshots captured. The task was blocked before the browser was opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (username qa.test-user@example.test, loginUrl `/`) has no password because env var `QA_CRED_TEST_USER_PASSWORD` is unset. Set it, and start the dev server with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, then re-run.
