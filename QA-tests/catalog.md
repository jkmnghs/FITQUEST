# QA Catalog — FitQuest

Generated 2026-10-24T03:17:40.262Z · framework `vite-react` · dev URL http://localhost:5173 · 40 tasks across 5 routes.

> Analysis ran without Supabase configured. Login-wall behaviour is browser-verified; signed-in tab content is source-derived. Tasks needing `test-user` are BLOCKED until Supabase env vars and `QA_CRED_TEST_USER_PASSWORD` are set.

| Path | Auth | Roles | Tasks |
|---|---|---|---|
| `/` ([analysis](routes/root.md)) | public | anonymous | 8 |
| `/?tab=train` ([analysis](routes/tab-train.md)) | required | test-user | 8 |
| `/?tab=fuel` ([analysis](routes/tab-fuel.md)) | required | test-user | 8 |
| `/?tab=progress` ([analysis](routes/tab-progress.md)) | required | test-user | 8 |
| `/?tab=profile` ([analysis](routes/tab-profile.md)) | required | test-user | 8 |

## `/` — src/App.jsx

- [T01](tasks/T01-login-signin.md) — Sign in with email and password
- [T02](tasks/T02-login-signin-validation.md) — Form validation — signin-form
- [T03](tasks/T03-login-signup.md) — Create an account
- [T04](tasks/T04-login-signup-validation.md) — Form validation — signup-form
- [T05](tasks/T05-login-forgot-password.md) — Forgot password — send reset link
- [T06](tasks/T06-login-signup-resend.md) — Resend the confirmation email from the signup-done panel
- [T07](tasks/T07-login-mode-navigation.md) — Mode navigation, state carry-over, a11y and responsive
- [T08](tasks/T08-login-set-password.md) — Password recovery — SetPasswordScreen

## `/?tab=train` — src/components/TrainTab.jsx

- [T10](tasks/T10-train-auth-wall-anonymous.md) — Anonymous deep link to the Train tab shows the login wall
- [T11](tasks/T11-train-log-weighted-exercise-as-test-user.md) — Start a session, log a weighted exercise with rest timer, and complete it
- [T12](tasks/T12-train-exercise-log-validation.md) — Exercise modal input rules, plank stopwatch, and close/reopen persistence
- [T13](tasks/T13-train-add-swap-exercise-as-test-user.md) — Add and swap exercises through the exercise picker
- [T14](tasks/T14-train-destructive-remove-exercise.md) — Destructive — REMOVE an exercise from today's training day
- [T15](tasks/T15-train-destructive-finish-session.md) — Destructive — FINISH the session, and the week-12 program-complete modal
- [T16](tasks/T16-train-week-nav-missed-day-rest-day.md) — Week navigation, missed-day resolution (incl. CLEAR THIS DAY), rest-day override and Next workout preview
- [T17](tasks/T17-train-ai-coach-modal-as-test-user.md) — AI Coach modal — modes, send, cooldown, Program Builder save, inbox, copy, clear

## `/?tab=fuel` — src/components/NutritionTab.jsx

- [T20](tasks/T20-fuel-auth-wall-anonymous.md) — Anonymous deep link to Fuel tab shows the login wall
- [T21](tasks/T21-fuel-manual-add-and-log-as-user.md) — Add a food by text and log the meal
- [T22](tasks/T22-fuel-manual-add-validation.md) — Form validation and error paths for `manual-add-food`
- [T23](tasks/T23-fuel-photo-scan-and-log-as-user.md) — Scan or upload a meal photo, adjust the portion, add a missing item, and log
- [T24](tasks/T24-fuel-photo-upload-validation.md) — HEIC rejection and meal-analysis error paths
- [T25](tasks/T25-fuel-food-card-editing.md) — Edit grams and macros inline, switch S/M/L portions
- [T26](tasks/T26-fuel-destructive-remove-food-and-rescan.md) — Destructive: ⋯ > Delete, swipe-to-remove, RE-SCAN and ✕ on unsaved foods
- [T27](tasks/T27-fuel-destructive-delete-meal-and-daily-summary.md) — Destructive: delete a logged meal from TODAY'S MEALS; daily summary over-goal state

## `/?tab=progress` — src/components/ProgressTab.jsx

- [T30](tasks/T30-progress-auth-wall-anonymous.md) — Anonymous visit to /?tab=progress renders the login wall in place
- [T31](tasks/T31-progress-checkin-weight-only-as-test-user.md) — Save a first weekly check-in (weight + sleep, no waist)
- [T32](tasks/T32-progress-checkin-validation.md) — Form validation for `weekly-checkin` (weight, sleep, negative waist)
- [T33](tasks/T33-progress-checkin-waist-defect.md) — Check-in with a waist value saves and validates (exposes the getHeightCm ReferenceError)
- [T34](tasks/T34-progress-checkin-overwrite.md) — Re-submit this week's check-in (UPDATE → overwrite warning → OVERWRITE)
- [T35](tasks/T35-progress-weekly-summary-navigation.md) — Browse past weeks in the Weekly Summary (‹ / ›)
- [T36](tasks/T36-progress-weekly-success-checklist.md) — Toggle the Weekly Success Checklist and reach PERFECT WEEK!
- [T37](tasks/T37-progress-body-metrics-stats-trends.md) — Body Metrics cards, BMI scale and Stats & Trends (data and empty states)

## `/?tab=profile` — src/components/ProfileTab.jsx

- [T40](tasks/T40-profile-auth-wall-anonymous.md) — Anonymous visit to the Profile deep link shows the login wall
- [T41](tasks/T41-profile-render-deeplink.md) — Signed-in deep link opens the Profile tab and renders every section
- [T42](tasks/T42-profile-change-password.md) — Change password from the Account panel
- [T43](tasks/T43-profile-preferences-nutrition.md) — Edit Preferences and Nutrition goals (auto-save)
- [T44](tasks/T44-profile-backfill-past-weeks.md) — Backfill a past training week
- [T45](tasks/T45-profile-program-editor.md) — Edit the weekly program in My Program
- [T46](tasks/T46-profile-backup-export-import.md) — Export, Import (cancel-only), Resync and Snapshot backup
- [T47](tasks/T47-profile-danger-zone.md) — Danger zone gating — Reset today, Reset all progress, Delete account (cancel paths only)
