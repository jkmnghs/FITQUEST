# T41-profile-render-deeplink: Signed-in deep link opens the Profile tab and renders every section — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T41-profile-render-deeplink.md |
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
Every TC is BLOCKED and none was executed. The task requires the `test-user` role (`Requires auth: yes`), but the orchestrator resolved that role with `resolved: false` because `QA_CRED_TEST_USER_PASSWORD` is unset. The execution contract says not to guess a credential. The dev server is also running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's own Preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." Both conditions apply. No browser session was opened, so there are no screenshots, console logs or network logs.

## Test Case Results

### TC-01: Happy path — deep link lands on Profile with all four sections — BLOCKED
- Reason: Needs the Supabase backend and the throwaway `test-user` account. The credential is unresolved (`QA_CRED_TEST_USER_PASSWORD` unset) and no Supabase env is set on the dev server.

### TC-02: Tab navigation and deep-link fallback — BLOCKED
- Reason: Same as TC-01. Nobody can sign in, so the Profile and Train tabs behind the login wall can't be reached.

### TC-03: Notifications row — BLOCKED
- Reason: Same as TC-01. The Settings > Notifications group only renders for a signed-in user.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| CLAIM CYCLE REWARD | conditional click / absence check | Card shown only on week 12 of a cycle | Not run | BLOCKED |
| CHANGE PASSWORD | click | Inline panel opens, label becomes CANCEL | Not run | BLOCKED |
| SIGN OUT | click | LoginScreen renders; logout returns 2xx/204 | Not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Back after SIGN OUT: BLOCKED (sign-in never happened)
- `/?tab=profile` after SIGN OUT: BLOCKED (sign-in never happened)
- Slow 3G reload of `/?tab=profile`: BLOCKED (needs a signed-in session)

## Screenshots

No screenshots were captured. Every TC was BLOCKED before a browser session started.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: Role `test-user` (shared-credentials, username `qa.test-user@example.test`, loginUrl `/`) is unresolved because env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server also has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. To fix: set both Supabase env vars, restart the dev server, export the throwaway account's password as `QA_CRED_TEST_USER_PASSWORD`, then re-run.
