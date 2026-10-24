# T43-profile-preferences-nutrition: Edit Preferences and Nutrition goals (auto-save) — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T43-profile-preferences-nutrition.md |
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
The task needs the `test-user` role (`Requires auth: yes`). The resolved credential for `test-user` has `resolved: false` because the env var `QA_CRED_TEST_USER_PASSWORD` is unset. The dev server is also running without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The task's Preconditions say: "If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED." The runner contract also says never to run a protected task without a credential. So no TC was executed and no settings were changed, which means no restore was needed.

## Test Case Results

### TC-01: Happy path — edit Preferences and confirm they persist — BLOCKED
- Not executed. Needs a Supabase backend and a throwaway `test-user` credential (`QA_CRED_TEST_USER_PASSWORD` is unset).

### TC-02: Happy path — Nutrition goals — BLOCKED
- Not executed. Same reason as TC-01.

### TC-03: Form validation — preferences / nutrition-goals — BLOCKED
- Not executed. Same reason as TC-01. The negative-calories bug candidate ("Nutrition goals accept negative values") is still unverified in the browser.

### TC-04: Button coverage — BLOCKED
- Not executed. Same reason as TC-01.

### TC-05: Edge cases, then restore — BLOCKED
- Not executed. Same reason as TC-01. No state was changed, so nothing needs restoring.

## Screenshots

No screenshots were captured, because the task was blocked before any browser step ran.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []

## Defects Found
- DEF-missing-credential-test-user: role `test-user` is unresolved. Env var `QA_CRED_TEST_USER_PASSWORD` is unset (login `qa.test-user@example.test`, loginUrl `/`). The dev server also has no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so there is no Supabase backend to sign in against.
