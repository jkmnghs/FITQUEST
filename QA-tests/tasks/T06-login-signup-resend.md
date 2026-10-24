# T06-login-signup-resend: Resend the confirmation email from the signup-done panel

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (`handleResend` lines 32-38, cooldown effect lines 18-22, panel lines 218-253; `useAuth.resendConfirmation`) |
| Flow | Resend the confirmation email from the signup-done panel (60s cooldown) |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- **Every TC in this task needs a configured Supabase backend.** The signup-done panel only appears after `signUp` returns `true`. Without a backend, mark the whole task **BLOCKED (needs Supabase backend)**.
- Email sign-up is enabled in the Supabase project.

## Test data
- `name = "QA Resend"`
- `email = "qa+resend-{runId}@example.test"` (use the project's test inbox with a `+` suffix if the backend rejects this domain)
- `password = "secret1"`
- `confirmPassword = "secret1"`

## Steps

### TC-01: Happy path — resend the confirmation email and observe the cooldown [BACKEND]
1. Navigate to `/` and click the `CREATE ACCOUNT` toggle.
2. Fill `YOUR NAME` = `name`, `EMAIL` = `email`, `PASSWORD` (exact) = `password`, `CONFIRM PASSWORD` = `confirmPassword`.
3. Click the submit **`CREATE ACCOUNT`**. Assert: the `CHECK YOUR EMAIL` panel is shown with `email` in bold.
4. Assert: the button reads `DIDN'T GET IT? RESEND`, is enabled, and has cyan text.
5. Click **`DIDN'T GET IT? RESEND`**.
6. Assert: `POST <VITE_SUPABASE_URL>/auth/v1/resend` is sent with `type: "signup"` and a lowercased `email`, and it returns 200.
7. Assert: the note `Confirmation email sent.` appears below the button.
8. Assert: the button reads `RESEND IN 60s` (or `59s`, depending on timing), is `disabled`, and its text color is `var(--text3)`.
9. Wait 3 seconds. Assert: the countdown has dropped by about 3 (for example `RESEND IN 57s`).
10. Click the disabled button. Assert: no new `/auth/v1/resend` request is sent.
11. Wait until the countdown reaches 0, about 60s in total (use clock control if the runner supports it). Assert: the label goes back to `DIDN'T GET IT? RESEND` and the button is enabled.

### TC-02: Negative — resend fails (rate limited) [BACKEND]
1. On the same panel, click **`DIDN'T GET IT? RESEND`** again right after the cooldown ends. Supabase typically rate-limits resends.
2. If the request returns 4xx or 429, assert: the note reads `Could not resend — try again shortly.`, the button stays enabled (no cooldown starts), and the label is `DIDN'T GET IT? RESEND`.
3. Record that the panel has no error box, so the raw `authError` from Supabase is not shown to the user. Only the generic note appears.
4. If the request succeeds, record that the rate limit was not hit and that this TC was not exercised.

### TC-03: Leaving the panel resets the resend state [BACKEND]
1. While the note `Confirmation email sent.` is visible, click **`GO TO SIGN IN`**.
2. Assert: signin mode is shown, `EMAIL` holds `email`, and no resend note or error is visible.
3. Click the `CREATE ACCOUNT` toggle. Assert: the signup form is shown (not the panel), `CONFIRM PASSWORD` is empty, and no resend note is shown.

## Assertions
- [ ] [BACKEND] The signup-done panel shows `DIDN'T GET IT? RESEND` and `GO TO SIGN IN`.
- [ ] [BACKEND] A successful resend shows `Confirmation email sent.` and starts a 60s disabled countdown, `RESEND IN {n}s`.
- [ ] [BACKEND] Clicks during the cooldown send no requests.
- [ ] [BACKEND] When the countdown ends, the button re-enables with the label `DIDN'T GET IT? RESEND`.
- [ ] [BACKEND] A failed resend shows `Could not resend — try again shortly.` and starts no cooldown.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx), except the rate-limit response expected in TC-02.

## Screenshots required
- The signup-done panel before resend
- The panel with `Confirmation email sent.` and the countdown
- The panel after the countdown ends
- The failure note (TC-02, if reproduced)

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors.
