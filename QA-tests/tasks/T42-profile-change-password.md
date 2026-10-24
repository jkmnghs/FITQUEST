# T42-profile-change-password: Change password from the Account panel

| Field | Value |
|---|---|
| Route | `/?tab=profile` |
| Source | `src/components/OtherTabs.jsx` (`SettingsTab.submitPasswordChange`); auth: `src/hooks/useAuth.js` (`changePassword`) |
| Flow | Change password: validation errors for <6 chars and mismatch; wrong current password shows 'Current password is incorrect.'; success shows 'Password updated.' and the panel closes (source-derived) |
| Requires auth | yes |
| Required role | qa-throwaway |
| Destructive | no (credential change on a throwaway account, reverted in TC-01) |
| Estimated steps | 26 |

## Preconditions
- App running at `http://localhost:5173/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- Sign in as `qa-throwaway`: a **dedicated, disposable** Supabase test account. The runner resolves it through `scripts/auth-resolve.mjs` from `QA-tests/.qa-catalog/auth.local.json`. Never run this task against a real person's account, because TC-01 changes its password.
- The account has completed onboarding, and `localStorage.fitquest_onboarding_complete = "true"`.
- The runner knows the throwaway account's current password (`origPassword`, resolved at run time and never written here).
- **If no Supabase env or throwaway credentials are available, mark every TC BLOCKED (needs Supabase backend + throwaway user), not FAILED.**
- Provenance: source-derived (not browser-verified).
- **Revert rule:** if TC-01 passes step 5 but the revert in step 8 fails, stop. Report the account's new password to the user out-of-band (not in the report file), so `auth.local.json` can be updated.

## Test data
- `origPassword` = the throwaway account's current password (resolved at run time)
- `newPassword = "NewPass#2026"`
- `shortPassword = "abc"` (3 chars, fewer than 6)
- `fiveChars = "abcde"` (boundary: 5 fails)
- `sixChars = "abcdef"` (boundary: 6 passes the length check)
- `mismatchConfirm = "NewPass#2027"`
- `wrongCurrent = "wrong-password-123"`
- `emptyCurrent = ""`

## Steps

### TC-01: Happy path — change the password, then change it back
1. Sign in as `qa-throwaway`. Navigate to `/?tab=profile`. Scroll to `Settings` › `Account`.
2. Click **`CHANGE PASSWORD`**. Assert: a panel opens with three `type=password` inputs labelled `Current password` (`autocomplete=current-password`), `New password` (`autocomplete=new-password`) and `Confirm new password` (`autocomplete=new-password`), plus the button `UPDATE PASSWORD`. The toggle button now reads `CANCEL`.
3. Fill `Current password` = `origPassword`, `New password` = `newPassword`, `Confirm new password` = `newPassword`.
4. Click **`UPDATE PASSWORD`**. Assert: the button reads `UPDATING...` and is `disabled` while in flight.
5. Assert: `POST …/auth/v1/token?grant_type=password` (re-verifying the current password) returns 200, then `PUT …/auth/v1/user` returns 200. The green text `Password updated.` appears and all three inputs are cleared. About 1800 ms later the panel closes by itself, and the toggle reads `CHANGE PASSWORD` again.
6. Click **`SIGN OUT`**. Sign in again with `throwawayEmail` / `newPassword`. Assert: sign-in succeeds, which proves the change persisted.
7. Assert: signing in with `origPassword` now fails with Supabase's `Invalid login credentials` (run this in a separate fresh context, or before step 6's success).
8. **Revert:** go to `/?tab=profile`, then **`CHANGE PASSWORD`**. Fill `Current password` = `newPassword` and both new fields = `origPassword`, then click **`UPDATE PASSWORD`**. Assert: `Password updated.` appears.

### TC-02: Form validation — `change-password`
The checks run in this order: length, then match, then server verification of the current password. Each failing check shows a red message above `UPDATE PASSWORD`.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Current password | `""` gives `Current password is incorrect.` (the server rejects the empty password) | `wrongCurrent` gives `Current password is incorrect.` | n/a |
| New password | `""` gives `New password must be at least 6 characters.` | `shortPassword` / `fiveChars` give `New password must be at least 6 characters.` | n/a (no client max) |
| Confirm new password | `""` with a valid New password gives `New passwords do not match.` | `mismatchConfirm` gives `New passwords do not match.` | n/a |

1. Open the panel. Fill `Current password` = `origPassword`, `New password` = `shortPassword`, `Confirm new password` = `shortPassword`. Click **`UPDATE PASSWORD`**. Assert: `New password must be at least 6 characters.` shows, and **no** request goes to `/auth/v1/`.
2. Change both new fields to `fiveChars`. Click. Assert: the same message shows (boundary 5).
3. Fill `New password` = `newPassword`, `Confirm new password` = `mismatchConfirm`. Click. Assert: `New passwords do not match.` shows, and no `/auth/v1/` request is sent.
4. Fill `New password` = `shortPassword`, `Confirm new password` = `mismatchConfirm`. Click. Assert: only `New password must be at least 6 characters.` shows, because the length check wins.
5. Fill `Current password` = `wrongCurrent`, `New password` = `newPassword`, `Confirm new password` = `newPassword`. Click. Assert: `POST …/token?grant_type=password` returns 400 (expected), the red text `Current password is incorrect.` shows, no `PUT …/auth/v1/user` is sent, and the button is enabled again.
6. Fill `Current password` = `emptyCurrent`, with valid matching new passwords. Click. Assert: `Current password is incorrect.` shows (expected 400).
7. Fill `Current password` = `origPassword`, with both new fields = `sixChars`. **Do not click.** This step only confirms that the boundary passes the client checks: clear the fields instead. Submitting would change the password.

### TC-03: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `CHANGE PASSWORD` | click | The panel opens and the label becomes `CANCEL`. |
| `CANCEL` (toggle) | click after a validation error is shown | The panel closes and the message is cleared (`setPwNote(null)` + `onClearAuthError`). Reopening shows no stale error. |
| `CANCEL` then `CHANGE PASSWORD` | click twice after typing into the fields | Record whether the typed values survive (state is not cleared on toggle, so they are expected to persist). Flag it as a minor UX/security observation if the password values are still in the DOM. |
| `UPDATE PASSWORD` | double-click quickly with valid data (throwaway account only, then revert as in TC-01 step 8) | Exactly one `PUT …/auth/v1/user` is sent, because the button is disabled while busy. |

### TC-04: Negative & edge cases
- New password equal to the current one (`Current` = `origPassword`, both new = `origPassword`). Assert: Supabase's raw `updateUser` error text renders in red (typically `New password should be different from the old password.`). Record the exact text. No crash.
- Go offline (DevTools offline), then submit valid data. Assert: a red error renders (raw network/Supabase message), the button returns to `UPDATE PASSWORD`, and the password is unchanged.
- Note: a successful re-verification `signInWithPassword` creates a new session. After TC-01, assert that the user is still signed in and that Profile still renders.

## Assertions
- [ ] The panel toggles between `CHANGE PASSWORD` and `CANCEL`.
- [ ] `New password must be at least 6 characters.` shows for passwords under 6 characters, with no network call.
- [ ] `New passwords do not match.` shows on mismatch, with no network call.
- [ ] `Current password is incorrect.` shows for a wrong or empty current password, and `updateUser` is never called.
- [ ] Success shows `Password updated.`, clears the fields and auto-closes the panel after about 1.8 s. The new password works on the next sign-in.
- [ ] The password is reverted to `origPassword` at the end.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx), except the expected 400s from the wrong- and empty-current-password checks.

## Screenshots required
- Panel opened (empty)
- Each validation message (length, mismatch, incorrect current)
- `Password updated.` success state
- Final state after the revert

## Pass criteria
All non-BLOCKED TCs pass, the password is reverted, AND there are no unexpected console or network errors.
