# QA My App run — 2026-10-24T03-20-29Z

| Field | Value |
|---|---|
| Started (UTC) | 2026-10-24T03:20:29.151Z |
| Finished (UTC) | 2026-10-24T03:26:54.107Z |
| Duration | 00:06:25 |
| Filter | interactive: routes /?tab=train,/?tab=fuel,/?tab=progress,/?tab=profile |
| Tasks executed | 32 |
| Pass | 4 |
| Fail | 0 |
| Blocked | 28 |
| Failed verification | 0 |
| Total screenshots | 60 |
| Console errors | 6 (all deliberate unauthenticated /api probes) |
| Network failures | 6 (same probes) |
| Parallel runners | 8 |
| Browser | chromium / headless=true |

> **Environment:** dev server ran without Supabase env vars and `QA_CRED_TEST_USER_PASSWORD` was unset, so every signed-in (`test-user`) task is BLOCKED by setup, not by the app. The 4 signed-out auth-wall tasks were first dispatched to `qa-test-runner` spawns that had no browser tooling (attempt 1, archived as `result.attempt1-no-browser-tooling.md`) and re-run as attempt 2 via Node Playwright.

## Task results
| Task | Route | Result | Attempts | Duration | Screenshots | Errors | Details |
|---|---|---|---|---|---|---|---|
| T10-train-auth-wall-anonymous | /?tab=train | PASS | 2 | 236s | 15 | 3 | [result](T10-train-auth-wall-anonymous/result.md) — DEF-stale-error-native-validation, DEF-signin-silent-noop-no-supabase, DEF-auth-loading-boot-flash |
| T11-train-log-weighted-exercise-as-test-user | /?tab=train | BLOCKED | 1 | 62s | 0 | 0 | [result](T11-train-log-weighted-exercise-as-test-user/result.md) |
| T12-train-exercise-log-validation | /?tab=train | BLOCKED | 1 | 74s | 0 | 0 | [result](T12-train-exercise-log-validation/result.md) |
| T13-train-add-swap-exercise-as-test-user | /?tab=train | BLOCKED | 1 | 41s | 0 | 0 | [result](T13-train-add-swap-exercise-as-test-user/result.md) |
| T14-train-destructive-remove-exercise | /?tab=train | BLOCKED | 1 | 50s | 0 | 0 | [result](T14-train-destructive-remove-exercise/result.md) |
| T15-train-destructive-finish-session | /?tab=train | BLOCKED | 1 | 80s | 0 | 0 | [result](T15-train-destructive-finish-session/result.md) |
| T16-train-week-nav-missed-day-rest-day | /?tab=train | BLOCKED | 1 | 70s | 0 | 0 | [result](T16-train-week-nav-missed-day-rest-day/result.md) |
| T17-train-ai-coach-modal-as-test-user | /?tab=train | BLOCKED | 1 | 34s | 0 | 0 | [result](T17-train-ai-coach-modal-as-test-user/result.md) |
| T20-fuel-auth-wall-anonymous | /?tab=fuel | PASS | 2 | 192s | 18 | 3 | [result](T20-fuel-auth-wall-anonymous/result.md) — DEF-signin-silent-failure-no-supabase |
| T21-fuel-manual-add-and-log-as-user | /?tab=fuel | BLOCKED | 1 | 74s | 0 | 0 | [result](T21-fuel-manual-add-and-log-as-user/result.md) |
| T22-fuel-manual-add-validation | /?tab=fuel | BLOCKED | 1 | 74s | 0 | 0 | [result](T22-fuel-manual-add-validation/result.md) |
| T23-fuel-photo-scan-and-log-as-user | /?tab=fuel | BLOCKED | 1 | 50s | 0 | 0 | [result](T23-fuel-photo-scan-and-log-as-user/result.md) |
| T24-fuel-photo-upload-validation | /?tab=fuel | BLOCKED | 1 | 49s | 0 | 0 | [result](T24-fuel-photo-upload-validation/result.md) |
| T25-fuel-food-card-editing | /?tab=fuel | BLOCKED | 1 | 75s | 0 | 0 | [result](T25-fuel-food-card-editing/result.md) |
| T26-fuel-destructive-remove-food-and-rescan | /?tab=fuel | BLOCKED | 1 | 70s | 0 | 0 | [result](T26-fuel-destructive-remove-food-and-rescan/result.md) |
| T27-fuel-destructive-delete-meal-and-daily-summary | /?tab=fuel | BLOCKED | 1 | 26s | 0 | 0 | [result](T27-fuel-destructive-delete-meal-and-daily-summary/result.md) |
| T30-progress-auth-wall-anonymous | /?tab=progress | PASS | 2 | 156s | 13 | 0 | [result](T30-progress-auth-wall-anonymous/result.md) |
| T31-progress-checkin-weight-only-as-test-user | /?tab=progress | BLOCKED | 1 | 74s | 0 | 0 | [result](T31-progress-checkin-weight-only-as-test-user/result.md) |
| T32-progress-checkin-validation | /?tab=progress | BLOCKED | 1 | 65s | 0 | 0 | [result](T32-progress-checkin-validation/result.md) |
| T33-progress-checkin-waist-defect | /?tab=progress | BLOCKED | 1 | 41s | 0 | 0 | [result](T33-progress-checkin-waist-defect/result.md) |
| T34-progress-checkin-overwrite | /?tab=progress | BLOCKED | 1 | 45s | 0 | 0 | [result](T34-progress-checkin-overwrite/result.md) |
| T35-progress-weekly-summary-navigation | /?tab=progress | BLOCKED | 1 | 74s | 0 | 0 | [result](T35-progress-weekly-summary-navigation/result.md) |
| T36-progress-weekly-success-checklist | /?tab=progress | BLOCKED | 1 | 36s | 0 | 0 | [result](T36-progress-weekly-success-checklist/result.md) |
| T37-progress-body-metrics-stats-trends | /?tab=progress | BLOCKED | 1 | 22s | 0 | 0 | [result](T37-progress-body-metrics-stats-trends/result.md) |
| T40-profile-auth-wall-anonymous | /?tab=profile | PASS | 2 | 151s | 14 | 0 | [result](T40-profile-auth-wall-anonymous/result.md) — DEF-stale-login-error-native-validation |
| T41-profile-render-deeplink | /?tab=profile | BLOCKED | 1 | 74s | 0 | 0 | [result](T41-profile-render-deeplink/result.md) |
| T42-profile-change-password | /?tab=profile | BLOCKED | 1 | 70s | 0 | 0 | [result](T42-profile-change-password/result.md) |
| T43-profile-preferences-nutrition | /?tab=profile | BLOCKED | 1 | 41s | 0 | 0 | [result](T43-profile-preferences-nutrition/result.md) |
| T44-profile-backfill-past-weeks | /?tab=profile | BLOCKED | 1 | 37s | 0 | 0 | [result](T44-profile-backfill-past-weeks/result.md) |
| T45-profile-program-editor | /?tab=profile | BLOCKED | 1 | 55s | 0 | 0 | [result](T45-profile-program-editor/result.md) |
| T46-profile-backup-export-import | /?tab=profile | BLOCKED | 1 | 24s | 0 | 0 | [result](T46-profile-backup-export-import/result.md) |
| T47-profile-danger-zone | /?tab=profile | BLOCKED | 1 | 34s | 0 | 0 | [result](T47-profile-danger-zone/result.md) |

## Defects Found

**App defects (observed in a real browser):**
- DEF-stale-error-native-validation — login error text persists after native email validation blocks the next submit (T10; also reported as DEF-stale-login-error-native-validation in T40)
- DEF-signin-silent-noop-no-supabase — with Supabase unconfigured, valid sign-in / reset submissions give no feedback (T10; also DEF-signin-silent-failure-no-supabase in T20)
- DEF-auth-loading-boot-flash — boot screen sometimes flashes before the login wall because useAuth initialises loading=true even when supabase is null (T10)

**Environment / setup (not app bugs):**
- DEF-missing-credential-test-user — QA_CRED_TEST_USER_PASSWORD unset (28 tasks)
- Supabase env not configured — reported under several ids (DEF-env-missing-supabase, DEF-env-supabase-unconfigured, DEF-missing-supabase-env, DEF-env-no-supabase, DEF-env-supabase-not-configured)
- DEF-env-no-browser-tools — qa-test-runner spawns had no browser tooling (T26 noted it; affected all qa-test-runner spawns in this session)

## Verification failures
- None. All 32 result.md files passed verify-result.mjs.
- T10, T20, T30, T40 attempt 1: valid but BLOCKED only by missing runner browser tooling; re-dispatched (attempt 2) and PASSED.
