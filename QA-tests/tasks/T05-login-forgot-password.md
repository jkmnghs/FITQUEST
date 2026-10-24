# T05-login-forgot-password: Forgot password — send reset link

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (forgot mode lines 158-217, resetDone panel lines 136-157; `useAuth.resetPassword`) |
| Flow | Forgot password: enter the email, SEND RESET LINK, see the CHECK YOUR EMAIL panel, BACK TO SIGN IN |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 24 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- **TC-01 needs a configured Supabase backend**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and the dev server has been restarted. Without a backend, mark TC-01 **BLOCKED (needs Supabase backend)**.
- TC-02 to TC-05 run without a backend.

## Test data
- `email = "test@example.com"` (with a backend, use the email of an account resolved through `scripts/auth-resolve.mjs`. Do not write it here.)
- `emptyRequired = ""`
- `badEmail = "bad"`
- `carriedEmail = "carry@example.com"`

## Steps

### TC-01: Happy path — request a reset link [BACKEND]
1. Navigate to `/`.
2. Click **`FORGOT PASSWORD?`**.
3. Assert: the intro text `Enter your email and we'll send you a link to reset your password.` is visible, along with a single `EMAIL` field (placeholder `you@example.com`), the submit `SEND RESET LINK`, and the button `BACK TO SIGN IN`. There is no `PASSWORD` field.
4. Fill `EMAIL` = `email`.
5. Click the submit **`SEND RESET LINK`**.
6. Assert: while the request is in flight, the submit reads `SENDING...` and is `disabled`.
7. Assert: `POST <VITE_SUPABASE_URL>/auth/v1/recover` returns 200, with the redirect target `http://localhost:5173`.
8. Assert: the form is replaced by a hex mail icon, the heading `CHECK YOUR EMAIL`, and the text `We sent a password reset link to <email>. Click it to set a new password.` The email is shown in bold.
9. Click **`BACK TO SIGN IN`** on the panel.
10. Assert: signin mode is shown (with `PASSWORD` and `FORGOT PASSWORD?` visible), `EMAIL` still holds `email`, and no error box is shown.

### TC-02: Form validation — `forgot-form` (no backend)
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| EMAIL | `""` → `Please enter your email address.` | `badEmail` → native tooltip (`Please include an '@' in the email address. 'bad' is missing an '@'.`), the input matches `:invalid`, and no custom error | n/a (no maxLength) |

1. Click `FORGOT PASSWORD?`, leave `EMAIL` empty, and click the submit **`SEND RESET LINK`**. Assert: the error box shows exactly `Please enter your email address.` (this wording differs from sign-in).
2. Fill `EMAIL` = `badEmail` and submit. Assert: native validation blocks the submit.

### TC-03: BUG CANDIDATE — stale error after native email validation (no backend)
This TC is **expected to FAIL**.
1. Continue from TC-02 step 2, or reproduce it: submit an empty form, then type `badEmail` and submit.
2. Assert (expected behaviour): `Please enter your email address.` is no longer shown.
3. Record the actual behaviour. Per the analysis, the stale error stays visible. If it does, mark this FAILED with the label **"Stale error after native email validation"** and take a screenshot.

### TC-04: BUG CANDIDATE — valid reset with no backend gives no feedback (no backend)
This TC is **expected to FAIL**.
1. Click `FORGOT PASSWORD?`, fill `EMAIL` = `email`, and click the submit **`SEND RESET LINK`**.
2. Assert (expected behaviour): either the `CHECK YOUR EMAIL` panel appears, or a visible error explains that the reset is unavailable.
3. Record the actual behaviour. Per the analysis, there is no panel and no error, and the submit goes back to `SEND RESET LINK`, because `resetPassword` returns `false` without calling `setAuthError`. If this is observed, mark this FAILED with the label **"Silent no-op when Supabase is not configured"**.
4. Assert: no request goes to `/auth/v1/recover`.

### TC-05: Navigation and carry-over (no backend)
1. Navigate to `/`. Fill `EMAIL` = `carriedEmail`, then click the submit **`SIGN IN`** with `PASSWORD` empty. Assert: `Please enter your email and password.`
2. Click **`FORGOT PASSWORD?`**. Assert: `EMAIL` holds `carriedEmail` and no error box is shown (entering the mode clears the error).
3. Record the UX CANDIDATE: in forgot mode neither the `SIGN IN` nor the `CREATE ACCOUNT` toggle has the active style (both have a transparent background).
4. Click the form button **`BACK TO SIGN IN`**. Assert: signin mode is shown, `EMAIL` holds `carriedEmail`, and the `SIGN IN` toggle is active.
5. Click `FORGOT PASSWORD?` again, then click the `CREATE ACCOUNT` toggle. Assert: signup mode is shown with `YOUR NAME` visible.

## Assertions
- [ ] `FORGOT PASSWORD?` opens forgot mode with the intro text, a single `EMAIL` field, `SEND RESET LINK`, and `BACK TO SIGN IN`.
- [ ] An empty email shows `Please enter your email address.`
- [ ] A malformed email is blocked natively.
- [ ] The email carries over into and out of forgot mode, and entering forgot mode clears any error.
- [ ] [BACKEND] A valid submission shows `CHECK YOUR EMAIL` with the email, and `BACK TO SIGN IN` returns to signin.
- [ ] BUG CANDIDATE (expected to fail): a stale error is cleared after the native email block.
- [ ] BUG CANDIDATE (expected to fail with no backend): a valid reset with no backend shows feedback.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx).

## Screenshots required
- Forgot mode initial load
- The empty-email error state
- The native tooltip with the stale error (TC-03)
- The state after a valid submit with no backend (TC-04)
- The `CHECK YOUR EMAIL` reset panel (TC-01)

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. A FAILED result in TC-03 and TC-04 is the expected finding and must be reported as a defect.
