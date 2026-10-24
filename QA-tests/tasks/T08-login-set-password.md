# T08-login-set-password: Password recovery — SetPasswordScreen

| Field | Value |
|---|---|
| Route | `/` (opened from the Supabase recovery link, which redirects to `http://localhost:5173/` with recovery tokens) |
| Source | `src/App.jsx` (`SetPasswordScreen`, lines 104-161; `useAuth.updatePassword`, `passwordRecovery`) |
| Flow | Password recovery: the recovery link leads to SetPasswordScreen, then SET PASSWORD or CANCEL — SIGN OUT |
| Requires auth | no (a recovery session is created by the link) |
| Required role | anonymous |
| Destructive | no (it changes the test account's password; restore it afterwards) |
| Estimated steps | 24 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous before the link is opened
- **Every TC in this task needs a configured Supabase backend**, and the runner must be able to read the recovery email (test inbox or Supabase local Inbucket/Mailpit). The screen only renders when `user && passwordRecovery`, which follows a `PASSWORD_RECOVERY` auth event. Without a backend, mark the whole task **BLOCKED (needs Supabase backend)**.
- A confirmed test account exists. Resolve its email and current password through `scripts/auth-resolve.mjs`, and never write them here.
- Before each TC, request a fresh recovery link: run T05 TC-01 for that email, then open the link from the inbox in the same browser.

## Test data
- `newPassword = "newpass1"`
- `confirm = "newpass1"`
- `shortPassword = "abc"`
- `mismatchConfirm = "newpass2"`
- `shortMismatch = "abc"` + confirm `"xyz"`
- `originalPassword` = the account's current password, resolved at run time (it is used to restore the password)

## Steps

### TC-01: Happy path — set a new password [BACKEND]
1. Open the recovery link from the inbox.
2. Assert: the screen shows `FITQUEST` and `SET NEW PASSWORD`, the fields `NEW PASSWORD` (placeholder `Minimum 6 characters`) and `CONFIRM PASSWORD` (placeholder `Repeat new password`), the submit `SET PASSWORD`, and the button `CANCEL — SIGN OUT`. LoginScreen and the app shell are not rendered.
3. Fill `NEW PASSWORD` = `newPassword` and `CONFIRM PASSWORD` = `confirm`.
4. Click **`SET PASSWORD`**.
5. Assert: while the request is in flight, the submit reads `UPDATING...` and is `disabled`.
6. Assert: `PUT <VITE_SUPABASE_URL>/auth/v1/user` returns 200.
7. Assert: SetPasswordScreen unmounts and the authenticated app renders (`passwordRecovery` is now false).
8. Sign out. On LoginScreen, sign in with the account email and `newPassword`. Assert: sign-in succeeds.
9. Cleanup: change the password back to `originalPassword`, either through the app's change-password flow or by repeating this TC with `originalPassword`.

### TC-02: Form validation — `set-password-form` [BACKEND]
Validation order is length FIRST, then match (the reverse of signup).

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| NEW PASSWORD | `""` → `Password must be at least 6 characters.` | `shortPassword` + confirm `shortPassword` → `Password must be at least 6 characters.` | n/a |
| CONFIRM PASSWORD | `""` (new = `newPassword`) → `Passwords do not match.` | `mismatchConfirm` → `Passwords do not match.` | n/a |

1. Precedence check: fill `NEW PASSWORD` = `"abc"` and `CONFIRM PASSWORD` = `"xyz"`, then submit. Assert: `Password must be at least 6 characters.` (not the mismatch message).
2. Boundary: `"abcdef"` / `"abcdef"` passes client validation.
3. Assert: no `PUT /auth/v1/user` request is sent for any failing row.
4. Assert: the confirm field has NO live red mismatch border here, unlike signup. Record this as an inconsistency if it matters for the product.

### TC-03: Cancel — sign out [BACKEND]
1. Open a fresh recovery link. Assert: SetPasswordScreen is shown.
2. Click **`CANCEL — SIGN OUT`**. Assert: it is `type="button"`, so the form does not submit and no validation error appears.
3. Assert: `POST <VITE_SUPABASE_URL>/auth/v1/logout` is sent, and LoginScreen (signin mode) renders.
4. Reload the page. Assert: LoginScreen is still shown and no session is restored.
5. Sign in with the account email and its unchanged password. Assert: sign-in succeeds (the password was not changed).

### TC-04: Negative & edge cases [BACKEND]
- Open a recovery link that has already been used or has expired. Assert: SetPasswordScreen is NOT shown. Record what renders: LoginScreen, or an error from the URL hash such as `error_description`. Record whether the user gets any visible feedback.
- Set `NEW PASSWORD` to the account's current password. Submit. If Supabase rejects it (`New password should be different from the old password.`), assert that the message shows in the error box and that the submit re-enables with the label `SET PASSWORD`.
- Reload the page while SetPasswordScreen is shown. Record whether the recovery screen persists or whether the user lands in the app already signed in without having set a password. If they are signed in, this is a security/UX finding.

## Assertions
- [ ] [BACKEND] The recovery link shows SetPasswordScreen with `SET NEW PASSWORD`, both fields, `SET PASSWORD`, and `CANCEL — SIGN OUT`.
- [ ] [BACKEND] A password shorter than 6 characters shows `Password must be at least 6 characters.`, and this check runs before the match check.
- [ ] [BACKEND] A mismatch shows `Passwords do not match.`
- [ ] [BACKEND] A valid submit updates the password and enters the app. The new password works for sign-in.
- [ ] [BACKEND] `CANCEL — SIGN OUT` signs out without changing the password.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx), except expected Supabase rejections in TC-04.

## Screenshots required
- SetPasswordScreen initial load
- Each validation error state
- The state after a successful SET PASSWORD
- The state after CANCEL — SIGN OUT

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors, AND the test account's password is restored to `originalPassword`.
