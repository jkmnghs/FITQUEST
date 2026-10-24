# T17-train-ai-coach-modal-as-test-user: AI Coach modal — modes, send, cooldown, Program Builder save, inbox, copy, clear — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T17-train-ai-coach-modal-as-test-user.md |
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
Not executed. The task has `Requires auth: yes` and `Required role: test-user`, but `settings.credentialsByRole["test-user"]` arrived with `resolved: false` (missing env var `QA_CRED_TEST_USER_PASSWORD`). The runner does not guess credentials, so the task is BLOCKED before any browser action. Separately, the task's own preconditions are unmet: the dev server is running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, and the task says to mark every TC **BLOCKED (needs Supabase)** in that case. Send-dependent steps would also need `/api/coach` served with `ANTHROPIC_API_KEY`, which was not checked because no TC could start. No data was created, changed or cleared.

## Test Case Results

### TC-01: Happy path — get a pre-workout pep talk, then a follow-up — BLOCKED
- Blocked: no credential for role `test-user` (`QA_CRED_TEST_USER_PASSWORD` unset), and Supabase env vars are absent (needs Supabase).

### TC-02: Form validation — ai-coach-input — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| userMessage | empty / whitespace | Mode default prompt sent; bubble shows mode label | not run | BLOCKED |
| userMessage | duplicate within 5 s | Silently dropped | not run | BLOCKED |
| Send during cooldown | Enter | Ignored, button disabled | not run | BLOCKED |
| Send while loading | Enter | Ignored, button `Sending` disabled | not run | BLOCKED |

### TC-03: Modal coverage — Program Builder save — BLOCKED
- Blocked: same reasons as TC-01.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| Open AI Coach | click | `AI Coach` dialog; `GET /api/coach` | not run | BLOCKED |
| Coach mode buttons | click | Single `aria-pressed="true"`; card, hint, placeholder, prompts change | not run | BLOCKED |
| COPY FOR AI | click | `COPIED!` for 2 s; clipboard non-empty | not run | BLOCKED |
| INBOX | click | Inbox view / `NO MESSAGES YET`; toggles back | not run | BLOCKED |
| MARK ALL READ | click | Known finding: no-op (handler not passed) | not run | BLOCKED |
| INBOX unread badge | observe | Known finding: never shown | not run | BLOCKED |
| CLEAR | click | History wiped, no confirm | not run | BLOCKED |
| Close AI Coach | click | Dialog closes | not run | BLOCKED |
| backdrop | click | Dialog closes | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Missing API key, weekly quota exhausted, expired session, network offline, XSS safety and tab-bar overlay: none run. All need a signed-in `test-user` session.

## Screenshots

No screenshots were captured. The task was blocked before the browser opened.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: The `test-user` role credential is unresolved because env var `QA_CRED_TEST_USER_PASSWORD` is not set (login `qa.test-user@example.test`, loginUrl `/`). Set it, or supply a storage state for the role, then re-run.
- DEF-env-missing-supabase: The dev server has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task precondition requires them, and without them every TC is BLOCKED (needs Supabase). This is an environment issue, not an app defect.
