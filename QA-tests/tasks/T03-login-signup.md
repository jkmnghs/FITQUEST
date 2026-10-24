# T03-login-signup: Create an account

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/LoginScreen.jsx` (signup mode; `useAuth.signUp` in `src/hooks/useAuth.js`) |
| Flow | Switch to Create Account, fill name, email, password and confirm, submit, see the CHECK YOUR EMAIL confirmation panel |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no (it creates a new, unconfirmed Supabase user) |
| Estimated steps | 24 |

## Preconditions
- App running at `http://localhost:5173/`
- anonymous (fresh browser context)
- **TC-01 and TC-04 need a configured Supabase backend**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, the dev server has been restarted, and email sign-up is enabled. For TC-04, an account for `existingEmail` must already exist. Without a backend, mark TC-01 and TC-04 **BLOCKED (needs Supabase backend)**.
- TC-02 and TC-03 run without a backend.

## Test data
- `name = "QA Tester"`
- `email = "qa+{runId}@example.test"` (`{runId}` is a unique timestamp. If the backend rejects the domain, use the project's configured test inbox with a `+{runId}` suffix.)
- `password = "secret1"` (exactly 6 characters, the minimum)
- `confirmPassword = "secret1"`
- `paddedName = "  QA Tester  "` (it is trimmed before it is sent)
- `existingEmail` = the email of an account that already exists, resolved through `scripts/auth-resolve.mjs` (TC-04 only)
- `noBackendEmail = "new@example.com"`

## Steps

### TC-01: Happy path — create an account and see CHECK YOUR EMAIL [BACKEND]
1. Navigate to `/`.
2. Click the `CREATE ACCOUNT` **toggle** (the button outside the form, or `.first()`).
3. Assert: the `CREATE ACCOUNT` toggle is active (background `rgba(0, 229, 255, 0.12)`, cyan text), and `SIGN IN` is not.
4. Assert: the fields `YOUR NAME` (placeholder `e.g. Alex`, `maxlength=30`), `EMAIL`, `PASSWORD` (exact label; placeholder `Minimum 6 characters`, `autocomplete=new-password`) and `CONFIRM PASSWORD` (placeholder `Repeat your password`) are visible in that order. `FORGOT PASSWORD?` is not rendered.
5. Fill `YOUR NAME` = `paddedName`.
6. Fill `EMAIL` = `email`.
7. Fill `PASSWORD` (exact) = `password`.
8. Fill `CONFIRM PASSWORD` = `confirmPassword`.
9. Assert: the `CONFIRM PASSWORD` border is the neutral `1px solid rgba(255, 255, 255, 0.1)`, not red.
10. Click the submit **`CREATE ACCOUNT`** (`form button[type=submit]`).
11. Assert: while the request is in flight, the submit reads `PLEASE WAIT...` and is `disabled`.
12. Assert: `POST <VITE_SUPABASE_URL>/auth/v1/signup` returns 200. The request body has `email` lowercased and `data.full_name = "QA Tester"` (trimmed), and the redirect target is `http://localhost:5173`.
13. Assert: the form is replaced by a panel with a hex mail icon, the heading `CHECK YOUR EMAIL`, and the text `We sent a confirmation link to qa+{runId}@example.test. Click it to activate your account — you'll be signed in automatically.` The email is shown in bold.
14. Assert: the buttons `DIDN'T GET IT? RESEND` and `GO TO SIGN IN` are visible. (The resend flow is covered by T06.)
15. Record the UX CANDIDATE: the `SIGN IN` / `CREATE ACCOUNT` toggles are still visible above the panel.
16. Click **`GO TO SIGN IN`**. Assert: signin mode is shown, `EMAIL` still holds the email, and no error box is shown.

### TC-02: BUG CANDIDATE — valid sign-up with no backend gives no feedback (no backend)
This TC is **expected to FAIL** and expose the bug.
1. Navigate to `/` and click the `CREATE ACCOUNT` toggle.
2. Fill `YOUR NAME` = `name`, `EMAIL` = `noBackendEmail`, `PASSWORD` (exact) = `password`, `CONFIRM PASSWORD` = `confirmPassword`.
3. Click the submit **`CREATE ACCOUNT`**.
4. Assert (expected behaviour): either the `CHECK YOUR EMAIL` panel appears, or a visible error explains that account creation failed or is unavailable.
5. Record the actual behaviour. Per the analysis, there is no panel and no error, the form stays filled, and the submit goes back to `CREATE ACCOUNT` right away, because `signUp` returns `false` without calling `setAuthError`. If this is observed, mark TC-02 FAILED with the label **"Silent no-op when Supabase is not configured"** and attach a screenshot.
6. Assert: there are no `/auth/v1/signup` requests.

### TC-03: Name max-length is enforced (no backend)
1. In signup mode, type 40 × `"a"` into `YOUR NAME`.
2. Assert: the input value is 30 characters long.

### TC-04: Negative — the email is already registered [BACKEND]
1. In signup mode, fill `YOUR NAME` = `name`, `EMAIL` = `existingEmail`, `PASSWORD` (exact) = `password`, `CONFIRM PASSWORD` = `confirmPassword`. Click the submit **`CREATE ACCOUNT`**.
2. Assert one of the following:
   - The error box shows `An account with this email already exists. Try signing in or use "Forgot Password?" to recover access.`
   - The backend has email-enumeration protection, so the `CHECK YOUR EMAIL` panel is shown instead. Record which one occurred.
3. If the error is shown, assert that the submit is re-enabled with the label `CREATE ACCOUNT` and that the form values are kept.
4. If the backend returns a rate-limit error, assert that the error box shows `Too many attempts. Please wait a few minutes before trying again.`

## Assertions
- [ ] The `CREATE ACCOUNT` toggle reveals `YOUR NAME` (maxlength 30) and `CONFIRM PASSWORD`, and changes the password placeholder to `Minimum 6 characters`.
- [ ] [BACKEND] A valid sign-up shows the `CHECK YOUR EMAIL` panel with the entered email in bold.
- [ ] [BACKEND] The name is trimmed and the email is lowercased in the sign-up request.
- [ ] [BACKEND] An already-registered email shows the friendly mapped message, unless enumeration protection hides it.
- [ ] BUG CANDIDATE (expected to fail with no backend): a valid sign-up with no backend shows visible feedback.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (4xx/5xx), except the expected error in TC-04.

## Screenshots required
- Signup mode initial state
- The filled form before submit
- The `CHECK YOUR EMAIL` panel (TC-01)
- The state after a valid submit with no backend (TC-02)
- The already-registered error (TC-04)

## Pass criteria
All non-BLOCKED TCs pass AND no unexpected console or network errors. TC-02 is a known bug candidate: a FAILED result is the expected finding and must be reported as a defect.
