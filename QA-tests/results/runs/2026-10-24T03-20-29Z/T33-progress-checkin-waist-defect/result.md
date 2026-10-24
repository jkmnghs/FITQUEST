# T33-progress-checkin-waist-defect: Check-in with a waist value saves and validates — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T33-progress-checkin-waist-defect.md |
| Route | /?tab=progress |
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
The task needs auth (`Requires auth: yes`, `Required role: test-user`). The resolved credential for `test-user` came back with `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is not set. The execution contract does not allow running a protected task with a guessed credential, so no test case was run. Two more blockers apply on their own: the dev server is running without Supabase env vars, which the task's preconditions require (for the Supabase sign-in, the seeded onboarding state and the cloudSet upsert assertion), and this spawn had no browser MCP tools. The task's documented known defect (`CheckinTab.jsx:45` calls `getHeightCm` without importing it) was not exercised in the browser in this run.

## Test Case Results

### TC-01: Happy path: save weight + waist + sleep — BLOCKED
- Not run: there is no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` is unset), and Supabase is not configured on the dev server.

### TC-02: Form validation — waist range — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| waist | empty | no error (saves) | not run | BLOCKED |
| waist | 32 | "Enter 55–250 cm, or leave blank. Measure in centimetres around your navel — not inches or pant size." | not run | BLOCKED |
| waist | 251 | same message | not run | BLOCKED |
| waist | 55 (boundary) | saves | not run | BLOCKED |
| waist | 250 (boundary) | saves | not run | BLOCKED |

### TC-03: Modal coverage — n/a
- The task lists no modals.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| SAVE CHECK-IN (+25 XP) | click with Waist 86 | CHECK-IN SAVED! +25 XP, no console error | not run | BLOCKED |
| SAVE CHECK-IN (+25 XP) | click with Waist 32 | range error text, no console error | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Update path with existing waist (UPDATE → overwrite warning): not run.
- Weight 600 + Waist 86 → weight error takes precedence: not run.
- Waist -5 → "Enter a valid waist measurement": not run.

## Screenshots

No screenshots were captured, because the task was blocked before the browser was opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` has no usable credential. `QA_CRED_TEST_USER_PASSWORD` is unset, so the `credentialsByRole.test-user` entry has `resolved: false`. Also, the dev server has no Supabase env vars configured, which this task's preconditions require.
- Known product defect, documented by the task and not verified in this run: "CheckinTab.jsx:45 `getHeightCm` not imported; any waist > 0 makes check-in unsaveable".
