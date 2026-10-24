# T25-fuel-food-card-editing: Edit grams and macros inline, switch S/M/L portions — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T25-fuel-food-card-editing.md |
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
This task was not run. It requires auth (`Requires auth: yes`, `Required role: test-user`), and the resolved credential for `test-user` is marked `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The execution contract never runs a protected task without a credential. The dev server is also running without `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which the task's Preconditions require, so sign-in could not succeed even with a password. No browser session was opened and no requests were made.

## Test Case Results

### TC-01: Happy path: correct the grams and a macro, then log the corrected meal — BLOCKED
- Blocked: there is no credential for role `test-user` (QA_CRED_TEST_USER_PASSWORD is unset), and the dev server has no Supabase env vars.

### TC-02: Form validation — food-grams-edit, food-macro-edit — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| grams | `""` | edit discarded, stays E1 | not run | BLOCKED |
| grams | `0` | discarded, stays E1 | not run | BLOCKED |
| grams | `-20` | discarded, stays E1 | not run | BLOCKED |
| grams | `12.7` | truncated to 12 (E2) | not run | BLOCKED |
| grams | `180` + blur | commits (E1) | not run | BLOCKED |
| grams | `99999` | `99999g · 165332 kcal` | not run | BLOCKED |
| protein | `50` | E5 | not run | BLOCKED |
| carbs | `-5` | clamped to 0g (E6) | not run | BLOCKED |
| fat | `7.25` | rounded to 7.3 (E7) | not run | BLOCKED |
| fat | `""` | 0g, kcal recomputed (E8) | not run | BLOCKED |

### TC-03: Modal coverage — inline editor cancel/focus — BLOCKED
- Escape on the Fat editor: not run (BLOCKED).
- Switching from the Protein editor to the gram editor (expected per source: kcal changes from 248 to 235): not run (BLOCKED).
- Escape in the gram editor, then blur: not run (BLOCKED).
- Clicking the same Protein tile again: not run (BLOCKED).

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| S | click on fresh card | E3 | not run | BLOCKED |
| M | click | E0 | not run | BLOCKED |
| L | click on fresh card | E4 | not run | BLOCKED |
| L | click at E5 | E9 | not run | BLOCKED |
| Protein tile | at E9 → 60 | E10 | not run | BLOCKED |
| S | click at E5 | E11 | not run | BLOCKED |
| M | after custom grams | custom cleared, M highlighted | not run | BLOCKED |
| LOG MEAL | at E10 | `Meal logged — 314 kcal ✓`, then cleanup delete | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Mobile swiped-open card blocks editing: not run (BLOCKED).
- Desktop has no swipe: not run (BLOCKED).
- Short swipe does not open: not run (BLOCKED).
- Custom grams then macro edit (`180g · 299 kcal`): not run (BLOCKED).

## Screenshots

No screenshots were captured, because the task was blocked before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (username qa.test-user@example.test, loginUrl `/`) has no password because env var `QA_CRED_TEST_USER_PASSWORD` is unset. To unblock: set it, start the dev server with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, then re-run.
