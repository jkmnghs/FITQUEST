# T22-fuel-manual-add-validation: Form validation and error paths for `manual-add-food` — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T22-fuel-manual-add-validation.md |
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
Not executed. The task declares `Requires auth: yes` and `Required role: test-user`. The orchestrator resolved `credentialsByRole["test-user"]` with `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. Under the execution contract a protected task is never run without a credential, so every TC is BLOCKED. Two further blockers would apply even with a credential: the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so sign-in cannot succeed and the precondition is not met. No browser MCP tools (`browser_*`) were available in this spawn either, so the `page.route` network mocks the task depends on could not be installed.

## Test Case Results

### TC-01: Happy path: a padded query is trimmed and submitted — BLOCKED
- Blocked: no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset), and Supabase is not configured on the dev server.

### TC-02: Form validation — manual-add-food — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| addText | empty | ADD disabled, no request | not run | BLOCKED |
| addText | whitespace "   " | ADD disabled, no request | not run | BLOCKED |
| addText | 500 x "a" | one request, card or `API error 400` | not run | BLOCKED |
| addText (M-500) | grilled chicken breast | `API error 500` | not run | BLOCKED |
| addText (M-429) | grilled chicken breast | `API error 429` | not run | BLOCKED |
| addText (M-401) | grilled chicken breast | `API error 401` | not run | BLOCKED |
| addText (M-ABORT) | grilled chicken breast | `Failed to fetch` | not run | BLOCKED |

### TC-03: Modal coverage — n/a — N/A
- The task lists no dialogs in this flow.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| ADD (M-CHICKEN) | grilled chicken breast | REF, 150g · 248 kcal, no /api/usda | not run | BLOCKED |
| ADD (M-THINKING) | grilled chicken breast | REF card, same as above | not run | BLOCKED |
| ADD (M-OATBAR + U-OATBAR) | qa usda oat bar | USDA, 50g · 200 kcal, 5g/30g/7g | not run | BLOCKED |
| ADD (M-OATBAR + default USDA) | qa usda oat bar | AI, 50g · 200 kcal, 5g/30g/7g | not run | BLOCKED |
| ADD (M-PROSE) | mystery stew xyzzy | AI, 100g · 0 kcal, 0g/0g/0g | not run | BLOCKED |
| ADD (M-NEGATIVE) | qa negative macros | AI, QA Negative, 80g · 0 kcal, 0g/10g/2g | not run | BLOCKED |
| RE-SCAN | after each row | card list cleared | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Double submit: BLOCKED (no auth)
- ADD disabled while pending: BLOCKED (no auth)
- Session expired: BLOCKED (no auth)
- Rate limit with the live API: SKIPPED by default per the task, and BLOCKED anyway
- Error scoping: BLOCKED (no auth)

## Screenshots

No screenshots were captured because the run was blocked before the browser was opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` (username `qa.test-user@example.test`, loginUrl `/`) has no password, because env var `QA_CRED_TEST_USER_PASSWORD` is unset. Every TC is blocked.
- DEF-env-supabase-unconfigured: the dev server runs without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so the task's precondition (signed-in session on `/?tab=fuel`) cannot be met even with a credential. This is an environment issue, not an app defect.
