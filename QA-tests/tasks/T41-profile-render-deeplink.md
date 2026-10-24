# T41-profile-render-deeplink: Signed-in deep link opens the Profile tab and renders every section

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/ProfileTab.jsx` (tab routing: `src/App.jsx` `initialTabFromUrl` / `NAV_TABS`; sections: `RankTab.jsx`, `ProgramEditorTab.jsx`, `OtherTabs.jsx` `AchievementsTab` + `SettingsTab`) |
| Flow | After sign-in, deep link ?tab=profile opens the Profile tab; notifications; sign out (source-derived) |
| Requires auth | yes |
| Required role | qa-throwaway |
| Destructive | no |
| Estimated steps | 24 |

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set. Restart the dev server after setting them.
- Sign in as `qa-throwaway`: a **dedicated, disposable** Supabase test account whose data may be changed. The runner resolves the role through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never use a real person's account. No credentials appear in this file.
- The throwaway account has completed onboarding (`state.assessment.completed === true`), so `OnboardingScreen` does not render.
- Set `localStorage.fitquest_onboarding_complete = "true"` before load so the tour overlay does not cover the page. Otherwise, complete the tour first.
- The boot screen (`READY`) stays up for at least 5000 ms (`BOOT_MIN_MS`). Wait it out, or tap it to skip once loading is done.
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: everything below comes from the source and has not been browser-verified, because the analyzer could not sign in. Treat any label mismatch as a finding to report, not a reason to improvise.

## Test data
- `deepLink = "/?tab=profile"`
- `fallbackLink = "/?tab=admin"` (expected to open `train`)
- `caseLink = "/?tab=Profile"` (expected to open `train`, because the whitelist is case-sensitive)
- `throwawayEmail` = the signed-in account's email, resolved at run time (shown in the Account group)

## Steps

### TC-01: Happy path — deep link lands on Profile with all four sections
1. Sign in as `qa-throwaway`.
2. Navigate to `http://localhost:5173/?tab=profile`. Wait for the boot screen to pass.
3. Assert: the Profile nav tab (`role="tab"`, label `Profile`, hint `Rank & settings`) has `aria-selected="true"`, and `Train` has `aria-selected="false"`.
4. Assert: while the lazy chunk loads, `ProfileTabSkeleton` may flash. Then `<h2>` section headings render in this order: `Warrior Rank`, `My Program`, `Achievements`, `Settings` (CSS upper-cases them).
5. Assert: `My Program` shows the hint `Set custom exercises for each training day. The Train tab auto-loads today's session.` and one day-tab button per training day (for example `MON`, `WED`, `FRI`).
6. Assert: `Achievements` shows a counter `<n>/<total> UNLOCKED` and a 3-column grid. Each locked tile shows the text `Locked` and a lock icon. Each unlocked tile shows the achievement name.
7. Assert: `Settings` shows the group headers `Account`, `Preferences`, `Notifications`, `Training data` and `Danger zone`. `Danger zone` is tinted `#ff8a9b`.
8. Assert: the Account group shows `throwawayEmail` and the buttons `SIGN OUT` and `CHANGE PASSWORD`.
9. Reload the page. Assert: Profile is still the active tab, because `?tab=profile` is still in the URL.

### TC-02: Tab navigation and deep-link fallback
1. Click the `Train` nav tab. Assert: `Train` is `aria-selected="true"`, the Profile headings are gone, and the content scrolls to the top.
2. Click the `Profile` nav tab. Assert: the four Profile headings render again.
3. Navigate to `/?tab=admin`. Assert: `Train` is the active tab, and no error boundary (`SOMETHING WENT WRONG`) appears.
4. Navigate to `/?tab=Profile`. Assert: `Train` is the active tab (case-sensitive whitelist).

### TC-03: Notifications row
Pick the branch that matches the browser's `Notification.permission` at start. Record which one ran.
1. Assert: the `Notifications` group shows `Push Notifications` and the description `Scheduled workout day reminders, weekly check-in nudges, overload alerts`.
2. **Permission `default`:** the badge reads `OFF` and the `ENABLE NOTIFICATIONS` button is visible. Grant the permission in the browser context (Playwright `context.grantPermissions(['notifications'])`, or accept the prompt), then click **`ENABLE NOTIFICATIONS`**. Assert: the toast `Notifications enabled! ✓` appears, the badge reads `ENABLED` in green, the button is gone, and `✓ You'll receive workout and check-in reminders` shows.
3. **Permission `denied`:** assert the badge reads `BLOCKED` in red, there is no `ENABLE NOTIFICATIONS` button, and `Notifications blocked. Enable in browser settings.` shows.
4. **Permission `granted`:** assert the badge reads `ENABLED`, with no button and the green confirmation line.

### TC-04: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `CLAIM CYCLE REWARD` | Only when `((currentWeek - 1) % 12) + 1 === 12` (for example week 12 or 24): click | The card `Cycle End Reached!` with `Week <n> is the final week of your current cycle…` is shown above Account, and clicking opens `ProgramCompleteModal`. When it is not week 12 of a cycle, assert the card is **absent**. Do not complete the modal's program choice. Close it. |
| `CHANGE PASSWORD` | click | The inline panel opens and the button label changes to `CANCEL` (covered fully in T42). |
| `SIGN OUT` | click (last step of this task) | There is no confirm. LoginScreen renders with `SIGN IN` / `CREATE ACCOUNT`, and `POST …/auth/v1/logout` returns 2xx/204. |

### TC-05: Negative & edge cases
- After `SIGN OUT`, press browser Back. Assert: LoginScreen still renders and no Profile content shows.
- After `SIGN OUT`, navigate to `/?tab=profile`. Assert: the login wall shows, as in T40.
- Simulate a slow network (DevTools "Slow 3G") and reload `/?tab=profile`. Assert: the `SYNCING...` indicator (with a continue-offline option) or the skeleton shows. The page never renders blank, and no unhandled error appears.

## Assertions
- [ ] `?tab=profile` opens the Profile tab after sign-in and survives a reload.
- [ ] The section headings `Warrior Rank`, `My Program`, `Achievements` and `Settings` render in order.
- [ ] The Settings groups `Account`, `Preferences`, `Notifications`, `Training data` and `Danger zone` render. Account shows the signed-in email.
- [ ] Unknown or mis-cased `tab` values fall back to `Train` without errors.
- [ ] The notification badge matches the permission state (`OFF` / `ENABLED` / `BLOCKED`).
- [ ] `CLAIM CYCLE REWARD` is visible only on week 12 of a cycle.
- [ ] `SIGN OUT` returns to LoginScreen.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load (top of Profile, Warrior Rank)
- Achievements grid
- Settings groups (full scroll)
- Notifications state after TC-03
- LoginScreen after SIGN OUT

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors.
